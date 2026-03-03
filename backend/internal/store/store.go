package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
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

type State struct {
	Network NetworkConfig `json:"network"`
	Peers   []Peer        `json:"peers"`
	Users   []User        `json:"users"`
	Logs    []AuditLog    `json:"logs"`
}

type Store struct {
	path  string
	mu    sync.RWMutex
	state State
}

func DefaultState() State {
	return State{
		Network: NetworkConfig{
			InterfaceName:   "wg0",
			ServerAddress:   "10.8.0.1/24",
			ListenPort:      51820,
			ServerPublicKey: "replace-with-server-public-key",
			DNS:             "1.1.1.1",
		},
		Peers: []Peer{},
		Users: []User{},
		Logs:  []AuditLog{},
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

func (s *Store) GetState() State {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneState(s.state)
}

func (s *Store) ListLogs(category string) []AuditLog {
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
	s.mu.RLock()
	defer s.mu.RUnlock()

	users := make([]User, len(s.state.Users))
	for i, user := range s.state.Users {
		users[i] = cloneUser(user)
	}

	return users
}

func (s *Store) Authenticate(username, password string) (User, bool) {
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
	s.mu.Lock()
	defer s.mu.Unlock()

	s.state.Network = network
	if err := s.saveLocked(); err != nil {
		return State{}, err
	}
	return cloneState(s.state), nil
}

func (s *Store) AddPeer(peer Peer) (State, Peer, error) {
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

func (s *Store) saveLocked() error {
	data, err := json.MarshalIndent(s.state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0o644)
}

func cloneState(state State) State {
	peers := make([]Peer, len(state.Peers))
	for i, peer := range state.Peers {
		peers[i] = clonePeer(peer)
	}

	return State{
		Network: state.Network,
		Peers:   peers,
		Users:   cloneUsers(state.Users),
		Logs:    cloneLogs(state.Logs),
	}
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
