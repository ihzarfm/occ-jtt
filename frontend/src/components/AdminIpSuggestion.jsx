import React from "react";

export default function AdminIpSuggestion({ adminTargetMode, adminSuggestions, onPickSuggestion, saving }) {
  if (!adminTargetMode) {
    return null;
  }

  return (
    <div className="ip-suggestion-list" aria-label="Suggested available IPs">
      {adminSuggestions.map((ip) => (
        <button
          type="button"
          key={ip}
          className="ip-suggestion-chip"
          onClick={() => onPickSuggestion(ip)}
          disabled={saving}
        >
          {ip}
        </button>
      ))}
    </div>
  );
}
