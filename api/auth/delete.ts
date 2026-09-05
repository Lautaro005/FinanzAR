import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../_lib/db";
import { assertSameOrigin, getSessionUser, handleError, methodNotAllowed, setSessionCookie, verifyPassword } from "../_lib/security";

/** Elimina la cuenta, todas sus sesiones y el portfolio sincronizado. Exige la contraseña actual. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Tenés que iniciar sesión." });
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const db = getDb();
    const rs = await db.execute({ sql: "SELECT password_hash FROM users WHERE id = ?", args: [user.id] });
    const row = rs.rows[0];
    if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
      return res.status(401).json({ error: "La contraseña no es correcta." });
    }
    await db.batch(
      [
        { sql: "DELETE FROM portfolios WHERE user_id = ?", args: [user.id] },
        { sql: "DELETE FROM sessions WHERE user_id = ?", args: [user.id] },
        { sql: "DELETE FROM auth_attempts WHERE key = ?", args: [`email:${user.email}`] },
        { sql: "DELETE FROM users WHERE id = ?", args: [user.id] },
      ],
      "write"
    );
    setSessionCookie(res, null);
    res.status(200).json({ ok: true });
  } catch (e) {
    handleError(res, e);
  }
}
