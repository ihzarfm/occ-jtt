import React, { useMemo, useState } from "react";
import PeerActionsAdmin from "./PeerActionsAdmin";
import PeerActionsSite from "./PeerActionsSite";
import { normalizedServerID } from "../../utils/validators";

function compactDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export default function PeerCard({
  peer,
  managementStatus,
  isSite,
  wgItsIP,
  wgCctvIP,
  assignedIP,
  creatorLabel,
  createdAtLabel,
  onCopyPublicKey,
}) {
  const [expanded, setExpanded] = useState(false);
  const displayName = peer.siteName || peer.name;
  const typePill = isSite ? "SITE" : "ADMIN";
  const compactMeta = `by ${creatorLabel} • ${compactDate(peer.createdAt || createdAtLabel)}`;
  const scopeLabel = useMemo(() => {
    const normalized = normalizedServerID(peer.serverScope || "");
    if (!normalized) return "-";
    return normalized.toUpperCase();
  }, [peer.serverScope]);
  const summaryText = isSite
    ? `ITS ${wgItsIP || "-"} • CCTV ${wgCctvIP || "-"}`
    : `IP ${assignedIP || "-"} • Scope ${scopeLabel}`;

  return (
    <article className="peer-card inventory-card inventory-peer-card" key={peer.id}>
      <div className="peer-card__left">
        <div className="inventory-card-head">
          <h3>{displayName}</h3>
          <div className="inv-header-pills">
            <span className={`inventory-pill inventory-${managementStatus}`}>{managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}</span>
            <span className={`inv-type-pill inv-type-${isSite ? "site" : "admin"}`}>{typePill}</span>
          </div>
        </div>

        <p className="inv-summary-row">{summaryText}</p>
        <p className="inv-meta-row">{compactMeta}</p>

        {expanded ? (
          <div className="inv-details">
            <div className="inventory-meta-list">
              <p><strong>Created by</strong>: {creatorLabel}</p>
              <p><strong>Created at</strong>: {createdAtLabel}</p>
              {!isSite ? <p><strong>Scope</strong>: {scopeLabel}</p> : null}
            </div>

            <div className="inv-key-row">
              <span className="peer-mono">{String(peer.publicKey || "").trim() || "-"}</span>
              <button
                type="button"
                className="ghost inv-copy-btn"
                onClick={() => onCopyPublicKey(peer.publicKey)}
                disabled={!String(peer.publicKey || "").trim()}
              >
                Copy
              </button>
            </div>

            <div className="inv-details-actions">
              {isSite ? <PeerActionsSite peerID={peer.id} artifacts={peer.artifacts} /> : <PeerActionsAdmin peerID={peer.id} />}
            </div>
          </div>
        ) : null}

        <div className="inv-card-footer">
          <button type="button" className="ghost inv-details-toggle" onClick={() => setExpanded((current) => !current)}>
            {expanded ? "Hide details" : "Details"}
          </button>
        </div>
      </div>

      <div className="peer-card__right">
        <button type="button" className="ghost inv-details-toggle" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Hide details" : "Details"}
        </button>
      </div>
    </article>
  );
}

