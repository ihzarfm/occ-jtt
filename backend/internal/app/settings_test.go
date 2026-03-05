package app

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

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
