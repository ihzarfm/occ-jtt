import React from "react";
import { normalizedServerID } from "../../utils/validators";

const siteServers = [
  { id: "wg-its", label: "WG-ITS" },
  { id: "wg-cctv", label: "WG-CCTV" },
];

export default function PeerActionsSite({ peerID, artifacts }) {
  return (
    <div className="peer-action-groups">
      {siteServers.map((server) => {
        const items = (artifacts || []).filter((artifact) => normalizedServerID(artifact.serverId || artifact.serverName) === server.id);
        return (
          <div className="peer-action-group" key={`${peerID}-${server.id}`}>
            <span className="peer-action-group-title">{server.label}</span>
            <div className="peer-action-group-buttons">
              {items.length > 0 ? items.map((artifact) => (
                <a
                  className="ghost peer-action-btn"
                  href={`/api/peers/${encodeURIComponent(peerID)}/artifacts/${encodeURIComponent(artifact.id)}`}
                  key={`${peerID}-${artifact.id}`}
                >
                  {String(artifact.kind || "").toUpperCase()}
                </a>
              )) : <span className="peer-action-empty">-</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

