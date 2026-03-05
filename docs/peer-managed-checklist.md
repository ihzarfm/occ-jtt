# Peer Managed Flag Sanity Checklist

- [ ] Create site/outlet peer without sending `managed` => stored with `managed=true` and remote automation runs.
- [ ] Create administrator peer without sending `managed` => stored with `managed=false`.
- [ ] Create administrator peer with `managed=true` => stored as managed.
- [ ] Create site/outlet peer with `managed=false` => request rejected with `400` and message `site peer with managed=false is not supported`.
- [ ] Delete site/outlet peer with `managed=false` => delete locally without remote remove execution.
- [ ] Load legacy peers without `managed` field => defaults are:
  - site/outlet or has assignments => `managed=true`
  - administrator peer without assignments => `managed=false`
- [ ] Inventory and remove views show `MANAGED` / `UNMANAGED` badge.
