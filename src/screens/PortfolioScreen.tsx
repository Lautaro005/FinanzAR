import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { usePortfolio } from "../hooks/usePortfolio";
import { useAuth } from "../hooks/useAuth";
import { CasaDolar, EventoMovimiento, FondoComun, Instrumento, PlazoFijo, TipoMovimiento, Transaccion } from "../types";
import {
  armarBackup,
  calcularTotalesEnFecha,
  CASAS_DOLAR,
  cotizacionDolar,
  devengadoPlazoFijo,
  estadoEfectivo,
  formatCantidad,
  formatFechaCorta,
  formatMoneda,
  formatPct,
  formatPrecio,
  FondoComunValuado,
  parsearBackup,
  plazoEnDias,
  Posicion,
  valorFinalPlazoFijo,
} from "../lib/portfolio";
import PortfolioChart from "../components/portfolio/PortfolioChart";
import TransactionModal from "../components/portfolio/TransactionModal";
import PlazoFijoModal from "../components/portfolio/PlazoFijoModal";
import FondoComunModal from "../components/portfolio/FondoComunModal";
import EfectivoModal from "../components/portfolio/EfectivoModal";
import CurrencyToggle from "../components/portfolio/CurrencyToggle";
import { BotonPrimario, BotonSecundario } from "../components/portfolio/Modal";

const CATEGORIA_LABEL: Record<string, string> = {
  pesos: "Plazo fijo",
  fci: "FCI",
  cripto: "Cripto",
  cedears: "CEDEAR",
  acciones: "Acción",
  bonos: "Bono",
  eeuu: "EE.UU.",
  divisas: "Divisa",
};

const badgeClass = (categoria: string) => {
  switch (categoria) {
    case "fci":
      return "bg-[#EFEAF5] text-[#4A3B70] border border-[#D9CDEB]";
    case "cripto":
      return "bg-[#ECEAE4] text-[#26262B] border border-[#D6D2C4]";
    case "cedears":
    case "acciones":
      return "bg-[#F6EEDC] text-[#8C6B1B] border border-[#E8D9B5]";
    case "bonos":
      return "bg-[#ECEEF2] text-[#2C3E50] border border-[#CBD2DD]";
    case "eeuu":
      return "bg-[#E5ECF6] text-[#1E3A63] border border-[#B8CEEA]";
    case "divisas":
      return "bg-[#E3F1EA] text-[#1E5C3F] border border-[#BEE0CD]";
    default:
      return "bg-[#EAF0F8] text-[#1B2A4A] border border-[#CBDCEE]";
  }
};

const ESTADO_PF: Record<PlazoFijo["estado"], { label: string; cls: string; dot: string }> = {
  activo: { label: "Activo", cls: "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder", dot: "bg-finanzar-positive" },
  vencido: { label: "Vencido", cls: "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder", dot: "bg-finanzar-negative" },
  renovado: { label: "Renovado", cls: "bg-finanzar-bg text-finanzar-textSecondary border-finanzar-border", dot: "bg-finanzar-textMuted" },
  retirado: { label: "Retirado", cls: "bg-finanzar-bg text-finanzar-textSecondary border-finanzar-border", dot: "bg-finanzar-textMuted" },
};

/** Estilo + etiqueta de cada tipo de evento en "Movimientos" (además de compra/venta, que ya tienen las suyas más abajo). */
const MOVIMIENTO_LABEL: Record<TipoMovimiento, { label: string; cls: string }> = {
  compra: { label: "compra", cls: "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder" },
  venta: { label: "venta", cls: "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder" },
  alta_pf: { label: "alta plazo fijo", cls: "bg-finanzar-bg text-finanzar-textSecondary border-finanzar-border" },
  renovacion_pf: { label: "renovación PF", cls: "bg-finanzar-bg text-finanzar-textSecondary border-finanzar-border" },
  retiro_pf: { label: "retiro PF", cls: "bg-finanzar-accentSubtle text-finanzar-accent border-finanzar-border" },
  alta_fci: { label: "alta FCI", cls: "bg-finanzar-bg text-finanzar-textSecondary border-finanzar-border" },
  rescate_fci: { label: "rescate FCI", cls: "bg-finanzar-accentSubtle text-finanzar-accent border-finanzar-border" },
  efectivo_ingreso: { label: "ingreso efectivo", cls: "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder" },
  efectivo_retiro: { label: "retiro efectivo", cls: "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder" },
};

type ModalState =
  | { tipo: "compra"; montoInicial?: number; deEfectivo?: boolean }
  | { tipo: "venta"; posicion: Posicion }
  | { tipo: "editar-tx"; transaccion: Transaccion }
  | { tipo: "alta-pf" }
  | { tipo: "renovar-pf"; plazoFijo: PlazoFijo }
  | { tipo: "editar-pf"; plazoFijo: PlazoFijo }
  | { tipo: "alta-fci"; capitalInicial?: number; deEfectivo?: boolean }
  | { tipo: "editar-fci"; fondo: FondoComunValuado }
  | { tipo: "rescate-fci"; fondo: FondoComunValuado }
  | { tipo: "efectivo"; modoInicial?: "ingreso" | "retiro" }
  | null;

