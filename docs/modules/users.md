# Users Module

## Purpose
`backend/internal/httpapi/users` mengelola user accounts dan audit logging user actions.

## Endpoints
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{username}`

Semua endpoint diproteksi role `administrator` di layer app routing.

## Internal Logic

### Validation Rules
- `name`: wajib
- `nik`: wajib 6 digit numerik
- `password`: wajib
- `role`: `support` atau `administrator`
- `username` dibuat dari `nik` pada create

### Create
- Normalisasi input
- `store.AddUser`
- Append audit log category `user`, action `create`

### Update
- Normalisasi input
- `store.UpdateUser`
- Built-in user memiliki pembatasan field (nik/role/username dipertahankan)
- Append audit log category `user`, action `update`

### Output Model
Response user tidak memuat password (public fields only).

## Dependencies
- `internal/store`
- audit callback dari app core

## Example Workflow
1. Admin submit create user form.
2. Backend validasi payload.
3. User disimpan dan timestamp set.
4. Audit log user create ditambahkan.
5. Frontend refresh list users.
