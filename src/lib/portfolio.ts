// Portfolio personal: persistencia en localStorage (dato del usuario, NO cache
// descartable — por eso no pasa por cache.ts ni tiene TTL) y cálculos puros
// (costo promedio ponderado, devengo de plazos fijos, consolidación en ARS).
// Diseño completo en references/finanzar-portfolio-DESIGN.md.

import {
  CasaDolar,
  Categoria,
  EventoMovimiento,
  FondoComun,
  Instrumento,
  MovimientoEfectivo,
  PlazoFijo,
  PortfolioConfig,
  PuntoHistorico,
  PuntoPortfolio,
  Transaccion,
} from "../types";

/* ------------------------------------------------------------------
   Claves de localStorage (versionadas: bumpear _vN si cambia la forma)
   ------------------------------------------------------------------ */
export const KEY_TRANSACCIONES = "finanzar_portfolio_transacciones_v1";
export const KEY_PLAZOS_FIJOS = "finanzar_portfolio_plazos_fijos_v1";
export const KEY_FONDOS_COMUNES = "finanzar_portfolio_fci_v1";
export const KEY_HISTORIAL = "finanzar_portfolio_historial_v1";
export const KEY_CONFIG = "finanzar_portfolio_config_v1";
export const KEY_EVENTOS = "finanzar_portfolio_eventos_v1";
export const KEY_EFECTIVO = "finanzar_portfolio_efectivo_v1";

/** Tope de puntos del gráfico (~2 años), mismo criterio que el snapshot histórico. */
export const MAX_PUNTOS_HISTORIAL = 730;

export const DEFAULT_CONFIG: PortfolioConfig = { dolarCasa: "bolsa" };

export const CASAS_DOLAR: { id: CasaDolar; label: string }[] = [
  { id: "bolsa", label: "Dólar MEP (bolsa)" },
  { id: "contadoconliqui", label: "Dólar CCL" },
  { id: "oficial", label: "Dólar oficial" },
  { id: "blue", label: "Dólar blue" },
  { id: "mayorista", label: "Dólar mayorista" },
  { id: "cripto", label: "Dólar cripto" },
  { id: "tarjeta", label: "Dólar tarjeta" },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (e) {
    console.warn(`[FinanzAR Portfolio] Error leyendo ${key}`, e);
    return fallback;
  }
}