export default function PortfolioScreen({ instruments, isLive }: { instruments: Instrumento[]; isLive: boolean }) {
  useDocumentMeta(
    "Portfolio",
    "Seguimiento de tu portfolio personal de inversiones: posiciones, plazos fijos, resultado y evolución en el tiempo. Todo se guarda en tu navegador.",
    "/portfolio"
  );

  const p = usePortfolio(instruments, isLive);
  const auth = useAuth();
  const syncActiva = !!auth.usuario?.syncEnabled;
  const [modal, setModal] = useState<ModalState>(null);
  const [verHistorialPf, setVerHistorialPf] = useState(false);
  const [verHistorialFci, setVerHistorialFci] = useState(false);
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [reinvertir, setReinvertir] = useState<{ origen: string; monto: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hoy = new Date();

  const plazosActivos = useMemo(
    () => p.plazosFijos.filter((pf) => pf.estado === "activo").sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)),
    [p.plazosFijos]
  );
  const plazosHistorial = useMemo(
    () => p.plazosFijos.filter((pf) => pf.estado !== "activo").sort((a, b) => b.fechaVencimiento.localeCompare(a.fechaVencimiento)),
    [p.plazosFijos]
  );

  const fondosActivos = useMemo(() => p.fondosValuados.filter((f) => f.estado === "activo"), [p.fondosValuados]);
  const fondosHistorial = useMemo(() => p.fondosValuados.filter((f) => f.estado !== "activo"), [p.fondosValuados]);

  /** Fila unificada de "Movimientos": compras/ventas (Transaccion) + altas/retiros/rescates de PF, FCI y Efectivo (EventoMovimiento). */
  type FilaMovimiento = { fuente: "tx"; tx: Transaccion } | { fuente: "evento"; evento: EventoMovimiento };
  const movimientos = useMemo<FilaMovimiento[]>(() => {
    const filas: FilaMovimiento[] = [
      ...p.transacciones.map((tx): FilaMovimiento => ({ fuente: "tx", tx })),
      ...p.eventos.map((evento): FilaMovimiento => ({ fuente: "evento", evento })),
    ];
    const fechaDe = (f: FilaMovimiento) => (f.fuente === "tx" ? f.tx.fecha : f.evento.fecha);
    const idDe = (f: FilaMovimiento) => (f.fuente === "tx" ? f.tx.id : f.evento.id);
    return filas.sort((a, b) => fechaDe(b).localeCompare(fechaDe(a)) || idDe(b).localeCompare(idDe(a)));
  }, [p.transacciones, p.eventos]);

  /** Fecha más antigua en que el usuario tenía algo cargado (arranque de la reconstrucción retroactiva del gráfico). */
  const fechaInicioTenencias = useMemo(() => {
    const fechas = [
      ...p.transacciones.map((t) => t.fecha),
      ...p.plazosFijos.map((pf) => pf.fechaInicio),
      ...p.fondosComunes.map((fc) => fc.fechaInicio),
      ...p.efectivoMovs.map((m) => m.fecha),
    ].filter(Boolean);
    return fechas.length ? fechas.reduce((a, b) => (a < b ? a : b)) : null;
  }, [p.transacciones, p.plazosFijos, p.fondosComunes, p.efectivoMovs]);

  /** Reconstruye un día anterior al primer punto guardado del gráfico (ver calcularTotalesEnFecha). */
  const calcularRetroactivo = useMemo(() => {
    return (fecha: string) => {
      const t = calcularTotalesEnFecha(
        fecha,
        p.transacciones,
        p.plazosFijos,
        p.fondosComunes,
        instruments,
        p.eventos,
        p.efectivoMovs,
        p.dolar
      );
      return { valorTotal: t.valorTotal, capitalInvertido: t.capitalInvertido };
    };
  }, [p.transacciones, p.plazosFijos, p.fondosComunes, p.eventos, p.efectivoMovs, instruments, p.dolar]);

  const aArs = (monto: number, moneda: "ARS" | "USD") => (moneda === "USD" ? (p.dolar ?? 0) * monto : monto);

  const posicionesOrdenadas = useMemo(
    () =>
      [...p.posicionesActivas].sort(
        (a, b) => aArs(b.valorActual ?? b.costoTotal, b.moneda) - aArs(a.valorActual ?? a.costoTotal, a.moneda)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.posicionesActivas, p.dolar]
  );

  const casaLabel = CASAS_DOLAR.find((c) => c.id === p.config.dolarCasa)?.label || p.config.dolarCasa;

  /* ---------------- Moneda de visualización (toggle AR$ / US$) ---------------- */
  const vista = p.config.monedaVista ?? "ARS";
  /** Convierte un monto de su moneda de origen a la moneda de la vista; null si hace falta el dólar y no hay. */
  const convertir = (monto: number, origen: "ARS" | "USD"): number | null => {
    if (origen === vista) return monto;
    if (p.dolar === null || p.dolar === 0) return null;
    return vista === "USD" ? monto / p.dolar : monto * p.dolar;
  };
  /** Formatea en la moneda de la vista (o en la de origen si no se puede convertir). */
  const fm = (monto: number, origen: "ARS" | "USD" = "ARS", compact = true) => {
    const c = convertir(monto, origen);
    return c === null ? formatMoneda(monto, origen, compact) : formatMoneda(c, vista, compact);
  };
  const fp = (precio: number, origen: "ARS" | "USD") => {
    const c = convertir(precio, origen);
    return c === null ? formatPrecio(precio, origen) : formatPrecio(c, vista);
  };

  /* ---------------- Backup ---------------- */
  const exportar = () => {
    const backup = armarBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzar-portfolio-${backup.exportadoEn.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setAviso({ tipo: "ok", texto: "Backup exportado. Guardalo en un lugar seguro: es la única copia de tu portfolio." });
  };

  const importar = async (file: File) => {
    try {
      const texto = await file.text();
      const backup = parsearBackup(texto);
      p.importarBackup(backup);
      setAviso({
        tipo: "ok",
        texto: `Backup importado: ${backup.transacciones.length} movimientos, ${backup.plazosFijos.length} plazos fijos y ${backup.fondosComunes.length} FCI.`,
      });
    } catch (e: any) {
      setAviso({ tipo: "error", texto: e?.message || "No se pudo importar el archivo." });
    }
  };

  /* ---------------- Render helpers ---------------- */
  const Kpi = ({ label, valor, sub, tono }: { label: string; valor: string; sub?: string; tono?: "pos" | "neg" }) => (
    <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-4 shadow-xs">
      <span className="text-[11px] uppercase tracking-wider font-medium text-finanzar-textSecondary block">{label}</span>
      <span
        className={`font-serif text-2xl font-bold tabular-nums block mt-1 ${
          tono === "pos" ? "text-finanzar-positive" : tono === "neg" ? "text-finanzar-negative" : "text-finanzar-primary"
        }`}
      >
        {valor}
      </span>
      {sub && <p className="text-[11px] text-finanzar-textMuted mt-1">{sub}</p>}
    </div>
  );

  const accionClass =
    "inline-block px-3 py-1 rounded-sm text-xs font-medium transition-colors text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent";

  return (
    <>
      {/* Barra de acciones del portfolio, pegada debajo del header (mismo formato que tenía la nav) */}
      <div className="w-full border-b border-finanzar-borderSubtle bg-finanzar-bg sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-2 gap-y-1 text-xs font-medium">
            <li><button onClick={() => setModal({ tipo: "compra" })} className={`${accionClass} text-finanzar-primary font-semibold`}>+ Agregar compra</button></li>
            <li><button onClick={() => setModal({ tipo: "alta-fci" })} className={accionClass}>+ FCI</button></li>
            <li><button onClick={() => setModal({ tipo: "alta-pf" })} className={accionClass}>+ Plazo fijo</button></li>
            <li><button onClick={() => setModal({ tipo: "efectivo", modoInicial: "ingreso" })} className={accionClass}>+ Efectivo</button></li>
            <li><span className="text-finanzar-borderStrong select-none">·</span></li>
            <li>
              <select
                value={p.config.dolarCasa}
                onChange={(e) => p.cambiarDolarCasa(e.target.value as CasaDolar)}
                title="Cotización del dólar para consolidar el portfolio en pesos"
                className="bg-transparent border-none text-xs font-medium text-finanzar-textSecondary hover:text-finanzar-primary rounded-sm px-1 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent"
              >
                {CASAS_DOLAR.map((c) => {
                  const valor = cotizacionDolar(instruments, c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.label}
                      {valor !== null ? ` — ${formatMoneda(valor)}` : ""}
                    </option>
                  );
                })}
              </select>
            </li>
            <li><span className="text-finanzar-borderStrong select-none">·</span></li>
            {syncActiva ? (
              /* Con sincronización activa, exportar/importar viven en la cuenta; acá solo se muestra el estado. */
              <li>
                <Link
                  to="/account"
                  className={`${accionClass} inline-flex items-center gap-1.5`}
                  title={auth.errorSync || "Ver sincronización en Mi cuenta"}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      auth.estadoSync === "error"
                        ? "bg-finanzar-negative"
                        : auth.estadoSync === "sincronizando"
                        ? "bg-finanzar-accent animate-pulse"
                        : "bg-finanzar-positive"
                    }`}
                  />
                  {auth.estadoSync === "error"
                    ? "Error de sincronización"
                    : auth.estadoSync === "sincronizando"
                    ? "Sincronización en progreso…"
                    : "Sincronizado con tu cuenta"}
                </Link>
              </li>
            ) : (
              <>
                <li><button onClick={exportar} disabled={!p.tieneDatos} className={accionClass}>⤓ Exportar backup</button></li>
                <li><button onClick={() => fileRef.current?.click()} className={accionClass}>⤒ Importar</button></li>
              </>
            )}
          </ul>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      {/* Cabecera */}
      <div className="mb-6">
        <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Seguimiento personal</span>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 mt-1">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tracking-tight">Portfolio</h1>
          <CurrencyToggle
            value={vista}
            onChange={p.cambiarMonedaVista}
            casaLabel={casaLabel}
            dolarTexto={p.dolar !== null ? formatMoneda(p.dolar) : null}
          />
        </div>
        <p className="text-sm text-finanzar-textSecondary mt-1">
          Cargá tus tenencias y seguí su valor con las mismas cotizaciones de Mercados.{" "}
          {syncActiva ? "Todo queda guardado en este navegador y sincronizado con tu cuenta." : "Todo queda guardado en este navegador."}
        </p>
      </div>

      {aviso && (
        <div
          className={`mb-6 flex items-start justify-between gap-3 px-4 py-3 rounded-md border text-xs ${
            aviso.tipo === "ok"
              ? "bg-finanzar-positiveBg border-finanzar-positiveBorder text-finanzar-positive"
              : "bg-finanzar-negativeBg border-finanzar-negativeBorder text-finanzar-negative"
          }`}
        >
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="font-semibold">✕</button>
        </div>
      )}

      {reinvertir && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-md border border-finanzar-accent bg-finanzar-accentSubtle text-xs text-finanzar-textMain">
          <span>
            {reinvertir.origen}: quedaron disponibles <strong>{fm(reinvertir.monto, "ARS", false)}</strong>. ¿Los reinvertís?
          </span>
          <div className="flex gap-2">
            <BotonSecundario onClick={() => { setModal({ tipo: "compra", montoInicial: reinvertir.monto, deEfectivo: true }); setReinvertir(null); }}>
              En un instrumento
            </BotonSecundario>
            <BotonSecundario onClick={() => { setModal({ tipo: "alta-fci", capitalInicial: reinvertir.monto, deEfectivo: true }); setReinvertir(null); }}>
              En un FCI
            </BotonSecundario>
            <BotonSecundario onClick={() => setReinvertir(null)}>Ahora no</BotonSecundario>
          </div>
        </div>
      )}

      {!p.tieneDatos ? (
        /* Estado vacío */
        <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-10 text-center shadow-sm mb-8">
          <h2 className="font-serif text-2xl font-bold text-finanzar-primary">Tu portfolio está vacío</h2>
          <p className="text-sm text-finanzar-textSecondary mt-2 max-w-xl mx-auto">
            Agregá una compra de cualquier instrumento de Mercados (cripto, CEDEARs, acciones, bonos, EE.UU., divisas),
            suscribí un FCI o constituí un plazo fijo. Podés cargar operaciones pasadas con la fecha y el precio que realmente pagaste.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <BotonPrimario onClick={() => setModal({ tipo: "compra" })}>+ Agregar compra</BotonPrimario>
            <BotonSecundario onClick={() => setModal({ tipo: "alta-fci" })}>+ FCI</BotonSecundario>
            <BotonSecundario onClick={() => setModal({ tipo: "alta-pf" })}>+ Plazo fijo</BotonSecundario>
            {!syncActiva && <BotonSecundario onClick={() => fileRef.current?.click()}>Importar backup</BotonSecundario>}
          </div>
          <p className="text-[11px] text-finanzar-textMuted mt-6 max-w-lg mx-auto">
            {syncActiva ? (
              <>Tu portfolio se sincroniza con tu cuenta: lo que cargues acá aparece en cualquier dispositivo donde inicies sesión.</>
            ) : (
              <>
                Los datos viven solo en el almacenamiento local de este navegador. Si borrás los datos del sitio o cambiás de
                dispositivo, los perdés — exportá un backup cada tanto o{" "}
                <Link to="/account" className="underline hover:text-finanzar-primary">activá la sincronización con una cuenta</Link>.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* KPIs + selector de dólar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Kpi label={`Valor total (${vista === "USD" ? "US$" : "ARS"})`} valor={fm(p.totales.valorTotal)} sub={`Mercado + FCI + plazos fijos · ${vista === "USD" ? "ARS → US$" : "USD → ARS"} al ${casaLabel.toLowerCase()}`} />
            <Kpi label="Capital invertido" valor={fm(p.totales.capitalInvertido)} sub="Costo de lo que tenés hoy" />
            <Kpi
              label="Resultado no realizado"
              valor={`${p.totales.resultado >= 0 ? "+" : ""}${fm(p.totales.resultado)}`}
              sub={formatPct(p.totales.resultadoPct)}
              tono={p.totales.resultado >= 0 ? "pos" : "neg"}
            />
            <Kpi
              label="Ganancia realizada"
              valor={`${p.totales.realizada >= 0 ? "+" : ""}${fm(p.totales.realizada)}`}
              sub="Acumulada por ventas"
              tono={p.totales.realizada >= 0 ? "pos" : "neg"}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 px-1 text-[11px] text-finanzar-textMuted">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                {casaLabel}:{" "}
                <span className="font-mono tabular-nums text-finanzar-textMain">{p.dolar !== null ? formatMoneda(p.dolar) : "sin cotización"}</span>
              </span>
              {p.dolarEsRespaldo && p.config.ultimoDolar && (
                <span className="text-finanzar-accent" title="Divisas no cargó en vivo; se usa la última cotización guardada.">
                  (última guardada, {formatFechaCorta(p.config.ultimoDolar.fecha)})
                </span>
              )}
            </div>
            <div>
              {!isLive
                ? "Cargando cotizaciones en vivo…"
                : p.totales.sinValuar > 0
                ? `${p.totales.sinValuar} ${p.totales.sinValuar === 1 ? "posición sin cotización en vivo, valuada" : "posiciones sin cotización en vivo, valuadas"} al costo.`
                : "Valuado con cotizaciones en vivo."}
            </div>
          </div>

          <div className="mb-8">
            <PortfolioChart
              historial={p.historial}
              moneda={vista}
              dolar={p.dolar}
              fechaInicioTenencias={fechaInicioTenencias}
              calcularRetroactivo={calcularRetroactivo}
            />
          </div>

          {/* Tabla de posiciones de mercado */}
          <section className="mb-8">
            <div className="flex items-end justify-between mb-2 px-1">
              <div>
                <h2 className="font-serif text-xl font-bold text-finanzar-primary">Posiciones</h2>
                <p className="text-xs text-finanzar-textSecondary">Derivadas de tus compras y ventas, a costo promedio ponderado.</p>
              </div>
              <BotonSecundario onClick={() => setModal({ tipo: "compra" })}>+ Compra</BotonSecundario>
            </div>
            <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
              {posicionesOrdenadas.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-finanzar-textSecondary">Sin posiciones abiertas. Agregá una compra para empezar.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-finanzar-bg text-[11px] uppercase tracking-wider text-finanzar-textSecondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Instrumento</th>
                        <th className="text-right px-3 py-2.5 font-medium">Cantidad</th>
                        <th className="text-right px-3 py-2.5 font-medium">P. promedio</th>
                        <th className="text-right px-3 py-2.5 font-medium">P. actual</th>
                        <th className="text-right px-3 py-2.5 font-medium">Invertido</th>
                        <th className="text-right px-3 py-2.5 font-medium">Valor actual</th>
                        <th className="text-right px-3 py-2.5 font-medium">Resultado</th>
                        <th className="text-right px-3 py-2.5 font-medium">Peso</th>
                        <th className="text-right px-4 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-finanzar-borderSubtle">
                      {posicionesOrdenadas.map((pos) => {
                        const valor = pos.valorActual ?? pos.costoTotal;
                        const resultado = pos.valorActual !== null ? pos.valorActual - pos.costoTotal : null;
                        const resultadoPct = resultado !== null && pos.costoTotal > 0 ? (resultado / pos.costoTotal) * 100 : null;
                        const peso = p.totales.valorTotal > 0 ? (aArs(valor, pos.moneda) / p.totales.valorTotal) * 100 : 0;
                        return (
                          <tr key={pos.instrumentId} className="hover:bg-finanzar-surfaceHover">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 min-w-[180px]">
                                <div className="min-w-0">
                                  <p className="font-medium text-finanzar-textMain truncate max-w-[240px]">{pos.nombre}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${badgeClass(pos.categoria)}`}>
                                      {CATEGORIA_LABEL[pos.categoria] || pos.categoria}
                                    </span>
                                    {pos.ticker && <span className="font-mono text-[10px] text-finanzar-textSecondary">{pos.ticker}</span>}
                                    {pos.valorEstimadoPorTna && (
                                      <span className="text-[10px] text-finanzar-accent" title="Valor estimado devengando la TNA vigente del instrumento desde la fecha promedio de compra.">
                                        est. TNA
                                      </span>
                                    )}
                                    {!pos.instrumento && (
                                      <span className="text-[10px] text-finanzar-negative" title="Este instrumento no está cargado en vivo; se muestra al costo.">
                                        sin cotización
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">{formatCantidad(pos.cantidad, pos.categoria)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{fp(pos.precioPromedio, pos.moneda)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">
                              {pos.precioActual !== null ? fp(pos.precioActual, pos.moneda) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{fm(pos.costoTotal, pos.moneda)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-finanzar-primary">{fm(valor, pos.moneda)}</td>
                            <td className="px-3 py-3 text-right">
                              {resultado === null ? (
                                <span className="text-finanzar-textMuted">—</span>
                              ) : (
                                <span className={`inline-flex flex-col items-end font-mono tabular-nums ${resultado >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                                  <span className="font-semibold">{resultado >= 0 ? "+" : ""}{fm(resultado, pos.moneda)}</span>
                                  <span className="text-[10px]">{resultadoPct !== null ? formatPct(resultadoPct) : ""}</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{peso.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setModal({ tipo: "venta", posicion: pos })}
                                className="text-finanzar-negative hover:underline font-semibold mr-3"
                              >
                                Vender
                              </button>
                              {pos.instrumento ? (
                                <Link to={`/instrumento/${encodeURIComponent(pos.instrumentId)}`} className="text-finanzar-primary hover:text-finanzar-accent underline">
                                  Detalle
                                </Link>
                              ) : (
                                <span className="text-finanzar-textMuted">Detalle</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Tabla de plazos fijos */}
          <section className="mb-8">
            <div className="flex items-end justify-between mb-2 px-1">
              <div>
                <h2 className="font-serif text-xl font-bold text-finanzar-primary">Plazos fijos</h2>
                <p className="text-xs text-finanzar-textSecondary">Interés simple devengado día a día hasta el vencimiento.</p>
              </div>
              <div className="flex gap-2">
                {plazosHistorial.length > 0 && (
                  <BotonSecundario onClick={() => setVerHistorialPf((v) => !v)}>
                    {verHistorialPf ? "Ocultar" : "Ver"} historial ({plazosHistorial.length})
                  </BotonSecundario>
                )}
                <BotonSecundario onClick={() => setModal({ tipo: "alta-pf" })}>+ Plazo fijo</BotonSecundario>
              </div>
            </div>
            <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
              {plazosActivos.length === 0 && !(verHistorialPf && plazosHistorial.length > 0) ? (
                <p className="px-4 py-8 text-center text-sm text-finanzar-textSecondary">Sin plazos fijos activos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-finanzar-bg text-[11px] uppercase tracking-wider text-finanzar-textSecondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Entidad</th>
                        <th className="text-right px-3 py-2.5 font-medium">Capital</th>
                        <th className="text-right px-3 py-2.5 font-medium">TNA</th>
                        <th className="text-right px-3 py-2.5 font-medium">Inicio</th>
                        <th className="text-right px-3 py-2.5 font-medium">Vencimiento</th>
                        <th className="text-right px-3 py-2.5 font-medium">Devengado</th>
                        <th className="text-right px-3 py-2.5 font-medium">Valor final</th>
                        <th className="text-left px-3 py-2.5 font-medium">Estado</th>
                        <th className="text-right px-4 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-finanzar-borderSubtle">
                      {[...plazosActivos, ...(verHistorialPf ? plazosHistorial : [])].map((pf) => {
                        const estado = estadoEfectivo(pf);
                        const vencio = estado === "vencido";
                        const activoOVencido = pf.estado === "activo";
                        const devengado = devengadoPlazoFijo(pf);
                        const finales = valorFinalPlazoFijo(pf);
                        const diasRestantes = Math.max(0, plazoEnDias(pf) - Math.floor((hoy.getTime() - new Date(pf.fechaInicio + "T00:00:00").getTime()) / 86_400_000));
                        const e = ESTADO_PF[estado];
                        return (
                          <tr key={pf.id} className={`hover:bg-finanzar-surfaceHover ${!activoOVencido ? "opacity-60" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-finanzar-textMain">{pf.entidad}</p>
                              {pf.notas && <p className="text-[10px] text-finanzar-textMuted truncate max-w-[200px]">{pf.notas}</p>}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">{fm(pf.capital)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{pf.tna.toFixed(2)}%</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(pf.fechaInicio)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">
                              {formatFechaCorta(pf.fechaVencimiento)}
                              {activoOVencido && !vencio && <span className="block text-[10px] text-finanzar-textMuted">en {diasRestantes} d</span>}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-positive">+{fm(devengado)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-finanzar-primary">{fm(finales)}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${e.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${e.dot}`} />
                                {e.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {activoOVencido ? (
                                vencio ? (
                                  <>
                                    <button onClick={() => setModal({ tipo: "renovar-pf", plazoFijo: pf })} className="text-finanzar-primary hover:text-finanzar-accent font-semibold underline mr-3">Renovar</button>
                                    <button
                                      onClick={() => {
                                        p.retirarPlazoFijo(pf.id);
                                        setReinvertir({ origen: `Retiraste el plazo fijo de ${pf.entidad}`, monto: Number(finales.toFixed(2)) });
                                      }}
                                      className="text-finanzar-negative hover:underline font-semibold"
                                    >
                                      Retirar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => setModal({ tipo: "editar-pf", plazoFijo: pf })} className="text-finanzar-primary hover:text-finanzar-accent underline mr-3">Editar</button>
                                    <button onClick={() => p.eliminarPlazoFijo(pf.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">Eliminar</button>
                                  </>
                                )
                              ) : (
                                <button onClick={() => p.eliminarPlazoFijo(pf.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">Eliminar</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Tabla de FCI por rendimiento */}
          <section className="mb-8">
            <div className="flex items-end justify-between mb-2 px-1">
              <div>
                <h2 className="font-serif text-xl font-bold text-finanzar-primary">Fondos comunes de inversión</h2>
                <p className="text-xs text-finanzar-textSecondary">Capital que devenga el rendimiento del fondo (en vivo o fijo) hasta que lo rescatás. Sin vencimiento.</p>
              </div>
              <div className="flex gap-2">
                {fondosHistorial.length > 0 && (
                  <BotonSecundario onClick={() => setVerHistorialFci((v) => !v)}>
                    {verHistorialFci ? "Ocultar" : "Ver"} rescatados ({fondosHistorial.length})
                  </BotonSecundario>
                )}
                <BotonSecundario onClick={() => setModal({ tipo: "alta-fci" })}>+ FCI</BotonSecundario>
              </div>
            </div>
            <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
              {fondosActivos.length === 0 && !(verHistorialFci && fondosHistorial.length > 0) ? (
                <p className="px-4 py-8 text-center text-sm text-finanzar-textSecondary">Sin FCI suscriptos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-finanzar-bg text-[11px] uppercase tracking-wider text-finanzar-textSecondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Fondo</th>
                        <th className="text-right px-3 py-2.5 font-medium">Capital</th>
                        <th className="text-right px-3 py-2.5 font-medium">TNA</th>
                        <th className="text-right px-3 py-2.5 font-medium">Suscripción</th>
                        <th className="text-right px-3 py-2.5 font-medium">Devengado</th>
                        <th className="text-right px-3 py-2.5 font-medium">Valor actual</th>
                        <th className="text-right px-3 py-2.5 font-medium">Realizado</th>
                        <th className="text-left px-3 py-2.5 font-medium">Estado</th>
                        <th className="text-right px-4 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-finanzar-borderSubtle">
                      {[...fondosActivos, ...(verHistorialFci ? fondosHistorial : [])].map((fc) => {
                        const activo = fc.estado === "activo";
                        const origen =
                          fc.origenTna === "vivo" ? "en vivo" : fc.origenTna === "fija" ? "fija" : fc.origenTna === "guardada" ? "última guardada" : "sin dato";
                        return (
                          <tr key={fc.id} className={`hover:bg-finanzar-surfaceHover ${!activo ? "opacity-60" : ""}`}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-finanzar-textMain truncate max-w-[260px]">{fc.fondo}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold ${badgeClass("fci")}`}>FCI</span>
                                {fc.instrumento && (
                                  <Link to={`/instrumento/${encodeURIComponent(fc.instrumento.id)}`} className="text-[10px] text-finanzar-primary hover:text-finanzar-accent underline">Detalle</Link>
                                )}
                                {fc.notas && <span className="text-[10px] text-finanzar-textMuted truncate max-w-[160px]">{fc.notas}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">{activo ? fm(fc.capital) : "—"}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">
                              {fc.tnaUsada !== null ? `${fc.tnaUsada.toFixed(2)}%` : "—"}
                              <span className="block text-[10px] text-finanzar-textMuted">{origen}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(fc.fechaInicio)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-positive">{activo ? `+${fm(fc.devengado)}` : "—"}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-finanzar-primary">{activo ? fm(fc.valorActual) : "—"}</td>
                            <td className={`px-3 py-3 text-right font-mono tabular-nums ${fc.realizada >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                              {fc.rescates.length > 0 ? `${fc.realizada >= 0 ? "+" : ""}${fm(fc.realizada)}` : "—"}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${activo ? ESTADO_PF.activo.cls : ESTADO_PF.retirado.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${activo ? ESTADO_PF.activo.dot : ESTADO_PF.retirado.dot}`} />
                                {activo ? "Activo" : "Rescatado"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {activo ? (
                                <>
                                  <button onClick={() => setModal({ tipo: "rescate-fci", fondo: fc })} className="text-finanzar-negative hover:underline font-semibold mr-3">Rescatar</button>
                                  <button onClick={() => setModal({ tipo: "editar-fci", fondo: fc })} className="text-finanzar-primary hover:text-finanzar-accent underline mr-3">Editar</button>
                                </>
                              ) : null}
                              <button onClick={() => p.eliminarFondoComun(fc.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">Eliminar</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Efectivo */}
          <section className="mb-8">
            <div className="flex items-end justify-between mb-2 px-1">
              <div>
                <h2 className="font-serif text-xl font-bold text-finanzar-primary">Efectivo</h2>
                <p className="text-xs text-finanzar-textSecondary">
                  Dinero dentro del portfolio sin invertir: lo que cargás a mano, o lo que queda disponible tras un
                  rescate de FCI o el retiro de un plazo fijo.
                </p>
              </div>
              <div className="flex gap-2">
                <BotonSecundario onClick={() => setModal({ tipo: "efectivo", modoInicial: "retiro" })} disabled={p.efectivoActual <= 0}>
                  − Retiro
                </BotonSecundario>
                <BotonSecundario onClick={() => setModal({ tipo: "efectivo", modoInicial: "ingreso" })}>+ Ingreso</BotonSecundario>
              </div>
            </div>
            <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-finanzar-borderSubtle">
                <span className="text-xs text-finanzar-textSecondary">Disponible hoy</span>
                <span className="font-serif text-lg font-bold text-finanzar-primary tabular-nums">{fm(p.efectivoActual)}</span>
              </div>
              {p.efectivoMovs.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-finanzar-textSecondary">Sin movimientos de efectivo todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-finanzar-bg text-[11px] uppercase tracking-wider text-finanzar-textSecondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2.5 font-medium">Tipo</th>
                        <th className="text-right px-3 py-2.5 font-medium">Monto</th>
                        <th className="text-left px-3 py-2.5 font-medium">Notas</th>
                        <th className="text-right px-4 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-finanzar-borderSubtle">
                      {[...p.efectivoMovs]
                        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
                        .map((m) => (
                          <tr key={m.id} className="hover:bg-finanzar-surfaceHover">
                            <td className="px-4 py-2.5 font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(m.fecha)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold border ${
                                  m.tipo === "ingreso"
                                    ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                                    : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                                }`}
                              >
                                {m.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{fm(m.monto)}</td>
                            <td className="px-3 py-2.5 text-finanzar-textMuted truncate max-w-[220px]">{m.notas || ""}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <button onClick={() => p.eliminarMovimientoEfectivo(m.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Movimientos */}
          <section className="mb-8">
            <div className="flex items-end justify-between mb-2 px-1">
              <div>
                <h2 className="font-serif text-xl font-bold text-finanzar-primary">Movimientos</h2>
                <p className="text-xs text-finanzar-textSecondary">Todas tus compras y ventas. Editá o borrá para corregir errores de carga.</p>
              </div>
            </div>
            <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
              {movimientos.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-finanzar-textSecondary">Todavía no hay movimientos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-finanzar-bg text-[11px] uppercase tracking-wider text-finanzar-textSecondary">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                        <th className="text-left px-3 py-2.5 font-medium">Tipo</th>
                        <th className="text-left px-3 py-2.5 font-medium">Instrumento</th>
                        <th className="text-right px-3 py-2.5 font-medium">Cantidad</th>
                        <th className="text-right px-3 py-2.5 font-medium">Precio</th>
                        <th className="text-right px-3 py-2.5 font-medium">Total</th>
                        <th className="text-left px-3 py-2.5 font-medium">Notas</th>
                        <th className="text-right px-4 py-2.5 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-finanzar-borderSubtle">
                      {movimientos.map((fila) => {
                        if (fila.fuente === "tx") {
                          const tx = fila.tx;
                          const moneda = tx.unidad === "precio_usd" ? "USD" : "ARS";
                          return (
                            <tr key={`tx-${tx.id}`} className="hover:bg-finanzar-surfaceHover">
                              <td className="px-4 py-2.5 font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(tx.fecha)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold border ${MOVIMIENTO_LABEL[tx.tipo].cls}`}>
                                  {MOVIMIENTO_LABEL[tx.tipo].label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-finanzar-textMain">
                                <span className="font-medium">{tx.instrumentoNombre}</span>
                                {tx.ticker && <span className="ml-1.5 font-mono text-[10px] text-finanzar-textSecondary">{tx.ticker}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCantidad(tx.cantidad, tx.categoria)}</td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-finanzar-textSecondary">{fp(tx.precioUnitario, moneda)}</td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{fm(tx.cantidad * tx.precioUnitario, moneda)}</td>
                              <td className="px-3 py-2.5 text-finanzar-textMuted truncate max-w-[160px]">{tx.notas || ""}</td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button onClick={() => setModal({ tipo: "editar-tx", transaccion: tx })} className="text-finanzar-primary hover:text-finanzar-accent underline mr-3">Editar</button>
                                <button onClick={() => p.eliminarTransaccion(tx.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">Eliminar</button>
                              </td>
                            </tr>
                          );
                        }
                        const evento = fila.evento;
                        return (
                          <tr key={`ev-${evento.id}`} className="hover:bg-finanzar-surfaceHover">
                            <td className="px-4 py-2.5 font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(evento.fecha)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold border ${MOVIMIENTO_LABEL[evento.tipo].cls}`}>
                                {MOVIMIENTO_LABEL[evento.tipo].label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-finanzar-textMain">
                              <span className="font-medium">{evento.descripcion}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-finanzar-textMuted">—</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-finanzar-textMuted">—</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{fm(evento.monto, evento.moneda)}</td>
                            <td className="px-3 py-2.5 text-finanzar-textMuted truncate max-w-[160px]">{evento.notas || ""}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              {evento.tipo.startsWith("efectivo_") && evento.refId ? (
                                <button
                                  onClick={() => p.eliminarMovimientoEfectivo(evento.refId!)}
                                  className="text-finanzar-textSecondary hover:text-finanzar-negative underline"
                                >
                                  Eliminar
                                </button>
                              ) : (
                                <span className="text-finanzar-textMuted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Pie: privacidad + borrar todo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-finanzar-textMuted border-t border-finanzar-borderSubtle pt-4">
            <p>
              {syncActiva
                ? "Tu portfolio está sincronizado con tu cuenta. Podés exportar o importar un backup desde Mi cuenta."
                : "Tu portfolio se guarda solo en este navegador (sin cuenta ni servidor). Exportá un backup cada tanto: es la única copia."}{" "}
              <Link to="/privacidad" className="underline hover:text-finanzar-primary">Más sobre privacidad</Link>.
            </p>
            {confirmBorrar ? (
              <span className="flex items-center gap-2">
                {syncActiva ? "¿Borrar todo el portfolio (también en tu cuenta)?" : "¿Borrar todo el portfolio de este navegador?"}
                <button onClick={() => { p.borrarTodo(); setConfirmBorrar(false); }} className="text-finanzar-negative font-semibold underline">Sí, borrar</button>
                <button onClick={() => setConfirmBorrar(false)} className="underline">Cancelar</button>
              </span>
            ) : (
              <button onClick={() => setConfirmBorrar(true)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline self-start">
                Borrar todo el portfolio
              </button>
            )}
          </div>
        </>
      )}

      {/* Modales */}
      {modal?.tipo === "compra" && (
        <TransactionModal
          modo="compra"
          instruments={instruments}
          montoInicial={modal.montoInicial}
          onClose={() => setModal(null)}
          onSubmit={(tx) => {
            p.agregarTransaccion(tx);
            if (modal.deEfectivo && modal.montoInicial) {
              p.retirarEfectivo(modal.montoInicial, tx.fecha, `Reinversión en ${tx.instrumentoNombre}`);
            }
            setModal(null);
          }}
        />
      )}
      {modal?.tipo === "venta" && (
        <TransactionModal
          modo="venta"
          instruments={instruments}
          posicion={modal.posicion}
          onClose={() => setModal(null)}
          onSubmit={(tx) => { p.agregarTransaccion(tx); setModal(null); }}
        />
      )}
      {modal?.tipo === "editar-tx" && (
        <TransactionModal
          modo="editar"
          instruments={instruments}
          transaccion={modal.transaccion}
          posicion={modal.transaccion.tipo === "venta" ? p.posiciones.find((x) => x.instrumentId === modal.transaccion.instrumentId) : undefined}
          onClose={() => setModal(null)}
          onSubmit={(tx) => { p.editarTransaccion({ ...tx, id: modal.transaccion.id }); setModal(null); }}
        />
      )}
      {modal?.tipo === "alta-pf" && (
        <PlazoFijoModal
          modo="alta"
          instruments={instruments}
          onClose={() => setModal(null)}
          onSubmit={(pf) => { p.agregarPlazoFijo(pf); setModal(null); }}
        />
      )}
      {modal?.tipo === "renovar-pf" && (
        <PlazoFijoModal
          modo="renovar"
          instruments={instruments}
          plazoFijo={modal.plazoFijo}
          capitalInicial={valorFinalPlazoFijo(modal.plazoFijo)}
          onClose={() => setModal(null)}
          onSubmit={(pf) => { p.renovarPlazoFijo(modal.plazoFijo.id, pf); setModal(null); }}
        />
      )}
      {modal?.tipo === "editar-pf" && (
        <PlazoFijoModal
          modo="editar"
          instruments={instruments}
          plazoFijo={modal.plazoFijo}
          onClose={() => setModal(null)}
          onSubmit={(pf) => { p.editarPlazoFijo({ ...modal.plazoFijo, ...pf }); setModal(null); }}
        />
      )}
      {modal?.tipo === "alta-fci" && (
        <FondoComunModal
          modo="alta"
          instruments={instruments}
          capitalInicial={modal.capitalInicial}
          onClose={() => setModal(null)}
          onSubmit={(fc) => {
            p.agregarFondoComun(fc);
            if (modal.deEfectivo && modal.capitalInicial) {
              p.retirarEfectivo(modal.capitalInicial, fc.fechaInicio, `Reinversión en FCI: ${fc.fondo}`);
            }
            setModal(null);
          }}
        />
      )}
      {modal?.tipo === "efectivo" && (
        <EfectivoModal
          modoInicial={modal.modoInicial}
          saldoDisponible={p.efectivoActual}
          onClose={() => setModal(null)}
          onSubmit={(mov) => {
            if (mov.tipo === "ingreso") p.agregarEfectivo(mov.monto, mov.fecha, mov.notas);
            else p.retirarEfectivo(mov.monto, mov.fecha, mov.notas);
            setModal(null);
          }}
        />
      )}
      {modal?.tipo === "editar-fci" && (
        <FondoComunModal
          modo="editar"
          instruments={instruments}
          fondo={modal.fondo}
          onClose={() => setModal(null)}
          onSubmit={(fc) => {
            const { instrumento: _i, tnaUsada: _t, origenTna: _o, valorActual: _v, devengado: _d, ...base } = modal.fondo;
            const actualizado: FondoComun = { ...base, ...fc };
            p.editarFondoComun(actualizado);
            setModal(null);
          }}
        />
      )}
      {modal?.tipo === "rescate-fci" && (
        <FondoComunModal
          modo="rescate"
          instruments={instruments}
          fondo={modal.fondo}
          onClose={() => setModal(null)}
          onSubmit={() => setModal(null)}
          onRescate={(monto) => {
            const retirado = p.rescatarFondoComun(modal.fondo.id, monto);
            setReinvertir({ origen: `Rescataste de ${modal.fondo.fondo}`, monto: Number(retirado.toFixed(2)) });
            setModal(null);
          }}
        />
      )}
    </main>
    </>
  );
}
