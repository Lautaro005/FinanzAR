import { FCICategoria, FCIRaw, getFCIPenultimo, getFCIUltimo } from "./api/argentinaDatos";

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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calcula, para una categoría de FCI, un rendimiento anualizado real por
 * fondo a partir de la variación de su valor de cuotaparte (VCP) entre el
 * último dato informado y el penúltimo.
 *
 * Nota técnica: se probó primero comparar contra una fecha calendario fija
 * (ej. "hace 30 días") usando /finanzas/fci/{categoria}/{fecha}, pero ese
 * endpoint no es una foto completa del mercado para cualquier fecha — la
 * mayoría de los días devuelve solo un puñado de fondos (los que
 * reportaron justo ese día) y unos pocos días devuelven casi todos, de
 * forma irregular (a veces cada ~9 días, a veces cada ~35). Eso dejaba a
 * más del 95% de los fondos sin rendimiento calculable. En cambio,
 * "ultimo" y "penultimo" son, cada uno, el dato más reciente y el segundo
 * más reciente DE CADA FONDO (no de una fecha calendario), así que cubren
 * ~99% de los fondos de forma consistente y en solo 2 pedidos por
 * categoría (antes se hacían hasta 14).
 */
export async function fetchFCICategoriaConRendimiento(
  categoria: FCICategoria
): Promise<FCIConRendimiento> {
  const label = FCI_CATEGORIAS.find((c) => c.id === categoria)?.label || categoria;

  const [actual, previo] = await Promise.all([
    getFCIUltimo(categoria).catch(() => [] as FCIRaw[]),
    getFCIPenultimo(categoria).catch(() => [] as FCIRaw[]),
  ]);

  const rendimientos = new Map<string, { tasaAnualizada: number; diasReales: number }>();

  if (Array.isArray(actual) && Array.isArray(previo) && previo.length > 0) {
    const previoMap = new Map(previo.map((f) => [f.fondo, f]));
    for (const fondo of actual) {
      const anterior = previoMap.get(fondo.fondo);
      if (!anterior || !anterior.vcp || anterior.vcp <= 0 || !fondo.vcp || fondo.vcp <= 0) continue;
      if (!fondo.fecha || !anterior.fecha || fondo.fecha === anterior.fecha) continue;

      const diasReales = Math.max(
        1,
        Math.round((new Date(fondo.fecha).getTime() - new Date(anterior.fecha).getTime()) / MS_PER_DAY)
      );
      const variacion = fondo.vcp / anterior.vcp - 1;
      const tasaAnualizada = variacion * (365 / diasReales) * 100;

      // Se descartan resultados fuera de un rango verosímil. Al ser una
      // comparación de muy pocos días (normalmente 1-4), fondos de renta
      // variable/mixta con un mal día puntual pueden anualizar a valores
      // extremos que no reflejan un rendimiento real sostenido; se filtran
      // en vez de mostrarlos como si fueran una tasa confiable.
      if (Number.isFinite(tasaAnualizada) && tasaAnualizada > -80 && tasaAnualizada < 400) {
        rendimientos.set(fondo.fondo, { tasaAnualizada, diasReales });
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
