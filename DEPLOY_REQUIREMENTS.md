# Deploy Requirements

Dokumen ini dipakai sebagai acuan saat menjalankan project `occ-jtt` di server baru, atau saat rebuild setelah `git pull`.

## Runtime Stack

### Backend

- Go: minimum `1.22`
- OS: Linux
- Binary output: `backend/occ-jtt`

Source:
- `backend/go.mod`

### Frontend

- Node.js: minimum `20.x` disarankan
- npm: mengikuti bawaan Node.js yang terpasang
- Build tool: Vite `5.4.21`

Alasan:
- Vite yang terpasang saat ini mensyaratkan Node `^18.0.0 || >=20.0.0`
- Untuk server baru, `20.x LTS` paling aman dan stabil

Source:
- `frontend/package-lock.json`

## Project Dependencies

Pastikan server punya:

- `git`
- `go` (`1.22+`)
- `node` (`20+` disarankan)
- `npm`
- `ping`

Opsional tapi umum dipakai:

- `systemd` untuk menjalankan backend sebagai service
- `curl` untuk health check

## Clone Di Server Baru

```bash
git clone https://github.com/USERNAME/REPO.git
cd REPO
```

## Build Setelah Clone Atau Setelah `git pull`

### 1. Update Source

Kalau repo sudah ada:

```bash
git pull
```

### 2. Build Frontend

```bash
cd frontend
npm install
npm run build
```

Catatan:
- Folder output frontend akan dibuat di `frontend/dist`
- Karena `frontend/dist/` ada di `.gitignore`, hasil build harus dibuat ulang di setiap server

### 3. Build Backend

```bash
cd ../backend
go build -o occ-jtt
```

Catatan:
- Binary hasil build akan ada di `backend/occ-jtt`

## Menjalankan Aplikasi

Jalankan backend dari folder `backend`:

```bash
cd backend
PORT=8080 \
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='ganti-password-kuat' \
GATUS_API_URL='http://10.1.0.1:9090/metrics' \
DASHBOARD_GATEWAY_HOST='10.1.0.1' \
./occ-jtt
```

## Environment Variables

Variable yang umum dipakai:

- `PORT`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `GATUS_API_URL`
- `DASHBOARD_GATEWAY_HOST`
- `OCC_JTT_DATA`

Contoh:

- `PORT=8080`
- `OCC_JTT_DATA=data/state.json`

## Quick Rebuild Checklist

Urutan cepat setiap habis update code:

```bash
git pull
cd frontend && npm install && npm run build
cd ../backend && go build -o occ-jtt
```

Kalau backend dijalankan sebagai service:

```bash
sudo systemctl restart occ-jtt
sudo systemctl status occ-jtt
```

## Verification

Setelah run:

```bash
curl http://127.0.0.1:8080/api/healthz
```

Kalau normal, response akan mengandung:

- `status: ok`

## Recommended Server Versions

Untuk server staging / production, rekomendasi aman:

- Go: `1.22.x`
- Node.js: `20.x LTS`
- npm: versi bawaan Node `20.x`

## Important Notes

- `backend/data/` di-ignore oleh git, jadi file state tidak ikut ke repo dan harus dibuat/diisi di server target bila dibutuhkan
- `frontend/node_modules/` dan `frontend/dist/` tidak ikut ke repo, jadi frontend selalu perlu `npm install` dan `npm run build`
- Kalau dependency frontend berubah, jalankan `npm install` lagi sebelum build
- Kalau dependency Go berubah, jalankan `go mod tidy` di mesin development lalu commit perubahan `go.mod` / `go.sum` bila ada
