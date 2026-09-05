// Estado de apertura/cierre de los mercados que consume FinanzAR.
//
// Tres "plazas" distintas, cada una con su propio calendario:
// - Cripto: opera 24/7/365, nunca cierra.
// - Mercado argentino (BYMA): rige Plazos Fijos, FCI, CEDEARs, Acciones y Bonos.
//   Horario de rueda continua: 10:30 a 17:00 (hora Argentina), de lunes a viernes,
//   salvo feriados nacionales.
// - Mercado EE.UU. (NYSE/Nasdaq): rige la categoría "eeuu". Horario de rueda
//   regular: 9:30 a 16:00 (hora del Este), de lunes a viernes, salvo feriados
//   bursátiles de EE.UU.
//
// Horarios y feriados verificados en septiembre de 2026 (fuentes: BYMA,
// NYSE Group / ICE, calendario oficial de feriados de Argentina). Los feriados
// están cargados por año: si el año actual no tiene entrada en la tabla, el
// mercado se considera abierto/cerrado solo por día de semana y horario
// (no rompe, pero conviene sumar el año nuevo a la tabla cuando se publique
// el calendario oficial correspondiente).

const FERIADOS_ARGENTINA: Record<string, string[]> = {
  "2026": [
    "2026-01-01", // Año Nuevo
    "2026-02-16", // Carnaval
    "2026-02-17", // Carnaval
    "2026-03-24", // Día de la Memoria
    "2026-04-02", // Día del Veterano y de los Caídos en Malvinas
    "2026-04-03", // Viernes Santo
    "2026-05-01", // Día del Trabajador
    "2026-05-25", // Día de la Revolución de Mayo
    "2026-06-17", // Paso a la Inmortalidad del Gral. Güemes
    "2026-06-20", // Día de la Bandera
    "2026-07-09", // Día de la Independencia
    "2026-08-17", // Paso a la Inmortalidad del Gral. San Martín
    "2026-10-12", // Día del Respeto a la Diversidad Cultural
    "2026-11-20", // Día de la Soberanía Nacional
    "2026-12-08", // Inmaculada Concepción de María
    "2026-12-25", // Navidad
  ],
};

const FERIADOS_EEUU: Record<string, string[]> = {
  "2026": [
    "2026-01-01", // New Year's Day
    "2026-01-19", // Martin Luther King Jr. Day
    "2026-02-16", // Washington's Birthday (Presidents' Day)
    "2026-04-03", // Good Friday
    "2026-05-25", // Memorial Day
    "2026-06-19", // Juneteenth
    "2026-07-03", // Independence Day (observado, 4 de julio cae sábado)
    "2026-09-07", // Labor Day
    "2026-11-26", // Thanksgiving
    "2026-12-25", // Christmas
  ],
};

function fechaISOEnZona(date: Date, timeZone: string): string {
  // en-CA formatea como YYYY-MM-DD, cómodo para comparar contra la tabla de feriados.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function horaDecimalEnZona(date: Date, timeZone: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hora = Number(partes.find((p) => p.type === "hour")?.value ?? "0");
  const minuto = Number(partes.find((p) => p.type === "minute")?.value ?? "0");
  // "24" a medianoche en formato de 24hs sin hour12 -> normalizar a 0.
  return (hora % 24) + minuto / 60;
}

const DIAS_SEMANA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function diaSemanaEnZona(date: Date, timeZone: string): number {
  const dia = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return DIAS_SEMANA[dia] ?? -1;
}

function esFeriado(date: Date, timeZone: string, feriadosPorAnio: Record<string, string[]>): boolean {
  const iso = fechaISOEnZona(date, timeZone);
  const anio = iso.slice(0, 4);
  return (feriadosPorAnio[anio] || []).includes(iso);
}

/** Mercado argentino (BYMA): Plazos Fijos, FCI, CEDEARs, Acciones, Bonos. */
export function isArgentinaMarketOpen(date: Date = new Date()): boolean {
  const tz = "America/Argentina/Buenos_Aires";
  const dow = diaSemanaEnZona(date, tz);
  if (dow === 0 || dow === 6) return false; // fin de semana
  if (esFeriado(date, tz, FERIADOS_ARGENTINA)) return false;
  const hora = horaDecimalEnZona(date, tz);
  return hora >= 10.5 && hora < 17; // 10:30–17:00 ART
}

/** Mercado de EE.UU. (NYSE/Nasdaq): categoría "eeuu". */
export function isUsMarketOpen(date: Date = new Date()): boolean {
  const tz = "America/New_York";
  const dow = diaSemanaEnZona(date, tz);
  if (dow === 0 || dow === 6) return false; // fin de semana
  if (esFeriado(date, tz, FERIADOS_EEUU)) return false;
  const hora = horaDecimalEnZona(date, tz);
  return hora >= 9.5 && hora < 16; // 9:30–16:00 ET
}

/** Cripto opera 24/7, todo el año. */
export function isCryptoMarketOpen(): boolean {
  return true;
}

export interface EstadoMercados {
  argentina: boolean;
  eeuu: boolean;
  cripto: boolean;
  /** Cuántas de las tres plazas (argentina/eeuu/cripto) están abiertas ahora mismo. */
  abiertos: number;
  /** Texto listo para mostrar en el indicador del header. */
  textoHeader: string;
}

export function getEstadoMercados(date: Date = new Date()): EstadoMercados {
  const argentina = isArgentinaMarketOpen(date);
  const eeuu = isUsMarketOpen(date);
  const cripto = isCryptoMarketOpen();
  const abiertos = [argentina, eeuu, cripto].filter(Boolean).length;

  let textoHeader: string;
  if (argentina && eeuu) {
    textoHeader = "Todos los mercados en vivo";
  } else if (argentina) {
    textoHeader = "Cripto + mercado argentino en vivo";
  } else if (eeuu) {
    textoHeader = "Cripto + mercado EE.UU. en vivo";
  } else {
    textoHeader = "Mercado cripto en vivo";
  }

  return { argentina, eeuu, cripto, abiertos, textoHeader };
}

/** A qué plaza pertenece cada categoría, para el punto de estado en las pestañas. */
export type GrupoMercado = "argentina" | "eeuu" | "cripto";

export const GRUPO_MERCADO_POR_CATEGORIA: Partial<Record<string, GrupoMercado>> = {
  pesos: "argentina",
  fci: "argentina",
  cedears: "argentina",
  acciones: "argentina",
  bonos: "argentina",
  divisas: "argentina",
  eeuu: "eeuu",
  cripto: "cripto",
};

export function isCategoriaAbierta(categoria: string, date: Date = new Date()): boolean | null {
  const grupo = GRUPO_MERCADO_POR_CATEGORIA[categoria];
  if (!grupo) return null; // categoría sin mercado asociado (ej. "divisas", "todos")
  if (grupo === "cripto") return isCryptoMarketOpen();
  if (grupo === "argentina") return isArgentinaMarketOpen(date);
  return isUsMarketOpen(date);
}
