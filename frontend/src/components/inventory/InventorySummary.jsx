import React from "react";

export default function InventorySummary({ total, managed, unmanaged }) {
  return (
    <div className="inv-summary">
      <article className="inv-chip">
        <span>Total</span>
        <strong>{total}</strong>
      </article>
      <article className="inv-chip">
        <span>Managed</span>
        <strong>{managed}</strong>
      </article>
      <article className="inv-chip">
        <span>Unmanaged</span>
        <strong>{unmanaged}</strong>
      </article>
    </div>
  );
}

