package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"occ-jtt/backend/internal/store"
	"occ-jtt/backend/internal/wg"
)

type server struct {
	store         *store.Store
	adminUsername string
	adminPassword string
	gatusAPIURL   string
	gatewayHost   string
	wgServers     []wgServerConfig
	sessions      map[string]store.User
	sessionMu     sync.RWMutex
}

type peerInput struct {
	PeerType     string `json:"peerType"`
	Name         string `json:"name"`
	PublicKey    string `json:"publicKey"`
	PresharedKey string `json:"presharedKey"`
	AllowedIPs   string `json:"allowedIPs"`
	Endpoint     string `json:"endpoint"`
	Keepalive    int    `json:"keepalive"`
	AssignedIP   string `json:"assignedIP"`
}

type userInput struct {
	Name     string `json:"name"`
	NIK      string `json:"nik"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type wgServerConfig struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Host            string `json:"host"`
	SSHUser         string `json:"sshUser"`
	SSHPort         int    `json:"sshPort"`
	KeyPath         string `json:"keyPath"`
	WireGuardIP     string `json:"wireGuardIP"`
	InterfaceName   string `json:"interfaceName"`
	OverlayCIDR     string `json:"overlayCIDR"`
	RemoteWGConf    string `json:"remoteWGConf"`
	DefaultEndpoint string `json:"defaultEndpoint"`
	DefaultPort     int    `json:"defaultPort"`
	CreateScript    string `json:"createScript"`
	RemoveScript    string `json:"removeScript"`
}

type remoteScriptResult struct {
	OK            bool   `json:"ok"`
	Site          string `json:"site"`
	ServerID      string `json:"server_id"`
	Interface     string `json:"interface"`
	AssignedIP    string `json:"assigned_ip"`
	Overlay       string `json:"overlay"`
	PeerFile      string `json:"peer_file"`
	RouterFile    string `json:"router_file"`
	PeerContent   string `json:"peer_content"`
	RouterContent string `json:"router_content"`
	Applied       bool   `json:"applied"`
	Removed       bool   `json:"removed"`
	Error         string `json:"error"`
}

func main() {
	dataPath := env("OCC_JTT_DATA", filepath.Join("data", "state.json"))
	port := env("PORT", "8080")

	stateStore, err := store.New(dataPath)
	if err != nil {
		log.Fatalf("failed to open state store: %v", err)
	}

	s := &server{
		store:    stateStore,
		sessions: make(map[string]store.User),
	}
	s.adminUsername = env("ADMIN_USERNAME", "admin")
	s.adminPassword = env("ADMIN_PASSWORD", "123123")
	s.gatusAPIURL = env("GATUS_API_URL", "http://10.1.0.1:9090/metrics")
	s.gatewayHost = env("DASHBOARD_GATEWAY_HOST", "10.1.0.1")
	s.wgServers = defaultWGServers()
	if err := s.store.EnsureUser(store.User{
		Username: s.adminUsername,
		Name:     "Administrator",
		NIK:      "000000",
		Password: s.adminPassword,
		Role:     "administrator",
		BuiltIn:  true,
	}); err != nil {
		log.Fatalf("failed to initialize administrator user: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/healthz", s.handleHealth)
	mux.HandleFunc("/api/login", s.handleLogin)
	mux.HandleFunc("/api/logout", s.handleLogout)
	mux.HandleFunc("/api/session", s.handleSession)
	mux.HandleFunc("/api/monitoring", s.withSession(s.handleMonitoring))
	mux.HandleFunc("/api/state", s.withSession(s.handleState))
	mux.HandleFunc("/api/dashboard/health", s.withSession(s.handleDashboardHealth))
	mux.HandleFunc("/api/network", s.withRole("administrator", s.handleNetwork))
	mux.HandleFunc("/api/peers", s.withSession(s.handlePeers))
	mux.HandleFunc("/api/peers/", s.withSession(s.handlePeerByID))
	mux.HandleFunc("/api/diagnostics/peers", s.withRole("administrator", s.handlePeerDiagnostics))
	mux.HandleFunc("/api/wg-servers", s.withRole("administrator", s.handleWGServers))
	mux.HandleFunc("/api/wg-servers/diagnostics", s.withRole("administrator", s.handleWGServerDiagnostics))
	mux.HandleFunc("/api/logs", s.withRole("administrator", s.handleLogs))
	mux.HandleFunc("/api/users", s.withRole("administrator", s.handleUsers))
	mux.HandleFunc("/api/users/", s.withRole("administrator", s.handleUserByID))
	mux.HandleFunc("/", s.handleApp)

	handler := withCORS(withLogging(mux))

	log.Printf("occ-jtt listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}
}

func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
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

	username := strings.TrimSpace(input.Username)
	password := strings.TrimSpace(input.Password)
	if username == "" || password == "" {
		writeError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	user, ok := s.store.Authenticate(username, password)
	if !ok {
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
		"message": "login successful",
		"user":    user.Username,
		"name":    user.Name,
		"role":    user.Role,
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
		"user": user.Username,
		"name": user.Name,
		"role": user.Role,
	})
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

func (s *server) handleMonitoring(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	if s.gatusAPIURL == "" {
		writeError(w, http.StatusServiceUnavailable, "GATUS_API_URL is not configured")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, s.gatusAPIURL, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to prepare monitoring request")
		return
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch monitoring data from Gatus")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to read monitoring response")
		return
	}

	contentType := resp.Header.Get("Content-Type")

	if strings.Contains(contentType, "application/json") || json.Valid(body) {
		var payload any
		if err := json.Unmarshal(body, &payload); err != nil {
			writeError(w, http.StatusBadGateway, "invalid JSON returned by Gatus")
			return
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			writeJSON(w, http.StatusBadGateway, map[string]any{
				"error":      "Gatus returned a non-success status",
				"statusCode": resp.StatusCode,
				"payload":    payload,
			})
			return
		}

		writeJSON(w, http.StatusOK, payload)
		return
	}

	metrics := parseMetricsPayload(string(body))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"error":      "monitoring endpoint returned a non-success status",
			"statusCode": resp.StatusCode,
			"payload": map[string]any{
				"mode":    "metrics",
				"source":  s.gatusAPIURL,
				"metrics": metrics,
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"mode":    "metrics",
		"source":  s.gatusAPIURL,
		"metrics": metrics,
	})
}

func (s *server) handleState(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, publicState(s.store.GetState()))
}

func (s *server) handleNetwork(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		methodNotAllowed(w)
		return
	}

	var network store.NetworkConfig
	if err := json.NewDecoder(r.Body).Decode(&network); err != nil {
		writeError(w, http.StatusBadRequest, "invalid network payload")
		return
	}

	if strings.TrimSpace(network.InterfaceName) == "" || strings.TrimSpace(network.ServerAddress) == "" || network.ListenPort <= 0 {
		writeError(w, http.StatusBadRequest, "interfaceName, serverAddress, and listenPort are required")
		return
	}

	state, err := s.store.UpdateNetwork(network)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save network")
		return
	}

	s.appendAuditLog(r, "wireguard", "update", network.InterfaceName, fmt.Sprintf("Updated network settings for %s", network.InterfaceName))

	writeJSON(w, http.StatusOK, publicState(state))
}

func (s *server) handlePeers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, s.store.GetState().Peers)
	case http.MethodPost:
		s.createPeer(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (s *server) handlePeerByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/peers/")
	path = strings.Trim(path, "/")
	if path == "" {
		methodNotAllowed(w)
		return
	}

	parts := strings.Split(path, "/")
	id := parts[0]
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing peer id")
		return
	}

	if len(parts) == 2 && parts[1] == "config" {
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		if !s.requireRole(w, r, "administrator") {
			return
		}
		s.renderConfig(w, id)
		return
	}

	if len(parts) == 3 && parts[1] == "artifacts" {
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		s.renderArtifact(w, id, parts[2])
		return
	}

	if len(parts) != 1 {
		http.NotFound(w, r)
		return
	}

	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}
	if !s.requireRole(w, r, "administrator") {
		return
	}

	peer, ok := s.store.GetPeer(id)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}
	if err := s.removeRemotePeer(r.Context(), peer); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	state, _, err := s.store.DeletePeer(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete peer")
		return
	}

	s.appendAuditLog(r, "wireguard", "delete", peer.Name, fmt.Sprintf("Deleted peer %s", peer.Name))

	writeJSON(w, http.StatusOK, publicState(state))
}

func (s *server) createPeer(w http.ResponseWriter, r *http.Request) {
	var input peerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid peer payload")
		return
	}

	if strings.EqualFold(strings.TrimSpace(input.PeerType), "outlet") {
		s.createOutletPeer(w, r, input)
		return
	}

	name := strings.TrimSpace(input.Name)
	publicKey := strings.TrimSpace(input.PublicKey)
	assignedIP := strings.TrimSpace(input.AssignedIP)
	if name == "" || publicKey == "" || assignedIP == "" {
		writeError(w, http.StatusBadRequest, "name, publicKey, and assignedIP are required")
		return
	}

	peer := store.Peer{
		ID:           newID(name),
		Name:         name,
		PublicKey:    publicKey,
		PresharedKey: strings.TrimSpace(input.PresharedKey),
		AllowedIPs:   parseCSV(input.AllowedIPs),
		Endpoint:     strings.TrimSpace(input.Endpoint),
		Keepalive:    input.Keepalive,
		AssignedIP:   assignedIP,
	}
	if user, ok := s.currentUser(r); ok {
		peer.CreatedBy = user.Username
		peer.CreatedByName = user.Name
	}
	if len(peer.AllowedIPs) == 0 {
		peer.AllowedIPs = []string{"0.0.0.0/0"}
	}

	state, created, err := s.store.AddPeer(peer)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save peer")
		return
	}

	s.appendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created administrator peer %s", created.Name))

	writeJSON(w, http.StatusCreated, map[string]any{
		"state": publicState(state),
		"peer":  created,
	})
}

func (s *server) createOutletPeer(w http.ResponseWriter, r *http.Request, input peerInput) {
	ctx := r.Context()
	siteName := strings.TrimSpace(input.Name)
	if siteName == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	assignments := make([]store.PeerAssignment, 0, len(s.wgServers))
	artifacts := make([]store.PeerArtifact, 0, len(s.wgServers)*2)

	for _, serverConfig := range s.wgServers {
		result, err := s.runRemoteScript(ctx, serverConfig, serverConfig.CreateScript, siteName)
		if err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		if !result.OK || !result.Applied {
			message := result.Error
			if message == "" {
				message = fmt.Sprintf("remote create failed on %s", serverConfig.Name)
			}
			writeError(w, http.StatusBadGateway, message)
			return
		}

		assignments = append(assignments, store.PeerAssignment{
			ServerID:      serverConfig.ID,
			ServerName:    serverConfig.Name,
			InterfaceName: result.Interface,
			AssignedIP:    result.AssignedIP,
			OverlayCIDR:   result.Overlay,
		})

		confContent := result.PeerContent
		if confContent == "" {
			confContent = remoteArtifactNote(serverConfig, result.PeerFile)
		}
		routerContent := result.RouterContent
		if routerContent == "" {
			routerContent = remoteArtifactNote(serverConfig, result.RouterFile)
		}

		artifacts = append(artifacts,
			store.PeerArtifact{
				ID:          fmt.Sprintf("%s-conf", serverConfig.ID),
				Kind:        "conf",
				ServerID:    serverConfig.ID,
				ServerName:  serverConfig.Name,
				Filename:    filepath.Base(result.PeerFile),
				ContentType: "text/plain; charset=utf-8",
				Content:     confContent,
			},
			store.PeerArtifact{
				ID:          fmt.Sprintf("%s-rsc", serverConfig.ID),
				Kind:        "rsc",
				ServerID:    serverConfig.ID,
				ServerName:  serverConfig.Name,
				Filename:    filepath.Base(result.RouterFile),
				ContentType: "text/plain; charset=utf-8",
				Content:     routerContent,
			},
		)
	}

	peer := store.Peer{
		ID:          newID(siteName),
		Type:        "outlet",
		SiteName:    siteName,
		Name:        fmt.Sprintf("Outlet - %s", siteName),
		AllowedIPs:  []string{"0.0.0.0/0"},
		Keepalive:   15,
		AssignedIP:  assignments[0].AssignedIP,
		Assignments: assignments,
		Artifacts:   artifacts,
	}
	if user, ok := s.currentUser(r); ok {
		peer.CreatedBy = user.Username
		peer.CreatedByName = user.Name
	}

	state, created, err := s.store.AddPeer(peer)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save peer")
		return
	}

	s.appendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created outlet peer %s", created.Name))

	writeJSON(w, http.StatusCreated, map[string]any{
		"state": publicState(state),
		"peer":  created,
	})
}

func (s *server) handleUsers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, publicUsers(s.store.ListUsers()))
	case http.MethodPost:
		s.createUser(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (s *server) handlePeerDiagnostics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	peers := s.store.GetState().Peers
	items := make([]map[string]any, 0, len(peers))

	for _, peer := range peers {
		targets := peerTargets(peer)
		for _, target := range targets {
			latency, err := pingLatency(r.Context(), target.AssignedIP)

			item := map[string]any{
				"id":         peer.ID,
				"name":       peer.Name,
				"assignedIP": target.AssignedIP,
				"target":     target.Label,
				"checkedAt":  time.Now().UTC().Format(time.RFC3339),
			}

			if err != nil {
				item["status"] = "down"
				item["error"] = err.Error()
			} else {
				item["status"] = "up"
				item["latencyMs"] = latency
			}

			items = append(items, item)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":      items,
		"checkedAt":  time.Now().UTC().Format(time.RFC3339),
		"totalPeers": len(peers),
	})
}

func (s *server) handleWGServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, s.wgServers)
}

func (s *server) handleWGServerDiagnostics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	items := make([]map[string]any, 0, len(s.wgServers))
	checkedAt := time.Now().UTC().Format(time.RFC3339)

	for _, serverConfig := range s.wgServers {
		pingLatencyMs, pingErr := pingLatency(r.Context(), serverConfig.Host)
		sshDurationMs, sshErr := sshHandshakeLatency(r.Context(), serverConfig)

		items = append(items, map[string]any{
			"id":            serverConfig.ID,
			"name":          serverConfig.Name,
			"host":          serverConfig.Host,
			"sshUser":       serverConfig.SSHUser,
			"sshPort":       serverConfig.SSHPort,
			"keyPath":       serverConfig.KeyPath,
			"wireGuardIP":   serverConfig.WireGuardIP,
			"pingStatus":    diagnosticStatus(pingErr),
			"sshStatus":     diagnosticStatus(sshErr),
			"pingLatencyMs": valueOrNil(pingLatencyMs, pingErr),
			"sshLatencyMs":  valueOrNil(sshDurationMs, sshErr),
			"pingError":     errorMessage(pingErr),
			"sshError":      errorMessage(sshErr),
			"checkedAt":     checkedAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":     items,
		"checkedAt": checkedAt,
	})
}

func (s *server) handleDashboardHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	checkedAt := time.Now().UTC().Format(time.RFC3339)
	items := make([]map[string]any, 0, len(s.wgServers)+2)

	items = append(items, dashboardPingItem(r.Context(), "internet", "google.com", "google.com", checkedAt))

	for _, serverConfig := range s.wgServers {
		items = append(items, dashboardPingItem(r.Context(), serverConfig.ID, serverConfig.Name, serverConfig.Host, checkedAt))
	}

	items = append(items, dashboardPingItem(r.Context(), "gateway", "Gateway", s.gatewayHost, checkedAt))

	writeJSON(w, http.StatusOK, map[string]any{
		"items":      items,
		"checkedAt":  checkedAt,
		"totalPeers": len(s.store.GetState().Peers),
	})
}

func (s *server) handleLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	category := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("category")))
	if category != "" && category != "wireguard" && category != "mikrotik" && category != "user" {
		writeError(w, http.StatusBadRequest, "invalid log category")
		return
	}

	writeJSON(w, http.StatusOK, publicLogs(s.store.ListLogs(category)))
}

func (s *server) handleUserByID(w http.ResponseWriter, r *http.Request) {
	username := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/users/"), "/")
	if username == "" {
		writeError(w, http.StatusBadRequest, "missing username")
		return
	}

	if r.Method != http.MethodPut {
		methodNotAllowed(w)
		return
	}

	s.updateUser(w, r, username)
}

func (s *server) createUser(w http.ResponseWriter, r *http.Request) {
	var input userInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid user payload")
		return
	}

	user, err := normalizeUserInput(input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := s.store.AddUser(user)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	s.appendAuditLog(
		r,
		"user",
		"create",
		created.Name,
		fmt.Sprintf("Created user %s (%s)", created.Name, created.NIK),
	)

	writeJSON(w, http.StatusCreated, publicUser(created))
}

func (s *server) updateUser(w http.ResponseWriter, r *http.Request, username string) {
	var input userInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid user payload")
		return
	}

	user, err := normalizeUserInput(input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	user.Username = username

	updated, ok, err := s.store.UpdateUser(username, user)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	s.appendAuditLog(
		r,
		"user",
		"update",
		updated.Name,
		fmt.Sprintf("Updated user %s (%s)", updated.Name, updated.NIK),
	)

	writeJSON(w, http.StatusOK, publicUser(updated))
}

func (s *server) renderConfig(w http.ResponseWriter, id string) {
	peer, ok := s.store.GetPeer(id)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}

	config := wg.RenderPeerConfig(s.store.GetState().Network, peer)
	filename := fmt.Sprintf("%s.conf", id)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	_, _ = w.Write([]byte(config))
}

func (s *server) renderArtifact(w http.ResponseWriter, peerID, artifactID string) {
	peer, ok := s.store.GetPeer(peerID)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}

	for _, artifact := range peer.Artifacts {
		if artifact.ID != artifactID {
			continue
		}

		w.Header().Set("Content-Type", artifact.ContentType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", artifact.Filename))
		_, _ = w.Write([]byte(artifact.Content))
		return
	}

	writeError(w, http.StatusNotFound, "artifact not found")
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

func parseCSV(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			items = append(items, part)
		}
	}
	return items
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

func newSessionID() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func parseMetricsPayload(body string) []map[string]any {
	lines := strings.Split(body, "\n")
	metrics := make([]map[string]any, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		metricName, labels := parseMetricToken(parts[0])

		item := map[string]any{
			"metric": metricName,
			"value":  parts[1],
			"labels": labels,
		}

		for key, value := range labels {
			item[key] = value
		}

		metrics = append(metrics, item)
	}

	return metrics
}

func parseMetricToken(token string) (string, map[string]string) {
	openIndex := strings.Index(token, "{")
	closeIndex := strings.LastIndex(token, "}")
	if openIndex == -1 || closeIndex == -1 || closeIndex <= openIndex {
		return token, map[string]string{}
	}

	metricName := token[:openIndex]
	rawLabels := token[openIndex+1 : closeIndex]
	labels := make(map[string]string)

	for _, pair := range splitMetricLabels(rawLabels) {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}

		chunks := strings.SplitN(pair, "=", 2)
		if len(chunks) != 2 {
			continue
		}

		key := strings.TrimSpace(chunks[0])
		value := strings.Trim(strings.TrimSpace(chunks[1]), `"`)
		if key != "" {
			labels[key] = value
		}
	}

	return metricName, labels
}

