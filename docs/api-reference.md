# API Reference

Base URL (default): `http://localhost:8080`

## Auth and Session

### POST `/api/login`
- Description: Login user dan membuat session cookie `occ_session`.
- Auth: Public.
- Request example:
```json
{
  "username": "admin",
  "password": "123123"
}
```
- Response example (200):
```json
{
  "message": "login successful",
  "user": "admin",
  "name": "Administrator",
  "role": "administrator"
}
```
- Internal logic summary:
  - Decode payload login
  - Validasi non-empty
  - `store.Authenticate`
  - Generate session ID, simpan di memory map
  - Set cookie HTTP-only

### GET `/api/session`
- Description: Check session aktif.
- Auth: Session required.
- Response example (200):
```json
{
  "user": "admin",
  "name": "Administrator",
  "role": "administrator"
}
```
- Internal logic summary: baca cookie -> lookup map `sessions`.

### POST `/api/logout`
- Description: Hapus session aktif.
- Auth: Session optional.
- Response example (200):
```json
{
  "message": "logout successful"
}
```
- Internal logic summary: remove session map entry + expire cookie.

## Health and State

### GET `/api/healthz`
- Description: Liveness endpoint.
- Auth: Public.
- Method behavior note: handler tidak membatasi method; semua method akan mendapat response health yang sama.
- Response example:
```json
{
  "status": "ok",
  "time": "2026-03-05T13:00:00Z"
}
```
- Internal logic summary: return status + UTC timestamp.

### GET `/api/state`
- Description: Ambil state publik (`network`, `peers`).
- Auth: Session required.
- Response example:
```json
{
  "network": {
    "interfaceName": "control-node",
    "serverAddress": "managed-remotely",
    "listenPort": 51820,
    "serverPublicKey": "replace-with-managed-server-public-key",
    "dns": ""
  },
  "peers": []
}
```
- Internal logic summary: `store.GetState()` lalu filter field publik.

## Dashboard and Monitoring

### GET `/api/dashboard/health`
- Description: Health ringkas internet/WG host/gateway berbasis ping latency.
- Auth: Session required.
- Response example:
```json
{
  "items": [
    {"id":"internet","label":"google.com","target":"google.com","status":"good","latencyMs":23.4,"checkedAt":"2026-03-05T13:00:00Z"},
    {"id":"stg-its","label":"stg-its","target":"192.168.22.254","status":"bad","error":"ping failed","checkedAt":"2026-03-05T13:00:00Z"}
  ],
  "checkedAt": "2026-03-05T13:00:00Z",
  "totalPeers": 12
}
```
- Internal logic summary:
  - Ping `google.com`
  - Ping host tiap WG server
  - Ping gateway host
  - Klasifikasi status good/bad

### GET `/api/monitoring`
- Description: Proxy monitoring dari `GATUS_API_URL`.
- Auth: Session required.
- Response example (JSON mode):
```json
{
  "results": []
}
```
- Response example (metrics mode):
```json
{
  "mode": "metrics",
  "source": "http://10.1.0.1:9090/metrics",
  "metrics": [
    {"metric":"gatus_results_total","value":"1","labels":{"group":"WG-CCTV"},"group":"WG-CCTV"}
  ]
}
```
- Internal logic summary:
  - GET external endpoint
  - Jika JSON valid -> pass-through payload
  - Jika metrics text -> parse line-by-line ke list metrics

## WireGuard Management

### PUT `/api/network`
- Description: Update network config global.
- Auth: Administrator.
- Request example:
```json
{
  "interfaceName": "control-node",
  "serverAddress": "managed-remotely",
  "listenPort": 51820,
  "serverPublicKey": "server-pub-key",
  "dns": "1.1.1.1"
}
```
- Response example (200):
```json
{
  "network": {"interfaceName":"control-node","serverAddress":"managed-remotely","listenPort":51820,"serverPublicKey":"server-pub-key","dns":"1.1.1.1"},
  "peers": []
}
```
- Internal logic summary: validate required fields -> `store.UpdateNetwork` -> append audit log.

### GET `/api/peers`
- Description: List peer dari state.
- Auth: Session required.
- Response: array `Peer`.
- Internal logic summary: return `store.GetState().Peers`.

### POST `/api/peers`
- Description: Create peer (site peer atau administrator peer).
- Auth: Session required.
- Request example (site peer):
```json
{
  "peerType": "site",
  "name": "CABIN-BOGOR"
}
```
- Request example (administrator peer):
```json
{
  "peerType": "administrator",
  "name": "Administrator-OPS",
  "publicKey": "base64key",
  "assignedIP": "10.22.0.10",
  "allowedIPs": "0.0.0.0/0",
  "keepalive": 25
}
```
- Response example:
```json
{
  "state": {"network": {}, "peers": []},
  "peer": {"id":"peer-123","name":"Site - CABIN-BOGOR"}
}
```
- Internal logic summary:
  - Jika `peerType` site/outlet -> `createSitePeer`
    - execute remote create script pada semua WG server
    - kumpulkan assignment + artifacts
    - simpan peer type `site`
  - Selain itu -> create administrator peer lokal
  - Append audit log category `wireguard`
