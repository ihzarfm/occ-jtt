package mikrotik

import "net/http"

// Placeholder: no dedicated backend endpoint exists yet for "Automation Script Update".
func (h *Handler) HandleScriptUpdate(w http.ResponseWriter, r *http.Request) {
	methodNotAllowed(w)
}
