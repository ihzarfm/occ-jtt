import { apiRequest, jsonRequest } from "./client";

export function getSession() {
  return apiRequest("/api/session", { method: "GET" });
}

export function login(payload) {
  return jsonRequest("/api/login", "POST", payload);
}

export function logout() {
  return apiRequest("/api/logout", { method: "POST" });
}
