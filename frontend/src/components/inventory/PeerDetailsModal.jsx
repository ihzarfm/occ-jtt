import React from "react";

export default function PeerDetailsModal({ peer, creatorLabel, createdAtLabel, onCopyPublicKey, onClose }) {
  if (!peer) return null;

  const isSite = Array.isArray(peer.assignments) && peer.assignments.length > 0;

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="inv-modal" role="dialog" aria-modal="true" aria-label="Peer Details" onClick={(event) => event.stopPropagation()}>
        <div className="panel-head compact-head">
          <h3>{peer.siteName || peer.name}</h3>
          <span>{isSite ? "Site Peer" : "Administrator Peer"}</span>
        </div>

        <div className="inventory-meta-list">
          <p><strong>Created by</strong>: {creatorLabel}</p>
          <p><strong>Created at</strong>: {createdAtLabel}</p>
          {!isSite ? <p><strong>Scope</strong>: {String(peer.serverScope || "-").toUpperCase()}</p> : null}
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

        <div className="action-row">
          <button type="button" className="ghost" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

