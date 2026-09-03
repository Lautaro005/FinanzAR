import { useState, useEffect, useCallback } from "react";
import {
  getLiveCedears,
  getLiveArgStocks,
  getLiveArgBonds,
  getLiveUsaStocks,
  Data912QuoteRaw,
} from "../lib/api/data912";
import { normalizeData912Quotes } from "../lib/normalize";
import { getCachedData, cacheData } from "../lib/cache";
import { Instrumento } from "../types";

export interface Data912State {
  cedears: Instrumento[];
  acciones: Instrumento[];
  bonos: Instrumento[];
  eeuu: Instrumento[];
  instruments: Instrumento[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useData912 = (): Data912State => {
  const [cedears, setCedears] = useState<Instrumento[]>([]);
  const [acciones, setAcciones] = useState<Instrumento[]>([]);
  const [bonos, setBonos] = useState<Instrumento[]>([]);
  const [eeuu, setEeuu] = useState<Instrumento[]>([]);
  const [instruments, setInstruments] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = "data912_quotes";
    const cached = getCachedData<{
      cedears: Instrumento[];
      acciones: Instrumento[];
      bonos: Instrumento[];
      eeuu: Instrumento[];
      instruments: Instrumento[];
    }>(cacheKey, 10);

    if (cached) {
      setCedears(cached.cedears);
      setAcciones(cached.acciones);
      setBonos(cached.bonos);
      setEeuu(cached.eeuu);
      setInstruments(cached.instruments);
      setLoading(false);
      return;
    }

    try {
      const [cedearsRes, stocksRes, bondsRes, usaRes] = await Promise.allSettled([
        getLiveCedears(),
        getLiveArgStocks(),
        getLiveArgBonds(),
        getLiveUsaStocks(),
      ]);

      const cedearsData: Data912QuoteRaw[] = cedearsRes.status === "fulfilled" ? cedearsRes.value : [];
      const stocksData: Data912QuoteRaw[] = stocksRes.status === "fulfilled" ? stocksRes.value : [];
      const bondsData: Data912QuoteRaw[] = bondsRes.status === "fulfilled" ? bondsRes.value : [];
      const usaData: Data912QuoteRaw[] = usaRes.status === "fulfilled" ? usaRes.value : [];

      const normCedears = normalizeData912Quotes(cedearsData, "cedears");
      const normStocks = normalizeData912Quotes(stocksData, "acciones");
      const normBonds = normalizeData912Quotes(bondsData, "bonos");
      const normUsa = normalizeData912Quotes(usaData, "eeuu");
      const combined = [...normCedears, ...normStocks, ...normBonds, ...normUsa];

      setCedears(normCedears);
      setAcciones(normStocks);
      setBonos(normBonds);
      setEeuu(normUsa);
      setInstruments(combined);

      cacheData(cacheKey, {
        cedears: normCedears,
        acciones: normStocks,
        bonos: normBonds,
        eeuu: normUsa,
        instruments: combined,
      });
    } catch (e: any) {
      console.warn("[useData912] Error al conectar con Data912:", e.message);
      setError(e.message || "Error al conectar con Data912");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { cedears, acciones, bonos, eeuu, instruments, loading, error, refresh: load };
};

