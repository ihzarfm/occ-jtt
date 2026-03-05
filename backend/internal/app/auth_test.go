package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"occ-jtt/backend/internal/store"
)

func newAuthTestServer(t *testing.T) *server {
	t.Helper()

	stateStore, err := store.New(t.TempDir() + "/state.json")
	if err != nil {
		t.Fatalf("failed to initialize store: %v", err)
	}
	return &server{
		store:    stateStore,
		sessions: map[string]store.User{},
	}
}

func addTestUser(t *testing.T, s *server, user store.User) {
	t.Helper()
	if _, err := s.store.AddUser(user); err != nil {
		t.Fatalf("failed to add user %s: %v", user.Username, err)
	}
}

func TestHandleLoginAllowsNIKAndName(t *testing.T) {
	s := newAuthTestServer(t)
	addTestUser(t, s, store.User{
		Username: "001154",
		Name:     "rafi",
		NIK:      "001154",
		Password: "secret",
		Role:     "superadmin",
	})

	testcases := []string{"001154", "rafi", "RAFI"}
	for _, identifier := range testcases {
		t.Run(identifier, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(`{"username":"`+identifier+`","password":"secret"}`))
			res := httptest.NewRecorder()

			s.handleLogin(res, req)
			if res.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d, body=%s", res.Code, res.Body.String())
			}

			var payload map[string]string
			if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
				t.Fatalf("failed to decode payload: %v", err)
			}
			if payload["username"] != "001154" || payload["name"] != "rafi" || payload["nik"] != "001154" || payload["role"] != "superadmin" {
				t.Fatalf("unexpected payload: %#v", payload)
			}
		})
	}
}

func TestHandleLoginRejectsDuplicateName(t *testing.T) {
	s := newAuthTestServer(t)
	addTestUser(t, s, store.User{
		Username: "001154",
		Name:     "rafi",
		NIK:      "001154",
		Password: "secret",
		Role:     "support",
	})
	addTestUser(t, s, store.User{
		Username: "001155",
		Name:     "Rafi",
		NIK:      "001155",
		Password: "secret",
		Role:     "administrator",
	})

	req := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(`{"username":"raFi","password":"secret"}`))
	res := httptest.NewRecorder()
	s.handleLogin(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d, body=%s", res.Code, res.Body.String())
	}
	if !strings.Contains(res.Body.String(), "multiple users found, use NIK") {
		t.Fatalf("unexpected error body: %s", res.Body.String())
	}
}

func TestHandleLoginReturnsGenericInvalidCredentials(t *testing.T) {
	s := newAuthTestServer(t)
	addTestUser(t, s, store.User{
		Username: "001154",
		Name:     "rafi",
		NIK:      "001154",
		Password: "secret",
		Role:     "superadmin",
	})

	tests := []string{
		`{"username":"unknown","password":"secret"}`,
		`{"username":"001154","password":"wrong"}`,
	}

	for _, body := range tests {
		req := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(body))
		res := httptest.NewRecorder()
		s.handleLogin(res, req)

		if res.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d, body=%s", res.Code, res.Body.String())
		}
		if !strings.Contains(res.Body.String(), "invalid username or password") {
			t.Fatalf("unexpected error body: %s", res.Body.String())
		}
	}
}

func TestHandleSessionReturnsUserProfileFields(t *testing.T) {
	s := newAuthTestServer(t)
	addTestUser(t, s, store.User{
		Username: "001154",
		Name:     "Rafi",
		NIK:      "001154",
		Password: "secret",
		Role:     "superadmin",
	})

	loginReq := httptest.NewRequest(http.MethodPost, "/api/login", strings.NewReader(`{"username":"001154","password":"secret"}`))
	loginRes := httptest.NewRecorder()
	s.handleLogin(loginRes, loginReq)
	if loginRes.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d", loginRes.Code)
	}

	cookies := loginRes.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatalf("expected session cookie")
	}

	sessionReq := httptest.NewRequest(http.MethodGet, "/api/session", nil)
	sessionReq.AddCookie(cookies[0])
	sessionRes := httptest.NewRecorder()
	s.handleSession(sessionRes, sessionReq)

	if sessionRes.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", sessionRes.Code)
	}

	var payload map[string]string
	if err := json.NewDecoder(sessionRes.Body).Decode(&payload); err != nil {
		t.Fatalf("failed to decode payload: %v", err)
	}
	if payload["username"] != "001154" || payload["name"] != "Rafi" || payload["nik"] != "001154" || payload["role"] != "superadmin" {
		t.Fatalf("unexpected payload: %#v", payload)
	}
}
