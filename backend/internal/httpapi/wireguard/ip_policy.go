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

var overlayCIDRResolver func(string) (string, bool)

func setOverlayCIDRResolver(resolver func(string) (string, bool)) {
	overlayCIDRResolver = resolver
}

func overlayPrefixForServerID(serverID string) (netip.Prefix, bool) {
	normalized := strings.ToLower(strings.TrimSpace(serverID))
	cidr, ok := serverOverlayByID[normalized]
	if overlayCIDRResolver != nil {
		if resolvedCIDR, resolved := overlayCIDRResolver(normalized); resolved {
			cidr = resolvedCIDR
			ok = true
		}
	}
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

func adminRangeForServerID(serverID string) (netip.Addr, netip.Addr, netip.Prefix, bool) {
	prefix, ok := overlayPrefixForServerID(serverID)
	if !ok || !prefix.Addr().Is4() || prefix.Bits() != 22 {
		return netip.Addr{}, netip.Addr{}, netip.Prefix{}, false
	}

	base := prefix.Masked().Addr().As4()
	startThird := base[2] + 3 // last /24 in /22
	start := netip.AddrFrom4([4]byte{base[0], base[1], startThird, 2})
	end := netip.AddrFrom4([4]byte{base[0], base[1], startThird, 254})
	return start, end, prefix, true
}

func siteRangeForServerID(serverID string) (netip.Addr, netip.Addr, netip.Prefix, bool) {
	prefix, ok := overlayPrefixForServerID(serverID)
	if !ok || !prefix.Addr().Is4() || prefix.Bits() != 22 {
		return netip.Addr{}, netip.Addr{}, netip.Prefix{}, false
	}

	base := prefix.Masked().Addr().As4()
	startThird := base[2]
	endThird := base[2] + 2
	start := netip.AddrFrom4([4]byte{base[0], base[1], startThird, 2})
	end := netip.AddrFrom4([4]byte{base[0], base[1], endThird, 254})
	return start, end, prefix, true
}

func isAdminIPAllowedForServer(ip netip.Addr, serverID string) bool {
	start, end, _, ok := adminRangeForServerID(serverID)
	if !ok {
		return false
	}
	if ip.Compare(start) < 0 || ip.Compare(end) > 0 {
		return false
	}
	return !isReservedHostOctet(ip)
}

func isSiteIPAllowedForServer(ip netip.Addr, serverID string) bool {
	start, end, _, ok := siteRangeForServerID(serverID)
	if !ok {
		return false
	}
	if ip.Compare(start) < 0 || ip.Compare(end) > 0 {
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
