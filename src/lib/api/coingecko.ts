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

// Top ~30 criptomonedas más relevantes por capitalización/adopción (antes
// solo 7). Se pide todo en una sola llamada a /simple/price -- CoinGecko
// keyless soporta decenas de ids por request sin costo adicional de rate
// limit, así que ampliar esta lista no multiplica los pedidos a la API,
// solo el tamaño de la respuesta.
export const TOP_COIN_IDS = [
  "bitcoin",
  "ethereum",
  "tether",
  "ripple",
  "binancecoin",
  "solana",
  "usd-coin",
  "dogecoin",
  "cardano",
  "tron",
  "avalanche-2",
  "chainlink",
  "shiba-inu",
  "sui",
  "stellar",
  "polkadot",
  "hedera-hashgraph",
  "litecoin",
  "bitcoin-cash",
  "toncoin",
  "near",
  "uniswap",
  "dai",
  "aptos",
  "internet-computer",
  "pepe",
  "monero",
  "ethereum-classic",
  "cosmos",
  "arbitrum",
] as const;

export const COIN_METADATA: Record<string, { nombre: string; ticker: string; symbol: string }> = {
  bitcoin: { nombre: "Bitcoin", ticker: "BTC", symbol: "₿" },
  ethereum: { nombre: "Ethereum", ticker: "ETH", symbol: "Ξ" },
  tether: { nombre: "Tether USD", ticker: "USDT", symbol: "₮" },
  ripple: { nombre: "Ripple", ticker: "XRP", symbol: "✕" },
  binancecoin: { nombre: "Binance Coin", ticker: "BNB", symbol: "BNB" },
  solana: { nombre: "Solana", ticker: "SOL", symbol: "◎" },
  "usd-coin": { nombre: "USD Coin", ticker: "USDC", symbol: "$" },
  dogecoin: { nombre: "Dogecoin", ticker: "DOGE", symbol: "Ð" },
  cardano: { nombre: "Cardano", ticker: "ADA", symbol: "₳" },
  tron: { nombre: "TRON", ticker: "TRX", symbol: "TRX" },
  "avalanche-2": { nombre: "Avalanche", ticker: "AVAX", symbol: "AVAX" },
  chainlink: { nombre: "Chainlink", ticker: "LINK", symbol: "LINK" },
  "shiba-inu": { nombre: "Shiba Inu", ticker: "SHIB", symbol: "SHIB" },
  sui: { nombre: "Sui", ticker: "SUI", symbol: "SUI" },
  stellar: { nombre: "Stellar Lumens", ticker: "XLM", symbol: "XLM" },
  polkadot: { nombre: "Polkadot", ticker: "DOT", symbol: "DOT" },
  "hedera-hashgraph": { nombre: "Hedera", ticker: "HBAR", symbol: "HBAR" },
  litecoin: { nombre: "Litecoin", ticker: "LTC", symbol: "Ł" },
  "bitcoin-cash": { nombre: "Bitcoin Cash", ticker: "BCH", symbol: "BCH" },
  toncoin: { nombre: "Toncoin", ticker: "TON", symbol: "TON" },
  near: { nombre: "NEAR Protocol", ticker: "NEAR", symbol: "NEAR" },
  uniswap: { nombre: "Uniswap", ticker: "UNI", symbol: "UNI" },
  dai: { nombre: "Dai", ticker: "DAI", symbol: "DAI" },
  aptos: { nombre: "Aptos", ticker: "APT", symbol: "APT" },
  "internet-computer": { nombre: "Internet Computer", ticker: "ICP", symbol: "ICP" },
  pepe: { nombre: "Pepe", ticker: "PEPE", symbol: "PEPE" },
  monero: { nombre: "Monero", ticker: "XMR", symbol: "ɱ" },
  "ethereum-classic": { nombre: "Ethereum Classic", ticker: "ETC", symbol: "ETC" },
  cosmos: { nombre: "Cosmos Hub", ticker: "ATOM", symbol: "ATOM" },
  arbitrum: { nombre: "Arbitrum", ticker: "ARB", symbol: "ARB" },
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
