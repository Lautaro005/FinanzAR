import { FCICategoria, FCIRaw, getFCIPorFecha, getFCIUltimo } from "./api/argentinaDatos";

// Fondos Comunes de Inversión (FCI): agrupa las 6 categorías que expone la
// API pública de ArgentinaDatos (fuente: CNV - Cuotapartes). Cada una incluye
// fondos de las principales gestoras/plataformas argentinas (bancos, ALyCs
// como Cocos Capital, IOL, Balanz, etc. publican sus FCIs ante la CNV aunque
// no tengan API propia).
export const FCI_CATEGORIAS: { id: FCICategoria; label: string }[] = [
  { id: "mercadoDinero", label: "Money Market / Mercado de Dinero" },
  { id: "rentaFija", label: "Renta Fija" },
  { id: "rentaVariable", label: "Renta Variable" },
  { id: "rentaMixta", label: "Renta Mixta" },
  { id: "retornoTotal", label: "Retorno Total" },
  { id: "otros", label: "Otros" },
];

export interface FCIConRendimiento {
  categoria: FCICategoria;
  categoriaLabel: string;
  items: FCIRaw[];
  // fondo -> { tasaAnualizada (%), diasReales }
  rendimientos: Map<string, { tasaAnualizada: number; diasReales: number }>;
}

function toFechaPath(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

// Busca la primera fecha con datos publicados, retrocediendo día a día desde
// `daysAgo` (para saltear fines de semana/feriados sin cuotaparte informada).
async function findHistoricalSnapshot(
  categoria: FCICategoria,
  daysAgo: number,
  maxAttempts = 8
): Promise<{ items: FCIRaw[]; diasReales: number } | null> {
  const base = new Date();
  for (let i = 0; i < maxAttempts; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - daysAgo - i);
    try {
      const items = await getFCIPorFecha(categoria, toFechaPath(d));
      if (Array.isArray(items) && items.length > 0) {
        const diasReales = Math.round((base.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        return { items, diasReales };
      }
    } catch {
      // Sin dato para esa fecha (feriado, fin de semana, fondo nuevo): se prueba el día anterior.
    }
  }
  return null;
}

/**
 * Calcula, para una categoría de FCI, un rendimiento anualizado real por
 * fondo a partir de la variación de su valor de cuotaparte (VCP) en los
 * últimos ~30 días. Reemplaza cualquier estimación sintética: es un cálculo
 * propio (no una TNA oficial publicada por la gestora) pero basado 100% en
 * datos reales de la CNV vía ArgentinaDatos.
 */
export async function fetchFCICategoriaConRendimiento(
  categoria: FCICategoria
): Promise<FCIConRendimiento> {
  const label = FCI_CATEGORIAS.find((c) => c.id === categoria)?.label || categoria;

  const [actual, pasado] = await Promise.all([
    getFCIUltimo(categoria).catch(() => [] as FCIRaw[]),
    findHistoricalSnapshot(categoria, 30),
  ]);

  const rendimientos = new Map<string, { tasaAnualizada: number; diasReales: number }>();

  if (pasado && Array.isArray(actual) && actual.length > 0) {
    const pasadoMap = new Map(pasado.items.map((f) => [f.fondo, f.vcp]));
    for (const fondo of actual) {
      const vcpPasado = pasadoMap.get(fondo.fondo);
      if (!vcpPasado || vcpPasado <= 0 || !fondo.vcp || fondo.vcp <= 0) continue;
      const variacion = fondo.vcp / vcpPasado - 1;
      const tasaAnualizada = variacion * (365 / pasado.diasReales) * 100;
      // Se descartan resultados fuera de un rango verosímil (ruido de datos,
      // splits de cuotaparte, fondos con muy baja liquidez).
      if (Number.isFinite(tasaAnualizada) && tasaAnualizada > -50 && tasaAnualizada < 400) {
        rendimientos.set(fondo.fondo, { tasaAnualizada, diasReales: pasado.diasReales });
      }
    }
  }

  return {
    categoria,
    categoriaLabel: label,
    items: Array.isArray(actual) ? actual : [],
    rendimientos,
  };
}

export async function fetchAllFCIsConRendimiento(): Promise<FCIConRendimiento[]> {
  const results = await Promise.allSettled(
    FCI_CATEGORIAS.map((c) => fetchFCICategoriaConRendimiento(c.id))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<FCIConRendimiento> => r.status === "fulfilled")
    .map((r) => r.value);
}
