import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertSameOrigin, methodNotAllowed } from "./_lib/security.js";

/**
 * Búsqueda en internet para la herramienta del Chat IA (proveedor: Tavily).
 * La clave la pone el usuario en Mi cuenta → API Keys y viaja solo en esta request:
 * no se guarda en el servidor.
 *   POST { apiKey, query, tema?: "noticias" | "general", includeDomains?: string[] }
 *   → { resultados: { titulo, url, fecha, extracto }[] }
 */
const MAX_CONSULTA = 300;
const MAX_DOMINIOS = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;

  const body = req.body ?? {};
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const query = typeof body.query === "string" ? body.query.trim().slice(0, MAX_CONSULTA) : "";
  if (!apiKey || !query) {
    return res.status(400).json({ error: "Faltan la clave de búsqueda o la consulta." });
  }

  const noticias = body.tema !== "general";
  const includeDomains: string[] | undefined = Array.isArray(body.includeDomains)
    ? body.includeDomains.filter((d: unknown): d is string => typeof d === "string").slice(0, MAX_DOMINIOS)
    : undefined;

  try {
    const upstream = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        query,
        topic: noticias ? "news" : "general",
        days: noticias ? 14 : undefined,
        max_results: 5,
        search_depth: "basic",
        include_answer: false,
        include_domains: includeDomains && includeDomains.length > 0 ? includeDomains : undefined,
      }),
    });

    if (upstream.status === 401 || upstream.status === 403) {
      return res.status(401).json({ error: "La clave de Tavily es inválida o no tiene permisos." });
    }
    if (upstream.status === 429) {
      return res.status(429).json({ error: "Se alcanzó el límite de búsquedas de Tavily." });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: `Tavily respondió con error ${upstream.status}.` });
    }

    const json = (await upstream.json()) as { results?: any[] };
    const resultados = (json.results ?? []).map((r) => ({
      titulo: String(r.title ?? ""),
      url: String(r.url ?? ""),
      fecha: typeof r.published_date === "string" ? r.published_date : null,
      extracto: String(r.content ?? "").slice(0, 600),
    }));
    return res.status(200).json({ resultados });
  } catch {
    return res.status(502).json({ error: "No se pudo conectar con el buscador." });
  }
}
