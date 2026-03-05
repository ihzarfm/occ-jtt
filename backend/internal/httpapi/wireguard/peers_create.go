package wireguard

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
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

	if isSiteLikePeerType(input.PeerType) {
		if input.Managed != nil && !*input.Managed {
			writeError(w, http.StatusBadRequest, "site peer with managed=false is not supported")
			return
		}
		h.createOutletPeer(w, r, input)
		return
	}

	name := strings.TrimSpace(input.Name)
	publicKey := strings.TrimSpace(input.PublicKey)
	assignedIP := strings.TrimSpace(input.AssignedIP)
	if name == "" || publicKey == "" || assignedIP == "" {
		writeError(w, http.StatusBadRequest, "name, publicKey, and assignedIP are required")
		return
	}

	peer := store.Peer{
		ID:           newID(name),
		Name:         name,
		Managed:      boolValueOrDefault(input.Managed, false),
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

	state, created, err := h.Store.AddPeer(peer)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save peer")
		return
	}

	h.AppendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created administrator peer %s (managed=%t)", created.Name, created.Managed))

	writeJSON(w, http.StatusCreated, map[string]any{
		"state": publicState(state),
		"peer":  created,
	})
}

func (h *Handler) createOutletPeer(w http.ResponseWriter, r *http.Request, input peerInput) {
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
		assignedIP  string
		errMessage  string
	)

	applyTimings := map[string]outletApplyTiming{
		"stg-its":  {},
		"stg-cctv": {},
	}

	defer func() {
		its := applyTimings["stg-its"]
		cctv := applyTimings["stg-cctv"]
		log.Printf(
			"[timing] mode=outlet peer=%q assigned_ip=%q t_validate=%dms t_alloc_ip=%dms t_gen_keys=%dms t_write_state=%dms t_render=%dms t_artifacts=%dms apply_its_total=%dms apply_its_ssh_connect=%dms apply_its_upload_write=%dms apply_its_remote_exec=%dms apply_its_err=%q apply_cctv_total=%dms apply_cctv_ssh_connect=%dms apply_cctv_upload_write=%dms apply_cctv_remote_exec=%dms apply_cctv_err=%q total=%dms err=%q",
			siteName,
			assignedIP,
			durationMillis(tValidate),
			durationMillis(tAllocIP),
			durationMillis(tGenKeys),
			durationMillis(tWriteState),
			durationMillis(tRender),
			durationMillis(tArtifacts),
			durationMillis(its.Total),
			durationMillis(its.SSHConnect),
			durationMillis(its.UploadWrite),
			durationMillis(its.RemoteExec),
			its.Err,
			durationMillis(cctv.Total),
			durationMillis(cctv.SSHConnect),
			durationMillis(cctv.UploadWrite),
			durationMillis(cctv.RemoteExec),
			cctv.Err,
			durationMillis(time.Since(requestStartedAt)),
			errMessage,
		)
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
		result, err := h.CreateOutletOnWG(ctx, serverConfig.ID, siteName)
		timing := applyTimings[serverConfig.ID]
		timing.Total = time.Since(applyStartedAt)
		timing.RemoteExec = timing.Total
		if err != nil {
			timing.Err = err.Error()
			applyTimings[serverConfig.ID] = timing
			errMessage = err.Error()
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		if !result.OK || !result.Applied {
			message := result.Error
			if message == "" {
				message = fmt.Sprintf("remote create failed on %s", serverConfig.Name)
			}
			timing.Err = message
			applyTimings[serverConfig.ID] = timing
			errMessage = message
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
		if assignedIP == "" {
			assignedIP = result.AssignedIP
		}

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
		Type:        "outlet",
		SiteName:    siteName,
		Name:        fmt.Sprintf("Outlet - %s", siteName),
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
	assignedIP = created.AssignedIP

	h.AppendAuditLog(r, "wireguard", "create", created.Name, fmt.Sprintf("Created outlet peer %s (managed=%t)", created.Name, created.Managed))

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

func isSiteLikePeerType(value string) bool {
	normalized := strings.ToLower(strings.TrimSpace(value))
	return normalized == "site" || normalized == "outlet"
}
