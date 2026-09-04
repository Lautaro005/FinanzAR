import { useState, useEffect, useCallback } from "react";
import { getPlazosFijos, getCriptoPesos, PlazoFijoRaw, FCIRaw, CriptoPesoRaw } from "../lib/api/argentinaDatos";
import { fetchAllFCIsConRendimiento } from "../lib/fciRendimiento";
import { normalizePlazosFijos, normalizeFCIs, normalizeCriptoPesos } from "../lib/normalize";
import { getCachedData, cacheData } from "../lib/cache";
import { Instrumento } from "../types";

export interface ArgentinaDatosState {
  plazosFijos: PlazoFijoRaw[];
  fcis: FCIRaw[];
  criptoPesos: CriptoPesoRaw[];
  instruments: Instrumento[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useArgentinaDatos = (): ArgentinaDatosState => {
  const [plazosFijos, setPlazosFijos] = useState<PlazoFijoRaw[]>([]);
  const [fcis, setFcis] = useState<FCIRaw[]>([]);
  const [criptoPesos, setCriptoPesos] = useState<CriptoPesoRaw[]>([]);
  const [instruments, setInstruments] = useState<Instrumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const cacheKey = "arg_datos_combined_v3";
    const cached = getCachedData<{
      plazosFijos: PlazoFijoRaw[];
      fcis: FCIRaw[];
      criptoPesos: CriptoPesoRaw[];
      instruments: Instrumento[];
    }>(cacheKey, 20);

    if (cached) {
      setPlazosFijos(cached.plazosFijos);
      setFcis(cached.fcis);
      setCriptoPesos(cached.criptoPesos);
      setInstruments(cached.instruments);
      setLoading(false);
      return;
    }

    try {
      const [pfRes, fciCategoriasRes, cpRes] = await Promise.allSettled([
        getPlazosFijos(),
        fetchAllFCIsConRendimiento(),
        getCriptoPesos(),
      ]);

      const pfData = pfRes.status === "fulfilled" ? pfRes.value : [];
      const fciCategorias = fciCategoriasRes.status === "fulfilled" ? fciCategoriasRes.value : [];
      const cpData = cpRes.status === "fulfilled" ? cpRes.value : [];

      const normPf = normalizePlazosFijos(pfData);
      const normFciPorCategoria = fciCategorias.map((c) =>
        normalizeFCIs(c.items, c.categoriaLabel, c.rendimientos)
      );
      const normFci = normFciPorCategoria.flat();
      const normCp = normalizeCriptoPesos(cpData);
      const combined = [...normPf, ...normCp, ...normFci];

      const fciDataFlat = fciCategorias.flatMap((c) => c.items);

      setPlazosFijos(pfData);
      setFcis(fciDataFlat);
      setCriptoPesos(cpData);
      setInstruments(combined);

      cacheData(cacheKey, {
        plazosFijos: pfData,
        fcis: fciDataFlat,
        criptoPesos: cpData,
        instruments: combined,
      });
    } catch (e: any) {
      setError(e.message || "Error al cargar datos de ArgentinaDatos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { plazosFijos, fcis, criptoPesos, instruments, loading, error, refresh: load };
};
