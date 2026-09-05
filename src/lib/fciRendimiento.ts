import { FCICategoria, FCIRaw, getFCIPorFecha, getFCIUltimo } from "./api/argentinaDatos";

// Fondos Comunes de Inversión (FCI): agrupa las 6 categorías que expone la
// API pública de ArgentinaDatos (fuente: CNV - Cuotapartes). Cada una incluye
// fondos de las principales gestoras/plataformas argentinas (bancos, ALyCs
// como Cocos Capital, IOL, Balanz, etc. publican sus FCIs ante la CNV aunque
// no tengan API propia).
// "rentaVariable" (fondos de acciones) se excluye a propósito desde 2026-09-05:
// son fondos que siguen al Merval y presentarlos como una "TNA" anualizada
// daba -50%/+150% según el mes — no describe nada útil y confunde al lado
// de money market/renta fija. La exposición a acciones ya está en la pestaña
// Acciones/CEDEARs. "otros" trae cuentas remuneradas con otro formato (sin vcp).
export const FCI_CATEGORIAS: { id: FCICategoria; label: string }[] = [
  { id: "mercadoDinero", label: "Money Market / Mercado de Dinero" },
  { id: "rentaFija", label: "Renta Fija" },
  { id: "rentaMixta", label: "Renta Mixta" },
  { id: "retornoTotal", label: "Retorno Total" },
];

