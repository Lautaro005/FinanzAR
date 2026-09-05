-- Esquema de la base `finanzar` en Turso. Se aplica una sola vez (ya está
-- aplicado en producción); se deja acá como documentación y para recrearla.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,      -- siempre en minúsculas
  nombre        TEXT NOT NULL,
  password_hash TEXT NOT NULL,             -- scrypt$N$salt$hash (base64)
  sync_enabled  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash   TEXT PRIMARY KEY,           -- sha256 del token opaco; el token en claro solo lo tiene el navegador (cookie httpOnly)
  user_id      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

CREATE TABLE IF NOT EXISTS portfolios (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL,                -- JSON con la misma forma que el backup exportable (PortfolioBackup)
  updated_at TEXT NOT NULL
);

-- Intentos fallidos de login, para limitar fuerza bruta por email y por IP
-- (serverless no tiene memoria compartida entre invocaciones).
CREATE TABLE IF NOT EXISTS auth_attempts (
  id  INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,                       -- "email:<email>" o "ip:<ip>"
  at  INTEGER NOT NULL                     -- epoch ms
);
CREATE INDEX IF NOT EXISTS auth_attempts_key_idx ON auth_attempts(key, at);
