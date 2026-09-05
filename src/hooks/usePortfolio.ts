import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CasaDolar, FondoComun, MonedaVista, Instrumento, PlazoFijo, PortfolioConfig, PuntoPortfolio, Transaccion } from "../types";
import {
  agregarPuntoHistorial,
  aplicarRescate,
  loadFondosComunes,
  saveFondosComunes,
  valuarFondoComun,
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
import { EVENTO_CONFIG_CAMBIO, EVENTO_PORTFOLIO_REEMPLAZADO, notificarCambioPortfolio } from "../lib/sync";

/**
 * Estado + acciones del portfolio personal. Todo vive en localStorage del
 * navegador (sin backend): cada mutación persiste al toque y, además, guarda
 * un punto del historial del gráfico para que reaccione sin esperar al día
 * siguiente (ver DESIGN sección 5).
 */
export function usePortfolio(instruments: Instrumento[], isLive: boolean) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => loadTransacciones());
  const [plazosFijos, setPlazosFijos] = useState<PlazoFijo[]>(() => loadPlazosFijos());
  const [fondosComunes, setFondosComunes] = useState<FondoComun[]>(() => loadFondosComunes());
  const [historial, setHistorial] = useState<PuntoPortfolio[]>(() => loadHistorial());
  const [config, setConfig] = useState<PortfolioConfig>(() => loadConfig());

  const hoy = hoyISO();

  // Si el portfolio local fue reemplazado desde afuera (sincronización con la
  // cuenta, import desde Account), se recarga todo el estado desde localStorage.
  useEffect(() => {
    const recargar = () => {
      setTransacciones(loadTransacciones());
      setPlazosFijos(loadPlazosFijos());
      setFondosComunes(loadFondosComunes());
      setHistorial(loadHistorial());
      setConfig(loadConfig());
    };
    const recargarConfig = () => setConfig(loadConfig());
    window.addEventListener(EVENTO_PORTFOLIO_REEMPLAZADO, recargar);
    window.addEventListener(EVENTO_CONFIG_CAMBIO, recargarConfig);
    return () => {
      window.removeEventListener(EVENTO_PORTFOLIO_REEMPLAZADO, recargar);
      window.removeEventListener(EVENTO_CONFIG_CAMBIO, recargarConfig);
    };
  }, []);

  const posiciones = useMemo(
    () => derivarPosiciones(transacciones, instruments, hoy),
    [transacciones, instruments, hoy]
  );
  const posicionesActivas = useMemo(() => posiciones.filter((p) => p.cantidad > 0), [posiciones]);

  const fondosValuados = useMemo(
    () => fondosComunes.map((fc) => valuarFondoComun(fc, instruments, hoy)),
    [fondosComunes, instruments, hoy]
  );

  // Guardar la última TNA en vivo de cada fondo como respaldo (sin re-render extra si no cambió).
  useEffect(() => {
    let cambio = false;
    const next = fondosComunes.map((fc) => {
      if (!fc.instrumentId) return fc;
      const inst = instruments.find((i) => i.id === fc.instrumentId);
      if (!inst || inst.tasaORendimientoActual === fc.ultimaTna) return fc;
      cambio = true;
      return { ...fc, ultimaTna: inst.tasaORendimientoActual };
    });
    if (cambio) {
      saveFondosComunes(next);
      setFondosComunes(next);
    }
  }, [instruments, fondosComunes]);

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
    () => calcularTotales(posiciones, plazosFijos, fondosValuados, dolar, hoy),
    [posiciones, plazosFijos, fondosValuados, dolar, hoy]
  );

  const tieneDatos = transacciones.length > 0 || plazosFijos.length > 0 || fondosComunes.length > 0;

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
        notificarCambioPortfolio();
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
  }, [transacciones, plazosFijos, fondosComunes, registrarPunto]);

  const persistirTransacciones = (next: Transaccion[]) => {
    saveTransacciones(next);
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
    setTransacciones(next);
  };
  const persistirPlazosFijos = (next: PlazoFijo[]) => {
    savePlazosFijos(next);
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
    setPlazosFijos(next);
  };

  const persistirFondos = (next: FondoComun[]) => {
    saveFondosComunes(next);
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
    setFondosComunes(next);
  };

  /* ---------------- Acciones: fondos comunes ---------------- */
  const agregarFondoComun = (fc: Omit<FondoComun, "id" | "estado" | "realizada" | "rescates">) => {
    persistirFondos([...fondosComunes, { ...fc, id: nuevoId(), estado: "activo", realizada: 0, rescates: [] }]);
  };
  const editarFondoComun = (fc: FondoComun) => {
    persistirFondos(fondosComunes.map((f) => (f.id === fc.id ? fc : f)));
  };
  const eliminarFondoComun = (id: string) => {
    persistirFondos(fondosComunes.filter((f) => f.id !== id));
  };
  /** Rescate total o parcial; devuelve el monto retirado (para ofrecer reinvertirlo). */
  const rescatarFondoComun = (id: string, monto: number) => {
    const fc = fondosValuados.find((f) => f.id === id);
    if (!fc) return 0;
    const retirado = Math.min(monto, fc.valorActual);
    persistirFondos(fondosComunes.map((f) => (f.id === id ? aplicarRescate(fc, retirado, hoy) : f)));
    return retirado;
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
    notificarCambioPortfolio();
    setConfig(next);
    pendienteSnapshot.current = true;
  };

  const cambiarMonedaVista = (moneda: MonedaVista) => {
    const next = { ...config, monedaVista: moneda };
    saveConfig(next);
    notificarCambioPortfolio();
    setConfig(next);
  };

  /* ---------------- Backup ---------------- */
  const importarBackup = (backup: PortfolioBackup) => {
    saveTransacciones(backup.transacciones);
    savePlazosFijos(backup.plazosFijos);
    saveFondosComunes(backup.fondosComunes);
    saveHistorial(backup.historial);
    saveConfig(backup.config);
    setTransacciones(backup.transacciones);
    setPlazosFijos(backup.plazosFijos);
    setFondosComunes(backup.fondosComunes);
    setHistorial(backup.historial);
    setConfig(backup.config);
    notificarCambioPortfolio();
  };

  const borrarTodo = () => {
    saveTransacciones([]);
    savePlazosFijos([]);
    saveFondosComunes([]);
    saveHistorial([]);
    setTransacciones([]);
    setPlazosFijos([]);
    setFondosComunes([]);
    setHistorial([]);
    notificarCambioPortfolio();
  };

  return {
    transacciones,
    plazosFijos,
    fondosComunes,
    fondosValuados,
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
    agregarFondoComun,
    editarFondoComun,
    eliminarFondoComun,
    rescatarFondoComun,
    cambiarDolarCasa,
    cambiarMonedaVista,
    importarBackup,
    borrarTodo,
    valorFinalPlazoFijo,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
