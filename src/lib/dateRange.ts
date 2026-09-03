import { PuntoHistorico, RangoTemporal } from "../types";

// Cantidad aproximada de puntos (datos diarios) que corresponde a cada rango.
// "max" no recorta nada.
export const RANGE_POINTS: Record<RangoTemporal, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1a": 365,
  max: null,
};

/**
 * Recorta una serie histórica (ya ordenada cronológicamente) a los últimos
 * N puntos correspondientes al rango pedido. Si la serie tiene menos puntos
 * que el rango, la devuelve completa.
 */
export function sliceByRange(data: PuntoHistorico[], range: RangoTemporal): PuntoHistorico[] {
  if (!data || data.length === 0) return data;
  const days = RANGE_POINTS[range];
  if (days === null || data.length <= days) return data;
  return data.slice(-days);
}
