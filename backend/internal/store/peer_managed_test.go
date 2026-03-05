package store

import (
	"encoding/json"
	"testing"
)

func TestPeerManagedDefaultForLegacySitePeer(t *testing.T) {
	var peer Peer
	if err := json.Unmarshal([]byte(`{"id":"p1","type":"site","name":"Site - A"}`), &peer); err != nil {
		t.Fatalf("failed to unmarshal peer: %v", err)
	}
	if !peer.Managed {
		t.Fatalf("expected legacy site peer to default managed=true")
	}
}

func TestPeerManagedDefaultForLegacyAssignmentPeer(t *testing.T) {
	var peer Peer
	if err := json.Unmarshal([]byte(`{"id":"p1","name":"Legacy","assignments":[{"serverId":"stg-its"}]}`), &peer); err != nil {
		t.Fatalf("failed to unmarshal peer: %v", err)
	}
	if !peer.Managed {
		t.Fatalf("expected legacy assignment peer to default managed=true")
	}
}

func TestPeerManagedDefaultForLegacyAdministratorPeer(t *testing.T) {
	var peer Peer
	if err := json.Unmarshal([]byte(`{"id":"p1","name":"Administrator-ABC"}`), &peer); err != nil {
		t.Fatalf("failed to unmarshal peer: %v", err)
	}
	if peer.Managed {
		t.Fatalf("expected legacy administrator peer to default managed=false")
	}
}

func TestPeerManagedExplicitValueIsPreserved(t *testing.T) {
	var peer Peer
	if err := json.Unmarshal([]byte(`{"id":"p1","type":"site","name":"Site - A","managed":false}`), &peer); err != nil {
		t.Fatalf("failed to unmarshal peer: %v", err)
	}
	if peer.Managed {
		t.Fatalf("expected managed=false to be preserved")
	}
}
