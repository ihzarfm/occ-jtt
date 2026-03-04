package db

import (
	"database/sql"
	"fmt"

	"occ-jtt/backend/internal/config"

	_ "github.com/lib/pq"
)

func Connect(cfg config.Config) (*sql.DB, error) {
	if cfg.DatabaseURL == "" {
		return nil, nil
	}

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}
	return db, nil
}
