async function get(url, headers = {}) {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 finanzar-probe", ...headers }, signal: AbortSignal.timeout(40000) });
  const txt = await res.text();
  let json = null; try { json = JSON.parse(txt); } catch {}
  return { status: res.status, json, txt, acao: res.headers.get("access-control-allow-origin") };
}
const log = (o) => console.log("PROBE3 " + JSON.stringify(o));
const o = { Origin: "https://finanzar-delta.vercel.app" };

// usa_stocks: estructura real
{
  const r = await get("https://data912.com/historical/usa_stocks/AAPL", o);
  const keys = r.json ? Object.keys(r.json) : [];
  const muestra = {};
  for (const k of keys) { const v = r.json[k]; muestra[k] = Array.isArray(v) ? { len: v.length, first: v[0], last: v.at(-1) } : v; }
  log({ k: "d912-usa AAPL", status: r.status, acao: r.acao, keys, muestra });
  const r2 = await get("https://data912.com/historical/usa_stocks/GGAL", o);
  log({ k: "d912-usa GGAL", status: r2.status, len: r2.json?.dates?.length ?? null, first: r2.json?.dates?.[0] ?? null });
}
// CORS de las fuentes que el navegador llama directo
for (const [k, u] of [["ad-cripto", "https://api.argentinadatos.com/v1/cotizaciones/dolares/cripto"], ["coingecko", "https://api.coingecko.com/api/v3/ping"], ["binance", "https://data-api.binance.vision/api/v3/ping"], ["bcra", "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=2026-10-09"], ["dolarapi", "https://dolarapi.com/v1/cotizaciones"]]) {
  const r = await get(u, o);
  log({ k, status: r.status, acao: r.acao });
}
// BCRA: fin de semana y feriado (debe venir vacío o error)
for (const f of ["2026-10-10", "2026-12-25"]) {
  const r = await get(`https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones?fecha=${f}`);
  log({ k: "bcra-" + f, status: r.status, fecha: r.json?.results?.fecha ?? null, n: r.json?.results?.detalle?.length ?? null, head: r.txt.slice(0, 120) });
}
console.log("PROBE3_FIN");
