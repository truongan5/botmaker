CREATE TABLE IF NOT EXISTS provider_keys (
  id TEXT PRIMARY KEY,
  vendor TEXT NOT NULL,
  secret_encrypted BLOB NOT NULL,
  label TEXT,
  tag TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  hostname TEXT UNIQUE NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  tags TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  key_id TEXT,
  status_code INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_provider_keys_vendor ON provider_keys(vendor);
CREATE INDEX IF NOT EXISTS idx_provider_keys_vendor_tag ON provider_keys(vendor, tag);
CREATE INDEX IF NOT EXISTS idx_bots_token_hash ON bots(token_hash);
CREATE INDEX IF NOT EXISTS idx_usage_log_bot_id ON usage_log(bot_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_at ON usage_log(created_at);
