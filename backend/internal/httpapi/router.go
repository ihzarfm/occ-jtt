package httpapi

import "net/http"

type Routes struct {
	Health              http.HandlerFunc
	Login               http.HandlerFunc
	Logout              http.HandlerFunc
	Session             http.HandlerFunc
	Monitoring          http.HandlerFunc
	State               http.HandlerFunc
	DashboardHealth     http.HandlerFunc
	Network             http.HandlerFunc
	Peers               http.HandlerFunc
	PeerByID            http.HandlerFunc
	PeerDiagnostics     http.HandlerFunc
	WGServers           http.HandlerFunc
	WGServerDiagnostics http.HandlerFunc
	Logs                http.HandlerFunc
	Users               http.HandlerFunc
	UserByID            http.HandlerFunc
	Settings            http.HandlerFunc
	SettingsWGTest      http.HandlerFunc
	App                 http.HandlerFunc
}

func NewRouter(routes Routes) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/healthz", routes.Health)
	mux.HandleFunc("/api/login", routes.Login)
	mux.HandleFunc("/api/logout", routes.Logout)
	mux.HandleFunc("/api/session", routes.Session)
	mux.HandleFunc("/api/monitoring", routes.Monitoring)
	mux.HandleFunc("/api/state", routes.State)
	mux.HandleFunc("/api/dashboard/health", routes.DashboardHealth)
	mux.HandleFunc("/api/network", routes.Network)
	mux.HandleFunc("/api/peers", routes.Peers)
	mux.HandleFunc("/api/peers/", routes.PeerByID)
	mux.HandleFunc("/api/diagnostics/peers", routes.PeerDiagnostics)
	mux.HandleFunc("/api/wg-servers", routes.WGServers)
	mux.HandleFunc("/api/wg-servers/diagnostics", routes.WGServerDiagnostics)
	mux.HandleFunc("/api/logs", routes.Logs)
	mux.HandleFunc("/api/users", routes.Users)
	mux.HandleFunc("/api/users/", routes.UserByID)
	mux.HandleFunc("/api/settings", routes.Settings)
	mux.HandleFunc("/api/settings/wg/test-connection", routes.SettingsWGTest)
	mux.HandleFunc("/", routes.App)
	return mux
}
