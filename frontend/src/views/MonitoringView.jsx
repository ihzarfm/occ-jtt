import React from "react";

export default function MonitoringView({
  monitoring,
  monitoringRefreshMs,
  monitorSearch,
  setMonitorSearch,
  monitorFilter,
  setMonitorFilter,
  monitorSort,
  setMonitorSort,
  expandedGroups,
  toggleGroup,
  extractMetricItems,
  extractMonitoringItems,
  buildMetricGroups,
  buildMetricBars,
  monitoringStatus,
}) {
  const metricItems = extractMetricItems(monitoring.data);
  const items = extractMonitoringItems(monitoring.data);
  const metricGroups = buildMetricGroups(metricItems);
  const endpointCount = metricGroups.reduce((total, group) => total + group.total, 0);

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
            <input
              type="search"
              value={monitorSearch}
              onChange={(event) => setMonitorSearch(event.target.value)}
              placeholder="Search endpoints..."
            />
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

      {!monitoring.loading && !monitoring.error && items.length === 0 && metricItems.length === 0 ? (
        <div className="empty">No monitor entries found in the Gatus response.</div>
      ) : null}

      {!monitoring.loading && metricItems.length > 0 ? (
        <div className="monitor-groups">
          {metricGroups.map((group) => {
            const isExpanded = expandedGroups[group.name] ?? true;

            return (
              <section className="monitor-group" key={group.name}>
                <button type="button" className="monitor-group-head" onClick={() => toggleGroup(group.name)}>
                  <span className={`monitor-chevron${isExpanded ? " expanded" : ""}`}>⌃</span>
                  <strong>{group.name}</strong>
                  {group.downCount === 0 ? (
                    <span className="monitor-group-ok">✓</span>
                  ) : (
                    <span className="monitor-group-bad">{group.downCount}</span>
                  )}
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
                              <p className="monitor-subtitle">
                                {group.name}
                                {" • "}
                                {item.key || "-"}
                              </p>
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
