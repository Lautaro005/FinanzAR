import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/db.js";
import {
  assertSameOrigin, createSession, handleError, hashPassword, methodNotAllowed, newId, normalizeEmail,
  normalizeNombre, nowISO, setSessionCookie, validPassword,
} from "../_lib/security.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;
  try {
    const body = req.body ?? {};
    const nombre = normalizeNombre(body.nombre);
    const email = normalizeEmail(body.email);
    if (!nombre) return res.status(400).json({ error: "Ingresá tu nombre (hasta 80 caracteres)." });
    if (!email) return res.status(400).json({ error: "Ingresá un email válido." });
    if (!validPassword(body.password)) return res.status(400).json({ error: "La contraseña debe tener entre 8 y 128 caracteres." });

    const db = getDb();
    const existe = await db.execute({ sql: "SELECT 1 FROM users WHERE email = ?", args: [email] });
    if (existe.rows.length > 0) return res.status(409).json({ error: "Ya existe una cuenta con ese email." });

    const id = newId();
    const now = nowISO();
    await db.execute({
      sql: "INSERT INTO users (id, email, nombre, password_hash, sync_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
      args: [id, email, nombre, await hashPassword(body.password), now, now],
    });
    const token = await createSession(id);
    setSessionCookie(res, token);
    res.status(201).json({ user: { id, email, nombre, syncEnabled: false } });
  } catch (e) {
    handleError(res, e);
  }
}
