package wireguard

import (
	"fmt"
	"net/http"

	"occ-jtt/backend/internal/store"
	"occ-jtt/backend/internal/wg"
)

func (h *Handler) renderConfig(w http.ResponseWriter, id string) {
	peer, ok := h.Store.GetPeer(id)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}

	config := wg.RenderPeerConfig(h.Store.GetState().Network, peer)
	filename := fmt.Sprintf("%s.conf", id)

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	_, _ = w.Write([]byte(config))
}

func (h *Handler) renderArtifact(w http.ResponseWriter, peerID, artifactID string) {
	peer, ok := h.Store.GetPeer(peerID)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}

	for _, artifact := range peer.Artifacts {
		if artifact.ID != artifactID {
			continue
		}

		w.Header().Set("Content-Type", artifact.ContentType)
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", artifact.Filename))
		_, _ = w.Write([]byte(artifact.Content))
		return
	}

	writeError(w, http.StatusNotFound, "artifact not found")
}

func publicState(state store.State) map[string]any {
	return map[string]any{
		"network": state.Network,
		"peers":   state.Peers,
	}
}
