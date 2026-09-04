import { useMemo } from "react";
import { useArgentinaDatos } from "./useArgentinaDatos";
import { useCoinGecko } from "./useCoinGecko";
import { useData912 } from "./useData912";
import { useDolarApi } from "./useDolarApi";
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
  const dolarApi = useDolarApi();

  const loading = argDatos.loading && coinGecko.loading && data912.loading && dolarApi.loading;
  const isLive =
    !loading &&
    (argDatos.instruments.length > 0 ||
      coinGecko.instruments.length > 0 ||
      data912.instruments.length > 0 ||
      dolarApi.instruments.length > 0);

  const instruments = useMemo(() => {
    const map = new Map<string, Instrumento>();

    // Categorías que ya tienen datos en vivo cargados: los mocks de esas
    // categorías se descartan por completo (no solo se "pisan" por id, que
    // fallaba cuando el id del mock no coincidía con el id real y quedaban
    // ambos listados — ej. Bitcoin/Ethereum duplicados con precios distintos).
    const liveCategoriesLoaded = new Set<Categoria>();
    argDatos.instruments.forEach((item) => liveCategoriesLoaded.add(item.categoria));
    if (coinGecko.instruments.length > 0) liveCategoriesLoaded.add("cripto");
    data912.instruments.forEach((item) => liveCategoriesLoaded.add(item.categoria));
    if (dolarApi.instruments.length > 0) liveCategoriesLoaded.add("divisas");

    // 1. Mocks: solo como placeholder para categorías sin datos en vivo todavía
    //    (primer render / fuente caída), nunca conviven con datos reales.
    MOCK_INSTRUMENTOS.forEach((item) => {
      if (!liveCategoriesLoaded.has(item.categoria)) {
        map.set(item.id, item);
      }
    });

    // 2. Datos en vivo: ArgentinaDatos (Plazos fijos, FCI, Criptopesos)
    argDatos.instruments.forEach((item) => {
      map.set(item.id, item);
    });

    // 3. Datos en vivo: CoinGecko
    coinGecko.instruments.forEach((item) => {
      map.set(item.id, item);
    });

    // 4. Datos en vivo: Data912 (CEDEARs, Acciones, Bonos, EE.UU.)
    data912.instruments.forEach((item) => {
      map.set(item.id, item);
    });

    // 5. Datos en vivo: DolarAPI (Divisas)
    dolarApi.instruments.forEach((item) => {
      map.set(item.id, item);
    });

    return Array.from(map.values());
  }, [argDatos.instruments, coinGecko.instruments, data912.instruments, dolarApi.instruments]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Categoria, number> = {
      pesos: 0,
      fci: 0,
      cripto: 0,
      cedears: 0,
      acciones: 0,
      bonos: 0,
      eeuu: 0,
      divisas: 0,
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
      dolarApi.refresh(),
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
