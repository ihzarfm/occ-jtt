import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listLogs } from "../api/logs";

function logMatchesSearch(item, searchValue) {
  const query = String(searchValue || "").trim().toLowerCase();
  if (!query) return true;
  const haystack = [item.actorName, item.actor, item.target, item.message].join(" ").toLowerCase();
  return haystack.includes(query);
}

export default function LogsView({ mode, active }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [logSearch, setLogSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await listLogs(mode);
      if (!response.ok) throw new Error(data.error || "Failed to fetch logs");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!active) return;
    loadData();
  }, [active, loadData]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => loadData();
    window.addEventListener("occ-refresh-current-view", handler);
    return () => window.removeEventListener("occ-refresh-current-view", handler);
  }, [active, loadData]);

  const visibleLogs = useMemo(() => items.filter((item) => logMatchesSearch(item, logSearch)), [items, logSearch]);

  if (mode === "mikrotik") {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Mikrotik Logs</h2>
          <span>Reserved for future router activity logs</span>
        </div>

        <section className="list-toolbar" aria-label="Mikrotik Logs Search">
          <label className="monitor-search">
            <span className="sr-only">Search Mikrotik logs</span>
            <input type="search" value={logSearch} onChange={(event) => setLogSearch(event.target.value)} placeholder="Search by creator, peer name, or IP..." />
          </label>
        </section>

        {error ? <div className="alert">{error}</div> : null}
        {loading ? <div className="empty">Loading Mikrotik logs...</div> : null}
        {!loading ? <div className="empty">Belum ada log Mikrotik. Bagian ini disiapkan untuk integrasi berikutnya.</div> : null}
      </section>
    );
  }

  const title = mode === "user" ? "User Logs" : "WireGuard Logs";
  const subtitle = mode === "user" ? "Audit trail for user creation and updates" : "Audit trail for create, delete, and update actions";

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>

      <section className="list-toolbar" aria-label={`${title} Search`}>
        <label className="monitor-search">
          <span className="sr-only">Search logs</span>
          <input
            type="search"
            value={logSearch}
            onChange={(event) => setLogSearch(event.target.value)}
            placeholder={mode === "user" ? "Search by maker, target user, or activity..." : "Search by creator, peer name, or IP..."}
          />
        </label>
      </section>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <div className="empty">Loading audit logs...</div> : null}
      {!loading && visibleLogs.length === 0 ? <div className="empty">{items.length === 0 ? `No ${title.toLowerCase()} yet.` : "No log matches the current search."}</div> : null}
      {!loading && visibleLogs.length > 0 ? (
        <div className="log-scroll">
          <div className="log-list">
            {visibleLogs.map((item) => (
              <article className="log-card" key={item.id}>
                <div className="log-card-head">
                  <span className={`log-action log-action-${item.action}`}>{String(item.action || "event").toUpperCase()}</span>
                  <strong>{item.target || "-"}</strong>
                </div>
                <p>{item.message || "-"}</p>
                <div className="log-meta">
                  <span>{mode === "user" ? `By ${item.actorName || item.actor || "-"}` : (item.actorName || item.actor || "-")}</span>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
