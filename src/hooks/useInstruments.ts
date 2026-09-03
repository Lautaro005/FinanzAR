import { useMemo } from "react";
import { useArgentinaDatos } from "./useArgentinaDatos";
import { useCoinGecko } from "./useCoinGecko";
import { useData912 } from "./useData912";
import { MOCK_INSTRUMENTOS } from "../lib/mockData";
import { Instrumento, Categoria } from "../types";

export interface UseInstrumentsResult {
  instruments: Instrumento[];
  categoryCounts: Record<Categoria, number>;
  loading: boolean;
  isLive: boolean;
  refreshAll: () => Promise<void>;
}

export function useInstruments(): UseInstrumentsResult {
  const argDatos = useArgentinaDatos();
  const coinGecko = useCoinGecko();
  const data912 = useData912();

  const loading = argDatos.loading && coinGecko.loading && data912.loading;
  const isLive = !loading && (argDatos.instruments.length > 0 || coinGecko.instruments.length > 0 || data912.instruments.length > 0);

  const instruments = useMemo(() => {
    // Comenzamos con una copia de los instrumentos de prueba como base sólida
    const map = new Map<string, Instrumento>();

    // 1. Cargar mocks de base
    MOCK_INSTRUMENTOS.forEach((item) => {
      map.set(item.id, item);
    });

    // 2. Sobrescribir / complementar con ArgentinaDatos (Plazos fijos, FCI, Criptopesos)
    if (argDatos.instruments.length > 0) {
      argDatos.instruments.forEach((item) => {
        map.set(item.id, item);
      });
    }

    // 3. Sobrescribir / complementar con CoinGecko
    if (coinGecko.instruments.length > 0) {
      coinGecko.instruments.forEach((item) => {
        map.set(item.id, item);
      });
    }

    // 4. Sobrescribir / complementar con Data912 (CEDEARs, Acciones, Bonos, EE.UU.)
    if (data912.instruments.length > 0) {
      data912.instruments.forEach((item) => {
        map.set(item.id, item);
      });
    }

    return Array.from(map.values());
  }, [argDatos.instruments, coinGecko.instruments, data912.instruments]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Categoria, number> = {
      pesos: 0,
      cripto: 0,
      cedears: 0,
      acciones: 0,
      bonos: 0,
      eeuu: 0,
    };
    instruments.forEach((item) => {
      if (counts[item.categoria] !== undefined) {
        counts[item.categoria]++;
      }
    });
    return counts;
  }, [instruments]);

  const refreshAll = async () => {
    await Promise.allSettled([
      argDatos.refresh(),
      coinGecko.refresh(),
      data912.refresh(),
    ]);
  };

  return {
    instruments,
    categoryCounts,
    loading,
    isLive,
    refreshAll,
  };
}
