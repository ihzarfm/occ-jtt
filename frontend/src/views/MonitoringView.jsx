import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getMonitoring } from "../api/monitoring";

const monitoringRefreshMs = 300000;
const allowedMonitoringGroups = ["ISP-OUTLET", "WG-CCTV", "WG-MIKROTIK", "WG-POS-REAL", "WG-POS-PROD"];

function parseMetricValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectMonitoringMetricItems(items) {
  return items.slice(0, 500);
}

function applyMonitoringMetricSample(bucket, item) {
  const numericValue = parseMetricValue(item.value);
  if (item.metric === "result") {
    bucket.total = 1;
    bucket.successCount = numericValue >= 1 ? 1 : 0;
    bucket.failureCount = numericValue >= 1 ? 0 : 1;
    return;
  }
  if (item.success === "false") {
    bucket.failureCount += numericValue;
    return;
  }
  if (item.success === "true" || numericValue > 0) {
    bucket.successCount += numericValue;
  }
}

function buildMetricBars(item) {
  const totalSegments = 36;
  const totalChecks = Math.max(item.successCount + item.failureCount, 1);
  const downSegments = Math.min(totalSegments, Math.round((item.failureCount / totalChecks) * totalSegments));
  const bars = Array.from({ length: totalSegments }, () => "up");
  if (downSegments === 0) return bars;
  const step = totalSegments / downSegments;
  for (let index = 0; index < downSegments; index += 1) {
    const position = Math.min(totalSegments - 1, Math.floor(index * step));
    bars[position] = "down";
  }
  return bars;
}

function extractMonitoringItems(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.monitors)) return payload.monitors;
  return [];
}

function extractMetricItems(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.metrics)) return payload.metrics;
  if (Array.isArray(payload.metricItems)) return payload.metricItems;
  return [];
}

function buildMetricGroups(items, monitorSearch, monitorFilter, monitorSort) {
  const scopedItems = items.filter((item) => allowedMonitoringGroups.includes(item.group));
  const sourceItems = selectMonitoringMetricItems(scopedItems);
  const grouped = new Map();

  for (const item of sourceItems) {
    const groupName = item.group || "UNGROUPED";
    const key = `${item.name || item.key || item.target || "-"}-${item.metric || "metric"}`;
    if (!grouped.has(groupName)) grouped.set(groupName, new Map());
    const groupBucket = grouped.get(groupName);
    if (!groupBucket.has(key)) {
      groupBucket.set(key, {
        key,
        name: item.name || item.key || item.target || "-",
        metric: item.metric || "metric",
        group: groupName,
        successCount: 0,
        failureCount: 0,
        total: 0,
        type: item.type || "counter",
      });
    }
    const bucket = groupBucket.get(key);
    applyMonitoringMetricSample(bucket, item);
    bucket.total += 1;
    bucket.status = bucket.failureCount > 0 ? "down" : "up";
  }

  let groups = Array.from(grouped.entries()).map(([name, value]) => {
    const groupItems = Array.from(value.values());
    const filteredItems = groupItems.filter((item) => {
      const haystack = `${item.name} ${item.key}`.toLowerCase();
      const query = monitorSearch.trim().toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (monitorFilter === "up" && item.status !== "up") return false;
      if (monitorFilter === "down" && item.status !== "down") return false;
      return true;
    });

    const sortedItems = [...filteredItems].sort((left, right) => {
      if (monitorSort === "name") return left.name.localeCompare(right.name);
      return left.group.localeCompare(right.group);
    });

    return {
      name,
      items: sortedItems,
      total: sortedItems.length,
      downCount: sortedItems.filter((item) => item.status === "down").length,
    };
  });

  groups = groups.filter((group) => group.items.length > 0);
  groups.sort((left, right) => left.name.localeCompare(right.name));
  return groups;
}

function monitoringStatus(item) {
  if (typeof item.status === "string") return item.status;
  if (typeof item.health === "string") return item.health;
  if (typeof item.success === "boolean") return item.success ? "up" : "down";
  return "unknown";
}

