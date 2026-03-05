# PR1 Superadmin Sanity Checklist

Use this checklist after deploying the PR.

- [ ] Create a user with role `superadmin` from `Create User` form or `POST /api/users`.
- [ ] Login as `superadmin` and verify session payload includes `role: superadmin`.
- [ ] Access admin-only pages (Server Connection, User List, Logs) as superadmin.
- [ ] Call `GET /api/users` as superadmin and verify response is `200`.
- [ ] Login as `support` and verify admin-only pages are hidden/blocked.
- [ ] Call `GET /api/users` as support and verify response is `403`.
