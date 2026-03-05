import React from "react";
import { normalizedServerID } from "../../utils/validators";

const siteServers = [
  { id: "wg-its", label: "WG-ITS" },
  { id: "wg-cctv", label: "WG-CCTV" },
];

export default function InventoryPeerActions({ peer }) {
  if (Array.isArray(peer.assignments) && peer.assignments.length > 0) {
    return (
      <div className="inv-actions inv-actions-site">
        {siteServers.map((server) => {
          const items = (peer.artifacts || []).filter((artifact) => normalizedServerID(artifact.serverId || artifact.serverName) === server.id);
          return (
            <div className="inv-actions-group" key={`${peer.id}-${server.id}`}>
              <span className="inv-actions-label">{server.label}</span>
              <div className="inv-actions-buttons">
                {items.length > 0 ? items.map((artifact) => (
                  <a
                    className="ghost inv-action-btn"
                    href={`/api/peers/${encodeURIComponent(peer.id)}/artifacts/${encodeURIComponent(artifact.id)}`}
                    key={`${peer.id}-${artifact.id}`}
                  >
                    {String(artifact.kind || "").toUpperCase()}
                  </a>
                )) : <span className="inv-action-empty">-</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inv-actions">
      <a className="ghost inv-action-btn inv-action-btn-primary" href={`/api/peers/${encodeURIComponent(peer.id)}/config`}>
        Download .conf
      </a>
    </div>
  );
}

