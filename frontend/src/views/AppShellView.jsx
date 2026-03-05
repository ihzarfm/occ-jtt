import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import SideNav from "../components/SideNav";
import { ThemeGlyph } from "../components/Icons";
import DashboardView from "./DashboardView";
import MonitoringView from "./MonitoringView";
import { getDashboardHealth, getState, createPeer as createPeerAPI, deletePeer as deletePeerAPI } from "../api/peers";
import { getSession, login as loginAPI, logout as logoutAPI } from "../api/session";
import { getMonitoring, getWGServerDiagnostics } from "../api/monitoring";
import { listUsers, createUser as createUserAPI, updateUser as updateUserAPI } from "../api/users";
import { listLogs } from "../api/logs";
import {
  normalizeSiteSegment,
  normalizeAdminName,
  sanitizeAllowedIPs,
  isValidIPv4CIDR,
  availableAdminIPsFor,
  adminRangeLabel,
  validateAdminIP,
  normalizeUserField,
  validateUserForm,
} from "../utils/validators";
import { isAdminRole, viewLabels } from "../utils/format";

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
  interfaceName: "control-node",
  serverAddress: "managed-remotely",
  listenPort: 51820,
  serverPublicKey: "replace-with-managed-server-public-key",
  dns: "",
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

const emptyUserFormErrors = {
  name: "",
  nik: "",
};

const emptyCreatePeerFeedback = {
  type: "",
  title: "",
  message: "",
  peer: null,
  scope: "",
};

