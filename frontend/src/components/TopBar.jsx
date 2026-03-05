import React from "react";
import { ChevronDownGlyph, MenuGlyph, RefreshGlyph, ThemeGlyph } from "./Icons";

export default function TopBar({
  theme,
  toggleTheme,
  handleTopRefresh,
  saving,
  loading,
  monitoringLoading,
  userMenuOpen,
  setUserMenuOpen,
  loggedInName,
  loggedInNIK,
  loggedInUser,
  loggedInRole,
  logout,
  onOpenMobileMenu,
}) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={onOpenMobileMenu}
        aria-label="Open navigation menu"
      >
        <MenuGlyph />
      </button>
      <div className="topbar-brand">
        <div className="brand-mark topbar-mark" aria-hidden="true">
          <span className="occ-node occ-node-top" />
          <span className="occ-node occ-node-right" />
          <span className="occ-node occ-node-bottom" />
          <span className="occ-node occ-node-left" />
          <span className="occ-node occ-node-bottom-right" />
          <span className="occ-node occ-node-bottom-left" />
          <span className="occ-ring" />
          <span className="occ-user-head" />
          <span className="occ-user-body" />
        </div>
        <div>
          <strong>OCC</strong>
          <p>Operation Control Center</p>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="ghost" onClick={handleTopRefresh} disabled={saving || loading || monitoringLoading}>
          <span className="button-icon" aria-hidden="true">
            <RefreshGlyph />
          </span>
          Refresh Data
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          <span className="theme-toggle-icon" aria-hidden="true">
            <ThemeGlyph mode={theme} />
          </span>
        </button>
        <div className="topbar-user">
          <button
            type="button"
            className={`user-trigger${userMenuOpen ? " active" : ""}`}
            onClick={() => setUserMenuOpen((current) => !current)}
            aria-expanded={userMenuOpen}
          >
            <span className="user-avatar" aria-hidden="true">
              {loggedInName.trim().slice(0, 1).toUpperCase() || "A"}
            </span>
            <span className="user-summary">
              <strong>{loggedInName || "Administrator"}</strong>
              <small>{`${loggedInNIK || loggedInUser || "000000"} - ${(loggedInRole || "administrator").toUpperCase()}`}</small>
            </span>
            <span className="user-chevron" aria-hidden="true">
              <ChevronDownGlyph />
            </span>
          </button>

          {userMenuOpen ? (
            <div className="user-dropdown">
              <p className="user-dropdown-title">Account Menu</p>
              <div className="user-meta-row">
                <span>Name</span>
                <strong>{loggedInName || "Administrator"}</strong>
              </div>
              <div className="user-meta-row">
                <span>NIK</span>
                <strong>{loggedInNIK || "-"}</strong>
              </div>
              <div className="user-meta-row">
                <span>Role</span>
                <strong>{(loggedInRole || "administrator").toUpperCase()}</strong>
              </div>
              <button type="button" className="danger user-logout" onClick={logout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
