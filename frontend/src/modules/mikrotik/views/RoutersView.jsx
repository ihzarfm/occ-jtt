import React, { useMemo, useState } from "react";
import RouterList from "../components/RouterList";
import RouterDetailsModal from "../components/RouterDetailsModal";
import { dummyRouters } from "../data/dummyRouters";

export default function RoutersView({ canManage }) {
  const [search, setSearch] = useState("");
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [banner, setBanner] = useState("");

  const visibleRouters = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    if (!query) return dummyRouters;
    return dummyRouters.filter((router) => `${router.name} ${router.location} ${router.model}`.toLowerCase().includes(query));
  }, [search]);

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    setBanner("Coming soon");
  };

  return (
    <>
      <section className="list-toolbar" aria-label="Router Search">
        <label className="monitor-search">
          <span className="sr-only">Search routers</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search router by name, location, model..." />
        </label>
        <button type="button" onClick={() => setShowCreateBox((current) => !current)} disabled={!canManage} title={canManage ? "Coming soon" : "Admin only"}>
          Add Router
        </button>
      </section>

      {banner ? <div className="empty">{banner}</div> : null}
      {visibleRouters.length === 0 ? <div className="empty">No routers found.</div> : <RouterList routers={visibleRouters} onViewDetails={setSelectedRouter} />}

      <RouterDetailsModal router={selectedRouter} onClose={() => setSelectedRouter(null)} />

      {showCreateBox ? (
        <section className="form-section">
          <div className="form-section-head">
            <strong>Add Router</strong>
            <span>Inventory onboarding (placeholder)</span>
          </div>
          <form className="settings-form" onSubmit={handleCreateSubmit}>
            <label>
              Router Name
              <input placeholder="RTR-BALI-01" disabled={!canManage} />
            </label>
            <label>
              Location
              <input placeholder="Bali Branch" disabled={!canManage} />
            </label>
            <div className="action-row">
              <button type="submit" disabled={!canManage} title={canManage ? "Coming soon" : "Admin only"}>Submit</button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}

