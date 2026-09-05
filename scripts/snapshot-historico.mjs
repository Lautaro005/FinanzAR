#!/usr/bin/env node
// Rutina de snapshot histórico "casero" para FinanzAR.
//
// Por qué existe: a septiembre de 2026 no encontramos ninguna fuente
// gratuita y accesible desde el browser (CORS habilitado, sin backend
// propio) que ofrezca histórico real para Plazos Fijos, FCI y Bonos
// argentinos, ni para acciones de EE.UU. Además descubrimos que el
// histórico que sí expone data912.com para CEDEARs/Acciones/Bonos está
// congelado hace años (ver el comentario "MAX_DIAS_VIGENCIA" en
// src/lib/history.ts) — no sirve como fuente de "histórico real vigente".
//
// Esta rutina no reemplaza ninguna fuente: corre 1 vez por día, toma la
// MISMA foto actual que ya usa la app en vivo (argentinadatos.com para
// Plazos Fijos/FCI, data912.com para CEDEARs/Acciones/Bonos/EE.UU.) y le
// agrega un punto a un archivo JSON por categoría en public/historico/.
// Con el correr de los días/semanas eso se convierte en un histórico real,
// propio, que src/lib/historicoSnapshot.ts lee en runtime (fetch a
// /historico/{categoria}.json, servido como archivo estático por Vercel)
// para alimentar los gráficos cuando no hay una fuente externa vigente.
//
// Cómo se programa: ver la sección "Rutina de snapshot histórico" en
// references/finanzar-REFERENCE.md — corre como scheduled task de Claude
// (Cowork), NO como cron local de este repo, porque necesita hacer
// git commit + push con las credenciales del usuario y este script por sí
// solo no las tiene.
//
// Uso manual (para probar antes de confiar en la rutina automática):
//   cd FinanzAR && node scripts/snapshot-historico.mjs
// Después revisar el diff de public/historico/*.json y, si se ve bien,
// commitear y pushear a mano.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORICO_DIR = path.join(__dirname, "..", "public", "historico");

// Cuántos puntos por instrumento se conservan como máximo en cada archivo
// (≈ algo más de 1 año corrido de puntos diarios). Evita que los JSON
// crezcan sin límite; el selector de rango "max" del gráfico igual sigue
// mostrando todo lo que haya.
const MAX_PUNTOS_POR_INSTRUMENTO = 400;

// ---- Helpers duplicados de src/lib/normalize.ts -----------------------
// OJO: si cambia la lógica de limpieza de nombres/slugs en normalize.ts,
// hay que reflejar el mismo cambio acá — si no, los ids no van a
// coincidir con los que usa la app y el snapshot va a quedar huérfano
// (guardado bajo un id que ningún instrumento en pantalla usa).

