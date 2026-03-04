package logs

import "occ-jtt/backend/internal/store"

type Handler struct {
	Store *store.Store
}

func NewHandler(h Handler) *Handler {
	return &h
}
