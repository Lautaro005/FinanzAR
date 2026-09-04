import { PuntoHistorico, Instrumento } from "../types";
import { getCryptoMarketChart } from "./api/coingecko";
import {
  getHistoricalCedear,
  getHistoricalArgStock,
  getHistoricalArgBond,
  Data912HistoricalRaw,
} from "./api/data912";
import { getDolarHistorico, DolarRaw } from "./api/argentinaDatos";

// Histórico real por instrumento, con fallback honesto a una estimación
// cuando la fuente gratuita no ofrece serie histórica para esa categoría
// (hoy: Pesos —plazo fijo/FCI/criptopesos— y acciones/ETFs de EE.UU.).

export interface HistoryResult {
  data: PuntoHistorico[];
  isEstimate: boolean;
}

const memoryCache = new Map<string, HistoryResult>();

function formatFecha(dateLike: string | number): string {
  const d = typeof dateLike === "number" ? new Date(dateLike) : new Date(dateLike);
  if (isNaN(d.getTime())) return String(dateLike);
  // Se incluye el año: los históricos reales (CEDEARs, acciones, bonos, cripto)
  // pueden abarcar varios años, y "dd/mm" sin año generaba fechas ambiguas
  // que se repetían en el eje X (ej. "1/9" de años distintos apareciendo
  // varias veces seguidas, fuera de orden visual).
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fromData912Historical(rows: Data912HistoricalRaw[]): PuntoHistorico[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && r.date && typeof r.c === "number" && r.c! > 0)
    .map((r) => ({ fecha: formatFecha(r.date), valor: Number(r.c!.toFixed(2)) }));
}

function fromDolarHistorico(rows: DolarRaw[]): PuntoHistorico[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && r.fecha && typeof r.venta === "number" && r.venta > 0)
    .map((r) => ({ fecha: formatFecha(r.fecha), valor: Number(r.venta.toFixed(2)) }));
}

// Casas de dólar que argentinadatos.com expone con histórico real. El resto
// de "divisas" (mayorista, tarjeta, euro, real) no tiene fuente histórica
// gratuita hoy, así que cae honestamente a la estimación sintética
// (isEstimate: true), igual que ya ocurre con pesos/FCI/EE.UU.
const DOLAR_HISTORICO_CASAS = new Set(["oficial", "blue", "bolsa", "contadoconliqui", "cripto"]);

async function fetchLiveHistory(instrument: Instrumento): Promise<PuntoHistorico[] | null> {
  if (instrument.categoria === "divisas" && instrument.ticker && DOLAR_HISTORICO_CASAS.has(instrument.ticker)) {
    const rows = await getDolarHistorico(instrument.ticker as any);
    return fromDolarHistorico(rows);
  }

  if (instrument.categoria === "cripto" && instrument.id.startsWith("crypto-")) {
    const coinId = instrument.id.replace(/^crypto-/, "");
    // 365 días (máximo del tier gratuito de CoinGecko) para poder soportar
    // el rango "1A" del selector; rangos más cortos se recortan en el cliente.
    const chart = await getCryptoMarketChart(coinId, 365, "ars");
    if (!chart?.prices?.length) return null;
    return chart.prices.map(([ts, price]) => ({
      fecha: formatFecha(ts),
      valor: Number(price.toFixed(2)),
    }));
  }

  if (!instrument.ticker) return null;

  if (instrument.categoria === "cedears") {
    return fromData912Historical(await getHistoricalCedear(instrument.ticker));
  }
  if (instrument.categoria === "acciones") {
    return fromData912Historical(await getHistoricalArgStock(instrument.ticker));
  }
  if (instrument.categoria === "bonos") {
    return fromData912Historical(await getHistoricalArgBond(instrument.ticker));
  }

  // "pesos" (plazo fijo / criptopesos), "fci", "eeuu" (acciones de EE.UU.) y
  // las variantes de "divisas" sin cobertura de argentinadatos.com (arriba):
  // las APIs gratuitas usadas hoy no exponen histórico por instrumento.
  return null;
}

/**
 * Devuelve el histórico real de un instrumento cuando la fuente gratuita
 * lo ofrece (CEDEARs, acciones y bonos vía data912; cripto vía CoinGecko).
 * Si no hay fuente disponible o la request falla, cae de forma explícita
 * a la estimación ya calculada en normalize.ts (isEstimate: true) en vez
 * de mostrarla como si fuera un dato oficial.
 */
export async function fetchInstrumentHistory(instrument: Instrumento): Promise<HistoryResult> {
  const cacheKey = instrument.id;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const live = await fetchLiveHistory(instrument);
    if (live && live.length >= 2) {
      const result: HistoryResult = { data: live, isEstimate: false };
      memoryCache.set(cacheKey, result);
      return result;
    }
  } catch (e) {
    console.warn(`[history] Sin histórico oficial para ${instrument.id}, se usa estimación:`, e);
  }

  const fallback: HistoryResult = { data: instrument.historico, isEstimate: true };
  memoryCache.set(cacheKey, fallback);
  return fallback;
}
