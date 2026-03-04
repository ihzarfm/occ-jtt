package mikrotik

import (
	"encoding/json"
	"net/http"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

// Placeholder: no dedicated backend endpoint exists yet for "Akses Mikrotik SSH".
func (h *Handler) HandleSSHAccess(w http.ResponseWriter, r *http.Request) {
	methodNotAllowed(w)
}

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
