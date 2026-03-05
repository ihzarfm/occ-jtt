package wireguard

import (
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestIsAdminIPAllowedForServer(t *testing.T) {
	validCases := []struct {
		serverID string
		ip       string
	}{
		{serverID: "wg-its", ip: "10.21.3.2"},
		{serverID: "wg-its", ip: "10.21.3.254"},
		{serverID: "stg-cctv", ip: "10.22.3.2"},
		{serverID: "wg-cctv", ip: "10.22.3.254"},
	}
	for _, tc := range validCases {
		addr, ok := parseIPv4(tc.ip)
		if !ok {
			t.Fatalf("failed parsing ip %s", tc.ip)
		}
		if !isAdminIPAllowedForServer(addr, tc.serverID) {
			t.Fatalf("expected allowed ip %s for %s", tc.ip, tc.serverID)
		}
	}

	invalidCases := []struct {
		serverID string
		ip       string
	}{
		{serverID: "wg-its", ip: "10.21.2.10"},
		{serverID: "wg-its", ip: "10.21.3.1"},
		{serverID: "wg-its", ip: "10.21.3.255"},
		{serverID: "wg-its", ip: "10.22.3.10"},
		{serverID: "wg-cctv", ip: "10.22.2.10"},
		{serverID: "wg-cctv", ip: "10.22.3.1"},
		{serverID: "wg-cctv", ip: "10.22.3.255"},
		{serverID: "wg-cctv", ip: "10.21.3.10"},
	}
	for _, tc := range invalidCases {
		addr, ok := parseIPv4(tc.ip)
		if !ok {
			t.Fatalf("failed parsing ip %s", tc.ip)
		}
		if isAdminIPAllowedForServer(addr, tc.serverID) {
			t.Fatalf("expected disallowed ip %s for %s", tc.ip, tc.serverID)
		}
	}
}

func TestIsAssignedIPAlreadyInUse(t *testing.T) {
	state := store.State{
		Peers: []store.Peer{
			{
				Name:       "Admin-A",
				AssignedIP: "10.21.3.10",
			},
			{
				Name: "Site-A",
				Assignments: []store.PeerAssignment{
					{ServerID: "stg-cctv", AssignedIP: "10.22.0.10"},
				},
			},
		},
	}

	targetAddr, ok := parseIPv4("10.21.3.10")
	if !ok {
		t.Fatalf("failed to parse target ip")
	}
	if !isAssignedIPAlreadyInUse(state, targetAddr, "wg-its") {
		t.Fatalf("expected duplicate to be detected for admin assignedIP")
	}

	targetAddr, ok = parseIPv4("10.22.0.10")
	if !ok {
		t.Fatalf("failed to parse target ip")
	}
	if !isAssignedIPAlreadyInUse(state, targetAddr, "wg-cctv") {
		t.Fatalf("expected duplicate to be detected for site assignment")
	}
}

func TestIsSiteIPAllowedForServer(t *testing.T) {
	valid, ok := parseIPv4("10.21.2.254")
	if !ok {
		t.Fatalf("failed parsing ip")
	}
	if !isSiteIPAllowedForServer(valid, "wg-its") {
		t.Fatalf("expected valid site ip")
	}

	invalid, ok := parseIPv4("10.21.3.10")
	if !ok {
		t.Fatalf("failed parsing ip")
	}
	if isSiteIPAllowedForServer(invalid, "wg-its") {
		t.Fatalf("expected site ip out-of-range to be rejected")
	}
}
