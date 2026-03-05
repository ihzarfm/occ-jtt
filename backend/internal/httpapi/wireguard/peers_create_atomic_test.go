package wireguard

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestCreateSitePeerAtomicRollbackWhenSecondServerFails(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	rollbackCalls := []string{}
	handler := &Handler{
		Store: stateStore,
		ListWGServers: func() []WGServerConfig {
			return []WGServerConfig{
				{ID: "wg-its", Name: "wg-its"},
				{ID: "wg-cctv", Name: "wg-cctv"},
			}
		},
		CreateSiteOnWG: func(_ context.Context, serverID, _ string) (RemoteScriptResult, error) {
			if serverID == "wg-its" {
				return RemoteScriptResult{
					OK:         true,
					Applied:    true,
					AssignedIP: "10.21.0.8",
					Interface:  "wg-its",
					Overlay:    "10.21.0.0/22",
					PeerFile:   "/tmp/a.conf",
					RouterFile: "/tmp/a.rsc",
				}, nil
			}
			return RemoteScriptResult{
				OK:         true,
				Applied:    true,
				AssignedIP: "10.22.3.10",
				Interface:  "wg-cctv",
				Overlay:    "10.22.0.0/22",
				PeerFile:   "/tmp/b.conf",
				RouterFile: "/tmp/b.rsc",
			}, nil
		},
		RemoveSiteFromWG: func(_ context.Context, serverID, _ string) (RemoteScriptResult, error) {
			rollbackCalls = append(rollbackCalls, serverID)
			return RemoteScriptResult{OK: true, Removed: true}, nil
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"site","name":"SITE-A"}`))
	res := httptest.NewRecorder()
	handler.createPeer(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}
	if len(rollbackCalls) != 1 || rollbackCalls[0] != "wg-its" {
		t.Fatalf("expected rollback only for wg-its, got %#v", rollbackCalls)
	}
	if len(stateStore.GetState().Peers) != 0 {
		t.Fatalf("expected no peers persisted after partial failure")
	}
}

func TestCreateSitePeerAtomicNoRollbackWhenFirstServerFails(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	rollbackCalls := 0
	handler := &Handler{
		Store: stateStore,
		ListWGServers: func() []WGServerConfig {
			return []WGServerConfig{
				{ID: "wg-its", Name: "wg-its"},
				{ID: "wg-cctv", Name: "wg-cctv"},
			}
		},
		CreateSiteOnWG: func(_ context.Context, serverID, _ string) (RemoteScriptResult, error) {
			if serverID == "wg-its" {
				return RemoteScriptResult{OK: false, Applied: false, Error: "peer already exists"}, nil
			}
			return RemoteScriptResult{OK: true, Applied: true, AssignedIP: "10.22.0.8"}, nil
		},
		RemoveSiteFromWG: func(_ context.Context, _, _ string) (RemoteScriptResult, error) {
			rollbackCalls++
			return RemoteScriptResult{OK: true, Removed: true}, nil
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"site","name":"SITE-A"}`))
	res := httptest.NewRecorder()
	handler.createPeer(res, req)

	if res.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", res.Code, res.Body.String())
	}
	if rollbackCalls != 0 {
		t.Fatalf("expected no rollback attempt when first apply fails, got %d", rollbackCalls)
	}
	if len(stateStore.GetState().Peers) != 0 {
		t.Fatalf("expected no peers persisted")
	}
}

func TestCreateSitePeerAtomicRollbackFailureStillFails(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	handler := &Handler{
		Store: stateStore,
		ListWGServers: func() []WGServerConfig {
			return []WGServerConfig{
				{ID: "wg-its", Name: "wg-its"},
				{ID: "wg-cctv", Name: "wg-cctv"},
			}
		},
		CreateSiteOnWG: func(_ context.Context, serverID, _ string) (RemoteScriptResult, error) {
			if serverID == "wg-its" {
				return RemoteScriptResult{
					OK:         true,
					Applied:    true,
					AssignedIP: "10.21.0.8",
					Interface:  "wg-its",
					Overlay:    "10.21.0.0/22",
					PeerFile:   "/tmp/a.conf",
					RouterFile: "/tmp/a.rsc",
				}, nil
			}
			return RemoteScriptResult{OK: false, Applied: false, Error: "peer already exists"}, nil
		},
		RemoveSiteFromWG: func(_ context.Context, _, _ string) (RemoteScriptResult, error) {
			return RemoteScriptResult{OK: false, Removed: false, Error: "rollback command failed"}, nil
		},
	}

	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"site","name":"SITE-A"}`))
	res := httptest.NewRecorder()
	handler.createPeer(res, req)

	if res.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "rollback=") {
		t.Fatalf("expected rollback error details in response, got %s", res.Body.String())
	}
	if len(stateStore.GetState().Peers) != 0 {
		t.Fatalf("expected no peers persisted when rollback fails")
	}
}
