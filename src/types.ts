export type Categoria = "pesos" | "fci" | "cripto" | "cedears" | "acciones" | "bonos" | "eeuu" | "divisas";

export interface PuntoHistorico {
  fecha: string;
  valor: number;
}

export interface Instrumento {
  id: string;
  nombre: string;
  categoria: Categoria;
  entidadOFuente: string;
  tasaORendimientoActual: number;
  variacion24h?: number;
  unidad: "TNA" | "precio_ars" | "precio_usd";
  historico: PuntoHistorico[];
  actualizadoEn: string;
  ticker?: string;
  descripcion?: string;
  enlace?: string;
  /** Rubro / categoría de negocio específica del instrumento (ej. "Semiconductores", "Banca", "ETF — S&P 500"). */
  rubro?: string;
  /** A qué organismo/mecanismo está sujeto este instrumento en particular (no un texto genérico por app). */
  supervisionRegulatoria?: string;
  /** Moneda en la que efectivamente se liquida/settlea este instrumento en particular. */
  monedaLiquidacion?: string;
}

export type RangoTemporal = "7d" | "30d" | "90d" | "1a" | "max";

/* ============================================================
   PORTFOLIO PERSONAL (ver src/lib/portfolio.ts)
   ============================================================ */

/** Operación de compra/venta sobre un instrumento de mercado (todo menos plazos fijos). */
export interface Transaccion {
  id: string;
  /** Referencia al `Instrumento.id` que ya usa el resto de la app. */
  instrumentId: string;
  tipo: "compra" | "venta";
  /** Fecha ISO (YYYY-MM-DD), editable: permite cargar operaciones pasadas. */
  fecha: string;
  /** Unidades: cuotapartes, nominales, USD, BTC, etc. */
  cantidad: number;
  /** Lo pagado/cobrado por unidad ese día, en la moneda del instrumento. */
  precioUnitario: number;
  notas?: string;
  /**
   * Foto del instrumento al momento de operar, para que la posición siga
   * pudiendo mostrarse aunque el instrumento no esté cargado en vivo
   * (fuente caída, ticker dado de baja, id renombrado).
   */
  instrumentoNombre: string;
  categoria: Categoria;
  unidad: Instrumento["unidad"];
  ticker?: string;
}

export type EstadoPlazoFijo = "activo" | "vencido" | "renovado" | "retirado";

/** Plazo fijo: capital + TNA fija + vencimiento; devenga interés simple y lineal. */
export interface PlazoFijo {
  id: string;
  entidad: string;
  capital: number;
  /** Tasa fija (TNA, en %) pactada al constituirlo — no la tasa "hoy" del banco. */
  tna: number;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: EstadoPlazoFijo;
  notas?: string;
}

/** Punto del gráfico de evolución del portfolio (forward-only, un punto por día). */
export interface PuntoPortfolio {
  fecha: string;
  valorTotal: number;
  capitalInvertido: number;
}

/** Casas de dólar de DolarAPI utilizables para consolidar USD → ARS. */
export type CasaDolar = "oficial" | "blue" | "bolsa" | "contadoconliqui" | "mayorista" | "cripto" | "tarjeta";

/** Moneda en la que se muestran todos los valores del portfolio (toggle junto al título). */
export type MonedaVista = "ARS" | "USD";

export interface PortfolioConfig {
  dolarCasa: CasaDolar;
  /** Moneda de visualización del portfolio (default ARS). */
  monedaVista?: MonedaVista;
  /** Última cotización usada, como respaldo si Divisas no cargó en vivo. */
  ultimoDolar?: { casa: CasaDolar; valor: number; fecha: string };
}

/**
 * Posición en un Fondo Común de Inversión cargada "por rendimiento": sin
 * cuotapartes ni vencimiento — capital que devenga la TNA del fondo (en vivo
 * o fija) desde la fecha de suscripción hasta que se rescata.
 */
export interface FondoComun {
  id: string;
  /** `Instrumento.id` del FCI (categoría "fci") para tomar su rendimiento en vivo. */
  instrumentId?: string;
  fondo: string;
  /** Capital vigente, neto de rescates parciales. */
  capital: number;
  fechaInicio: string;
  /** Si está definida se usa en lugar del rendimiento en vivo del fondo. */
  tnaFija?: number;
  /** Última TNA en vivo vista para este fondo (respaldo si la fuente no carga). */
  ultimaTna?: number;
  estado: "activo" | "rescatado";
  /** Ganancia realizada acumulada por rescates. */
  realizada: number;
  rescates: { fecha: string; monto: number }[];
  notas?: string;
}

/* ------------------------------------------------------------------
   Movimientos (ver src/lib/portfolio.ts) — historial unificado
   ------------------------------------------------------------------ */

/** Tipos de evento que puede tener el historial de "Movimientos" (además de compra/venta, que salen de Transaccion). */
export type TipoMovimiento =
  | "compra"
  | "venta"
  | "alta_pf"
  | "renovacion_pf"
  | "retiro_pf"
  | "alta_fci"
  | "rescate_fci"
  | "efectivo_ingreso"
  | "efectivo_retiro";

/**
 * Evento que no sale de un log de Transaccion (altas/renovaciones/retiros de
 * plazo fijo, altas/rescates de FCI, ingresos/retiros de efectivo) pero que
 * tiene que aparecer igual en "Movimientos". Es un registro de solo lectura:
 * se agrega en el momento de cada acción, no se deriva de otro estado.
 */
export interface EventoMovimiento {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  /** Entidad/fondo/instrumento involucrado, o "Efectivo". */
  descripcion: string;
  monto: number;
  moneda: "ARS" | "USD";
  notas?: string;
  /** id del PlazoFijo / FondoComun / MovimientoEfectivo relacionado, para poder limpiar el log si se borra el origen. */
  refId?: string;
}

/**
 * Efectivo: dinero dentro del portfolio que no está invertido (ingresos
 * manuales del usuario + lo que queda disponible tras un rescate/retiro de
 * otro instrumento). Siempre en ARS. Se modela como un log de movimientos
 * (como Transaccion), no como un saldo — el saldo se deriva sumando.
 */
export interface MovimientoEfectivo {
  id: string;
  fecha: string;
  tipo: "ingreso" | "retiro";
  monto: number;
  notas?: string;
}
