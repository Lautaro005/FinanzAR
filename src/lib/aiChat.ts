// Servicio de Chat IA para FinanzAR (Groq y OpenRouter).
// Gestiona el historial de conversaciones en localStorage, la inyección del contexto
// financiero en vivo (portfolio + mercado) y la comunicación por streaming con los LLMs.
// Si el usuario cargó una clave de Tavily, el modelo puede usar la herramienta de búsqueda en internet.

import {
  AiConfig,
  ModoBusqueda,
  PROVEEDORES_IA,
  claveDelProveedor,
  getAiConfig,
  modeloDelProveedor,
  modoBusquedaActivo,
} from "./aiConfig";
import { Instrumento, MonedaVista, PlazoFijo } from "../types";
import {
  FondoComunValuado,
  Posicion,
  TotalesPortfolio,
  formatMoneda,
  hoyISO,
  nuevoId,
} from "./portfolio";
import { construirBloqueFuentes, construirMapaCategorias } from "./fuentesNoticias";
import {
  DEFINICION_HERRAMIENTA_BUSQUEDA,
  NOMBRE_HERRAMIENTA_BUSQUEDA,
  buscarEnInternet,
} from "./busquedaWeb";

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
  // Evitar agregar mensajes de texto vacíos o de solo espacios
  if (!mensaje.content || !mensaje.content.trim()) return;

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
  /** Cómo puede buscar en internet la IA en esta sesión (ver modoBusquedaActivo). */
  modoBusqueda?: ModoBusqueda;
}

