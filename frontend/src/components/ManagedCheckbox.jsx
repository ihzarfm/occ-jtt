import React from "react";

export default function ManagedCheckbox({ createPeerType, managedByAutomation, setManagedByAutomation, saving }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <strong>Automation</strong>
        <span>Set automation ownership for this peer</span>
      </div>
      <label className="create-peer-field create-peer-field-wide checkbox-field">
        <span>
          <input
            type="checkbox"
            checked={managedByAutomation}
            onChange={(event) => setManagedByAutomation(event.target.checked)}
            disabled={saving}
          />
          {" "}Managed by automation
        </span>
        {createPeerType === "site" ? (
          <small className="field-helper">For site peers, unmanaged mode is blocked for safety.</small>
        ) : (
          <small className="field-helper">Administrator peers can be managed or unmanaged.</small>
        )}
      </label>
    </section>
  );
}
