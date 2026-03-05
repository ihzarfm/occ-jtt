import React from "react";

export default function PeerBadges({ managementStatus, isSite }) {
  return (
    <div className="inv-row__badges">
      <span className={`inventory-pill inventory-${managementStatus}`}>{managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}</span>
      <span className={`inv-type-pill inv-type-${isSite ? "site" : "admin"}`}>{isSite ? "SITE" : "ADMIN"}</span>
    </div>
  );
}

