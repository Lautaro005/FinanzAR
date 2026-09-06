// Servicio de Chat IA para FinanzAR (Groq y OpenRouter).
// Gestiona el historial de conversaciones en localStorage, la inyección del contexto
// financiero en vivo (portfolio + mercado) y la comunicación por streaming con los LLMs.

import { AiConfig, getAiConfig } from "./aiConfig";
import { Instrumento, MonedaVista, PlazoFijo } from "../types";
import {
  FondoComunValuado,
  Posicion,
  TotalesPortfolio,
  formatMoneda,
  hoyISO,
  nuevoId,
} from "./portfolio";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const STORAGE_CHATS_KEY = "finanzar_chat_sessions_v1";
const STORAGE_ACTIVE_CHAT_ID_KEY = "finanzar_active_chat_id_v1";

/* ============================================================
   GESTIÓN DE SESIONES EN LOCALSTORAGE
   ============================================================ */

export function loadChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("Error al cargar sesiones de chat:", err);
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error("Error al guardar sesiones de chat:", err);
  }
}

export function getActiveChatId(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_CHAT_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveChatId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_CHAT_ID_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_CHAT_ID_KEY);
    }
  } catch {
    /* ignorar */
  }
}

export function crearNuevaSesionChat(titulo = "Nueva consulta"): ChatSession {
  const nueva: ChatSession = {
    id: nuevoId(),
    title: titulo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  const prev = loadChatSessions();
  const next = [nueva, ...prev];
  saveChatSessions(next);
  setActiveChatId(nueva.id);
  return nueva;
}

export function eliminarSesionChat(id: string): void {
  const prev = loadChatSessions();
  const next = prev.filter((s) => s.id !== id);
  saveChatSessions(next);
  if (getActiveChatId() === id) {
    setActiveChatId(next.length > 0 ? next[0].id : null);
  }
}

export function actualizarTituloSesion(id: string, nuevoTitulo: string): void {
  const prev = loadChatSessions();
  const next = prev.map((s) => (s.id === id ? { ...s, title: nuevoTitulo, updatedAt: new Date().toISOString() } : s));
  saveChatSessions(next);
}

export function agregarMensajeASesion(sesionId: string, mensaje: ChatMessage): void {
  const prev = loadChatSessions();
  const next = prev.map((s) => {
    if (s.id !== sesionId) return s;
    // Si la sesión aún tiene el título por defecto y es el primer mensaje de usuario, generar título
    let title = s.title;
    if ((s.title === "Nueva consulta" || s.title.trim() === "") && mensaje.role === "user") {
      title = mensaje.content.slice(0, 36).trim() + (mensaje.content.length > 36 ? "…" : "");
    }
    return {
      ...s,
      title,
      updatedAt: new Date().toISOString(),
      messages: [...s.messages, mensaje],
    };
  });
  saveChatSessions(next);
}

export function limpiarTodosLosChats(): void {
  try {
    localStorage.removeItem(STORAGE_CHATS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_CHAT_ID_KEY);
  } catch {
    /* ignorar */
  }
}

/* ============================================================
   CONSTRUCTOR DEL PROMPT DE CONTEXTO FINANCIERO
   ============================================================ */

export interface ContextoFinancieroParams {
  usuarioNombre?: string;
  totales?: TotalesPortfolio;
  posiciones?: Posicion[];
  plazosFijos?: PlazoFijo[];
  fondosComunes?: FondoComunValuado[];
  efectivoActual?: number;
  dolar?: number | null;
  monedaVista?: MonedaVista;
  instruments?: Instrumento[];
  isLive?: boolean;
}

export function construirPromptSistema(params: ContextoFinancieroParams): string {
  const {
    usuarioNombre = "Inversor",
    totales,
    posiciones = [],
    plazosFijos = [],
    fondosComunes = [],
    efectivoActual = 0,
    dolar,
    monedaVista = "ARS",
    instruments = [],
    isLive = true,
  } = params;

  const hoy = hoyISO();

  // 1. Resumen de Mercado (Divisas, Tasas, Cripto, CEDEARs)
  const divisas = instruments.filter((i) => i.categoria === "divisas");
  const divisasTxt = divisas.length
    ? divisas.map((d) => `  - ${d.nombre}: $${d.tasaORendimientoActual.toLocaleString("es-AR")}`).join("\n")
    : "  - Cotizaciones no disponibles en este momento.";

  const plazosFijosMdo = instruments.filter((i) => i.categoria === "pesos" && i.unidad === "TNA");
  const liderPf = plazosFijosMdo.length
    ? plazosFijosMdo.reduce((max, i) => (i.tasaORendimientoActual > max.tasaORendimientoActual ? i : max))
    : null;

  const criptos = instruments.filter((i) => i.categoria === "cripto");
  const criptosTxt = criptos.length
    ? criptos
        .slice(0, 5)
        .map((c) => `  - ${c.nombre} (${c.ticker ?? "CRYPTO"}): US$ ${c.tasaORendimientoActual.toLocaleString("es-AR")}`)
        .join("\n")
    : "  - Criptomonedas no disponibles.";

  const cedears = instruments.filter((i) => i.categoria === "cedears");
  const cedearsTxt = cedears.length
    ? cedears
        .slice(0, 6)
        .map((cd) => `  - ${cd.nombre} (${cd.ticker ?? ""}): $${cd.tasaORendimientoActual.toLocaleString("es-AR")}`)
        .join("\n")
    : "  - CEDEARs no disponibles.";

  // 2. Resumen del Portfolio del Usuario
  let portfolioTxt = "El usuario no tiene activos cargados actualmente en su portfolio.";
  if (totales && (posiciones.length > 0 || plazosFijos.length > 0 || fondosComunes.length > 0 || efectivoActual > 0)) {
    const posActivas = posiciones.filter((p) => p.cantidad > 0);
    const posTxt = posActivas.length
      ? posActivas
          .map((p) => {
            const res = p.valorActual !== null ? p.valorActual - p.costoTotal : 0;
            const resPct = p.costoTotal > 0 ? (res / p.costoTotal) * 100 : 0;
            return `  - ${p.nombre} (${p.ticker ?? ""}): ${p.cantidad} unidades | Costo: ${formatMoneda(
              p.costoTotal,
              p.moneda
            )} | Valor actual: ${
              p.valorActual !== null ? formatMoneda(p.valorActual, p.moneda) : "Sin cotización"
            } | Resultado: ${res >= 0 ? "+" : ""}${formatMoneda(res, p.moneda)} (${resPct.toFixed(2)}%)`;
          })
          .join("\n")
      : "  - Sin posiciones de mercado activas.";

    const pfActivos = plazosFijos.filter((pf) => pf.estado === "activo");
    const pfTxt = pfActivos.length
      ? pfActivos
          .map(
            (pf) =>
              `  - ${pf.entidad}: Capital $${pf.capital.toLocaleString("es-AR")} al ${pf.tna.toFixed(2)}% TNA (Vence: ${pf.fechaVencimiento})`
          )
          .join("\n")
      : "  - Sin plazos fijos vigentes.";

    const fciActivos = fondosComunes.filter((fc) => fc.estado === "activo");
    const fciTxt = fciActivos.length
      ? fciActivos
          .map(
            (fc) =>
              `  - ${fc.fondo}: Capital $${fc.capital.toLocaleString("es-AR")} | Valor actual: $${fc.valorActual.toLocaleString("es-AR")} | Ganancia devengada: +$${(
                fc.valorActual - fc.capital
              ).toLocaleString("es-AR")}`
          )
          .join("\n")
      : "  - Sin fondos comunes vigentes.";

    portfolioTxt = `
• TOTAL PATRIMONIO VALUADO: ${formatMoneda(totales.valorTotal, "ARS")} ${
      dolar ? `(~ US$ ${(totales.valorTotal / dolar).toFixed(2)})` : ""
    }
• CAPITAL TOTAL INVERTIDO: ${formatMoneda(totales.capitalInvertido, "ARS")}
• RESULTADO NO REALIZADO: ${totales.resultado >= 0 ? "+" : ""}${formatMoneda(totales.resultado, "ARS")} (${totales.resultadoPct.toFixed(2)}%)
• GANANCIA REALIZADA HISTÓRICA: ${formatMoneda(totales.realizada, "ARS")}
• EFECTIVO DISPONIBLE LÍQUIDO: $${efectivoActual.toLocaleString("es-AR")}
• MONEDA DE VISTA PREFERIDA: ${monedaVista}

POSICIONES EN CARTERA:
${posTxt}

PLAZOS FIJOS VIGENTES:
${pfTxt}

FONDOS COMUNES DE INVERSIÓN (FCI):
${fciTxt}`;
  }

  return `Sos FinanzAR IA, un analista patrimonial y asistente financiero inteligente de primer nivel para la aplicación FinanzAR (Argentina).
Estás interactuando con ${usuarioNombre}.
Fecha actual: ${hoy}. Estado de datos en vivo: ${isLive ? "Conectado en tiempo real" : "Datos en caché"}.
Dólar de referencia para conversión del portfolio: ${dolar ? `$${dolar.toLocaleString("es-AR")}` : "No informado"}.

---
ESTADO DEL PORTFOLIO PERSONAL DEL USUARIO:
${portfolioTxt}

---
PANORAMA DE MERCADOS ACTUAL (ARGENTINA & GLOBAL):
Cotizaciones de Dólares:
${divisasTxt}

Tasa líder en Plazos Fijos:
${liderPf ? `  - ${liderPf.entidadOFuente}: ${liderPf.tasaORendimientoActual.toFixed(2)}% TNA` : "  - No disponible"}

Criptomonedas principales:
${criptosTxt}

CEDEARs y Renta Variable de Referencia:
${cedearsTxt}

---
DIRECTIVAS PARA TUS RESPUESTAS:
1. Sé sobrio, preciso, cordial y rigurosamente analítico. Tu estilo emula la mejor prensa financiera (Financial Times, Bloomberg).
2. Usa el contexto del portfolio y del mercado en vivo para fundamentar tus respuestas. Si el usuario te pregunta por sus activos o rendimiento, respondé con las cifras exactas de su portfolio.
3. Diferenciá con claridad entre TNA (Tasa Nominal Anual) y TEA (Tasa Efectiva Anual), rendimientos reales vs. inflación, impacto de devaluación y brecha cambiaria (Oficial vs MEP/CCL/Blue).
4. Podés analizar diversificación, correlación, liquidez, costo de oportunidad y alternativas disponibles en el mercado argentino (Plazo Fijo, FCI Money Market, LECAPs/Bonos, CEDEARs, Obligaciones Negociables, Cripto).
5. Incluí un recordatorio breve y sobrio de que tus análisis son con fines informativos y educativos, y no constituyen asesoramiento financiero formal.
6. Redactá en español argentino natural y profesional. Podés usar formato Markdown (negritas, viñetas, tablas breves si es necesario).`;
}

/* ============================================================
   LLAMADAS A LA API DE GROQ Y OPENROUTER CON STREAMING
   ============================================================ */

export interface EnviarMensajeChatParams {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function enviarMensajeChat(params: EnviarMensajeChatParams): Promise<string> {
  const { messages, onChunk, signal } = params;
  const config: AiConfig = getAiConfig();

  const provider = config.activeProvider;
  let apiKey = "";
  let model = "";
  let endpoint = "";
  const extraHeaders: Record<string, string> = {};

  if (provider === "groq") {
    apiKey = config.groqApiKey.trim();
    model = config.groqModel || "llama-3.3-70b-versatile";
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
  } else {
    apiKey = config.openRouterApiKey.trim();
    model = config.openRouterModel || "meta-llama/llama-3.3-70b-instruct:free";
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    extraHeaders["HTTP-Referer"] = window.location.origin || "https://finanzar-delta.vercel.app";
    extraHeaders["X-Title"] = "FinanzAR";
  }

  if (!apiKey) {
    throw new Error(
      `No tenés configurada tu API Key de ${provider === "groq" ? "Groq" : "OpenRouter"}. Por favor configurala en Mi cuenta → Configuración de IA.`
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text().catch(() => "");
    }

    if (response.status === 401) {
      throw new Error(
        `Clave de API de ${provider === "groq" ? "Groq" : "OpenRouter"} inválida o vencida. Verificala en Mi cuenta.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Límite de peticiones excedido (rate limit) en ${provider === "groq" ? "Groq" : "OpenRouter"}. Aguardá unos segundos.`
      );
    }
    throw new Error(`Error del servicio de IA (${response.status}): ${errorDetail || "Error inesperado"}`);
  }

  // Lectura del stream SSE
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("El navegador no soporta lectura de stream de respuesta.");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed === "data: [DONE]") continue;

      if (trimmed.startsWith("data: ")) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Fragmento incompleto en chunk, ignorar
        }
      }
    }
  }

  return fullText;
}
