import { apiRequest, jsonRequest } from "./client";

export function listUsers() {
  return apiRequest("/api/users", { method: "GET" });
}

export function createUser(payload) {
  return jsonRequest("/api/users", "POST", payload);
}

export function updateUser(username, payload) {
  return jsonRequest(`/api/users/${username}`, "PUT", payload);
}
