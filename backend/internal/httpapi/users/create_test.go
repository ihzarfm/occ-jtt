package users

import "testing"

func TestNormalizeUserInputAcceptsSuperadmin(t *testing.T) {
	user, err := normalizeUserInput(userInput{
		Name:     "Root User",
		NIK:      "123456",
		Password: "secret",
		Role:     "superadmin",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if user.Role != "superadmin" {
		t.Fatalf("expected role superadmin, got %q", user.Role)
	}
}

func TestNormalizeUserInputRejectsUnknownRole(t *testing.T) {
	_, err := normalizeUserInput(userInput{
		Name:     "Root User",
		NIK:      "123456",
		Password: "secret",
		Role:     "owner",
	})
	if err == nil {
		t.Fatalf("expected error for unsupported role")
	}
}
