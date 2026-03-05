import React from "react";

export default function PeerFormActions({
  createPeerType,
  selectedTargetServer,
  saving,
  adminIsReady,
  resetPeerForm,
}) {
  return (
    <div className={`create-peer-actions${createPeerType === "administrator" ? " create-peer-actions-sticky" : ""}`}>
      {createPeerType === "administrator" ? (
        <div className="create-peer-action-summary">
          <span>Creating on</span>
          <strong>{selectedTargetServer?.label || "Select target server"}</strong>
        </div>
      ) : <span />}
      <button type="button" className="secondary-button" onClick={resetPeerForm} disabled={saving}>
        Reset
      </button>
      <button type="submit" className="primary-action-button" disabled={saving || (createPeerType === "administrator" && !adminIsReady)}>
        {saving ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Creating...
          </>
        ) : "Create Peer"}
      </button>
    </div>
  );
}
