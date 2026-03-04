package monitoring

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
)

type Handler struct {
	GatusAPIURL string
	HTTPClient  *http.Client
}

func NewHandler(gatusAPIURL string) *Handler {
	return &Handler{
		GatusAPIURL: gatusAPIURL,
		HTTPClient:  http.DefaultClient,
	}
}

func (h *Handler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	if h.GatusAPIURL == "" {
		writeError(w, http.StatusServiceUnavailable, "GATUS_API_URL is not configured")
		return
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, h.GatusAPIURL, nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to prepare monitoring request")
		return
	}

	client := h.HTTPClient
	if client == nil {
		client = http.DefaultClient
	}
	resp, err := client.Do(req)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch monitoring data from Gatus")
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to read monitoring response")
		return
	}

	contentType := resp.Header.Get("Content-Type")

	if strings.Contains(contentType, "application/json") || json.Valid(body) {
		var payload any
		if err := json.Unmarshal(body, &payload); err != nil {
			writeError(w, http.StatusBadGateway, "invalid JSON returned by Gatus")
			return
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			writeJSON(w, http.StatusBadGateway, map[string]any{
				"error":      "Gatus returned a non-success status",
				"statusCode": resp.StatusCode,
				"payload":    payload,
			})
			return
		}

		writeJSON(w, http.StatusOK, payload)
		return
	}

	metrics := parseMetricsPayload(string(body))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		writeJSON(w, http.StatusBadGateway, map[string]any{
			"error":      "monitoring endpoint returned a non-success status",
			"statusCode": resp.StatusCode,
			"payload": map[string]any{
				"mode":    "metrics",
				"source":  h.GatusAPIURL,
				"metrics": metrics,
			},
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"mode":    "metrics",
		"source":  h.GatusAPIURL,
		"metrics": metrics,
	})
}

func parseMetricsPayload(body string) []map[string]any {
	lines := strings.Split(body, "\n")
	metrics := make([]map[string]any, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		metricName, labels := parseMetricToken(parts[0])

		item := map[string]any{
			"metric": metricName,
			"value":  parts[1],
			"labels": labels,
		}

		for key, value := range labels {
			item[key] = value
		}

		metrics = append(metrics, item)
	}

	return metrics
}

func parseMetricToken(token string) (string, map[string]string) {
	openIndex := strings.Index(token, "{")
	closeIndex := strings.LastIndex(token, "}")
	if openIndex == -1 || closeIndex == -1 || closeIndex <= openIndex {
		return token, map[string]string{}
	}

	metricName := token[:openIndex]
	rawLabels := token[openIndex+1 : closeIndex]
	labels := make(map[string]string)

	for _, pair := range splitMetricLabels(rawLabels) {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}

		chunks := strings.SplitN(pair, "=", 2)
		if len(chunks) != 2 {
			continue
		}

		key := strings.TrimSpace(chunks[0])
		value := strings.Trim(strings.TrimSpace(chunks[1]), `"`)
		if key != "" {
			labels[key] = value
		}
	}

	return metricName, labels
}

func splitMetricLabels(raw string) []string {
	var (
		parts   []string
		current strings.Builder
		inQuote bool
	)

	for _, char := range raw {
		switch char {
		case '"':
			inQuote = !inQuote
			current.WriteRune(char)
		case ',':
			if inQuote {
				current.WriteRune(char)
				continue
			}
			parts = append(parts, current.String())
			current.Reset()
		default:
			current.WriteRune(char)
		}
	}

	if current.Len() > 0 {
		parts = append(parts, current.String())
	}

	return parts
}

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
