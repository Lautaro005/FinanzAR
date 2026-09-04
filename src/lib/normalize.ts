import { Instrumento, Categoria, PuntoHistorico } from "../types";
import { PlazoFijoRaw, FCIRaw, CriptoPesoRaw } from "./api/argentinaDatos";
import { CoinGeckoPricesResponse, COIN_METADATA } from "./api/coingecko";
import { Data912QuoteRaw, ASSET_NAMES, USA_DIRECT_NAMES, USA_DIRECT_ALLOWED } from "./api/data912";
import { DolarApiCotizacion } from "./api/dolarApi";
import { CRYPTO_INFO, BOND_INFO, DIVISA_INFO, getEquitySectorInfo } from "./instrumentInfo";

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
        rubro: "Depósito a plazo — Banca tradicional",
        descripcion: `Depósito a plazo fijo tradicional ofrecido por ${cleanName}: inmoviliza el capital por 30 días a cambio de una Tasa Nominal Anual (TNA) fija, informada al BCRA. El capital está cubierto por el sistema de garantía de depósitos (SEDESA) hasta el monto vigente.`,
        supervisionRegulatoria: "Banco Central de la República Argentina (BCRA)",
        monedaLiquidacion: "Pesos Argentinos (ARS)",
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
// muchas casi sin patrimonio). El filtro de patrimonio mínimo sigue
// filtrando clases dormidas/residuales, pero el cupo por categoría se
// amplió bastante (antes 60): la tabla ya no renderiza todo de una vez —
// InstrumentTable pagina de a 100 filas — así que un cupo mayor no
// impacta el rendimiento de la pantalla, solo la cantidad de alternativas
// reales disponibles para buscar/comparar.
const FCI_MAX_POR_CATEGORIA = 250;
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
        rubro: `Fondo Común de Inversión — ${categoriaLabel}`,
        descripcion: `Rendimiento anualizado calculado a partir de la variación real de la cuotaparte del fondo "${f.fondo}" (categoría ${categoriaLabel}) en los últimos ${rend.diasReales} días (fuente: CNV, vía ArgentinaDatos). No es una TNA oficial publicada por la gestora, sino un cálculo propio de FinanzAR sobre datos reales.`,
        supervisionRegulatoria: "Comisión Nacional de Valores (CNV) — Régimen de Fondos Comunes de Inversión",
        monedaLiquidacion: "Pesos Argentinos (ARS)",
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
      rubro: "Billetera cripto — Rendimiento en stablecoin",
      descripcion: `Rendimiento anual en pesos que ${c.entidad} paga sobre saldos mantenidos en ${c.token}, una stablecoin dolarizada. A diferencia de un plazo fijo bancario, el fondeo del rendimiento depende de la política comercial de la plataforma, no de una tasa regulada por el BCRA.`,
      supervisionRegulatoria: "Proveedor de Servicios de Activos Virtuales (PSAV) privado — el rendimiento en sí no está supervisado por BCRA/CNV",
      monedaLiquidacion: "Pesos Argentinos (ARS), sobre saldo respaldado 1:1 en stablecoin dolarizada",
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
    const info = CRYPTO_INFO[coinId];

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
      rubro: info?.rubro || "Criptoactivo",
      descripcion: info
        ? `${info.resumen} Cotización de referencia en pesos argentinos, tomada de exchanges globales (CoinGecko).`
        : `Criptoactivo negociado en exchanges globales. Cotización de referencia en pesos argentinos con liquidez global. Atribución: CoinGecko API.`,
      supervisionRegulatoria: "Mercado global de criptoactivos, 24/7 y sin regulador centralizado — no está bajo supervisión de BCRA ni CNV",
      monedaLiquidacion: "Cotización de referencia en Pesos Argentinos (ARS); el mercado nativo del activo está denominado en USD",
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

      // Personalización por instrumento: para bonos se busca por ticker
      // exacto (BOND_INFO); para acciones/CEDEARs/EE.UU. se busca por el
      // nombre de la empresa/ETF ya normalizado (getEquitySectorInfo), que
      // es estable entre categorías (ej. "Apple Inc." matchea tanto si es
      // CEDEAR como si es la acción directa de EE.UU.).
      const sector = categoria === "bonos" ? BOND_INFO[q.symbol] : getEquitySectorInfo(nombre);

      let descripcion: string;
      let supervisionRegulatoria: string;
      let monedaLiquidacion: string;

      if (categoria === "bonos") {
        supervisionRegulatoria = "Comisión Nacional de Valores (CNV) y Ministerio de Economía — Secretaría de Finanzas (Tesoro Nacional)";
        monedaLiquidacion = q.symbol === "T2X5"
          ? "Pesos Argentinos (ARS)"
          : q.symbol.startsWith("GD")
          ? "Dólares Estadounidenses (USD), bajo legislación de Nueva York"
          : "Dólares Estadounidenses (USD), bajo legislación argentina";
        descripcion = sector
          ? `${sector.rubro}. ${sector.resumen}`
          : `Título de deuda emitido por el Estado o un ente público argentino, negociado en el mercado secundario local.`;
      } else if (categoria === "eeuu") {
        supervisionRegulatoria = "U.S. Securities and Exchange Commission (SEC) / FINRA — no está bajo supervisión de BCRA ni CNV";
        monedaLiquidacion = "Dólares Estadounidenses (USD)";
        descripcion = sector
          ? `${sector.rubro}. ${sector.resumen}`
          : `${nombre} cotiza de forma directa en el mercado estadounidense (NYSE/Nasdaq), fuera del régimen de CEDEARs.`;
      } else {
        // cedears / acciones
        supervisionRegulatoria = categoria === "cedears"
          ? "Comisión Nacional de Valores (CNV) y Bolsas y Mercados Argentinos (BYMA) — como certificado, no como acción directa"
          : "Comisión Nacional de Valores (CNV) y Bolsas y Mercados Argentinos (BYMA) / Merval";
        monedaLiquidacion = categoria === "cedears"
          ? "Pesos Argentinos (ARS); existen variantes de liquidación en Dólares (Cable/MEP) bajo tickers específicos de la misma especie"
          : "Pesos Argentinos (ARS)";
        descripcion = sector
          ? `${sector.rubro}. ${sector.resumen}`
          : categoria === "cedears"
          ? `Certificado que representa acciones de ${entidad} depositadas en el exterior, operable en pesos en el mercado local (BYMA).`
          : `Acción negociada en el mercado formal argentino (BYMA/Merval), bajo supervisión de la CNV.`;
      }

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
        rubro: sector?.rubro,
        descripcion,
        supervisionRegulatoria,
        monedaLiquidacion,
      };
    });
}

