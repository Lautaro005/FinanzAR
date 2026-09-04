import { Instrumento, Categoria, PuntoHistorico } from "../types";
import { PlazoFijoRaw, FCIRaw, CriptoPesoRaw } from "./api/argentinaDatos";
import { CoinGeckoPricesResponse, COIN_METADATA } from "./api/coingecko";
import { Data912QuoteRaw, ASSET_NAMES, USA_DIRECT_NAMES, USA_DIRECT_ALLOWED } from "./api/data912";

// Helper para limpiar nombres de bancos
function cleanBankName(raw: string): string {
  return raw
    .replace(/BANCO DE LA NACION ARGENTINA/i, "Banco Nación")
    .replace(/BANCO DE GALICIA Y BUENOS AIRES S\.A\./i, "Banco Galicia")
    .replace(/BANCO BBVA ARGENTINA S\.A\./i, "BBVA Francés")
    .replace(/BANCO SANTANDER ARGENTINA S\.A\./i, "Banco Santander")
    .replace(/BANCO MACRO S\.A\./i, "Banco Macro")
    .replace(/BANCO CREDICOOP COOPERATIVO LIMITADO/i, "Banco Credicoop")
    .replace(/BANCO CIUDAD DE BUENOS AIRES/i, "Banco Ciudad")
    .replace(/BANCO DE LA PROVINCIA DE BUENOS AIRES/i, "Banco Provincia")
    .replace(/BANCO HIPOTECARIO S\.A\./i, "Banco Hipotecario")
    .replace(/BANCO COMAFI S\.A\./i, "Banco Comafi")
    .replace(/BANCO INDUSTRIAL S\.A\./i, "Banco BIND")
    .replace(/S\.A\.U\./g, "")
    .replace(/S\.A\./g, "")
    .trim();
}

// Helper para generar slug seguro
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Genera una serie histórica verosímil alrededor del valor actual
function generateSyntheticHistory(currentValue: number, trendPct: number = 0.5): PuntoHistorico[] {
  const dates = ["01/08", "08/08", "15/08", "22/08", "30/08"];
  const count = dates.length;
  const stepRatio = (trendPct / 100) / count;

  return dates.map((fecha, idx) => {
    const factor = 1 - (count - 1 - idx) * stepRatio;
    const valor = Number((currentValue * factor).toFixed(2));
    return { fecha, valor };
  });
}

// Normaliza Plazos Fijos de ArgentinaDatos
export function normalizePlazosFijos(items: PlazoFijoRaw[]): Instrumento[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((p) => p.tnaClientes > 0 && p.entidad)
    .map((p) => {
      const tasa = p.tnaClientes <= 1 ? Number((p.tnaClientes * 100).toFixed(2)) : p.tnaClientes;
      const cleanName = cleanBankName(p.entidad);
      return {
        id: `pf-${slugify(cleanName)}`,
        nombre: `Plazo Fijo ${cleanName}`,
        categoria: "pesos" as Categoria,
        entidadOFuente: cleanName,
        tasaORendimientoActual: tasa,
        variacion24h: 0.0,
        unidad: "TNA",
        historico: generateSyntheticHistory(tasa, 1.2),
        actualizadoEn: "Hoy, BCRA",
        enlace: p.enlace || undefined,
        descripcion: `Tasa Nominal Anual (TNA) informada al BCRA para imposiciones a 30 días para clientes.`,
      };
    });
}

// Normaliza FCI (cualquiera de las 6 categorías que expone la CNV vía
// ArgentinaDatos: mercadoDinero, rentaFija, rentaVariable, rentaMixta,
// retornoTotal, otros). El rendimiento mostrado es un cálculo propio —
// variación real de la cuotaparte (VCP) entre el último y el penúltimo
// dato informado de cada fondo, anualizada — en vez de una estimación
// sintética; los fondos sin un par de datos reciente comparable
// directamente no se muestran, para no inventar un número.
//
// Entre las 6 categorías la CNV publica varios miles de "fondos" (en
// realidad son clases —A, B, C, institucional, etc.— del mismo fondo base,
// muchas casi sin patrimonio). Mostrar todo haría la tabla enorme y lenta,
// así que se listan solo los de mayor patrimonio administrado por
// categoría: son los que un inversor real puede encontrar en su banco/ALyC.
const FCI_MAX_POR_CATEGORIA = 60;
const FCI_PATRIMONIO_MINIMO = 50_000_000; // ARS 50M: filtra clases dormidas/institucionales residuales

