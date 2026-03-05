import React from "react";

export default function ComingSoon({ title, description, canRunAction, actionLabel = "Run Action", onAction }) {
  return (
    <section className="placeholder-panel">
      <strong>{title}</strong>
      <p>{description}</p>
      <div className="action-row">
        <button type="button" className="ghost" onClick={onAction} disabled={!canRunAction} title={canRunAction ? "Coming soon" : "Admin only"}>
          {actionLabel}
        </button>
      </div>
    </section>
  );
}

