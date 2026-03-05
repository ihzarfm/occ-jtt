package wireguard

import (
	"net/netip"
	"strings"

	"occ-jtt/backend/internal/store"
)

var serverOverlayByID = map[string]string{
	"stg-its":  "10.21.0.0/22",
	"wg-its":   "10.21.0.0/22",
	"stg-cctv": "10.22.0.0/22",
	"wg-cctv":  "10.22.0.0/22",
}

func overlayPrefixForServerID(serverID string) (netip.Prefix, bool) {
	normalized := strings.ToLower(strings.TrimSpace(serverID))
	cidr, ok := serverOverlayByID[normalized]
	if !ok {
		return netip.Prefix{}, false
	}
	prefix, err := netip.ParsePrefix(cidr)
	if err != nil {
		return netip.Prefix{}, false
	}
	return prefix, true
}

func normalizeTargetServer(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	switch normalized {
	case "wg-its", "stg-its":
		return "wg-its"
	case "wg-cctv", "stg-cctv":
		return "wg-cctv"
	default:
		return normalized
	}
}

func parseIPv4(value string) (netip.Addr, bool) {
	addr, err := netip.ParseAddr(strings.TrimSpace(value))
	if err != nil || !addr.Is4() {
		return netip.Addr{}, false
	}
	return addr, true
}

func isReservedHostOctet(ip netip.Addr) bool {
	lastOctet := ip.As4()[3]
	return lastOctet == 1 || lastOctet == 255
}

func isAdminIPAllowedForServer(ip netip.Addr, serverID string) bool {
	prefix, ok := overlayPrefixForServerID(serverID)
	if !ok || !prefix.Contains(ip) {
		return false
	}

	octets := ip.As4()
	thirdOctet := octets[2]
	lastOctet := octets[3]
	if thirdOctet != 3 {
		return false
	}
	if lastOctet < 2 || lastOctet > 254 {
		return false
	}
	return !isReservedHostOctet(ip)
}

func isSiteIPAllowedForServer(ip netip.Addr, serverID string) bool {
	prefix, ok := overlayPrefixForServerID(serverID)
	if !ok || !prefix.Contains(ip) {
		return false
	}

	octets := ip.As4()
	thirdOctet := octets[2]
	lastOctet := octets[3]
	if thirdOctet > 2 {
		return false
	}
	if lastOctet < 2 || lastOctet > 254 {
		return false
	}
	return !isReservedHostOctet(ip)
}

func isAssignedIPAlreadyInUse(state store.State, ip netip.Addr, targetServer string) bool {
	targetPrefix, ok := overlayPrefixForServerID(targetServer)
	if !ok {
		return false
	}

	for _, peer := range state.Peers {
		if peerIP, ok := parseIPv4(peer.AssignedIP); ok && peerIP == ip {
			return true
		}

		for _, assignment := range peer.Assignments {
			assignmentIP, ok := parseIPv4(assignment.AssignedIP)
			if !ok || assignmentIP != ip {
				continue
			}

			assignmentPrefix, prefixOK := overlayPrefixForServerID(assignment.ServerID)
			if !prefixOK {
				if targetPrefix.Contains(assignmentIP) {
					return true
				}
				continue
			}
			if assignmentPrefix.Bits() == targetPrefix.Bits() && assignmentPrefix.Addr() == targetPrefix.Addr() {
				return true
			}
		}
	}

	return false
}
