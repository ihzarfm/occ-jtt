package app

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/netip"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"occ-jtt/backend/internal/httpapi/wireguard"
	"occ-jtt/backend/internal/store"
)

func newSessionID() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func newID(name string) string {
	cleaned := strings.ToLower(strings.TrimSpace(name))
	cleaned = strings.ReplaceAll(cleaned, " ", "-")
	cleaned = strings.ReplaceAll(cleaned, "/", "-")
	if cleaned == "" {
		cleaned = "peer"
	}
	return fmt.Sprintf("%s-%d", cleaned, time.Now().Unix())
}

func pingLatency(ctx context.Context, target string) (float64, error) {
	trimmedTarget := strings.TrimSpace(target)
	if trimmedTarget == "" {
		return 0, errors.New("missing target ip")
	}

	command := exec.CommandContext(ctx, "ping", "-c", "1", "-W", "1", trimmedTarget)
	output, err := command.CombinedOutput()
	latency, parsed := parsePingLatency(string(output))
	if parsed {
		return latency, nil
	}
	if err != nil {
		return 0, fmt.Errorf("ping failed")
	}
	return 0, errors.New("latency not available")
}

func parsePingLatency(output string) (float64, bool) {
	marker := "time="
	index := strings.Index(output, marker)
	if index == -1 {
		return 0, false
	}

	segment := output[index+len(marker):]
	end := strings.Index(segment, " ")
	if end >= 0 {
		segment = segment[:end]
	}
	segment = strings.TrimSuffix(segment, "ms")

	value, err := strconv.ParseFloat(strings.TrimSpace(segment), 64)
	if err != nil {
		return 0, false
	}

	return value, true
}

func ParsePingLatency(output string) (float64, bool) {
	return parsePingLatency(output)
}

func sshHandshakeLatency(ctx context.Context, serverConfig wireguard.WGServerConfig) (float64, error) {
	keyPath := expandHomePath(serverConfig.KeyPath)
	if keyPath == "" {
		return 0, errors.New("missing ssh key path")
	}

	start := time.Now()
	command := exec.CommandContext(
		ctx,
		"ssh",
		"-i", keyPath,
		"-o", "BatchMode=yes",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "ConnectTimeout=5",
		"-p", strconv.Itoa(serverConfig.SSHPort),
		fmt.Sprintf("%s@%s", serverConfig.SSHUser, serverConfig.Host),
		"exit",
	)

	if _, err := command.CombinedOutput(); err != nil {
		return 0, errors.New("ssh handshake failed")
	}

	return float64(time.Since(start).Milliseconds()), nil
}

func (s *server) runRemoteScript(ctx context.Context, serverConfig wireguard.WGServerConfig, scriptPath, siteName string) (wireguard.RemoteScriptResult, error) {
	if strings.TrimSpace(scriptPath) == "" {
		return wireguard.RemoteScriptResult{}, fmt.Errorf("remote script is not configured for %s", serverConfig.Name)
	}

	keyPath := expandHomePath(serverConfig.KeyPath)
	command := exec.CommandContext(
		ctx,
		"ssh",
		"-i", keyPath,
		"-o", "BatchMode=yes",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "ConnectTimeout=5",
		"-p", strconv.Itoa(serverConfig.SSHPort),
		fmt.Sprintf("%s@%s", serverConfig.SSHUser, serverConfig.Host),
		"sudo",
		"-n",
		scriptPath,
		"--site",
		siteName,
	)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	command.Stdout = &stdout
	command.Stderr = &stderr

	err := command.Run()
	output := strings.TrimSpace(stdout.String())

	var result wireguard.RemoteScriptResult
	if output != "" {
		if parseErr := json.Unmarshal([]byte(output), &result); parseErr != nil {
			if err != nil {
				return wireguard.RemoteScriptResult{}, fmt.Errorf("remote command failed on %s: %s", serverConfig.Name, strings.TrimSpace(stderr.String()))
			}
			return wireguard.RemoteScriptResult{}, fmt.Errorf("invalid JSON returned by %s", serverConfig.Name)
		}
	}

	if err != nil {
		if result.Error != "" {
			return result, fmt.Errorf("%s: %s", serverConfig.Name, result.Error)
		}
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = "remote command failed"
		}
		return result, fmt.Errorf("%s: %s", serverConfig.Name, message)
	}

	return result, nil
}

