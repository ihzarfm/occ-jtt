import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPeer as createPeerAPI, getState } from "../api/peers";
import {
  adminRangeLabel,
  availableAdminIPsFor,
  isValidIPv4CIDR,
  normalizeAdminName,
  normalizeSiteSegment,
  sanitizeAllowedIPs,
  validateAdminIP,
} from "../utils/validators";

const emptyPeer = {
  name: "",
  publicKey: "",
  presharedKey: "",
  allowedIPs: "0.0.0.0/0",
  endpoint: "",
  keepalive: 25,
  assignedIP: "",
};

const emptyCreatePeerFeedback = {
  type: "",
  title: "",
  message: "",
  peer: null,
  scope: "",
};

const adminTargetOptions = [
  { id: "wg-its", label: "WG-ITS", pool: "10.21.3.2 - 10.21.3.254" },
  { id: "wg-cctv", label: "WG-CCTV", pool: "10.22.3.2 - 10.22.3.254" },
];

const adminPurposeOptions = [
  { id: "server", label: "Server" },
  { id: "user-admin", label: "User / Admin" },
  { id: "mikrotik", label: "Mikrotik" },
];

function generatePseudoPublicKey() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary);
}

function isSitePeerRecord(peer) {
  const peerType = String(peer?.type || "").trim().toLowerCase();
  return peerType === "site" || peerType === "outlet" || Array.isArray(peer?.assignments);
}

