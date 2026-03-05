package wireguard

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"occ-jtt/backend/internal/store"
)

func (h *Handler) HandlePeers(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, h.Store.GetState().Peers)
	case http.MethodPost:
		h.createPeer(w, r)
	default:
		methodNotAllowed(w)
	}
}

func (h *Handler) createPeer(w http.ResponseWriter, r *http.Request) {
	var input peerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid peer payload")
		return
	}

	if isSitePeerType(input.PeerType) {
		if input.Managed != nil && !*input.Managed {
			writeError(w, http.StatusBadRequest, "site peer with managed=false is not supported")
			return
		}
		h.createSitePeer(w, r, input)
		return
	}

	requestStartedAt := time.Now()
	validateStartedAt := time.Now()
	var (
		tValidate   time.Duration
		tWriteState time.Duration
		errMessage  string
		assignedIP  string
	)

	managed := boolValueOrDefault(input.Managed, false)
	name := strings.TrimSpace(input.Name)
	publicKey := strings.TrimSpace(input.PublicKey)
	assignedIP = strings.TrimSpace(input.AssignedIP)
	defer func() {
		log.Printf(
			"%s",
			formatAdministratorPeerTimingLog(administratorPeerTimingLog{
				Peer:        name,
				PeerType:    "administrator",
				Managed:     managed,
				ServerScope: strings.TrimSpace(input.TargetServer),
				AssignedIP:  assignedIP,
				TValidate:   tValidate,
				TWriteState: tWriteState,
				Total:       time.Since(requestStartedAt),
				Err:         errMessage,
			}),
		)
	}()

	tValidate = time.Since(validateStartedAt)
	if name == "" || publicKey == "" || assignedIP == "" {
		errMessage = "name, publicKey, and assignedIP are required"
		writeError(w, http.StatusBadRequest, "name, publicKey, and assignedIP are required")
		return
	}

	peer := store.Peer{
		ID:           newID(name),
		Name:         name,
		Managed:      managed,
		PublicKey:    publicKey,
		PresharedKey: strings.TrimSpace(input.PresharedKey),
		AllowedIPs:   parseCSV(input.AllowedIPs),
		Endpoint:     strings.TrimSpace(input.Endpoint),
		Keepalive:    input.Keepalive,
		AssignedIP:   assignedIP,
	}
	if user, ok := h.CurrentUser(r); ok {
		peer.CreatedBy = user.Username
		peer.CreatedByName = user.Name
	}
	if len(peer.AllowedIPs) == 0 {
		peer.AllowedIPs = []string{"0.0.0.0/0"}
	}

	writeStateStartedAt := time.Now()
	state, created, err := h.Store.AddPeer(peer)
	tWriteState = time.Since(writeStateStartedAt)
	if err != nil {
		errMessage = "failed to save peer"
		writeError(w, http.StatusInternalServerError, "failed to save peer")
		return
	}
	assignedIP = created.AssignedIP

	h.AppendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created administrator peer %s (managed=%t)", created.Name, created.Managed))

	writeJSON(w, http.StatusCreated, map[string]any{
		"state": publicState(state),
		"peer":  created,
	})
}

