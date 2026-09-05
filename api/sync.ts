import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/db";
import { assertSameOrigin, getSessionUser, handleError, methodNotAllowed, nowISO } from "./_lib/security";

/**
 * Activa/desactiva la sincronización del portfolio con la cuenta.
 * Al desactivar se borra la copia guardada en la cuenta: el portfolio vuelve
 * a vivir solo en el navegador del usuario.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Tenés que iniciar sesión." });
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") return res.status(400).json({ error: "Falta 'enabled'." });
    const db = getDb();
    const stmts = [{ sql: "UPDATE users SET sync_enabled = ?, updated_at = ? WHERE id = ?", args: [enabled ? 1 : 0, nowISO(), user.id] }];
    if (!enabled) stmts.push({ sql: "DELETE FROM portfolios WHERE user_id = ?", args: [user.id] });
    await db.batch(stmts, "write");
    res.status(200).json({ user: { ...user, syncEnabled: enabled } });
  } catch (e) {
    handleError(res, e);
  }
}
