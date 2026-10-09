import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertSameOrigin, methodNotAllowed } from "./_lib/security.js";

/**
 * Proxy de chat para proveedores compatibles con OpenAI que no permiten llamadas directas
 * desde el navegador (CORS). La clave viaja solo en esta request y no se guarda.
 *   POST { proveedor, apiKey, payload }  → stream SSE del proveedor (mismo formato que chat/completions)
 * Solo acepta los proveedores de esta lista; no es un proxy abierto.
 */
const DESTINOS: Record<string, string> = {
  ollama: "https://ollama.com/v1/chat/completions",
  cheaperinference: "https://api.cheaperinference.com/v1/chat/completions",
};
const MAX_PAYLOAD_CHARS = 300_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertSameOrigin(req, res)) return;

  const body = req.body ?? {};
  const destino = typeof body.proveedor === "string" ? DESTINOS[body.proveedor] : undefined;
  if (!destino) return res.status(400).json({ error: "Proveedor no soportado por el proxy." });

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (!apiKey) return res.status(400).json({ error: "Falta la API Key del proveedor." });

  if (!body.payload || typeof body.payload !== "object") {
    return res.status(400).json({ error: "Falta el cuerpo de la consulta." });
  }
  const payloadTexto = JSON.stringify(body.payload);
  if (payloadTexto.length > MAX_PAYLOAD_CHARS) {
    return res.status(413).json({ error: "La consulta es demasiado grande para el proxy." });
  }

  try {
    const upstream = await fetch(destino, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${apiKey}`,
      },
      body: payloadTexto,
    });

    if (!upstream.ok || !upstream.body) {
      const detalle = (await upstream.text().catch(() => "")).slice(0, 300);
      return res.status(upstream.status).json({
        error: `El proveedor respondió ${upstream.status}${detalle ? `: ${detalle}` : ""}`,
      });
    }

    res.status(200);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "text/event-stream");
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch {
    if (!res.headersSent) return res.status(502).json({ error: "No se pudo conectar con el proveedor." });
    res.end();
  }
}