func (h *Handler) createSitePeer(w http.ResponseWriter, r *http.Request, input peerInput) {
	requestStartedAt := time.Now()
	validateStartedAt := time.Now()
	ctx := r.Context()
	siteName := strings.TrimSpace(input.Name)

	var (
		tValidate   time.Duration
		tAllocIP    time.Duration
		tGenKeys    time.Duration
		tWriteState time.Duration
		tRender     time.Duration
		tArtifacts  time.Duration
		managed     bool
		errMessage  string
	)
	managed = boolValueOrDefault(input.Managed, true)

	applyTimings := map[string]siteApplyTiming{}
	assignedIPsByServer := map[string]string{}

	defer func() {
		log.Printf("%s", formatSitePeerTimingLog(sitePeerTimingLog{
			Peer:                siteName,
			PeerType:            "site",
			Managed:             managed,
			Servers:             mapKeysSorted(applyTimings),
			AssignedIPsByServer: assignedIPsByServer,
			TValidate:           tValidate,
			TAllocIP:            tAllocIP,
			TGenKeys:            tGenKeys,
			TWriteState:         tWriteState,
			TRender:             tRender,
			TArtifacts:          tArtifacts,
			ApplyTimings:        applyTimings,
			Total:               time.Since(requestStartedAt),
			Err:                 errMessage,
		}))
	}()

	if siteName == "" {
		tValidate = time.Since(validateStartedAt)
		errMessage = "name is required"
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	tValidate = time.Since(validateStartedAt)

	assignments := make([]store.PeerAssignment, 0, len(h.ListWGServers()))
	artifacts := make([]store.PeerArtifact, 0, len(h.ListWGServers())*2)

	for _, serverConfig := range h.ListWGServers() {
		applyStartedAt := time.Now()
		result, err := h.CreateSiteOnWG(ctx, serverConfig.ID, siteName)
		timing := applyTimings[serverConfig.ID]
		timing.Total = time.Since(applyStartedAt)
		timing.RemoteExec = timing.Total
		if err != nil {
			timing.Err = shortTimingError(err.Error())
			applyTimings[serverConfig.ID] = timing
			errMessage = fmt.Sprintf("server_id=%s reason=%s", serverConfig.ID, shortTimingError(err.Error()))
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		if !result.OK || !result.Applied {
			message := result.Error
			if message == "" {
				message = fmt.Sprintf("remote create failed on %s", serverConfig.Name)
			}
			timing.Err = shortTimingError(message)
			applyTimings[serverConfig.ID] = timing
			errMessage = fmt.Sprintf("server_id=%s reason=%s", serverConfig.ID, shortTimingError(message))
			writeError(w, http.StatusBadGateway, message)
			return
		}
		applyTimings[serverConfig.ID] = timing

		assignments = append(assignments, store.PeerAssignment{
			ServerID:      serverConfig.ID,
			ServerName:    serverConfig.Name,
			InterfaceName: result.Interface,
			AssignedIP:    result.AssignedIP,
			OverlayCIDR:   result.Overlay,
		})
		assignedIPsByServer[serverConfig.ID] = result.AssignedIP

		renderStartedAt := time.Now()
		confContent := result.PeerContent
		if confContent == "" {
			confContent = remoteArtifactNote(serverConfig, result.PeerFile)
		}
		routerContent := result.RouterContent
		if routerContent == "" {
			routerContent = remoteArtifactNote(serverConfig, result.RouterFile)
		}
		tRender += time.Since(renderStartedAt)

		artifactsStartedAt := time.Now()
		artifacts = append(artifacts,
			store.PeerArtifact{
				ID:          fmt.Sprintf("%s-conf", serverConfig.ID),
				Kind:        "conf",
				ServerID:    serverConfig.ID,
				ServerName:  serverConfig.Name,
				Filename:    filepath.Base(result.PeerFile),
				ContentType: "text/plain; charset=utf-8",
				Content:     confContent,
			},
			store.PeerArtifact{
				ID:          fmt.Sprintf("%s-rsc", serverConfig.ID),
				Kind:        "rsc",
				ServerID:    serverConfig.ID,
				ServerName:  serverConfig.Name,
				Filename:    filepath.Base(result.RouterFile),
				ContentType: "text/plain; charset=utf-8",
				Content:     routerContent,
			},
		)
		tArtifacts += time.Since(artifactsStartedAt)
	}

	peer := store.Peer{
		ID:          newID(siteName),
		Type:        "site",
		SiteName:    siteName,
		Name:        fmt.Sprintf("Site - %s", siteName),
		Managed:     boolValueOrDefault(input.Managed, true),
		AllowedIPs:  []string{"0.0.0.0/0"},
		Keepalive:   15,
		AssignedIP:  assignments[0].AssignedIP,
		Assignments: assignments,
		Artifacts:   artifacts,
	}
	if user, ok := h.CurrentUser(r); ok {
		peer.CreatedBy = user.Username
		peer.CreatedByName = user.Name
	}

	writeStateStartedAt := time.Now()
	state, created, err := h.Store.AddPeer(peer)
	tWriteState = time.Since(writeStateStartedAt)
	if err != nil {
		errMessage = "failed to save peer"
		writeError(w, http.StatusInternalServerError, "failed to save peer")
		return
	}
	managed = created.Managed

	h.AppendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created site peer %s (managed=%t)", created.Name, created.Managed))

	writeJSON(w, http.StatusCreated, map[string]any{
		"state": publicState(state),
		"peer":  created,
	})
}

func boolValueOrDefault(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

type sitePeerTimingLog struct {
	Peer                string
	PeerType            string
	Managed             bool
	Servers             []string
	AssignedIPsByServer map[string]string
	TValidate           time.Duration
	TAllocIP            time.Duration
	TGenKeys            time.Duration
	TWriteState         time.Duration
	TRender             time.Duration
	TArtifacts          time.Duration
	ApplyTimings        map[string]siteApplyTiming
	Total               time.Duration
	Err                 string
}

type administratorPeerTimingLog struct {
	Peer        string
	PeerType    string
	Managed     bool
	ServerScope string
	AssignedIP  string
	TValidate   time.Duration
	TWriteState time.Duration
	Total       time.Duration
	Err         string
}

func formatSitePeerTimingLog(data sitePeerTimingLog) string {
	servers := strings.Join(data.Servers, ",")
	builder := strings.Builder{}
	builder.WriteString(fmt.Sprintf("[timing] mode=site peer=%q peerType=%q managed=%t servers=%q", data.Peer, data.PeerType, data.Managed, servers))
	for _, serverID := range data.Servers {
		if ip := strings.TrimSpace(data.AssignedIPsByServer[serverID]); ip != "" {
			builder.WriteString(fmt.Sprintf(" assigned_ip_%s=%q", sanitizeTimingKey(serverID), ip))
		}
	}
	builder.WriteString(fmt.Sprintf(" t_validate=%dms t_alloc_ip=%dms t_gen_keys=%dms t_write_state=%dms t_render=%dms t_artifacts=%dms",
		durationMillis(data.TValidate),
		durationMillis(data.TAllocIP),
		durationMillis(data.TGenKeys),
		durationMillis(data.TWriteState),
		durationMillis(data.TRender),
		durationMillis(data.TArtifacts),
	))
	for _, serverID := range data.Servers {
		timing := data.ApplyTimings[serverID]
		key := sanitizeTimingKey(serverID)
		builder.WriteString(fmt.Sprintf(" apply_%s_total=%dms apply_%s_ssh_connect=%dms apply_%s_upload_write=%dms apply_%s_remote_exec=%dms apply_%s_err=%q",
			key, durationMillis(timing.Total),
			key, durationMillis(timing.SSHConnect),
			key, durationMillis(timing.UploadWrite),
			key, durationMillis(timing.RemoteExec),
			key, shortTimingError(timing.Err),
		))
	}
	builder.WriteString(fmt.Sprintf(" total=%dms err=%q", durationMillis(data.Total), shortTimingError(data.Err)))
	return builder.String()
}

func formatAdministratorPeerTimingLog(data administratorPeerTimingLog) string {
	return fmt.Sprintf(
		"[timing] mode=administrator peer=%q peerType=%q managed=%t serverScope=%q assigned_ip=%q t_validate=%dms t_write_state=%dms total=%dms err=%q",
		data.Peer,
		data.PeerType,
		data.Managed,
		data.ServerScope,
		data.AssignedIP,
		durationMillis(data.TValidate),
		durationMillis(data.TWriteState),
		durationMillis(data.Total),
		shortTimingError(data.Err),
	)
}

func mapKeysSorted[V any](items map[string]V) []string {
	keys := make([]string, 0, len(items))
	for key := range items {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}

func sanitizeTimingKey(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "-", "_")
	return strings.ReplaceAll(value, " ", "_")
}

func shortTimingError(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 160 {
		return trimmed
	}
	return trimmed[:157] + "..."
}
