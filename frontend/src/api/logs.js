import { apiRequest } from "./client";

export function listLogs(category) {
  return apiRequest(`/api/logs?category=${category}`, { method: "GET" });
}
