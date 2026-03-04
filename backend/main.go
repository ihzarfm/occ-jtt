package main

import (
	"log"

	"occ-jtt/backend/internal/app"
)

func main() {
	cfg := app.ConfigFromEnv()
	application, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}
	if err := application.Run(); err != nil {
		log.Fatal(err)
	}
}

func parsePingLatency(output string) (float64, bool) {
	return app.ParsePingLatency(output)
}
