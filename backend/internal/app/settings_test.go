package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"occ-jtt/backend/internal/httpapi/wireguard"
	"occ-jtt/backend/internal/store"
)

func TestSettingsRequireSuperadmin(t *testing.T) {
	stateStore, err := store.New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	s := &server{
		store: stateStore,
		sessions: map[string]store.User{
			"sess-admin": {Username: "admin", Role: "administrator"},
		},
	}

	handler := s.withRole("superadmin", s.handleSettings)
	req := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
	req.AddCookie(&http.Cookie{Name: "occ_session", Value: "sess-admin"})
	res := httptest.NewRecorder()

	handler(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", res.Code)
	}
}

func TestSettingsRejectInvalidCIDR(t *testing.T) {
	stateStore, err := store.New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	s := &server{store: stateStore}
	payload := store.Settings{
		WG: store.WGSettings{
			ActiveProfile: "staging",
			Profiles: map[string]store.WGProfileSettings{
				"staging": {
					Servers: map[string]store.WGServerSettings{
						"stg-its": {
							ID:           "stg-its",
							Enabled:      true,
							DisplayName:  "stg-its",
							OverlayCIDR:  "invalid-cidr",
							EndpointHost: "10.0.0.1",
							EndpointPort: 22,
							SSHUser:      "raph",
							SSHKeyPath:   "~/.ssh/id_ed25519",
						},
					},
				},
			},
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	res := httptest.NewRecorder()
	s.handleSettings(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", res.Code)
	}
}

func TestSettingsRejectOverlayCIDRNotSlash22(t *testing.T) {
	stateStore, err := store.New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	s := &server{store: stateStore}
	payload := store.Settings{
		WG: store.WGSettings{
			ActiveProfile: "staging",
			Profiles: map[string]store.WGProfileSettings{
				"staging": {
					Servers: map[string]store.WGServerSettings{
						"stg-its": {
							ID:           "stg-its",
							Enabled:      true,
							DisplayName:  "stg-its",
							OverlayCIDR:  "10.21.0.0/24",
							EndpointHost: "10.0.0.1",
							EndpointPort: 22,
							SSHUser:      "raph",
							SSHKeyPath:   "~/.ssh/id_ed25519",
						},
					},
				},
			},
		},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPut, "/api/settings", bytes.NewReader(body))
	res := httptest.NewRecorder()
	s.handleSettings(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", res.Code)
	}
	if !bytes.Contains(res.Body.Bytes(), []byte("wg overlayCIDR must be /22")) {
		t.Fatalf("expected /22 validation error, got: %s", res.Body.String())
	}
}

func TestEffectiveWGSettingsFallback(t *testing.T) {
	stateStore, err := store.New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	s := &server{
		store:     stateStore,
		wgServers: defaultWGServers(),
	}

	settings := s.effectiveWGSettings()
	if settings.WG.ActiveProfile == "" {
		t.Fatalf("expected active profile fallback")
	}
	if len(settings.WG.Profiles) == 0 {
		t.Fatalf("expected fallback profiles")
	}
}

func TestNormalizeWGSettingsIDsPrefersCanonicalOverLegacyAlias(t *testing.T) {
	input := store.Settings{
		WG: store.WGSettings{
			ActiveProfile: "staging",
			Profiles: map[string]store.WGProfileSettings{
				"staging": {
					Servers: map[string]store.WGServerSettings{
						"wg-its": {
							ID:           "wg-its",
							Enabled:      true,
							DisplayName:  "wg-its",
							OverlayCIDR:  "10.21.0.0/22",
							EndpointHost: "10.21.0.1",
							EndpointPort: 22,
							SSHUser:      "raph",
							SSHKeyPath:   "~/.ssh/id_ed25519",
						},
						"stg-its": {
							ID:           "stg-its",
							Enabled:      true,
							DisplayName:  "stg-its",
							OverlayCIDR:  "10.21.0.0/22",
							EndpointHost: "10.99.0.1",
							EndpointPort: 22,
							SSHUser:      "legacy",
							SSHKeyPath:   "~/.ssh/id_ed25519",
						},
					},
				},
			},
		},
	}

	normalized := normalizeWGSettingsIDs(input, false)
	profile := normalized.WG.Profiles["staging"]
	if len(profile.Servers) != 1 {
		t.Fatalf("expected deduplicated server map, got %d", len(profile.Servers))
	}
	server := profile.Servers["wg-its"]
	if server.EndpointHost != "10.21.0.1" {
		t.Fatalf("expected canonical entry to win, got %s", server.EndpointHost)
	}
}

func TestListWGServersFromSettingsCanonicalizesLegacyIDs(t *testing.T) {
	stateStore, err := store.New(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	legacy := store.Settings{
		WG: store.WGSettings{
			ActiveProfile: "staging",
			Profiles: map[string]store.WGProfileSettings{
				"staging": {
					Servers: map[string]store.WGServerSettings{
						"stg-its": {
							ID:           "stg-its",
							Enabled:      true,
							DisplayName:  "stg-its",
							OverlayCIDR:  "10.21.0.0/22",
							EndpointHost: "10.21.0.1",
							EndpointPort: 22,
							SSHUser:      "raph",
							SSHKeyPath:   "~/.ssh/id_ed25519",
						},
					},
				},
			},
		},
	}
	if _, err := stateStore.UpdateSettings(legacy); err != nil {
		t.Fatalf("failed to save settings: %v", err)
	}

	s := &server{
		store:     stateStore,
		wgServers: defaultWGServers(),
	}

	servers := s.listWGServersFromSettings()
	if len(servers) != 1 {
		t.Fatalf("expected one server, got %d", len(servers))
	}
	if servers[0].ID != wireguard.ServerWGITS {
		t.Fatalf("expected canonical id %s, got %s", wireguard.ServerWGITS, servers[0].ID)
	}
}
