package app

import (
	"path/filepath"
	"testing"
)

func TestNewInitializesBuiltInSuperadminUser(t *testing.T) {
	app, err := New(Config{
		DataPath:      filepath.Join(t.TempDir(), "state.json"),
		Port:          "8080",
		AdminUsername: "admin",
		AdminPassword: "123123",
	})
	if err != nil {
		t.Fatalf("expected app initialization to succeed, got error: %v", err)
	}

	users := app.server.store.ListUsers()

	found := false
	for _, user := range users {
		if user.Username != "superadmin" {
			continue
		}

		found = true
		if user.Role != "superadmin" {
			t.Fatalf("expected role superadmin, got %q", user.Role)
		}
		if user.Password != "123123" {
			t.Fatalf("expected default password 123123, got %q", user.Password)
		}
		if !user.BuiltIn {
			t.Fatalf("expected superadmin user to be built-in")
		}
	}

	if !found {
		t.Fatalf("expected built-in superadmin user to exist")
	}
}
