import React from "react";

export function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M7 8h10M7 12h6M7 16h8" />
      </>
    ),
    monitoring: (
      <>
        <path d="M4 17h16" />
        <path d="M6 15l3-4 3 2 4-6 2 3" />
        <circle cx="16" cy="7" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    createPeer: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
    removePeer: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M15 11h6" />
      </>
    ),
    updatePeer: (
      <>
        <circle cx="8.5" cy="8.5" r="3" />
        <path d="M3.5 18c1.2-2.4 3.2-3.8 5-3.8" />
        <path d="M15 7l3 3" />
        <path d="M13.5 14.5l5-5" />
        <path d="M12.5 17.5l2.5-.5-.5-2.5-2 3z" />
      </>
    ),
    inventoryPeer: (
      <>
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16" cy="8" r="2.5" />
        <path d="M3.5 18c1-2.4 2.8-3.8 4.5-3.8S11.5 15.6 12.5 18" />
        <path d="M11.5 18c1-2.4 2.8-3.8 4.5-3.8S19.5 15.6 20.5 18" />
      </>
    ),
    serverConnection: (
      <>
        <rect x="4" y="4" width="16" height="6" rx="2" />
        <rect x="4" y="14" width="16" height="6" rx="2" />
        <path d="M8 7h.01M8 17h.01" />
      </>
    ),
    mikrotikSsh: (
      <>
        <path d="M6 8l4 4-4 4" />
        <path d="M11 16h7" />
      </>
    ),
    mikrotikAutomation: (
      <>
        <rect x="5" y="4" width="12" height="16" rx="2" />
        <path d="M9 9h4M9 13h4" />
        <path d="M18 15l2 2" />
        <path d="M18 11v4h-4" />
      </>
    ),
    mikrotikCheckIsp: (
      <>
        <path d="M5 12a10 10 0 0 1 14 0" />
        <path d="M8 15a6 6 0 0 1 8 0" />
        <path d="M11 18a2 2 0 0 1 2 0" />
      </>
    ),
    wireguardLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    mikrotikLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    userLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    userList: (
      <>
        <circle cx="8" cy="8" r="2.5" />
        <path d="M3.5 18c1-2.4 2.8-3.8 4.5-3.8S11.5 15.6 12.5 18" />
        <path d="M14 8h6M14 12h6M14 16h4" />
      </>
    ),
    createUser: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
    updateUser: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M15 8l3 3" />
        <path d="M13.5 14.5l5-5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="2.5" />
        <path d="M19 12h2M3 12h2M12 19v2M12 3v2" />
        <path d="m16.8 16.8 1.4 1.4M5.8 5.8 7.2 7.2M16.8 7.2l1.4-1.4M5.8 18.2l1.4-1.4" />
      </>
    ),
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] || icons.dashboard}
      </svg>
    </span>
  );
}

export function ThemeGlyph({ mode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4.5a7.5 7.5 0 1 0 4.5 12.8A8.5 8.5 0 0 1 15 4.5z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </svg>
  );
}

export function RefreshGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M7.8 16.2A7 7 0 0 0 19 11a7 7 0 0 0-.2-1.7" />
      <path d="M16.2 7.8A7 7 0 0 0 5 13c0 .6.1 1.1.2 1.7" />
    </svg>
  );
}

export function ChevronDownGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

export function MenuGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
