import { apiRequest } from "./client";

export function getMonitoring() {
  return apiRequest("/api/monitoring", { method: "GET" });
}

export function getWGServerDiagnostics() {
  return apiRequest("/api/wg-servers/diagnostics", { method: "GET" });
}
