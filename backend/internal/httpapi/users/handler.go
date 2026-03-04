package users

import (
	"net/http"

	"occ-jtt/backend/internal/store"
)

type Handler struct {
	Store          *store.Store
	AppendAuditLog func(*http.Request, string, string, string, string)
}

func NewHandler(h Handler) *Handler {
	return &h
}