function cleanBankName(raw) {
  return raw
    .replace(/BANCO DE LA NACION ARGENTINA/i, "Banco Nación")
    .replace(/BANCO DE GALICIA Y BUENOS AIRES S\.A\./i, "Banco Galicia")
    .replace(/BANCO BBVA ARGENTINA S\.A\./i, "BBVA Francés")
    .replace(/BANCO SANTANDER ARGENTINA S\.A\./i, "Banco Santander")
    .replace(/BANCO MACRO S\.A\./i, "Banco Macro")
    .replace(/BANCO CREDICOOP COOPERATIVO LIMITADO/i, "Banco Credicoop")
    .replace(/BANCO CIUDAD DE BUENOS AIRES/i, "Banco Ciudad")
    .replace(/BANCO DE LA PROVINCIA DE BUENOS AIRES/i, "Banco Provincia")
    .replace(/BANCO HIPOTECARIO S\.A\./i, "Banco Hipotecario")
    .replace(/BANCO COMAFI S\.A\./i, "Banco Comafi")
    .replace(/BANCO INDUSTRIAL S\.A\./i, "Banco BIND")
    .replace(/S\.A\.U\./g, "")
    .replace(/S\.A\./g, "")
    .trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FCI_CATEGORIAS = ["mercadoDinero", "rentaFija", "rentaVariable", "rentaMixta", "retornoTotal", "otros"];
const FCI_PATRIMONIO_MINIMO = 50_000_000;
const FCI_MAX_POR_CATEGORIA = 250;

// Misma lista que USA_DIRECT_ALLOWED en src/lib/api/data912.ts (mantener
// en sync si se agregan/sacan tickers ahí).
const USA_DIRECT_ALLOWED = new Set([
  "VOO", "IVV", "SPY", "VTI", "QQQ", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRKB",
  "JPM", "JNJ", "V", "MA", "WMT", "PG", "HD", "KO", "PEP", "DIS", "NFLX", "ADBE", "CRM", "ORCL", "INTC", "CSCO",
  "PFE", "ABBV", "MRK", "XOM", "CVX", "BAC", "WFC", "GS", "MCD", "NKE", "SBUX", "QCOM", "TXN", "AMD", "BA",
  "UNH", "T", "VZ", "PYPL", "UPS", "MELI", "COIN", "HOOD", "AVGO", "AMAT", "MU", "ADI", "ARM", "ASML", "TSM",
  "IBM", "ABNB", "BKNG", "CRWD", "GILD", "AMGN", "BMY", "CVS", "CAT", "DE", "HON", "GE", "FDX", "DAL", "AAL",
  "MMM", "CL", "MO", "COST", "DECK", "ETSY", "EBAY", "F", "GM", "CCL", "HPQ", "DELL", "FSLR", "COP", "HAL",
  "BKR", "JD", "BABA", "BIDU", "DOCU", "ANET", "HIMS",
]);

// ---- Fetch helpers ------------------------------------------------------

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---- Snapshot store (lee/mergea/escribe cada JSON de public/historico) --

async function readSnapshotFile(name) {
  const filePath = path.join(HISTORICO_DIR, `${name}.json`);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSnapshotFile(name, data) {
  const filePath = path.join(HISTORICO_DIR, `${name}.json`);
  const sortedKeys = Object.keys(data).sort();
  const sorted = {};
  for (const k of sortedKeys) sorted[k] = data[k];
  await writeFile(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
}

function appendPoint(store, id, fecha, valor) {
  if (!Number.isFinite(valor)) return;
  if (!store[id]) store[id] = [];
  const serie = store[id];
  // Idempotente: si ya se guardó un punto para hoy (re-corrida manual el
  // mismo día), se reemplaza en vez de duplicar.
  const idx = serie.findIndex((p) => p.fecha === fecha);
  if (idx >= 0) {
    serie[idx] = { fecha, valor };
  } else {
    serie.push({ fecha, valor });
  }
  serie.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  if (serie.length > MAX_PUNTOS_POR_INSTRUMENTO) {
    serie.splice(0, serie.length - MAX_PUNTOS_POR_INSTRUMENTO);
  }
}

// ---- Por categoría -------------------------------------------------------

async function snapshotPlazoFijo(fecha) {
  const store = await readSnapshotFile("pesos");
  let ok = 0;
  try {
    const items = await fetchJson("https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo");
    for (const p of items) {
      if (!(p.tnaClientes > 0) || !p.entidad) continue;
      const tasa = p.tnaClientes <= 1 ? Number((p.tnaClientes * 100).toFixed(2)) : p.tnaClientes;
      const id = `pf-${slugify(cleanBankName(p.entidad))}`;
      appendPoint(store, id, fecha, tasa);
      ok++;
    }
  } catch (e) {
    console.warn("[snapshot] plazoFijo falló:", e.message);
  }
  await writeSnapshotFile("pesos", store);
  console.log(`[snapshot] pesos (plazo fijo): ${ok} entidades`);
}

async function snapshotFCI(fecha) {
  const store = await readSnapshotFile("fci");
  let ok = 0;
  for (const categoria of FCI_CATEGORIAS) {
    try {
      const [actual, previo] = await Promise.all([
        fetchJson(`https://api.argentinadatos.com/v1/finanzas/fci/${categoria}/ultimo`),
        fetchJson(`https://api.argentinadatos.com/v1/finanzas/fci/${categoria}/penultimo`),
      ]);
      const previoMap = new Map(previo.map((f) => [f.fondo, f]));

      const conRendimiento = [];
      for (const fondo of actual) {
        const anterior = previoMap.get(fondo.fondo);
        if (!anterior || !anterior.vcp || anterior.vcp <= 0 || !fondo.vcp || fondo.vcp <= 0) continue;
        if (!fondo.fecha || !anterior.fecha || fondo.fecha === anterior.fecha) continue;
        const diasReales = Math.max(
          1,
          Math.round((new Date(fondo.fecha).getTime() - new Date(anterior.fecha).getTime()) / 86400000)
        );
        const variacion = fondo.vcp / anterior.vcp - 1;
        const tasaAnualizada = variacion * (365 / diasReales) * 100;
        if (!Number.isFinite(tasaAnualizada) || tasaAnualizada <= -80 || tasaAnualizada >= 400) continue;
        if ((fondo.patrimonio || 0) < FCI_PATRIMONIO_MINIMO) continue;
        conRendimiento.push({ fondo: fondo.fondo, patrimonio: fondo.patrimonio || 0, tasa: tasaAnualizada });
      }

      conRendimiento.sort((a, b) => b.patrimonio - a.patrimonio);
      const top = conRendimiento.slice(0, FCI_MAX_POR_CATEGORIA);

      for (const f of top) {
        const id = `fci-${slugify(f.fondo)}`;
        appendPoint(store, id, fecha, Number(f.tasa.toFixed(2)));
        ok++;
      }
    } catch (e) {
      console.warn(`[snapshot] FCI ${categoria} falló:`, e.message);
    }
  }
  await writeSnapshotFile("fci", store);
  console.log(`[snapshot] fci: ${ok} fondos`);
}

async function snapshotData912(fecha) {
  const jobs = [
    { file: "cedears", url: "https://data912.com/live/arg_cedears", prefix: "cedears" },
    { file: "acciones", url: "https://data912.com/live/arg_stocks", prefix: "acciones" },
    { file: "bonos", url: "https://data912.com/live/arg_bonds", prefix: "bonos" },
    { file: "eeuu", url: "https://data912.com/live/usa_stocks", prefix: "eeuu", onlyAllowed: true },
  ];

  for (const job of jobs) {
    const store = await readSnapshotFile(job.file);
    let ok = 0;
    try {
      const quotes = await fetchJson(job.url);
      for (const q of quotes) {
        if (!q.symbol || !(q.c > 0)) continue;
        if (job.onlyAllowed && !USA_DIRECT_ALLOWED.has(q.symbol)) continue;
        const id = `${job.prefix}-${q.symbol.toLowerCase()}`;
        appendPoint(store, id, fecha, Number(q.c.toFixed(2)));
        ok++;
      }
    } catch (e) {
      console.warn(`[snapshot] ${job.file} falló:`, e.message);
    }
    await writeSnapshotFile(job.file, store);
    console.log(`[snapshot] ${job.file}: ${ok} instrumentos`);
  }
}

async function main() {
  const fecha = today();
  console.log(`[snapshot] Corriendo snapshot histórico para ${fecha}...`);
  await snapshotPlazoFijo(fecha);
  await snapshotFCI(fecha);
  await snapshotData912(fecha);
  console.log("[snapshot] Listo. Revisá el diff de public/historico/*.json y commiteá + pusheá si está bien.");
}

main().catch((e) => {
  console.error("[snapshot] Error inesperado:", e);
  process.exit(1);
});
