# Logs Module

## Purpose
`backend/internal/httpapi/logs` menyediakan akses audit log yang tersimpan dalam state.

## Endpoint
- `GET /api/logs?category=<wireguard|mikrotik|user>`

## Internal Logic
1. Validate method GET.
2. Parse query `category` (lowercase trim).
3. Validasi category di whitelist.
4. Ambil data lewat `store.ListLogs(category)`.
5. Return public representation log.

## Allowed Categories
- `wireguard`
- `mikrotik`
- `user`
- kosong (`""`) = semua category

## Log Shape
Setiap log berisi:
- `id`
- `category`
- `action`
- `actor`
- `actorName`
- `target`
- `message`
- `createdAt`

## Producer of Logs
Audit log ditambahkan oleh modul lain via callback:
- wireguard create/delete/update network
- users create/update
- mikrotik belum aktif (placeholder)

## Dependencies
- `internal/store`

## Example Workflow
1. Admin buka WireGuard Logs view.
2. Frontend request `/api/logs?category=wireguard`.
3. Backend return entries terbaru (prepend order di store).
