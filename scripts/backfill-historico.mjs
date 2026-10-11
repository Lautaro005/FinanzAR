#!/usr/bin/env node
// Backfill del histórico anterior al snapshot diario, para activos que no tienen
// fuente gratuita con histórico completo en el navegador:
//
//   divisas (euro y real): cotización de referencia del BCRA, una muestra por
//     semana desde 2000-01-03 (el snapshot diario toma el día a día desde ahí).
//   cripto: precio en USD de Binance (vela semanal de cierre) × dólar cripto
//     de argentinadatos (venta), desde 2023-02-13 (primer lunes con dólar
//     cripto disponible) hasta 365 días atrás, que es donde arranca CoinGecko.
//     Es una serie RECONSTRUIDA: CoinGecko no permite histórico más largo con
//     el plan gratuito, y el dólar cripto de argentinadatos arranca en 2023.
//
// Escribe public/historico/divisas.json y public/historico/cripto.json (merge
// idempotente con lo que ya exista). Sale con código 1 si la cobertura es
// sospechosamente baja, para no commitear un backfill incompleto.
//
// Uso: node scripts/backfill-historico.mjs

import { appendPoint, cotizacionesBcra, fetchJson, readSnapshotFile, today, writeSnapshotFile, MAX_PUNTOS_POR_CATEGORIA } from "./lib-historico.mjs";

const DESDE_BCRA = "2000-01-03"; // lunes
const DESDE_CRIPTO = "2023-02-13"; // lunes; el dólar cripto empieza el 2023-02-07
const CONCURRENCIA = 6;

// Tickers de Binance (par contra USDT) de las cripto de la app.
// Mantener en sync con COIN_METADATA de src/lib/api/coingecko.ts.
// Se excluyen las stablecoins (USDT, USDC, DAI): su ARS es el propio dólar cripto.
const CRIPTO = {
  bitcoin: "BTC", ethereum: "ETH", ripple: "XRP", binancecoin: "BNB", solana: "SOL", dogecoin: "DOGE",
  cardano: "ADA", tron: "TRX", "avalanche-2": "AVAX", chainlink: "LINK", "shiba-inu": "SHIB", sui: "SUI",
  stellar: "XLM", polkadot: "DOT", "hedera-hashgraph": "HBAR", litecoin: "LTC", "bitcoin-cash": "BCH",
  toncoin: "TON", near: "NEAR", uniswap: "UNI", aptos: "APT", "internet-computer": "ICP", pepe: "PEPE",
  monero: "XMR", "ethereum-classic": "ETC", cosmos: "ATOM", arbitrum: "ARB",
};

// Lunes (ISO) desde `desde` hasta `hasta` inclusive.
function lunesEntre(desde, hasta) {
  const out = [];
  const fin = new Date(`${hasta}T00:00:00Z`).getTime();
  for (let t = new Date(`${desde}T00:00:00Z`).getTime(); t <= fin; t += 7 * 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

// Ejecuta `fn` sobre `items` con hasta `n` en paralelo. Devuelve los resultados en orden.
async function enParalelo(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

function fechaMenosDias(iso, dias) {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() - dias * 86400000).toISOString().slice(0, 10);
}

async function backfillDivisas(hoyISO) {
  const store = await readSnapshotFile("divisas");
  const fechas = lunesEntre(DESDE_BCRA, hoyISO);
  let errores = 0;
  const filas = await enParalelo(fechas, CONCURRENCIA, async (f) => {
    try {
      return { fecha: f, cot: await cotizacionesBcra(f) };
    } catch (e) {
      errores++;
      console.warn(`[backfill] BCRA ${f}: ${e.message}`);
      return null;
    }
  });
  if (errores > fechas.length * 0.02) {
    throw new Error(`BCRA: demasiados errores (${errores} de ${fechas.length}); no se escribe nada.`);
  }
  let eur = 0;
  let brl = 0;
  for (const fila of filas) {
    if (!fila) continue;
    for (const [moneda, valor] of Object.entries(fila.cot)) {
      appendPoint(store, `divisas-${moneda.toLowerCase()}-oficial`, fila.fecha, valor, MAX_PUNTOS_POR_CATEGORIA.divisas);
      if (moneda === "EUR") eur++;
      if (moneda === "BRL") brl++;
    }
  }
  // Semanas sin publicación (feriados o días sin carga) no son error; la cobertura mínima sí se valida.
  if (eur < 500 || brl < 500) throw new Error(`divisas: cobertura insuficiente (EUR ${eur}, BRL ${brl} puntos).`);
  console.log(`[backfill] divisas: EUR ${eur} puntos, BRL ${brl} puntos (semanales desde ${DESDE_BCRA}).`);
  await writeSnapshotFile("divisas", store);
}

async function backfillCripto(hoyISO) {
  const dolares = await fetchJson("https://api.argentinadatos.com/v1/cotizaciones/dolares/cripto");
  const tasas = (Array.isArray(dolares) ? dolares : [])
    .filter((d) => d.fecha && d.venta > 0)
    .map((d) => ({ fecha: d.fecha, venta: d.venta }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (tasas.length === 0) throw new Error("Sin dólar cripto de argentinadatos.");
  // Dólar cripto del último día publicado hasta `fecha` (el mercado no cotiza fines de semana).
  const dolarEn = (fecha) => {
    let venta = null;
    for (const t of tasas) {
      if (t.fecha > fecha) break;
      venta = t.venta;
    }
    return venta;
  };

  const hasta = fechaMenosDias(hoyISO, 365); // CoinGecko cubre desde acá en adelante
  const startMs = new Date(`${DESDE_CRIPTO}T00:00:00Z`).getTime();
  const endMs = new Date(`${hasta}T00:00:00Z`).getTime();
  const store = await readSnapshotFile("cripto");
  const resumen = [];

  for (const [coinId, ticker] of Object.entries(CRIPTO)) {
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${ticker}USDT&interval=1w&startTime=${startMs}&endTime=${endMs}&limit=1000`;
    let velas;
    try {
      velas = await fetchJson(url);
    } catch (e) {
      console.warn(`[backfill] Binance ${ticker}USDT: ${e.message}`);
      resumen.push(`${ticker}=0`);
      continue;
    }
    let n = 0;
    for (const vela of Array.isArray(velas) ? velas : []) {
      const fecha = new Date(vela[0]).toISOString().slice(0, 10);
      const usd = Number(vela[4]); // cierre semanal
      const tasa = dolarEn(fecha);
      if (!(usd > 0) || !tasa) continue;
      appendPoint(store, `crypto-${coinId}`, fecha, Number((usd * tasa).toFixed(2)));
      n++;
    }
    resumen.push(`${ticker}=${n}`);
  }

  if ((store["crypto-bitcoin"]?.length ?? 0) < 100) {
    throw new Error(`cripto: BTC con pocos puntos (${store["crypto-bitcoin"]?.length ?? 0}); no se escribe nada.`);
  }
  console.log(`[backfill] cripto (USD Binance × dólar cripto, ${DESDE_CRIPTO} → ${hasta}): ${resumen.join(", ")}.`);
  await writeSnapshotFile("cripto", store);
}

async function main() {
  const hoyISO = today();
  console.log(`[backfill] Hoy (Buenos Aires): ${hoyISO}`);
  await backfillDivisas(hoyISO);
  await backfillCripto(hoyISO);
  console.log("[backfill] Listo.");
}

main().catch((e) => {
  console.error("[backfill] Error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
