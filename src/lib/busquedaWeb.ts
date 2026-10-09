// Herramienta de búsqueda en internet para el Chat IA (function calling, formato OpenAI).
// Prioriza los dominios del registro de fuentes de referencia y, si hay pocos resultados,
// completa con una búsqueda general. La ejecución real pasa por /api/buscar (Tavily).

import { FUENTES_POR_NIVEL } from "./fuentesNoticias";

export const NOMBRE_HERRAMIENTA_BUSQUEDA = "buscar_en_internet";

export const DEFINICION_HERRAMIENTA_BUSQUEDA = {
  type: "function" as const,
  function: {
    name: NOMBRE_HERRAMIENTA_BUSQUEDA,
    description:
      "Busca información y noticias recientes en internet. Usala para hechos, noticias o cifras posteriores a tu conocimiento o cuando el usuario pida lo último. Devuelve títulos, enlaces, fechas y extractos.",
    parameters: {
      type: "object",
      properties: {
        consulta: {
          type: "string",
          description: "Búsqueda concreta, con nombres, fechas y términos clave.",
        },
        tema: {
          type: "string",
          enum: ["noticias", "general"],
          description: "'noticias' para actualidad (últimos 14 días). 'general' para definiciones o contexto.",
        },
      },
      required: ["consulta"],
    },
  },
};

const DOMINIOS_REFERENCIA = [...new Set(FUENTES_POR_NIVEL.flatMap((n) => n.fuentes.map((f) => f.dominio)))];
const MINIMO_RESULTADOS_PRIORITARIOS = 3;
const MAX_RESULTADOS_AL_MODELO = 8;

interface ResultadoCrudo {
  titulo: string;
  url: string;
  fecha: string | null;
  extracto: string;
}

async function llamarBuscador(
  consulta: string,
  tema: "noticias" | "general",
  apiKey: string,
  includeDomains: string[] | undefined,
  signal?: AbortSignal
): Promise<ResultadoCrudo[]> {
  const res = await fetch("/api/buscar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, query: consulta, tema, includeDomains }),
    signal,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error de búsqueda (${res.status}).`);
  return Array.isArray(json.resultados) ? json.resultados : [];
}

function esDominioDeReferencia(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return DOMINIOS_REFERENCIA.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Ejecuta la búsqueda y devuelve el texto que recibe el modelo como resultado de la herramienta.
 * Lanza error si la clave no sirve o el servicio falla; quien llama decide cómo informarlo.
 */
export async function buscarEnInternet(
  args: { consulta: string; tema?: string },
  apiKey: string,
  signal?: AbortSignal
): Promise<string> {
  const tema = args.tema === "general" ? "general" : "noticias";

  let resultados = await llamarBuscador(args.consulta, tema, apiKey, DOMINIOS_REFERENCIA, signal);
  if (resultados.length < MINIMO_RESULTADOS_PRIORITARIOS) {
    const generales = await llamarBuscador(args.consulta, tema, apiKey, undefined, signal);
    const vistas = new Set(resultados.map((r) => r.url));
    resultados = [...resultados, ...generales.filter((r) => !vistas.has(r.url))];
  }

  // Las de referencia primero, sin cambiar el orden relativo dentro de cada grupo.
  const ordenados = [
    ...resultados.filter((r) => esDominioDeReferencia(r.url)),
    ...resultados.filter((r) => !esDominioDeReferencia(r.url)),
  ].slice(0, MAX_RESULTADOS_AL_MODELO);

  if (ordenados.length === 0) return "Sin resultados para esta búsqueda.";

  return ordenados
    .map((r, i) => {
      const fecha = r.fecha ? ` · publicado: ${r.fecha}` : "";
      const referencia = esDominioDeReferencia(r.url) ? " · fuente de referencia" : "";
      return `[${i + 1}] ${r.titulo}\nURL: ${r.url}${fecha}${referencia}\n${r.extracto}`;
    })
    .join("\n\n");
}
