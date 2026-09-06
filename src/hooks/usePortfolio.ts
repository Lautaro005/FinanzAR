import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CasaDolar,
  EventoMovimiento,
  FondoComun,
  MonedaVista,
  Instrumento,
  MovimientoEfectivo,
  PlazoFijo,
  PortfolioConfig,
  PuntoPortfolio,
  Transaccion,
} from "../types";
import {
  agregarPuntoHistorial,
  aplicarRescate,
  loadEfectivo,
  loadEventos,
  loadFondosComunes,
  saveEfectivo,
  saveEventos,
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
  saldoEfectivo,
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
  const [eventos, setEventos] = useState<EventoMovimiento[]>(() => loadEventos());
  const [efectivoMovs, setEfectivoMovs] = useState<MovimientoEfectivo[]>(() => loadEfectivo());

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
      setEventos(loadEventos());
      setEfectivoMovs(loadEfectivo());
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

  const efectivoActual = useMemo(() => saldoEfectivo(efectivoMovs, hoy), [efectivoMovs, hoy]);

  const totales = useMemo(
    () => calcularTotales(posiciones, plazosFijos, fondosValuados, dolar, efectivoActual, hoy),
    [posiciones, plazosFijos, fondosValuados, dolar, efectivoActual, hoy]
  );

  const tieneDatos =
    transacciones.length > 0 || plazosFijos.length > 0 || fondosComunes.length > 0 || efectivoMovs.length > 0;

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
  }, [transacciones, plazosFijos, fondosComunes, efectivoMovs, registrarPunto]);

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

  /**
   * Registra un evento en "Movimientos" (altas/renovaciones/retiros de PF,
   * altas/rescates de FCI, ingresos/retiros de efectivo). Usa la forma
   * funcional de setState porque más de un evento puede registrarse dentro
   * del mismo handler (ej. un retiro de plazo fijo también acredita
   * efectivo) — con la forma no funcional, la segunda llamada pisaría a la
   * primera al partir del mismo `eventos` capturado por closure.
   */
  const registrarEvento = (ev: Omit<EventoMovimiento, "id">) => {
    setEventos((prev) => {
      const next = [...prev, { ...ev, id: nuevoId() }];
      saveEventos(next);
      return next;
    });
    notificarCambioPortfolio();
  };

  /**
   * Acredita efectivo sin generar su propio evento en Movimientos — se usa
   * cuando el ingreso ya queda documentado por el evento que lo originó
   * (retiro de plazo fijo, rescate de FCI), para no duplicar la fila.
   */
  const acreditarEfectivo = (monto: number, fecha: string, notas?: string) => {
    setEfectivoMovs((prev) => {
      const next = [...prev, { id: nuevoId(), fecha, tipo: "ingreso" as const, monto: Number(monto.toFixed(2)), notas }];
      saveEfectivo(next);
      return next;
    });
    pendienteSnapshot.current = true;
  };

  /* ---------------- Acciones: fondos comunes ---------------- */
  const agregarFondoComun = (fc: Omit<FondoComun, "id" | "estado" | "realizada" | "rescates">) => {
    const id = nuevoId();
    persistirFondos([...fondosComunes, { ...fc, id, estado: "activo", realizada: 0, rescates: [] }]);
    registrarEvento({ tipo: "alta_fci", descripcion: fc.fondo, monto: fc.capital, moneda: "ARS", fecha: fc.fechaInicio, notas: fc.notas, refId: id });
  };
  const editarFondoComun = (fc: FondoComun) => {
    persistirFondos(fondosComunes.map((f) => (f.id === fc.id ? fc : f)));
  };
  const eliminarFondoComun = (id: string) => {
    persistirFondos(fondosComunes.filter((f) => f.id !== id));
  };
  /** Rescate total o parcial: el monto retirado pasa a Efectivo; devuelve el monto (para ofrecer reinvertirlo). */
  const rescatarFondoComun = (id: string, monto: number) => {
    const fc = fondosValuados.find((f) => f.id === id);
    if (!fc) return 0;
    const retirado = Math.min(monto, fc.valorActual);
    persistirFondos(fondosComunes.map((f) => (f.id === id ? aplicarRescate(fc, retirado, hoy) : f)));
    registrarEvento({ tipo: "rescate_fci", descripcion: fc.fondo, monto: retirado, moneda: "ARS", fecha: hoy, refId: id });
    acreditarEfectivo(retirado, hoy, `Rescate de FCI: ${fc.fondo}`);
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
    const id = nuevoId();
    persistirPlazosFijos([...plazosFijos, { ...pf, id, estado: "activo" }]);
    registrarEvento({ tipo: "alta_pf", descripcion: pf.entidad, monto: pf.capital, moneda: "ARS", fecha: pf.fechaInicio, notas: pf.notas, refId: id });
  };
  const editarPlazoFijo = (pf: PlazoFijo) => {
    persistirPlazosFijos(plazosFijos.map((p) => (p.id === pf.id ? pf : p)));
  };
  const eliminarPlazoFijo = (id: string) => {
    persistirPlazosFijos(plazosFijos.filter((p) => p.id !== id));
  };
  /** Renovar: el viejo queda "renovado" y nace uno nuevo con el capital final como capital. */
  const renovarPlazoFijo = (id: string, nuevo: Omit<PlazoFijo, "id" | "estado">) => {
    const nuevoIdPf = nuevoId();
    persistirPlazosFijos([
      ...plazosFijos.map((p) => (p.id === id ? { ...p, estado: "renovado" as const } : p)),
      { ...nuevo, id: nuevoIdPf, estado: "activo" },
    ]);
    registrarEvento({ tipo: "renovacion_pf", descripcion: nuevo.entidad, monto: nuevo.capital, moneda: "ARS", fecha: nuevo.fechaInicio, refId: id });
  };
  /** Retirar: el plazo fijo queda "retirado" y su valor final pasa a Efectivo. */
  const retirarPlazoFijo = (id: string) => {
    const pf = plazosFijos.find((p) => p.id === id);
    persistirPlazosFijos(plazosFijos.map((p) => (p.id === id ? { ...p, estado: "retirado" as const } : p)));
    if (!pf) return;
    const monto = Number(valorFinalPlazoFijo(pf).toFixed(2));
    registrarEvento({ tipo: "retiro_pf", descripcion: pf.entidad, monto, moneda: "ARS", fecha: hoy, refId: id });
    acreditarEfectivo(monto, hoy, `Retiro de plazo fijo: ${pf.entidad}`);
  };

  /* ---------------- Acciones: efectivo ---------------- */
  const agregarEfectivo = (monto: number, fecha: string, notas?: string) => {
    const entry: MovimientoEfectivo = { id: nuevoId(), fecha, tipo: "ingreso", monto: Number(monto.toFixed(2)), notas };
    setEfectivoMovs((prev) => {
      const next = [...prev, entry];
      saveEfectivo(next);
      return next;
    });
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
    registrarEvento({ tipo: "efectivo_ingreso", descripcion: "Efectivo", monto: entry.monto, moneda: "ARS", fecha, notas, refId: entry.id });
  };
  /** Retiro manual de efectivo (sale del portfolio) o consumo al reinvertir un rescate en una nueva compra/FCI. */
  const retirarEfectivo = (monto: number, fecha: string, notas?: string) => {
    const entry: MovimientoEfectivo = { id: nuevoId(), fecha, tipo: "retiro", monto: Number(monto.toFixed(2)), notas };
    setEfectivoMovs((prev) => {
      const next = [...prev, entry];
      saveEfectivo(next);
      return next;
    });
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
    registrarEvento({ tipo: "efectivo_retiro", descripcion: "Efectivo", monto: entry.monto, moneda: "ARS", fecha, notas, refId: entry.id });
  };
  const eliminarMovimientoEfectivo = (id: string) => {
    setEfectivoMovs((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveEfectivo(next);
      return next;
    });
    setEventos((prev) => {
      const next = prev.filter((e) => e.refId !== id);
      saveEventos(next);
      return next;
    });
    notificarCambioPortfolio();
    pendienteSnapshot.current = true;
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
    // La moneda de visualización (ARS/USD) es meramente local/decorativa;
    // se desvincula de Turso para evitar writes/reads innecesarios en la base de datos.
    setConfig(next);
  };

  /* ---------------- Backup ---------------- */
  const importarBackup = (backup: PortfolioBackup) => {
    saveTransacciones(backup.transacciones);
    savePlazosFijos(backup.plazosFijos);
    saveFondosComunes(backup.fondosComunes);
    saveHistorial(backup.historial);
    saveConfig(backup.config);
    saveEventos(backup.eventos || []);
    saveEfectivo(backup.efectivo || []);
    setTransacciones(backup.transacciones);
    setPlazosFijos(backup.plazosFijos);
    setFondosComunes(backup.fondosComunes);
    setHistorial(backup.historial);
    setConfig(backup.config);
    setEventos(backup.eventos || []);
    setEfectivoMovs(backup.efectivo || []);
    notificarCambioPortfolio();
  };

  const borrarTodo = () => {
    saveTransacciones([]);
    savePlazosFijos([]);
    saveFondosComunes([]);
    saveHistorial([]);
    saveEventos([]);
    saveEfectivo([]);
    setTransacciones([]);
    setPlazosFijos([]);
    setFondosComunes([]);
    setHistorial([]);
    setEventos([]);
    setEfectivoMovs([]);
    notificarCambioPortfolio();
  };

  return {
    transacciones,
    plazosFijos,
    fondosComunes,
    fondosValuados,
    historial,
    config,
    eventos,
    efectivoMovs,
    efectivoActual,
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
    agregarEfectivo,
    retirarEfectivo,
    eliminarMovimientoEfectivo,
    cambiarDolarCasa,
    cambiarMonedaVista,
    importarBackup,
    borrarTodo,
    valorFinalPlazoFijo,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
