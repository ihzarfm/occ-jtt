CREATE TABLE IF NOT EXISTS occ_state (
  id SMALLINT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO occ_state (id, payload)
VALUES (
  1,
  '{"network":{"interfaceName":"control-node","serverAddress":"managed-remotely","listenPort":51820,"serverPublicKey":"replace-with-managed-server-public-key","dns":""},"peers":[],"users":[],"logs":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
