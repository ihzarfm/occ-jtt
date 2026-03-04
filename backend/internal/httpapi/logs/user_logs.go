package logs

import "occ-jtt/backend/internal/store"

func publicLogs(items []store.AuditLog) []map[string]any {
	result := make([]map[string]any, len(items))
	for i, item := range items {
		result[i] = map[string]any{
			"id":        item.ID,
			"category":  item.Category,
			"action":    item.Action,
			"actor":     item.Actor,
			"actorName": item.ActorName,
			"target":    item.Target,
			"message":   item.Message,
			"createdAt": item.CreatedAt,
		}
	}
	return result
}
