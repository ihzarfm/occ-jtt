package general

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

type DashboardServer struct {
	ID   string
	Name string
	Host string
}

type DashboardDeps struct {
	GatewayHost string
	Servers     func() []DashboardServer
	TotalPeers  func() int
	PingLatency func(ctx context.Context, target string) (float64, error)
}

type DashboardHandler struct {
	deps DashboardDeps
}

func NewDashboardHandler(deps DashboardDeps) *DashboardHandler {
	return &DashboardHandler{deps: deps}
}

func (h *DashboardHandler) Handle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	checkedAt := time.Now().UTC().Format(time.RFC3339)
	servers := h.deps.Servers()
	items := make([]map[string]any, 0, len(servers)+2)

	items = append(items, h.dashboardPingItem(r.Context(), "internet", "google.com", "google.com", checkedAt))

	for _, serverConfig := range servers {
		items = append(items, h.dashboardPingItem(r.Context(), serverConfig.ID, serverConfig.Name, serverConfig.Host, checkedAt))
	}

	items = append(items, h.dashboardPingItem(r.Context(), "gateway", "Gateway", h.deps.GatewayHost, checkedAt))

	writeJSONDashboard(w, http.StatusOK, map[string]any{
		"items":      items,
		"checkedAt":  checkedAt,
		"totalPeers": h.deps.TotalPeers(),
	})
}

func (h *DashboardHandler) dashboardPingItem(ctx context.Context, id, label, target, checkedAt string) map[string]any {
	latency, err := h.deps.PingLatency(ctx, target)
	item := map[string]any{
		"id":        id,
		"label":     label,
		"target":    target,
		"checkedAt": checkedAt,
	}

	if err != nil {
		item["status"] = "down"
		item["error"] = err.Error()
		return item
	}

	item["status"] = dashboardLatencyStatus(latency)
	item["latencyMs"] = latency
	return item
}

func dashboardLatencyStatus(latency float64) string {
	if latency <= 100 {
		return "good"
	}
	return "bad"
}

func methodNotAllowed(w http.ResponseWriter) {
	writeErrorDashboard(w, http.StatusMethodNotAllowed, "method not allowed")
}

func writeJSONDashboard(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeErrorDashboard(w http.ResponseWriter, status int, message string) {
	writeJSONDashboard(w, status, map[string]string{"error": message})
}
