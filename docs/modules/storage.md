# Storage Module

## Purpose
`backend/internal/store` adalah single source of truth state runtime aplikasi.

## Supported Backends
- JSON file (`Store.path` + `saveLocked`)
- PostgreSQL (`Store.db` + `occ_state` JSONB)

## Key Responsibilities
- Persist and retrieve `State`
- Manage peers/users/logs/network
- Authentication lookup user/password
- Ensure admin user exists at startup
- Keep backward compatibility fields normalization

## Core Operations
- `GetState()`
- `UpdateNetwork()`
- `AddPeer()`, `DeletePeer()`, `GetPeer()`
- `ListUsers()`, `AddUser()`, `UpdateUser()`, `Authenticate()`, `EnsureUser()`
- `ListLogs()`, `AddLog()`

## PostgreSQL Runtime Strategy
- Auto create table `occ_state`
- Ensure row `id=1` exists
- Load full state JSONB
- Update menggunakan transaction + row lock (`FOR UPDATE`)

## File Mode Strategy
- In-memory state + RWMutex
- Persist ke JSON file setiap mutasi
- Auto create directory/file jika belum ada

## Concurrency
- File mode: guarded by `sync.RWMutex`
- Postgres mode: concurrency lewat DB transaction locking

## Data Integrity Behaviors
- Normalisasi state saat load (`peers/users/logs` nil -> empty slice)
- Built-in user restriction pada update
- Duplicate checks untuk username/NIK pada create/update user

## Dependencies
- stdlib: `database/sql`, `encoding/json`, `sync`, `time`

## Notes
- Password disimpan apa adanya (belum hashed).
- Store menggunakan model JSON aggregate, bukan relational join runtime.
