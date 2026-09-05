import { PuntoHistorico, Instrumento } from "../types";
import { getCryptoMarketChart } from "./api/coingecko";
import {
  getHistoricalCedear,
  getHistoricalArgStock,
  getHistoricalArgBond,
  Data912HistoricalRaw,
} from "./api/data912";
import { getDolarHistorico, DolarRaw } from "./api/argentinaDatos";
import { getSnapshotHistory } from "./historicoSnapshot";

// Histórico real por instrumento, con fallback honesto a una estimación
// cuando ninguna fuente ofrece serie histórica confiable para esa
// categoría. El orden de intentos por instrumento es:
//   1. Fuente "oficial" en vivo (data912 / CoinGecko / argentinadatos),
//      solo si además pasa el chequeo de vigencia (ver isStale más abajo).
//   2. Snapshot propio armado día a día (ver historicoSnapshot.ts) para
//      las categorías sin fuente gratuita confiable.
//   3. Estimación sintética ya calculada en normalize.ts (isEstimate: true).

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

// Chequeo de vigencia: data912 documenta sus endpoints de histórico
// (/historical/cedears, /historical/stocks, /historical/bonds) como si
// tuvieran datos actualizados, pero en la práctica varios quedaron
// congelados hace años sin que la API lo señale de ningún modo (ej. AL30
// se corta en oct-2023, GGAL en 2003, AAPL CEDEAR en 2015 — verificado
// manualmente). Sin este chequeo, la app mostraba ese histórico viejo
// como si fuera real ("Histórico oficial"), que es peor que no mostrar
// nada. Cualquier serie cuyo punto más reciente sea más viejo que
// MAX_DIAS_VIGENCIA se descarta y cae a las siguientes fuentes (snapshot
// propio o estimación), igual que si la fuente no existiera.
const MAX_DIAS_VIGENCIA = 10;

function fechaMasReciente(fechas: string[]): string {
  return fechas.reduce((max, f) => (f > max ? f : max), "");
}

function esVigente(fechaMasRecienteISO: string): boolean {
  const d = new Date(fechaMasRecienteISO);
  if (isNaN(d.getTime())) return false;
  const diasDesde = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  return diasDesde <= MAX_DIAS_VIGENCIA;
}

function fromData912Historical(rows: Data912HistoricalRaw[]): PuntoHistorico[] | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const fechaValida = rows.filter((r) => r && r.date && typeof r.c === "number" && r.c! > 0);
  if (fechaValida.length === 0) return null;

  const masReciente = fechaMasReciente(fechaValida.map((r) => r.date));
  if (!esVigente(masReciente)) return null;

  return fechaValida.map((r) => ({ fecha: formatFecha(r.date), valor: Number(r.c!.toFixed(2)) }));
}

function fromDolarHistorico(rows: DolarRaw[]): PuntoHistorico[] | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const fechaValida = rows.filter((r) => r && r.fecha && typeof r.venta === "number" && r.venta > 0);
  if (fechaValida.length === 0) return null;

  const masReciente = fechaMasReciente(fechaValida.map((r) => r.fecha));
  if (!esVigente(masReciente)) return null;

  return fechaValida.map((r) => ({ fecha: formatFecha(r.fecha), valor: Number(r.venta.toFixed(2)) }));
}

// Casas de dólar que argentinadatos.com expone con histórico real y
// vigente (se comprobó manualmente, sept. 2026): oficial, blue, bolsa
// (MEP), contadoconliqui (CCL), cripto y mayorista. "Tarjeta" NO tiene
// serie propia en argentinadatos: el nombre "tarjeta" no existe como
// "casa" en esa API; los nombres históricos más parecidos ("solidario",
// "turista") están discontinuados (solidario corta en 2021-09-02, turista
// devuelve 404 incluso para fechas recientes), así que no hay forma
// honesta de reconstruir su histórico con una fuente gratuita hoy — cae
// a la estimación sintética hasta que la rutina de snapshot propio
// (ver historicoSnapshot.ts) acumule suficientes puntos, si se decide
// sumarla ahí en el futuro.
const DOLAR_HISTORICO_CASAS = new Set(["oficial", "blue", "bolsa", "contadoconliqui", "cripto", "mayorista"]);

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
  // ninguna API gratuita usada hoy expone histórico por instrumento. Para
  // estas cinco, fetchInstrumentHistory intenta después el snapshot propio
  // (historicoSnapshot.ts) antes de resignarse a la estimación sintética.
  return null;
}

/**
 * Devuelve el histórico real de un instrumento, probando en orden:
 * fuente oficial en vivo y vigente → snapshot propio armado día a día →
 * estimación sintética ya calculada en normalize.ts (isEstimate: true).
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
    console.warn(`[history] Sin histórico oficial vigente para ${instrument.id}, se prueba snapshot propio:`, e);
  }

  try {
    const snapshot = await getSnapshotHistory(instrument.categoria, instrument.id);
    if (snapshot && snapshot.length >= 2) {
      const result: HistoryResult = { data: snapshot, isEstimate: false };
      memoryCache.set(cacheKey, result);
      return result;
    }
  } catch (e) {
    console.warn(`[history] Sin snapshot propio para ${instrument.id}, se usa estimación:`, e);
  }

  const fallback: HistoryResult = { data: instrument.historico, isEstimate: true };
  memoryCache.set(cacheKey, fallback);
  return fallback;
}