export default function MonitoringView({ active }) {
  const [monitoring, setMonitoring] = useState({ loading: false, error: "", data: null, lastUpdated: "" });
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorFilter, setMonitorFilter] = useState("none");
  const [monitorSort, setMonitorSort] = useState("group");
  const [expandedGroups, setExpandedGroups] = useState({});

  const loadMonitoring = useCallback(async () => {
    setMonitoring((current) => ({ ...current, loading: true, error: "" }));
    try {
      const { response, data } = await getMonitoring();
      if (!response.ok) throw new Error(data.error || "Failed to fetch monitoring data");
      setMonitoring({ loading: false, error: "", data, lastUpdated: new Date().toLocaleString() });
      setExpandedGroups({});
    } catch (err) {
      setMonitoring((current) => ({ ...current, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    loadMonitoring();
  }, [active, loadMonitoring]);

  useEffect(() => {
    if (!active) return undefined;
    const intervalId = window.setInterval(loadMonitoring, monitoringRefreshMs);
    return () => window.clearInterval(intervalId);
  }, [active, loadMonitoring]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => loadMonitoring();
    window.addEventListener("occ-refresh-current-view", handler);
    return () => window.removeEventListener("occ-refresh-current-view", handler);
  }, [active, loadMonitoring]);

  const metricItems = extractMetricItems(monitoring.data);
  const items = extractMonitoringItems(monitoring.data);
  const metricGroups = useMemo(
    () => buildMetricGroups(metricItems, monitorSearch, monitorFilter, monitorSort),
    [metricItems, monitorSearch, monitorFilter, monitorSort],
  );
  const endpointCount = metricGroups.reduce((total, group) => total + group.total, 0);

  const toggleGroup = (groupName) => {
    setExpandedGroups((current) => ({ ...current, [groupName]: !(current[groupName] ?? true) }));
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Monitoring</h2>
        <span>{monitoring.lastUpdated ? `Last sync: ${monitoring.lastUpdated}` : "Gatus monitoring overview"}</span>
      </div>

      {monitoring.error ? <div className="alert">{monitoring.error}</div> : null}
      {monitoring.loading ? <div className="empty">Loading monitoring data from Gatus...</div> : null}

      {!monitoring.loading && metricItems.length > 0 ? (
        <div className="monitoring-summary">
          <div className="empty">Source: {monitoring.data?.source || "Configured metrics endpoint"}</div>
          <div className="empty">Auto refresh: every {Math.round(monitoringRefreshMs / 1000)} seconds</div>
          <div className="empty">Endpoints loaded: {endpointCount}</div>
        </div>
      ) : null}

      {!monitoring.loading && metricItems.length > 0 ? (
        <section className="monitor-toolbar" aria-label="Monitoring Controls">
          <label className="monitor-search">
            <span className="sr-only">Search endpoints</span>
            <input type="search" value={monitorSearch} onChange={(event) => setMonitorSearch(event.target.value)} placeholder="Search endpoints..." />
          </label>

          <label className="monitor-select">
            <span>Filter by:</span>
            <select value={monitorFilter} onChange={(event) => setMonitorFilter(event.target.value)}>
              <option value="none">None</option>
              <option value="up">Healthy</option>
              <option value="down">Problem</option>
            </select>
          </label>

          <label className="monitor-select">
            <span>Sort by:</span>
            <select value={monitorSort} onChange={(event) => setMonitorSort(event.target.value)}>
              <option value="group">Group</option>
              <option value="name">Name</option>
            </select>
          </label>
        </section>
      ) : null}

      {!monitoring.loading && !monitoring.error && items.length === 0 && metricItems.length === 0 ? <div className="empty">No monitor entries found in the Gatus response.</div> : null}

      {!monitoring.loading && metricItems.length > 0 ? (
        <div className="monitor-groups">
          {metricGroups.map((group) => {
            const isExpanded = expandedGroups[group.name] ?? true;
            return (
              <section className="monitor-group" key={group.name}>
                <button type="button" className="monitor-group-head" onClick={() => toggleGroup(group.name)}>
                  <span className={`monitor-chevron${isExpanded ? " expanded" : ""}`}>⌃</span>
                  <strong>{group.name}</strong>
                  {group.downCount === 0 ? <span className="monitor-group-ok">✓</span> : <span className="monitor-group-bad">{group.downCount}</span>}
                </button>

                {isExpanded ? (
                  <div className="monitor-group-body">
                    {group.items.map((item, index) => {
                      const status = item.status;
                      const itemName = item.name || item.key || `${item.metric} ${index + 1}`;
                      const bars = buildMetricBars(item);
                      const statusLabel = status === "down" ? "Problem" : status === "up" ? "Healthy" : "Unknown";
                      return (
                        <article className="monitor-card" key={`${group.name}-${itemName}-${index}`}>
                          <div className="monitor-card-head">
                            <div>
                              <h3>{itemName}</h3>
                              <p className="monitor-subtitle">{group.name} {" • "} {item.key || "-"}</p>
                            </div>
                            <span className={`status-pill status-${status}`}>{statusLabel}</span>
                          </div>
                          <div className="monitor-bars" aria-hidden="true">
                            {bars.map((bar, barIndex) => (
                              <span className={`monitor-bar monitor-bar-${bar}`} key={`${item.key || itemName}-${barIndex}`} />
                            ))}
                          </div>
                          <div className="monitor-meta">
                            <span>Success: {item.successCount}</span>
                            <span>Failed: {item.failureCount}</span>
                            <span>Type: {item.type || "-"}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {!monitoring.loading && items.length > 0 ? (
        <div className="monitoring-list">
          {items.map((item, index) => {
            const status = String(monitoringStatus(item)).toLowerCase();
            const name = item.name || item.group || item.key || item.url || `Monitor ${index + 1}`;
            const target = item.url || item.hostname || item.host || item.description || "-";
            const latency = item.responseTime || item.response_time || item.duration || item.latency || "-";
            const checkedAt = item.lastCheck || item.last_checked || item.lastResponseTime || item.timestamp || "-";
            return (
              <article className="monitor-card" key={`${name}-${index}`}>
                <div className="monitor-card-head">
                  <h3>{name}</h3>
                  <span className={`status-pill status-${status}`}>{status}</span>
                </div>
                <p className="monitor-target">{target}</p>
                <div className="monitor-meta">
                  <span>Latency: {latency}</span>
                  <span>Checked: {checkedAt}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
