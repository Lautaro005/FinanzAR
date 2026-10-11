import { PuntoHistorico, Categoria } from "../types";

// Histórico "casero" armado por la rutina de snapshot (scripts/snapshot-historico.mjs,
// corre de lunes a viernes) y por el backfill (scripts/backfill-historico.mjs) en
// public/historico/{archivo}.json: { [instrumentId]: [{ fecha: "YYYY-MM-DD", valor }] }.
// Lo lee el navegador como archivo estático (sin rebuild de la app).
// Si un instrumento tiene menos de 2 puntos, no hay nada útil que graficar.

export type SnapshotPunto = { fecha: string; valor: number };
type SnapshotFile = Record<string, SnapshotPunto[]>;

const SNAPSHOT_FILE_BY_CATEGORIA: Partial<Record<Categoria, string>> = {
  pesos: "pesos",
  fci: "fci",
  cedears: "cedears",
  acciones: "acciones",
  bonos: "bonos",
  eeuu: "eeuu",
  divisas: "divisas",
};

const memoryCache = new Map<string, SnapshotFile | null>();

function formatFechaISO(iso: string): string {
  // "YYYY-MM-DD" a secas se parsearía como medianoche UTC, que en Argentina cae en el día anterior.
  // Se arma en hora local para mostrar la fecha que dice el dato.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

async function loadSnapshotFile(fileKey: string): Promise<SnapshotFile | null> {
  if (memoryCache.has(fileKey)) return memoryCache.get(fileKey)!;

  try {
    // cache: "no-store" para no quedarse con una copia vieja cacheada por el browser.
    const res = await fetch(`/historico/${fileKey}.json`, { cache: "no-store" });
    if (!res.ok) {
      memoryCache.set(fileKey, null);
      return null;
    }
    const data = (await res.json()) as SnapshotFile;
    memoryCache.set(fileKey, data);
    return data;
  } catch (e) {
    console.warn(`[historicoSnapshot] No se pudo cargar /historico/${fileKey}.json`, e);
    memoryCache.set(fileKey, null);
    return null;
  }
}

/**
 * Serie tal cual está en el archivo (fechas ISO), o null si no existe o tiene menos de 2 puntos.
 * Sirve para combinar con otras fuentes (ej. el tramo previo de cripto antes de CoinGecko).
 */
export async function getSnapshotSerieCruda(fileKey: string, instrumentId: string): Promise<SnapshotPunto[] | null> {
  const file = await loadSnapshotFile(fileKey);
  if (!file) return null;
  const series = file[instrumentId];
  return series && series.length >= 2 ? series : null;
}

/**
 * Devuelve el histórico propio de un instrumento, si la categoría tiene archivo de snapshot
 * y ese instrumento ya acumuló datos. null si no aplica o no hay al menos 2 puntos.
 */
export async function getSnapshotHistory(
  categoria: Categoria,
  instrumentId: string
): Promise<PuntoHistorico[] | null> {
  const fileKey = SNAPSHOT_FILE_BY_CATEGORIA[categoria];
  if (!fileKey) return null;

  const series = await getSnapshotSerieCruda(fileKey, instrumentId);
  if (!series) return null;

  return series.map((p) => ({ fecha: formatFechaISO(p.fecha), valor: p.valor }));
}
