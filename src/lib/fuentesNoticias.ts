// Registro de fuentes de referencia para el Chat IA, ordenadas por autoridad.
//
// Origen: relevamiento verificado por HTTP el 2026-10-05 (ver el informe de fuentes).
// La IA no navega ni lee estas páginas en vivo: el registro define a qué fuente acudir
// para cada tipo de dato, cómo citarla y qué dominios puede mencionar. Si algún día se
// agrega una capa de consulta (RSS o serverless con allow-list), este registro es la
// lista de dominios permitidos.
//
// Nivel 4 (fallback técnico: argentinadatos, DolarAPI, data912, CoinGecko, etc.) queda
// fuera a propósito: son las APIs que la app ya usa para el dato en vivo, no fuentes
// citables.

import { Categoria } from "../types";

export interface FuenteReferencia {
  nombre: string;
  /** Dominio raíz sin protocolo: es lo único que la IA puede mencionar. */
  dominio: string;
  url: string;
  especialidad: string;
}

export interface NivelFuentes {
  titulo: string;
  regla: string;
  fuentes: FuenteReferencia[];
}

export const FUENTES_POR_NIVEL: NivelFuentes[] = [
  {
    titulo: "Nivel 1 — Oficiales y datos primarios",
    regla: "Tienen la última palabra sobre cifras, normas y fechas.",
    fuentes: [
      { nombre: "BCRA", dominio: "bcra.gob.ar", url: "https://www.bcra.gob.ar/", especialidad: "tasas, reservas, tipo de cambio oficial, normativa cambiaria" },
      { nombre: "BCRA — REM", dominio: "bcra.gob.ar", url: "https://www.bcra.gob.ar/PublicacionesEstadisticas/Relevamiento_Expectativas_de_Mercado.asp", especialidad: "expectativas de analistas para inflación, dólar y tasa" },
      { nombre: "INDEC", dominio: "indec.gob.ar", url: "https://www.indec.gob.ar/", especialidad: "IPC, EMAE, empleo, pobreza" },
      { nombre: "datos.gob.ar", dominio: "datos.gob.ar", url: "https://datos.gob.ar/series", especialidad: "series oficiales de todos los organismos nacionales" },
      { nombre: "Ministerio de Economía", dominio: "argentina.gob.ar", url: "https://www.argentina.gob.ar/economia/finanzas", especialidad: "licitaciones del Tesoro, deuda, situación fiscal" },
      { nombre: "CNV", dominio: "cnv.gov.ar", url: "https://www.cnv.gov.ar/", especialidad: "regulación del mercado de capitales, FCI, proveedores de cripto (PSAV)" },
      { nombre: "CAFCI", dominio: "cafci.org.ar", url: "https://www.cafci.org.ar/", especialidad: "planilla diaria de todos los fondos comunes de inversión" },
      { nombre: "BYMA", dominio: "byma.com.ar", url: "https://www.byma.com.ar/", especialidad: "mercado de capitales: CEDEARs, acciones, bonos" },
      { nombre: "A3 Mercados", dominio: "a3mercados.com.ar", url: "https://a3mercados.com.ar/", especialidad: "renta fija, licitaciones primarias, futuros, market data" },
      { nombre: "IAMC", dominio: "iamc.com.ar", url: "https://www.iamc.com.ar/informes/", especialidad: "informes diarios de mercado, CEDEARs y curva de obligaciones negociables" },
      { nombre: "ARCA", dominio: "arca.gob.ar", url: "https://www.arca.gob.ar/", especialidad: "impuestos del inversor (ganancias, bienes personales)" },
      { nombre: "Federal Reserve", dominio: "federalreserve.gov", url: "https://www.federalreserve.gov/", especialidad: "política monetaria de EE.UU. (FOMC, comunicados)" },
      { nombre: "US Treasury", dominio: "treasury.gov", url: "https://home.treasury.gov/", especialidad: "curva de rendimientos de Treasuries, deuda pública" },
      { nombre: "FRED (Reserva Federal de St. Louis)", dominio: "stlouisfed.org", url: "https://fred.stlouisfed.org/", especialidad: "series macro de EE.UU." },
      { nombre: "SEC / EDGAR", dominio: "sec.gov", url: "https://www.sec.gov/edgar/search/", especialidad: "documentos oficiales de empresas y ETFs de EE.UU." },
    ],
  },
  {
    titulo: "Nivel 2 — Research y análisis especializado",
    regla: "Interpretan. Citar siempre como opinión (\"según el research de X\"), nunca como dato oficial.",
    fuentes: [
      { nombre: "PPI Research", dominio: "portfoliopersonal.com", url: "https://www.portfoliopersonal.com/research/informes", especialidad: "informes diarios, licitaciones, ONs, carteras" },
      { nombre: "Balanz", dominio: "balanz.com", url: "https://balanz.com/", especialidad: "research de renta variable y fija" },
      { nombre: "Rava", dominio: "rava.com", url: "https://www.rava.com/", especialidad: "research y datos de mercado local" },
      { nombre: "Invecq", dominio: "invecq.com", url: "https://www.invecq.com/", especialidad: "macro y monetario" },
      { nombre: "Ecolatina", dominio: "ecolatina.com", url: "https://www.ecolatina.com/", especialidad: "análisis macro y de actividad" },
      { nombre: "Elypsis", dominio: "elypsis.com", url: "https://www.elypsis.com/", especialidad: "análisis macro y político, expectativas" },
      { nombre: "FIEL", dominio: "fiel.org", url: "https://www.fiel.org/", especialidad: "investigación económica" },
      { nombre: "IERAL", dominio: "ieral.org", url: "https://www.ieral.org/", especialidad: "economía regional y nacional" },
      { nombre: "Fundar", dominio: "fund.ar", url: "https://fund.ar/", especialidad: "políticas públicas y economía" },
      { nombre: "FIX SCR", dominio: "fixscr.com", url: "https://www.fixscr.com/", especialidad: "calificaciones de riesgo locales (ONs, provincias, empresas)" },
    ],
  },
  {
    titulo: "Nivel 3 — Prensa financiera",
    regla: "Actualidad y contexto. Nunca dato primario: citar medio y fecha.",
    fuentes: [
      { nombre: "Ámbito Financiero", dominio: "ambito.com", url: "https://www.ambito.com/", especialidad: "economía y mercados" },
      { nombre: "El Cronista", dominio: "cronista.com", url: "https://www.cronista.com/", especialidad: "finanzas e inversiones" },
      { nombre: "La Nación — Economía", dominio: "lanacion.com.ar", url: "https://www.lanacion.com.ar/economia/", especialidad: "economía general" },
      { nombre: "Clarín — Economía", dominio: "clarin.com", url: "https://www.clarin.com/economia/", especialidad: "economía general" },
      { nombre: "Infobae — Economía", dominio: "infobae.com", url: "https://www.infobae.com/economia/", especialidad: "economía general" },
      { nombre: "iProfesional", dominio: "iprofesional.com", url: "https://www.iprofesional.com/", especialidad: "finanzas personales y empresas" },
      { nombre: "Bloomberg Línea", dominio: "bloomberglinea.com", url: "https://www.bloomberglinea.com/", especialidad: "mercados y macro de la región" },
      { nombre: "Reuters — Markets", dominio: "reuters.com", url: "https://www.reuters.com/markets/", especialidad: "mercados internacionales" },
      { nombre: "Financial Times", dominio: "ft.com", url: "https://www.ft.com/", especialidad: "economía y mercados internacionales (paywall)" },
    ],
  },
];

