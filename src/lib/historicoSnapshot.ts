import { PuntoHistorico, Categoria } from "../types";

// Histórico "casero" armado por una rutina propia que corre 1 vez por día
// (ver scripts/snapshot-historico.mjs y la sección correspondiente en
// references/finanzar-REFERENCE.md) y va guardando en
// public/historico/{categoria}.json un punto nuevo por instrumento cada
// vez que corre. Existe porque, a la fecha, no encontramos una fuente
// gratuita y con CORS habilitado que ofrezca histórico real para Plazos
// Fijos, FCI, Bonos, CEDEARs/Acciones (el histórico que exponía data912
// para estas tres últimas resultó estar congelado hace años, ver la nota
// en history.ts) ni EE.UU. Arranca vacío / con muy pocos puntos y se va
// llenando con el correr de los días — hasta que no haya al menos 2
// puntos para un instrumento puntual, no hay nada útil que graficar y se
// cae a la estimación sintética de siempre.

type SnapshotFile = Record<string, { fecha: string; valor: number }[]>;

const SNAPSHOT_FILE_BY_CATEGORIA: Partial<Record<Categoria, string>> = {
  pesos: "pesos",
  fci: "fci",
  cedears: "cedears",
  acciones: "acciones",
  bonos: "bonos",
  eeuu: "eeuu",
};

const memoryCache = new Map<string, SnapshotFile | null>();

function formatFechaISO(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

async function loadSnapshotFile(fileKey: string): Promise<SnapshotFile | null> {
  if (memoryCache.has(fileKey)) return memoryCache.get(fileKey)!;

  try {
    // Se sirve como archivo estático desde public/historico/ (Vercel lo
    // despliega tal cual, sin necesidad de rebuildear la app cuando la
    // rutina agrega un punto nuevo). cache: "no-store" para no quedarse
    // con una copia vieja cacheada por el browser durante el día.
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
 * Devuelve el histórico propio (armado día a día) de un instrumento, si la
 * categoría tiene un archivo de snapshot y ese instrumento ya acumuló datos.
 * null si no aplica o todavía no hay nada útil (menos de 2 puntos).
 */
export async function getSnapshotHistory(
  categoria: Categoria,
  instrumentId: string
): Promise<PuntoHistorico[] | null> {
  const fileKey = SNAPSHOT_FILE_BY_CATEGORIA[categoria];
  if (!fileKey) return null;

  const file = await loadSnapshotFile(fileKey);
  if (!file) return null;

  const series = file[instrumentId];
  if (!series || series.length < 2) return null;

  return series.map((p) => ({ fecha: formatFechaISO(p.fecha), valor: p.valor }));
}
