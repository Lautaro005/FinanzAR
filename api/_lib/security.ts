// Utilidades de seguridad del backend de cuentas: hash de contraseñas,
// tokens de sesión opacos, cookies httpOnly, validación de entrada y
// límite de intentos. Sin dependencias externas (crypto nativo de Node).
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./db";

const scrypt = (password: string, salt: Buffer, keylen: number, N: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, { N, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  );

/* ---------------- Contraseñas (scrypt, salt por usuario) ---------------- */
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, SCRYPT_KEYLEN, SCRYPT_N);
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, nStr, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !nStr || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const N = Number(nStr);
  if (!Number.isInteger(N) || N < 1024 || N > 1 << 20) return false;
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, N);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/* ---------------- Sesiones (token opaco, hash en DB, cookie httpOnly) ---------------- */
export const SESSION_COOKIE = "finanzar_session";
export const SESSION_DAYS = 30;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newId = () => randomBytes(16).toString("hex");
export const nowISO = () => new Date().toISOString();

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await getDb().execute({
    sql: "INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
    args: [sha256(token), userId, now.toISOString(), expires.toISOString(), now.toISOString()],
  });
  return token;
}

export function setSessionCookie(res: VercelResponse, token: string | null) {
  const base = `${SESSION_COOKIE}=${token ?? ""}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  res.setHeader("Set-Cookie", token ? `${base}; Max-Age=${SESSION_DAYS * 86_400}` : `${base}; Max-Age=0`);
}

function readCookie(req: VercelRequest, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=") || null;
  }
  return null;
}

export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
  syncEnabled: boolean;
}

/** Usuario de la sesión actual (cookie), o null si no hay sesión válida. */
export async function getSessionUser(req: VercelRequest): Promise<SessionUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const db = getDb();
  const tokenHash = sha256(token);
  const rs = await db.execute({
    sql: `SELECT u.id, u.email, u.nombre, u.sync_enabled, s.expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`,
    args: [tokenHash],
  });
  const row = rs.rows[0];
  if (!row) return null;
  if (String(row.expires_at) < nowISO()) {
    await db.execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [tokenHash] });
    return null;
  }
  // last_seen se actualiza sin esperar (no bloquea la respuesta).
  db.execute({ sql: "UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?", args: [nowISO(), tokenHash] }).catch(() => {});
  return {
    id: String(row.id),
    email: String(row.email),
    nombre: String(row.nombre),
    syncEnabled: Number(row.sync_enabled) === 1,
  };
}

export async function deleteCurrentSession(req: VercelRequest) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return;
  await getDb().execute({ sql: "DELETE FROM sessions WHERE token_hash = ?", args: [sha256(token)] });
}

/* ---------------- Validación de entrada ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (e.length < 5 || e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e;
}

export function validPassword(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8 && v.length <= 128;
}

export function normalizeNombre(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const n = v.trim().replace(/\s+/g, " ");
  if (n.length < 1 || n.length > 80) return null;
  return n;
}

/* ---------------- Protección CSRF / método / cuerpo ---------------- */
/**
 * Para requests que mutan: exige JSON y que el Origin (si viene) sea el
 * propio host. Con la cookie SameSite=Strict esto cierra CSRF cross-site.
 */
export function assertSameOrigin(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin && host) {
    try {
      if (new URL(String(origin)).host !== String(host)) {
        res.status(403).json({ error: "Origen no permitido." });
        return false;
      }
    } catch {
      res.status(403).json({ error: "Origen no permitido." });
      return false;
    }
  }
  const ct = String(req.headers["content-type"] || "");
  if (!ct.includes("application/json")) {
    res.status(415).json({ error: "Se espera application/json." });
    return false;
  }
  return true;
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader("Allow", allowed.join(", "));
  res.status(405).json({ error: "Método no permitido." });
}

export function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  const first = Array.isArray(xff) ? xff[0] : xff ? xff.split(",")[0] : "";
  return (first || req.socket?.remoteAddress || "desconocida").trim().slice(0, 64);
}

/* ---------------- Límite de intentos (fuerza bruta) ---------------- */
const WINDOW_MS = 15 * 60_000;
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 30;

export async function isRateLimited(email: string, ip: string): Promise<boolean> {
  const db = getDb();
  const since = Date.now() - WINDOW_MS;
  const rs = await db.execute({
    sql: `SELECT key, COUNT(*) AS n FROM auth_attempts WHERE key IN (?, ?) AND at > ? GROUP BY key`,
    args: [`email:${email}`, `ip:${ip}`, since],
  });
  for (const row of rs.rows) {
    const n = Number(row.n);
    if (String(row.key).startsWith("email:") && n >= MAX_PER_EMAIL) return true;
    if (String(row.key).startsWith("ip:") && n >= MAX_PER_IP) return true;
  }
  return false;
}

export async function recordFailedAttempt(email: string, ip: string) {
  const db = getDb();
  const now = Date.now();
  await db.batch(
    [
      { sql: "INSERT INTO auth_attempts (key, at) VALUES (?, ?)", args: [`email:${email}`, now] },
      { sql: "INSERT INTO auth_attempts (key, at) VALUES (?, ?)", args: [`ip:${ip}`, now] },
      // Limpieza oportunista de intentos viejos.
      { sql: "DELETE FROM auth_attempts WHERE at < ?", args: [now - 24 * 3_600_000] },
    ],
    "write"
  );
}

export async function clearAttempts(email: string) {
  await getDb().execute({ sql: "DELETE FROM auth_attempts WHERE key = ?", args: [`email:${email}`] });
}

/* ---------------- Manejo uniforme de errores ---------------- */
export function handleError(res: VercelResponse, e: unknown) {
  // Nunca se devuelve el detalle interno (stack, SQL, nombres de env) al cliente.
  if (e instanceof Error && e.constructor.name === "ConfigError") {
    console.error("[FinanzAR API] Config:", e.message);
    res.status(503).json({ error: "El servicio de cuentas no está configurado." });
    return;
  }
  console.error("[FinanzAR API]", e);
  res.status(500).json({ error: "Error interno. Probá de nuevo en unos minutos." });
}
