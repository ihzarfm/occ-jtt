import React, { useMemo, useState } from "react";
import RoutersView from "./RoutersView";
import SshAccessView from "./SshAccessView";
import ScriptUpdateView from "./ScriptUpdateView";
import IspCheckView from "./IspCheckView";

const mikrotikTabs = [
  { id: "routers", label: "Routers" },
  { id: "ssh", label: "SSH Access" },
  { id: "scripts", label: "Script Update" },
  { id: "isp", label: "ISP Check" },
];

export default function MikrotikShell({ active, role = "support", initialTab = "routers" }) {
  const [tab, setTab] = useState(initialTab);
  const [banner, setBanner] = useState("");

  const isAdministrator = useMemo(() => {
    const normalized = String(role || "").toLowerCase();
    return normalized === "administrator" || normalized === "superadmin";
  }, [role]);

  if (!active) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Mikrotik</h2>
        <span>Router inventory and automation tools</span>
      </div>

      <div className="target-server-inline" role="tablist" aria-label="Mikrotik Sections">
        {mikrotikTabs.map((item) => (
          <button key={item.id} type="button" role="tab" className={`target-server-pill${tab === item.id ? " active" : ""}`} aria-selected={tab === item.id} onClick={() => setTab(item.id)}>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {banner ? <div className="empty">{banner}</div> : null}

      {tab === "routers" ? <RoutersView canManage={isAdministrator} /> : null}
      {tab === "ssh" ? <SshAccessView canManage={isAdministrator} onNotify={setBanner} /> : null}
      {tab === "scripts" ? <ScriptUpdateView canManage={isAdministrator} onNotify={setBanner} /> : null}
      {tab === "isp" ? <IspCheckView canManage={isAdministrator} onNotify={setBanner} /> : null}
    </section>
  );
}