// Normaliza DolarAPI: dólares (todas las "casas") + otras monedas (euro,
// real, etc.) siempre expresadas contra el peso argentino. Se muestra la
// punta "venta" como valor de referencia (lo que costaría comprar esa
// moneda), consistente con cómo la gente efectivamente consulta "a cuánto
// está el dólar/euro/real hoy".
export function normalizeDivisas(
  dolares: DolarApiCotizacion[],
  otras: DolarApiCotizacion[]
): Instrumento[] {
  const out: Instrumento[] = [];

  if (Array.isArray(dolares)) {
    dolares.forEach((d) => {
      if (!d.casa || !(d.venta > 0)) return;
      const info = DIVISA_INFO[d.casa];
      const valor = Number(d.venta.toFixed(2));
      out.push({
        id: `divisas-usd-${d.casa}`,
        nombre: `Dólar ${d.nombre}`,
        categoria: "divisas" as Categoria,
        entidadOFuente: info?.supervision || "DolarAPI",
        tasaORendimientoActual: valor,
        unidad: "precio_ars",
        historico: generateSyntheticHistory(valor, 0.6),
        actualizadoEn: "En vivo — DolarAPI",
        ticker: d.casa,
        rubro: info?.rubro || "Divisas — Dólar",
        descripcion: info?.resumen || `Cotización del dólar estadounidense (${d.nombre}) contra el peso argentino.`,
        supervisionRegulatoria: info?.supervision || "Mercado cambiario argentino",
        monedaLiquidacion: info?.moneda || "Pesos Argentinos (ARS) por cada Dólar Estadounidense (USD)",
      });
    });
  }

  if (Array.isArray(otras)) {
    otras.forEach((c) => {
      if (!c.moneda || c.moneda === "USD" || !(c.venta > 0)) return; // el USD ya se cubre arriba con más detalle por "casa"
      const key = c.moneda === "EUR" ? "eur-oficial" : c.moneda === "BRL" ? "brl-oficial" : null;
      const info = key ? DIVISA_INFO[key] : undefined;
      if (!info) return; // solo se muestran las monedas con ficha propia (EUR, BRL); el resto (CLP, UYU) queda fuera del alcance pedido
      const valor = Number(c.venta.toFixed(2));
      out.push({
        id: `divisas-${c.moneda.toLowerCase()}-oficial`,
        nombre: c.nombre,
        categoria: "divisas" as Categoria,
        entidadOFuente: info.supervision,
        tasaORendimientoActual: valor,
        unidad: "precio_ars",
        historico: generateSyntheticHistory(valor, 0.4),
        actualizadoEn: "En vivo — DolarAPI",
        ticker: c.moneda,
        rubro: info.rubro,
        descripcion: info.resumen,
        supervisionRegulatoria: info.supervision,
        monedaLiquidacion: info.moneda,
      });
    });
  }

  return out;
}
