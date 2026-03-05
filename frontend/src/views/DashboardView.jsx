import React, { useCallback, useEffect, useState } from "react";
import { NavIcon } from "../components/Icons";
import { getDashboardHealth, getState } from "../api/peers";

const monitoringRefreshMs = 300000;

function buildDashboardSparkline(seed, total = 12) {
  const source = String(seed || "occ");
  const values = [];
  for (let index = 0; index < total; index += 1) {
    const code = source.charCodeAt(index % source.length);
    values.push(18 + ((code + index * 11) % 42));
  }
  return values;
}

export default function DashboardView({ active }) {
  const [peersCount, setPeersCount] = useState(0);
  const [dashboardHealth, setDashboardHealth] = useState({ loading: false, error: "", items: [], lastUpdated: "" });

  const loadData = useCallback(async () => {
    setDashboardHealth((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [{ response: stateResp, data: stateData }, { response: healthResp, data: healthData }] = await Promise.all([
        getState(),
        getDashboardHealth(),
      ]);

      if (stateResp.ok) {
        setPeersCount(Array.isArray(stateData?.peers) ? stateData.peers.length : 0);
      }

      if (!healthResp.ok) {
        throw new Error(healthData.error || "Failed to fetch dashboard health");
      }

      setDashboardHealth({
        loading: false,
        error: "",
        items: Array.isArray(healthData.items) ? healthData.items : [],
        lastUpdated: healthData.checkedAt || new Date().toLocaleString(),
      });
    } catch (err) {
      setDashboardHealth((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    loadData();
    const id = window.setInterval(loadData, monitoringRefreshMs);
    return () => window.clearInterval(id);
  }, [active, loadData]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => loadData();
    window.addEventListener("occ-refresh-current-view", handler);
    return () => window.removeEventListener("occ-refresh-current-view", handler);
  }, [active, loadData]);

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
        <strong className="dashboard-hero-value">{peersCount}</strong>
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
                  <span className="dashboard-sparkline-bar" key={`${card.id}-bar-${index}`} style={{ height: `${height}px` }} />
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