/** Monto en pesos con rótulo explícito (AR$) para que el modelo no lo confunda con dólares. */
function montoTxt(monto: number, moneda: "ARS" | "USD" = "ARS"): string {
  if (moneda === "USD") return formatMoneda(monto, "USD");
  const signo = monto < 0 ? "-" : "";
  return `${signo}AR$ ${Math.abs(monto).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

/** Precio o tasa de un instrumento según su unidad real en la app (ARS, USD o TNA). */
function precioTxt(i: Instrumento): string {
  if (i.unidad === "TNA") return `${i.tasaORendimientoActual.toFixed(2)}% TNA`;
  if (i.unidad === "precio_usd") return montoTxt(i.tasaORendimientoActual, "USD");
  return montoTxt(i.tasaORendimientoActual, "ARS");
}

// Evita que el modelo busque noticias de otros meses o años (pasó con búsquedas de marzo/abril).
const REGLA_FECHA_BUSQUEDA =
  "Al buscar, incluí en la consulta el mes y el año actuales y descartá resultados de fechas anteriores, salvo que el usuario pida historia. Si un resultado es de otro año, decilo.";

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
    modoBusqueda = null,
  } = params;

  const hoy = hoyISO();
  // Fecha en lenguaje natural: el modelo la usa mejor que el formato ISO al armar búsquedas
  const fechaLarga = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // 1. Resumen de Mercado (Divisas, Tasas, Cripto, CEDEARs)
  const divisas = instruments.filter((i) => i.categoria === "divisas");
  const divisasTxt = divisas.length
    ? divisas.map((d) => `  - ${d.nombre}: ${precioTxt(d)}`).join("\n")
    : "  - Cotizaciones no disponibles en este momento.";

  const plazosFijosMdo = instruments.filter((i) => i.categoria === "pesos" && i.unidad === "TNA");
  const liderPf = plazosFijosMdo.length
    ? plazosFijosMdo.reduce((max, i) => (i.tasaORendimientoActual > max.tasaORendimientoActual ? i : max))
    : null;

  const criptos = instruments.filter((i) => i.categoria === "cripto");
  const criptosTxt = criptos.length
    ? criptos
        .slice(0, 5)
        .map((c) => `  - ${c.nombre} (${c.ticker ?? "CRYPTO"}): ${precioTxt(c)}`)
        .join("\n")
    : "  - Criptomonedas no disponibles.";

  const cedears = instruments.filter((i) => i.categoria === "cedears");
  const cedearsTxt = cedears.length
    ? cedears
        .slice(0, 6)
        .map((cd) => `  - ${cd.nombre} (${cd.ticker ?? ""}): ${precioTxt(cd)}`)
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
            return `  - ${p.nombre} (${p.ticker ?? ""}): ${p.cantidad} unidades | Costo: ${montoTxt(
              p.costoTotal,
              p.moneda
            )} | Valor actual: ${
              p.valorActual !== null ? montoTxt(p.valorActual, p.moneda) : "Sin cotización"
            } | Resultado: ${res >= 0 ? "+" : ""}${montoTxt(res, p.moneda)} (${resPct.toFixed(2)}%)`;
          })
          .join("\n")
      : "  - Sin posiciones de mercado activas.";

    const pfActivos = plazosFijos.filter((pf) => pf.estado === "activo");
    const pfTxt = pfActivos.length
      ? pfActivos
          .map(
            (pf) =>
              `  - ${pf.entidad}: Capital ${montoTxt(pf.capital)} al ${pf.tna.toFixed(2)}% TNA (Vence: ${pf.fechaVencimiento})`
          )
          .join("\n")
      : "  - Sin plazos fijos vigentes.";

    const fciActivos = fondosComunes.filter((fc) => fc.estado === "activo");
    const fciTxt = fciActivos.length
      ? fciActivos
          .map((fc) => {
            const ganancia = fc.valorActual - fc.capital;
            return `  - ${fc.fondo}: Capital ${montoTxt(fc.capital)} | Valor actual: ${montoTxt(fc.valorActual)} | Ganancia devengada: ${
              ganancia >= 0 ? "+" : ""
            }${montoTxt(ganancia)}`;
          })
          .join("\n")
      : "  - Sin fondos comunes vigentes.";

    portfolioTxt = `
• TOTAL PATRIMONIO VALUADO: ${montoTxt(totales.valorTotal)} ${
      dolar ? `(~ US$ ${(totales.valorTotal / dolar).toFixed(2)})` : ""
    }
• CAPITAL TOTAL INVERTIDO: ${montoTxt(totales.capitalInvertido)}
• RESULTADO NO REALIZADO: ${totales.resultado >= 0 ? "+" : ""}${montoTxt(totales.resultado)} (${totales.resultadoPct.toFixed(2)}%)
• GANANCIA REALIZADA HISTÓRICA: ${montoTxt(totales.realizada)}
• EFECTIVO DISPONIBLE LÍQUIDO: ${montoTxt(efectivoActual)}
• MONEDA DE VISTA PREFERIDA: ${monedaVista}

POSICIONES EN CARTERA:
${posTxt}

PLAZOS FIJOS VIGENTES:
${pfTxt}

FONDOS COMUNES DE INVERSIÓN (FCI):
${fciTxt}`;
  }

  const actualidad =
    modoBusqueda === "tavily"
      ? `Tenés la herramienta ${NOMBRE_HERRAMIENTA_BUSQUEDA}. Usala ante noticias, hechos recientes o cifras que no estén en el contexto de arriba (decisiones de la Fed, regulación, resultados de una empresa, etc.). Empezá con tema "noticias" y usá "general" para definiciones o contexto. Con cada dato que salga de una búsqueda, indicá la fuente y la fecha de publicación. Si la búsqueda no devuelve nada útil, decilo y respondé con el contexto disponible. ${REGLA_FECHA_BUSQUEDA}`
      : `En esta sesión no tenés búsqueda en internet: no podés leer noticias ni comunicados de hoy. Ante una pregunta de actualidad ("qué pasó con…", "por qué subió…"), respondé con el contexto de mercado y portfolio indicando su fecha, y señalá qué fuente verificar. Para que el usuario tenga búsqueda, puede cargar una clave de Tavily en Mi cuenta → API Keys.`;

  return `Sos FinanzAR IA, un analista patrimonial y asistente financiero de primer nivel para la aplicación FinanzAR (Argentina).
Estás conversando con ${usuarioNombre}.
Hoy es ${fechaLarga} (${hoy}). Estado de datos en vivo: ${isLive ? "Conectado en tiempo real" : "Datos en caché"}.
Dólar de referencia (venta, para convertir pesos a dólares): ${dolar ? `AR$ ${dolar.toLocaleString("es-AR")}` : "No informado"}.

MONEDAS
- Todos los valores de la app están en pesos argentinos (AR$), salvo los que dicen US$ o % TNA. Rotulá siempre la moneda al citar una cifra.
- El usuario piensa sus inversiones en dólares. Cuando hables de montos, precios o rendimientos en pesos, convertilos a US$ con el dólar de referencia e indicá la cotización usada. Si no hay dólar de referencia, decilo y no conviertas.

---
ESTADO DEL PORTFOLIO PERSONAL DEL USUARIO:
${portfolioTxt}

---
PANORAMA DE MERCADOS ACTUAL (ARGENTINA & GLOBAL):
Cotizaciones de dólares (AR$ por dólar):
${divisasTxt}

Tasa líder en plazos fijos:
${liderPf ? `  - ${liderPf.entidadOFuente}: ${liderPf.tasaORendimientoActual.toFixed(2)}% TNA` : "  - No disponible"}

Criptomonedas principales:
${criptosTxt}

CEDEARs y renta variable de referencia:
${cedearsTxt}

---
CÓMO RESPONDER
- Estilo: sobrio, preciso y analítico, en español argentino natural, con tono de prensa económica de referencia. Usá Markdown cuando ayude (viñetas, tablas breves).
- Cifras: usá las cifras exactas del portfolio y del mercado. Si un dato no está en el contexto ni en una búsqueda, no lo completes con memoria: decí que no tenés una cifra verificada y dónde verificarla.
- Conceptos: diferenciá TNA de TEA, rendimiento real frente a inflación, y devaluación frente a brecha cambiaria (oficial, MEP, CCL, blue).
- Análisis: podés evaluar diversificación, liquidez, costo de oportunidad y alternativas del mercado argentino (plazo fijo, FCI money market, LECAPs y bonos, CEDEARs, ONs, cripto).
- Aclaración: solo cuando el usuario pida una decisión concreta (qué comprar o vender, cuánto invertir), cerrá con una línea que diga que tu análisis es informativo y educativo y no constituye asesoramiento financiero formal.

ACTUALIDAD Y FUENTES
${actualidad}

Al citar, respetá la jerarquía: oficial (nivel 1) > research (nivel 2, "según el research de X") > prensa (nivel 3, con medio y fecha, nunca como dato primario). Si dos fuentes difieren, mostrá ambos valores con su fecha y procedencia; no elijas uno en silencio. Nunca inventes titulares, cifras, fechas ni URLs: solo mencioná dominios de la lista de referencia o URLs que haya devuelto una búsqueda.

FUENTES DE REFERENCIA (por orden de autoridad)
${construirBloqueFuentes()}

FUENTE PRIMARIA POR CATEGORÍA
${construirMapaCategorias()}`;
}

/* ============================================================
   LLAMADAS A LA API DE GROQ Y OPENROUTER CON STREAMING
   ============================================================ */

export interface LlamadaHerramienta {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** Mensaje en el formato de chat/completions (incluye las llamadas y resultados de herramientas). */
export type ChatApiMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlamadaHerramienta[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface EnviarMensajeChatParams {
  messages: ChatApiMessage[];
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

/** Tope de rondas con herramientas: evita un bucle si el modelo sigue pidiendo búsquedas. */
const MAX_RONDAS_HERRAMIENTAS = 3;
const BLOQUE_RAZONAMIENTO_RE = /<think>[\s\S]*?<\/think>\s*/gi;

export async function enviarMensajeChat(params: EnviarMensajeChatParams): Promise<string> {
  const { messages, onChunk, signal } = params;
  const config: AiConfig = getAiConfig();
  const modo = modoBusquedaActivo(config);
  const claveBusqueda = config.tavilyApiKey.trim();

  // Herramientas que se envían en cada ronda según el modo de búsqueda
  const herramientasDe = (ronda: number): unknown[] => {
    if (modo === "tavily") return ronda < MAX_RONDAS_HERRAMIENTAS ? [DEFINICION_HERRAMIENTA_BUSQUEDA] : [];
    return [];
  };

  const historial: ChatApiMessage[] = [...messages];
  let textoTotal = "";

  for (let ronda = 0; ; ronda++) {
    const salida = await llamarModeloEnStream({
      config,
      messages: historial,
      herramientas: herramientasDe(ronda),
      onChunk,
      signal,
    });
    textoTotal += salida.texto;

    if (salida.llamadas.length === 0 || ronda >= MAX_RONDAS_HERRAMIENTAS) break;

    historial.push({
      role: "assistant",
      content: salida.texto.replace(BLOQUE_RAZONAMIENTO_RE, "").trim() || null,
      tool_calls: salida.llamadas,
    });
    for (const llamada of salida.llamadas) {
      const resultado = await ejecutarHerramienta(llamada, claveBusqueda, signal);
      historial.push({ role: "tool", tool_call_id: llamada.id, content: resultado });
    }
  }

  if (!textoTotal.trim()) {
    throw new Error(
      `El modelo "${modeloDelProveedor(config)}" no devolvió texto en su respuesta. Te recomendamos cambiar a Llama 3.3 70B Versatile en Mi cuenta → Configuración de IA.`
    );
  }
  return textoTotal;
}

async function ejecutarHerramienta(
  llamada: LlamadaHerramienta,
  claveBusqueda: string,
  signal?: AbortSignal
): Promise<string> {
  if (llamada.function.name !== NOMBRE_HERRAMIENTA_BUSQUEDA) return "Herramienta no disponible.";
  if (!claveBusqueda) return "La búsqueda en internet no está configurada.";

  let args: { consulta?: string; tema?: string } = {};
  try {
    args = JSON.parse(llamada.function.arguments || "{}");
  } catch {
    /* argumentos mal formados: se informa abajo */
  }
  if (!args.consulta?.trim()) return "Falta la consulta de búsqueda.";

  try {
    return await buscarEnInternet({ consulta: args.consulta, tema: args.tema }, claveBusqueda, signal);
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    return `Error al buscar en internet: ${err?.message || "error desconocido"}.`;
  }
}

interface SalidaModelo {
  texto: string;
  llamadas: LlamadaHerramienta[];
}

async function llamarModeloEnStream(p: {
  config: AiConfig;
  messages: ChatApiMessage[];
  herramientas: unknown[];
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}): Promise<SalidaModelo> {
  const { config, messages, herramientas, onChunk, signal } = p;

  const proveedor = PROVEEDORES_IA[config.activeProvider];
  const apiKey = claveDelProveedor(config);
  const model = modeloDelProveedor(config);
  const endpoint = proveedor.endpoint;
  const extraHeaders: Record<string, string> = {};
  if (config.activeProvider === "openrouter") {
    extraHeaders["HTTP-Referer"] = window.location.origin || "https://finanzar-delta.vercel.app";
    extraHeaders["X-Title"] = "FinanzAR";
  }

  if (!apiKey) {
    throw new Error(
      `No tenés configurada tu API Key de ${proveedor.nombre}. Por favor configurala en Mi cuenta → Configuración de IA.`
    );
  }

  // Filtrar y sanear mensajes: sin texto vacío, pero conservando las llamadas y resultados de herramientas
  const sanitizedMessages = messages
    .filter(
      (m) =>
        m.role === "tool" ||
        (m.role === "assistant" && (m.tool_calls?.length ?? 0) > 0) ||
        (typeof m.content === "string" && m.content.trim().length > 0)
    )
    .map((m) => {
      if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
      if (m.role === "assistant" && m.tool_calls?.length) {
        return { role: "assistant", content: m.content, tool_calls: m.tool_calls };
      }
      return { role: m.role, content: (m.content ?? "").trim() };
    });

  if (sanitizedMessages.length === 0) {
    throw new Error("El mensaje enviado no contiene texto válido.");
  }

  const body: Record<string, unknown> = {
    model,
    messages: sanitizedMessages,
    temperature: 0.6,
    stream: true,
  };
  if (herramientas.length > 0) {
    body.tools = herramientas;
    body.tool_choice = "auto";
  }

  // Proveedores sin CORS desde el navegador pasan por el proxy del propio sitio (api/ia.ts).
  const response = proveedor.viaProxy
    ? await fetch("/api/ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proveedor: config.activeProvider, apiKey, payload: body }),
        signal,
      })
    : await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal,
      });

  if (!response.ok) {
    // Si el proveedor o el modelo no aceptan herramientas, se reintenta sin ellas.
    if (response.status === 400 && herramientas.length > 0) {
      console.warn("El proveedor rechazó las herramientas del modelo; se reintenta sin búsqueda.");
      return llamarModeloEnStream({ ...p, herramientas: [] });
    }

    let errorDetail = "";
    try {
      const errJson = await response.json();
      errorDetail = (typeof errJson.error === "string" ? errJson.error : errJson.error?.message) || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text().catch(() => "");
    }

    if (response.status === 401) {
      throw new Error(
        `Clave de API de ${proveedor.nombre} inválida o vencida. Verificala en Mi cuenta.`
      );
    }
    if (response.status === 429) {
      throw new Error(
        `Límite de peticiones excedido (rate limit) en ${proveedor.nombre}. Aguardá unos segundos.`
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
  let reasoningText = "";
  let rawAccumulated = "";
  let hasStartedReasoning = false;
  let hasClosedReasoning = false;

  // Las llamadas a herramientas llegan en fragmentos, indexados por `index`
  const llamadasAcumuladas: { id: string; name: string; args: string }[] = [];
  const acumularLlamadas = (deltas: any[]) => {
    for (const d of deltas) {
      const idx = typeof d?.index === "number" ? d.index : llamadasAcumuladas.length;
      if (!llamadasAcumuladas[idx]) llamadasAcumuladas[idx] = { id: "", name: "", args: "" };
      const acc = llamadasAcumuladas[idx];
      if (typeof d?.id === "string" && d.id) acc.id = d.id;
      if (typeof d?.function?.name === "string") acc.name += d.function.name;
      if (typeof d?.function?.arguments === "string") acc.args += d.function.arguments;
    }
  };

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return;

    // Detectar tanto "data: {...}" como "data:{...}"
    const match = trimmed.match(/^data:\s*(.*)$/);
    if (!match) return;

    const jsonStr = match[1];
    if (jsonStr === "[DONE]") return;

    try {
      const parsed = JSON.parse(jsonStr);
      const choice = parsed.choices?.[0];
      const delta = choice?.delta;

      const deltasHerramientas = delta?.tool_calls ?? choice?.message?.tool_calls;
      if (Array.isArray(deltasHerramientas)) acumularLlamadas(deltasHerramientas);

      const contentChunk =
        (typeof delta?.content === "string" ? delta.content : "") ||
        (typeof delta?.text === "string" ? delta.text : "") ||
        (typeof choice?.text === "string" ? choice.text : "") ||
        (typeof choice?.message?.content === "string" ? choice.message.content : "");

      const reasoningChunk =
        (typeof delta?.reasoning_content === "string" ? delta.reasoning_content : "") ||
        (typeof delta?.reasoning === "string" ? delta.reasoning : "");

      if (reasoningChunk) {
        reasoningText += reasoningChunk;
        if (!hasStartedReasoning) {
          hasStartedReasoning = true;
          fullText += "<think>\n";
          onChunk("<think>\n");
        }
        fullText += reasoningChunk;
        onChunk(reasoningChunk);
      } else if (contentChunk) {
        if (hasStartedReasoning && !hasClosedReasoning) {
          hasClosedReasoning = true;
          fullText += "\n</think>\n\n";
          onChunk("\n</think>\n\n");
        }
        fullText += contentChunk;
        onChunk(contentChunk);
      }
    } catch {
      // Fragmento incompleto en chunk SSE, ignorar
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    rawAccumulated += decoded;
    buffer += decoded;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      processLine(line);
    }
  }

  // Procesar cualquier remanente que haya quedado en el buffer
  if (buffer.trim()) {
    const remainingLines = buffer.split("\n");
    for (const line of remainingLines) {
      processLine(line);
    }
  }

  // Cerrar tag de razonamiento si quedó abierto
  if (hasStartedReasoning && !hasClosedReasoning) {
    hasClosedReasoning = true;
    fullText += "\n</think>\n\n";
    onChunk("\n</think>\n\n");
  }

  // Si no se extrajo texto vía SSE, intentar parsear respuesta completa
  if (!fullText.trim()) {
    if (reasoningText.trim()) {
      fullText = "<think>\n" + reasoningText.trim() + "\n</think>";
      onChunk(fullText);
    } else if (rawAccumulated.trim()) {
      try {
        const parsed = JSON.parse(rawAccumulated);
        const fallbackTools = parsed.choices?.[0]?.message?.tool_calls;
        if (Array.isArray(fallbackTools)) acumularLlamadas(fallbackTools);

        const fallback =
          parsed.choices?.[0]?.message?.content ||
          parsed.choices?.[0]?.delta?.content ||
          parsed.choices?.[0]?.text;
        const fallbackReasoning =
          parsed.choices?.[0]?.message?.reasoning_content ||
          parsed.choices?.[0]?.delta?.reasoning_content ||
          parsed.choices?.[0]?.delta?.reasoning;

        if (typeof fallback === "string" && fallback.trim()) {
          fullText = fallback;
          onChunk(fallback);
        } else if (typeof fallbackReasoning === "string" && fallbackReasoning.trim()) {
          fullText = "<think>\n" + fallbackReasoning.trim() + "\n</think>";
          onChunk(fullText);
        }
      } catch {
        // No era JSON regular
      }
    }
  }

  const llamadas: LlamadaHerramienta[] = llamadasAcumuladas
    .filter((x) => x && x.name)
    .map((x, i) => ({
      id: x.id || `call_${i}`,
      type: "function" as const,
      function: { name: x.name, arguments: x.args },
    }));

  if (!fullText.trim() && llamadas.length === 0) {
    throw new Error(
      `El modelo "${model}" no devolvió texto en su respuesta. Te recomendamos cambiar a Llama 3.3 70B Versatile en Mi cuenta → Configuración de IA.`
    );
  }

  return { texto: fullText, llamadas };
}
