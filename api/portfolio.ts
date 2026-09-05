import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "./_lib/db";
import { MAX_PORTFOLIO_BYTES, validarPortfolio } from "./_lib/portfolioShape";
import { assertSameOrigin, getSessionUser, handleError, methodNotAllowed, nowISO } from "./_lib/security";

/**
 * Portfolio sincronizado del usuario logueado (solo si tiene la sincronización activa).
 *   GET    → { portfolio: PortfolioBackup | null, updatedAt }
 *   PUT    → reemplaza la copia de la cuenta con el body (validado y con tope de tamaño)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Tenés que iniciar sesión." });
    if (!user.syncEnabled) return res.status(403).json({ error: "La sincronización no está activada en esta cuenta." });
    const db = getDb();

    if (req.method === "GET") {
      const rs = await db.execute({ sql: "SELECT data, updated_at FROM portfolios WHERE user_id = ?", args: [user.id] });
      const row = rs.rows[0];
      if (!row) return res.status(200).json({ portfolio: null, updatedAt: null });
      return res.status(200).json({ portfolio: JSON.parse(String(row.data)), updatedAt: String(row.updated_at) });
    }

    if (req.method === "PUT") {
      if (!assertSameOrigin(req, res)) return;
      const v = validarPortfolio(req.body);
      if (!v.ok) return res.status(400).json({ error: v.error });
      const data = JSON.stringify(v.payload);
      if (Buffer.byteLength(data) > MAX_PORTFOLIO_BYTES) return res.status(413).json({ error: "El portfolio es demasiado grande para sincronizar." });
      const updatedAt = nowISO();
      await db.execute({
        sql: `INSERT INTO portfolios (user_id, data, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        args: [user.id, data, updatedAt],
      });
      return res.status(200).json({ updatedAt });
    }

    return methodNotAllowed(res, ["GET", "PUT"]);
  } catch (e) {
    handleError(res, e);
  }
}