func splitMetricLabels(raw string) []string {
	var (
		parts   []string
		current strings.Builder
		inQuote bool
	)

	for _, char := range raw {
		switch char {
		case '"':
			inQuote = !inQuote
			current.WriteRune(char)
		case ',':
			if inQuote {
				current.WriteRune(char)
				continue
			}
			parts = append(parts, current.String())
			current.Reset()
		default:
			current.WriteRune(char)
		}
	}

	if current.Len() > 0 {
		parts = append(parts, current.String())
	}

	return parts
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

func dashboardPingItem(ctx context.Context, id, label, target, checkedAt string) map[string]any {
	latency, err := pingLatency(ctx, target)
	item := map[string]any{
		"id":        id,
		"label":     label,
		"target":    target,
		"checkedAt": checkedAt,
	}

	if err != nil {
		item["status"] = "down"
		item["error"] = err.Error()
		return item
	}

	item["status"] = dashboardLatencyStatus(latency)
	item["latencyMs"] = latency
	return item
}

func dashboardLatencyStatus(latency float64) string {
	if latency <= 100 {
		return "good"
	}
	return "bad"
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

func sshHandshakeLatency(ctx context.Context, serverConfig wgServerConfig) (float64, error) {
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

func diagnosticStatus(err error) string {
	if err != nil {
		return "down"
	}
	return "up"
}

func valueOrNil(value float64, err error) any {
	if err != nil {
		return nil
	}
	return value
}

func errorMessage(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func (s *server) runRemoteScript(ctx context.Context, serverConfig wgServerConfig, scriptPath, siteName string) (remoteScriptResult, error) {
	if strings.TrimSpace(scriptPath) == "" {
		return remoteScriptResult{}, fmt.Errorf("remote script is not configured for %s", serverConfig.Name)
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

	var result remoteScriptResult
	if output != "" {
		if parseErr := json.Unmarshal([]byte(output), &result); parseErr != nil {
			if err != nil {
				return remoteScriptResult{}, fmt.Errorf("remote command failed on %s: %s", serverConfig.Name, strings.TrimSpace(stderr.String()))
			}
			return remoteScriptResult{}, fmt.Errorf("invalid JSON returned by %s", serverConfig.Name)
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

func (s *server) removeRemotePeer(ctx context.Context, peer store.Peer) error {
	if peer.Type != "outlet" || len(peer.Assignments) == 0 {
		return nil
	}

	siteName := strings.TrimSpace(peer.SiteName)
	if siteName == "" {
		siteName = strings.TrimPrefix(peer.Name, "Outlet - ")
	}
	if siteName == "" {
		return errors.New("missing site name for outlet peer")
	}

	for _, assignment := range peer.Assignments {
		serverConfig, ok := s.serverByID(assignment.ServerID)
		if !ok {
			return fmt.Errorf("unknown server mapping: %s", assignment.ServerID)
		}

		result, err := s.runRemoteScript(ctx, serverConfig, serverConfig.RemoveScript, siteName)
		if err != nil {
			return err
		}
		if !result.OK || !result.Removed {
			message := result.Error
			if message == "" {
				message = fmt.Sprintf("remote remove failed on %s", serverConfig.Name)
			}
			return errors.New(message)
		}
	}

	return nil
}

func (s *server) serverByID(id string) (wgServerConfig, bool) {
	for _, serverConfig := range s.wgServers {
		if serverConfig.ID == id {
			return serverConfig, true
		}
	}
	return wgServerConfig{}, false
}

func remoteArtifactNote(serverConfig wgServerConfig, remotePath string) string {
	return fmt.Sprintf(
		"Artifact is stored on %s (%s) at %s.\nFetch it directly on the server or extend the wrapper to return file contents to OCC.\n",
		serverConfig.Name,
		serverConfig.Host,
		remotePath,
	)
}

type peerTarget struct {
	Label      string
	AssignedIP string
}

func peerTargets(peer store.Peer) []peerTarget {
	if len(peer.Assignments) > 0 {
		targets := make([]peerTarget, 0, len(peer.Assignments))
		for _, assignment := range peer.Assignments {
			targets = append(targets, peerTarget{
				Label:      assignment.ServerName,
				AssignedIP: assignment.AssignedIP,
			})
		}
		return targets
	}

	if strings.TrimSpace(peer.AssignedIP) == "" {
		return nil
	}

	return []peerTarget{{
		Label:      "default",
		AssignedIP: peer.AssignedIP,
	}}
}

func nextAvailableIP(peers []store.Peer, overlayCIDR string) (string, error) {
	base, err := overlayBasePrefix(overlayCIDR)
	if err != nil {
		return "", err
	}

	used := make(map[string]struct{})
	for _, peer := range peers {
		if len(peer.Assignments) > 0 {
			for _, assignment := range peer.Assignments {
				used[assignment.AssignedIP] = struct{}{}
			}
			continue
		}
		if peer.AssignedIP != "" {
			used[peer.AssignedIP] = struct{}{}
		}
	}

	for third := 0; third <= 2; third += 1 {
		startFourth := 0
		if third == 0 {
			startFourth = 2
		}
		for fourth := startFourth; fourth <= 255; fourth += 1 {
			candidate := fmt.Sprintf("%s.%d.%d", base, third, fourth)
			if _, exists := used[candidate]; exists {
				continue
			}
			return candidate, nil
		}
	}

	return "", fmt.Errorf("no available IP in %s", overlayCIDR)
}

func overlayBasePrefix(overlayCIDR string) (string, error) {
	parts := strings.Split(strings.TrimSpace(overlayCIDR), "/")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid overlay %q", overlayCIDR)
	}

	octets := strings.Split(parts[0], ".")
	if len(octets) != 4 {
		return "", fmt.Errorf("invalid overlay %q", overlayCIDR)
	}

	return fmt.Sprintf("%s.%s", octets[0], octets[1]), nil
}

func generateWGMaterial() (string, string, string, error) {
	privateKey, err := runWGCommand("genkey")
	if err != nil {
		return "", "", "", errors.New("failed to generate private key; install wireguard-tools (`wg`)")
	}

	publicKeyCommand := exec.Command("wg", "pubkey")
	publicKeyCommand.Stdin = strings.NewReader(privateKey)
	publicKeyOut, err := publicKeyCommand.CombinedOutput()
	if err != nil {
		return "", "", "", errors.New("failed to derive public key; install wireguard-tools (`wg`)")
	}

	presharedKey, err := runWGCommand("genpsk")
	if err != nil {
		return "", "", "", errors.New("failed to generate preshared key; install wireguard-tools (`wg`)")
	}

	return strings.TrimSpace(privateKey), strings.TrimSpace(string(publicKeyOut)), strings.TrimSpace(presharedKey), nil
}

func runWGCommand(args ...string) (string, error) {
	command := exec.Command("wg", args...)
	output, err := command.CombinedOutput()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func (s *server) resolveWGServerMetadata(serverConfig wgServerConfig) (string, int, string) {
	endpoint := serverConfig.DefaultEndpoint
	if endpoint == "" {
		endpoint = serverConfig.Host
	}
	port := serverConfig.DefaultPort
	if port == 0 {
		port = 51820
	}
	publicKey := env(strings.ToUpper(strings.ReplaceAll(serverConfig.ID, "-", "_"))+"_PUBLIC_KEY", "REPLACE_SERVER_PUBLIC_KEY")

	if remoteEndpoint, err := s.remoteWGValue(serverConfig, `awk '/^[[:space:]]*#[[:space:]]*ENDPOINT/{print $3; exit}' `+serverConfig.RemoteWGConf); err == nil && remoteEndpoint != "" {
		endpoint = remoteEndpoint
	}
	if remotePort, err := s.remoteWGValue(serverConfig, `awk '/^[[:space:]]*ListenPort/{print $3; exit}' `+serverConfig.RemoteWGConf); err == nil {
		if parsedPort, parseErr := strconv.Atoi(strings.TrimSpace(remotePort)); parseErr == nil && parsedPort > 0 {
			port = parsedPort
		}
	}
	remotePublicKeyCmd := fmt.Sprintf(`bash -lc "priv=$(awk '/^[[:space:]]*PrivateKey[[:space:]]*=/{print $3; exit}' %s); if [ -n \"$priv\" ]; then printf %%s \"$priv\" | wg pubkey; fi"`, serverConfig.RemoteWGConf)
	if remotePublicKey, err := s.remoteWGValue(serverConfig, remotePublicKeyCmd); err == nil && remotePublicKey != "" {
		publicKey = remotePublicKey
	}

	return endpoint, port, publicKey
}

func (s *server) remoteWGValue(serverConfig wgServerConfig, remoteCommand string) (string, error) {
	keyPath := expandHomePath(serverConfig.KeyPath)
	command := exec.Command(
		"ssh",
		"-i", keyPath,
		"-o", "BatchMode=yes",
		"-o", "StrictHostKeyChecking=no",
		"-o", "UserKnownHostsFile=/dev/null",
		"-o", "ConnectTimeout=5",
		"-p", strconv.Itoa(serverConfig.SSHPort),
		fmt.Sprintf("%s@%s", serverConfig.SSHUser, serverConfig.Host),
		remoteCommand,
	)
	output, err := command.CombinedOutput()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

func renderClientConfig(address, privateKey, presharedKey, serverPublicKey, endpoint string, port int, overlayCIDR string) string {
	return fmt.Sprintf(`[Interface]
Address = %s/22
PrivateKey = %s

[Peer]
PublicKey = %s
PresharedKey = %s
AllowedIPs = %s
Endpoint = %s:%d
PersistentKeepalive = 15
`, address, privateKey, serverPublicKey, presharedKey, overlayCIDR, endpoint, port)
}

func renderRouterConfig(interfaceName, address, privateKey, presharedKey, serverPublicKey, endpoint string, port int, overlayCIDR string) string {
	return fmt.Sprintf(`/interface wireguard add name=%s private-key="%s"
/ip address add address=%s/22 interface=%s
/interface wireguard peers add name=%s interface=%s \
public-key="%s" \
preshared-key="%s" \
endpoint-address=%s \
endpoint-port=%d \
allowed-address=%s
`, interfaceName, privateKey, address, interfaceName, interfaceName, interfaceName, serverPublicKey, presharedKey, endpoint, port, overlayCIDR)
}

func sanitizeName(value string) string {
	replacer := strings.NewReplacer(" ", "-", "/", "-", "\\", "-", ":", "-", ".", "-")
	cleaned := replacer.Replace(strings.TrimSpace(value))
	if cleaned == "" {
		return "peer"
	}
	return cleaned
}

func defaultWGServers() []wgServerConfig {
	return []wgServerConfig{
		{
			ID:              "stg-cctv",
			Name:            "stg-cctv",
			Host:            "192.168.21.254",
			SSHUser:         "raph",
			SSHPort:         22,
			KeyPath:         env("STG_CCTV_SSH_KEY_PATH", filepath.Join(defaultSSHHomeDir("raph"), ".ssh", "id_ed25519")),
			WireGuardIP:     "192.168.21.254",
			InterfaceName:   "wg-cctv",
			OverlayCIDR:     "10.21.0.0/22",
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
			OverlayCIDR:     "10.22.0.0/22",
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
	if user.Role != role {
		writeError(w, http.StatusForbidden, "insufficient permissions")
		return false
	}
	return true
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

func publicState(state store.State) map[string]any {
	return map[string]any{
		"network": state.Network,
		"peers":   state.Peers,
	}
}

func publicUsers(users []store.User) []map[string]any {
	items := make([]map[string]any, len(users))
	for i, user := range users {
		items[i] = publicUser(user)
	}
	return items
}

func publicLogs(items []store.AuditLog) []map[string]any {
	result := make([]map[string]any, len(items))
	for i, item := range items {
		result[i] = map[string]any{
			"id":        item.ID,
			"category":  item.Category,
			"action":    item.Action,
			"actor":     item.Actor,
			"actorName": item.ActorName,
			"target":    item.Target,
			"message":   item.Message,
			"createdAt": item.CreatedAt,
		}
	}
	return result
}

func publicUser(user store.User) map[string]any {
	return map[string]any{
		"username":  user.Username,
		"name":      user.Name,
		"nik":       user.NIK,
		"role":      user.Role,
		"builtIn":   user.BuiltIn,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	}
}

func normalizeUserInput(input userInput) (store.User, error) {
	name := strings.TrimSpace(input.Name)
	nik := strings.TrimSpace(input.NIK)
	password := strings.TrimSpace(input.Password)
	role := strings.ToLower(strings.TrimSpace(input.Role))

	if name == "" {
		return store.User{}, errors.New("name is required")
	}
	if !isValidNIK(nik) {
		return store.User{}, errors.New("nik must be 6 digits")
	}
	if password == "" {
		return store.User{}, errors.New("password is required")
	}
	if role != "support" && role != "administrator" {
		return store.User{}, errors.New("role must be support or administrator")
	}

	return store.User{
		Username: nik,
		Name:     name,
		NIK:      nik,
		Password: password,
		Role:     role,
	}, nil
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

func isValidNIK(value string) bool {
	if len(value) != 6 {
		return false
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
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
