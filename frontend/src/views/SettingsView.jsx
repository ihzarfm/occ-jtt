import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getSettings, testWGConnection, updateSettings } from "../api/settings";

const emptySettings = {
  wg: {
    activeProfile: "staging",
    profiles: {
      staging: {
        servers: {},
      },
    },
  },
};

function cloneSettings(input) {
  return JSON.parse(JSON.stringify(input));
}

export default function SettingsView({ active }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [settings, setSettings] = useState(emptySettings);
  const [connectionResult, setConnectionResult] = useState({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { response, data } = await getSettings();
      if (!response.ok) throw new Error(data.error || "Failed to fetch settings");
      const next = { ...emptySettings, ...data, wg: { ...emptySettings.wg, ...(data?.wg || {}) } };
      if (!next.wg.profiles || Object.keys(next.wg.profiles).length === 0) {
        next.wg.profiles = { staging: { servers: {} } };
      }
      if (!next.wg.activeProfile) {
        next.wg.activeProfile = Object.keys(next.wg.profiles)[0] || "staging";
      }
      setSettings(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    loadSettings();
  }, [active, loadSettings]);

  const activeProfileName = settings.wg.activeProfile || "";
  const profileNames = useMemo(() => Object.keys(settings.wg.profiles || {}), [settings]);
  const activeProfile = settings.wg.profiles?.[activeProfileName] || { servers: {} };

  const updateServerField = (serverID, field, value) => {
    setSettings((current) => {
      const next = cloneSettings(current);
      next.wg.profiles[next.wg.activeProfile].servers[serverID][field] = value;
      return next;
    });
  };

  const updateServerScriptField = (serverID, field, value) => {
    setSettings((current) => {
      const next = cloneSettings(current);
      next.wg.profiles[next.wg.activeProfile].servers[serverID].scripts[field] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setBanner("");
    setError("");
    try {
      const { response, data } = await updateSettings(settings);
      if (!response.ok) throw new Error(data.error || "Failed to save settings");
      setSettings((current) => ({ ...current, wg: data.wg || current.wg }));
      setBanner("Saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (serverID) => {
    setConnectionResult((current) => ({ ...current, [serverID]: { loading: true, ok: false, latencyMs: 0, error: "" } }));
    try {
      const { response, data } = await testWGConnection({ profile: settings.wg.activeProfile, serverId: serverID });
      if (!response.ok) throw new Error(data.error || "Connection test failed");
      setConnectionResult((current) => ({
        ...current,
        [serverID]: {
          loading: false,
          ok: Boolean(data.ok),
          latencyMs: data.latencyMs || 0,
          error: data.error || "",
        },
      }));
    } catch (err) {
      setConnectionResult((current) => ({ ...current, [serverID]: { loading: false, ok: false, latencyMs: 0, error: err.message } }));
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Settings</h2>
        <span>WireGuard server profile management</span>
      </div>

      {error ? <div className="alert">{error}</div> : null}
      {banner ? <div className="empty">{banner}</div> : null}
      {loading ? <div className="empty">Loading settings...</div> : null}

      {!loading ? (
        <form className="settings-form" onSubmit={(event) => event.preventDefault()}>
          <label>
            Active Profile
            <select
              value={settings.wg.activeProfile}
              onChange={(event) => setSettings((current) => ({
                ...current,
                wg: { ...current.wg, activeProfile: event.target.value },
              }))}
            >
              {profileNames.map((profile) => (
                <option key={profile} value={profile}>{profile}</option>
              ))}
            </select>
          </label>

          {Object.entries(activeProfile.servers || {}).map(([serverID, server]) => {
            const result = connectionResult[serverID] || { loading: false, ok: false, latencyMs: 0, error: "" };
            return (
              <section className="form-section" key={serverID}>
                <div className="form-section-head">
                  <strong>{server.displayName || serverID}</strong>
                  <span>{serverID}</span>
                </div>
                <div className="create-peer-form-grid">
                  <label>
                    Enabled
                    <input type="checkbox" checked={Boolean(server.enabled)} onChange={(event) => updateServerField(serverID, "enabled", event.target.checked)} />
                  </label>
                  <label>
                    Display Name
                    <input value={server.displayName || ""} onChange={(event) => updateServerField(serverID, "displayName", event.target.value)} />
                  </label>
                  <label>
                    Overlay CIDR
                    <input value={server.overlayCIDR || ""} onChange={(event) => updateServerField(serverID, "overlayCIDR", event.target.value)} />
                  </label>
                  <label>
                    Endpoint Host
                    <input value={server.endpointHost || ""} onChange={(event) => updateServerField(serverID, "endpointHost", event.target.value)} />
                  </label>
                  <label>
                    Endpoint Port
                    <input type="number" value={server.endpointPort || 22} onChange={(event) => updateServerField(serverID, "endpointPort", Number(event.target.value || 0))} />
                  </label>
                  <label>
                    SSH User
                    <input value={server.sshUser || ""} onChange={(event) => updateServerField(serverID, "sshUser", event.target.value)} />
                  </label>
                  <label className="create-peer-field-wide">
                    SSH Key Path
                    <input value={server.sshKeyPath || ""} onChange={(event) => updateServerField(serverID, "sshKeyPath", event.target.value)} />
                  </label>
                  <label className="create-peer-field-wide">
                    Script: createSitePeer
                    <input value={server.scripts?.createSitePeer || ""} onChange={(event) => updateServerScriptField(serverID, "createSitePeer", event.target.value)} />
                  </label>
                  <label className="create-peer-field-wide">
                    Script: removePeer
                    <input value={server.scripts?.removePeer || ""} onChange={(event) => updateServerScriptField(serverID, "removePeer", event.target.value)} />
                  </label>
                </div>
                <div className="action-row">
                  <button type="button" className="ghost" onClick={() => handleTest(serverID)} disabled={result.loading}>
                    {result.loading ? "Testing..." : "Test connection"}
                  </button>
                  {!result.loading && (result.ok || result.error) ? (
                    <small className="field-helper">{result.ok ? `OK (${result.latencyMs} ms)` : `Error: ${result.error}`}</small>
                  ) : null}
                </div>
              </section>
            );
          })}

          <div className="action-row">
            <button type="button" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
