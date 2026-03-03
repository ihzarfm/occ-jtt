package wg

import (
	"fmt"
	"strings"

	"occ-jtt/backend/internal/store"
)

func RenderPeerConfig(network store.NetworkConfig, peer store.Peer) string {
	var builder strings.Builder

	builder.WriteString("[Interface]\n")
	builder.WriteString(fmt.Sprintf("PrivateKey = %s\n", placeholder(peer.Name)))
	builder.WriteString(fmt.Sprintf("Address = %s\n", peer.AssignedIP))
	if network.DNS != "" {
		builder.WriteString(fmt.Sprintf("DNS = %s\n", network.DNS))
	}

	builder.WriteString("\n[Peer]\n")
	builder.WriteString(fmt.Sprintf("PublicKey = %s\n", network.ServerPublicKey))
	if peer.PresharedKey != "" {
		builder.WriteString(fmt.Sprintf("PresharedKey = %s\n", peer.PresharedKey))
	}
	allowedIPs := peer.AllowedIPs
	if len(allowedIPs) == 0 {
		allowedIPs = []string{"0.0.0.0/0"}
	}
	builder.WriteString(fmt.Sprintf("AllowedIPs = %s\n", strings.Join(allowedIPs, ", ")))

	endpoint := peer.Endpoint
	if endpoint == "" {
		endpoint = fmt.Sprintf("vpn.example.com:%d", network.ListenPort)
	}
	builder.WriteString(fmt.Sprintf("Endpoint = %s\n", endpoint))

	keepalive := peer.Keepalive
	if keepalive == 0 {
		keepalive = 25
	}
	builder.WriteString(fmt.Sprintf("PersistentKeepalive = %d\n", keepalive))

	return builder.String()
}

func placeholder(name string) string {
	if name == "" {
		return "replace-with-client-private-key"
	}
	return fmt.Sprintf("replace-%s-private-key", sanitize(name))
}

func sanitize(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	if value == "" {
		return "client"
	}
	return value
}
