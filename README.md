# occ-jtt

Web manager sederhana untuk mengelola peer WireGuard dengan:

- Backend Go (`backend/`) untuk API REST dan penyimpanan state ke JSON/PostgreSQL.
- Frontend React + Vite (`frontend/`) untuk panel administrasi.

## Fitur MVP

- Lihat dan ubah konfigurasi jaringan WireGuard dasar.
- Tambah dan hapus peer.
- Simpan state ke `backend/data/state.json` (default) atau PostgreSQL (`DATABASE_URL`).
- Unduh template file config client WireGuard per peer.

## Menjalankan semua service dengan satu command

```bash
bash dev.sh
```

Command ini akan menjalankan:

- Build frontend production (`frontend/dist`)
- Backend Go di `http://localhost:8080` (single entry)
- Storage state/account diarahkan ke `backups/state.json` lewat env `OCC_JTT_DATA` agar bisa ikut version control (GitHub).

Jika `frontend/node_modules` belum ada, install dulu:

```bash
cd frontend
npm install
```

Tekan `Ctrl+C` untuk menghentikan service.

## Sinkron akun/login lewat GitHub

Jika backend dijalankan lewat `bash dev.sh`, data user/login tersimpan ke file repo:

```text
backups/state.json
```

Jadi akun yang dibuat di laptop lokal bisa ikut ke commit/push dan dipakai login di mesin lain setelah pull.

Jika menjalankan backend manual, pastikan env ini ikut diset:

```bash
cd backend
OCC_JTT_DATA="../backups/state.json" go run .
```

## Menjalankan backend

```bash
cd backend
go run .
```

Server API akan berjalan di `http://localhost:8080`.

### Opsi storage PostgreSQL

Jika ingin pakai PostgreSQL, set `DATABASE_URL` sebelum menjalankan backend:

```bash
cd backend
DATABASE_URL='postgres://occjtt:password@localhost:5432/occ_jtt?sslmode=disable' go run .
```

Jika `DATABASE_URL` kosong, backend otomatis fallback ke JSON file `backend/data/state.json`.

Jika ingin menampilkan data monitoring dari Gatus, backend akan default membaca dari:

```text
http://10.1.0.1:9090/metrics
```

Kalau ingin diganti, set endpoint monitoring Gatus di environment variable `GATUS_API_URL` saat menjalankan backend:

```bash
cd backend
GATUS_API_URL="http://localhost:8088/api/v1/endpoints/statuses" go run .
```

Setelah itu frontend akan membaca data monitoring lewat endpoint internal:

```text
/api/monitoring
```

Jadi URL Gatus/metrics dimasukkan di backend, bukan langsung di frontend.

## Menjalankan frontend

```bash
cd frontend
npm install
npm run dev
```

UI akan berjalan di `http://localhost:5173` dan proxy ke backend.

## Menjalankan migrasi DB

Jika pakai PostgreSQL dan tool `migrate`:

```bash
migrate -path backend/migrations -database "$DATABASE_URL" up
```

## Catatan

- Implementasi ini mengelola metadata dan template config, belum mengeksekusi `wg`, `wg-quick`, atau menulis file sistem WireGuard host.
- Untuk production, tambahkan autentikasi, integrasi command WireGuard aktual, dan validasi key yang lebih ketat.
