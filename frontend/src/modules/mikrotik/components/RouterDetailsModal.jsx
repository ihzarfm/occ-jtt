import React from "react";

export default function RouterDetailsModal({ router, onClose }) {
  if (!router) return null;

  return (
    <section className="form-section">
      <div className="form-section-head">
        <strong>{router.name} WAN Details</strong>
        <span>{router.location}</span>
      </div>

      <div className="inventory-meta-list">
        {router.wanLinks.map((wan) => (
          <p key={`${router.id}-${wan.interface}`}>
            <strong>{wan.interface}</strong>: {wan.ip} | GW {wan.gateway} | {wan.isp}
          </p>
        ))}
      </div>

      <div className="action-row">
        <button type="button" className="ghost" onClick={onClose}>Close</button>
      </div>
    </section>
  );
}

