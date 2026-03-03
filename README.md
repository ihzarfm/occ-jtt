# occ-jtt

Web manager sederhana untuk mengelola peer WireGuard dengan:

- Backend Go (`backend/`) untuk API REST dan penyimpanan state ke JSON.
- Frontend React + Vite (`frontend/`) untuk panel administrasi.

## Fitur MVP

- Lihat dan ubah konfigurasi jaringan WireGuard dasar.
- Tambah dan hapus peer.
- Simpan state ke `backend/data/state.json`.
- Unduh template file config client WireGuard per peer.

## Menjalankan semua service dengan satu command

```bash
bash dev.sh
```

Command ini akan menjalankan:

- Backend Go di `http://localhost:8080`
- Frontend Vite di `http://localhost:5173`

Jika `frontend/node_modules` belum ada, install dulu:

```bash
cd frontend
npm install
```

Tekan `Ctrl+C` untuk menghentikan keduanya sekaligus.

## Menjalankan backend

```bash
cd backend
go run .
```

Server API akan berjalan di `http://localhost:8080`.

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

## Catatan

- Implementasi ini mengelola metadata dan template config, belum mengeksekusi `wg`, `wg-quick`, atau menulis file sistem WireGuard host.
- Untuk production, tambahkan autentikasi, integrasi command WireGuard aktual, dan validasi key yang lebih ketat.
