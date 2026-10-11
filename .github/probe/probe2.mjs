// Probe temporal 2: cobertura de dólar cripto, Binance, BCRA por fecha y data912 EE.UU.
async function get(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 finanzar-probe" }, signal: AbortSignal.timeout(40000) });
    const txt = await res.text();
    let json = null; try { json = JSON.parse(txt); } catch {}
    return { status: res.status, json, head: txt.slice(0, 160) };
  } catch (e) { return { error: String(e) }; }
}
const log = (o) => console.log("PROBE2 " + JSON.stringify(o));
const fechas = (arr, f) => { const v = arr.map(f).filter(Boolean).sort(); return { n: arr.length, primera: v[0], ultima: v.at(-1) }; };

// a) dólar cripto y oficial (argentinadatos)
for (const casa of ["cripto", "mayorista"]) {
  const r = await get(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`);
  log({ k: "ad-" + casa, status: r.status, ...fechas(Array.isArray(r.json) ? r.json : [], (x) => x.fecha) });
}

// b) Binance: pares USDT de las cripto de la app y cobertura desde 2019
const pares = ["BTC", "ETH", "BNB", "XRP", "SOL", "DOGE", "ADA", "TRX", "AVAX", "LINK", "SHIB", "SUI", "XLM", "DOT", "HBAR", "LTC", "BCH", "TON", "NEAR", "UNI", "APT", "ICP", "PEPE", "XMR", "ETC", "ATOM", "ARB"];
const cobertura = [];
for (const p of pares) {
  const r = await get(`https://data-api.binance.vision/api/v3/klines?symbol=${p}USDT&interval=1w&startTime=1546300800000&limit=1000`);
  const k = Array.isArray(r.json) ? r.json : [];
  cobertura.push({ p, n: k.length, primera: k[0] ? new Date(k[0][0]).toISOString().slice(0, 10) : null, st: r.status });
}
log({ k: "binance-cobertura-semanal-desde-2019", cobertura });

// c) BCRA cotizaciones por fecha: JSON completo de EUR y BRL en fechas viejas
for (const f of ["2000-01-03", "2012-06-15", "2025-06-02"]) {
  const r = await get(`https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=${f}`);
  const det = r.json?.results?.detalle ?? [];
  log({ k: "bcra-" + f, status: r.status, fecha: r.json?.results?.fecha, eur: det.find((d) => d.codigoMoneda === "EUR"), brl: det.find((d) => d.codigoMoneda === "BRL") });
}

// d) data912: histórico de acciones de EE.UU. (candidatos de path)
for (const path of ["usa_stocks", "usa", "stocks_usa", "usastocks", "us_stocks"]) {
  const r = await get(`https://data912.com/historical/${path}/AAPL`);
  const arr = Array.isArray(r.json) ? r.json : [];
  log({ k: "d912-" + path, status: r.status, n: arr.length, head: r.head?.slice(0, 80) });
}
console.log("PROBE2_FIN");