export function normalizeFCIs(
  items: FCIRaw[],
  categoriaLabel: string,
  rendimientos: Map<string, { tasaAnualizada: number; diasReales: number }>
): Instrumento[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (f) =>
        f.fondo &&
        f.vcp > 0 &&
        rendimientos.has(f.fondo) &&
        (f.patrimonio || 0) >= FCI_PATRIMONIO_MINIMO
    )
    .sort((a, b) => (b.patrimonio || 0) - (a.patrimonio || 0))
    .slice(0, FCI_MAX_POR_CATEGORIA)
    .map((f) => {
      const rend = rendimientos.get(f.fondo)!;
      const tasa = Number(rend.tasaAnualizada.toFixed(2));
      return {
        id: `fci-${slugify(f.fondo)}`,
        nombre: `FCI ${f.fondo}`,
        categoria: "fci" as Categoria,
        entidadOFuente: `CAFCI / ${categoriaLabel}`,
        tasaORendimientoActual: tasa,
        variacion24h: 0,
        unidad: "TNA",
        historico: generateSyntheticHistory(tasa, 0.8),
        actualizadoEn: f.fecha || "Reciente",
        descripcion: `Rendimiento anualizado calculado a partir de la variación real de la cuotaparte en los últimos ${rend.diasReales} días (fuente: CNV, vía ArgentinaDatos). No es una TNA oficial publicada por la gestora.`,
      };
    });
}

// Normaliza Criptopesos (stablecoins en pesos)
export function normalizeCriptoPesos(items: CriptoPesoRaw[]): Instrumento[] {
  if (!Array.isArray(items)) return [];

  return items.map((c) => {
    const tasa = c.tna <= 1 ? Number((c.tna * 100).toFixed(2)) : c.tna;
    return {
      id: `criptopeso-${c.token.toLowerCase()}-${slugify(c.entidad)}`,
      nombre: `${c.token} (${c.entidad})`,
      categoria: "pesos" as Categoria,
      entidadOFuente: `${c.entidad} (Criptopesos)`,
      tasaORendimientoActual: tasa,
      variacion24h: 0.0,
      unidad: "TNA",
      historico: generateSyntheticHistory(tasa, 0.5),
      actualizadoEn: "Hoy",
      descripcion: `Rendimiento anual en pesos sobre saldos en ${c.token} provisto por ${c.entidad}.`,
    };
  });
}

// Normaliza CoinGecko top cryptos
export function normalizeCoinGecko(prices: CoinGeckoPricesResponse): Instrumento[] {
  if (!prices || typeof prices !== "object") return [];

  return Object.entries(prices).map(([coinId, priceItem]) => {
    const meta = COIN_METADATA[coinId] || {
      nombre: coinId.toUpperCase(),
      ticker: coinId.toUpperCase(),
      symbol: "$",
    };

    const valorArs = priceItem.ars || (priceItem.usd ? priceItem.usd * 1530 : 0);
    const variacion = priceItem.ars_24h_change ?? priceItem.usd_24h_change ?? 0;

    return {
      id: `crypto-${coinId}`,
      nombre: `${meta.nombre} (${meta.ticker})`,
      categoria: "cripto" as Categoria,
      entidadOFuente: "CoinGecko / Exchanges AR",
      tasaORendimientoActual: Math.round(valorArs),
      variacion24h: Number(variacion.toFixed(2)),
      unidad: "precio_ars",
      historico: generateSyntheticHistory(valorArs, variacion * 2),
      actualizadoEn: "En vivo",
      ticker: meta.ticker,
      descripcion: `Cotización de referencia en pesos argentinos con liquidez global. Atribución: CoinGecko API.`,
    };
  });
}

// Normaliza Data912 (CEDEARs, Acciones, Bonos, EE.UU.)
export function normalizeData912Quotes(
  quotes: Data912QuoteRaw[],
  categoria: Categoria
): Instrumento[] {
  if (!Array.isArray(quotes)) return [];

  return quotes
    .filter((q) => q.symbol && q.c > 0)
    // data912 expone miles de tickers de EE.UU. (incluyendo microcaps casi
    // ilíquidos que nadie busca); se acota esa categoría a una lista curada
    // de ETFs indexados y acciones ampliamente reconocidas (ver
    // USA_DIRECT_ALLOWED en api/data912.ts) para que la sección "EE.UU."
    // sea manejable y relevante en vez de renderizar ~3000 filas.
    .filter((q) => categoria !== "eeuu" || USA_DIRECT_ALLOWED.has(q.symbol))
    .map((q) => {
      const meta = categoria === "eeuu" ? USA_DIRECT_NAMES[q.symbol] : ASSET_NAMES[q.symbol];
      const nombre = meta?.nombre || `${q.symbol} (${categoria.toUpperCase()})`;
      const entidad = meta?.entidad || "BYMA";
      // CEDEARs/acciones/bonos cotizan en pesos en BYMA; solo "eeuu" (acciones de EE.UU.) está en USD.
      const isUsd = categoria === "eeuu";
      const unidad = isUsd ? "precio_usd" : "precio_ars";

      return {
        id: `${categoria}-${q.symbol.toLowerCase()}`,
        nombre,
        categoria,
        entidadOFuente: entidad,
        tasaORendimientoActual: Number(q.c.toFixed(2)),
        variacion24h: Number((q.pct_change || 0).toFixed(2)),
        unidad,
        historico: generateSyntheticHistory(q.c, (q.pct_change || 1) * 2),
        actualizadoEn: isUsd ? "En vivo NYSE/Nasdaq" : "En vivo BYMA",
        ticker: q.symbol,
        descripcion: isUsd
          ? `Cotización en dólares del mercado estadounidense (NYSE/Nasdaq), para referencia comparativa.`
          : `Instrumento negociado en el mercado formal argentino bajo supervisión de CNV.`,
      };
    });
}

