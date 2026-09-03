import { useState, useEffect, useCallback } from "react";
import { getTopCryptoPrices, CoinGeckoPricesResponse } from "../lib/api/coingecko";
import { normalizeCoinGecko } from "../lib/normalize";
import { getCachedData, cacheData } from "../lib/cache";
import { Instrumento } from "../types";

export interface CoinGeckoState {
  prices: CoinGeckoPricesResponse | null;
  instruments: Instrumento[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useCoinGecko = (): CoinGeckoState => {
  const [prices, setPrices] = useState<CoinGeckoPricesResponse | null>(null);
  const [instruments, setInstruments] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = "coingecko_prices";
    const cached = getCachedData<{
      prices: CoinGeckoPricesResponse;
      instruments: Instrumento[];
    }>(cacheKey, 10);

    if (cached) {
      setPrices(cached.prices);
      setInstruments(cached.instruments);
      setLoading(false);
      return;
    }

    try {
      const data = await getTopCryptoPrices();
      const norm = normalizeCoinGecko(data);

      setPrices(data);
      setInstruments(norm);

      cacheData(cacheKey, {
        prices: data,
        instruments: norm,
      });
    } catch (e: any) {
      console.warn("[useCoinGecko] Error al consultar CoinGecko, usando respaldo:", e.message);
      setError(e.message || "Error al conectar con CoinGecko");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { prices, instruments, loading, error, refresh: load };
};

