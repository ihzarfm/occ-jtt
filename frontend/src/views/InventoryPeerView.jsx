import React, { useCallback, useEffect, useMemo, useState } from "react";
import { deletePeer, getState } from "../api/peers";
import { getWGServerDiagnostics } from "../api/monitoring";

function isSitePeerRecord(peer) {
  const peerType = String(peer?.type || "").trim().toLowerCase();
  return peerType === "site" || peerType === "outlet" || Array.isArray(peer?.assignments);
}

function peerManagementStatus(peer) {
  if (typeof peer?.managed === "boolean") return peer.managed ? "managed" : "unmanaged";
  if (isSitePeerRecord(peer)) return "managed";
  const name = String(peer?.name || "");
  if (name.startsWith("Administrator -")) return "managed";
  return "unmanaged";
}

function assignmentFor(peer, interfaceName) {
  if (!Array.isArray(peer?.assignments)) return null;
  return peer.assignments.find((assignment) => assignment.interfaceName === interfaceName) || null;
}

function peerCreatorLabel(peer) {
  return peer.createdByName || peer.createdBy || "-";
}

function peerCreatedAtLabel(peer) {
  return peer.createdAt ? new Date(peer.createdAt).toLocaleString() : "-";
}

function peerMatchesSearch(peer, searchValue) {
  const query = String(searchValue || "").trim().toLowerCase();
  if (!query) return true;
  const assignmentIPs = Array.isArray(peer.assignments) ? peer.assignments.map((item) => item.assignedIP).join(" ") : "";
  const haystack = [peer.name, peer.siteName, peer.assignedIP, peer.createdByName, peer.createdBy, assignmentIPs].join(" ").toLowerCase();
  return haystack.includes(query);
}

