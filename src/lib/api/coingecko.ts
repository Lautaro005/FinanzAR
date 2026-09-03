// Cliente tipado de CoinGecko API (v3 Keyless Public API)
// Requiere atribución: "Data provided by CoinGecko"
// Límite estimado: ~10-30 req/min

export interface CoinGeckoPriceItem {
  usd: number;
  usd_24h_change?: number;
  ars?: number;
  ars_24h_change?: number;
}

export type CoinGeckoPricesResponse = Record<string, CoinGeckoPriceItem>;

export interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp, price]
  market_caps?: [number, number][];
  total_volumes?: [number, number][];
}

const BASE_URL = "https://api.coingecko.com/api/v3";

export const TOP_COIN_IDS = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "tether",
  "usd-coin",
] as const;

export const COIN_METADATA: Record<string, { nombre: string; ticker: string; symbol: string }> = {
  bitcoin: { nombre: "Bitcoin", ticker: "BTC", symbol: "₿" },
  ethereum: { nombre: "Ethereum", ticker: "ETH", symbol: "Ξ" },
  solana: { nombre: "Solana", ticker: "SOL", symbol: "◎" },
  binancecoin: { nombre: "BNB (Binance Coin)", ticker: "BNB", symbol: "BNB" },
  ripple: { nombre: "XRP (Ripple)", ticker: "XRP", symbol: "✕" },
  tether: { nombre: "Tether USD (USDT)", ticker: "USDT", symbol: "₮" },
  "usd-coin": { nombre: "USD Coin (USDC)", ticker: "USDC", symbol: "$" },
};

export const fetchCoingecko = async <T = any>(endpoint: string): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.warn("[CoinGecko API] Rate limit alcanzado (429). Utilizando respaldo en caché.");
    }
    throw new Error(`CoinGecko API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
};

export const getTopCryptoPrices = async (): Promise<CoinGeckoPricesResponse> => {
  const ids = TOP_COIN_IDS.join(",");
  return fetchCoingecko<CoinGeckoPricesResponse>(
    `/simple/price?ids=${ids}&vs_currencies=usd,ars&include_24hr_change=true`
  );
};

export const getCryptoMarketChart = async (
  coinId: string,
  days: number = 90,
  vsCurrency: "usd" | "ars" = "ars"
): Promise<CoinGeckoMarketChartResponse> => {
  return fetchCoingecko<CoinGeckoMarketChartResponse>(
    `/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`
  );
};

