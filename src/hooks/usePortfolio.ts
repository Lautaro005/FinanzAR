import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CasaDolar, Instrumento, PlazoFijo, PortfolioConfig, PuntoPortfolio, Transaccion } from "../types";
import {
  agregarPuntoHistorial,
  calcularTotales,
  cotizacionDolar,
  derivarPosiciones,
  hoyISO,
  loadConfig,
  loadHistorial,
  loadPlazosFijos,
  loadTransacciones,
  nuevoId,
  PortfolioBackup,
  saveConfig,
  saveHistorial,
  savePlazosFijos,
  saveTransacciones,
  valorFinalPlazoFijo,
} from "../lib/portfolio";

/**
 * Estado + acciones del portfolio personal. Todo vive en localStorage del
 * navegador (sin backend): cada mutación persiste al toque y, además, guarda
 * un punto del historial del gráfico para que reaccione sin esperar al día
 * siguiente (ver DESIGN sección 5).
 */
export function usePortfolio(instruments: Instrumento[], isLive: boolean) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => loadTransacciones());
  const [plazosFijos, setPlazosFijos] = useState<PlazoFijo[]>(() => loadPlazosFijos());
  const [historial, setHistorial] = useState<PuntoPortfolio[]>(() => loadHistorial());
  const [config, setConfig] = useState<PortfolioConfig>(() => loadConfig());

  const hoy = hoyISO();

  const posiciones = useMemo(
    () => derivarPosiciones(transacciones, instruments, hoy),
    [transacciones, instruments, hoy]
  );
  const posicionesActivas = useMemo(() => posiciones.filter((p) => p.cantidad > 0), [posiciones]);

  // Cotización USD→ARS: la elegida por el usuario si Divisas cargó en vivo;
  // si no, la última que se usó (guardada en config) como respaldo explícito.
  const dolarEnVivo = useMemo(() => cotizacionDolar(instruments, config.dolarCasa), [instruments, config.dolarCasa]);
  const dolar = dolarEnVivo ?? (config.ultimoDolar?.casa === config.dolarCasa ? config.ultimoDolar.valor : null);
  const dolarEsRespaldo = dolarEnVivo === null && dolar !== null;

  useEffect(() => {
    if (dolarEnVivo === null) return;
    setConfig((prev) => {
      if (prev.ultimoDolar?.valor === dolarEnVivo && prev.ultimoDolar.casa === prev.dolarCasa) return prev;
      const next = { ...prev, ultimoDolar: { casa: prev.dolarCasa, valor: dolarEnVivo, fecha: hoy } };
      saveConfig(next);
      return next;
    });
  }, [dolarEnVivo, hoy]);

  const totales = useMemo(
    () => calcularTotales(posiciones, plazosFijos, dolar, hoy),
    [posiciones, plazosFijos, dolar, hoy]
  );

  const tieneDatos = transacciones.length > 0 || plazosFijos.length > 0;

  /** ¿Se puede valuar todo con datos reales? (nada sin cotización en vivo). */
  const valuacionCompleta = isLive && totales.sinValuar === 0 && !dolarEsRespaldo;

  const registrarPunto = useCallback(
    (forzar: boolean) => {
      if (!tieneDatos || !valuacionCompleta) return;
      setHistorial((prev) => {
        const ultimo = prev[prev.length - 1];
        if (!forzar && ultimo && ultimo.fecha === hoy) return prev;
        const next = agregarPuntoHistorial(prev, {
          fecha: hoy,
          valorTotal: Number(totales.valorTotal.toFixed(2)),
          capitalInvertido: Number(totales.capitalInvertido.toFixed(2)),
        });
        saveHistorial(next);
        return next;
      });
    },
    [tieneDatos, valuacionCompleta, hoy, totales.valorTotal, totales.capitalInvertido]
  );

  // (a) Primera apertura del día: un punto nuevo apenas hay valuación completa.
  const puntoDiarioHecho = useRef<string | null>(null);
  useEffect(() => {
    if (!valuacionCompleta || puntoDiarioHecho.current === hoy) return;
    puntoDiarioHecho.current = hoy;
    registrarPunto(false);
  }, [valuacionCompleta, hoy, registrarPunto]);

  // (b) Después de cualquier mutación: se pisa el punto de hoy con el valor nuevo.
  const pendienteSnapshot = useRef(false);
  useEffect(() => {
    if (!pendienteSnapshot.current) return;
    pendienteSnapshot.current = false;
    registrarPunto(true);
  }, [transacciones, plazosFijos, registrarPunto]);

  const persistirTransacciones = (next: Transaccion[]) => {
    saveTransacciones(next);
    pendienteSnapshot.current = true;
    setTransacciones(next);
  };
  const persistirPlazosFijos = (next: PlazoFijo[]) => {
    savePlazosFijos(next);
    pendienteSnapshot.current = true;
    setPlazosFijos(next);
  };

  /* ---------------- Acciones: transacciones ---------------- */
  const agregarTransaccion = (tx: Omit<Transaccion, "id">) => {
    persistirTransacciones([...transacciones, { ...tx, id: nuevoId() }]);
  };
  const editarTransaccion = (tx: Transaccion) => {
    persistirTransacciones(transacciones.map((t) => (t.id === tx.id ? tx : t)));
  };
  const eliminarTransaccion = (id: string) => {
    persistirTransacciones(transacciones.filter((t) => t.id !== id));
  };

  /* ---------------- Acciones: plazos fijos ---------------- */
  const agregarPlazoFijo = (pf: Omit<PlazoFijo, "id" | "estado">) => {
    persistirPlazosFijos([...plazosFijos, { ...pf, id: nuevoId(), estado: "activo" }]);
  };
  const editarPlazoFijo = (pf: PlazoFijo) => {
    persistirPlazosFijos(plazosFijos.map((p) => (p.id === pf.id ? pf : p)));
  };
  const eliminarPlazoFijo = (id: string) => {
    persistirPlazosFijos(plazosFijos.filter((p) => p.id !== id));
  };
  /** Renovar: el viejo queda "renovado" y nace uno nuevo con el capital final como capital. */
  const renovarPlazoFijo = (id: string, nuevo: Omit<PlazoFijo, "id" | "estado">) => {
    persistirPlazosFijos([
      ...plazosFijos.map((p) => (p.id === id ? { ...p, estado: "renovado" as const } : p)),
      { ...nuevo, id: nuevoId(), estado: "activo" },
    ]);
  };
  const retirarPlazoFijo = (id: string) => {
    persistirPlazosFijos(plazosFijos.map((p) => (p.id === id ? { ...p, estado: "retirado" as const } : p)));
  };

  /* ---------------- Config ---------------- */
  const cambiarDolarCasa = (casa: CasaDolar) => {
    const next = { ...config, dolarCasa: casa };
    saveConfig(next);
    setConfig(next);
    pendienteSnapshot.current = true;
  };

  /* ---------------- Backup ---------------- */
  const importarBackup = (backup: PortfolioBackup) => {
    saveTransacciones(backup.transacciones);
    savePlazosFijos(backup.plazosFijos);
    saveHistorial(backup.historial);
    saveConfig(backup.config);
    setTransacciones(backup.transacciones);
    setPlazosFijos(backup.plazosFijos);
    setHistorial(backup.historial);
    setConfig(backup.config);
  };

  const borrarTodo = () => {
    saveTransacciones([]);
    savePlazosFijos([]);
    saveHistorial([]);
    setTransacciones([]);
    setPlazosFijos([]);
    setHistorial([]);
  };

  return {
    transacciones,
    plazosFijos,
    historial,
    config,
    posiciones,
    posicionesActivas,
    totales,
    dolar,
    dolarEsRespaldo,
    tieneDatos,
    valuacionCompleta,
    agregarTransaccion,
    editarTransaccion,
    eliminarTransaccion,
    agregarPlazoFijo,
    editarPlazoFijo,
    eliminarPlazoFijo,
    renovarPlazoFijo,
    retirarPlazoFijo,
    cambiarDolarCasa,
    importarBackup,
    borrarTodo,
    valorFinalPlazoFijo,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
