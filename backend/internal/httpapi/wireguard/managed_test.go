package wireguard

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestCreatePeerRejectsUnmanagedOutletPeer(t *testing.T) {
	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}

	handler := &Handler{Store: stateStore}
	req := httptest.NewRequest(http.MethodPost, "/api/peers", strings.NewReader(`{"peerType":"outlet","name":"SITE-A","managed":false}`))
	res := httptest.NewRecorder()

	handler.createPeer(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "site peer with managed=false is not supported") {
		t.Fatalf("unexpected response: %s", res.Body.String())
	}
}

func TestRemoveRemotePeerSkipsUnmanagedOutletPeer(t *testing.T) {
	calls := 0
	handler := &Handler{
		RemoveOutletFromWG: func(_ context.Context, _ string, _ string) (RemoteScriptResult, error) {
			calls++
			return RemoteScriptResult{}, nil
		},
	}

	peer := store.Peer{
		Type:      "outlet",
		SiteName:  "SITE-A",
		Managed:   false,
		Assignments: []store.PeerAssignment{{ServerID: "stg-its"}},
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/peers/p1", nil)
	if err := handler.removeRemotePeer(req, peer); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if calls != 0 {
		t.Fatalf("expected remote remove to be skipped, got %d calls", calls)
	}
}
