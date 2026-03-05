import React from "react";

export default function RouterList({ routers, onViewDetails }) {
  return (
    <div className="peer-list-grid inventory-grid">
      {routers.map((router) => (
        <article className="peer-card inventory-card" key={router.id}>
          <div>
            <div className="inventory-card-head">
              <h3>{router.name}</h3>
              <span className={`inventory-pill inventory-${router.status === "online" ? "managed" : "unmanaged"}`}>
                {router.status === "online" ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <div className="inventory-meta-list">
              <p><strong>Location</strong>: {router.location}</p>
              <p><strong>Model</strong>: {router.model}</p>
              <p><strong>WAN Count</strong>: {router.wanLinks.length}</p>
            </div>
          </div>
          <div className="peer-actions">
            <button type="button" className="ghost" onClick={() => onViewDetails(router)}>
              View WAN Details
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

