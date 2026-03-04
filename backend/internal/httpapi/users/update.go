package users

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"occ-jtt/backend/internal/store"
)

func (h *Handler) HandleUserByID(w http.ResponseWriter, r *http.Request) {
	username := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/users/"), "/")
	if username == "" {
		writeError(w, http.StatusBadRequest, "missing username")
		return
	}

	if r.Method != http.MethodPut {
		methodNotAllowed(w)
		return
	}

	var input userInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid user payload")
		return
	}

	user, err := normalizeUserInput(input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	user.Username = username

	updated, ok, err := h.Store.UpdateUser(username, user)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if h.AppendAuditLog != nil {
		h.AppendAuditLog(
			r,
			"user",
			"update",
			updated.Name,
			fmt.Sprintf("Updated user %s (%s)", updated.Name, updated.NIK),
		)
	}

	writeJSON(w, http.StatusOK, publicUser(updated))
}

func decodeJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func publicUsers(users []store.User) []map[string]any {
	items := make([]map[string]any, len(users))
	for i, user := range users {
		items[i] = publicUser(user)
	}
	return items
}

func publicUser(user store.User) map[string]any {
	return map[string]any{
		"username":  user.Username,
		"name":      user.Name,
		"nik":       user.NIK,
		"role":      user.Role,
		"builtIn":   user.BuiltIn,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
	}
}
