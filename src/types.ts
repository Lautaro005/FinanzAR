export type Categoria = "pesos" | "fci" | "cripto" | "cedears" | "acciones" | "bonos" | "eeuu";

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
}

export type RangoTemporal = "7d" | "30d" | "90d" | "1a" | "max";
