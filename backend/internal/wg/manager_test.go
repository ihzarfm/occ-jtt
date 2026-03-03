package wg

import (
	"strings"
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestRenderPeerConfigIncludesPeerValues(t *testing.T) {
	config := RenderPeerConfig(
		store.NetworkConfig{
			ListenPort:      51820,
			ServerPublicKey: "server-key",
			DNS:             "1.1.1.1",
		},
		store.Peer{
			Name:         "Laptop Admin",
			AssignedIP:   "10.8.0.10/32",
			PresharedKey: "psk",
			AllowedIPs:   []string{"10.0.0.0/8", "192.168.0.0/16"},
			Endpoint:     "vpn.example.com:51820",
			Keepalive:    30,
		},
	)

	checks := []string{
		"Address = 10.8.0.10/32",
		"PublicKey = server-key",
		"PresharedKey = psk",
		"AllowedIPs = 10.0.0.0/8, 192.168.0.0/16",
		"Endpoint = vpn.example.com:51820",
		"PersistentKeepalive = 30",
	}

	for _, item := range checks {
		if !strings.Contains(config, item) {
			t.Fatalf("expected config to contain %q, got:\n%s", item, config)
		}
	}
}
