import { useEffect, useState } from "react";

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M7 8h10M7 12h6M7 16h8" />
      </>
    ),
    monitoring: (
      <>
        <path d="M4 17h16" />
        <path d="M6 15l3-4 3 2 4-6 2 3" />
        <circle cx="16" cy="7" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
    createPeer: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
    removePeer: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M15 11h6" />
      </>
    ),
    updatePeer: (
      <>
        <circle cx="8.5" cy="8.5" r="3" />
        <path d="M3.5 18c1.2-2.4 3.2-3.8 5-3.8" />
        <path d="M15 7l3 3" />
        <path d="M13.5 14.5l5-5" />
        <path d="M12.5 17.5l2.5-.5-.5-2.5-2 3z" />
      </>
    ),
    inventoryPeer: (
      <>
        <circle cx="8" cy="8" r="2.5" />
        <circle cx="16" cy="8" r="2.5" />
        <path d="M3.5 18c1-2.4 2.8-3.8 4.5-3.8S11.5 15.6 12.5 18" />
        <path d="M11.5 18c1-2.4 2.8-3.8 4.5-3.8S19.5 15.6 20.5 18" />
      </>
    ),
    serverConnection: (
      <>
        <rect x="4" y="4" width="16" height="6" rx="2" />
        <rect x="4" y="14" width="16" height="6" rx="2" />
        <path d="M8 7h.01M8 17h.01" />
      </>
    ),
    mikrotikSsh: (
      <>
        <path d="M6 8l4 4-4 4" />
        <path d="M11 16h7" />
      </>
    ),
    mikrotikAutomation: (
      <>
        <rect x="5" y="4" width="12" height="16" rx="2" />
        <path d="M9 9h4M9 13h4" />
        <path d="M18 15l2 2" />
        <path d="M18 11v4h-4" />
      </>
    ),
    mikrotikCheckIsp: (
      <>
        <path d="M5 12a10 10 0 0 1 14 0" />
        <path d="M8 15a6 6 0 0 1 8 0" />
        <path d="M11 18a2 2 0 0 1 2 0" />
      </>
    ),
    wireguardLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    mikrotikLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    userLogs: (
      <>
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 12h5M10 16h5" />
      </>
    ),
    userList: (
      <>
        <circle cx="8" cy="8" r="2.5" />
        <path d="M3.5 18c1-2.4 2.8-3.8 4.5-3.8S11.5 15.6 12.5 18" />
        <path d="M14 8h6M14 12h6M14 16h4" />
      </>
    ),
    createUser: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M18 8v6M15 11h6" />
      </>
    ),
    updateUser: (
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M4 18c1.2-2.5 3.3-4 5-4s3.8 1.5 5 4" />
        <path d="M15 8l3 3" />
        <path d="M13.5 14.5l5-5" />
      </>
    ),
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] || icons.dashboard}
      </svg>
    </span>
  );
}

function ThemeGlyph({ mode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 4.5a7.5 7.5 0 1 0 4.5 12.8A8.5 8.5 0 0 1 15 4.5z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M7.8 16.2A7 7 0 0 0 19 11a7 7 0 0 0-.2-1.7" />
      <path d="M16.2 7.8A7 7 0 0 0 5 13c0 .6.1 1.1.2 1.7" />
    </svg>
  );
}

function ChevronDownGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

const emptyPeer = {
  name: "",
  publicKey: "",
  presharedKey: "",
  allowedIPs: "0.0.0.0/0",
  endpoint: "",
  keepalive: 25,
  assignedIP: "",
};

const emptyNetwork = {
  interfaceName: "wg0",
  serverAddress: "10.8.0.1/24",
  listenPort: 51820,
  serverPublicKey: "",
  dns: "1.1.1.1",
};

const initialLogin = {
  username: "",
  password: "",
};

const emptyUserForm = {
  name: "",
  nik: "",
  password: "",
  role: "support",
};

const emptyCreatePeerFeedback = {
  type: "",
  title: "",
  message: "",
  peer: null,
  scope: "",
};

const adminTargetOptions = [
  { id: "wg-its", label: "WG-ITS", pool: "10.22.0.x" },
  { id: "wg-cctv", label: "WG-CCTV", pool: "10.21.0.x" },
  { id: "both", label: "BOTH", pool: "WG-ITS + WG-CCTV" },
];

const adminPurposeOptions = [
  { id: "server", label: "Server" },
  { id: "user-admin", label: "User / Admin" },
  { id: "mikrotik", label: "Mikrotik" },
];

const monitoringRefreshMs = 300_000;
const allowedMonitoringGroups = [
  "ISP-OUTLET",
  "WG-CCTV",
  "WG-MIKROTIK",
  "WG-POS-REAL",
  "WG-POS-PROD",
];

const viewLabels = {
  dashboard: "Dashboard",
  monitoring: "Monitoring",
  createPeer: "Create Peer",
  removePeer: "Remove Peer",
  updatePeer: "Update Peer",
  inventoryPeer: "Inventory Peer",
  checkServerConnection: "Server Connection",
  wireguardLogs: "WireGuard Logs",
  mikrotikLogs: "Mikrotik Logs",
  userLogs: "User Logs",
  mikrotikSsh: "Akses Mikrotik SSH",
  mikrotikAutomation: "Automation Script Update",
  mikrotikCheckIsp: "Check ISP",
  userList: "User List",
  createUser: "Create User",
  updateUser: "Update User",
};

