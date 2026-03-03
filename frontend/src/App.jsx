import { useEffect, useState } from "react";

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
  const [createPeerType, setCreatePeerType] = useState("outlet");
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
  const [networkForm, setNetworkForm] = useState(emptyNetwork);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
  const [serverDiagnostics, setServerDiagnostics] = useState({
    loading: false,
    error: "",
    items: [],
    lastUpdated: "",
  });
  const [wgServers, setWGServers] = useState([]);
  const [wgServersLoading, setWGServersLoading] = useState(false);
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
      setNetworkForm(data.network);
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

  async function saveNetwork(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/network", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...networkForm,
          listenPort: Number(networkForm.listenPort),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save network");
      }

      setState(data);
      setNetworkForm(data.network);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createPeer(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const isOutletPeer = createPeerType === "outlet";
    const peerName = peerForm.name.trim();

    try {
      const response = await fetch("/api/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          peerType: createPeerType,
          ...peerForm,
          name: isOutletPeer ? peerName : (peerName ? `Administrator - ${peerName}` : peerForm.name),
          keepalive: Number(peerForm.keepalive),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create peer");
      }

      setState(data.state);
      setPeerForm(emptyPeer);
      setActiveView(isAdministrator ? "inventoryPeer" : "createPeer");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePeer(id) {
    setSaving(true);
    setError("");

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
    } catch (err) {
      setError(err.message);
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

  async function loadPeerDiagnostics() {
    setServerDiagnostics((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await fetch("/api/diagnostics/peers", {
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
        throw new Error(data.error || "Failed to load diagnostics");
      }

      setServerDiagnostics({
        loading: false,
        error: "",
        items: data.items || [],
        lastUpdated: data.checkedAt || new Date().toLocaleString(),
      });
    } catch (err) {
      setServerDiagnostics((current) => ({
        ...current,
        loading: false,
        error: err.message,
      }));
    }
  }

  async function loadWGServers() {
    setWGServersLoading(true);

    try {
      const response = await fetch("/api/wg-servers", {
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
        throw new Error(data.error || "Failed to fetch WireGuard servers");
      }

      setWGServers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setWGServersLoading(false);
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

  function updateNetworkField(event) {
    const { name, value } = event.target;
    setNetworkForm((current) => ({ ...current, [name]: value }));
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
    const endpointStatusItems = scopedItems.filter((item) => item.metric === "gatus_results_endpoint_success");
    const gatusTotalItems = scopedItems.filter((item) => item.metric === "gatus_results_total");
    const sourceItems = endpointStatusItems.length > 0 ? endpointStatusItems : gatusTotalItems.length > 0 ? gatusTotalItems : scopedItems;
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
      const numericValue = parseMetricValue(item.value) ?? 0;
      if (item.metric === "gatus_results_endpoint_success") {
        current.successCount = numericValue >= 1 ? 1 : 0;
        current.failureCount = numericValue >= 1 ? 0 : 1;
      } else {
        const successLabel = item.success;

        if (successLabel === "false") {
          current.failureCount += numericValue;
        } else if (successLabel === "true") {
          current.successCount += numericValue;
        } else if (numericValue > 0) {
          current.successCount += numericValue;
        }
      }

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
        const dashboardCards = [
          {
            id: "total-peers",
            title: "Total Peers",
            value: String(state.peers.length),
            detail: "Registered peers",
            tone: "neutral",
          },
          ...dashboardHealth.items.map((item) => ({
            id: item.id,
            title: item.label || item.target || "-",
            value: typeof item.latencyMs === "number" ? `${item.latencyMs.toFixed(2)} ms` : "Timeout",
            detail: item.error || item.target || "-",
            tone: item.status === "good" ? "good" : "bad",
          })),
        ];

        return (
          <>
            <section className="grid stats-grid">
              {dashboardCards.map((card) => (
                <article className={`panel stat-card health-${card.tone}`} key={card.id}>
                  <p className="stat-label">{card.title}</p>
                  <strong>{card.value}</strong>
                  <span className="stat-subvalue">{card.detail}</span>
                </article>
              ))}
            </section>

            {dashboardHealth.error ? <div className="alert">{dashboardHealth.error}</div> : null}
          </>
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
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>Create Peer</h2>
              <span>Generate a new WireGuard client profile</span>
            </div>

            <div className="peer-type-selector" role="tablist" aria-label="Select peer type">
              <button
                type="button"
                className={`peer-type-option${createPeerType === "outlet" ? " active" : ""}`}
                onClick={() => setCreatePeerType("outlet")}
                aria-pressed={createPeerType === "outlet"}
              >
                Outlet Peer
              </button>
              <button
                type="button"
                className={`peer-type-option${createPeerType === "administrator" ? " active" : ""}`}
                onClick={() => setCreatePeerType("administrator")}
                aria-pressed={createPeerType === "administrator"}
              >
                Administrator Peer
              </button>
            </div>

            <p className="form-note">
              {createPeerType === "outlet"
                ? "Outlet peer akan otomatis dimapping ke dua server WireGuard dan menghasilkan artefak .conf / .rsc per server."
                : (
                  <>
                    Peer baru akan diberi prefix otomatis:
                    {" "}
                    <strong>Administrator</strong>
                  </>
                )}
            </p>

            <form className="settings-form" onSubmit={createPeer}>
              <label>
                {createPeerType === "outlet" ? "Site Name" : "Name"}
                <input
                  name="name"
                  value={peerForm.name}
                  onChange={updatePeerField}
                  required
                  placeholder={createPeerType === "outlet" ? "OUTLET-A" : ""}
                />
              </label>

              {createPeerType === "administrator" ? (
                <>
                  <label>
                    Public Key
                    <input name="publicKey" value={peerForm.publicKey} onChange={updatePeerField} required />
                  </label>
                  <label>
                    Assigned IP
                    <input name="assignedIP" value={peerForm.assignedIP} onChange={updatePeerField} required />
                  </label>
                  <label>
                    Allowed IPs
                    <input name="allowedIPs" value={peerForm.allowedIPs} onChange={updatePeerField} />
                  </label>
                  <label>
                    Endpoint
                    <input
                      name="endpoint"
                      value={peerForm.endpoint}
                      onChange={updatePeerField}
                      placeholder="vpn.example.com:51820"
                    />
                  </label>
                  <label>
                    Preshared Key
                    <input name="presharedKey" value={peerForm.presharedKey} onChange={updatePeerField} />
                  </label>
                  <label>
                    Keepalive
                    <input name="keepalive" type="number" value={peerForm.keepalive} onChange={updatePeerField} />
                  </label>
                </>
              ) : (
                <div className="outlet-flow-card">
                  <strong>Flow Outlet Peer</strong>
                  <div className="outlet-flow-grid">
                    <div className="outlet-flow-step">
                      <span>Site</span>
                      <strong>{peerForm.name.trim() || "OUTLET-A"}</strong>
                    </div>
                    <div className="outlet-flow-step">
                      <span>wg-its</span>
                      <strong>10.22.x.x</strong>
                    </div>
                    <div className="outlet-flow-step">
                      <span>wg-cctv</span>
                      <strong>10.21.x.x</strong>
                    </div>
                    <div className="outlet-flow-step">
                      <span>Output</span>
                      <strong>CONF + RSC</strong>
                    </div>
                  </div>
                  <p className="outlet-flow-note">
                    Saat create dijalankan, OCC akan menyimpan satu site dengan dua assignment WireGuard dan empat file artefak untuk diunduh dari inventory.
                  </p>
                </div>
              )}

              <button type="submit" disabled={saving}>Create Peer</button>
            </form>
          </section>
        );
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
                {theme === "light" ? "☾" : "☀"}
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
                {theme === "light" ? "☾" : "☀"}
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
              {theme === "light" ? "☾" : "☀"}
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
                <small>{roleLabel(loggedInRole)}</small>
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

      <div className="workspace">
        <aside className="sidebar">
          <nav className="sidebar-nav" aria-label="Primary Navigation">
            <button
              type="button"
              className={`nav-item${activeView === "dashboard" ? " active" : ""}`}
              onClick={() => setActiveView("dashboard")}
            >
              Dashboard
            </button>

            <button
              type="button"
              className={`nav-item${activeView === "monitoring" ? " active" : ""}`}
              onClick={() => setActiveView("monitoring")}
            >
              Monitoring
            </button>

            <div className="nav-group">
              <button
                type="button"
                className={`nav-group-toggle${sidebarGroupsOpen.wireguard ? " open" : ""}`}
                onClick={() => toggleSidebarGroup("wireguard")}
                aria-expanded={sidebarGroupsOpen.wireguard}
              >
                <span className={`nav-group-chevron${sidebarGroupsOpen.wireguard ? " open" : ""}`}>⌃</span>
                <span className="nav-group-title">WireGuard</span>
              </button>
              {sidebarGroupsOpen.wireguard ? (
                <div className="nav-group-body">
                  <button
                    type="button"
                    className={`nav-subitem${activeView === "createPeer" ? " active" : ""}`}
                    onClick={() => setActiveView("createPeer")}
                  >
                    Create Peer
                  </button>
                  {isAdministrator ? (
                    <>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "removePeer" ? " active" : ""}`}
                        onClick={() => setActiveView("removePeer")}
                      >
                        Remove Peer
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "updatePeer" ? " active" : ""}`}
                        onClick={() => setActiveView("updatePeer")}
                      >
                        Update Peer
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "inventoryPeer" ? " active" : ""}`}
                        onClick={() => setActiveView("inventoryPeer")}
                      >
                        Inventory Peer
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "checkServerConnection" ? " active" : ""}`}
                        onClick={() => setActiveView("checkServerConnection")}
                      >
                        Server Connection
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
                  >
                    <span className={`nav-group-chevron${sidebarGroupsOpen.mikrotik ? " open" : ""}`}>⌃</span>
                    <span className="nav-group-title">Mikrotik</span>
                  </button>
                  {sidebarGroupsOpen.mikrotik ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikSsh" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikSsh")}
                      >
                        Akses Mikrotik SSH
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikAutomation" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikAutomation")}
                      >
                        Automation Script Update
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikCheckIsp" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikCheckIsp")}
                      >
                        Check ISP
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
                  >
                    <span className={`nav-group-chevron${sidebarGroupsOpen.logs ? " open" : ""}`}>⌃</span>
                    <span className="nav-group-title">Logs</span>
                  </button>
                  {sidebarGroupsOpen.logs ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "wireguardLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("wireguardLogs")}
                      >
                        WireGuard Logs
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "mikrotikLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("mikrotikLogs")}
                      >
                        Mikrotik Logs
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "userLogs" ? " active" : ""}`}
                        onClick={() => setActiveView("userLogs")}
                      >
                        User Logs
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
                  >
                    <span className={`nav-group-chevron${sidebarGroupsOpen.userManagement ? " open" : ""}`}>⌃</span>
                    <span className="nav-group-title">User Management</span>
                  </button>
                  {sidebarGroupsOpen.userManagement ? (
                    <div className="nav-group-body">
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "userList" ? " active" : ""}`}
                        onClick={() => setActiveView("userList")}
                      >
                        User List
                      </button>
                      <button
                        type="button"
                        className={`nav-subitem${activeView === "createUser" ? " active" : ""}`}
                        onClick={() => setActiveView("createUser")}
                      >
                        Create User
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
                      >
                        Update User
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </nav>
        </aside>

        <section className="content-area">
          <section className="content-header">
            <div className="content-header-main">
              <h1>{viewLabels[activeView]}</h1>
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
