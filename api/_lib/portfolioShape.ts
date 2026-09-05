// Validación de forma del portfolio que el cliente sube al sincronizar.
// Es la misma validación mínima que hace `parsearBackup()` en el front
// (src/lib/portfolio.ts) — se replica acá porque el servidor no confía en el
// cliente. Solo se guarda lo que pasa este filtro, y con un tope de tamaño.

export const MAX_PORTFOLIO_BYTES = 1_000_000; // 1 MB: sobra para años de movimientos
const MAX_ITEMS = 5000;

const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown, max = 200) => typeof v === "string" && v.length <= max;
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export interface PortfolioPayload {
  app: "FinanzAR";
  version: 1;
  exportadoEn: string;
  transacciones: unknown[];
  plazosFijos: unknown[];
  fondosComunes: unknown[];
  historial: unknown[];
  config: Record<string, unknown>;
}

/** Devuelve el payload saneado o un mensaje de error legible. */
export function validarPortfolio(data: any): { ok: true; payload: PortfolioPayload } | { ok: false; error: string } {
  if (!data || typeof data !== "object" || data.app !== "FinanzAR") return { ok: false, error: "Formato de portfolio no reconocido." };
  const { transacciones, plazosFijos, fondosComunes = [], historial = [], config = {} } = data;
  if (![transacciones, plazosFijos, fondosComunes, historial].every(Array.isArray)) {
    return { ok: false, error: "Formato de portfolio no reconocido." };
  }
  if ([transacciones, plazosFijos, fondosComunes, historial].some((a: unknown[]) => a.length > MAX_ITEMS)) {
    return { ok: false, error: "El portfolio supera el máximo de registros." };
  }
  const txOk = transacciones.every(
    (t: any) =>
      t && isStr(t.id, 64) && isStr(t.instrumentId) && (t.tipo === "compra" || t.tipo === "venta") &&
      isNum(t.cantidad) && isNum(t.precioUnitario) && isDate(t.fecha) && isStr(t.instrumentoNombre, 300) &&
      isStr(t.categoria, 20) && isStr(t.unidad, 20) && (t.ticker === undefined || isStr(t.ticker, 40)) &&
      (t.notas === undefined || isStr(t.notas, 500))
  );
  const pfOk = plazosFijos.every(
    (p: any) =>
      p && isStr(p.id, 64) && isStr(p.entidad) && isNum(p.capital) && isNum(p.tna) && isDate(p.fechaInicio) &&
      isDate(p.fechaVencimiento) && isStr(p.estado, 20) && (p.notas === undefined || isStr(p.notas, 500))
  );
  const fcOk = fondosComunes.every(
    (f: any) =>
      f && isStr(f.id, 64) && isStr(f.fondo, 300) && isNum(f.capital) && isDate(f.fechaInicio) &&
      (f.instrumentId === undefined || isStr(f.instrumentId)) && (f.tnaFija === undefined || isNum(f.tnaFija)) &&
      (f.ultimaTna === undefined || isNum(f.ultimaTna)) && isStr(f.estado, 20) && isNum(f.realizada ?? 0) &&
      Array.isArray(f.rescates ?? []) && (f.notas === undefined || isStr(f.notas, 500))
  );
  const histOk = historial.every((h: any) => h && isDate(h.fecha) && isNum(h.valorTotal) && isNum(h.capitalInvertido));
  const cfgOk =
    config && typeof config === "object" && (config.dolarCasa === undefined || isStr(config.dolarCasa, 30)) &&
    (config.monedaVista === undefined || config.monedaVista === "ARS" || config.monedaVista === "USD");
  if (!txOk || !pfOk || !fcOk || !histOk || !cfgOk) return { ok: false, error: "El portfolio tiene registros con un formato que no se reconoce." };

  return {
    ok: true,
    payload: {
      app: "FinanzAR",
      version: 1,
      exportadoEn: typeof data.exportadoEn === "string" ? data.exportadoEn.slice(0, 40) : new Date().toISOString(),
      transacciones,
      plazosFijos,
      fondosComunes,
      historial,
      config: {
        dolarCasa: config.dolarCasa ?? "bolsa",
        ...(config.monedaVista ? { monedaVista: config.monedaVista } : {}),
        ...(config.ultimoDolar ? { ultimoDolar: config.ultimoDolar } : {}),
      },
    },
  };
}
