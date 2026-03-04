package wireguard

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"occ-jtt/backend/internal/store"
)

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func parseCSV(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			items = append(items, part)
		}
	}
	return items
}

func newID(name string) string {
	cleaned := strings.ToLower(strings.TrimSpace(name))
	cleaned = strings.ReplaceAll(cleaned, " ", "-")
	cleaned = strings.ReplaceAll(cleaned, "/", "-")
	if cleaned == "" {
		cleaned = "peer"
	}
	return fmt.Sprintf("%s-%d", cleaned, time.Now().Unix())
}

func durationMillis(value time.Duration) int64 {
	return value.Milliseconds()
}

func diagnosticStatus(err error) string {
	if err != nil {
		return "down"
	}
	return "up"
}

func valueOrNil(value float64, err error) any {
	if err != nil {
		return nil
	}
	return value
}

func errorMessage(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func isRemotePeerNotFoundError(message string) bool {
	normalized := strings.ToLower(strings.TrimSpace(message))
	if normalized == "" {
		return false
	}
	return strings.Contains(normalized, "peer not found")
}

func remoteArtifactNote(serverConfig WGServerConfig, remotePath string) string {
	return fmt.Sprintf(
		"Artifact is stored on %s (%s) at %s.\nFetch it directly on the server or extend the wrapper to return file contents to OCC.\n",
		serverConfig.Name,
		serverConfig.Host,
		remotePath,
	)
}

func peerTargets(peer store.Peer) []peerTarget {
	if len(peer.Assignments) == 0 {
		return []peerTarget{{
			Label:      "main",
			AssignedIP: peer.AssignedIP,
		}}
	}

	targets := make([]peerTarget, 0, len(peer.Assignments))
	for _, assignment := range peer.Assignments {
		label := assignment.InterfaceName
		if strings.TrimSpace(label) == "" {
			label = assignment.ServerName
		}
		if strings.TrimSpace(label) == "" {
			label = assignment.ServerID
		}
		if strings.TrimSpace(label) == "" {
			label = "target"
		}

		targets = append(targets, peerTarget{
			Label:      label,
			AssignedIP: assignment.AssignedIP,
		})
	}

	return targets
}
