package wireguard

import "strings"

const (
	ServerWGITS  = "wg-its"
	ServerWGCCTV = "wg-cctv"
	ServerStgITS = "stg-its"
	ServerStgCTV = "stg-cctv"
)

func CanonicalizeServerID(id string) string {
	trimmed := strings.TrimSpace(id)
	normalized := strings.ToLower(trimmed)
	switch normalized {
	case ServerWGITS, ServerStgITS:
		return ServerWGITS
	case ServerWGCCTV, ServerStgCTV:
		return ServerWGCCTV
	default:
		return trimmed
	}
}

func ServerAliases(canonical string) []string {
	switch CanonicalizeServerID(canonical) {
	case ServerWGITS:
		return []string{ServerWGITS, ServerStgITS}
	case ServerWGCCTV:
		return []string{ServerWGCCTV, ServerStgCTV}
	default:
		trimmed := strings.TrimSpace(canonical)
		if trimmed == "" {
			return nil
		}
		return []string{trimmed}
	}
}

func IsServerAliasMatch(left, right string) bool {
	return CanonicalizeServerID(left) != "" &&
		CanonicalizeServerID(left) == CanonicalizeServerID(right)
}
