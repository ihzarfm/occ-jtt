import React from "react";
import { ThemeGlyph } from "../components/Icons";

export default function LoginView({
  theme,
  toggleTheme,
  authChecking,
  loginForm,
  updateLoginField,
  handleLogin,
  loginLoading,
  loginError,
}) {
  if (authChecking) {
    return (
      <main className="app-theme login-page" data-theme={theme}>
        <section className="login-shell loading-shell">
          <div className="login-theme-bar">
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
          </div>
          <section className="login-card" aria-label="Checking Session">
            <header className="login-brand">
              <div className="brand-mark login-brand-mark" aria-hidden="true">
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
              <div className="login-brand-copy">
                <h1>OCC</h1>
              </div>
              <p className="login-brand-subtitle">OPERATIONAL CONTROL CENTER</p>
            </header>
            <p className="login-status-text">Checking active login...</p>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-theme login-page" data-theme={theme}>
      <section className="login-shell">
        <div className="login-theme-bar">
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
        </div>
        <section className="login-card" aria-label="Login User">
          <header className="login-brand">
            <div className="brand-mark login-brand-mark" aria-hidden="true">
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
            <div className="login-brand-copy">
              <h1>OCC</h1>
            </div>
            <p className="login-brand-subtitle">OPERATIONAL CONTROL CENTER</p>
          </header>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="username">Username / NIK</label>
            <input
              id="username"
              name="username"
              type="text"
              value={loginForm.username}
              onChange={updateLoginField}
              placeholder="Enter username or NIK"
              autoComplete="username"
              disabled={loginLoading}
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={loginForm.password}
              onChange={updateLoginField}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loginLoading}
            />

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Checking..." : "Login"}
            </button>
          </form>

          <p className={`status-message${loginError ? " visible" : ""}`} aria-live="polite">
            {loginError || " "}
          </p>
        </section>
      </section>
    </main>
  );
}