func (s *server) serverByID(id string) (wireguard.WGServerConfig, bool) {
	for _, serverConfig := range s.activeWGServers() {
		if serverConfig.ID == id {
			return serverConfig, true
		}
	}
	return wireguard.WGServerConfig{}, false
}

func (s *server) activeWGServers() []wireguard.WGServerConfig {
	servers := s.listWGServersFromSettings()
	if len(servers) > 0 {
		return servers
	}
	return append([]wireguard.WGServerConfig(nil), s.wgServers...)
}

func (s *server) listWGServersFromSettings() []wireguard.WGServerConfig {
	settings := s.effectiveWGSettings()
	activeProfile := strings.TrimSpace(settings.WG.ActiveProfile)
	if activeProfile == "" {
		return nil
	}
	profile, ok := settings.WG.Profiles[activeProfile]
	if !ok {
		return nil
	}

	servers := make([]wireguard.WGServerConfig, 0, len(profile.Servers))
	defaultByID := map[string]wireguard.WGServerConfig{}
	for _, current := range s.wgServers {
		defaultByID[current.ID] = current
	}

	for serverID, serverSetting := range profile.Servers {
		if !serverSetting.Enabled {
			continue
		}

		base := defaultByID[serverID]
		if base.ID == "" {
			base = wireguard.WGServerConfig{
				ID:   serverID,
				Name: serverID,
			}
		}

		base.ID = serverID
		if strings.TrimSpace(serverSetting.ID) != "" {
			base.ID = strings.TrimSpace(serverSetting.ID)
		}
		if strings.TrimSpace(serverSetting.DisplayName) != "" {
			base.Name = strings.TrimSpace(serverSetting.DisplayName)
		}
		if strings.TrimSpace(serverSetting.EndpointHost) != "" {
			base.Host = strings.TrimSpace(serverSetting.EndpointHost)
			base.WireGuardIP = base.Host
			base.DefaultEndpoint = base.Host
		}
		if serverSetting.EndpointPort > 0 {
			base.SSHPort = serverSetting.EndpointPort
		}
		if strings.TrimSpace(serverSetting.SSHUser) != "" {
			base.SSHUser = strings.TrimSpace(serverSetting.SSHUser)
		}
		if strings.TrimSpace(serverSetting.SSHKeyPath) != "" {
			base.KeyPath = strings.TrimSpace(serverSetting.SSHKeyPath)
		}
		if strings.TrimSpace(serverSetting.OverlayCIDR) != "" {
			base.OverlayCIDR = strings.TrimSpace(serverSetting.OverlayCIDR)
		}
		if strings.TrimSpace(serverSetting.Scripts.CreateSitePeer) != "" {
			base.CreateScript = strings.TrimSpace(serverSetting.Scripts.CreateSitePeer)
		}
		if strings.TrimSpace(serverSetting.Scripts.RemovePeer) != "" {
			base.RemoveScript = strings.TrimSpace(serverSetting.Scripts.RemovePeer)
		}

		servers = append(servers, base)
	}
	return servers
}

func (s *server) effectiveWGSettings() store.Settings {
	settings := s.store.GetSettings()
	if len(settings.WG.Profiles) == 0 {
		settings = defaultWGSettingsFromServers(s.wgServers)
	}
	if strings.TrimSpace(settings.WG.ActiveProfile) == "" {
		settings.WG.ActiveProfile = "staging"
	}
	return settings
}

