import React from "react";
import { NavIcon } from "../components/Icons";

export default function DashboardView({ state, dashboardHealth, buildDashboardSparkline }) {
  const dashboardCards = dashboardHealth.items.map((item, index) => ({
    id: item.id || `dashboard-${index}`,
    title: String(item.label || item.target || "-").toUpperCase(),
    value: typeof item.latencyMs === "number" ? item.latencyMs.toFixed(2) : "--",
    detail: item.error || item.target || "-",
    tone: item.status === "good" ? "good" : "bad",
    sparkline: buildDashboardSparkline(item.label || item.target || item.id || index),
  }));

  return (
    <section className="dashboard-shell">
      <article className="panel dashboard-hero-card">
        <div className="dashboard-hero-icon">
          <NavIcon name="inventoryPeer" />
        </div>
        <p className="dashboard-hero-label">Total Peers</p>
        <strong className="dashboard-hero-value">{state.peers.length}</strong>
        <span className="dashboard-hero-subvalue">Registered peers</span>
      </article>

      {dashboardHealth.error ? <div className="alert">{dashboardHealth.error}</div> : null}

      {dashboardCards.length > 0 ? (
        <section className="dashboard-health-grid">
          {dashboardCards.map((card) => (
            <article className="panel dashboard-endpoint-card" key={card.id}>
              <p className="dashboard-endpoint-title">{card.title}</p>
              <div className="dashboard-endpoint-metric">
                <strong>{card.value}</strong>
                <span>ms</span>
                <span className={`dashboard-status-dot status-${card.tone}`} aria-hidden="true" />
              </div>
              <p className="dashboard-endpoint-subtitle">{card.detail}</p>
              <div className="dashboard-sparkline" aria-hidden="true">
                {card.sparkline.map((height, index) => (
                  <span
                    className="dashboard-sparkline-bar"
                    key={`${card.id}-bar-${index}`}
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty">No dashboard health checks available yet.</div>
      )}
    </section>
  );
}