function siteAssignmentSummary(peer) {
  if (!Array.isArray(peer?.assignments)) return [];
  return [...peer.assignments]
    .map((assignment) => {
      const serverLabel = String(assignment.interfaceName || assignment.serverName || assignment.serverId || "");
      const label = serverLabel.toLowerCase().includes("cctv") ? "WG-CCTV" : serverLabel.toLowerCase().includes("its") ? "WG-ITS" : serverLabel.toUpperCase();
      return { label, value: assignment.assignedIP || "-" };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function downloadLinkForPeer(peer) {
  if (!peer?.id) return "";
  const configArtifact = Array.isArray(peer.artifacts) ? peer.artifacts.find((artifact) => artifact.kind === "conf") : null;
  const peerID = encodeURIComponent(peer.id);
  if (configArtifact?.id) return `/api/peers/${peerID}/artifacts/${encodeURIComponent(configArtifact.id)}`;
  return `/api/peers/${peerID}/config`;
}

function administratorDownloadLinks(peer) {
  if (!peer) return [];
  if (peer.id) {
    const target = adminTargetOptions.find((option) => option.id === peer._targetServer)?.label || "Config";
    return [{ id: peer.id, label: `Download ${target}`, href: downloadLinkForPeer(peer) }];
  }
  return [];
}

function siteConfigLinks(peer) {
  if (!peer?.id || !Array.isArray(peer.artifacts)) return [];
  return peer.artifacts
    .filter((artifact) => artifact.kind === "conf")
    .map((artifact) => {
      const serverName = String(artifact.serverName || artifact.serverId || "");
      const label = serverName.toLowerCase().includes("cctv") ? "WG-CCTV" : serverName.toLowerCase().includes("its") ? "WG-ITS" : serverName || "Config";
      return {
        id: artifact.id,
        label,
        href: `/api/peers/${encodeURIComponent(peer.id)}/artifacts/${encodeURIComponent(artifact.id)}`,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export default function CreatePeerView({ active, isAdministrator, onNavigate }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createPeerType, setCreatePeerType] = useState("site");
  const [managedByAutomation, setManagedByAutomation] = useState(true);
  const [siteBrand, setSiteBrand] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [adminTargetMode, setAdminTargetMode] = useState("");
  const [adminPurpose, setAdminPurpose] = useState("user-admin");
  const [adminAssignedIPError, setAdminAssignedIPError] = useState("");
  const [peerForm, setPeerForm] = useState(emptyPeer);
  const [createPeerFeedback, setCreatePeerFeedback] = useState(emptyCreatePeerFeedback);
  const [peers, setPeers] = useState([]);

  const loadState = useCallback(async () => {
    try {
      const { response, data } = await getState();
      if (response.ok) setPeers(Array.isArray(data?.peers) ? data.peers : []);
    } catch {
      // ignore in view
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    loadState();
  }, [active, loadState]);

  useEffect(() => {
    if (createPeerType === "site") {
      setManagedByAutomation(true);
      setAdminTargetMode("");
      setAdminAssignedIPError("");
      setPeerForm((current) => ({ ...current, name: "", assignedIP: "", allowedIPs: "0.0.0.0/0" }));
    }
    if (createPeerType === "administrator") {
      setManagedByAutomation(false);
      setSiteBrand("");
      setSiteLocation("");
      setAdminAssignedIPError("");
      setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    }
  }, [createPeerType]);

  const generatedSiteName = useCallback(() => {
    const brand = normalizeSiteSegment(siteBrand);
    const location = normalizeSiteSegment(siteLocation);
    if (!brand && !location) return "";
    if (!brand) return location;
    if (!location) return brand;
    return `${brand}-${location}`;
  }, [siteBrand, siteLocation]);

  const getAdminIPValidation = useCallback((ipValue, serverID) => validateAdminIP(ipValue, serverID, peers), [peers]);
  const getAvailableAdminIPs = useCallback((serverID) => availableAdminIPsFor(peers, serverID), [peers]);

  const createFlowSteps = (mode) => {
    const siteLabel = mode === "site" ? (generatedSiteName() || "BRAND-LOCATION") : (peerForm.name.trim() || "Administrator Peer");
    const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
    if (mode === "administrator") {
      return [
        { label: "Target", value: selectedTargetServer?.label || "Select server", meta: selectedTargetServer?.pool || "Required first" },
        { label: "Identity", value: siteLabel || "Administrator Peer", meta: "Manual input" },
        { label: "Assigned IP", value: peerForm.assignedIP.trim() || selectedTargetServer?.pool || "10.x.x.x", meta: "Single profile" },
        { label: "Output", value: "CONF", meta: "Downloadable" },
      ];
    }
    return [
      { label: "Site", value: siteLabel, meta: "Site Peer" },
      { label: "WG-ITS", value: "10.21.x.x", meta: "Auto assign" },
      { label: "WG-CCTV", value: "10.22.x.x", meta: "Auto assign" },
      { label: "Output", value: "CONF + RSC", meta: "Artifacts" },
    ];
  };

  const resetPeerForm = () => {
    setPeerForm(emptyPeer);
    setManagedByAutomation(createPeerType === "site");
    if (createPeerType === "administrator") setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    setSiteBrand("");
    setSiteLocation("");
    setAdminTargetMode("");
    setAdminPurpose("user-admin");
    setAdminAssignedIPError("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);
    setError("");
  };

  const createPeer = async (event) => {
    event.preventDefault();
    const isSitePeer = createPeerType === "site";
    const peerName = peerForm.name.trim();
    const sitePeerName = generatedSiteName();

    setError("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);

    if (isSitePeer && !sitePeerName) {
      setCreatePeerFeedback({ type: "error", title: "Site Name Required", message: "Fill in Brand / Site Type and Location before creating a site peer.", peer: null });
      return;
    }

    if (!isSitePeer && !adminTargetMode) {
      setCreatePeerFeedback({ type: "error", title: "Target Server Required", message: "Select WG-ITS or WG-CCTV before creating an administrator peer.", peer: null, scope: "administrator" });
      return;
    }

    if (!isSitePeer && !peerName) {
      setCreatePeerFeedback({ type: "error", title: "Name Required", message: "Name must use uppercase A-Z, numbers, and dashes only.", peer: null, scope: "administrator" });
      return;
    }

    if (!isSitePeer && !peerForm.assignedIP) {
      setCreatePeerFeedback({ type: "error", title: "Assigned IP Required", message: "Select one available IP before creating administrator peer.", peer: null, scope: "administrator" });
      return;
    }

    if (!isSitePeer) {
      const validationMessage = getAdminIPValidation(peerForm.assignedIP, adminTargetMode);
      if (validationMessage) {
        setAdminAssignedIPError(validationMessage);
        setCreatePeerFeedback({ type: "error", title: "Invalid Assigned IP", message: validationMessage, peer: null, scope: "administrator" });
        return;
      }
      setAdminAssignedIPError("");
    }

    if (!isValidIPv4CIDR(peerForm.allowedIPs)) {
      setCreatePeerFeedback({ type: "error", title: "Invalid Allowed IPs", message: "Allowed IPs must be valid IPv4/CIDR format, using only numbers, dots, and slash.", peer: null, scope: createPeerType });
      return;
    }

    setSaving(true);

    try {
      const { response, data } = await createPeerAPI({
        peerType: createPeerType,
        managed: managedByAutomation,
        ...peerForm,
        name: isSitePeer ? sitePeerName : `Administrator-${peerName}`,
        publicKey: isSitePeer ? peerForm.publicKey : (peerForm.publicKey || generatePseudoPublicKey()),
        keepalive: Number(peerForm.keepalive),
        purpose: adminPurpose,
        targetServer: adminTargetMode,
      });

      if (!response.ok) throw new Error(data.error || "Failed to create peer");

      setPeers(Array.isArray(data?.state?.peers) ? data.state.peers : peers);
      setPeerForm(emptyPeer);
      setSiteBrand("");
      setSiteLocation("");
      setCreatePeerFeedback({
        type: "success",
        title: isSitePeer ? "Peer Created" : "Administrator Peer Created",
        message: isSitePeer ? "Site peer has been provisioned on WireGuard servers." : "Administrator profile has been provisioned on selected server.",
        peer: data.peer ? { ...data.peer, _scope: isSitePeer ? "site" : "administrator", _targetServer: adminTargetMode, _purpose: adminPurpose } : null,
        scope: isSitePeer ? "site" : "administrator",
      });
      window.dispatchEvent(new Event("occ-refresh-current-view"));
    } catch (err) {
      setCreatePeerFeedback({ type: "error", title: "Create Failed", message: err.message, peer: null, scope: createPeerType });
      setError("");
    } finally {
      setSaving(false);
    }
  };

  const feedbackPeer = createPeerFeedback.peer;
  const flowSteps = createFlowSteps(createPeerType);
  const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
  const adminSuggestions = adminTargetMode ? getAvailableAdminIPs(adminTargetMode) : [];
  const adminDownloads = administratorDownloadLinks(feedbackPeer);
  const siteSummary = siteAssignmentSummary(feedbackPeer);
  const siteDownloads = siteConfigLinks(feedbackPeer);
  const adminValidationMessage = createPeerType === "administrator" && adminTargetMode ? getAdminIPValidation(peerForm.assignedIP, adminTargetMode) : "";
  const adminIsReady = adminTargetMode !== "" && peerForm.name.trim() !== "" && adminPurpose !== "" && peerForm.assignedIP !== "" && adminValidationMessage === "";

  if (!active) return null;

  return (
    <section className="panel create-peer-panel">
      {error ? <div className="alert">{error}</div> : null}
      <div className="peer-tablist" role="tablist" aria-label="Select peer type">
        <button id="tab-site-peer" type="button" role="tab" className={`peer-tab${createPeerType === "site" ? " active" : ""}`} onClick={() => setCreatePeerType("site")} aria-selected={createPeerType === "site"} aria-controls="create-peer-form">
          <span className="peer-tab-title">Site Peer</span>
          <span className="peer-tab-description">Provision to WG-ITS and WG-CCTV</span>
        </button>
        <button id="tab-admin-peer" type="button" role="tab" className={`peer-tab${createPeerType === "administrator" ? " active" : ""}`} onClick={() => setCreatePeerType("administrator")} aria-selected={createPeerType === "administrator"} aria-controls="create-peer-form">
          <span className="peer-tab-title">Administrator Peer</span>
          <span className="peer-tab-description">Manual single-profile entry</span>
        </button>
      </div>

      <p className="form-note create-peer-note">{createPeerType === "site" ? "Auto-provision to WG-ITS and WG-CCTV" : "Single profile → .conf download"}</p>

      {createPeerFeedback.type && (createPeerFeedback.scope === createPeerType || createPeerFeedback.scope === "") ? (
        <section className={`create-feedback-banner ${createPeerFeedback.type}`} aria-live="polite">
          <div className="create-feedback-main">
            <strong>{createPeerFeedback.type === "success" ? "✅ " : "⚠ "} {createPeerFeedback.title}</strong>
            <p>{createPeerFeedback.message}</p>
          </div>
          {createPeerFeedback.type === "success" && createPeerType === "site" && feedbackPeer ? (
            <div className="create-feedback-body site-feedback-body">
              <div className="create-feedback-summary site-feedback-summary">
                <div className="site-feedback-cards">
                  {siteSummary.map((item) => (
                    <div className="create-feedback-chip site-feedback-chip" key={`${item.label}-${item.value}`}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="create-feedback-actions">
                {siteDownloads.map((item) => <a className="ghost" href={item.href} key={item.id}>Download {item.label}</a>)}
                {isAdministrator ? <button type="button" className="secondary-button" onClick={() => onNavigate("inventoryPeer")}>View Inventory</button> : null}
              </div>
            </div>
          ) : null}
          {createPeerFeedback.type === "success" && createPeerType === "administrator" ? (
            <div className="create-feedback-body">
              <div className="create-feedback-actions">{adminDownloads.map((item) => <a className="ghost" href={item.href} key={item.id}>{item.label}</a>)}</div>
            </div>
          ) : null}
        </section>
      ) : null}

      <form id="create-peer-form" className="settings-form create-peer-form" onSubmit={createPeer} role="tabpanel" aria-labelledby={createPeerType === "site" ? "tab-site-peer" : "tab-admin-peer"}>
        {createPeerType === "administrator" ? (
          <>
            <section className="form-section">
              <div className="form-section-head"><strong>Step 1 · Target Server</strong><span>Select WG-ITS or WG-CCTV</span></div>
              <div className="target-server-inline" role="radiogroup" aria-label="Target Server">
                {adminTargetOptions.map((option) => (
                  <button key={option.id} type="button" role="radio" className={`target-server-pill${adminTargetMode === option.id ? " active" : ""}`} aria-checked={adminTargetMode === option.id} onClick={() => setAdminTargetMode(option.id)}><span>{option.label}</span><small>{option.pool}</small></button>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head"><strong>Step 2 · Peer Identity</strong><span>Core identity used in OCC inventory</span></div>
              <div className="create-peer-form-grid admin-identity-grid">
                <label className="create-peer-field create-peer-field-wide">Name
                  <input name="name" value={peerForm.name.toUpperCase()} onChange={(event) => setPeerForm((current) => ({ ...current, name: normalizeAdminName(event.target.value) }))} required disabled={saving} placeholder="ADMIN-BRANCH" />
                  <small className="field-helper">Use only `A-Z`, `0-9`, and dash `-`. Spaces become `-`.</small>
                </label>
                <label className="create-peer-field create-peer-field-wide">Purpose / Role
                  <select value={adminPurpose} onChange={(event) => setAdminPurpose(event.target.value)} disabled={saving}>
                    {adminPurposeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head"><strong>Step 3 · Network</strong><span>Input administrator IP inside allowed range</span></div>
              <div className="create-peer-form-grid admin-layout">
                <label className="create-peer-field create-peer-field-wide">Assigned IP
                  <input name="assignedIP" value={peerForm.assignedIP} onChange={(event) => {
                    const nextValue = String(event.target.value || "").replace(/[^0-9.]/g, "");
                    setPeerForm((current) => ({ ...current, assignedIP: nextValue }));
                    if (adminTargetMode) setAdminAssignedIPError(getAdminIPValidation(nextValue, adminTargetMode)); else setAdminAssignedIPError("");
                  }} required disabled={saving} placeholder={adminTargetMode ? (adminTargetMode === "wg-its" ? "10.21.3.10" : "10.22.3.10") : "Select target server first"} inputMode="numeric" pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" />
                  <small className="field-helper">{adminRangeLabel(adminTargetMode)}</small>
                  {(adminAssignedIPError || adminValidationMessage) ? <small className="field-error">{adminAssignedIPError || adminValidationMessage}</small> : null}
                  {adminTargetMode ? (
                    <div className="ip-suggestion-list" aria-label="Suggested available IPs">
                      {adminSuggestions.map((ip) => (
                        <button type="button" key={ip} className="ip-suggestion-chip" onClick={() => { setPeerForm((current) => ({ ...current, assignedIP: ip })); setAdminAssignedIPError(""); }} disabled={saving}>{ip}</button>
                      ))}
                    </div>
                  ) : null}
                </label>
                <label className="create-peer-field">Allowed IPs
                  <input name="allowedIPs" value={peerForm.allowedIPs} onChange={(event) => setPeerForm((current) => ({ ...current, allowedIPs: sanitizeAllowedIPs(event.target.value) }))} disabled={saving} placeholder="Optional" inputMode="numeric" pattern="^(\d{1,3}(\.\d{1,3}){3})(/\d{1,2})?$" />
                  <small className="field-helper">Optional. Use IPv4/CIDR format only (example: 10.22.0.0/24).</small>
                </label>
                <div className="create-peer-field"><span>Availability</span><small className="field-helper">{adminTargetMode ? `${adminSuggestions.length} suggested free IPs` : "Choose target server to load IP suggestions"}</small></div>
              </div>
            </section>
          </>
        ) : (
          <div className="create-peer-form-grid">
            <label className="create-peer-field">Brand / Site Type
              <input value={siteBrand} onChange={(event) => setSiteBrand(normalizeSiteSegment(event.target.value))} pattern="[A-Z0-9]+" inputMode="text" required disabled={saving} placeholder="LIVEHOUSE" />
              <small className="field-helper">Use uppercase letters A-Z and numbers 0-9 only.</small>
            </label>
            <label className="create-peer-field">Location
              <input value={siteLocation} onChange={(event) => setSiteLocation(normalizeSiteSegment(event.target.value))} pattern="[A-Z0-9]+" inputMode="text" required disabled={saving} placeholder="KEMANG" />
              <small className="field-helper">Use uppercase letters A-Z and numbers 0-9 only.</small>
            </label>
            <label className="create-peer-field create-peer-field-wide">Generated Site Name
              <input value={generatedSiteName() || "BRAND-LOCATION"} readOnly disabled={saving} />
              <small className="field-helper">Final site name is generated automatically as `BRAND-LOCATION`.</small>
            </label>
          </div>
        )}

        <section className="form-section">
          <div className="form-section-head"><strong>Automation</strong><span>Set automation ownership for this peer</span></div>
          <label className="create-peer-field create-peer-field-wide checkbox-field">
            <span><input type="checkbox" checked={managedByAutomation} onChange={(event) => setManagedByAutomation(event.target.checked)} disabled={saving} /> {" "}Managed by automation</span>
            {createPeerType === "site" ? <small className="field-helper">For site peers, unmanaged mode is blocked for safety.</small> : <small className="field-helper">Administrator peers can be managed or unmanaged.</small>}
          </label>
        </section>

        <section className="flow-card">
          <div className="flow-card-head"><strong>{createPeerType === "site" ? "Flow Site Peer" : "Flow Administrator Peer"}</strong><span>{createPeerType === "site" ? "Auto-generated assignments" : "Manual profile creation"}</span></div>
          <div className="flow-pipeline" aria-label={`${createPeerType} flow`}>
            {flowSteps.map((step, index) => (
              <div className="flow-pipeline-fragment" key={`${step.label}-${index}`}>
                <article className="flow-step"><span>{step.label}</span><strong>{step.value}</strong><small>{step.meta}</small></article>
                {index < flowSteps.length - 1 ? <span className="flow-arrow" aria-hidden="true">→</span> : null}
              </div>
            ))}
          </div>
          <p className="site-flow-note">{createPeerType === "site" ? "Saat create dijalankan, OCC akan menyimpan satu site dengan dua assignment WireGuard dan empat file artefak untuk diunduh dari inventory." : `Administrator profile will be created for ${selectedTargetServer?.label || "selected target"} and can be downloaded as .conf.`}</p>
        </section>

        <div className={`create-peer-actions${createPeerType === "administrator" ? " create-peer-actions-sticky" : ""}`}>
          {createPeerType === "administrator" ? <div className="create-peer-action-summary"><span>Creating on</span><strong>{selectedTargetServer?.label || "Select target server"}</strong></div> : <span />}
          <button type="button" className="secondary-button" onClick={resetPeerForm} disabled={saving}>Reset</button>
          <button type="submit" className="primary-action-button" disabled={saving || (createPeerType === "administrator" && !adminIsReady)}>{saving ? <><span className="button-spinner" aria-hidden="true" />Creating...</> : "Create Peer"}</button>
        </div>
      </form>
    </section>
  );
}
