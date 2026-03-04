package users

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"occ-jtt/backend/internal/store"
)

type userInput struct {
	Name     string `json:"name"`
	NIK      string `json:"nik"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *Handler) handleCreate(w http.ResponseWriter, r *http.Request) {
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

	created, err := h.Store.AddUser(user)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if h.AppendAuditLog != nil {
		h.AppendAuditLog(
			r,
			"user",
			"create",
			created.Name,
			fmt.Sprintf("Created user %s (%s)", created.Name, created.NIK),
		)
	}

	writeJSON(w, http.StatusCreated, publicUser(created))
}

func normalizeUserInput(input userInput) (store.User, error) {
	name := strings.TrimSpace(input.Name)
	nik := strings.TrimSpace(input.NIK)
	password := strings.TrimSpace(input.Password)
	role := strings.ToLower(strings.TrimSpace(input.Role))

	if name == "" {
		return store.User{}, errors.New("name is required")
	}
	if !isValidNIK(nik) {
		return store.User{}, errors.New("nik must be 6 digits")
	}
	if password == "" {
		return store.User{}, errors.New("password is required")
	}
	if role != "support" && role != "administrator" {
		return store.User{}, errors.New("role must be support or administrator")
	}

	return store.User{
		Username: nik,
		Name:     name,
		NIK:      nik,
		Password: password,
		Role:     role,
	}, nil
}

func isValidNIK(value string) bool {
	if len(value) != 6 {
		return false
	}
	for _, char := range value {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}
