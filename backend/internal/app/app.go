package app

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sync"

	"occ-jtt/backend/internal/config"
	"occ-jtt/backend/internal/db"
	"occ-jtt/backend/internal/httpapi"
	"occ-jtt/backend/internal/httpapi/general"
	"occ-jtt/backend/internal/httpapi/logs"
	"occ-jtt/backend/internal/httpapi/monitoring"
	"occ-jtt/backend/internal/httpapi/users"
	"occ-jtt/backend/internal/httpapi/wireguard"
	"occ-jtt/backend/internal/store"
)

type server struct {
	store         *store.Store
	adminUsername string
	adminPassword string
	gatusAPIURL   string
	gatewayHost   string
	wgServers     []wireguard.WGServerConfig
	sessions      map[string]store.User
	sessionMu     sync.RWMutex
}

type Config = config.Config

type App struct {
	config Config
	server *server
	port   string
}

func ConfigFromEnv() Config {
	return config.Load()
}

func New(config Config) (*App, error) {
	var (
		stateStore *store.Store
		err        error
	)

	dbConn, err := db.Connect(config)
	if err != nil {
		return nil, err
	}
	if dbConn != nil {
		stateStore, err = store.NewPostgres(dbConn)
		if err != nil {
			return nil, fmt.Errorf("failed to initialize postgres state store: %w", err)
		}
		log.Printf("state store mode: postgres")
	} else {
		stateStore, err = store.New(config.DataPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open state store: %w", err)
		}
		log.Printf("state store mode: json file (%s)", config.DataPath)
	}

	s := &server{
		store:    stateStore,
		sessions: make(map[string]store.User),
	}
	s.adminUsername = config.AdminUsername
	s.adminPassword = config.AdminPassword
	s.gatusAPIURL = config.GatusAPIURL
	s.gatewayHost = config.DashboardGatewayHost
	s.wgServers = defaultWGServers()
	if err := s.store.EnsureUser(store.User{
		Username: s.adminUsername,
		Name:     "Administrator",
		NIK:      "000000",
		Password: s.adminPassword,
		Role:     "administrator",
		BuiltIn:  true,
	}); err != nil {
		return nil, fmt.Errorf("failed to initialize administrator user: %w", err)
	}

	return &App{
		config: config,
		server: s,
		port:   config.Port,
	}, nil
}

func (a *App) Run() error {
	s := a.server
	healthHandler := general.NewHealthHandler()
	monitoringHandler := monitoring.NewHandler(s.gatusAPIURL)
	logsHandler := logs.NewHandler(logs.Handler{
		Store: s.store,
	})
	usersHandler := users.NewHandler(users.Handler{
		Store: s.store,
		AppendAuditLog: func(r *http.Request, category, action, target, message string) {
			s.appendAuditLog(r, category, action, target, message)
		},
	})
	wireguardHandler := wireguard.NewHandler(wireguard.Handler{
		Store:         s.store,
		ListWGServers: func() []wireguard.WGServerConfig { return s.wgServers },
		CurrentUser:   s.currentUser,
		RequireRole:   s.requireRole,
		AppendAuditLog: func(r *http.Request, category, action, target, message string) {
			s.appendAuditLog(r, category, action, target, message)
		},
		CreateOutletOnWG: func(ctx context.Context, serverID, siteName string) (wireguard.RemoteScriptResult, error) {
			serverConfig, ok := s.serverByID(serverID)
			if !ok {
				return wireguard.RemoteScriptResult{}, fmt.Errorf("unknown server mapping: %s", serverID)
			}
			return s.runRemoteScript(ctx, serverConfig, serverConfig.CreateScript, siteName)
		},
		RemoveOutletFromWG: func(ctx context.Context, serverID, siteName string) (wireguard.RemoteScriptResult, error) {
			serverConfig, ok := s.serverByID(serverID)
			if !ok {
				return wireguard.RemoteScriptResult{}, fmt.Errorf("unknown server mapping: %s", serverID)
			}
			return s.runRemoteScript(ctx, serverConfig, serverConfig.RemoveScript, siteName)
		},
		PingLatency: pingLatency,
		SSHHandshakeLatency: func(ctx context.Context, serverConfig wireguard.WGServerConfig) (float64, error) {
			return sshHandshakeLatency(ctx, serverConfig)
		},
	})
	dashboardHandler := general.NewDashboardHandler(general.DashboardDeps{
		GatewayHost: s.gatewayHost,
		Servers: func() []general.DashboardServer {
			servers := make([]general.DashboardServer, 0, len(s.wgServers))
			for _, serverConfig := range s.wgServers {
				servers = append(servers, general.DashboardServer{
					ID:   serverConfig.ID,
					Name: serverConfig.Name,
					Host: serverConfig.Host,
				})
			}
			return servers
		},
		TotalPeers: func() int {
			return len(s.store.GetState().Peers)
		},
		PingLatency: pingLatency,
	})

	router := httpapi.NewRouter(httpapi.Routes{
		Health:              healthHandler.Handle,
		Login:               s.handleLogin,
		Logout:              s.handleLogout,
		Session:             s.handleSession,
		Monitoring:          s.withSession(monitoringHandler.Handle),
		State:               s.withSession(s.handleState),
		DashboardHealth:     s.withSession(dashboardHandler.Handle),
		Network:             s.withRole("administrator", wireguardHandler.HandleNetwork),
		Peers:               s.withSession(wireguardHandler.HandlePeers),
		PeerByID:            s.withSession(wireguardHandler.HandlePeerByID),
		PeerDiagnostics:     s.withRole("administrator", wireguardHandler.HandlePeerDiagnostics),
		WGServers:           s.withRole("administrator", wireguardHandler.HandleWGServers),
		WGServerDiagnostics: s.withRole("administrator", wireguardHandler.HandleWGServerDiagnostics),
		Logs:                s.withRole("administrator", logsHandler.Handle),
		Users:               s.withRole("administrator", usersHandler.HandleUsers),
		UserByID:            s.withRole("administrator", usersHandler.HandleUserByID),
		App:                 s.handleApp,
	})
	handler := withCORS(withLogging(router))

	log.Printf("occ-jtt listening on http://localhost:%s", a.port)
	if err := http.ListenAndServe(":"+a.port, handler); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("server failed: %w", err)
	}

	return nil
}
