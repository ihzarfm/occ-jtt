import React from "react";

export default function CreatePeerModeToggle({ createPeerType, setCreatePeerType }) {
  return (
    <div className="peer-tablist" role="tablist" aria-label="Select peer type">
      <button
        id="tab-site-peer"
        type="button"
        role="tab"
        className={`peer-tab${createPeerType === "site" ? " active" : ""}`}
        onClick={() => setCreatePeerType("site")}
        aria-selected={createPeerType === "site"}
        aria-controls="create-peer-form"
      >
        <span className="peer-tab-title">Site Peer</span>
        <span className="peer-tab-description">Provision to WG-ITS and WG-CCTV</span>
      </button>
      <button
        id="tab-admin-peer"
        type="button"
        role="tab"
        className={`peer-tab${createPeerType === "administrator" ? " active" : ""}`}
        onClick={() => setCreatePeerType("administrator")}
        aria-selected={createPeerType === "administrator"}
        aria-controls="create-peer-form"
      >
        <span className="peer-tab-title">Administrator Peer</span>
        <span className="peer-tab-description">Manual single-profile entry</span>
      </button>
    </div>
  );
}
