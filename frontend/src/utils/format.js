export const viewLabels = {
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
  settings: "Settings",
};

export function roleLabel(role) {
  const current = String(role || "support").toLowerCase();
  if (current === "superadmin") {
    return "Superadmin";
  }
  if (current === "administrator") {
    return "Administrator";
  }
  return "Support";
}

export function isAdminRole(role) {
  const current = String(role || "").toLowerCase();
  return current === "administrator" || current === "superadmin";
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}
