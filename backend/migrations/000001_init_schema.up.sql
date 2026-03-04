CREATE TABLE wg_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  ssh_user TEXT NOT NULL,
  ssh_port INTEGER NOT NULL,
  key_path TEXT NOT NULL,
  wireguard_ip TEXT NOT NULL,
  interface_name TEXT NOT NULL,
  overlay_cidr TEXT NOT NULL,
  remote_wg_conf TEXT NOT NULL,
  default_endpoint TEXT NOT NULL,
  default_port INTEGER NOT NULL,
  create_script TEXT NOT NULL,
  remove_script TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nik TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  built_in BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE peers (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT '',
  site_name TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_by_name TEXT NOT NULL DEFAULT '',
  public_key TEXT NOT NULL,
  preshared_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keepalive INTEGER NOT NULL,
  assigned_ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE peer_allowed_ips (
  id BIGSERIAL PRIMARY KEY,
  peer_id TEXT NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  allowed_ip TEXT NOT NULL
);

CREATE TABLE peer_assignments (
  id BIGSERIAL PRIMARY KEY,
  peer_id TEXT NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  server_id TEXT NOT NULL REFERENCES wg_servers(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  interface_name TEXT NOT NULL,
  assigned_ip TEXT NOT NULL,
  overlay_cidr TEXT NOT NULL
);

CREATE TABLE peer_artifacts (
  id TEXT PRIMARY KEY,
  peer_id TEXT NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  server_id TEXT NOT NULL REFERENCES wg_servers(id) ON DELETE CASCADE,
  server_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  target TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_peer_allowed_ips_peer_id ON peer_allowed_ips(peer_id);
CREATE INDEX idx_peer_assignments_server_id ON peer_assignments(server_id);
CREATE INDEX idx_peer_assignments_peer_id ON peer_assignments(peer_id);
CREATE INDEX idx_peer_artifacts_server_id ON peer_artifacts(server_id);
CREATE INDEX idx_peer_artifacts_peer_id ON peer_artifacts(peer_id);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
