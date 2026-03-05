import { apiRequest, jsonRequest } from "./client";

export function getSettings() {
  return apiRequest("/api/settings", { method: "GET" });
}

export function updateSettings(payload) {
  return jsonRequest("/api/settings", "PUT", payload);
}

export function testWGConnection(payload) {
  return jsonRequest("/api/settings/wg/test-connection", "POST", payload);
}
