# Monitoring Module

## Purpose
`backend/internal/httpapi/monitoring` bertindak sebagai proxy/adaptor ke monitoring source eksternal (Gatus endpoint).

## Endpoint
- `GET /api/monitoring` (session required)

## Internal Logic
1. Validate method GET.
2. Pastikan `GATUS_API_URL` tersedia.
3. Request HTTP ke endpoint monitoring.
4. Parse response:
   - Jika JSON content/valid JSON -> return parsed payload
   - Jika non-JSON -> parse sebagai metrics text format
5. Tangani non-2xx dari sumber dengan status `502 Bad Gateway` + payload diagnostik.

## Metrics Parsing
Untuk mode text metrics:
- split per line
- abaikan comment (`#`) dan line kosong
- ekstrak `metric`, `value`, `labels`
- labels juga dipromosikan ke top-level field item

## Dependencies
- stdlib `net/http`, `encoding/json`, `io`, `strings`

## Example Workflow
1. Frontend monitoring view aktif.
2. Frontend polling `/api/monitoring` periodik.
3. Backend fetch `GATUS_API_URL`.
4. Frontend render grouped cards berdasarkan payload.