func defaultWGSettingsFromServers(servers []wireguard.WGServerConfig) store.Settings {
	settings := store.Settings{
		WG: store.WGSettings{
			ActiveProfile: "staging",
			Profiles: map[string]store.WGProfileSettings{
				"staging": {
					Servers: map[string]store.WGServerSettings{},
				},
			},
		},
	}

	for _, serverConfig := range servers {
		settings.WG.Profiles["staging"].Servers[serverConfig.ID] = store.WGServerSettings{
			ID:           serverConfig.ID,
			Enabled:      true,
			DisplayName:  serverConfig.Name,
			OverlayCIDR:  serverConfig.OverlayCIDR,
			EndpointHost: serverConfig.Host,
			EndpointPort: serverConfig.SSHPort,
			SSHUser:      serverConfig.SSHUser,
			SSHKeyPath:   serverConfig.KeyPath,
			Scripts: store.WGServerScriptsSettings{
				CreateSitePeer: serverConfig.CreateScript,
				RemovePeer:     serverConfig.RemoveScript,
			},
		}
	}
	return settings
}

func defaultWGServers() []wireguard.WGServerConfig {
	return []wireguard.WGServerConfig{
		{
			ID:              "stg-cctv",
			Name:            "stg-cctv",
			Host:            "192.168.21.254",
			SSHUser:         "raph",
			SSHPort:         22,
			KeyPath:         env("STG_CCTV_SSH_KEY_PATH", filepath.Join(defaultSSHHomeDir("raph"), ".ssh", "id_ed25519")),
			WireGuardIP:     "192.168.21.254",
			InterfaceName:   "wg-cctv",
			OverlayCIDR:     "10.22.0.0/22",
			RemoteWGConf:    "/etc/wireguard/wg0.conf",
			DefaultEndpoint: "192.168.21.254",
			DefaultPort:     51820,
			CreateScript:    "/usr/local/bin/occ-wg-create-outlet",
			RemoveScript:    "/usr/local/bin/occ-wg-remove-peer",
		},
		{
			ID:              "stg-its",
			Name:            "stg-its",
			Host:            "192.168.22.254",
			SSHUser:         "raph",
			SSHPort:         22,
			KeyPath:         env("STG_ITS_SSH_KEY_PATH", filepath.Join(defaultSSHHomeDir("raph"), ".ssh", "id_ed25519")),
			WireGuardIP:     "192.168.22.254",
			InterfaceName:   "wg-its",
			OverlayCIDR:     "10.21.0.0/22",
			RemoteWGConf:    "/etc/wireguard/wg0.conf",
			DefaultEndpoint: "192.168.22.254",
			DefaultPort:     51820,
			CreateScript:    "/usr/local/bin/occ-wg-create-outlet",
			RemoveScript:    "/usr/local/bin/occ-wg-remove-peer",
		},
	}
}

func expandHomePath(path string) string {
	if path == "" || !strings.HasPrefix(path, "~/") {
		return path
	}

	return filepath.Join(defaultSSHHomeDir("raph"), strings.TrimPrefix(path, "~/"))
}

func defaultSSHHomeDir(fallbackUser string) string {
	if sudoUser := strings.TrimSpace(os.Getenv("SUDO_USER")); sudoUser != "" {
		if account, err := user.Lookup(sudoUser); err == nil && account.HomeDir != "" {
			return account.HomeDir
		}
	}

	if current, err := user.Current(); err == nil && current.HomeDir != "" && current.Username != "root" {
		return current.HomeDir
	}

	if fallbackUser != "" {
		if account, err := user.Lookup(fallbackUser); err == nil && account.HomeDir != "" {
			return account.HomeDir
		}
		return filepath.Join("/home", fallbackUser)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		return ""
	}

	return homeDir
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func publicState(state store.State) map[string]any {
	return map[string]any{
		"network": state.Network,
		"peers":   state.Peers,
	}
}

func (s *server) appendAuditLog(r *http.Request, category, action, target, message string) {
	user, ok := s.currentUser(r)
	if !ok {
		return
	}

	_, err := s.store.AddLog(store.AuditLog{
		ID:        newID(strings.Join([]string{category, action, target}, "-")),
		Category:  category,
		Action:    action,
		Actor:     user.Username,
		ActorName: user.Name,
		Target:    target,
		Message:   message,
	})
	if err != nil {
		log.Printf("failed to append audit log: %v", err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}

func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid login payload")
		return
	}

	identifier := strings.TrimSpace(input.Username)
	password := strings.TrimSpace(input.Password)
	if identifier == "" || password == "" {
		writeError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	user, err := s.findUserForLogin(identifier)
	if err != nil {
		if errors.Is(err, errMultipleUsersForLogin) {
			writeError(w, http.StatusBadRequest, "multiple users found, use NIK")
			return
		}
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}
	if user.Password != password {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	sessionID, err := newSessionID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}

	s.sessionMu.Lock()
	s.sessions[sessionID] = user
	s.sessionMu.Unlock()

	http.SetCookie(w, &http.Cookie{
		Name:     "occ_session",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 12,
	})

	writeJSON(w, http.StatusOK, map[string]string{
		"message":  "login successful",
		"user":     user.Username,
		"username": user.Username,
		"name":     user.Name,
		"nik":      user.NIK,
		"role":     user.Role,
	})
}

func (s *server) handleSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	user, ok := s.currentUser(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "no active session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"user":     user.Username,
		"username": user.Username,
		"name":     user.Name,
		"nik":      user.NIK,
		"role":     user.Role,
	})
}

