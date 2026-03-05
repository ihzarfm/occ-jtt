import { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import SideNav from "../components/SideNav";
import { isAdminRole, viewLabels } from "../utils/format";
import { getSession, login as loginAPI, logout as logoutAPI } from "../api/session";
import LoginView from "./LoginView";
import DashboardView from "./DashboardView";
import MonitoringView from "./MonitoringView";
import CreatePeerView from "./CreatePeerView";
import InventoryPeerView from "./InventoryPeerView";
import LogsView from "./LogsView";
import UsersView from "./UsersView";
import SettingsView from "./SettingsView";

const initialLogin = { username: "", password: "" };

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
  const [sidebarGroupsOpen, setSidebarGroupsOpen] = useState({
    wireguard: true,
    logs: true,
    mikrotik: true,
    userManagement: true,
  });

  const isAdministrator = isAdminRole(loggedInRole);
  const isSuperadmin = String(loggedInRole || "").toLowerCase() === "superadmin";
  const showSidebarLabels = isMobileViewport || sidebarExpanded;

  useEffect(() => {
    localStorage.setItem("occ-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
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
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    if (isMobileViewport) setMobileSidebarOpen(false);
  }, [activeView, isMobileViewport]);

  useEffect(() => {
    const restoreSession = async () => {
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
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (isAdministrator) return;
    if (!["dashboard", "monitoring", "createPeer"].includes(activeView)) {
      setActiveView("createPeer");
    }
  }, [activeView, isAdministrator]);

  useEffect(() => {
    if (activeView === "settings" && !isSuperadmin) {
      setActiveView("dashboard");
    }
  }, [activeView, isSuperadmin]);

  const updateLoginField = (event) => {
    const { name, value } = event.target;
    setLoginForm((current) => ({ ...current, [name]: value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const { response, data } = await loginAPI(loginForm);
      if (!response.ok) throw new Error(data.error || "Login failed");

      const nextUser = data.username || data.user || loginForm.username;
      const nextNIK = data.nik || (/^[0-9]{6}$/.test(nextUser) ? nextUser : "");
      setLoggedInUser(nextUser);
      setLoggedInName(data.name || nextUser);
      setLoggedInNIK(nextNIK);
      setLoggedInRole(data.role || "administrator");
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message);
      setIsAuthenticated(false);
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutAPI();
    } catch {
      // ignore transport logout error
    } finally {
      setIsAuthenticated(false);
      setLoggedInUser("admin");
      setLoggedInName("Administrator");
      setLoggedInNIK("000000");
      setLoggedInRole("administrator");
      setLoginForm(initialLogin);
      setLoginError("");
      setActiveView("dashboard");
      setUserMenuOpen(false);
    }
  };

  const toggleTheme = () => setTheme((current) => (current === "light" ? "dark" : "light"));

  const toggleSidebarGroup = (groupName) => {
    setSidebarGroupsOpen((current) => ({ ...current, [groupName]: !current[groupName] }));
  };

  const handleTopRefresh = async () => {
    window.dispatchEvent(new Event("occ-refresh-current-view"));
  };

  const renderMainContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView active />;
      case "monitoring":
        return <MonitoringView active />;
      case "createPeer":
        return <CreatePeerView active isAdministrator={isAdministrator} onNavigate={setActiveView} />;
      case "removePeer":
      case "updatePeer":
      case "inventoryPeer":
      case "checkServerConnection":
        return <InventoryPeerView active mode={activeView} isAdministrator={isAdministrator} />;
      case "wireguardLogs":
        return <LogsView active mode="wireguard" />;
      case "mikrotikLogs":
        return <LogsView active mode="mikrotik" />;
      case "userLogs":
        return <LogsView active mode="user" />;
      case "userList":
        return <UsersView active mode="list" />;
      case "createUser":
        return <UsersView active mode="create" />;
      case "updateUser":
        return <UsersView active mode="update" />;
      case "settings":
        return <SettingsView active />;
      case "mikrotikSsh":
      case "mikrotikAutomation":
      case "mikrotikCheckIsp":
        return (
          <section className="panel">
            <div className="panel-head">
              <h2>{viewLabels[activeView]}</h2>
              <span>Not implemented yet</span>
            </div>
            <div className="placeholder-panel">
              <strong>Not implemented yet</strong>
              <p>Feature ini belum diimplementasikan.</p>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        theme={theme}
        toggleTheme={toggleTheme}
        authChecking={authChecking}
        loginForm={loginForm}
        updateLoginField={updateLoginField}
        handleLogin={handleLogin}
        loginLoading={loginLoading}
        loginError={loginError}
      />
    );
  }

  return (
    <main className="app-theme app-layout" data-theme={theme}>
      <TopBar
        theme={theme}
        toggleTheme={toggleTheme}
        handleTopRefresh={handleTopRefresh}
        saving={false}
        loading={false}
        monitoringLoading={false}
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
          isSuperadmin={isSuperadmin}
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
              {activeView === "createPeer" ? <p className="create-peer-subtitle">WireGuard Client</p> : null}
            </div>
            {activeView === "dashboard" ? <div className="dashboard-header-note">Auto refresh every 5 minutes</div> : null}
          </section>
          {renderMainContent()}
        </section>
      </div>
    </main>
  );
}
