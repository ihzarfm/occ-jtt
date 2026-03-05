import React, { useMemo } from "react";
import { normalizedServerID } from "../../utils/validators";
import PeerBadges from "./PeerBadges";
import InventoryPeerActions from "./InventoryPeerActions";

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

export default function InventoryPeerRow({
  peer,
  managementStatus,
  wgItsIP,
  wgCctvIP,
  assignedIP,
  creatorLabel,
  createdAtLabel,
  onOpenDetails,
}) {
  const isSite = Array.isArray(peer.assignments) && peer.assignments.length > 0;
  const scopeLabel = useMemo(() => {
    const normalized = normalizedServerID(peer.serverScope || "");
    return normalized ? normalized.toUpperCase() : "-";
  }, [peer.serverScope]);

  const secondaryLine = isSite
    ? `ITS ${wgItsIP || "-"} • CCTV ${wgCctvIP || "-"} • by ${creatorLabel} • ${compactDate(peer.createdAt || createdAtLabel)}`
    : `IP ${assignedIP || "-"} • ${scopeLabel} • by ${creatorLabel} • ${compactDate(peer.createdAt || createdAtLabel)}`;

  return (
    <article className="inv-row">
      <div className="inv-row__main">
        <span className="inv-row__avatar" aria-hidden="true">{isSite ? "S" : "A"}</span>
        <div className="inv-row__text">
          <p className="inv-row__name">{peer.siteName || peer.name}</p>
          <p className="inv-row__meta" title={secondaryLine}>{secondaryLine}</p>
        </div>
      </div>

      <PeerBadges managementStatus={managementStatus} isSite={isSite} />

      <div className="inv-row__actions">
        <InventoryPeerActions peer={peer} />
        <button type="button" className="ghost inv-info-btn" onClick={() => onOpenDetails(peer)} title="Details" aria-label="Details">
          i
        </button>
      </div>
    </article>
  );
}

