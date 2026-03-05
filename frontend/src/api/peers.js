import { apiRequest, jsonRequest } from "./client";

export function getState() {
  return apiRequest("/api/state", { method: "GET" });
}

export function getDashboardHealth() {
  return apiRequest("/api/dashboard/health", { method: "GET" });
}

export function createPeer(payload) {
  return jsonRequest("/api/peers", "POST", payload);
}

export function deletePeer(id) {
  return apiRequest(`/api/peers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
