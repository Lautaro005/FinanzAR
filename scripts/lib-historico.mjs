// Helpers compartidos por scripts/snapshot-historico.mjs y scripts/backfill-historico.mjs:
// fetch con reintentos, lectura/escritura de los JSON de public/historico y
// cotizaciones de referencia del BCRA por fecha.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const HISTORICO_DIR = path.join(__dirname, "..", "public", "historico");

// Cuántos puntos por instrumento se conservan como máximo (≈ 1 año de puntos
// diarios). Las categorías con backfill histórico tienen su propio tope.
export const MAX_PUNTOS_POR_INSTRUMENTO = 400;
export const MAX_PUNTOS_POR_CATEGORIA = { divisas: 10000 };

// ---- Fetch ----------------------------------------------------------------

const FETCH_TIMEOUT_MS = 30_000;

async function fetchJsonOnce(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// Con reintentos y backoff (2s, 4s, 8s) para errores de red, 5xx y 429.
// Los 4xx (ej. 404 de una foto FCI que no existe ese día) no se reintentan.
export async function fetchJson(url, { reintentos = 3 } = {}) {
  for (let intento = 0; ; intento++) {
    try {
      return await fetchJsonOnce(url);
    } catch (e) {
      const status = Number(/HTTP (\d{3})/.exec(e.message)?.[1]);
      const reintentable = !status || status >= 500 || status === 429;
      if (!reintentable || intento >= reintentos) throw e;
      await new Promise((r) => setTimeout(r, 2000 * 2 ** intento));
    }
  }
}

// "Hoy" en hora de Buenos Aires (la rutina corre de noche; con UTC cada punto
// quedaría con la fecha del día siguiente).
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

// ---- Store (un JSON por categoría: { [instrumentId]: [{ fecha, valor }] }) --

export async function readSnapshotFile(name) {
  try {
    return JSON.parse(await readFile(path.join(HISTORICO_DIR, `${name}.json`), "utf-8"));
  } catch {
    return {};
  }
}

export async function writeSnapshotFile(name, data) {
  const sorted = {};
  for (const k of Object.keys(data).sort()) sorted[k] = data[k];
  await writeFile(path.join(HISTORICO_DIR, `${name}.json`), JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

// Idempotente por día: si ya hay un punto para esa fecha, se reemplaza.
export function appendPoint(store, id, fecha, valor, max = MAX_PUNTOS_POR_INSTRUMENTO) {
  if (!Number.isFinite(valor)) return;
  if (!store[id]) store[id] = [];
  const serie = store[id];
  const idx = serie.findIndex((p) => p.fecha === fecha);
  if (idx >= 0) serie[idx] = { fecha, valor };
  else serie.push({ fecha, valor });
  serie.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  if (serie.length > max) serie.splice(0, serie.length - max);
}

// ---- BCRA: cotización de referencia (ARS por unidad) por fecha ------------

// Devuelve { EUR?, BRL? } con la cotización de referencia de ese día.
// Vacío si no hay publicación (fin de semana, feriado o día sin cargar).
export async function cotizacionesBcra(fecha) {
  const r = await fetchJson(`https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=${fecha}`);
  const out = {};
  for (const d of r?.results?.detalle ?? []) {
    if ((d.codigoMoneda === "EUR" || d.codigoMoneda === "BRL") && d.tipoCotizacion > 0) {
      out[d.codigoMoneda] = d.tipoCotizacion;
    }
  }
  return out;
}
