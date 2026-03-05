import React from "react";
import { NavIcon } from "./Icons";

export default function SideNav({
  activeView,
  setActiveView,
  isAdministrator,
  sidebarGroupsOpen,
  toggleSidebarGroup,
  showSidebarLabels,
  isMobileViewport,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarExpanded,
  setSidebarExpanded,
}) {
  const renderNavLabel = (label) => (showSidebarLabels ? <span>{label}</span> : null);

  return (
    <>
      {isMobileViewport ? (
        <button
          type="button"
          className={`sidebar-backdrop${mobileSidebarOpen ? " open" : ""}`}
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside className={`sidebar${showSidebarLabels ? " expanded" : " collapsed"}${isMobileViewport ? " mobile-drawer" : ""}${isMobileViewport && mobileSidebarOpen ? " mobile-open" : ""}`}>
        <nav
          className="sidebar-nav"
          aria-label="Primary Navigation"
          onClick={(event) => {
            if (!isMobileViewport) {
              return;
            }
            if (event.target.closest(".nav-subitem")) {
              setMobileSidebarOpen(false);
            }
          }}
        >
          <div className="nav-group">
            <button type="button" className="nav-group-toggle nav-group-static" aria-label="General" title="General">
              {renderNavLabel("General")}
              {showSidebarLabels ? <span className="nav-group-chevron nav-group-chevron-right">›</span> : null}
            </button>
            <div className="nav-group-body">
              <button type="button" className={`nav-subitem${activeView === "dashboard" ? " active" : ""}`} onClick={() => setActiveView("dashboard")} aria-label="Dashboard" title="Dashboard">
                <NavIcon name="dashboard" />
                {renderNavLabel("Dashboard")}
              </button>

              <button type="button" className={`nav-subitem${activeView === "monitoring" ? " active" : ""}`} onClick={() => setActiveView("monitoring")} aria-label="Monitoring" title="Monitoring">
                <NavIcon name="monitoring" />
                {renderNavLabel("Monitoring")}
              </button>
            </div>
          </div>

          <div className="nav-group">
            <button
              type="button"
              className={`nav-group-toggle${sidebarGroupsOpen.wireguard ? " open" : ""}`}
              onClick={() => toggleSidebarGroup("wireguard")}
              aria-expanded={sidebarGroupsOpen.wireguard}
              aria-label="WireGuard"
              title="WireGuard"
            >
              {renderNavLabel("WireGuard")}
              {showSidebarLabels ? <span className={`nav-group-chevron${sidebarGroupsOpen.wireguard ? " open" : ""}`}>⌃</span> : null}
            </button>
            {sidebarGroupsOpen.wireguard ? (
              <div className="nav-group-body">
                <button type="button" className={`nav-subitem${activeView === "createPeer" ? " active" : ""}`} onClick={() => setActiveView("createPeer")} aria-label="Create Peer" title="Create Peer">
                  <NavIcon name="createPeer" />
                  {renderNavLabel("Create Peer")}
                </button>
                {isAdministrator ? (
                  <>
                    <button type="button" className={`nav-subitem${activeView === "removePeer" ? " active" : ""}`} onClick={() => setActiveView("removePeer")} aria-label="Remove Peer" title="Remove Peer">
                      <NavIcon name="removePeer" />
                      {renderNavLabel("Remove Peer")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "updatePeer" ? " active" : ""}`} onClick={() => setActiveView("updatePeer")} aria-label="Update Peer" title="Update Peer">
                      <NavIcon name="updatePeer" />
                      {renderNavLabel("Update Peer")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "inventoryPeer" ? " active" : ""}`} onClick={() => setActiveView("inventoryPeer")} aria-label="Inventory Peer" title="Inventory Peer">
                      <NavIcon name="inventoryPeer" />
                      {renderNavLabel("Inventory Peer")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "checkServerConnection" ? " active" : ""}`} onClick={() => setActiveView("checkServerConnection")} aria-label="Server Connection" title="Server Connection">
                      <NavIcon name="serverConnection" />
                      {renderNavLabel("Server Connection")}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {isAdministrator ? (
            <>
              <div className="nav-group">
                <button type="button" className={`nav-group-toggle${sidebarGroupsOpen.mikrotik ? " open" : ""}`} onClick={() => toggleSidebarGroup("mikrotik")} aria-expanded={sidebarGroupsOpen.mikrotik} aria-label="Mikrotik" title="Mikrotik">
                  {renderNavLabel("Mikrotik")}
                  {showSidebarLabels ? <span className={`nav-group-chevron${sidebarGroupsOpen.mikrotik ? " open" : ""}`}>⌃</span> : null}
                </button>
                {sidebarGroupsOpen.mikrotik ? (
                  <div className="nav-group-body">
                    <button type="button" className={`nav-subitem${activeView === "mikrotikSsh" ? " active" : ""}`} onClick={() => setActiveView("mikrotikSsh")} aria-label="Akses Mikrotik SSH" title="Akses Mikrotik SSH">
                      <NavIcon name="mikrotikSsh" />
                      {renderNavLabel("Akses Mikrotik SSH")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "mikrotikAutomation" ? " active" : ""}`} onClick={() => setActiveView("mikrotikAutomation")} aria-label="Automation Script Update" title="Automation Script Update">
                      <NavIcon name="mikrotikAutomation" />
                      {renderNavLabel("Automation Script Update")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "mikrotikCheckIsp" ? " active" : ""}`} onClick={() => setActiveView("mikrotikCheckIsp")} aria-label="Check ISP" title="Check ISP">
                      <NavIcon name="mikrotikCheckIsp" />
                      {renderNavLabel("Check ISP")}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="nav-group">
                <button type="button" className={`nav-group-toggle${sidebarGroupsOpen.logs ? " open" : ""}`} onClick={() => toggleSidebarGroup("logs")} aria-expanded={sidebarGroupsOpen.logs} aria-label="Logs" title="Logs">
                  {renderNavLabel("Logs")}
                  {showSidebarLabels ? <span className={`nav-group-chevron${sidebarGroupsOpen.logs ? " open" : ""}`}>⌃</span> : null}
                </button>
                {sidebarGroupsOpen.logs ? (
                  <div className="nav-group-body">
                    <button type="button" className={`nav-subitem${activeView === "wireguardLogs" ? " active" : ""}`} onClick={() => setActiveView("wireguardLogs")} aria-label="WireGuard Logs" title="WireGuard Logs">
                      <NavIcon name="wireguardLogs" />
                      {renderNavLabel("WireGuard Logs")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "mikrotikLogs" ? " active" : ""}`} onClick={() => setActiveView("mikrotikLogs")} aria-label="Mikrotik Logs" title="Mikrotik Logs">
                      <NavIcon name="mikrotikLogs" />
                      {renderNavLabel("Mikrotik Logs")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "userLogs" ? " active" : ""}`} onClick={() => setActiveView("userLogs")} aria-label="User Logs" title="User Logs">
                      <NavIcon name="userLogs" />
                      {renderNavLabel("User Logs")}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="nav-group">
                <button type="button" className={`nav-group-toggle${sidebarGroupsOpen.userManagement ? " open" : ""}`} onClick={() => toggleSidebarGroup("userManagement")} aria-expanded={sidebarGroupsOpen.userManagement} aria-label="User Management" title="User Management">
                  {renderNavLabel("User Management")}
                  {showSidebarLabels ? <span className={`nav-group-chevron${sidebarGroupsOpen.userManagement ? " open" : ""}`}>⌃</span> : null}
                </button>
                {sidebarGroupsOpen.userManagement ? (
                  <div className="nav-group-body">
                    <button type="button" className={`nav-subitem${activeView === "userList" ? " active" : ""}`} onClick={() => setActiveView("userList")} aria-label="User List" title="User List">
                      <NavIcon name="userList" />
                      {renderNavLabel("User List")}
                    </button>
                    <button type="button" className={`nav-subitem${activeView === "createUser" ? " active" : ""}`} onClick={() => setActiveView("createUser")} aria-label="Create User" title="Create User">
                      <NavIcon name="createUser" />
                      {renderNavLabel("Create User")}
                    </button>
                    <button
                      type="button"
                      className={`nav-subitem${activeView === "updateUser" ? " active" : ""}`}
                      onClick={() => setActiveView("updateUser")}
                      aria-label="Update User"
                      title="Update User"
                    >
                      <NavIcon name="updateUser" />
                      {renderNavLabel("Update User")}
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-collapse"
            onClick={() => setSidebarExpanded((current) => !current)}
            aria-label={sidebarExpanded ? "Collapse" : "Expand"}
            title={sidebarExpanded ? "Collapse" : "Expand"}
          >
            <span className="sidebar-collapse-icon" aria-hidden="true">{sidebarExpanded ? "‹" : "›"}</span>
            {showSidebarLabels ? <span className="sidebar-collapse-label">Collapse</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
