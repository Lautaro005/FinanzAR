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
