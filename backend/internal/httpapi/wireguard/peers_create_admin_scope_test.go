package wireguard

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestCreateAdministratorPeerResolvesScopeAlias(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	handler := &Handler{
		Store: stateStore,
		CurrentUser: func(*http.Request) (store.User, bool) {
			return store.User{}, false
		},
		AppendAuditLog: func(*http.Request, string, string, string, string) {},
		ListWGServers: func() []WGServerConfig {
			return []WGServerConfig{
				{
					ID:          "stg-its",
					Name:        "stg-its",
					OverlayCIDR: "10.21.0.0/22",
				},
			}
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"administrator","name":"RAF-LAPTOP","targetServer":"wg-its","publicKey":"abc","assignedIP":"10.21.3.4"}`))
	res := httptest.NewRecorder()
	handler.createPeer(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestCreateAdministratorPeerRejectsUnknownServerScope(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	handler := &Handler{
		Store: stateStore,
		CurrentUser: func(*http.Request) (store.User, bool) {
			return store.User{}, false
		},
		AppendAuditLog: func(*http.Request, string, string, string, string) {},
		ListWGServers: func() []WGServerConfig {
			return []WGServerConfig{
				{
					ID:          "stg-cctv",
					Name:        "stg-cctv",
					OverlayCIDR: "10.22.0.0/22",
				},
			}
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"administrator","name":"RAF-LAPTOP","targetServer":"wg-its","publicKey":"abc","assignedIP":"10.21.3.4"}`))
	res := httptest.NewRecorder()
	handler.createPeer(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "Unknown serverScope: wg-its") {
		t.Fatalf("unexpected response body: %s", res.Body.String())
	}
}