export default function InventoryPeerView({ mode, active, isAdministrator }) {
  const [state, setState] = useState({ peers: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [wgServerDiagnostics, setWGServerDiagnostics] = useState({ loading: false, error: "", items: [], lastUpdated: "" });

  const loadState = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await getState();
      if (!response.ok) throw new Error(data.error || "Failed to fetch state");
      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWGDiagnostics = useCallback(async () => {
    setWGServerDiagnostics((current) => ({ ...current, loading: true, error: "" }));
    try {
      const { response, data } = await getWGServerDiagnostics();
      if (!response.ok) throw new Error(data.error || "Failed to fetch WireGuard server diagnostics");
      setWGServerDiagnostics({ loading: false, error: "", items: data.items || [], lastUpdated: data.checkedAt || new Date().toLocaleString() });
    } catch (err) {
      setWGServerDiagnostics((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    if (mode === "checkServerConnection") {
      loadWGDiagnostics();
    } else {
      loadState();
    }
  }, [active, mode, loadState, loadWGDiagnostics]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => {
      if (mode === "checkServerConnection") loadWGDiagnostics(); else loadState();
    };
    window.addEventListener("occ-refresh-current-view", handler);
    return () => window.removeEventListener("occ-refresh-current-view", handler);
  }, [active, mode, loadState, loadWGDiagnostics]);

  const removePeer = async (id) => {
    setSaving(true);
    setRemoveError("");
    try {
      const { response, data } = await deletePeer(id);
      if (!response.ok) throw new Error(data.error || "Failed to delete peer");
      setState(data);
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const visiblePeers = useMemo(() => (state.peers || []).filter((peer) => peerMatchesSearch(peer, search)), [state.peers, search]);

  if (mode === "updatePeer") {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Update Peer</h2>
          <span>Update peer belum tersedia. Gunakan recreate pada Create Peer bila perlu perubahan.</span>
        </div>
      </section>
    );
  }

  if (mode === "checkServerConnection") {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Server Connection</h2>
          <span>{wgServerDiagnostics.lastUpdated ? `Last check: ${wgServerDiagnostics.lastUpdated}` : "OCC to WireGuard server diagnostics"}</span>
        </div>

        <div className="action-row">
          <button type="button" className="ghost" onClick={loadWGDiagnostics} disabled={wgServerDiagnostics.loading}>
            {wgServerDiagnostics.loading ? "Checking Servers..." : "Run Server Check"}
          </button>
        </div>

        {wgServerDiagnostics.error ? <div className="alert">{wgServerDiagnostics.error}</div> : null}
        {wgServerDiagnostics.loading ? <div className="empty">Testing connectivity to staging WireGuard servers...</div> : null}

        {!wgServerDiagnostics.loading && wgServerDiagnostics.items.length === 0 && !wgServerDiagnostics.error ? <div className="empty">No server diagnostics available yet.</div> : null}

        {!wgServerDiagnostics.loading && wgServerDiagnostics.items.length > 0 ? (
          <div className="server-list-grid">
            {wgServerDiagnostics.items.map((item) => {
              const healthy = item.pingStatus === "up" && item.sshStatus === "up";
              return (
                <article className="server-card" key={item.id}>
                  <div className="server-card-head">
                    <h3>{item.name}</h3>
                    <span className={`status-pill status-${healthy ? "up" : "down"}`}>{healthy ? "Healthy" : "Bad Connection"}</span>
                  </div>
                  <div className="config-grid">
                    <span>Host: {item.host}</span>
                    <span>WG IP: {item.wireGuardIP}</span>
                    <span>Ping Latency: {typeof item.pingLatencyMs === "number" ? `${item.pingLatencyMs.toFixed(2)} ms` : "-"}</span>
                    <span>SSH Latency: {typeof item.sshLatencyMs === "number" ? `${item.sshLatencyMs.toFixed(0)} ms` : "-"}</span>
                  </div>
                  <div className="server-card-notes"><small>Ping: {item.pingError || "OK"}</small><small>SSH: {item.sshError || "OK"}</small></div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    );
  }

  if (mode === "removePeer") {
    const sitePeers = visiblePeers.filter((peer) => isSitePeerRecord(peer));
    const administratorPeers = visiblePeers.filter((peer) => !isSitePeerRecord(peer));

    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Remove Peer</h2>
          <span>Use this area for deletion only. Inventory remains read-only.</span>
        </div>
        <section className="list-toolbar" aria-label="Remove Peer Search">
          <label className="monitor-search"><span className="sr-only">Search peers</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search peer by name or IP..." /></label>
        </section>
        {error ? <div className="alert">{error}</div> : null}
        {removeError ? <div className="alert">{removeError}</div> : null}
        {loading ? <div className="empty">Loading peers...</div> : null}
        {!loading ? (
          <div className="remove-sections">
            <section className="remove-section">
              <div className="panel-head compact-head"><h3>Site Peer</h3><span>{sitePeers.length} item(s)</span></div>
              {sitePeers.length === 0 ? <div className="empty">No site peer found.</div> : (
                <div className="peer-list-grid">
                  {sitePeers.map((peer) => (
                    <article className="peer-card" key={peer.id}>
                      <div>
                        <h3>{peer.siteName || peer.name}</h3>
                        <p>{Array.isArray(peer.assignments) ? peer.assignments.map((item) => `${item.interfaceName}: ${item.assignedIP}`).join(" • ") : peer.assignedIP}</p>
                      </div>
                      <button className="danger" onClick={() => removePeer(peer.id)} disabled={saving}>Delete</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="remove-section">
              <div className="panel-head compact-head"><h3>Administrator Peer</h3><span>{administratorPeers.length} item(s)</span></div>
              {administratorPeers.length === 0 ? <div className="empty">No administrator peer found.</div> : (
                <div className="peer-list-grid">
                  {administratorPeers.map((peer) => (
                    <article className="peer-card" key={peer.id}>
                      <div><h3>{peer.name}</h3><p>{peer.assignedIP}</p></div>
                      <button className="danger" onClick={() => removePeer(peer.id)} disabled={saving}>Delete</button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  const managedPeers = visiblePeers.filter((peer) => peerManagementStatus(peer) === "managed");
  const unmanagedPeers = visiblePeers.filter((peer) => peerManagementStatus(peer) === "unmanaged");

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Inventory Peer</h2>
        <span>Single peer entries managed directly in OCC</span>
      </div>

      <section className="list-toolbar" aria-label="Inventory Search">
        <label className="monitor-search"><span className="sr-only">Search inventory</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by site, peer, IP, creator..." /></label>
      </section>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="empty">Loading peer inventory...</div> : null}
      {!loading && visiblePeers.length === 0 ? <div className="empty">No peer found in inventory.</div> : null}

      {!loading && visiblePeers.length > 0 ? (
        <div className="inventory-summary-cards">
          <article className="inventory-summary-card"><span>Total</span><strong>{visiblePeers.length}</strong></article>
          <article className="inventory-summary-card"><span>Managed</span><strong>{managedPeers.length}</strong></article>
          <article className="inventory-summary-card"><span>Unmanaged</span><strong>{unmanagedPeers.length}</strong></article>
        </div>
      ) : null}

      {!loading && visiblePeers.length > 0 ? (
        <div className="peer-list-grid inventory-grid">
          {visiblePeers.map((peer) => {
            const managementStatus = peerManagementStatus(peer);
            const wgIts = assignmentFor(peer, "wg-its");
            const wgCctv = assignmentFor(peer, "wg-cctv");
            return (
              <article className="peer-card inventory-card" key={peer.id}>
                <div>
                  <div className="inventory-card-head">
                    <h3>{peer.siteName || peer.name}</h3>
                    <span className={`inventory-pill inventory-${managementStatus}`}>{managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}</span>
                  </div>
                  {Array.isArray(peer.assignments) && peer.assignments.length > 0 ? (
                    <div className="inventory-site-block">
                      <span className="inventory-site-label">Site</span>
                      <strong className="inventory-site-name">{peer.siteName || peer.name}</strong>
                      <div className="inventory-assignment-list">
                        <p><strong>ip wg-its</strong>{": "}{wgIts?.assignedIP || "-"}</p>
                        <p><strong>ip wg-cctv</strong>{": "}{wgCctv?.assignedIP || "-"}</p>
                      </div>
                      <div className="inventory-meta-list">
                        <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                        <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p>{peer.assignedIP}</p>
                      <small>{peer.publicKey}</small>
                      <div className="inventory-meta-list">
                        <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                        <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="peer-actions">
                  {Array.isArray(peer.artifacts) && peer.artifacts.length > 0 ? (
                    <div className="artifact-list artifact-list-stacked">
                      {["stg-its", "stg-cctv"].map((serverName) => {
                        const items = peer.artifacts.filter((artifact) => artifact.serverName === serverName);
                        if (items.length === 0) return null;
                        return (
                          <div className="artifact-group" key={`${peer.id}-${serverName}`}>
                            <span className="artifact-group-title">{serverName}</span>
                            <div className="artifact-group-actions">
                              {items.map((artifact) => (
                                <a className="ghost" href={`/api/peers/${encodeURIComponent(peer.id)}/artifacts/${encodeURIComponent(artifact.id)}`} key={`${peer.id}-${artifact.id}`}>{artifact.kind.toUpperCase()}</a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <a className="ghost" href={`/api/peers/${encodeURIComponent(peer.id)}/config`}>Download Config</a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