function writeJson<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[FinanzAR Portfolio] Error guardando ${key}`, e);
  }
}

export const loadTransacciones = () => readJson<Transaccion[]>(KEY_TRANSACCIONES, []);
export const saveTransacciones = (t: Transaccion[]) => writeJson(KEY_TRANSACCIONES, t);
export const loadPlazosFijos = () => readJson<PlazoFijo[]>(KEY_PLAZOS_FIJOS, []);
export const savePlazosFijos = (p: PlazoFijo[]) => writeJson(KEY_PLAZOS_FIJOS, p);
export const loadFondosComunes = () => readJson<FondoComun[]>(KEY_FONDOS_COMUNES, []);
export const saveFondosComunes = (f: FondoComun[]) => writeJson(KEY_FONDOS_COMUNES, f);
export const loadHistorial = () => readJson<PuntoPortfolio[]>(KEY_HISTORIAL, []);
export const saveHistorial = (h: PuntoPortfolio[]) => writeJson(KEY_HISTORIAL, h);
export const loadConfig = (): PortfolioConfig => ({
  ...DEFAULT_CONFIG,
  ...readJson<Partial<PortfolioConfig>>(KEY_CONFIG, {}),
});
export const saveConfig = (c: PortfolioConfig) => writeJson(KEY_CONFIG, c);
export const loadEventos = () => readJson<EventoMovimiento[]>(KEY_EVENTOS, []);
export const saveEventos = (e: EventoMovimiento[]) => writeJson(KEY_EVENTOS, e);
export const loadEfectivo = () => readJson<MovimientoEfectivo[]>(KEY_EFECTIVO, []);
export const saveEfectivo = (e: MovimientoEfectivo[]) => writeJson(KEY_EFECTIVO, e);

/** Saldo de efectivo disponible (ingresos − retiros) hasta una fecha dada (por defecto, hoy). */
export function saldoEfectivo(movimientos: MovimientoEfectivo[], hasta = hoyISO()): number {
  return movimientos
    .filter((m) => m.fecha <= hasta)
    .reduce((acc, m) => acc + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);
}

export const nuevoId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------------------------------------------
   Fechas (YYYY-MM-DD, siempre en hora local del usuario)
   ------------------------------------------------------------------ */
export function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseISO(fecha: string): number {
  // Se parsea como fecha local (no UTC) para no correr un día por la zona horaria.
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}

export function diasEntre(desde: string, hasta: string): number {
  const ms = parseISO(hasta) - parseISO(desde);
  return Math.floor(ms / 86_400_000);
}

function msToISO(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function sumarDias(fecha: string, dias: number): string {
  return msToISO(parseISO(fecha) + dias * 86_400_000);
}

export function formatFechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/* ------------------------------------------------------------------
   Posiciones de mercado — derivadas del log de transacciones
   (costo promedio ponderado; una venta no cambia el promedio restante)
   ------------------------------------------------------------------ */
export interface Posicion {
  instrumentId: string;
  nombre: string;
  categoria: Categoria;
  unidad: Instrumento["unidad"];
  ticker?: string;
  moneda: "ARS" | "USD";
  cantidad: number;
  /** Costo total de lo que se tiene (cantidad × precio promedio), en moneda del instrumento. */
  costoTotal: number;
  precioPromedio: number;
  /** Ganancia/pérdida ya realizada por ventas, acumulada, en moneda del instrumento. */
  realizada: number;
  /** Fecha promedio ponderada de compra (para devengar instrumentos con TNA). */
  fechaPromedio: string;
  /** Instrumento en vivo, si está cargado. */
  instrumento?: Instrumento;
  /** Precio/valor actual por unidad; null si no hay dato en vivo. */
  precioActual: number | null;
  /** Valor de mercado actual en moneda del instrumento; null si no se puede valuar. */
  valorActual: number | null;
  /** true cuando el valor se estima devengando la TNA vigente (FCI/criptopesos). */
  valorEstimadoPorTna: boolean;
  transacciones: Transaccion[];
}

export const monedaDe = (unidad: Instrumento["unidad"]): "ARS" | "USD" =>
  unidad === "precio_usd" ? "USD" : "ARS";

export function ordenarTransacciones(txs: Transaccion[]): Transaccion[] {
  return [...txs].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
}

export function derivarPosiciones(
  transacciones: Transaccion[],
  instrumentos: Instrumento[],
  hoy = hoyISO()
): Posicion[] {
  const porInstrumento = new Map<string, Transaccion[]>();
  ordenarTransacciones(transacciones).forEach((tx) => {
    const list = porInstrumento.get(tx.instrumentId) || [];
    list.push(tx);
    porInstrumento.set(tx.instrumentId, list);
  });
  const instMap = new Map(instrumentos.map((i) => [i.id, i]));

  const posiciones: Posicion[] = [];
  porInstrumento.forEach((txs, instrumentId) => {
    let cantidad = 0;
    let costoTotal = 0;
    let realizada = 0;
    let sumaFechaPonderada = 0; // Σ(costo × timestamp) de las compras vigentes

    txs.forEach((tx) => {
      if (tx.tipo === "compra") {
        costoTotal += tx.cantidad * tx.precioUnitario;
        cantidad += tx.cantidad;
        sumaFechaPonderada += tx.cantidad * tx.precioUnitario * parseISO(tx.fecha);
      } else {
        if (cantidad <= 0) return;
        const vendida = Math.min(tx.cantidad, cantidad);
        const promedio = costoTotal / cantidad;
        realizada += (tx.precioUnitario - promedio) * vendida;
        // La venta reduce proporcionalmente el costo (y la fecha ponderada) sin cambiar el promedio.
        const proporcion = vendida / cantidad;
        sumaFechaPonderada *= 1 - proporcion;
        costoTotal -= promedio * vendida;
        cantidad -= vendida;
      }
    });

    // Normalizar residuos de coma flotante (ej. 1e-12 después de vender todo).
    if (cantidad < 1e-9) {
      cantidad = 0;
      costoTotal = 0;
    }

    const ultima = txs[txs.length - 1];
    const instrumento = instMap.get(instrumentId);
    const unidad = instrumento?.unidad || ultima.unidad;
    const precioPromedio = cantidad > 0 ? costoTotal / cantidad : 0;
    const fechaPromedio =
      costoTotal > 0
        ? msToISO(sumaFechaPonderada / costoTotal)
        : ultima.fecha;

    let precioActual: number | null = null;
    let valorActual: number | null = null;
    let valorEstimadoPorTna = false;

    if (instrumento && cantidad > 0) {
      if (unidad === "TNA") {
        // FCI / criptopesos: la app expone un rendimiento anualizado, no un
        // precio de cuotaparte. Se devenga linealmente la TNA vigente sobre
        // el costo desde la fecha promedio de compra — es una estimación
        // honesta, marcada como tal en la UI.
        const dias = Math.max(0, diasEntre(fechaPromedio, hoy));
        valorActual = costoTotal * (1 + (instrumento.tasaORendimientoActual / 100 / 365) * dias);
        precioActual = valorActual / cantidad;
        valorEstimadoPorTna = true;
      } else {
        precioActual = instrumento.tasaORendimientoActual;
        valorActual = cantidad * precioActual;
      }
    }

    posiciones.push({
      instrumentId,
      nombre: instrumento?.nombre || ultima.instrumentoNombre,
      categoria: instrumento?.categoria || ultima.categoria,
      unidad,
      ticker: instrumento?.ticker || ultima.ticker,
      moneda: monedaDe(unidad),
      cantidad,
      costoTotal,
      precioPromedio,
      realizada,
      fechaPromedio,
      instrumento,
      precioActual,
      valorActual,
      valorEstimadoPorTna,
      transacciones: txs,
    });
  });

  return posiciones;
}

/**
 * Busca el precio histórico de un instrumento en una fecha dada, usando su
 * propio `historico` (el mismo array que ya usa el gráfico individual de
 * Mercados): el punto más reciente con `fecha <= fecha` pedida, o si todos
 * los puntos son posteriores, el más antiguo disponible (mejor aproximación
 * que nada). Null si el instrumento no tiene histórico cargado.
 */
export function precioHistoricoEnFecha(instrumento: Instrumento | undefined, fecha: string): number | null {
  if (!instrumento || !instrumento.historico || instrumento.historico.length === 0) return null;
  const puntos = instrumento.historico;
  let candidato: PuntoHistorico | null = null;
  for (const punto of puntos) {
    if (punto.fecha <= fecha && (!candidato || punto.fecha > candidato.fecha)) candidato = punto;
  }
  if (candidato) return candidato.valor;
  return puntos.reduce((min, p) => (p.fecha < min.fecha ? p : min), puntos[0]).valor;
}

/**
 * Como `derivarPosiciones`, pero pensada para reconstruir un día pasado (el
 * tramo del gráfico previo al primer punto guardado, ver `PortfolioChart`):
 * solo cuenta las transacciones ya cargadas a esa fecha, y valúa cada
 * posición de mercado (no TNA) con el precio histórico del instrumento en
 * esa fecha en lugar de la cotización de hoy — así una suba o baja real de
 * precio entre la fecha de compra y el primer snapshot se refleja en la
 * curva en vez de quedar como una línea plana.
 */
export function derivarPosicionesEnFecha(
  transacciones: Transaccion[],
  instrumentos: Instrumento[],
  fecha: string
): Posicion[] {
  const hastaFecha = transacciones.filter((t) => t.fecha <= fecha);
  const posiciones = derivarPosiciones(hastaFecha, instrumentos, fecha);
  return posiciones.map((p) => {
    if (!p.instrumento || p.cantidad <= 0 || p.valorEstimadoPorTna) return p; // TNA ya se devenga correctamente para la fecha pedida
    const historico = precioHistoricoEnFecha(p.instrumento, fecha);
    if (historico === null) return p; // sin histórico: mejor dejar el precio de hoy que no valuar nada
    return { ...p, precioActual: historico, valorActual: p.cantidad * historico };
  });
}

/* ------------------------------------------------------------------
   Plazos fijos — devengo determinístico (interés simple, lineal)
   ------------------------------------------------------------------ */
export function plazoEnDias(pf: Pick<PlazoFijo, "fechaInicio" | "fechaVencimiento">): number {
  return Math.max(0, diasEntre(pf.fechaInicio, pf.fechaVencimiento));
}

export function devengadoPlazoFijo(pf: PlazoFijo, fecha = hoyISO()): number {
  const dias = Math.min(Math.max(0, diasEntre(pf.fechaInicio, fecha)), plazoEnDias(pf));
  return pf.capital * (pf.tna / 100 / 365) * dias;
}

export function interesTotalPlazoFijo(pf: PlazoFijo): number {
  return pf.capital * (pf.tna / 100 / 365) * plazoEnDias(pf);
}

export const valorFinalPlazoFijo = (pf: PlazoFijo): number => pf.capital + interesTotalPlazoFijo(pf);

/** Estado efectivo: un PF guardado como "activo" pasa a "vencido" al llegar la fecha. */
export function estadoEfectivo(pf: PlazoFijo, hoy = hoyISO()): PlazoFijo["estado"] {
  if (pf.estado === "activo" && diasEntre(pf.fechaInicio, hoy) >= plazoEnDias(pf)) return "vencido";
  return pf.estado;
}

export const esPlazoFijoVigente = (pf: PlazoFijo) => pf.estado === "activo";

/* ------------------------------------------------------------------
   Fondos comunes "por rendimiento" — devengo lineal de la TNA del fondo
   ------------------------------------------------------------------ */
export interface FondoComunValuado extends FondoComun {
  instrumento?: Instrumento;
  /** TNA usada para valuar (fija > en vivo > última guardada); null si no hay ninguna. */
  tnaUsada: number | null;
  origenTna: "fija" | "vivo" | "guardada" | "ninguna";
  valorActual: number;
  devengado: number;
}

export function valuarFondoComun(fc: FondoComun, instrumentos: Instrumento[], hoy = hoyISO()): FondoComunValuado {
  const instrumento = fc.instrumentId ? instrumentos.find((i) => i.id === fc.instrumentId) : undefined;
  let tnaUsada: number | null = null;
  let origenTna: FondoComunValuado["origenTna"] = "ninguna";
  if (typeof fc.tnaFija === "number") {
    tnaUsada = fc.tnaFija;
    origenTna = "fija";
  } else if (instrumento) {
    tnaUsada = instrumento.tasaORendimientoActual;
    origenTna = "vivo";
  } else if (typeof fc.ultimaTna === "number") {
    tnaUsada = fc.ultimaTna;
    origenTna = "guardada";
  }
  const dias = Math.max(0, diasEntre(fc.fechaInicio, hoy));
  const devengado = tnaUsada !== null ? fc.capital * (tnaUsada / 100 / 365) * dias : 0;
  return { ...fc, instrumento, tnaUsada, origenTna, valorActual: fc.capital + devengado, devengado };
}

/**
 * Rescate (total o parcial) de un fondo: se retira `monto` del valor actual;
 * la parte proporcional del capital deja de devengar y la diferencia se
 * realiza como ganancia/pérdida.
 */
export function aplicarRescate(fc: FondoComunValuado, monto: number, fecha = hoyISO()): FondoComun {
  const valor = fc.valorActual;
  if (valor <= 0) return { ...fc, estado: "rescatado", capital: 0 };
  const proporcion = Math.min(1, monto / valor);
  const capitalRetirado = fc.capital * proporcion;
  const total = proporcion >= 0.999;
  const { instrumento: _i, tnaUsada: _t, origenTna: _o, valorActual: _v, devengado: _d, ...base } = fc;
  return {
    ...base,
    capital: total ? 0 : Number((fc.capital - capitalRetirado).toFixed(2)),
    realizada: Number((fc.realizada + (monto - capitalRetirado)).toFixed(2)),
    rescates: [...fc.rescates, { fecha, monto: Number(monto.toFixed(2)) }],
    estado: total ? "rescatado" : "activo",
  };
}

/* ------------------------------------------------------------------
   Conversión USD → ARS y totales consolidados
   ------------------------------------------------------------------ */
export function cotizacionDolar(
  instrumentos: Instrumento[],
  casa: CasaDolar
): number | null {
  const inst = instrumentos.find((i) => i.id === `divisas-usd-${casa}`);
  return inst && inst.tasaORendimientoActual > 0 ? inst.tasaORendimientoActual : null;
}

export interface TotalesPortfolio {
  /** Valor total consolidado en ARS (mercado + plazos fijos). */
  valorTotal: number;
  capitalInvertido: number;
  resultado: number;
  resultadoPct: number;
  /** Ganancia realizada acumulada por ventas, consolidada en ARS. */
  realizada: number;
  /** Posiciones que no se pudieron valuar (instrumento sin dato en vivo). */
  sinValuar: number;
}

export function calcularTotales(
  posiciones: Posicion[],
  plazosFijos: PlazoFijo[],
  fondosComunes: FondoComunValuado[],
  dolar: number | null,
  /** Saldo de efectivo (ARS) a incluir en el total; cuenta como capital invertido a su propio valor (no gana ni pierde). */
  efectivo = 0,
  hoy = hoyISO()
): TotalesPortfolio {
  const aArs = (monto: number, moneda: "ARS" | "USD") =>
    moneda === "USD" ? monto * (dolar ?? 0) : monto;

  let valorTotal = 0;
  let capitalInvertido = 0;
  let realizada = 0;
  let sinValuar = 0;

  posiciones.forEach((p) => {
    realizada += aArs(p.realizada, p.moneda);
    if (p.cantidad <= 0) return;
    capitalInvertido += aArs(p.costoTotal, p.moneda);
    if (p.valorActual === null || (p.moneda === "USD" && dolar === null)) {
      sinValuar++;
      // Sin dato en vivo se toma el costo como mejor aproximación para no
      // hundir el total a cero; la UI avisa cuántas posiciones están así.
      valorTotal += aArs(p.costoTotal, p.moneda);
    } else {
      valorTotal += aArs(p.valorActual, p.moneda);
    }
  });

  plazosFijos.filter(esPlazoFijoVigente).forEach((pf) => {
    capitalInvertido += pf.capital;
    valorTotal += pf.capital + devengadoPlazoFijo(pf, hoy);
  });

  fondosComunes.forEach((fc) => {
    realizada += fc.realizada;
    if (fc.estado !== "activo") return;
    capitalInvertido += fc.capital;
    if (fc.tnaUsada === null) sinValuar++;
    valorTotal += fc.valorActual;
  });

  // Efectivo: no invierte ni devenga, pero cuenta como capital "propio" (su
  // costo es su mismo valor) — así retirarlo del portfolio sí baja el total,
  // y un rescate que pasa a efectivo no cambia el valor total, solo el
  // resultado no realizado (la ganancia queda "cobrada").
  capitalInvertido += efectivo;
  valorTotal += efectivo;

  const resultado = valorTotal - capitalInvertido;
  return {
    valorTotal,
    capitalInvertido,
    resultado,
    resultadoPct: capitalInvertido > 0 ? (resultado / capitalInvertido) * 100 : 0,
    realizada,
    sinValuar,
  };
}

/**
 * Reconstruye los totales del portfolio en una fecha pasada, usando solo las
 * transacciones/plazos fijos/FCI/efectivo ya cargados a esa fecha y, para
 * posiciones de mercado, el precio histórico del instrumento (no el de hoy).
 * Se usa exclusivamente para dibujar el tramo del gráfico anterior al primer
 * punto guardado (ver `PortfolioChart`) — el historial real forward-only no
 * se toca ni se recalcula con esta función.
 */
export function calcularTotalesEnFecha(
  fecha: string,
  transacciones: Transaccion[],
  plazosFijos: PlazoFijo[],
  fondosComunes: FondoComun[],
  instrumentos: Instrumento[],
  eventos: EventoMovimiento[],
  efectivoMovs: MovimientoEfectivo[],
  dolar: number | null
): TotalesPortfolio {
  const posiciones = derivarPosicionesEnFecha(transacciones, instrumentos, fecha);

  const pfEnFecha = plazosFijos
    .filter((pf) => {
      if (fecha < pf.fechaInicio) return false;
      if (pf.estado === "activo" || pf.estado === "vencido") return true;
      // Renovado/retirado: solo cuenta si la fecha pedida es anterior al evento que lo dio de baja.
      const evento = eventos.find((e) => e.refId === pf.id && (e.tipo === "retiro_pf" || e.tipo === "renovacion_pf"));
      return evento ? fecha < evento.fecha : false;
    })
    // calcularTotales solo suma los PF con estado "activo" (esPlazoFijoVigente) — acá ya
    // determinamos que estaban vigentes a esta fecha, sin importar su estado actual.
    .map((pf) => ({ ...pf, estado: "activo" as const }));

  const fondosEnFecha = fondosComunes
    .filter((fc) => fecha >= fc.fechaInicio)
    .map((fc): FondoComunValuado | null => {
      if (fc.estado === "activo") return valuarFondoComun(fc, instrumentos, fecha);
      const primerRescate = fc.rescates[0]?.fecha;
      if (primerRescate && fecha < primerRescate) {
        // Aproximación: antes del primer rescate el capital era el actual (0 si se rescató todo)
        // más lo que se retiró después, menos la ganancia ya realizada.
        const capitalAprox = fc.capital + fc.rescates.reduce((s, r) => s + r.monto, 0) - fc.realizada;
        if (capitalAprox <= 0) return null;
        return valuarFondoComun({ ...fc, capital: capitalAprox, estado: "activo" }, instrumentos, fecha);
      }
      return null;
    })
    .filter((f): f is FondoComunValuado => f !== null);

  const efectivo = saldoEfectivo(efectivoMovs, fecha);
  return calcularTotales(posiciones, pfEnFecha, fondosEnFecha, dolar, efectivo, fecha);
}

/* ------------------------------------------------------------------
   Historial forward-only del gráfico
   ------------------------------------------------------------------ */
export function agregarPuntoHistorial(
  historial: PuntoPortfolio[],
  punto: PuntoPortfolio
): PuntoPortfolio[] {
  const sinHoy = historial.filter((p) => p.fecha !== punto.fecha);
  const next = [...sinHoy, punto].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return next.length > MAX_PUNTOS_HISTORIAL ? next.slice(-MAX_PUNTOS_HISTORIAL) : next;
}

/* ------------------------------------------------------------------
   Formateo
   ------------------------------------------------------------------ */
/** Decimales de cantidad según categoría: cripto necesita muchos, acciones pocos. */
export function decimalesCantidad(categoria: Categoria): number {
  switch (categoria) {
    case "cripto":
      return 8;
    case "fci":
      return 6;
    case "divisas":
    case "eeuu":
      return 4;
    default:
      return 2;
  }
}

export function formatCantidad(cantidad: number, categoria: Categoria): string {
  return cantidad.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalesCantidad(categoria),
  });
}

export function formatMoneda(monto: number, moneda: "ARS" | "USD" = "ARS", compact = false): string {
  const abs = Math.abs(monto);
  const decimales = abs > 0 && abs < 100 ? 2 : compact ? 0 : 2;
  const num = abs.toLocaleString("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  const signo = monto < 0 ? "-" : "";
  return moneda === "USD" ? `${signo}US$ ${num}` : `${signo}$ ${num}`;
}

export function formatPrecio(precio: number, moneda: "ARS" | "USD"): string {
  const abs = Math.abs(precio);
  const maxDec = abs < 1 ? 6 : abs < 100 ? 2 : 2;
  const num = abs.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: maxDec });
  return moneda === "USD" ? `US$ ${num}` : `$ ${num}`;
}

export function formatPct(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

/* ------------------------------------------------------------------
   Backup manual (exportar / importar JSON)
   ------------------------------------------------------------------ */
export interface PortfolioBackup {
  app: "FinanzAR";
  version: 1;
  exportadoEn: string;
  transacciones: Transaccion[];
  plazosFijos: PlazoFijo[];
  fondosComunes: FondoComun[];
  historial: PuntoPortfolio[];
  config: PortfolioConfig;
  eventos: EventoMovimiento[];
  efectivo: MovimientoEfectivo[];
}

export function armarBackup(): PortfolioBackup {
  return {
    app: "FinanzAR",
    version: 1,
    exportadoEn: new Date().toISOString(),
    transacciones: loadTransacciones(),
    plazosFijos: loadPlazosFijos(),
    fondosComunes: loadFondosComunes(),
    historial: loadHistorial(),
    config: loadConfig(),
    eventos: loadEventos(),
    efectivo: loadEfectivo(),
  };
}

/** Valida la forma mínima de un backup; lanza Error con mensaje legible si no sirve. */
export function parsearBackup(texto: string): PortfolioBackup {
  let data: any;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!data || data.app !== "FinanzAR" || !Array.isArray(data.transacciones) || !Array.isArray(data.plazosFijos)) {
    throw new Error("El archivo no parece ser un backup de portfolio de FinanzAR.");
  }
  const txOk = data.transacciones.every(
    (t: any) => t && typeof t.id === "string" && typeof t.instrumentId === "string" && (t.tipo === "compra" || t.tipo === "venta") && typeof t.cantidad === "number" && typeof t.precioUnitario === "number" && typeof t.fecha === "string"
  );
  const pfOk = data.plazosFijos.every(
    (p: any) => p && typeof p.id === "string" && typeof p.capital === "number" && typeof p.tna === "number" && typeof p.fechaInicio === "string" && typeof p.fechaVencimiento === "string"
  );
  const fondos = Array.isArray(data.fondosComunes) ? data.fondosComunes : [];
  const fcOk = fondos.every(
    (f: any) => f && typeof f.id === "string" && typeof f.fondo === "string" && typeof f.capital === "number" && typeof f.fechaInicio === "string"
  );
  if (!txOk || !pfOk || !fcOk) throw new Error("El backup tiene registros con un formato que no se reconoce.");
  // eventos/efectivo son nuevos (backups viejos no los traen) — se aceptan si están, si no arrancan vacíos.
  const eventos = Array.isArray(data.eventos)
    ? data.eventos.filter(
        (e: any) => e && typeof e.id === "string" && typeof e.fecha === "string" && typeof e.tipo === "string" && typeof e.monto === "number"
      )
    : [];
  const efectivo = Array.isArray(data.efectivo)
    ? data.efectivo.filter(
        (e: any) => e && typeof e.id === "string" && typeof e.fecha === "string" && (e.tipo === "ingreso" || e.tipo === "retiro") && typeof e.monto === "number"
      )
    : [];
  return {
    app: "FinanzAR",
    version: 1,
    exportadoEn: typeof data.exportadoEn === "string" ? data.exportadoEn : new Date().toISOString(),
    transacciones: data.transacciones,
    plazosFijos: data.plazosFijos,
    fondosComunes: fondos.map((f: any) => ({ realizada: 0, rescates: [], estado: "activo", ...f })),
    historial: Array.isArray(data.historial) ? data.historial : [],
    config: { ...DEFAULT_CONFIG, ...(data.config || {}) },
    eventos,
    efectivo,
  };
}
