package wireguard

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"occ-jtt/backend/internal/store"
)

func (h *Handler) HandleNetwork(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		methodNotAllowed(w)
		return
	}

	var network store.NetworkConfig
	if err := json.NewDecoder(r.Body).Decode(&network); err != nil {
		writeError(w, http.StatusBadRequest, "invalid network payload")
		return
	}

	if strings.TrimSpace(network.InterfaceName) == "" || strings.TrimSpace(network.ServerAddress) == "" || network.ListenPort <= 0 {
		writeError(w, http.StatusBadRequest, "interfaceName, serverAddress, and listenPort are required")
		return
	}

	state, err := h.Store.UpdateNetwork(network)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save network")
		return
	}

	h.AppendAuditLog(r, "wireguard", "update", network.InterfaceName, fmt.Sprintf("Updated network settings for %s", network.InterfaceName))

	writeJSON(w, http.StatusOK, publicState(state))
}

func (h *Handler) HandlePeerDiagnostics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	peers := h.Store.GetState().Peers
	items := make([]map[string]any, 0, len(peers))

	for _, peer := range peers {
		targets := peerTargets(peer)
		for _, target := range targets {
			latency, err := h.PingLatency(r.Context(), target.AssignedIP)

			item := map[string]any{
				"id":         peer.ID,
				"name":       peer.Name,
				"assignedIP": target.AssignedIP,
				"target":     target.Label,
				"checkedAt":  time.Now().UTC().Format(time.RFC3339),
			}

			if err != nil {
				item["status"] = "down"
				item["error"] = err.Error()
			} else {
				item["status"] = "up"
				item["latencyMs"] = latency
			}

			items = append(items, item)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":      items,
		"checkedAt":  time.Now().UTC().Format(time.RFC3339),
		"totalPeers": len(peers),
	})
}

func (h *Handler) HandleWGServers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, h.ListWGServers())
}

func (h *Handler) HandleWGServerDiagnostics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	servers := h.ListWGServers()
	items := make([]map[string]any, 0, len(servers))
	checkedAt := time.Now().UTC().Format(time.RFC3339)

	for _, serverConfig := range servers {
		pingLatencyMs, pingErr := h.PingLatency(r.Context(), serverConfig.Host)
		sshDurationMs, sshErr := h.SSHHandshakeLatency(r.Context(), serverConfig)

		items = append(items, map[string]any{
			"id":            serverConfig.ID,
			"name":          serverConfig.Name,
			"host":          serverConfig.Host,
			"sshUser":       serverConfig.SSHUser,
			"sshPort":       serverConfig.SSHPort,
			"keyPath":       serverConfig.KeyPath,
			"wireGuardIP":   serverConfig.WireGuardIP,
			"pingStatus":    diagnosticStatus(pingErr),
			"sshStatus":     diagnosticStatus(sshErr),
			"pingLatencyMs": valueOrNil(pingLatencyMs, pingErr),
			"sshLatencyMs":  valueOrNil(sshDurationMs, sshErr),
			"pingError":     errorMessage(pingErr),
			"sshError":      errorMessage(sshErr),
			"checkedAt":     checkedAt,
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"items":     items,
		"checkedAt": checkedAt,
	})
}
