import { useState, useEffect, useCallback } from "react";
import { getDolares, getOtrasCotizaciones, DolarApiCotizacion } from "../lib/api/dolarApi";
import { normalizeDivisas } from "../lib/normalize";
import { getCachedData, cacheData } from "../lib/cache";
import { Instrumento } from "../types";

export interface DolarApiState {
  dolares: DolarApiCotizacion[];
  otras: DolarApiCotizacion[];
  instruments: Instrumento[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useDolarApi = (): DolarApiState => {
  const [dolares, setDolares] = useState<DolarApiCotizacion[]>([]);
  const [otras, setOtras] = useState<DolarApiCotizacion[]>([]);
  const [instruments, setInstruments] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = "dolarapi_cotizaciones_v1";
    const cached = getCachedData<{
      dolares: DolarApiCotizacion[];
      otras: DolarApiCotizacion[];
      instruments: Instrumento[];
    }>(cacheKey, 10);

    if (cached) {
      setDolares(cached.dolares);
      setOtras(cached.otras);
      setInstruments(cached.instruments);
      setLoading(false);
      return;
    }

    try {
      const [dolaresRes, otrasRes] = await Promise.allSettled([
        getDolares(),
        getOtrasCotizaciones(),
      ]);

      const dolaresData = dolaresRes.status === "fulfilled" ? dolaresRes.value : [];
      const otrasData = otrasRes.status === "fulfilled" ? otrasRes.value : [];
      const norm = normalizeDivisas(dolaresData, otrasData);

      setDolares(dolaresData);
      setOtras(otrasData);
      setInstruments(norm);

      cacheData(cacheKey, {
        dolares: dolaresData,
        otras: otrasData,
        instruments: norm,
      });
    } catch (e: any) {
      console.warn("[useDolarApi] Error al consultar DolarAPI:", e.message);
      setError(e.message || "Error al conectar con DolarAPI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { dolares, otras, instruments, loading, error, refresh: load };
};
