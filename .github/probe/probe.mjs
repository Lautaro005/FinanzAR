// Probe temporal: mide cobertura real de las fuentes externas desde GitHub Actions.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, label) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 finanzar-probe" }, signal: AbortSignal.timeout(40000) });
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch {}
    return { label, url, status: res.status, json, bytes: txt.length, head: txt.slice(0, 200) };
  } catch (e) { return { label, url, error: String(e) }; }
}
function resumenFechas(arr, campoFecha) {
  if (!Array.isArray(arr) || arr.length === 0) return { n: 0 };
  const f = arr.map((x) => String(x[campoFecha] ?? x.date ?? x.fecha ?? x.t ?? "")).filter(Boolean).sort();
  return { n: arr.length, primera: f[0], ultima: f[f.length - 1] };
}
const out = [];
const log = (o) => { out.push(o); console.log("PROBE " + JSON.stringify(o)); };

// 1) argentinadatos: dólares históricos
for (const casa of ["oficial", "blue", "bolsa", "contadoconliqui"]) {
  const r = await get(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`, `ad-dolar-${casa}`);
  log({ k: r.label, status: r.status, error: r.error, ...resumenFechas(r.json, "fecha") });
}

// 2) DolarAPI: forma de cotizaciones (EUR/BRL)
{
  const r = await get("https://dolarapi.com/v1/cotizaciones", "dolarapi-cotizaciones");
  const arr = Array.isArray(r.json) ? r.json : [];
  log({ k: r.label, status: r.status, n: arr.length, monedas: arr.map((x) => x.moneda), eur: arr.find((x) => x.moneda === "EUR"), brl: arr.find((x) => x.moneda === "BRL") });
}

// 3) BCRA: catálogo monetarias (buscar euro/real) y cotizaciones de referencia
{
  const cat = await get("https://api.bcra.gob.ar/estadisticas/v4.0/monetarias?limit=3000", "bcra-monetarias-catalogo");
  const res = cat.json?.results ?? [];
  const hits = res.filter((v) => /euro|real|brasil/i.test(v.descripcion ?? "")).map((v) => ({ id: v.idVariable, d: v.descripcion, fin: v.ultFechaInformada }));
  log({ k: cat.label, status: cat.status, error: cat.error, total: res.length, hits: hits.slice(0, 20) });
  for (const h of hits.slice(0, 4)) {
    const r = await get(`https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/${h.id}?desde=2010-01-01&hasta=2026-10-10&limit=3000`, `bcra-serie-${h.id}`);
    const serie = r.json?.results?.[0]?.detalle ?? [];
    log({ k: r.label, status: r.status, error: r.error, descripcion: h.d, ...resumenFechas(serie, "fecha") });
  }
}
for (const u of [
  "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/EUR",
  "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=2020-01-02",
  "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/2020-01-02",
]) {
  const r = await get(u, "bcra-cambiarias");
  log({ k: u.replace("https://api.bcra.gob.ar", ""), status: r.status, error: r.error, head: r.head });
}

// 4) CoinGecko: límite de histórico con plan gratuito
for (const days of [365, "max"]) {
  const r = await get(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=ars&days=${days}&interval=daily`, `cg-${days}`);
  const p = r.json?.prices ?? [];
  log({ k: r.label, status: r.status, error: r.error, n: p.length, primera: p[0] ? new Date(p[0][0]).toISOString().slice(0, 10) : null, ultima: p.at(-1) ? new Date(p.at(-1)[0]).toISOString().slice(0, 10) : null, head: r.head });
  await sleep(4000);
}

// 5) data912 históricos (cobertura real por ticker)
for (const [tipo, t] of [["stocks", "GGAL"], ["cedears", "AAPL"], ["bonds", "AL30"], ["stocks", "PAMP"]]) {
  const r = await get(`https://data912.com/historical/${tipo}/${t}`, `d912-${tipo}-${t}`);
  const arr = Array.isArray(r.json) ? r.json : [];
  log({ k: r.label, status: r.status, error: r.error, ...resumenFechas(arr, "date") });
}

// 6) Binance público (USD) para cripto anterior a 2025
{
  const r = await get("https://data-api.binance.vision/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=1577836800000&limit=1000", "binance-klines-2020");
  const k = Array.isArray(r.json) ? r.json : [];
  log({ k: r.label, status: r.status, error: r.error, n: k.length, primera: k[0] ? new Date(k[0][0]).toISOString().slice(0, 10) : null, ultima: k.at(-1) ? new Date(k.at(-1)[0]).toISOString().slice(0, 10) : null, head: r.head?.slice(0, 120) });
}
console.log("PROBE_FIN");