- Request compatibility notes:
  - Frontend mengirim field tambahan seperti `targetServer` dan `purpose`; backend saat ini tidak memproses field tersebut.
  - Untuk site peer, backend tetap memakai script path legacy bernama `occ-wg-create-outlet`.

### DELETE `/api/peers/{id}`
- Description: Delete peer.
- Auth: Administrator.
- Response example:
```json
{
  "network": {},
  "peers": []
}
```
- Internal logic summary:
  - Ambil peer by id
  - Jika site peer -> remote remove script per assignment server
  - Hapus peer dari store
  - Append audit log

### GET `/api/peers/{id}/config`
- Description: Download generated WireGuard config text.
- Auth: Administrator.
- Response: `text/plain` attachment.
- Internal logic summary: render config via `wg.RenderPeerConfig(network, peer)`.

### GET `/api/peers/{id}/artifacts/{artifactId}`
- Description: Download artifact `.conf/.rsc` yang tersimpan di peer.
- Auth: Session required.
- Response: sesuai `artifact.contentType` (attachment).
- Internal logic summary: lookup peer -> lookup artifact -> stream content.

### GET `/api/diagnostics/peers`
- Description: Ping diagnostics per peer assignment.
- Auth: Administrator.
- Response example:
```json
{
  "items": [
    {"id":"peer1","name":"Site - CABIN-BOGOR","assignedIP":"10.22.0.12","target":"wg-its","status":"up","latencyMs":12.5,"checkedAt":"2026-03-05T13:00:00Z"}
  ],
  "checkedAt": "2026-03-05T13:00:00Z",
  "totalPeers": 5
}
```
- Internal logic summary: iterate peers -> ping target IP -> return up/down per target.

### GET `/api/wg-servers`
- Description: List konfigurasi server WG yang diketahui backend.
- Auth: Administrator.
- Response: array `WGServerConfig`.
- Internal logic summary: return `ListWGServers()`.

### GET `/api/wg-servers/diagnostics`
- Description: Cek ping + SSH handshake ke tiap server WG.
- Auth: Administrator.
- Response example:
```json
{
  "items": [
    {
      "id":"stg-cctv",
      "host":"192.168.21.254",
      "pingStatus":"up",
      "sshStatus":"up",
      "pingLatencyMs":5.2,
      "sshLatencyMs":86,
      "checkedAt":"2026-03-05T13:00:00Z"
    }
  ],
  "checkedAt":"2026-03-05T13:00:00Z"
}
```
- Internal logic summary: ping host + SSH `exit` command, map error/status.

## Logs

### GET `/api/logs?category=<wireguard|mikrotik|user>`
- Description: Ambil audit logs.
- Auth: Administrator.
- Request example:
`/api/logs?category=wireguard`
- Response example:
```json
[
  {
    "id": "wireguard-create-...",
    "category": "wireguard",
    "action": "create",
    "actor": "admin",
    "actorName": "Administrator",
    "target": "Site - CABIN-BOGOR",
    "message": "Created site peer Site - CABIN-BOGOR",
    "createdAt": "2026-03-05T13:00:00Z"
  }
]
```
- Internal logic summary: validasi kategori -> filter `store.ListLogs(category)`.

## User Management

### GET `/api/users`
- Description: List users.
- Auth: Administrator.
- Response: array user publik (tanpa password).
- Internal logic summary: `store.ListUsers()` -> map public fields.

### POST `/api/users`
- Description: Create user.
- Auth: Administrator.
- Request example:
```json
{
  "name": "Support A",
  "nik": "123456",
  "password": "secret",
  "role": "support"
}
```
- Response example (201):
```json
{
  "username": "123456",
  "name": "Support A",
  "nik": "123456",
  "role": "support",
  "builtIn": false,
  "createdAt": "2026-03-05T13:00:00Z",
  "updatedAt": "2026-03-05T13:00:00Z"
}
```
- Internal logic summary:
  - Validate input (`nik` 6 digit, role support/administrator)
  - Username diset dari NIK
  - `store.AddUser`
  - Append audit log category `user`

### PUT `/api/users/{username}`
- Description: Update user by username.
- Auth: Administrator.
- Request example:
```json
{
  "name": "Support A Updated",
  "nik": "123456",
  "password": "new-secret",
  "role": "support"
}
```
- Response: user publik updated.
- Internal logic summary:
  - Validate payload
  - `store.UpdateUser`
  - Built-in user punya proteksi field tertentu
  - Append audit log category `user`

## App Shell

### GET `/*` (non-API route)
- Description: Serve frontend static assets / SPA index.
- Auth: Public.
- Internal logic summary:
  - Serve file jika ada di `../frontend/dist`
  - Fallback ke `index.html`
  - Jika belum build, root `/` return fallback HTML sederhana.

## Placeholder Endpoints (Not Routed)
Module `mikrotik` memiliki handler placeholder (`HandleSSHAccess`, `HandleScriptUpdate`, `HandleCheckISP`) namun saat ini tidak diregistrasi di router, sehingga tidak punya route API aktif.