var (
	loginNIKPattern          = regexp.MustCompile(`^[0-9]{6}$`)
	errUserNotFoundForLogin  = errors.New("user not found for login")
	errMultipleUsersForLogin = errors.New("multiple users for login")
)

func (s *server) findUserForLogin(identifier string) (store.User, error) {
	users := s.store.ListUsers()
	if loginNIKPattern.MatchString(identifier) {
		for _, user := range users {
			if user.NIK == identifier {
				return user, nil
			}
		}
		return store.User{}, errUserNotFoundForLogin
	}

	matches := make([]store.User, 0, 1)
	for _, user := range users {
		if strings.EqualFold(user.Name, identifier) || strings.EqualFold(user.Username, identifier) {
			matches = append(matches, user)
		}
	}

	if len(matches) == 0 {
		return store.User{}, errUserNotFoundForLogin
	}
	if len(matches) > 1 {
		return store.User{}, errMultipleUsersForLogin
	}
	return matches[0], nil
}

func (s *server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	if cookie, err := r.Cookie("occ_session"); err == nil && cookie.Value != "" {
		s.sessionMu.Lock()
		delete(s.sessions, cookie.Value)
		s.sessionMu.Unlock()
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "occ_session",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	writeJSON(w, http.StatusOK, map[string]string{"message": "logout successful"})
}

func (s *server) handleState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, publicState(s.store.GetState()))
}

func (s *server) handleSettings(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		settings := s.effectiveWGSettings()
		writeJSON(w, http.StatusOK, map[string]any{
			"wg": settings.WG,
		})
	case http.MethodPut:
		var input store.Settings
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeError(w, http.StatusBadRequest, "invalid settings payload")
			return
		}
		if err := validateWGSettings(input.WG); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		state, err := s.store.UpdateSettings(input)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to save settings")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"wg": state.Settings.WG,
		})
	default:
		methodNotAllowed(w)
	}
}

