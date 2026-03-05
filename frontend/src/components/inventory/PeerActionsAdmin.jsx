import React from "react";

export default function PeerActionsAdmin({ peerID }) {
  return (
    <div className="peer-action-group">
      <a className="ghost peer-action-btn" href={`/api/peers/${encodeURIComponent(peerID)}/config`}>
        Download .conf
      </a>
    </div>
  );
}

