package logs

import (
	"encoding/json"
	"net/http"
	"strings"
)

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	category := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("category")))
	if !isAllowedCategory(category) {
		writeError(w, http.StatusBadRequest, "invalid log category")
		return
	}

	writeJSON(w, http.StatusOK, publicLogs(h.Store.ListLogs(category)))
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
