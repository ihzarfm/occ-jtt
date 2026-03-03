package main

import "testing"

func TestParsePingLatency(t *testing.T) {
	t.Run("parses_linux_ping_output", func(t *testing.T) {
		latency, ok := parsePingLatency("64 bytes from 10.0.0.1: icmp_seq=1 ttl=64 time=12.34 ms")
		if !ok {
			t.Fatalf("expected latency to parse")
		}
		if latency != 12.34 {
			t.Fatalf("expected 12.34, got %v", latency)
		}
	})

	t.Run("returns_false_when_missing", func(t *testing.T) {
		_, ok := parsePingLatency("Request timeout for icmp_seq 1")
		if ok {
			t.Fatalf("expected parse to fail")
		}
	})
}
