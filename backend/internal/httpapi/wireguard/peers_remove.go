package wireguard

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"occ-jtt/backend/internal/store"
)

func (h *Handler) HandlePeerByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/peers/")
	path = strings.Trim(path, "/")
	if path == "" {
		methodNotAllowed(w)
		return
	}

	parts := strings.Split(path, "/")
	id := decodePathSegment(parts[0])
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing peer id")
		return
	}

	if len(parts) == 2 && parts[1] == "config" {
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		if !h.RequireRole(w, r, "administrator") {
			return
		}
		h.renderConfig(w, id)
		return
	}

	if len(parts) == 3 && parts[1] == "artifacts" {
		if r.Method != http.MethodGet {
			methodNotAllowed(w)
			return
		}
		artifactID := decodePathSegment(parts[2])
		if artifactID == "" {
			writeError(w, http.StatusBadRequest, "missing artifact id")
			return
		}
		h.renderArtifact(w, id, artifactID)
		return
	}

	if len(parts) != 1 {
		http.NotFound(w, r)
		return
	}

	if r.Method != http.MethodDelete {
		methodNotAllowed(w)
		return
	}
	if !h.RequireRole(w, r, "administrator") {
		return
	}

	peer, ok := h.Store.GetPeer(id)
	if !ok {
		writeError(w, http.StatusNotFound, "peer not found")
		return
	}
	if err := h.removeRemotePeer(r, peer); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	state, _, err := h.Store.DeletePeer(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete peer")
		return
	}

	h.AppendAuditLog(r, "wireguard", "delete", peer.Name, fmt.Sprintf("Deleted peer %s", peer.Name))

	writeJSON(w, http.StatusOK, publicState(state))
}

func (h *Handler) removeRemotePeer(r *http.Request, peer store.Peer) error {
	if peer.Type != "outlet" || len(peer.Assignments) == 0 {
		return nil
	}

	siteName := strings.TrimSpace(peer.SiteName)
	if siteName == "" {
		siteName = strings.TrimPrefix(peer.Name, "Outlet - ")
	}
	if siteName == "" {
		return errors.New("missing site name for outlet peer")
	}

	for _, assignment := range peer.Assignments {
		result, err := h.RemoveOutletFromWG(r.Context(), assignment.ServerID, siteName)
		if err != nil {
			if isRemotePeerNotFoundError(err.Error()) {
				continue
			}
			return err
		}
		if !result.OK || !result.Removed {
			message := result.Error
			if message == "" {
				message = fmt.Sprintf("remote remove failed on %s", assignment.ServerName)
			}
			if isRemotePeerNotFoundError(message) {
				continue
			}
			return errors.New(message)
		}
	}

	return nil
}

func decodePathSegment(value string) string {
	decoded, err := url.PathUnescape(value)
	if err != nil {
		// Keep backward compatibility for legacy IDs that include raw '%'
		// and are sent without URL encoding.
		return strings.TrimSpace(value)
	}
	return strings.TrimSpace(decoded)
}
