package config

import (
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	DataPath             string
	DatabaseURL          string
	Port                 string
	AdminUsername        string
	AdminPassword        string
	GatusAPIURL          string
	DashboardGatewayHost string
}

func Load() Config {
	return Config{
		DataPath:             env("OCC_JTT_DATA", filepath.Join("data", "state.json")),
		DatabaseURL:          strings.TrimSpace(env("DATABASE_URL", "")),
		Port:                 env("PORT", "8080"),
		AdminUsername:        env("ADMIN_USERNAME", "admin"),
		AdminPassword:        env("ADMIN_PASSWORD", "123123"),
		GatusAPIURL:          env("GATUS_API_URL", "http://10.1.0.1:9090/metrics"),
		DashboardGatewayHost: env("DASHBOARD_GATEWAY_HOST", "10.1.0.1"),
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
