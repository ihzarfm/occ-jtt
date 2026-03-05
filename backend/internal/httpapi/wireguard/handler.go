package wireguard

import (
	"context"
	"net/http"
	"time"

	"occ-jtt/backend/internal/store"
)

type WGServerConfig struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Host            string `json:"host"`
	SSHUser         string `json:"sshUser"`
	SSHPort         int    `json:"sshPort"`
	KeyPath         string `json:"keyPath"`
	WireGuardIP     string `json:"wireGuardIP"`
	InterfaceName   string `json:"interfaceName"`
	OverlayCIDR     string `json:"overlayCIDR"`
	RemoteWGConf    string `json:"remoteWGConf"`
	DefaultEndpoint string `json:"defaultEndpoint"`
	DefaultPort     int    `json:"defaultPort"`
	CreateScript    string `json:"createScript"`
	RemoveScript    string `json:"removeScript"`
}

type RemoteScriptResult struct {
	OK            bool   `json:"ok"`
	Site          string `json:"site"`
	ServerID      string `json:"server_id"`
	Interface     string `json:"interface"`
	AssignedIP    string `json:"assigned_ip"`
	Overlay       string `json:"overlay"`
	PeerFile      string `json:"peer_file"`
	RouterFile    string `json:"router_file"`
	PeerContent   string `json:"peer_content"`
	RouterContent string `json:"router_content"`
	Applied       bool   `json:"applied"`
	Removed       bool   `json:"removed"`
	Error         string `json:"error"`
}

type Handler struct {
	Store               *store.Store
	ListWGServers       func() []WGServerConfig
	CurrentUser         func(*http.Request) (store.User, bool)
	RequireRole         func(http.ResponseWriter, *http.Request, string) bool
	AppendAuditLog      func(*http.Request, string, string, string, string)
	CreateSiteOnWG      func(context.Context, string, string) (RemoteScriptResult, error)
	RemoveSiteFromWG    func(context.Context, string, string) (RemoteScriptResult, error)
	PingLatency         func(context.Context, string) (float64, error)
	SSHHandshakeLatency func(context.Context, WGServerConfig) (float64, error)
}

func NewHandler(h Handler) *Handler {
	return &h
}

type peerInput struct {
	PeerType     string `json:"peerType"`
	Name         string `json:"name"`
	Managed      *bool  `json:"managed"`
	TargetServer string `json:"targetServer"`
	PublicKey    string `json:"publicKey"`
	PresharedKey string `json:"presharedKey"`
	AllowedIPs   string `json:"allowedIPs"`
	Endpoint     string `json:"endpoint"`
	Keepalive    int    `json:"keepalive"`
	AssignedIP   string `json:"assignedIP"`
}

type peerTarget struct {
	Label      string
	AssignedIP string
}

type siteApplyTiming struct {
	Total       time.Duration
	SSHConnect  time.Duration
	UploadWrite time.Duration
	RemoteExec  time.Duration
	Err         string
}
