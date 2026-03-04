package mikrotik

import "net/http"

// Placeholder: no dedicated backend endpoint exists yet for "Check ISP".
func (h *Handler) HandleCheckISP(w http.ResponseWriter, r *http.Request) {
	methodNotAllowed(w)
}
