CREATE TABLE IF NOT EXISTS occ_state (
  id SMALLINT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO occ_state (id, payload)
VALUES (
  1,
  '{"network":{"interfaceName":"wg0","serverAddress":"10.8.0.1/24","listenPort":51820,"serverPublicKey":"replace-with-server-public-key","dns":"1.1.1.1"},"peers":[],"users":[],"logs":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
