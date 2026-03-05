package app

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"occ-jtt/backend/internal/store"
)

func TestHasRequiredRole(t *testing.T) {
	tests := []struct {
		name     string
		actual   string
		required string
		allowed  bool
	}{
		{name: "superadmin_for_admin", actual: "superadmin", required: "administrator", allowed: true},
		{name: "admin_for_admin", actual: "administrator", required: "administrator", allowed: true},
		{name: "support_for_admin", actual: "support", required: "administrator", allowed: false},
		{name: "superadmin_for_support", actual: "superadmin", required: "support", allowed: true},
		{name: "unknown_role", actual: "owner", required: "administrator", allowed: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := hasRequiredRole(tc.actual, tc.required); got != tc.allowed {
				t.Fatalf("expected %v, got %v", tc.allowed, got)
			}
		})
	}
}

func TestRequireRoleAcceptsSuperadminForAdministratorRoute(t *testing.T) {
	s := &server{
		sessions: map[string]store.User{
			"sess-1": {Username: "sa", Role: "superadmin"},
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
	req.AddCookie(&http.Cookie{Name: "occ_session", Value: "sess-1"})
	res := httptest.NewRecorder()

	if ok := s.requireRole(res, req, "administrator"); !ok {
		t.Fatalf("expected superadmin to pass administrator requirement")
	}
}

func TestRequireRoleRejectsSupportForAdministratorRoute(t *testing.T) {
	s := &server{
		sessions: map[string]store.User{
			"sess-2": {Username: "sp", Role: "support"},
		},
	}

	req := httptest.NewRequest(http.MethodGet, "/api/users", nil)
	req.AddCookie(&http.Cookie{Name: "occ_session", Value: "sess-2"})
	res := httptest.NewRecorder()

	if ok := s.requireRole(res, req, "administrator"); ok {
		t.Fatalf("expected support to be rejected for administrator requirement")
	}
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d", res.Code)
	}
}
