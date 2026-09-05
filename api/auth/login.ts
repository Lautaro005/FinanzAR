import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/db.js";
import {
  assertSameOrigin, clearAttempts, clientIp, createSession, handleError, isRateLimited, methodNotAllowed,
  normalizeEmail, recordFailedAttempt, setSessionCookie, verifyPassword,
} from "../_lib/security.js";

const MSG_INVALIDO = "Email o contraseña incorrectos.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;
  try {
    const body = req.body ?? {};
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password || password.length > 128) return res.status(400).json({ error: MSG_INVALIDO });

    const ip = clientIp(req);
    if (await isRateLimited(email, ip)) {
      return res.status(429).json({ error: "Demasiados intentos. Esperá 15 minutos y volvé a probar." });
    }

    const db = getDb();
    const rs = await db.execute({ sql: "SELECT id, email, nombre, password_hash, sync_enabled FROM users WHERE email = ?", args: [email] });
    const row = rs.rows[0];
    // Mismo mensaje y costo similar exista o no el email (no revela cuentas).
    const ok = row ? await verifyPassword(password, String(row.password_hash)) : (await verifyPassword(password, DUMMY_HASH), false);
    if (!ok || !row) {
      await recordFailedAttempt(email, ip);
      return res.status(401).json({ error: MSG_INVALIDO });
    }
    await clearAttempts(email);
    const token = await createSession(String(row.id));
    setSessionCookie(res, token);
    res.status(200).json({
      user: { id: String(row.id), email: String(row.email), nombre: String(row.nombre), syncEnabled: Number(row.sync_enabled) === 1 },
    });
  } catch (e) {
    handleError(res, e);
  }
}

// Hash válido de una contraseña aleatoria, solo para igualar el tiempo de respuesta cuando el email no existe.
const DUMMY_HASH = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
