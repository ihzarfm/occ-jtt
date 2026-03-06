# Deployment

## Runtime Requirements

### Backend
- Go `1.22+`
- Linux environment
- Required commands untuk fitur penuh:
  - `ping`
  - `ssh` (untuk WG diagnostics & remote scripts)

### Frontend Build
- Node.js `20+` (direkomendasikan)
- `npm`

### Optional/Operational
- `systemd` (service management)
- `curl` (health check)
- `postgresql` (jika menggunakan mode DB)

## Environment Variables
Dibaca dari `backend/internal/config/config.go`.

- `PORT` (default `8080`)
- `OCC_JTT_DATA` (default `data/state.json`)
- `DATABASE_URL` (default kosong; kosong = file mode)
- `ADMIN_USERNAME` (default `admin`)
- `ADMIN_PASSWORD` (default `123123`)
- `GATUS_API_URL` (default `http://10.1.0.1:9090/metrics`)
- `DASHBOARD_GATEWAY_HOST` (default `10.1.0.1`)
- `STG_CCTV_SSH_KEY_PATH` (dipakai saat remote SSH)
- `STG_ITS_SSH_KEY_PATH` (dipakai saat remote SSH)

## Build

Dari root repo:

```bash
cd frontend
npm install
npm run build

cd ../backend
go build -o occ-jtt
```

## Run Locally

### One-command dev flow
Script `dev.sh` melakukan:
- frontend build
- backend test
- run backend (`go run .`)

```bash
bash dev.sh
```

### Manual run backend
```bash
cd backend
go run .
```

### Manual run with PostgreSQL
```bash
cd backend
DATABASE_URL='postgres://occjtt:password@127.0.0.1:5432/occ_jtt?sslmode=disable' go run .
```

## Staging/Production Pattern

Script `deploy.sh` melakukan:
- `git pull --ff-only` (opsional skip)
- `npm install` + `npm run build`
- `go build -o occ-jtt`
- `systemctl restart <SERVICE_NAME>`
- health/port checks

```bash
bash deploy.sh
```

Flags:
- `--skip-pull`
- `--skip-install`
- `--skip-healthcheck`

## systemd Notes
Repository tidak menyertakan unit file, tetapi `deploy.sh` mengasumsikan service bernama default `occ-jtt`.

Contoh command operasional:

```bash
sudo systemctl restart occ-jtt
sudo systemctl status occ-jtt --no-pager
sudo journalctl -u occ-jtt -n 50 --no-pager
```

## WireGuard Remote Script Deployment
Backend default memanggil path script remote:
- create: `/usr/local/bin/occ-wg-create-outlet`
- remove: `/usr/local/bin/occ-wg-remove-peer`

Repository menyediakan varian script per server di `server-scripts/`:
- `occ-wg-create-outlet-stg-cctv.sh`
- `occ-wg-remove-peer-stg-cctv.sh`
- `occ-wg-create-outlet-stg-its.sh`
- `occ-wg-remove-peer-stg-its.sh`

Umumnya, script ini perlu di-copy ke server WG target dengan nama command yang diharapkan backend.

## Required Access for Remote WG Execution
Agar create/delete site peer berhasil:

1. App server memiliki private SSH key yang valid.
2. Public key terdaftar di `authorized_keys` user remote (`raph` berdasarkan config default).
3. User remote dapat menjalankan script via `sudo -n` tanpa prompt password.
4. Dependencies di server WG tersedia:
   - `wg`, `wg-quick`, `jq`, `flock`, `awk`, `sed`, `mktemp`

## Verification Checklist

Setelah deploy:

```bash
curl http://127.0.0.1:8080/api/healthz
```

Validasi tambahan:
- login dari UI berhasil
- `GET /api/state` mengembalikan network + peers
- create/delete site peer berhasil (butuh koneksi ke WG server)
- `GET /api/wg-servers/diagnostics` menunjukkan status koneksi

## Frontend Serving Mode
- Frontend dev mode: `npm run dev` (Vite, proxy `/api` ke `localhost:8080`)
- Frontend production mode: backend melayani file dari `frontend/dist`
