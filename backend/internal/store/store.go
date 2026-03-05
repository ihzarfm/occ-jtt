package store

import (
	"database/sql"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"
)

type NetworkConfig struct {
	InterfaceName   string `json:"interfaceName"`
	ServerAddress   string `json:"serverAddress"`
	ListenPort      int    `json:"listenPort"`
	ServerPublicKey string `json:"serverPublicKey"`
	DNS             string `json:"dns"`
}

type Peer struct {
	ID            string           `json:"id"`
	Type          string           `json:"type,omitempty"`
	SiteName      string           `json:"siteName,omitempty"`
	Name          string           `json:"name"`
	CreatedBy     string           `json:"createdBy,omitempty"`
	CreatedByName string           `json:"createdByName,omitempty"`
	Managed       bool             `json:"managed"`
	ServerScope   string           `json:"serverScope,omitempty"`
	PublicKey     string           `json:"publicKey"`
	PresharedKey  string           `json:"presharedKey"`
	AllowedIPs    []string         `json:"allowedIPs"`
	Endpoint      string           `json:"endpoint"`
	Keepalive     int              `json:"keepalive"`
	AssignedIP    string           `json:"assignedIP"`
	Assignments   []PeerAssignment `json:"assignments,omitempty"`
	Artifacts     []PeerArtifact   `json:"artifacts,omitempty"`
	CreatedAt     string           `json:"createdAt"`
}

type PeerAssignment struct {
	ServerID      string `json:"serverId"`
	ServerName    string `json:"serverName"`
	InterfaceName string `json:"interfaceName"`
	AssignedIP    string `json:"assignedIP"`
	OverlayCIDR   string `json:"overlayCIDR"`
}

