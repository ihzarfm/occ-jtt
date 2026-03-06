# App Core Module

## Purpose
`backend/internal/app` adalah layer komposisi aplikasi yang:
- load config environment
- inisialisasi storage
- inisialisasi default admin user
- wiring semua HTTP handler
- menyediakan middleware (CORS + request logging)
- menjalankan HTTP server

## Main Files
- `backend/internal/app/app.go`
- `backend/internal/app/legacy_helpers.go`

## Internal Logic

### Bootstrap
1. `ConfigFromEnv()` membaca config dari env.
2. `New(config)` memilih mode storage:
   - PostgreSQL jika `DATABASE_URL` ada
   - JSON file jika tidak ada
3. `EnsureUser` membuat/menjaga akun admin built-in.
4. `defaultWGServers()` menyiapkan mapping server WG default.

### HTTP Wiring
`Run()` membuat handler domain dan route:
- health, monitoring, state
- wireguard APIs
- user APIs
- logs APIs
- static app serving (`/`)

### Auth and Authorization
- Session store in-memory (`map[sessionID]User`)
- Cookie name: `occ_session`
- Helpers:
  - `withSession`
  - `withRole`
  - `requireRole`
  - `currentUser`

### Remote Command Bridge
`runRemoteScript()` menjalankan command remote via SSH:
- command format: `ssh ... sudo -n <scriptPath> --site <siteName>`
- parse output JSON menjadi `wireguard.RemoteScriptResult`
- normalize error jika output non-JSON atau command fail

## Dependencies
- `internal/config`
- `internal/db`
- `internal/store`
- `internal/httpapi/*`
- stdlib: `net/http`, `os/exec`, `sync`, dll

## Example Workflow
1. User login -> session cookie set.
2. User create site peer -> handler wireguard trigger remote script.
3. State disimpan ke store.
4. Audit log tercatat.
5. Frontend membaca state terbaru.