const adminTargetOptions = [
  { id: "wg-its", label: "WG-ITS", pool: "10.21.3.2 - 10.21.3.254" },
  { id: "wg-cctv", label: "WG-CCTV", pool: "10.22.3.2 - 10.22.3.254" },
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

export default function AppShellView() {
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("admin");
  const [loggedInName, setLoggedInName] = useState("Administrator");
  const [loggedInNIK, setLoggedInNIK] = useState("000000");
  const [loggedInRole, setLoggedInRole] = useState("administrator");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("occ-theme") || "light");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  ));
  const [createPeerType, setCreatePeerType] = useState("site");
  const [managedByAutomation, setManagedByAutomation] = useState(true);
  const [siteBrand, setSiteBrand] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [adminTargetMode, setAdminTargetMode] = useState("");
  const [adminPurpose, setAdminPurpose] = useState("user-admin");
  const [adminAssignedIPError, setAdminAssignedIPError] = useState("");
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
  const [userFormErrors, setUserFormErrors] = useState(emptyUserFormErrors);
  const [editUserFormErrors, setEditUserFormErrors] = useState(emptyUserFormErrors);
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
  const isAdministrator = isAdminRole(loggedInRole);
  const showSidebarLabels = isMobileViewport || sidebarExpanded;

  useEffect(() => {
    localStorage.setItem("occ-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event) => setIsMobileViewport(event.matches);
    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileSidebarOpen(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    if (isMobileViewport) {
      setMobileSidebarOpen(false);
    }
  }, [activeView, isMobileViewport]);

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
    if (createPeerType !== "administrator" || !adminTargetMode) {
      return;
    }

    const available = getAvailableAdminIPs(adminTargetMode);
    const currentValidation = getAdminIPValidation(peerForm.assignedIP, adminTargetMode);
    if (currentValidation) {
      setAdminAssignedIPError(currentValidation);
    } else {
      setAdminAssignedIPError("");
    }
    if (!peerForm.assignedIP && available.length > 0) {
      setPeerForm((current) => ({ ...current, assignedIP: available[0] }));
    }
  }, [createPeerType, adminTargetMode, state.peers, peerForm.assignedIP]);

  useEffect(() => {
    setCreatePeerFeedback(emptyCreatePeerFeedback);
    setError("");
    if (createPeerType === "site") {
      setManagedByAutomation(true);
      setAdminTargetMode("");
      setAdminAssignedIPError("");
      setPeerForm((current) => ({ ...current, name: "", assignedIP: "", allowedIPs: "0.0.0.0/0" }));
    }
    if (createPeerType === "administrator") {
      setManagedByAutomation(false);
      setSiteBrand("");
      setSiteLocation("");
      setAdminAssignedIPError("");
      setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    }
  }, [createPeerType]);

  async function restoreSession() {
    setAuthChecking(true);

    try {
      const { response, data } = await getSession();

      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const nextUser = data.username || data.user || "admin";
      setLoggedInUser(nextUser);
      setLoggedInName(data.name || nextUser || "Administrator");
      setLoggedInNIK(data.nik || "");
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
      const { response, data } = await loginAPI(loginForm);

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      const nextUser = data.username || data.user || loginForm.username;
      const nextNIK = data.nik || (/^[0-9]{6}$/.test(nextUser) ? nextUser : "");
      setLoggedInUser(nextUser);
      setLoggedInName(data.name || nextUser);
      setLoggedInNIK(nextNIK);
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
      const { response, data } = await getState();
      if (response.status === 401) {
        setIsAuthenticated(false);
        throw new Error("Session expired. Please login again.");
      }

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
      const { response, data } = await getDashboardHealth();

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
    const isSitePeer = createPeerType === "site";
    const peerName = peerForm.name.trim();
    const sitePeerName = generatedSiteName();

    setError("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);

    if (isSitePeer && !sitePeerName) {
      setCreatePeerFeedback({
        type: "error",
        title: "Site Name Required",
        message: "Fill in Brand / Site Type and Location before creating a site peer.",
        peer: null,
      });
      return;
    }

    if (!isSitePeer && !adminTargetMode) {
      setCreatePeerFeedback({
        type: "error",
        title: "Target Server Required",
        message: "Select WG-ITS or WG-CCTV before creating an administrator peer.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isSitePeer && !peerName) {
      setCreatePeerFeedback({
        type: "error",
        title: "Name Required",
        message: "Name must use uppercase A-Z, numbers, and dashes only.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isSitePeer && !peerForm.assignedIP) {
      setCreatePeerFeedback({
        type: "error",
        title: "Assigned IP Required",
        message: "Select one available IP before creating administrator peer.",
        peer: null,
        scope: "administrator",
      });
      return;
    }

    if (!isSitePeer) {
      const validationMessage = getAdminIPValidation(peerForm.assignedIP, adminTargetMode);
      if (validationMessage) {
        setAdminAssignedIPError(validationMessage);
        setCreatePeerFeedback({
          type: "error",
          title: "Invalid Assigned IP",
          message: validationMessage,
          peer: null,
          scope: "administrator",
        });
        return;
      }
      setAdminAssignedIPError("");
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
      const { response, data } = await createPeerAPI({
        peerType: createPeerType,
        managed: managedByAutomation,
        ...peerForm,
        name: isSitePeer ? sitePeerName : `Administrator-${peerName}`,
        publicKey: isSitePeer ? peerForm.publicKey : (peerForm.publicKey || generatePseudoPublicKey()),
        keepalive: Number(peerForm.keepalive),
        purpose: adminPurpose,
        targetServer: adminTargetMode,
      });

      if (!response.ok) {
        throw new Error(data.error || "Failed to create peer");
      }

      setState(data.state);
      setPeerForm(emptyPeer);
      setSiteBrand("");
      setSiteLocation("");
      setCreatePeerFeedback({
        type: "success",
        title: isSitePeer ? "Peer Created" : "Administrator Peer Created",
        message: isSitePeer
          ? "Site peer has been provisioned on WireGuard servers."
          : "Administrator profile has been provisioned on selected server.",
        peer: data.peer
          ? {
              ...data.peer,
              _scope: isSitePeer ? "site" : "administrator",
              _targetServer: adminTargetMode,
              _purpose: adminPurpose,
            }
          : null,
        scope: isSitePeer ? "site" : "administrator",
      });

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
      const { response, data } = await deletePeerAPI(id);

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
      const { response, data } = await getMonitoring();

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
      const { response, data } = await getWGServerDiagnostics();

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
      const { response, data } = await listUsers();

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
      const { response, data } = await listLogs(category);

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
    const validationErrors = validateUserForm(userForm);
    setUserFormErrors(validationErrors);
    if (validationErrors.name || validationErrors.nik) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { response, data } = await createUserAPI(userForm);

      if (response.status === 403) {
        throw new Error("Administrator access required.");
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUserForm(emptyUserForm);
      setUserFormErrors(emptyUserFormErrors);
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
    const validationErrors = validateUserForm(editUserForm);
    setEditUserFormErrors(validationErrors);
    if (validationErrors.name || validationErrors.nik) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { response, data } = await updateUserAPI(editingUsername, editUserForm);

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

  function getAvailableAdminIPs(serverID) {
    return availableAdminIPsFor(state.peers, serverID);
  }

  function getAdminIPValidation(ipValue, serverID) {
    return validateAdminIP(ipValue, serverID, state.peers);
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

  function generatedSiteName() {
    const brand = normalizeSiteSegment(siteBrand);
    const location = normalizeSiteSegment(siteLocation);

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
    setManagedByAutomation(createPeerType === "site");
    if (createPeerType === "administrator") {
      setPeerForm((current) => ({ ...current, allowedIPs: "" }));
    }
    setSiteBrand("");
    setSiteLocation("");
    setAdminTargetMode("");
    setAdminPurpose("user-admin");
    setAdminAssignedIPError("");
    setCreatePeerFeedback(emptyCreatePeerFeedback);
    setError("");
  }

  function updateUserField(event) {
    const { name, value } = event.target;
    const nextValue = normalizeUserField(name, value);
    setUserForm((current) => ({ ...current, [name]: nextValue }));
    if (name === "name" || name === "nik") {
      setUserFormErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  function updateEditUserField(event) {
    const { name, value } = event.target;
    const nextValue = normalizeUserField(name, value);
    setEditUserForm((current) => ({ ...current, [name]: nextValue }));
    if (name === "name" || name === "nik") {
      setEditUserFormErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  async function logout() {
    try {
      await logoutAPI();
    } catch {
      // Ignore logout transport failures and clear local UI state anyway.
    } finally {
      setIsAuthenticated(false);
      setLoggedInUser("admin");
      setLoggedInName("Administrator");
      setLoggedInNIK("000000");
      setLoggedInRole("administrator");
      setLoginForm(initialLogin);
      setLoginError("");
      setError("");
      setUsers([]);
      setUserForm(emptyUserForm);
      setUserFormErrors(emptyUserFormErrors);
      setEditUserForm(emptyUserForm);
      setEditUserFormErrors(emptyUserFormErrors);
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
    if (role === "superadmin") {
      return "Superadmin";
    }
    if (role === "administrator") {
      return "Administrator";
    }
    return "Support";
  }

  function isSitePeerRecord(peer) {
    const peerType = String(peer?.type || "").trim().toLowerCase();
    return peerType === "site" || peerType === "outlet" || Array.isArray(peer?.assignments);
  }

  function peerManagementStatus(peer) {
    if (typeof peer?.managed === "boolean") {
      return peer.managed ? "managed" : "unmanaged";
    }
    if (isSitePeerRecord(peer)) {
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
      setEditUserFormErrors(emptyUserFormErrors);
      return;
    }

    setEditingUsername(user.username || "");
    setEditUserForm({
      name: user.name || "",
      nik: user.nik || "",
      password: "",
      role: user.role || "support",
    });
    setEditUserFormErrors(emptyUserFormErrors);
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
    const siteLabel = mode === "site"
      ? (generatedSiteName() || "BRAND-LOCATION")
      : (peerForm.name.trim() || "Administrator Peer");
    const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
    if (mode === "administrator") {
      return [
        { label: "Target", value: selectedTargetServer?.label || "Select server", meta: selectedTargetServer?.pool || "Required first" },
        { label: "Identity", value: siteLabel || "Administrator Peer", meta: "Manual input" },
        { label: "Assigned IP", value: peerForm.assignedIP.trim() || selectedTargetServer?.pool || "10.x.x.x", meta: "Single profile" },
        { label: "Output", value: "CONF", meta: "Downloadable" },
      ];
    }

    return [
      { label: "Site", value: siteLabel, meta: "Site Peer" },
      { label: "WG-ITS", value: "10.21.x.x", meta: "Auto assign" },
      { label: "WG-CCTV", value: "10.22.x.x", meta: "Auto assign" },
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
    const peerID = encodeURIComponent(peer.id);

    if (configArtifact?.id) {
      return `/api/peers/${peerID}/artifacts/${encodeURIComponent(configArtifact.id)}`;
    }

    return `/api/peers/${peerID}/config`;
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

  function siteConfigLinks(peer) {
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
          href: `/api/peers/${encodeURIComponent(peer.id)}/artifacts/${encodeURIComponent(artifact.id)}`,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  function siteAssignmentSummary(peer) {
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
      case "dashboard":
        return <DashboardView state={state} dashboardHealth={dashboardHealth} buildDashboardSparkline={buildDashboardSparkline} />;
      case "monitoring":
        return (
          <MonitoringView
            monitoring={monitoring}
            monitoringRefreshMs={monitoringRefreshMs}
            monitorSearch={monitorSearch}
            setMonitorSearch={setMonitorSearch}
            monitorFilter={monitorFilter}
            setMonitorFilter={setMonitorFilter}
            monitorSort={monitorSort}
            setMonitorSort={setMonitorSort}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            extractMetricItems={extractMetricItems}
            extractMonitoringItems={extractMonitoringItems}
            buildMetricGroups={buildMetricGroups}
            buildMetricBars={buildMetricBars}
            monitoringStatus={monitoringStatus}
          />
        );
      case "createPeer":
        {
        const feedbackPeer = createPeerFeedback.peer;
        const feedbackSummary = createFeedbackSummary(feedbackPeer);
        const flowSteps = createFlowSteps(createPeerType);
        const selectedTargetServer = adminTargetOptions.find((item) => item.id === adminTargetMode);
        const adminSuggestions = adminTargetMode ? getAvailableAdminIPs(adminTargetMode) : [];
        const adminDownloads = administratorDownloadLinks(feedbackPeer);
        const siteSummary = siteAssignmentSummary(feedbackPeer);
        const siteDownloads = siteConfigLinks(feedbackPeer);
        const adminValidationMessage = createPeerType === "administrator" && adminTargetMode
          ? getAdminIPValidation(peerForm.assignedIP, adminTargetMode)
          : "";
        const adminIsReady = adminTargetMode !== ""
          && peerForm.name.trim() !== ""
          && adminPurpose !== ""
          && peerForm.assignedIP !== ""
          && adminValidationMessage === "";

        return (
          <section className="panel create-peer-panel">
            <div className="peer-tablist" role="tablist" aria-label="Select peer type">
              <button
                id="tab-site-peer"
                type="button"
                role="tab"
                className={`peer-tab${createPeerType === "site" ? " active" : ""}`}
                onClick={() => setCreatePeerType("site")}
                aria-selected={createPeerType === "site"}
                aria-controls="create-peer-form"
              >
                <span className="peer-tab-title">Site Peer</span>
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
              {createPeerType === "site"
                ? "Auto-provision to WG-ITS and WG-CCTV"
                : "Single profile → .conf download"}
            </p>

            {createPeerFeedback.type && (createPeerFeedback.scope === createPeerType || createPeerFeedback.scope === "") ? (
              <section className={`create-feedback-banner ${createPeerFeedback.type}`} aria-live="polite">
                <div className="create-feedback-main">
                  <strong>{createPeerFeedback.type === "success" ? "✅ " : "⚠ "} {createPeerFeedback.title}</strong>
                  <p>{createPeerFeedback.message}</p>
                </div>
                {createPeerFeedback.type === "success" && createPeerType === "site" && feedbackPeer ? (
                  <div className="create-feedback-body site-feedback-body">
                    <div className="create-feedback-summary site-feedback-summary">
                      <div className="site-feedback-cards">
                        {siteSummary.map((item) => (
                          <div className="create-feedback-chip site-feedback-chip" key={`${item.label}-${item.value}`}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="create-feedback-actions">
                      {siteDownloads.map((item) => (
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

            <form id="create-peer-form" className="settings-form create-peer-form" onSubmit={createPeer} role="tabpanel" aria-labelledby={createPeerType === "site" ? "tab-site-peer" : "tab-admin-peer"}>
              {createPeerType === "administrator" ? (
                <>
                  <section className="form-section">
                    <div className="form-section-head">
                      <strong>Step 1 · Target Server</strong>
                      <span>Select WG-ITS or WG-CCTV</span>
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
                      <span>Input administrator IP inside allowed range</span>
                    </div>
                    <div className="create-peer-form-grid admin-layout">
                      <label className="create-peer-field create-peer-field-wide">
                        Assigned IP
                        <input
                          name="assignedIP"
                          value={peerForm.assignedIP}
                          onChange={(event) => {
                            const nextValue = String(event.target.value || "").replace(/[^0-9.]/g, "");
                            setPeerForm((current) => ({ ...current, assignedIP: nextValue }));
                            if (adminTargetMode) {
                              setAdminAssignedIPError(getAdminIPValidation(nextValue, adminTargetMode));
                            } else {
                              setAdminAssignedIPError("");
                            }
                          }}
                          required
                          disabled={saving}
                          placeholder={adminTargetMode ? (adminTargetMode === "wg-its" ? "10.21.3.10" : "10.22.3.10") : "Select target server first"}
                          inputMode="numeric"
                          pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$"
                        />
                        <small className="field-helper">{adminRangeLabel(adminTargetMode)}</small>
                        {(adminAssignedIPError || adminValidationMessage) ? (
                          <small className="field-error">{adminAssignedIPError || adminValidationMessage}</small>
                        ) : null}
                        {adminTargetMode ? (
                          <div className="ip-suggestion-list" aria-label="Suggested available IPs">
                            {adminSuggestions.map((ip) => (
                              <button
                                type="button"
                                key={ip}
                                className="ip-suggestion-chip"
                                onClick={() => {
                                  setPeerForm((current) => ({ ...current, assignedIP: ip }));
                                  setAdminAssignedIPError("");
                                }}
                                disabled={saving}
                              >
                                {ip}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </label>
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
                          {adminTargetMode
                            ? `${adminSuggestions.length} suggested free IPs`
                            : "Choose target server to load IP suggestions"}
                        </small>
                      </div>
                    </div>
                  </section>

                </>
              ) : (
                <div className="create-peer-form-grid">
                  <label className="create-peer-field">
                    Brand / Site Type
                    <input
                      value={siteBrand}
                      onChange={(event) => setSiteBrand(normalizeSiteSegment(event.target.value))}
                      pattern="[A-Z0-9]+"
                      inputMode="text"
                      required
                      disabled={saving}
                      placeholder="LIVEHOUSE"
                    />
                    <small className="field-helper">Use uppercase letters A-Z and numbers 0-9 only.</small>
                  </label>
                  <label className="create-peer-field">
                    Location
                    <input
                      value={siteLocation}
                      onChange={(event) => setSiteLocation(normalizeSiteSegment(event.target.value))}
                      pattern="[A-Z0-9]+"
                      inputMode="text"
                      required
                      disabled={saving}
                      placeholder="KEMANG"
                    />
                    <small className="field-helper">Use uppercase letters A-Z and numbers 0-9 only.</small>
                  </label>
                  <label className="create-peer-field create-peer-field-wide">
                    Generated Site Name
                    <input
                      value={generatedSiteName() || "BRAND-LOCATION"}
                      readOnly
                      disabled={saving}
                    />
                    <small className="field-helper">Final site name is generated automatically as `BRAND-LOCATION`.</small>
                  </label>
                </div>
              )}

              <section className="form-section">
                <div className="form-section-head">
                  <strong>Automation</strong>
                  <span>Set automation ownership for this peer</span>
                </div>
                <label className="create-peer-field create-peer-field-wide checkbox-field">
                  <span>
                    <input
                      type="checkbox"
                      checked={managedByAutomation}
                      onChange={(event) => setManagedByAutomation(event.target.checked)}
                      disabled={saving}
                    />
                    {" "}Managed by automation
                  </span>
                  {createPeerType === "site" ? (
                    <small className="field-helper">For site peers, unmanaged mode is blocked for safety.</small>
                  ) : (
                    <small className="field-helper">Administrator peers can be managed or unmanaged.</small>
                  )}
                </label>
              </section>

              <section className="flow-card">
                <div className="flow-card-head">
                  <strong>{createPeerType === "site" ? "Flow Site Peer" : "Flow Administrator Peer"}</strong>
                  <span>{createPeerType === "site" ? "Auto-generated assignments" : "Manual profile creation"}</span>
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
                <p className="site-flow-note">
                  {createPeerType === "site"
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
          const sitePeers = state.peers.filter((peer) => isSitePeerRecord(peer) && peerMatchesSearch(peer, removeSearch));
          const administratorPeers = state.peers.filter((peer) => !isSitePeerRecord(peer) && peerMatchesSearch(peer, removeSearch));

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
                    <h3>Site Peers</h3>
                    <span>Dual-server sites mapped to `wg-its` and `wg-cctv`</span>
                  </div>
                  {sitePeers.length === 0 ? (
                    <div className="empty">No site peers found.</div>
                  ) : (
                    <div className="peer-list">
                      {sitePeers.map((peer) => {
                        const wgIts = assignmentFor(peer, "wg-its");
                        const wgCctv = assignmentFor(peer, "wg-cctv");
                        const managementStatus = peerManagementStatus(peer);
                        return (
                          <article className="peer-card" key={peer.id}>
                            <div>
                              <div className="inventory-card-head">
                                <h3>{peer.siteName || peer.name}</h3>
                                <span className={`inventory-pill inventory-${managementStatus}`}>
                                  {managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}
                                </span>
                              </div>
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
                      {administratorPeers.map((peer) => {
                        const managementStatus = peerManagementStatus(peer);
                        return (
                        <article className="peer-card" key={peer.id}>
                          <div>
                            <div className="inventory-card-head">
                              <h3>{peer.name}</h3>
                              <span className={`inventory-pill inventory-${managementStatus}`}>
                                {managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}
                              </span>
                            </div>
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
                        );
                      })}
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
                Status managed/unmanaged diambil dari field `managed` peer dengan fallback aman untuk data lama.
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
                              {managementStatus === "managed" ? "MANAGED" : "UNMANAGED"}
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
                                        <a className="ghost" href={`/api/peers/${encodeURIComponent(peer.id)}/artifacts/${encodeURIComponent(artifact.id)}`} key={`${peer.id}-${artifact.id}`}>
                                          {artifact.kind.toUpperCase()}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <a className="ghost" href={`/api/peers/${encodeURIComponent(peer.id)}/config`}>
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
                        <span>{item.actorName || item.actor || "-"}</span>
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
                        <span>By {item.actorName || item.actor || "-"}</span>
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
                Name <span className="required-indicator">*</span>
                <input
                  name="name"
                  value={userForm.name}
                  onChange={updateUserField}
                  pattern="[A-Za-z]+"
                  title="Letters only, no spaces"
                  aria-invalid={userFormErrors.name ? "true" : "false"}
                  required
                />
                {userFormErrors.name ? <small className="field-error">{userFormErrors.name}</small> : null}
              </label>
              <label>
                NIK (6 digits) <span className="required-indicator">*</span>
                <input
                  name="nik"
                  value={userForm.nik}
                  onChange={updateUserField}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  title="Exactly 6 digits"
                  aria-invalid={userFormErrors.nik ? "true" : "false"}
                  required
                />
                {userFormErrors.nik ? <small className="field-error">{userFormErrors.nik}</small> : null}
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
                  <option value="superadmin">Superadmin</option>
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
                    Name <span className="required-indicator">*</span>
                    <input
                      name="name"
                      value={editUserForm.name}
                      onChange={updateEditUserField}
                      pattern="[A-Za-z]+"
                      title="Letters only, no spaces"
                      aria-invalid={editUserFormErrors.name ? "true" : "false"}
                      required
                    />
                    {editUserFormErrors.name ? <small className="field-error">{editUserFormErrors.name}</small> : null}
                  </label>
                  <label>
                    NIK (6 digits) <span className="required-indicator">*</span>
                    <input
                      name="nik"
                      value={editUserForm.nik}
                      onChange={updateEditUserField}
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      title="Exactly 6 digits"
                      aria-invalid={editUserFormErrors.nik ? "true" : "false"}
                      required
                      disabled={users.find((user) => user.username === editingUsername)?.builtIn}
                    />
                    {editUserFormErrors.nik ? <small className="field-error">{editUserFormErrors.nik}</small> : null}
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
                      <option value="superadmin">Superadmin</option>
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
      <TopBar
        theme={theme}
        toggleTheme={toggleTheme}
        handleTopRefresh={handleTopRefresh}
        saving={saving}
        loading={loading}
        monitoringLoading={monitoring.loading}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        loggedInName={loggedInName}
        loggedInNIK={loggedInNIK}
        loggedInUser={loggedInUser}
        loggedInRole={loggedInRole}
        logout={logout}
        onOpenMobileMenu={() => setMobileSidebarOpen(true)}
      />

      <div className={`workspace${!isMobileViewport && !sidebarExpanded ? " sidebar-collapsed" : ""}${isMobileViewport ? " mobile-workspace" : ""}`}>
        <SideNav
          activeView={activeView}
          setActiveView={setActiveView}
          isAdministrator={isAdministrator}
          users={users}
          editingUsername={editingUsername}
          selectUserForEdit={selectUserForEdit}
          sidebarGroupsOpen={sidebarGroupsOpen}
          toggleSidebarGroup={toggleSidebarGroup}
          showSidebarLabels={showSidebarLabels}
          isMobileViewport={isMobileViewport}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          sidebarExpanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />

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