export interface FCIConRendimiento {
  categoria: FCICategoria;
  categoriaLabel: string;
  items: FCIRaw[];
  // fondo -> { tasaAnualizada (%), diasReales }
  rendimientos: Map<string, { tasaAnualizada: number; diasReales: number }>;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ---------------------------------------------------------------------------
// Ventana de cálculo (lección aprendida 2026-09-05, ver REFERENCE 5.2)
//
// Anualizar la variación de UN día de cuotaparte (ultimo vs penúltimo) da
// números absurdos para cualquier fondo que no sea money market: un buen
// día de +0,8% en renta fija anualiza a "290% TNA". Verificado contra la
// API real: con ventana de 1 día la mediana de renta fija daba 58% y el p90
// 104%; con ventana de ~45 días la mediana baja a 18% y el p90 a 24%, que
// es lo que rinde de verdad un FCI de renta fija en pesos.
//
// La API no tiene histórico por fondo, pero sí "fotos completas" del
// mercado en algunas fechas calendario (/{categoria}/{yyyy}/{mm}/{dd}
// devuelve casi todos los fondos solo en los días en que la CNV publicó el
// lote completo — cada ~10-35 días, sin cadencia fija; el resto de los días
// trae un puñado). Estrategia: sondear qué fechas de los últimos 7-60 días
// son fotos completas (usando rentaFija como índice, es la categoría con
// más fondos) y usar la más cercana a 30 días como base del rendimiento.
// Si para una categoría ninguna foto candidata la cubre, se cae al par
// ultimo/penúltimo de siempre (ventana corta, marcada por `diasReales`).
// ---------------------------------------------------------------------------
const VENTANA_MIN_DIAS = 7;
/** Ventanas de al menos esto se prefieren siempre: con 10 días todavía hay demasiado ruido (verificado: renta fija p50 35% vs 21% con 46 días). */
const VENTANA_PREFERIDA_DIAS = 20;
const VENTANA_MAX_DIAS = 60;
const VENTANA_OBJETIVO_DIAS = 30;
const COBERTURA_MINIMA = 0.4; // fracción de fondos de "ultimo" que debe traer una foto para considerarla completa
const INDICE_MINIMO_FONDOS = 500; // rentaFija completa trae ~1.800 fondos; un día parcial trae menos de 100
const MAX_CANDIDATAS_POR_CATEGORIA = 5;
/** Fondos cuyo último dato es más viejo que esto respecto del dato más nuevo del dataset se descartan (no están actualizados). */
export const FCI_MAX_DIAS_VIGENCIA = 3;
export const FCI_TASA_MINIMA = -20;
export const FCI_TASA_MAXIMA = 60;

const fechaApi = (d: Date): string =>
  `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

interface SnapshotCandidata {
  fechaApi: string;
  diasAtras: number;
}

let candidatasCache: Promise<SnapshotCandidata[]> | null = null;

/** Sondea, una sola vez por sesión, qué fechas recientes son fotos completas del mercado. */
function buscarSnapshotsCompletos(): Promise<SnapshotCandidata[]> {
  if (candidatasCache) return candidatasCache;
  candidatasCache = (async () => {
    const hoy = new Date();
    const dias: number[] = [];
    for (let d = VENTANA_MIN_DIAS; d <= VENTANA_MAX_DIAS; d++) dias.push(d);

    const resultados = await Promise.all(
      dias.map(async (diasAtras) => {
        const fecha = fechaApi(new Date(hoy.getTime() - diasAtras * MS_PER_DAY));
        try {
          const items = await getFCIPorFecha("rentaFija", fecha);
          const n = Array.isArray(items) ? items.length : 0;
          return n >= INDICE_MINIMO_FONDOS ? { fechaApi: fecha, diasAtras } : null;
        } catch {
          return null;
        }
      })
    );

    // Orden de preferencia: primero las ventanas "largas" (≥ 20 días) por
    // cercanía a 30 días; después las cortas, solo como último recurso.
    const distancia = (c: SnapshotCandidata) => Math.abs(c.diasAtras - VENTANA_OBJETIVO_DIAS);
    return resultados
      .filter((r): r is SnapshotCandidata => r !== null)
      .sort((a, b) => {
        const la = a.diasAtras >= VENTANA_PREFERIDA_DIAS ? 0 : 1;
        const lb = b.diasAtras >= VENTANA_PREFERIDA_DIAS ? 0 : 1;
        return la - lb || distancia(a) - distancia(b);
      });
  })();
  return candidatasCache;
}

function diasEntre(a: string, b: string): number {
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / MS_PER_DAY);
}

function anualizar(vcpActual: number, vcpBase: number, diasReales: number): number | null {
  const tasa = (vcpActual / vcpBase - 1) * (365 / Math.max(1, diasReales)) * 100;
  // Rango verosímil; fuera de él es un dato roto (ej. cuotaparte reiniciada a
  // 1000) o ruido de ventana corta (un día bueno anualizado). Con ventana de
  // pocos días se es más estricto todavía.
  // Banda verosímil para un FCI presentado como tasa anualizada: fuera de
  // (-20%, 60%) el número no describe un "rendimiento" (es un dato roto, una
  // cuotaparte reiniciada o un fondo muy volátil) y no se lista.
  void diasReales;
  return Number.isFinite(tasa) && tasa > FCI_TASA_MINIMA && tasa < FCI_TASA_MAXIMA ? tasa : null;
}

/**
 * Calcula, para una categoría de FCI, un rendimiento anualizado real por
 * fondo a partir de la variación de su valor de cuotaparte (VCP) entre el
 * último dato informado y una foto completa del mercado de ~30 días atrás
 * (o, si no hay foto que cubra al fondo, el penúltimo dato informado).
 */
export async function fetchFCICategoriaConRendimiento(
  categoria: FCICategoria
): Promise<FCIConRendimiento> {
  const label = FCI_CATEGORIAS.find((c) => c.id === categoria)?.label || categoria;

  const actualRaw = await getFCIUltimo(categoria).catch(() => [] as FCIRaw[]);
  const actualTodos = Array.isArray(actualRaw) ? actualRaw : [];

  // Vigencia: "ultimo" incluye fondos que dejaron de reportar hace años
  // (verificado: registros de 2020 conviviendo con los de hoy). Se descartan
  // los que estén a más de FCI_MAX_DIAS_VIGENCIA del dato más nuevo.
  const fechaMax = actualTodos.reduce((max, f) => (f.fecha && f.fecha > max ? f.fecha : max), "");
  const actual = actualTodos.filter(
    (f) => f.fecha && f.vcp > 0 && (!fechaMax || diasEntre(fechaMax, f.fecha) <= FCI_MAX_DIAS_VIGENCIA)
  );

  const rendimientos = new Map<string, { tasaAnualizada: number; diasReales: number }>();
  if (actual.length === 0) {
    return { categoria, categoriaLabel: label, items: actual, rendimientos };
  }

  // 1) Base: la primera foto candidata (en orden de preferencia: ventana
  //    larga y cercana a 30 días) que cubra al menos COBERTURA_MINIMA de los
  //    fondos vigentes de esta categoría. Las fechas "completas" de rentaFija
  //    no siempre lo son para las otras categorías, por eso se chequea.
  let base: Map<string, FCIRaw> | null = null;
  try {
    const candidatas = await buscarSnapshotsCompletos();
    for (const cand of candidatas.slice(0, MAX_CANDIDATAS_POR_CATEGORIA)) {
      const items = await getFCIPorFecha(categoria, cand.fechaApi).catch(() => [] as FCIRaw[]);
      const mapa = new Map(
        (Array.isArray(items) ? items : []).filter((f) => f.fondo && f.vcp > 0 && f.fecha).map((f) => [f.fondo, f])
      );
      let cubiertos = 0;
      actual.forEach((f) => {
        if (mapa.has(f.fondo)) cubiertos++;
      });
      if (cubiertos >= actual.length * COBERTURA_MINIMA) {
        base = mapa;
        break;
      }
    }
  } catch {
    base = null;
  }

  if (base) {
    for (const fondo of actual) {
      const anterior = base.get(fondo.fondo);
      if (!anterior) continue;
      const diasReales = diasEntre(fondo.fecha, anterior.fecha);
      if (diasReales < VENTANA_MIN_DIAS) continue;
      const tasa = anualizar(fondo.vcp, anterior.vcp, diasReales);
      if (tasa !== null) rendimientos.set(fondo.fondo, { tasaAnualizada: tasa, diasReales });
    }
  }

  // Sin fallback a ventana corta (ultimo/penúltimo): anualizar 1-4 días era
  // justamente lo que generaba tasas de 100-300%. Un fondo que ninguna foto
  // completa cubre directamente no se lista — mejor no mostrar un número que
  // mostrar uno inventado.

  return { categoria, categoriaLabel: label, items: actual, rendimientos };
}

export async function fetchAllFCIsConRendimiento(): Promise<FCIConRendimiento[]> {
  const results = await Promise.allSettled(
    FCI_CATEGORIAS.map((c) => fetchFCICategoriaConRendimiento(c.id))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<FCIConRendimiento> => r.status === "fulfilled")
    .map((r) => r.value);
}