/** Fuente primaria por categoría de FinanzAR (la primera es la que corresponde verificar). */
export const FUENTE_PRIMARIA_POR_CATEGORIA: Record<Categoria, string> = {
  pesos: "BCRA (tasas y política monetaria); alternativa datos.gob.ar",
  fci: "CAFCI (planilla diaria de FCI); alternativas CNV e IAMC",
  divisas: "BCRA (tipo de cambio oficial); alternativa datos.gob.ar",
  cripto: "CNV (encuadre regulatorio de PSAV); alternativa prensa especializada con fecha",
  cedears: "BYMA e IAMC (negociación diaria); SEC/EDGAR para el subyacente",
  acciones: "BYMA; alternativa IAMC",
  bonos: "A3 Mercados (renta fija y licitaciones); Ministerio de Economía; calificadoras (FIX SCR) para riesgo crediticio",
  eeuu: "SEC/EDGAR (documentos y tenencias); FRED y US Treasury (macro y tasas)",
};

/** Bloque de texto para el prompt del sistema: niveles con su regla y, por línea, nombre, dominio y uso. */
export function construirBloqueFuentes(): string {
  return FUENTES_POR_NIVEL.map((nivel) => {
    const lineas = nivel.fuentes.map((f) => `  - ${f.nombre} (${f.dominio}): ${f.especialidad}`).join("\n");
    return `${nivel.titulo}. ${nivel.regla}\n${lineas}`;
  }).join("\n\n");
}

/** Mapa categoría → fuente primaria, para el prompt. */
export function construirMapaCategorias(): string {
  return (Object.keys(FUENTE_PRIMARIA_POR_CATEGORIA) as Categoria[])
    .map((cat) => `  - ${cat}: ${FUENTE_PRIMARIA_POR_CATEGORIA[cat]}`)
    .join("\n");
}