export default function App() {
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("admin");
  const [loggedInName, setLoggedInName] = useState("Administrator");
  const [loggedInRole, setLoggedInRole] = useState("administrator");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("occ-theme") || "light");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [createPeerType, setCreatePeerType] = useState("outlet");
  const [outletBrand, setOutletBrand] = useState("");
  const [outletLocation, setOutletLocation] = useState("");
  const [adminTargetMode, setAdminTargetMode] = useState("");
  const [adminPurpose, setAdminPurpose] = useState("user-admin");
  const [adminAssignedItsIP, setAdminAssignedItsIP] = useState("");
  const [adminAssignedCctvIP, setAdminAssignedCctvIP] = useState("");
  const [sidebarGroupsOpen, setSidebarGroupsOpen] = useState({
    wireguard: true,
    logs: true,
    mikrotik: true,
    userManagement: true,
  });

  const [state, setState] = useState({ network: emptyNetwork, peers: [] });
  const [dashboardHealth, setDashboardHealth] = useState({
    loading: false,
    error: "",
    items: [],
    lastUpdated: "",
  });
  const [peerForm, setPeerForm] = useState(emptyPeer);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removeError, setRemoveError] = useState("");
  const [createPeerFeedback, setCreatePeerFeedback] = useState(emptyCreatePeerFeedback);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState({
    wireguard: { loading: false, items: [], error: "" },
    mikrotik: { loading: false, items: [], error: "" },
    user: { loading: false, items: [], error: "" },
  });
  const [removeSearch, setRemoveSearch] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editUserForm, setEditUserForm] = useState(emptyUserForm);
  const [editingUsername, setEditingUsername] = useState("");
  const [monitoring, setMonitoring] = useState({
    loading: false,
    error: "",
    data: null,
    lastUpdated: "",
  });
  const [wgServerDiagnostics, setWGServerDiagnostics] = useState({
    loading: false,
    error: "",
    items: [],
    lastUpdated: "",
  });
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorFilter, setMonitorFilter] = useState("none");
  const [monitorSort, setMonitorSort] = useState("group");
  const [expandedGroups, setExpandedGroups] = useState({});
  const isAdministrator = loggedInRole === "administrator";

  useEffect(() => {
    localStorage.setItem("occ-theme", theme);
  }, [theme]);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated && activeView === "monitoring" && !monitoring.data && !monitoring.loading) {
      loadMonitoring();
    }
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "dashboard") {
      return;
    }

    loadDashboardHealth();
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "monitoring") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadMonitoring();
    }, monitoringRefreshMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "dashboard") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadDashboardHealth();
    }, monitoringRefreshMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !isAdministrator || activeView !== "checkServerConnection") {
      return;
    }
    if (!wgServerDiagnostics.loading && wgServerDiagnostics.items.length === 0 && !wgServerDiagnostics.error) {
      loadWGServerDiagnostics();
    }
  }, [activeView, isAuthenticated, isAdministrator]);

  useEffect(() => {
    if (!isAuthenticated || !isAdministrator) {
      return;
    }
    if (activeView === "wireguardLogs") {
      loadLogs("wireguard");
    }
    if (activeView === "mikrotikLogs") {
      loadLogs("mikrotik");
    }
    if (activeView === "userLogs") {
      loadLogs("user");
    }
  }, [activeView, isAuthenticated, isAdministrator]);

  useEffect(() => {
    if (!isAuthenticated || !isAdministrator) {
      return;
    }
    if (activeView === "userList" || activeView === "createUser" || activeView === "updateUser") {
      loadUsers();
    }
  }, [activeView, isAuthenticated, isAdministrator]);

  useEffect(() => {
    if (isAdministrator) {
      return;
    }
    if (!isViewAllowed(activeView, false)) {
      setActiveView("createPeer");
    }
  }, [activeView, isAdministrator]);

  useEffect(() => {
    if (createPeerType !== "administrator") {
      return;
    }

    const itsAvailable = availableIPsFor("10.22.0.");
    const cctvAvailable = availableIPsFor("10.21.0.");

    if (adminTargetMode === "wg-its" && !itsAvailable.includes(peerForm.assignedIP)) {
      setPeerForm((current) => ({ ...current, assignedIP: itsAvailable[0] || "" }));
    }

    if (adminTargetMode === "wg-cctv" && !cctvAvailable.includes(peerForm.assignedIP)) {
      setPeerForm((current) => ({ ...current, assignedIP: cctvAvailable[0] || "" }));
    }

    if (adminTargetMode === "both") {
      if (!itsAvailable.includes(adminAssignedItsIP)) {
        setAdminAssignedItsIP(itsAvailable[0] || "");
      }
      if (!cctvAvailable.includes(adminAssignedCctvIP)) {
        setAdminAssignedCctvIP(cctvAvailable[0] || "");
      }
    }
  }, [createPeerType, adminTargetMode, state.peers]);

  useEffect(() => {
    setCreatePeerFeedback(emptyCreatePeerFeedback);
    setError("");
    if (createPeerType === "outlet") {
      setAdminTargetMode("");
      setPeerForm((current) => ({ ...current, name: "", assignedIP: "", allowedIPs: "0.0.0.0/0" }));
    }
    if (createPeerType === "administrator") {
      setOutletBrand("");
      setOutletLocation("");
      setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    }
  }, [createPeerType]);

  async function restoreSession() {
    setAuthChecking(true);

    try {
      const response = await fetch("/api/session", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const data = await response.json();
      setLoggedInUser(data.user || "admin");
      setLoggedInName(data.name || data.user || "Administrator");
      setLoggedInRole(data.role || "administrator");
      setIsAuthenticated(true);
      await loadState();
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      const nextUser = data.user || loginForm.username;
      setLoggedInUser(nextUser);
      setLoggedInName(data.name || nextUser);
      setLoggedInRole(data.role || "administrator");
      setIsAuthenticated(true);
      await loadState();
    } catch (err) {
      setLoginError(err.message);
      setIsAuthenticated(false);
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadState() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/state", {
        method: "GET",
        credentials: "same-origin",
      });
      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch state");
      }

      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardHealth() {
    setDashboardHealth((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await fetch("/api/dashboard/health", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch dashboard health");
      }

      setDashboardHealth({
        loading: false,
        error: "",
        items: Array.isArray(data.items) ? data.items : [],
        lastUpdated: data.checkedAt || new Date().toLocaleString(),
      });
    } catch (err) {
      setDashboardHealth((current) => ({
        ...current,
        loading: false,
        error: err.message,
      }));
    }
  }

  async function createPeer(event) {
    event.preventDefault();
    const isOutletPeer = createPeerType === "outlet";
    const peerName = peerForm.name.trim();
    const outletSiteName = generatedOutletSiteName();

    setError("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);

    if (isOutletPeer && !outletSiteName) {
      setCreatePeerFeedback({
        type: "error",
        title: "Site Name Required",
        message: "Fill in Brand / Outlet Type and Location before creating an outlet peer.",
        peer: null,
      });
      return;
    }

    if (!isOutletPeer && !adminTargetMode) {
      setCreatePeerFeedback({
        type: "error",
        title: "Target Server Required",
        message: "Select WG-ITS, WG-CCTV, or BOTH before creating an administrator peer.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isOutletPeer && !peerName) {
      setCreatePeerFeedback({
        type: "error",
        title: "Name Required",
        message: "Name must use uppercase A-Z, numbers, and dashes only.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isOutletPeer && adminTargetMode !== "both" && !peerForm.assignedIP) {
      setCreatePeerFeedback({
        type: "error",
        title: "Assigned IP Required",
        message: "Select one available IP before creating administrator peer.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isOutletPeer && adminTargetMode === "both" && (!adminAssignedItsIP || !adminAssignedCctvIP)) {
      setCreatePeerFeedback({
        type: "error",
        title: "Assigned IP Required",
        message: "Select available IPs for both WG-ITS and WG-CCTV.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isValidIPv4CIDR(peerForm.allowedIPs)) {
      setCreatePeerFeedback({
        type: "error",
        title: "Invalid Allowed IPs",
        message: "Allowed IPs must be valid IPv4/CIDR format, using only numbers, dots, and slash.",
        peer: null,
        scope: createPeerType,
      });
      return;
    }

    setSaving(true);

    try {
      if (!isOutletPeer && adminTargetMode === "both") {
        const createdPeers = [];
        let latestState = null;
        const autoPublicKey = generatePseudoPublicKey();
        const requests = [
          { server: "wg-its", assignedIP: adminAssignedItsIP },
          { server: "wg-cctv", assignedIP: adminAssignedCctvIP },
        ];

        for (const request of requests) {
          const response = await fetch("/api/peers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              peerType: createPeerType,
              ...peerForm,
              name: `Administrator-${peerName}-${request.server.toUpperCase()}`,
              publicKey: autoPublicKey,
              assignedIP: request.assignedIP,
              keepalive: Number(peerForm.keepalive),
              purpose: adminPurpose,
              targetServer: request.server,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to create peer");
          }
          latestState = data.state;
          if (data.peer) {
            createdPeers.push({
              ...data.peer,
              _targetServer: request.server,
            });
          }
        }

        if (latestState) {
          setState(latestState);
        }

        setPeerForm(emptyPeer);
        setCreatePeerFeedback({
          type: "success",
          title: "Administrator Peer Created",
          message: "Administrator profile has been provisioned on selected servers.",
          peer: {
            id: createdPeers[0]?.id || "",
            _scope: "administrator",
            _targetMode: "both",
            _createdPeers: createdPeers,
            assignedIP: `${adminAssignedItsIP}, ${adminAssignedCctvIP}`,
          },
          scope: "administrator",
        });
      } else {
        const response = await fetch("/api/peers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            peerType: createPeerType,
            ...peerForm,
            name: isOutletPeer ? outletSiteName : `Administrator-${peerName}`,
            publicKey: isOutletPeer ? peerForm.publicKey : (peerForm.publicKey || generatePseudoPublicKey()),
            keepalive: Number(peerForm.keepalive),
            purpose: adminPurpose,
            targetServer: adminTargetMode,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create peer");
        }

        setState(data.state);
        setPeerForm(emptyPeer);
        setOutletBrand("");
        setOutletLocation("");
        setCreatePeerFeedback({
          type: "success",
          title: isOutletPeer ? "Peer Created" : "Administrator Peer Created",
          message: isOutletPeer
            ? "Outlet peer has been provisioned on WireGuard servers."
            : "Administrator profile has been provisioned on selected server.",
          peer: data.peer
            ? {
                ...data.peer,
                _scope: isOutletPeer ? "outlet" : "administrator",
                _targetServer: adminTargetMode,
                _purpose: adminPurpose,
              }
            : null,
          scope: isOutletPeer ? "outlet" : "administrator",
        });
      }

      setActiveView("createPeer");
    } catch (err) {
      setCreatePeerFeedback({
        type: "error",
        title: "Create Failed",
        message: err.message,
        peer: null,
        scope: createPeerType,
      });
      setError("");
    } finally {
      setSaving(false);
    }
  }

  async function deletePeer(id) {
    setSaving(true);
    setRemoveError("");

    try {
      const response = await fetch(`/api/peers/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete peer");
      }

      setState(data);
      setRemoveError("");
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadMonitoring() {
    setMonitoring((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await fetch("/api/monitoring", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch monitoring data");
      }

      setMonitoring({
        loading: false,
        error: "",
        data,
        lastUpdated: new Date().toLocaleString(),
      });
      setExpandedGroups({});
    } catch (err) {
      setMonitoring((current) => ({
        ...current,
        loading: false,
        error: err.message,
      }));
    }
  }

  async function loadWGServerDiagnostics() {
    setWGServerDiagnostics((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await fetch("/api/wg-servers/diagnostics", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch WireGuard server diagnostics");
      }

      setWGServerDiagnostics({
        loading: false,
        error: "",
        items: data.items || [],
        lastUpdated: data.checkedAt || new Date().toLocaleString(),
      });
    } catch (err) {
      setWGServerDiagnostics((current) => ({
        ...current,
        loading: false,
        error: err.message,
      }));
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data);
      if (data.length > 0 && !editingUsername) {
        selectUserForEdit(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadLogs(category) {
    setAuditLogs((current) => ({
      ...current,
      [category]: {
        ...current[category],
        loading: true,
        error: "",
      },
    }));

    try {
      const response = await fetch(`/api/logs?category=${category}`, {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json();

      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }
      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch logs");
      }

      setAuditLogs((current) => ({
        ...current,
        [category]: {
          loading: false,
          error: "",
          items: Array.isArray(data) ? data : [],
        },
      }));
    } catch (err) {
      setAuditLogs((current) => ({
        ...current,
        [category]: {
          ...current[category],
          loading: false,
          error: err.message,
        },
      }));
    }
  }

  async function createUserAccount(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(userForm),
      });
      const data = await response.json();

      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUserForm(emptyUserForm);
      await loadUsers();
      setActiveView("userList");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateUserAccount(event) {
    event.preventDefault();
    if (!editingUsername) {
      setError("Select a user first.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/users/${editingUsername}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(editUserForm),
      });
      const data = await response.json();

      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      await loadUsers();
      selectUserForEdit(data);
      setActiveView("userList");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateLoginField(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  }

  function updatePeerField(event) {
    const { name, value } = event.target;
    setPeerForm((current) => ({ ...current, [name]: value }));
  }

  function normalizeOutletSegment(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function normalizeAdminName(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/\s+/g, "-")
      .replace(/[^A-Z0-9-]/g, "")
      .replace(/-+/g, "-");
  }

  function sanitizeAllowedIPs(value) {
    return String(value || "")
      .replace(/\s+/g, "")
      .replace(/[^0-9./]/g, "");
  }

  function isValidIPv4CIDR(value) {
    const current = String(value || "").trim();
    if (!current) {
      return true;
    }

    const matcher = /^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/;
    const match = current.match(matcher);
    if (!match) {
      return false;
    }

    const octets = match[1].split(".").map((octet) => Number(octet));
    if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
      return false;
    }

    if (match[2] !== undefined) {
      const cidr = Number(match[2]);
      if (Number.isNaN(cidr) || cidr < 0 || cidr > 32) {
        return false;
      }
    }

    return true;
  }

  function usedIPs() {
    const used = new Set();
    for (const peer of state.peers || []) {
      if (peer.assignedIP) {
        used.add(String(peer.assignedIP).split("/")[0]);
      }
      if (Array.isArray(peer.assignments)) {
        for (const assignment of peer.assignments) {
          if (assignment.assignedIP) {
            used.add(String(assignment.assignedIP).split("/")[0]);
          }
        }
      }
    }
    return used;
  }

  function availableIPsFor(prefix) {
    const used = usedIPs();
    const available = [];
    for (let last = 10; last <= 120; last += 1) {
      const ip = `${prefix}${last}`;
      if (!used.has(ip)) {
        available.push(ip);
      }
      if (available.length >= 40) {
        break;
      }
    }
    return available;
  }

  function generatePseudoPublicKey() {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    let binary = "";
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return window.btoa(binary);
  }

  function generatedOutletSiteName() {
    const brand = normalizeOutletSegment(outletBrand);
    const location = normalizeOutletSegment(outletLocation);

    if (!brand && !location) {
      return "";
    }

    if (!brand) {
      return location;
    }

    if (!location) {
      return brand;
    }

    return `${brand}-${location}`;
  }

  function resetPeerForm() {
    setPeerForm(emptyPeer);
    if (createPeerType === "administrator") {
      setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    }
    setOutletBrand("");
    setOutletLocation("");
    setAdminTargetMode("");
    setAdminPurpose("user-admin");
    setAdminAssignedItsIP("");
    setAdminAssignedCctvIP("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);
    setError("");
  }

  function updateUserField(event) {
    const { name, value } = event.target;
    setUserForm((current) => ({ ...current, [name]: value }));
  }

  function updateEditUserField(event) {
    const { name, value } = event.target;
    setEditUserForm((current) => ({ ...current, [name]: value }));
  }

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Ignore logout transport failures and clear local UI state anyway.
    } finally {
      setIsAuthenticated(false);
      setLoggedInUser("admin");
      setLoggedInName("Administrator");
      setLoggedInRole("administrator");
      setLoginForm(initialLogin);
      setLoginError("");
      setError("");
      setUsers([]);
      setUserForm(emptyUserForm);
      setEditUserForm(emptyUserForm);
      setEditingUsername("");
      setActiveView("dashboard");
      setUserMenuOpen(false);
    }
  }

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  function toggleSidebarGroup(groupName) {
    setSidebarGroupsOpen((current) => ({
      ...current,
      [groupName]: !current[groupName],
    }));
  }

  function renderNavLabel(label) {
    return sidebarExpanded ? <span className="nav-label">{label}</span> : null;
  }

  function isViewAllowed(view, admin = isAdministrator) {
    if (admin) {
      return true;
    }

    return view === "dashboard" || view === "monitoring" || view === "createPeer";
  }

  function roleLabel(role) {
    return role === "administrator" ? "Administrator" : "Support";
  }

  function peerManagementStatus(peer) {
    if (peer?.type === "outlet" || Array.isArray(peer?.assignments)) {
      return "managed";
    }

    const name = String(peer?.name || "");
    if (name.startsWith("Administrator -")) {
      return "managed";
    }
    return "unmanaged";
  }

  function assignmentFor(peer, interfaceName) {
    if (!Array.isArray(peer?.assignments)) {
      return null;
    }
    return peer.assignments.find((assignment) => assignment.interfaceName === interfaceName) || null;
  }

  function selectUserForEdit(user) {
    if (!user) {
      setEditingUsername("");
      setEditUserForm(emptyUserForm);
      return;
    }

    setEditingUsername(user.username || "");
    setEditUserForm({
      name: user.name || "",
      nik: user.nik || "",
      password: "",
      role: user.role || "support",
    });
  }

  function peerCreatorLabel(peer) {
    return peer.createdByName || peer.createdBy || "Unknown";
  }

  function peerCreatedAtLabel(peer) {
    return peer.createdAt ? new Date(peer.createdAt).toLocaleString() : "-";
  }

  function peerMatchesSearch(peer, searchValue) {
    const term = searchValue.trim().toLowerCase();
    if (!term) {
      return true;
    }

    const fields = [
      peer.name,
      peer.siteName,
      peer.createdBy,
      peer.createdByName,
      peer.assignedIP,
      ...(Array.isArray(peer.assignments)
        ? peer.assignments.flatMap((assignment) => [
            assignment.assignedIP,
            assignment.serverName,
            assignment.interfaceName,
          ])
        : []),
    ];

    return fields.some((value) => String(value || "").toLowerCase().includes(term));
  }

  function logMatchesSearch(item, searchValue) {
    const term = searchValue.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [item.actor, item.actorName, item.target, item.message].some((value) =>
      String(value || "").toLowerCase().includes(term),
    );
  }

  function userMatchesSearch(user, searchValue) {
    const term = searchValue.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [user.name, user.nik, user.username].some((value) =>
      String(value || "").toLowerCase().includes(term),
    );
  }

  function extractMonitoringItems(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === "object") {
      if (Array.isArray(payload.results)) {
        return payload.results;
      }
      if (Array.isArray(payload.endpoints)) {
        return payload.endpoints;
      }
      if (Array.isArray(payload.data)) {
        return payload.data;
      }
    }

    return [];
  }

  function extractMetricItems(payload) {
    if (payload && payload.mode === "metrics" && Array.isArray(payload.metrics)) {
      return payload.metrics;
    }

    return [];
  }

  function parseMetricValue(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toggleGroup(groupName) {
    setExpandedGroups((current) => ({
      ...current,
      [groupName]: !(current[groupName] ?? true),
    }));
  }

  function buildMetricGroups(items) {
    const scopedItems = items.filter((item) => allowedMonitoringGroups.includes(item.group));
    const sourceItems = selectMonitoringMetricItems(scopedItems);
    const endpointMap = new Map();

    for (const item of sourceItems) {
      const groupName = item.group || "UNGROUPED";
      const endpointKey = item.key || `${groupName}-${item.name || item.metric}`;
      const mapKey = `${groupName}::${endpointKey}`;

      if (!endpointMap.has(mapKey)) {
        endpointMap.set(mapKey, {
          group: groupName,
          key: endpointKey,
          name: item.name || endpointKey,
          type: item.type || "-",
          metric: item.metric || "-",
          successCount: 0,
          failureCount: 0,
          rawValue: item.value || "-",
        });
      }

      const current = endpointMap.get(mapKey);
      applyMonitoringMetricSample(current, item);

      current.rawValue = item.value || current.rawValue;
    }

    const endpoints = Array.from(endpointMap.values()).map((item) => ({
      ...item,
      status: item.failureCount > 0 ? "down" : item.successCount > 0 ? "up" : "unknown",
    }));

    const query = monitorSearch.trim().toLowerCase();
    const filtered = endpoints.filter((item) => {
      const status = item.status;
      if (monitorFilter !== "none" && status !== monitorFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        item.group,
        item.name,
        item.key,
        item.type,
        item.metric,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const buckets = new Map();
    for (const item of filtered) {
      const groupName = item.group || "UNGROUPED";
      if (!buckets.has(groupName)) {
        buckets.set(groupName, []);
      }
      buckets.get(groupName).push(item);
    }

    const groups = Array.from(buckets.entries()).map(([groupName, groupItems]) => {
      const sortedItems = [...groupItems].sort((left, right) => {
        if (monitorSort === "name") {
          return String(left.name || left.key || left.metric).localeCompare(String(right.name || right.key || right.metric));
        }
        return String(left.metric || "").localeCompare(String(right.metric || ""));
      });

      const downCount = sortedItems.filter((item) => item.status === "down").length;

      return {
        name: groupName,
        items: sortedItems,
        total: sortedItems.length,
        downCount,
      };
    });

    groups.sort((left, right) => {
      if (monitorSort === "name") {
        const leftName = left.items[0]?.name || left.name;
        const rightName = right.items[0]?.name || right.name;
        return String(leftName).localeCompare(String(rightName));
      }
      return left.name.localeCompare(right.name);
    });

    return groups;
  }

  function selectMonitoringMetricItems(items) {
    const endpointStatusItems = items.filter((item) => item.metric === "gatus_results_endpoint_success");
    if (endpointStatusItems.length > 0) {
      return endpointStatusItems;
    }

    const cumulativeItems = items.filter((item) => item.metric === "gatus_results_total");
    if (cumulativeItems.length > 0) {
      return cumulativeItems;
    }

    return items;
  }

  function applyMonitoringMetricSample(bucket, item) {
    const numericValue = parseMetricValue(item.value) ?? 0;
    if (item.metric === "gatus_results_endpoint_success") {
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

    if (downSegments === 0) {
      return bars;
    }

    const step = totalSegments / downSegments;
    for (let index = 0; index < downSegments; index += 1) {
      const position = Math.min(totalSegments - 1, Math.floor(index * step));
      bars[position] = "down";
    }

    return bars;
  }

  function buildDashboardSparkline(seed, total = 12) {
    const source = String(seed || "occ");
    const values = [];

    for (let index = 0; index < total; index += 1) {
      const code = source.charCodeAt(index % source.length);
      values.push(18 + ((code + index * 11) % 42));
    }

    return values;
  }

  function createFlowSteps(mode) {
    const siteLabel = mode === "outlet"
      ? (generatedOutletSiteName() || "BRAND-LOCATION")
      : (peerForm.name.trim() || "Administrator Peer");
    const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
    if (mode === "administrator") {
      return [
        { label: "Target", value: selectedTargetServer?.label || "Select server", meta: selectedTargetServer?.pool || "Required first" },
        { label: "Identity", value: siteLabel || "Administrator Peer", meta: "Manual input" },
        { label: "Assigned IP", value: peerForm.assignedIP.trim() || selectedTargetServer?.pool || "10.x.x.x", meta: adminTargetMode === "both" ? "Dual profile" : "Single profile" },
        { label: "Output", value: "CONF", meta: "Downloadable" },
      ];
    }

    return [
      { label: "Site", value: siteLabel, meta: "Outlet" },
      { label: "WG-ITS", value: "10.22.x.x", meta: "Auto assign" },
      { label: "WG-CCTV", value: "10.21.x.x", meta: "Auto assign" },
      { label: "Output", value: "CONF + RSC", meta: "Artifacts" },
    ];
  }

  function downloadLinkForPeer(peer) {
    if (!peer?.id) {
      return "";
    }

    const configArtifact = Array.isArray(peer.artifacts)
      ? peer.artifacts.find((artifact) => artifact.kind === "conf")
      : null;

    if (configArtifact?.id) {
      return `/api/peers/${peer.id}/artifacts/${configArtifact.id}`;
    }

    return `/api/peers/${peer.id}/config`;
  }

  function administratorDownloadLinks(peer) {
    if (!peer) {
      return [];
    }

    if (Array.isArray(peer._createdPeers) && peer._createdPeers.length > 0) {
      return peer._createdPeers.map((item) => {
        const target = adminTargetOptions.find((option) => option.id === item._targetServer)?.label || "Config";
        return {
          id: item.id,
          label: `Download ${target}`,
          href: downloadLinkForPeer(item),
        };
      });
    }

    if (peer.id) {
      const target = adminTargetOptions.find((option) => option.id === peer._targetServer)?.label || "Config";
      return [{ id: peer.id, label: `Download ${target}`, href: downloadLinkForPeer(peer) }];
    }

    return [];
  }

  function outletConfigLinks(peer) {
    if (!peer?.id || !Array.isArray(peer.artifacts)) {
      return [];
    }

    return peer.artifacts
      .filter((artifact) => artifact.kind === "conf")
      .map((artifact) => {
        const serverName = String(artifact.serverName || artifact.serverId || "");
        const label = serverName.toLowerCase().includes("cctv")
          ? "WG-CCTV"
          : serverName.toLowerCase().includes("its")
            ? "WG-ITS"
            : serverName || "Config";

        return {
          id: artifact.id,
          label,
          href: `/api/peers/${peer.id}/artifacts/${artifact.id}`,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  function outletAssignmentSummary(peer) {
    if (!Array.isArray(peer?.assignments)) {
      return [];
    }

    return [...peer.assignments]
      .map((assignment) => {
        const serverLabel = String(assignment.interfaceName || assignment.serverName || assignment.serverId || "");
        const label = serverLabel.toLowerCase().includes("cctv")
          ? "WG-CCTV"
          : serverLabel.toLowerCase().includes("its")
            ? "WG-ITS"
            : serverLabel.toUpperCase();

        return {
          label,
          value: assignment.assignedIP || "-",
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  function createFeedbackSummary(peer) {
    if (!peer) {
      return [];
    }

    if (Array.isArray(peer._createdPeers) && peer._createdPeers.length > 0) {
      return peer._createdPeers.map((item) => {
        const target = adminTargetOptions.find((option) => option.id === item._targetServer)?.label || "SERVER";
        return {
          label: target,
          value: item.assignedIP || "-",
        };
      });
    }

    if (peer._targetServer) {
      const selectedTargetServer = adminTargetOptions.find((item) => item.id === peer._targetServer);
      return [
        { label: "Server", value: selectedTargetServer?.label || peer._targetServer },
        { label: "Assigned IP", value: peer.assignedIP || "-" },
      ];
    }

    if (Array.isArray(peer.assignments) && peer.assignments.length > 0) {
      return peer.assignments.map((assignment) => ({
        label: assignment.interfaceName || assignment.serverName || assignment.serverId,
        value: assignment.assignedIP || "-",
      }));
    }

    return [{ label: "Assigned IP", value: peer.assignedIP || "-" }];
  }

  function renderPlaceholderSection(title, subtitle, description) {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>

        <div className="placeholder-panel">
          <strong>Not implemented yet</strong>
          <p>{description}</p>
        </div>
      </section>
    );
  }

  function monitoringStatus(item) {
    if (typeof item.status === "string") {
      return item.status;
    }
    if (typeof item.health === "string") {
      return item.health;
    }
    if (typeof item.success === "boolean") {
      return item.success ? "up" : "down";
    }
    return "unknown";
  }

  async function handleTopRefresh() {
    if (activeView === "dashboard") {
      await loadState();
      await loadDashboardHealth();
      return;
    }

    if (activeView === "monitoring") {
      await loadMonitoring();
      return;
    }

    if (activeView === "checkServerConnection") {
      await loadWGServerDiagnostics();
      return;
    }

    if (activeView === "wireguardLogs") {
      await loadLogs("wireguard");
      return;
    }

    if (activeView === "mikrotikLogs") {
      await loadLogs("mikrotik");
      return;
    }

    if (activeView === "userLogs") {
      await loadLogs("user");
      return;
    }

    await loadState();
  }

  function renderMainContent() {
    if (loading) {
      return <div className="empty">Loading WireGuard state...</div>;
    }

    switch (activeView) {
      case "dashboard": {
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
      case "monitoring": {
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
                <div className="empty">
                  Source: {monitoring.data?.source || "Configured metrics endpoint"}
                </div>
                <div className="empty">
                  Auto refresh: every {Math.round(monitoringRefreshMs / 1000)} seconds
                </div>
                <div className="empty">
                  Endpoints loaded: {endpointCount}
                </div>
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
                      <button
                        type="button"
                        className="monitor-group-head"
                        onClick={() => toggleGroup(group.name)}
                      >
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
                                    <span
                                      className={`monitor-bar monitor-bar-${bar}`}
                                      key={`${item.key || itemName}-${barIndex}`}
                                    />
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
      case "createPeer":
        {
        const feedbackPeer = createPeerFeedback.peer;
        const feedbackSummary = createFeedbackSummary(feedbackPeer);
        const flowSteps = createFlowSteps(createPeerType);
        const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
        const adminItsIPs = availableIPsFor("10.22.0.");
        const adminCctvIPs = availableIPsFor("10.21.0.");
        const adminDownloads = administratorDownloadLinks(feedbackPeer);
        const outletSummary = outletAssignmentSummary(feedbackPeer);
        const outletDownloads = outletConfigLinks(feedbackPeer);
        const adminIsReady = adminTargetMode !== ""
          && peerForm.name.trim() !== ""
          && adminPurpose !== ""
          && (
            (adminTargetMode === "both" && adminAssignedItsIP !== "" && adminAssignedCctvIP !== "")
            || (adminTargetMode !== "both" && peerForm.assignedIP !== "")
          );

        return (
          <section className="panel create-peer-panel">
            <div className="peer-tablist" role="tablist" aria-label="Select peer type">
              <button
                id="tab-outlet-peer"
                type="button"
                role="tab"
                className={`peer-tab${createPeerType === "outlet" ? " active" : ""}`}
                onClick={() => setCreatePeerType("outlet")}
                aria-selected={createPeerType === "outlet"}
                aria-controls="create-peer-form"
              >
                <span className="peer-tab-title">Outlet Peer</span>
                <span className="peer-tab-description">Provision to WG-ITS and WG-CCTV</span>
              </button>
              <button
                id="tab-admin-peer"
                type="button"
                role="tab"
                className={`peer-tab${createPeerType === "administrator" ? " active" : ""}`}
                onClick={() => setCreatePeerType("administrator")}
                aria-selected={createPeerType === "administrator"}
                aria-controls="create-peer-form"
              >
                <span className="peer-tab-title">Administrator Peer</span>
                <span className="peer-tab-description">Manual single-profile entry</span>
              </button>
            </div>

            <p className="form-note create-peer-note">
              {createPeerType === "outlet"
                ? "Auto-provision to WG-ITS and WG-CCTV"
                : "Single profile → .conf download"}
            </p>

            {createPeerFeedback.type && (createPeerFeedback.scope === createPeerType || createPeerFeedback.scope === "") ? (
              <section className={`create-feedback-banner ${createPeerFeedback.type}`} aria-live="polite">
                <div className="create-feedback-main">
                  <strong>{createPeerFeedback.type === "success" ? "✅ " : "⚠ "} {createPeerFeedback.title}</strong>
                  <p>{createPeerFeedback.message}</p>
                </div>
                {createPeerFeedback.type === "success" && createPeerType === "outlet" && feedbackPeer ? (
                  <div className="create-feedback-body outlet-feedback-body">
                    <div className="create-feedback-summary outlet-feedback-summary">
                      <div className="outlet-feedback-cards">
                        {outletSummary.map((item) => (
                          <div className="create-feedback-chip outlet-feedback-chip" key={`${item.label}-${item.value}`}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="create-feedback-actions">
                      {outletDownloads.map((item) => (
                        <a className="ghost" href={item.href} key={item.id}>
                          Download {item.label}
                        </a>
                      ))}
                      {isAdministrator ? (
                        <button type="button" className="secondary-button" onClick={() => setActiveView("inventoryPeer")}>
                          View Inventory
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {createPeerFeedback.type === "success" && createPeerType === "administrator" ? (
                  <div className="create-feedback-body">
                    <div className="create-feedback-summary">
                      {feedbackSummary.map((item) => (
                        <div className="create-feedback-chip" key={`${item.label}-${item.value}`}>
                          <span>{String(item.label).toUpperCase()}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="create-feedback-actions">
                      {adminDownloads.map((item) => (
                        <a className="ghost" href={item.href} key={item.id}>
                          {item.label}
                        </a>
                      ))}
                      {isAdministrator ? (
                        <button type="button" className="secondary-button" onClick={() => setActiveView("inventoryPeer")}>
                          View Inventory
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <form id="create-peer-form" className="settings-form create-peer-form" onSubmit={createPeer} role="tabpanel" aria-labelledby={createPeerType === "outlet" ? "tab-outlet-peer" : "tab-admin-peer"}>
              {createPeerType === "administrator" ? (
                <>
                  <section className="form-section">
                    <div className="form-section-head">
                      <strong>Step 1 · Target Server</strong>
                      <span>Select WG-ITS, WG-CCTV, or BOTH</span>
                    </div>
                    <div className="target-server-inline" role="radiogroup" aria-label="Target Server">
                      {adminTargetOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          className={`target-server-pill${adminTargetMode === option.id ? " active" : ""}`}
                          aria-checked={adminTargetMode === option.id}
                          onClick={() => setAdminTargetMode(option.id)}
                        >
                          <span>{option.label}</span>
                          <small>{option.pool}</small>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="form-section">
                    <div className="form-section-head">
                      <strong>Step 2 · Peer Identity</strong>
                      <span>Core identity used in OCC inventory</span>
                    </div>
                    <div className="create-peer-form-grid admin-identity-grid">
                      <label className="create-peer-field create-peer-field-wide">
                        Name
                        <input
                          name="name"
                          value={peerForm.name.toUpperCase()}
                          onChange={(event) =>
                            setPeerForm((current) => ({
                              ...current,
                              name: normalizeAdminName(event.target.value),
                            }))
                          }
                          required
                          disabled={saving}
                          placeholder="ADMIN-BRANCH"
                        />
                        <small className="field-helper">Use only `A-Z`, `0-9`, and dash `-`. Spaces become `-`.</small>
                      </label>
                      <label className="create-peer-field create-peer-field-wide">
                        Purpose / Role
                        <select
                          value={adminPurpose}
                          onChange={(event) => setAdminPurpose(event.target.value)}
                          disabled={saving}
                        >
                          {adminPurposeOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>

                  <section className="form-section">
                    <div className="form-section-head">
                      <strong>Step 3 · Network</strong>
                      <span>Pick from available administrator IPs</span>
                    </div>
                    <div className="create-peer-form-grid admin-layout">
                      {adminTargetMode === "both" ? (
                        <>
                          <label className="create-peer-field">
                            Assigned IP (WG-ITS)
                            <select
                              value={adminAssignedItsIP}
                              onChange={(event) => setAdminAssignedItsIP(event.target.value)}
                              disabled={saving}
                            >
                              <option value="">Select available WG-ITS IP</option>
                              {adminItsIPs.map((ip) => (
                                <option key={ip} value={ip}>{ip}</option>
                              ))}
                            </select>
                          </label>
                          <label className="create-peer-field">
                            Assigned IP (WG-CCTV)
                            <select
                              value={adminAssignedCctvIP}
                              onChange={(event) => setAdminAssignedCctvIP(event.target.value)}
                              disabled={saving}
                            >
                              <option value="">Select available WG-CCTV IP</option>
                              {adminCctvIPs.map((ip) => (
                                <option key={ip} value={ip}>{ip}</option>
                              ))}
                            </select>
                          </label>
                        </>
                      ) : (
                        <label className="create-peer-field">
                          Assigned IP
                          <select
                            name="assignedIP"
                            value={peerForm.assignedIP}
                            onChange={updatePeerField}
                            required
                            disabled={saving}
                          >
                            <option value="">
                              {adminTargetMode ? `Select available ${selectedTargetServer?.label || "target"} IP` : "Select target server first"}
                            </option>
                            {(adminTargetMode === "wg-its" ? adminItsIPs : adminTargetMode === "wg-cctv" ? adminCctvIPs : []).map((ip) => (
                              <option key={ip} value={ip}>{ip}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      <label className="create-peer-field">
                        Allowed IPs
                        <input
                          name="allowedIPs"
                          value={peerForm.allowedIPs}
                          onChange={(event) =>
                            setPeerForm((current) => ({
                              ...current,
                              allowedIPs: sanitizeAllowedIPs(event.target.value),
                            }))
                          }
                          disabled={saving}
                          placeholder="Optional"
                          inputMode="numeric"
                          pattern="^(\d{1,3}(\.\d{1,3}){3})(/\d{1,2})?$"
                        />
                        <small className="field-helper">Optional. Use IPv4/CIDR format only (example: 10.22.0.0/24).</small>
                      </label>
                      <div className="create-peer-field">
                        <span>Availability</span>
                        <small className="field-helper">
                          {adminTargetMode === "both"
                            ? `WG-ITS: ${adminItsIPs.length} available • WG-CCTV: ${adminCctvIPs.length} available`
                            : adminTargetMode
                              ? `${(adminTargetMode === "wg-its" ? adminItsIPs : adminCctvIPs).length} IPs available`
                              : "Choose target server to load IP availability"}
                        </small>
                      </div>
                    </div>
                  </section>

                </>
              ) : (
                <div className="create-peer-form-grid">
                  <label className="create-peer-field">
                    Brand / Outlet Type
                    <input
                      value={outletBrand}
                      onChange={(event) => setOutletBrand(normalizeOutletSegment(event.target.value))}
                      required
                      disabled={saving}
                      placeholder="LIVEHOUSE"
                    />
                  </label>
                  <label className="create-peer-field">
                    Location
                    <input
                      value={outletLocation}
                      onChange={(event) => setOutletLocation(normalizeOutletSegment(event.target.value))}
                      required
                      disabled={saving}
                      placeholder="KEMANG"
                    />
                  </label>
                  <label className="create-peer-field create-peer-field-wide">
                    Generated Site Name
                    <input
                      value={generatedOutletSiteName() || "BRAND-LOCATION"}
                      readOnly
                      disabled={saving}
                    />
                    <small className="field-helper">Final site name is generated automatically as `BRAND-LOCATION`.</small>
                  </label>
                </div>
              )}

              <section className="flow-card">
                <div className="flow-card-head">
                  <strong>{createPeerType === "outlet" ? "Flow Outlet Peer" : "Flow Administrator Peer"}</strong>
                  <span>{createPeerType === "outlet" ? "Auto-generated assignments" : "Manual profile creation"}</span>
                </div>
                <div className="flow-pipeline" aria-label={`${createPeerType} flow`}>
                  {flowSteps.map((step, index) => (
                    <div className="flow-pipeline-fragment" key={`${step.label}-${index}`}>
                      <article className="flow-step">
                        <span>{step.label}</span>
                        <strong>{step.value}</strong>
                        <small>{step.meta}</small>
                      </article>
                      {index < flowSteps.length - 1 ? <span className="flow-arrow" aria-hidden="true">→</span> : null}
                    </div>
                  ))}
                </div>
                <p className="outlet-flow-note">
                  {createPeerType === "outlet"
                    ? "Saat create dijalankan, OCC akan menyimpan satu site dengan dua assignment WireGuard dan empat file artefak untuk diunduh dari inventory."
                    : `Administrator profile will be created for ${selectedTargetServer?.label || "selected target"} and can be downloaded as .conf.`}
                </p>
              </section>

              <div className={`create-peer-actions${createPeerType === "administrator" ? " create-peer-actions-sticky" : ""}`}>
                {createPeerType === "administrator" ? (
                  <div className="create-peer-action-summary">
                    <span>Creating on</span>
                    <strong>{selectedTargetServer?.label || "Select target server"}</strong>
                  </div>
                ) : <span />}
                <button type="button" className="secondary-button" onClick={resetPeerForm} disabled={saving}>
                  Reset
                </button>
                <button type="submit" className="primary-action-button" disabled={saving || (createPeerType === "administrator" && !adminIsReady)}>
                  {saving ? (
                    <>
                      <span className="button-spinner" aria-hidden="true" />
                      Creating...
                    </>
                  ) : "Create Peer"}
                </button>
              </div>
            </form>
          </section>
        );
        }
      case "removePeer":
        {
          const outletPeers = state.peers.filter((peer) => peer.type === "outlet" && peerMatchesSearch(peer, removeSearch));
          const administratorPeers = state.peers.filter((peer) => peer.type !== "outlet" && peerMatchesSearch(peer, removeSearch));

        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Remove Peer</h2>
              <span>Use this area for deletion only. Inventory remains read-only.</span>
            </div>
            {removeError ? <div className="alert">{removeError}</div> : null}

            <section className="list-toolbar" aria-label="Remove Peer Search">
              <label className="monitor-search">
                <span className="sr-only">Search peer to remove</span>
                <input
                  type="search"
                  value={removeSearch}
                  onChange={(event) => setRemoveSearch(event.target.value)}
                  placeholder="Search by creator, peer name, or IP..."
                />
              </label>
            </section>

            {state.peers.length === 0 ? (
              <div className="empty">No peers available to remove.</div>
            ) : (
              <div className="remove-sections">
                <section className="remove-section">
                  <div className="panel-head compact-head">
                    <h3>Outlet Peers</h3>
                    <span>Dual-server sites mapped to `wg-its` and `wg-cctv`</span>
                  </div>
                  {outletPeers.length === 0 ? (
                    <div className="empty">No outlet peers found.</div>
                  ) : (
                    <div className="peer-list">
                      {outletPeers.map((peer) => {
                        const wgIts = assignmentFor(peer, "wg-its");
                        const wgCctv = assignmentFor(peer, "wg-cctv");
                        return (
                          <article className="peer-card" key={peer.id}>
                            <div>
                              <h3>{peer.siteName || peer.name}</h3>
                              <div className="peer-detail-list">
                                <p><strong>wg-its</strong>: {wgIts?.assignedIP || "-"}</p>
                                <p><strong>wg-cctv</strong>: {wgCctv?.assignedIP || "-"}</p>
                                <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                                <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                              </div>
                            </div>
                            <button
                              className="danger"
                              type="button"
                              onClick={() => deletePeer(peer.id)}
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="remove-section">
                  <div className="panel-head compact-head">
                    <h3>Administrator Peers</h3>
                    <span>Single peer entries managed directly in OCC</span>
                  </div>
                  {administratorPeers.length === 0 ? (
                    <div className="empty">No administrator peers found.</div>
                  ) : (
                    <div className="peer-list">
                      {administratorPeers.map((peer) => (
                        <article className="peer-card" key={peer.id}>
                          <div>
                            <h3>{peer.name}</h3>
                            <div className="peer-detail-list">
                              <p><strong>Assigned IP</strong>: {peer.assignedIP || "-"}</p>
                              <p><strong>Public Key</strong>: {peer.publicKey || "-"}</p>
                              <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                              <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                            </div>
                          </div>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => deletePeer(peer.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        );
        }
      case "updatePeer":
        return renderPlaceholderSection(
          "Update Peer",
          "Peer modification tools",
          "Area ini akan dipakai untuk mengubah konfigurasi peer yang sudah ada. Fungsi edit peer belum diimplementasikan."
        );
      case "inventoryPeer":
        {
          const visiblePeers = state.peers.filter((peer) => peerMatchesSearch(peer, inventorySearch));
          const managedPeers = visiblePeers.filter((peer) => peerManagementStatus(peer) === "managed");
          const unmanagedPeers = visiblePeers.filter((peer) => peerManagementStatus(peer) === "unmanaged");

          return (
            <section className="panel">
              <div className="panel-head">
                <h2>Inventory Peer</h2>
                <span>SSOT inventory overview</span>
              </div>

              <div className="inventory-summary">
                <article className="inventory-stat">
                  <span>Total</span>
                  <strong>{visiblePeers.length}</strong>
                </article>
                <article className="inventory-stat">
                  <span>Managed</span>
                  <strong>{managedPeers.length}</strong>
                </article>
                <article className="inventory-stat">
                  <span>Unmanaged</span>
                  <strong>{unmanagedPeers.length}</strong>
                </article>
              </div>

              <p className="form-note">
                Status saat ini diidentifikasi dari pola nama peer yang dibuat OCC. Untuk SSOT penuh lintas server, status managed sebaiknya nanti dibandingkan dengan inventory aktual di masing-masing server.
              </p>

              <section className="list-toolbar" aria-label="Inventory Search">
                <label className="monitor-search">
                  <span className="sr-only">Search inventory peer</span>
                  <input
                    type="search"
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                    placeholder="Search by creator, peer name, or IP..."
                  />
                </label>
              </section>

              {visiblePeers.length === 0 ? (
                <div className="empty">{state.peers.length === 0 ? "No peers yet. Create your first peer from the sidebar." : "No peer matches the current search."}</div>
              ) : (
                <div className="peer-list">
                  {visiblePeers.map((peer) => {
                    const managementStatus = peerManagementStatus(peer);
                    const wgIts = assignmentFor(peer, "wg-its");
                    const wgCctv = assignmentFor(peer, "wg-cctv");

                    return (
                      <article className="peer-card inventory-card" key={peer.id}>
                        <div>
                          <div className="inventory-card-head">
                            <h3>{peer.name}</h3>
                            <span className={`inventory-pill inventory-${managementStatus}`}>
                              {managementStatus === "managed" ? "Managed" : "Unmanaged"}
                            </span>
                          </div>
                          {Array.isArray(peer.assignments) && peer.assignments.length > 0 ? (
                            <div className="inventory-site-block">
                              <span className="inventory-site-label">Site</span>
                              <strong className="inventory-site-name">{peer.siteName || peer.name}</strong>
                              <div className="inventory-assignment-list">
                                <p>
                                  <strong>ip wg-its</strong>
                                  {": "}
                                  {wgIts?.assignedIP || "-"}
                                </p>
                                <p>
                                  <strong>ip wg-cctv</strong>
                                  {": "}
                                  {wgCctv?.assignedIP || "-"}
                                </p>
                              </div>
                              <div className="inventory-meta-list">
                                <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                                <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p>{peer.assignedIP}</p>
                              <small>{peer.publicKey}</small>
                              <div className="inventory-meta-list">
                                <p><strong>Created by</strong>: {peerCreatorLabel(peer)}</p>
                                <p><strong>Created at</strong>: {peerCreatedAtLabel(peer)}</p>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="peer-actions">
                          {Array.isArray(peer.artifacts) && peer.artifacts.length > 0 ? (
                            <div className="artifact-list artifact-list-stacked">
                              {["stg-its", "stg-cctv"].map((serverName) => {
                                const items = peer.artifacts.filter((artifact) => artifact.serverName === serverName);
                                if (items.length === 0) {
                                  return null;
                                }

                                return (
                                  <div className="artifact-group" key={`${peer.id}-${serverName}`}>
                                    <span className="artifact-group-title">{serverName}</span>
                                    <div className="artifact-group-actions">
                                      {items.map((artifact) => (
                                        <a className="ghost" href={`/api/peers/${peer.id}/artifacts/${artifact.id}`} key={`${peer.id}-${artifact.id}`}>
                                          {artifact.kind.toUpperCase()}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <a className="ghost" href={`/api/peers/${peer.id}/config`}>
                              Download Config
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        }
      case "checkServerConnection":
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Server Connection</h2>
              <span>{wgServerDiagnostics.lastUpdated ? `Last check: ${wgServerDiagnostics.lastUpdated}` : "OCC to WireGuard server diagnostics"}</span>
            </div>

            <div className="action-row">
              <button type="button" className="ghost" onClick={loadWGServerDiagnostics} disabled={wgServerDiagnostics.loading}>
                {wgServerDiagnostics.loading ? "Checking Servers..." : "Run Server Check"}
              </button>
            </div>

            {wgServerDiagnostics.error ? <div className="alert">{wgServerDiagnostics.error}</div> : null}
            {wgServerDiagnostics.loading ? <div className="empty">Testing connectivity to staging WireGuard servers...</div> : null}

            {!wgServerDiagnostics.loading && wgServerDiagnostics.items.length === 0 && !wgServerDiagnostics.error ? (
              <div className="empty">No server diagnostics available yet.</div>
            ) : null}

            {!wgServerDiagnostics.loading && wgServerDiagnostics.items.length > 0 ? (
              <div className="server-list-grid">
                {wgServerDiagnostics.items.map((item) => {
                  const healthy = item.pingStatus === "up" && item.sshStatus === "up";
                  return (
                    <article className="server-card" key={item.id}>
                      <div className="server-card-head">
                        <h3>{item.name}</h3>
                        <span className={`status-pill status-${healthy ? "up" : "down"}`}>
                          {healthy ? "Healthy" : "Bad Connection"}
                        </span>
                      </div>
                      <div className="config-grid">
                        <span>Host: {item.host}</span>
                        <span>WG IP: {item.wireGuardIP}</span>
                        <span>Ping Latency: {typeof item.pingLatencyMs === "number" ? `${item.pingLatencyMs.toFixed(2)} ms` : "-"}</span>
                        <span>SSH Latency: {typeof item.sshLatencyMs === "number" ? `${item.sshLatencyMs.toFixed(0)} ms` : "-"}</span>
                      </div>
                      <div className="server-card-notes">
                        <small>Ping: {item.pingError || "OK"}</small>
                        <small>SSH: {item.sshError || "OK"}</small>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      case "serverManagementSshConfig":
      case "serverManagementWireGuardIP":
      case "serverManagementConnectivity":
        return renderPlaceholderSection(
          "Deprecated View",
          "Hidden from sidebar",
          "Server Management sudah dihapus dari sidebar dan view ini tidak lagi dipakai.",
        );
      case "wireguardLogs": {
        const visibleLogs = auditLogs.wireguard.items.filter((item) => logMatchesSearch(item, logSearch));
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>WireGuard Logs</h2>
              <span>Audit trail for create, delete, and update actions</span>
            </div>

            <section className="list-toolbar" aria-label="WireGuard Logs Search">
              <label className="monitor-search">
                <span className="sr-only">Search WireGuard logs</span>
                <input
                  type="search"
                  value={logSearch}
                  onChange={(event) => setLogSearch(event.target.value)}
                  placeholder="Search by creator, peer name, or IP..."
                />
              </label>
            </section>

            {auditLogs.wireguard.error ? <div className="alert">{auditLogs.wireguard.error}</div> : null}
            {auditLogs.wireguard.loading ? <div className="empty">Loading WireGuard audit logs...</div> : null}
            {!auditLogs.wireguard.loading && visibleLogs.length === 0 ? (
              <div className="empty">{auditLogs.wireguard.items.length === 0 ? "No WireGuard audit logs yet." : "No log matches the current search."}</div>
            ) : null}
            {!auditLogs.wireguard.loading && visibleLogs.length > 0 ? (
              <div className="log-list">
                {visibleLogs.map((item) => (
                  <article className="log-card" key={item.id}>
                    <div className="log-card-head">
                      <span className={`log-action log-action-${item.action}`}>{String(item.action || "event").toUpperCase()}</span>
                      <strong>{item.target || "-"}</strong>
                    </div>
                    <p>{item.message || "-"}</p>
                    <div className="log-meta">
                      <span>{item.actorName || item.actor || "-"}</span>
                      <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      }
      case "mikrotikLogs":
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Mikrotik Logs</h2>
              <span>Reserved for future router activity logs</span>
            </div>

            <section className="list-toolbar" aria-label="Mikrotik Logs Search">
              <label className="monitor-search">
                <span className="sr-only">Search Mikrotik logs</span>
                <input
                  type="search"
                  value={logSearch}
                  onChange={(event) => setLogSearch(event.target.value)}
                  placeholder="Search by creator, peer name, or IP..."
                />
              </label>
            </section>

            {auditLogs.mikrotik.error ? <div className="alert">{auditLogs.mikrotik.error}</div> : null}
            {auditLogs.mikrotik.loading ? <div className="empty">Loading Mikrotik logs...</div> : null}
            {!auditLogs.mikrotik.loading ? (
              <div className="empty">Belum ada log Mikrotik. Bagian ini disiapkan untuk integrasi berikutnya.</div>
            ) : null}
          </section>
        );
      case "userLogs": {
        const visibleLogs = auditLogs.user.items.filter((item) => logMatchesSearch(item, logSearch));
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>User Logs</h2>
              <span>Audit trail for user creation and updates</span>
            </div>

            <section className="list-toolbar" aria-label="User Logs Search">
              <label className="monitor-search">
                <span className="sr-only">Search User logs</span>
                <input
                  type="search"
                  value={logSearch}
                  onChange={(event) => setLogSearch(event.target.value)}
                  placeholder="Search by maker, target user, or activity..."
                />
              </label>
            </section>

            {auditLogs.user.error ? <div className="alert">{auditLogs.user.error}</div> : null}
            {auditLogs.user.loading ? <div className="empty">Loading user audit logs...</div> : null}
            {!auditLogs.user.loading && visibleLogs.length === 0 ? (
              <div className="empty">{auditLogs.user.items.length === 0 ? "No user audit logs yet." : "No log matches the current search."}</div>
            ) : null}
            {!auditLogs.user.loading && visibleLogs.length > 0 ? (
              <div className="log-list">
                {visibleLogs.map((item) => (
                  <article className="log-card" key={item.id}>
                    <div className="log-card-head">
                      <span className={`log-action log-action-${item.action}`}>{String(item.action || "event").toUpperCase()}</span>
                      <strong>{item.target || "-"}</strong>
                    </div>
                    <p>{item.message || "-"}</p>
                    <div className="log-meta">
                      <span>By {item.actorName || item.actor || "-"}</span>
                      <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      }
      case "mikrotikSsh":
        return renderPlaceholderSection(
          "Akses Mikrotik SSH",
          "Remote Mikrotik access",
          "Integrasi akses SSH ke Mikrotik belum diimplementasikan. Nantinya area ini dipakai untuk membuka atau mengelola akses router."
        );
      case "mikrotikAutomation":
        return renderPlaceholderSection(
          "Automation Script Update",
          "Router automation workflow",
          "Bagian ini disiapkan untuk pembaruan dan distribusi automation script ke perangkat Mikrotik."
        );
      case "mikrotikCheckIsp":
        return renderPlaceholderSection(
          "Check ISP",
          "ISP link validation",
          "Pengecekan status ISP dan validasi link akan ditampilkan di area ini setelah fitur monitoring ISP diimplementasikan."
        );
      case "userList": {
        const visibleUsers = users.filter((user) => userMatchesSearch(user, userSearch));
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>User List</h2>
              <span>Registered application users</span>
            </div>

            <section className="list-toolbar" aria-label="User Search">
              <label className="monitor-search">
                <span className="sr-only">Search users</span>
                <input
                  type="search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search by name or NIK..."
                />
              </label>
            </section>

            {usersLoading ? <div className="empty">Loading users...</div> : null}
            {!usersLoading && users.length === 0 ? (
              <div className="empty">No users registered yet.</div>
            ) : null}
            {!usersLoading && users.length > 0 && visibleUsers.length === 0 ? (
              <div className="empty">No user matches the current search.</div>
            ) : null}
            {!usersLoading && visibleUsers.length > 0 ? (
              <div className="user-list-grid">
                {visibleUsers.map((user) => (
                  <article className="user-card" key={user.username}>
                    <div>
                      <h3>{user.name}</h3>
                      <p>NIK: {user.nik || user.username}</p>
                    </div>
                    <div className="user-card-meta">
                      <span className={`role-pill role-${user.role}`}>{roleLabel(user.role)}</span>
                      {user.builtIn ? <small>Built-in</small> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      }
      case "createUser":
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Create User</h2>
              <span>Create application access</span>
            </div>

            <form className="settings-form" onSubmit={createUserAccount}>
              <label>
                Name
                <input name="name" value={userForm.name} onChange={updateUserField} required />
              </label>
              <label>
                NIK (6 digits)
                <input
                  name="nik"
                  value={userForm.nik}
                  onChange={updateUserField}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <label>
                Password
                <input name="password" type="password" value={userForm.password} onChange={updateUserField} required />
              </label>
              <label>
                Role
                <select name="role" value={userForm.role} onChange={updateUserField}>
                  <option value="support">Support</option>
                  <option value="administrator">Administrator</option>
                </select>
              </label>

              <button type="submit" disabled={saving}>Create User</button>
            </form>
          </section>
        );
      case "updateUser":
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Update User</h2>
              <span>Edit existing application users</span>
            </div>

            {usersLoading ? <div className="empty">Loading users...</div> : null}
            {!usersLoading && users.length === 0 ? (
              <div className="empty">No users available to update.</div>
            ) : null}
            {!usersLoading && users.length > 0 ? (
              <>
                <label className="user-select">
                  Select User
                  <select
                    value={editingUsername}
                    onChange={(event) => {
                      const selected = users.find((user) => user.username === event.target.value);
                      selectUserForEdit(selected || null);
                    }}
                  >
                    {users.map((user) => (
                      <option key={user.username} value={user.username}>
                        {user.name} ({user.username})
                      </option>
                    ))}
                  </select>
                </label>

                <form className="settings-form" onSubmit={updateUserAccount}>
                  <label>
                    Name
                    <input name="name" value={editUserForm.name} onChange={updateEditUserField} required />
                  </label>
                  <label>
                    NIK (6 digits)
                    <input
                      name="nik"
                      value={editUserForm.nik}
                      onChange={updateEditUserField}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      disabled={users.find((user) => user.username === editingUsername)?.builtIn}
                    />
                  </label>
                  <label>
                    Password
                    <input name="password" type="password" value={editUserForm.password} onChange={updateEditUserField} required />
                  </label>
                  <label>
                    Role
                    <select
                      name="role"
                      value={editUserForm.role}
                      onChange={updateEditUserField}
                      disabled={users.find((user) => user.username === editingUsername)?.builtIn}
                    >
                      <option value="support">Support</option>
                      <option value="administrator">Administrator</option>
                    </select>
                  </label>

                  <button type="submit" disabled={saving}>Update User</button>
                </form>
              </>
            ) : null}
          </section>
        );
      default:
        return null;
    }
  }

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

  if (!isAuthenticated) {
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

  return (
    <main className="app-theme app-layout" data-theme={theme}>
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark topbar-mark" aria-hidden="true">
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
          <div>
            <strong>OCC</strong>
            <p>Operation Control Center</p>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="ghost" onClick={handleTopRefresh} disabled={saving || loading || monitoring.loading}>
            <span className="button-icon" aria-hidden="true">
              <RefreshGlyph />
            </span>
            Refresh Data
          </button>
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
          <div className="topbar-user">
            <button
              type="button"
              className={`user-trigger${userMenuOpen ? " active" : ""}`}
              onClick={() => setUserMenuOpen((current) => !current)}
              aria-expanded={userMenuOpen}
            >
              <span className="user-avatar" aria-hidden="true">
                {loggedInName.trim().slice(0, 1).toUpperCase() || "A"}
              </span>
              <span className="user-summary">
                <strong>{loggedInName || "Administrator"}</strong>
                <small>{`${loggedInUser || "admin"}@occ.local`}</small>
              </span>
              <span className="user-chevron" aria-hidden="true">
                <ChevronDownGlyph />
              </span>
            </button>

            {userMenuOpen ? (
              <div className="user-dropdown">
                <p className="user-dropdown-title">Account Menu</p>
                <div className="user-meta-row">
                  <span>Name</span>
                  <strong>{loggedInName || "Administrator"}</strong>
                </div>
                <div className="user-meta-row">
                  <span>Username</span>
                  <strong>{loggedInUser || "admin"}</strong>
                </div>
                <div className="user-meta-row">
                  <span>Role</span>
                  <strong>{roleLabel(loggedInRole)}</strong>
                </div>
                <button type="button" className="danger user-logout" onClick={logout}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`workspace${sidebarExpanded ? "" : " sidebar-collapsed"}`}>
        <aside className={`sidebar${sidebarExpanded ? " expanded" : " collapsed"}`}>
          <nav className="sidebar-nav" aria-label="Primary Navigation">
            <div className="nav-group">
              <button
                type="button"
                className="nav-group-toggle nav-group-static"
                aria-label="General"
                title="General"
              >
                {renderNavLabel("General")}
                {sidebarExpanded ? <span className="nav-group-chevron nav-group-chevron-right">›</span> : null}
              </button>
              <div className="nav-group-body">
                <button
                  type="button"
                  className={`nav-subitem${activeView === "dashboard" ? " active" : ""}`}
                  onClick={() => setActiveView("dashboard")}
                  aria-label="Dashboard"
                  title="Dashboard"
                >
                  <NavIcon name="dashboard" />
                  {renderNavLabel("Dashboard")}
                </button>

                <button
                  type="button"
                  className={`nav-subitem${activeView === "monitoring" ? " active" : ""}`}
                  onClick={() => setActiveView("monitoring")}
                  aria-label="Monitoring"
                  title="Monitoring"
                >
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
                {sidebarExpanded ? <span className={`nav-group-chevron${sidebarGroupsOpen.wireguard ? " open" : ""}`}>⌃</span> : null}
              </button>
              {sidebarGroupsOpen.wireguard ? (
                <div className="nav-group-body">
                  <button
                    type="button"
                    className={`nav-subitem${activeView === "createPeer" ? " active" : ""}`}
                    onClick={() => setActiveView("createPeer")}
                    aria-label="Create Peer"
                    title="Create Peer"
                  >
                    <NavIcon name="createPeer" />
                    {renderNavLabel("Create Peer")}
                  </button>
                  {isAdministrator ? (
                    <>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "removePeer" ? " active" : ""}`}
                        onClick={() => setActiveView("removePeer")}
                        aria-label="Remove Peer"
                        title="Remove Peer"
                      >
                        <NavIcon name="removePeer" />
                        {renderNavLabel("Remove Peer")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "updatePeer" ? " active" : ""}`}
                        onClick={() => setActiveView("updatePeer")}
                        aria-label="Update Peer"
                        title="Update Peer"
                      >
                        <NavIcon name="updatePeer" />
                        {renderNavLabel("Update Peer")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "inventoryPeer" ? " active" : ""}`}
                        onClick={() => setActiveView("inventoryPeer")}
                        aria-label="Inventory Peer"
                        title="Inventory Peer"
                      >
                        <NavIcon name="inventoryPeer" />
                        {renderNavLabel("Inventory Peer")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "checkServerConnection" ? " active" : ""}`}
                        onClick={() => setActiveView("checkServerConnection")}
                        aria-label="Server Connection"
                        title="Server Connection"
                      >
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
                  <button
                    type="button"
                    className={`nav-group-toggle${sidebarGroupsOpen.mikrotik ? " open" : ""}`}
                    onClick={() => toggleSidebarGroup("mikrotik")}
                    aria-expanded={sidebarGroupsOpen.mikrotik}
                    aria-label="Mikrotik"
                    title="Mikrotik"
                  >
                    {renderNavLabel("Mikrotik")}
                    {sidebarExpanded ? <span className={`nav-group-chevron${sidebarGroupsOpen.mikrotik ? " open" : ""}`}>⌃</span> : null}
                  </button>
                  {sidebarGroupsOpen.mikrotik ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikSsh" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikSsh")}
                        aria-label="Akses Mikrotik SSH"
                        title="Akses Mikrotik SSH"
                      >
                        <NavIcon name="mikrotikSsh" />
                        {renderNavLabel("Akses Mikrotik SSH")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikAutomation" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikAutomation")}
                        aria-label="Automation Script Update"
                        title="Automation Script Update"
                      >
                        <NavIcon name="mikrotikAutomation" />
                        {renderNavLabel("Automation Script Update")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikCheckIsp" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikCheckIsp")}
                        aria-label="Check ISP"
                        title="Check ISP"
                      >
                        <NavIcon name="mikrotikCheckIsp" />
                        {renderNavLabel("Check ISP")}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-toggle${sidebarGroupsOpen.logs ? " open" : ""}`}
                    onClick={() => toggleSidebarGroup("logs")}
                    aria-expanded={sidebarGroupsOpen.logs}
                    aria-label="Logs"
                    title="Logs"
                  >
                    {renderNavLabel("Logs")}
                    {sidebarExpanded ? <span className={`nav-group-chevron${sidebarGroupsOpen.logs ? " open" : ""}`}>⌃</span> : null}
                  </button>
                  {sidebarGroupsOpen.logs ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "wireguardLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("wireguardLogs")}
                        aria-label="WireGuard Logs"
                        title="WireGuard Logs"
                      >
                        <NavIcon name="wireguardLogs" />
                        {renderNavLabel("WireGuard Logs")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikLogs")}
                        aria-label="Mikrotik Logs"
                        title="Mikrotik Logs"
                      >
                        <NavIcon name="mikrotikLogs" />
                        {renderNavLabel("Mikrotik Logs")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "userLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("userLogs")}
                        aria-label="User Logs"
                        title="User Logs"
                      >
                        <NavIcon name="userLogs" />
                        {renderNavLabel("User Logs")}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="nav-group">
                  <button
                    type="button"
                    className={`nav-group-toggle${sidebarGroupsOpen.userManagement ? " open" : ""}`}
                    onClick={() => toggleSidebarGroup("userManagement")}
                    aria-expanded={sidebarGroupsOpen.userManagement}
                    aria-label="User Management"
                    title="User Management"
                  >
                    {renderNavLabel("User Management")}
                    {sidebarExpanded ? <span className={`nav-group-chevron${sidebarGroupsOpen.userManagement ? " open" : ""}`}>⌃</span> : null}
                  </button>
                  {sidebarGroupsOpen.userManagement ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "userList" ? " active" : ""}`}
                        onClick={() => setActiveView("userList")}
                        aria-label="User List"
                        title="User List"
                      >
                        <NavIcon name="userList" />
                        {renderNavLabel("User List")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "createUser" ? " active" : ""}`}
                        onClick={() => setActiveView("createUser")}
                        aria-label="Create User"
                        title="Create User"
                      >
                        <NavIcon name="createUser" />
                        {renderNavLabel("Create User")}
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "updateUser" ? " active" : ""}`}
                        onClick={() => {
                          if (users.length > 0 && !editingUsername) {
                            selectUserForEdit(users[0]);
                          }
                          setActiveView("updateUser");
                        }}
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
              {sidebarExpanded ? <span className="sidebar-collapse-label">Collapse</span> : null}
            </button>
          </div>
        </aside>

        <section className="content-area">
          <section className="content-header">
            <div className="content-header-main">
              <h1>{viewLabels[activeView]}</h1>
              {activeView === "createPeer" ? (
                <p className="create-peer-subtitle">WireGuard Client</p>
              ) : null}
            </div>
            {activeView === "dashboard" ? (
              <div className="dashboard-header-note">
                {dashboardHealth.loading ? "Checking connectivity..." : null}
                {!dashboardHealth.loading && dashboardHealth.lastUpdated
                  ? `Updated ${new Date(dashboardHealth.lastUpdated).toLocaleString()} • auto refresh every 5 minutes`
                  : null}
                {!dashboardHealth.loading && !dashboardHealth.lastUpdated ? "Auto refresh every 5 minutes" : null}
              </div>
            ) : null}
          </section>

          {error ? <div className="alert">{error}</div> : null}
          {renderMainContent()}
        </section>
      </div>
    </main>
  );
}