type PeerArtifact struct {
	ID          string `json:"id"`
	Kind        string `json:"kind"`
	ServerID    string `json:"serverId"`
	ServerName  string `json:"serverName"`
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

func (p *Peer) UnmarshalJSON(data []byte) error {
	type alias Peer
	aux := struct {
		*alias
		Managed *bool `json:"managed"`
	}{
		alias: (*alias)(p),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	if aux.Managed == nil {
		p.Managed = defaultManagedForLegacyPeer(*p)
	}
	return nil
}

func defaultManagedForLegacyPeer(peer Peer) bool {
	peerType := strings.ToLower(strings.TrimSpace(peer.Type))
	return peerType == "site" || peerType == "outlet" || len(peer.Assignments) > 0
}

type User struct {
	Username  string `json:"username"`
	Name      string `json:"name"`
	NIK       string `json:"nik"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	BuiltIn   bool   `json:"builtIn,omitempty"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type AuditLog struct {
	ID        string `json:"id"`
	Category  string `json:"category"`
	Action    string `json:"action"`
	Actor     string `json:"actor"`
	ActorName string `json:"actorName"`
	Target    string `json:"target"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

type WGServerScriptsSettings struct {
	CreateSitePeer string `json:"createSitePeer"`
	RemovePeer     string `json:"removePeer"`
}

type WGServerSettings struct {
	ID           string                  `json:"id"`
	Enabled      bool                    `json:"enabled"`
	DisplayName  string                  `json:"displayName"`
	OverlayCIDR  string                  `json:"overlayCIDR"`
	EndpointHost string                  `json:"endpointHost"`
	EndpointPort int                     `json:"endpointPort"`
	SSHUser      string                  `json:"sshUser"`
	SSHKeyPath   string                  `json:"sshKeyPath"`
	Scripts      WGServerScriptsSettings `json:"scripts"`
}

type WGProfileSettings struct {
	Servers map[string]WGServerSettings `json:"servers"`
}

type WGSettings struct {
	ActiveProfile string                       `json:"activeProfile"`
	Profiles      map[string]WGProfileSettings `json:"profiles"`
}

type Settings struct {
	WG WGSettings `json:"wg"`
}

type State struct {
	Network  NetworkConfig `json:"network"`
	Peers    []Peer        `json:"peers"`
	Users    []User        `json:"users"`
	Logs     []AuditLog    `json:"logs"`
	Settings Settings      `json:"settings"`
}

type Store struct {
	path  string
	db    *sql.DB
	mu    sync.RWMutex
	state State
}

func DefaultState() State {
	return State{
		Network: NetworkConfig{
			InterfaceName:   "control-node",
			ServerAddress:   "managed-remotely",
			ListenPort:      51820,
			ServerPublicKey: "replace-with-managed-server-public-key",
			DNS:             "",
		},
		Peers: []Peer{},
		Users: []User{},
		Logs:  []AuditLog{},
		Settings: Settings{
			WG: WGSettings{
				Profiles: map[string]WGProfileSettings{},
			},
		},
	}
}

func New(path string) (*Store, error) {
	s := &Store{
		path:  path,
		state: DefaultState(),
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			if err := s.saveLocked(); err != nil {
				return nil, err
			}
			return s, nil
		}
		return nil, err
	}

	if len(data) == 0 {
		if err := s.saveLocked(); err != nil {
			return nil, err
		}
		return s, nil
	}

	if err := json.Unmarshal(data, &s.state); err != nil {
		return nil, err
	}

	if s.state.Network.InterfaceName == "" {
		s.state.Network = DefaultState().Network
	}
	if s.state.Peers == nil {
		s.state.Peers = []Peer{}
	}
	if s.state.Users == nil {
		s.state.Users = []User{}
	}
	if s.state.Logs == nil {
		s.state.Logs = []AuditLog{}
	}

	return s, nil
}

func NewPostgres(db *sql.DB) (*Store, error) {
	s := &Store{
		db:    db,
		state: DefaultState(),
	}

	if err := s.ensurePostgresSchema(); err != nil {
		return nil, err
	}

	return s, nil
}

func (s *Store) GetState() State {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return DefaultState()
		}
		return state
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneState(s.state)
}

func (s *Store) ListLogs(category string) []AuditLog {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return []AuditLog{}
		}
		if category == "" {
			return cloneLogs(state.Logs)
		}
		filtered := make([]AuditLog, 0, len(state.Logs))
		for _, item := range state.Logs {
			if item.Category == category {
				filtered = append(filtered, item)
			}
		}
		return cloneLogs(filtered)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	if category == "" {
		return cloneLogs(s.state.Logs)
	}

	filtered := make([]AuditLog, 0, len(s.state.Logs))
	for _, item := range s.state.Logs {
		if item.Category == category {
			filtered = append(filtered, item)
		}
	}

	return cloneLogs(filtered)
}

func (s *Store) ListUsers() []User {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return []User{}
		}
		return cloneUsers(state.Users)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	users := make([]User, len(s.state.Users))
	for i, user := range s.state.Users {
		users[i] = cloneUser(user)
	}

	return users
}

func (s *Store) Authenticate(username, password string) (User, bool) {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return User{}, false
		}
		for _, user := range state.Users {
			if user.Username == username && user.Password == password {
				return cloneUser(user), true
			}
		}
		return User{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, user := range s.state.Users {
		if user.Username == username && user.Password == password {
			return cloneUser(user), true
		}
	}

	return User{}, false
}

func (s *Store) EnsureUser(user User) error {
	if s.db != nil {
		_, err := s.updateStatePostgres(func(state *State) error {
			now := time.Now().UTC().Format(time.RFC3339)
			index := slices.IndexFunc(state.Users, func(current User) bool {
				return current.Username == user.Username
			})

			if index >= 0 {
				existing := state.Users[index]
				user.CreatedAt = existing.CreatedAt
				if user.CreatedAt == "" {
					user.CreatedAt = now
				}
				user.UpdatedAt = now
				state.Users[index] = user
				return nil
			}

			if user.CreatedAt == "" {
				user.CreatedAt = now
			}
			user.UpdatedAt = now
			state.Users = append(state.Users, user)
			return nil
		})
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	index := slices.IndexFunc(s.state.Users, func(current User) bool {
		return current.Username == user.Username
	})

	if index >= 0 {
		existing := s.state.Users[index]
		user.CreatedAt = existing.CreatedAt
		if user.CreatedAt == "" {
			user.CreatedAt = now
		}
		user.UpdatedAt = now
		s.state.Users[index] = user
		return s.saveLocked()
	}

	if user.CreatedAt == "" {
		user.CreatedAt = now
	}
	user.UpdatedAt = now
	s.state.Users = append(s.state.Users, user)
	return s.saveLocked()
}

func (s *Store) AddUser(user User) (User, error) {
	if s.db != nil {
		var created User
		_, err := s.updateStatePostgres(func(state *State) error {
			for _, current := range state.Users {
				if current.Username == user.Username {
					return errors.New("username already exists")
				}
				if current.NIK == user.NIK {
					return errors.New("nik already exists")
				}
			}

			now := time.Now().UTC().Format(time.RFC3339)
			user.CreatedAt = now
			user.UpdatedAt = now
			state.Users = append([]User{user}, state.Users...)
			created = cloneUser(user)
			return nil
		})
		if err != nil {
			return User{}, err
		}
		return created, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, current := range s.state.Users {
		if current.Username == user.Username {
			return User{}, errors.New("username already exists")
		}
		if current.NIK == user.NIK {
			return User{}, errors.New("nik already exists")
		}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	user.CreatedAt = now
	user.UpdatedAt = now
	s.state.Users = append([]User{user}, s.state.Users...)

	if err := s.saveLocked(); err != nil {
		return User{}, err
	}

	return cloneUser(user), nil
}

func (s *Store) UpdateUser(username string, next User) (User, bool, error) {
	if s.db != nil {
		var updated User
		var found bool
		_, err := s.updateStatePostgres(func(state *State) error {
			index := slices.IndexFunc(state.Users, func(user User) bool {
				return user.Username == username
			})
			if index == -1 {
				found = false
				return nil
			}
			found = true

			existing := state.Users[index]
			for _, current := range state.Users {
				if current.Username != username && current.NIK == next.NIK {
					return errors.New("nik already exists")
				}
			}

			if existing.BuiltIn {
				next.Username = existing.Username
				next.NIK = existing.NIK
				next.Role = existing.Role
				next.BuiltIn = true
			} else {
				next.Username = existing.Username
				next.BuiltIn = existing.BuiltIn
			}

			next.CreatedAt = existing.CreatedAt
			next.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			state.Users[index] = next
			updated = cloneUser(next)
			return nil
		})
		if err != nil {
			return User{}, true, err
		}
		if !found {
			return User{}, false, nil
		}
		return updated, true, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	index := slices.IndexFunc(s.state.Users, func(user User) bool {
		return user.Username == username
	})
	if index == -1 {
		return User{}, false, nil
	}

	existing := s.state.Users[index]
	for _, current := range s.state.Users {
		if current.Username != username && current.NIK == next.NIK {
			return User{}, true, errors.New("nik already exists")
		}
	}

	if existing.BuiltIn {
		next.Username = existing.Username
		next.NIK = existing.NIK
		next.Role = existing.Role
		next.BuiltIn = true
	} else {
		next.Username = existing.Username
		next.BuiltIn = existing.BuiltIn
	}

	next.CreatedAt = existing.CreatedAt
	next.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.state.Users[index] = next

	if err := s.saveLocked(); err != nil {
		return User{}, true, err
	}

	return cloneUser(next), true, nil
}

func (s *Store) UpdateNetwork(network NetworkConfig) (State, error) {
	if s.db != nil {
		return s.updateStatePostgres(func(state *State) error {
			state.Network = network
			return nil
		})
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.state.Network = network
	if err := s.saveLocked(); err != nil {
		return State{}, err
	}
	return cloneState(s.state), nil
}

func (s *Store) AddPeer(peer Peer) (State, Peer, error) {
	if s.db != nil {
		peer.CreatedAt = time.Now().UTC().Format(time.RFC3339)
		state, err := s.updateStatePostgres(func(current *State) error {
			current.Peers = append([]Peer{peer}, current.Peers...)
			return nil
		})
		if err != nil {
			return State{}, Peer{}, err
		}
		return state, peer, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	peer.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	s.state.Peers = append([]Peer{peer}, s.state.Peers...)

	if err := s.saveLocked(); err != nil {
		return State{}, Peer{}, err
	}

	return cloneState(s.state), peer, nil
}

func (s *Store) DeletePeer(id string) (State, bool, error) {
	if s.db != nil {
		var deleted bool
		state, err := s.updateStatePostgres(func(current *State) error {
			index := slices.IndexFunc(current.Peers, func(peer Peer) bool {
				return peer.ID == id
			})
			if index == -1 {
				deleted = false
				return nil
			}
			deleted = true
			current.Peers = append(current.Peers[:index], current.Peers[index+1:]...)
			return nil
		})
		if err != nil {
			return State{}, false, err
		}
		if !deleted {
			return State{}, false, nil
		}
		return state, true, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	index := slices.IndexFunc(s.state.Peers, func(peer Peer) bool {
		return peer.ID == id
	})
	if index == -1 {
		return State{}, false, nil
	}

	s.state.Peers = append(s.state.Peers[:index], s.state.Peers[index+1:]...)
	if err := s.saveLocked(); err != nil {
		return State{}, false, err
	}

	return cloneState(s.state), true, nil
}

func (s *Store) GetPeer(id string) (Peer, bool) {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return Peer{}, false
		}
		for _, peer := range state.Peers {
			if peer.ID == id {
				return clonePeer(peer), true
			}
		}
		return Peer{}, false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, peer := range s.state.Peers {
		if peer.ID == id {
			return clonePeer(peer), true
		}
	}

	return Peer{}, false
}

func (s *Store) AddLog(entry AuditLog) (AuditLog, error) {
	if s.db != nil {
		if entry.CreatedAt == "" {
			entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
		}
		_, err := s.updateStatePostgres(func(state *State) error {
			state.Logs = append([]AuditLog{entry}, state.Logs...)
			return nil
		})
		if err != nil {
			return AuditLog{}, err
		}
		return entry, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if entry.CreatedAt == "" {
		entry.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	}

	s.state.Logs = append([]AuditLog{entry}, s.state.Logs...)
	if err := s.saveLocked(); err != nil {
		return AuditLog{}, err
	}

	return entry, nil
}

func (s *Store) GetSettings() Settings {
	if s.db != nil {
		state, err := s.loadStatePostgres()
		if err != nil {
			return DefaultState().Settings
		}
		return cloneSettings(state.Settings)
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneSettings(s.state.Settings)
}

func (s *Store) UpdateSettings(settings Settings) (State, error) {
	if s.db != nil {
		return s.updateStatePostgres(func(state *State) error {
			state.Settings = settings
			return nil
		})
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.state.Settings = settings
	if err := s.saveLocked(); err != nil {
		return State{}, err
	}
	return cloneState(s.state), nil
}

func (s *Store) saveLocked() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o644)
}

func (s *Store) ensurePostgresSchema() error {
	if s.db == nil {
		return nil
	}

	if _, err := s.db.Exec(`
CREATE TABLE IF NOT EXISTS occ_state (
  id SMALLINT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`); err != nil {
		return err
	}

	if _, err := s.db.Exec(`
INSERT INTO occ_state (id, payload)
VALUES (1, $1::jsonb)
ON CONFLICT (id) DO NOTHING
`, stateJSON(DefaultState())); err != nil {
		return err
	}

	return nil
}

func (s *Store) loadStatePostgres() (State, error) {
	if s.db == nil {
		return State{}, errors.New("postgres is not configured")
	}

	var payload []byte
	err := s.db.QueryRow(`SELECT payload FROM occ_state WHERE id = 1`).Scan(&payload)
	if err != nil {
		return State{}, err
	}

	var state State
	if err := json.Unmarshal(payload, &state); err != nil {
		return State{}, err
	}
	return normalizeState(state), nil
}

func (s *Store) updateStatePostgres(mutator func(state *State) error) (State, error) {
	if s.db == nil {
		return State{}, errors.New("postgres is not configured")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return State{}, err
	}
	defer tx.Rollback()

	var payload []byte
	if err := tx.QueryRow(`SELECT payload FROM occ_state WHERE id = 1 FOR UPDATE`).Scan(&payload); err != nil {
		return State{}, err
	}

	var state State
	if err := json.Unmarshal(payload, &state); err != nil {
		return State{}, err
	}
	state = normalizeState(state)

	if err := mutator(&state); err != nil {
		return State{}, err
	}

	nextJSON, err := json.Marshal(state)
	if err != nil {
		return State{}, err
	}

	if _, err := tx.Exec(`UPDATE occ_state SET payload = $1::jsonb, updated_at = NOW() WHERE id = 1`, string(nextJSON)); err != nil {
		return State{}, err
	}

	if err := tx.Commit(); err != nil {
		return State{}, err
	}

	return cloneState(state), nil
}

func stateJSON(state State) string {
	payload, err := json.Marshal(state)
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func normalizeState(state State) State {
	if state.Network.InterfaceName == "" {
		state.Network = DefaultState().Network
	}
	if state.Peers == nil {
		state.Peers = []Peer{}
	}
	if state.Users == nil {
		state.Users = []User{}
	}
	if state.Logs == nil {
		state.Logs = []AuditLog{}
	}
	if state.Settings.WG.Profiles == nil {
		state.Settings.WG.Profiles = map[string]WGProfileSettings{}
	}
	return state
}

func cloneState(state State) State {
	peers := make([]Peer, len(state.Peers))
	for i, peer := range state.Peers {
		peers[i] = clonePeer(peer)
	}

	return State{
		Network:  state.Network,
		Peers:    peers,
		Users:    cloneUsers(state.Users),
		Logs:     cloneLogs(state.Logs),
		Settings: cloneSettings(state.Settings),
	}
}

func cloneSettings(settings Settings) Settings {
	cloned := Settings{
		WG: WGSettings{
			ActiveProfile: settings.WG.ActiveProfile,
			Profiles:      map[string]WGProfileSettings{},
		},
	}
	for profileName, profile := range settings.WG.Profiles {
		nextProfile := WGProfileSettings{
			Servers: map[string]WGServerSettings{},
		}
		for serverID, server := range profile.Servers {
			nextProfile.Servers[serverID] = server
		}
		cloned.WG.Profiles[profileName] = nextProfile
	}
	return cloned
}

func clonePeer(peer Peer) Peer {
	peer.AllowedIPs = append([]string(nil), peer.AllowedIPs...)
	if len(peer.Assignments) > 0 {
		peer.Assignments = append([]PeerAssignment(nil), peer.Assignments...)
	}
	if len(peer.Artifacts) > 0 {
		peer.Artifacts = append([]PeerArtifact(nil), peer.Artifacts...)
	}
	return peer
}

func cloneUsers(users []User) []User {
	cloned := make([]User, len(users))
	for i, user := range users {
		cloned[i] = cloneUser(user)
	}
	return cloned
}

func cloneUser(user User) User {
	return user
}

func cloneLogs(items []AuditLog) []AuditLog {
	cloned := make([]AuditLog, len(items))
	copy(cloned, items)
	return cloned
}
