import React from "react";
import PeerActionsAdmin from "./PeerActionsAdmin";
import PeerActionsSite from "./PeerActionsSite";

function truncatePublicKey(value) {
  const key = String(value || "").trim();
  if (!key) return "-";
  if (key.length <= 28) return key;
  return `${key.slice(0, 12)}...${key.slice(-8)}`;
}

export default function PeerCard({
  peer,
  managementStatus,
  isSite,
  peerTypeLabel,
  wgItsIP,
  wgCctvIP,
  assignedIP,
  creatorLabel,
  createdAtLabel,
  onCopyPublicKey,
}) {
  const displayName = peer.siteName || peer.name;

  return (
    <article className="peer-card inventory-card inventory-peer-card" key={peer.id}>
      <div className="peer-card__left">
        <div className="inventory-card-head">
          <h3>{displayName}</h3>
          <span className={`inventory-pill inventory-${managementStatus}`}>{managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}</span>
        </div>

        <p className="inv-peer-type">{peerTypeLabel}</p>

        <div className="inventory-assignment-list inv-ip-list">
          {isSite ? (
            <>
              <p><strong>wg-its</strong>: {wgItsIP || "-"}</p>
              <p><strong>wg-cctv</strong>: {wgCctvIP || "-"}</p>
            </>
          ) : (
            <p><strong>assigned_ip</strong>: {assignedIP || "-"}</p>
          )}
        </div>

        <div className="inventory-meta-list">
          <p><strong>Created by</strong>: {creatorLabel}</p>
          <p><strong>Created at</strong>: {createdAtLabel}</p>
        </div>

        <div className="inv-key-row">
          <span className="peer-mono">{truncatePublicKey(peer.publicKey)}</span>
          <button
            type="button"
            className="ghost inv-copy-btn"
            onClick={() => onCopyPublicKey(peer.publicKey)}
            disabled={!String(peer.publicKey || "").trim()}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="peer-card__right">
        {isSite ? <PeerActionsSite peerID={peer.id} artifacts={peer.artifacts} /> : <PeerActionsAdmin peerID={peer.id} />}
      </div>
    </article>
  );
}