func (s *server) handleSettingsWGTestConnection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}

	var input struct {
		Profile  string `json:"profile"`
		ServerID string `json:"serverId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid test connection payload")
		return
	}

	settings := s.effectiveWGSettings()
	profileName := strings.TrimSpace(input.Profile)
	if profileName == "" {
		profileName = strings.TrimSpace(settings.WG.ActiveProfile)
	}
	profile, ok := settings.WG.Profiles[profileName]
	if !ok {
		writeError(w, http.StatusBadRequest, "profile not found")
		return
	}
	serverCfg, ok := profile.Servers[strings.TrimSpace(input.ServerID)]
	if !ok {
		writeError(w, http.StatusBadRequest, "server not found in profile")
		return
	}

	runtimeServers := s.listWGServersFromSettings()
	var target wireguard.WGServerConfig
	for _, current := range runtimeServers {
		if current.ID == serverCfg.ID || current.ID == input.ServerID {
			target = current
			break
		}
	}
	if target.ID == "" {
		target = wireguard.WGServerConfig{
			ID:          serverCfg.ID,
			Name:        serverCfg.DisplayName,
			Host:        serverCfg.EndpointHost,
			SSHPort:     serverCfg.EndpointPort,
			SSHUser:     serverCfg.SSHUser,
			KeyPath:     serverCfg.SSHKeyPath,
			OverlayCIDR: serverCfg.OverlayCIDR,
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), 7*time.Second)
	defer cancel()

	latency, err := sshHandshakeLatency(ctx, target)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":        false,
			"latencyMs": 0,
			"error":     err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"latencyMs": latency,
		"error":     "",
	})
}

func validateWGSettings(settings store.WGSettings) error {
	activeProfile := strings.TrimSpace(settings.ActiveProfile)
	if activeProfile == "" {
		return errors.New("activeProfile is required")
	}
	if len(settings.Profiles) == 0 {
		return errors.New("profiles are required")
	}
	profile, ok := settings.Profiles[activeProfile]
	if !ok {
		return errors.New("activeProfile must exist in profiles")
	}
	if len(profile.Servers) == 0 {
		return errors.New("active profile must define at least one server")
	}

	for serverID, server := range profile.Servers {
		prefix, err := netip.ParsePrefix(strings.TrimSpace(server.OverlayCIDR))
		if err != nil {
			return fmt.Errorf("invalid overlayCIDR for server %s", serverID)
		}
		if prefix.Bits() != 22 {
			return errors.New("wg overlayCIDR must be /22 (example: 10.21.0.0/22)")
		}

		if !server.Enabled {
			continue
		}
		if strings.TrimSpace(server.EndpointHost) == "" {
			return fmt.Errorf("endpointHost is required for enabled server %s", serverID)
		}
		if strings.TrimSpace(server.SSHUser) == "" {
			return fmt.Errorf("sshUser is required for enabled server %s", serverID)
		}
		keyPath := strings.TrimSpace(server.SSHKeyPath)
		if keyPath == "" || (!strings.Contains(keyPath, "/") && !strings.HasPrefix(keyPath, "~")) {
			return fmt.Errorf("sshKeyPath is invalid for enabled server %s", serverID)
		}
	}
	return nil
}

func (s *server) handleApp(w http.ResponseWriter, r *http.Request) {
	distDir := filepath.Join("..", "frontend", "dist")
	requested := strings.TrimPrefix(filepath.Clean(r.URL.Path), "/")
	if requested == "." {
		requested = ""
	}

	if requested != "" {
		target := filepath.Join(distDir, requested)
		if info, err := os.Stat(target); err == nil && !info.IsDir() {
			http.ServeFile(w, r, target)
			return
		}
	}

	indexPath := filepath.Join(distDir, "index.html")
	if _, err := os.Stat(indexPath); err == nil {
		http.ServeFile(w, r, indexPath)
		return
	}

	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(`<!doctype html><html><head><meta charset="utf-8"><title>OCC</title></head><body><h1>OCC</h1><p>Frontend React belum dibuild. Jalankan frontend secara terpisah atau build ke <code>frontend/dist</code>.</p></body></html>`))
}

func (s *server) withSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if _, ok := s.currentUser(r); !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next(w, r)
	}
}

func (s *server) withRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !s.requireRole(w, r, role) {
			return
		}
		next(w, r)
	}
}

func (s *server) requireRole(w http.ResponseWriter, r *http.Request, role string) bool {
	user, ok := s.currentUser(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return false
	}
	if !hasRequiredRole(user.Role, role) {
		writeError(w, http.StatusForbidden, "insufficient permissions")
		return false
	}
	return true
}

func hasRequiredRole(actualRole, requiredRole string) bool {
	actual := strings.ToLower(strings.TrimSpace(actualRole))
	required := strings.ToLower(strings.TrimSpace(requiredRole))

	ranks := map[string]int{
		"support":       1,
		"administrator": 2,
		"superadmin":    3,
	}

	actualRank, ok := ranks[actual]
	if !ok {
		return false
	}
	requiredRank, ok := ranks[required]
	if !ok {
		return false
	}

	return actualRank >= requiredRank
}

func (s *server) currentUser(r *http.Request) (store.User, bool) {
	cookie, err := r.Cookie("occ_session")
	if err != nil || cookie.Value == "" {
		return store.User{}, false
	}

	s.sessionMu.RLock()
	user, ok := s.sessions[cookie.Value]
	s.sessionMu.RUnlock()
	return user, ok
}
