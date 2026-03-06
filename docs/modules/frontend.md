# Frontend Module

## Purpose
React SPA di `frontend/src/App.jsx` menyediakan admin UI untuk semua use case aplikasi.

## Main Files
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/styles.css`
- `frontend/vite.config.js`

## Navigation and Views
`activeView` mengatur halaman internal:
- `dashboard`
- `monitoring`
- `createPeer`
- `removePeer`
- `updatePeer` (placeholder)
- `inventoryPeer`
- `checkServerConnection`
- `wireguardLogs`, `mikrotikLogs`, `userLogs`
- `userList`, `createUser`, `updateUser`
- beberapa deprecated/placeholder views

## API Consumption
Frontend memanggil endpoint backend via `fetch` dengan `credentials: "same-origin"`.

Endpoint yang dipakai:
- `/api/session`, `/api/login`, `/api/logout`
- `/api/state`
- `/api/dashboard/health`
- `/api/monitoring`
- `/api/peers` + `/api/peers/{id}`
- `/api/peers/{id}/config`
- `/api/peers/{id}/artifacts/{artifactId}`
- `/api/wg-servers/diagnostics`
- `/api/logs?category=...`
- `/api/users`, `/api/users/{username}`

## Client-Side Behaviors
- Session restore saat mount (`GET /api/session`)
- Polling dashboard dan monitoring tiap `300_000 ms` saat view aktif
- Filtering/search untuk inventory/logs/users/monitoring
- Form validation untuk create peer dan user management
- Auto assignment recommendation untuk administrator peer IP ranges

## Role-Based UX
- Non-admin dibatasi ke view: dashboard, monitoring, createPeer
- Admin-only views disembunyikan/blocked di UI

## Placeholder Areas
UI memiliki section Mikrotik dan Update Peer yang belum didukung backend endpoint aktif.

## Build and Dev
- Dev server via Vite (`npm run dev`) di port `5173`
- Proxy `/api` ke `http://localhost:8080`
- Production build output: `frontend/dist`
