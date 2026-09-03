// Cliente tipado de Data912 (data912.com / data912.apidocs.ar)
// Endpoints en vivo para CEDEARs, Acciones argentinas, Bonos y Mercado USA

export interface Data912QuoteRaw {
  symbol: string;
  c: number; // Último precio operado
  pct_change: number; // Variación porcentual diaria
  v?: number; // Volumen operado
  px_bid?: number; // Oferta de compra
  px_ask?: number; // Oferta de venta
  q_bid?: number;
  q_ask?: number;
  q_op?: number;
  t?: string; // Timestamp
}

const BASE_URL = "https://data912.com";

// Mapeo amigable de tickers a nombres completos e industrias
export const ASSET_NAMES: Record<string, { nombre: string; entidad: string }> = {
  // CEDEARs
  SPY: { nombre: "CEDEAR SPDR S&P 500 ETF Trust", entidad: "State Street Global Advisors / BYMA" },
  QQQ: { nombre: "CEDEAR Invesco QQQ Trust (Nasdaq 100)", entidad: "Invesco / BYMA" },
  DIA: { nombre: "CEDEAR SPDR Dow Jones Industrial Average", entidad: "State Street / BYMA" },
  AAPL: { nombre: "CEDEAR Apple Inc.", entidad: "Apple / BYMA" },
  NVDA: { nombre: "CEDEAR NVIDIA Corporation", entidad: "NVIDIA / BYMA" },
  MSFT: { nombre: "CEDEAR Microsoft Corporation", entidad: "Microsoft / BYMA" },
  AMZN: { nombre: "CEDEAR Amazon.com Inc.", entidad: "Amazon / BYMA" },
  GOOGL: { nombre: "CEDEAR Alphabet Inc. (Google)", entidad: "Alphabet / BYMA" },
  MELI: { nombre: "CEDEAR MercadoLibre Inc.", entidad: "MercadoLibre / BYMA" },
  TSLA: { nombre: "CEDEAR Tesla Inc.", entidad: "Tesla / BYMA" },
  KO: { nombre: "CEDEAR The Coca-Cola Company", entidad: "Coca-Cola / BYMA" },
  BRKB: { nombre: "CEDEAR Berkshire Hathaway Inc.", entidad: "Berkshire Hathaway / BYMA" },
  
  // Acciones Locales (Merval)
  GGAL: { nombre: "Grupo Financiero Galicia S.A.", entidad: "BYMA / Merval" },
  YPFD: { nombre: "YPF S.A. Clase D", entidad: "BYMA / Merval" },
  PAMP: { nombre: "Pampa Energía S.A.", entidad: "BYMA / Merval" },
  BMA: { nombre: "Banco Macro S.A.", entidad: "BYMA / Merval" },
  TXAR: { nombre: "Ternium Argentina S.A.", entidad: "BYMA / Merval" },
  ALUA: { nombre: "Aluar Aluminio Argentino S.A.I.C.", entidad: "BYMA / Merval" },
  CRES: { nombre: "Cresud S.A.C.I.F. y A.", entidad: "BYMA / Merval" },
  CEPU: { nombre: "Central Puerto S.A.", entidad: "BYMA / Merval" },
  TGSU2: { nombre: "Transportadora de Gas del Sur S.A.", entidad: "BYMA / Merval" },
  
  // Bonos Soberanos / Subsoberanos
  AL30: { nombre: "Bono de la Rep. Argentina 2030 (AL30)", entidad: "Tesoro Nacional / BYMA" },
  GD30: { nombre: "Bono Global Rep. Argentina 2030 (GD30)", entidad: "Tesoro Nacional / BYMA" },
  AL35: { nombre: "Bono de la Rep. Argentina 2035 (AL35)", entidad: "Tesoro Nacional / BYMA" },
  GD35: { nombre: "Bono Global Rep. Argentina 2035 (GD35)", entidad: "Tesoro Nacional / BYMA" },
  AE38: { nombre: "Bono de la Rep. Argentina 2038 (AE38)", entidad: "Tesoro Nacional / BYMA" },
  T2X5: { nombre: "Bono del Tesoro en Pesos Cero Cupón (T2X5)", entidad: "Tesoro Nacional / BYMA" },

  // USA Stocks / ETFs
  VOO: { nombre: "Vanguard S&P 500 ETF", entidad: "Vanguard Global / NYSE Arca" },
  IVV: { nombre: "iShares Core S&P 500 ETF", entidad: "BlackRock / NYSE Arca" },
  VTI: { nombre: "Vanguard Total Stock Market ETF", entidad: "Vanguard / NYSE Arca" },
};

export const fetchData912 = async <T = any>(endpoint: string): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Data912 API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
};

export const getLiveCedears = async (): Promise<Data912QuoteRaw[]> => {
  return fetchData912<Data912QuoteRaw[]>("/live/arg_cedears");
};

export const getLiveArgStocks = async (): Promise<Data912QuoteRaw[]> => {
  return fetchData912<Data912QuoteRaw[]>("/live/arg_stocks");
};

export const getLiveArgBonds = async (): Promise<Data912QuoteRaw[]> => {
  return fetchData912<Data912QuoteRaw[]>("/live/arg_bonds");
};

export const getLiveUsaStocks = async (): Promise<Data912QuoteRaw[]> => {
  return fetchData912<Data912QuoteRaw[]>("/live/usa_stocks");
};

