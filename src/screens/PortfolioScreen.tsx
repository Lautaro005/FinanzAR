import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { usePortfolio } from "../hooks/usePortfolio";
import { Instrumento, PlazoFijo, Transaccion } from "../types";
import {
  armarBackup,
  CASAS_DOLAR,
  devengadoPlazoFijo,
  estadoEfectivo,
  formatCantidad,
  formatFechaCorta,
  formatMoneda,
  formatPct,
  formatPrecio,
  parsearBackup,
  plazoEnDias,
  Posicion,
  valorFinalPlazoFijo,
} from "../lib/portfolio";
import PortfolioChart from "../components/portfolio/PortfolioChart";
import TransactionModal from "../components/portfolio/TransactionModal";
import PlazoFijoModal from "../components/portfolio/PlazoFijoModal";
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

type ModalState =
  | { tipo: "compra"; montoInicial?: number }
  | { tipo: "venta"; posicion: Posicion }
  | { tipo: "editar-tx"; transaccion: Transaccion }
  | { tipo: "alta-pf" }
  | { tipo: "renovar-pf"; plazoFijo: PlazoFijo }
  | { tipo: "editar-pf"; plazoFijo: PlazoFijo }
  | null;

export default function PortfolioScreen({ instruments, isLive }: { instruments: Instrumento[]; isLive: boolean }) {
  useDocumentMeta(
    "Portfolio",
    "Seguimiento de tu portfolio personal de inversiones: posiciones, plazos fijos, resultado y evolución en el tiempo. Todo se guarda en tu navegador.",
    "/portfolio"
  );

  const p = usePortfolio(instruments, isLive);
  const [modal, setModal] = useState<ModalState>(null);
  const [verHistorialPf, setVerHistorialPf] = useState(false);
  const [confirmBorrar, setConfirmBorrar] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [reinvertir, setReinvertir] = useState<{ entidad: string; monto: number } | null>(null);
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

  const movimientos = useMemo(
    () => [...p.transacciones].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)),
    [p.transacciones]
  );

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
        texto: `Backup importado: ${backup.transacciones.length} movimientos y ${backup.plazosFijos.length} plazos fijos.`,
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      {/* Cabecera */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Seguimiento personal</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tracking-tight mt-1">Portfolio</h1>
          <p className="text-sm text-finanzar-textSecondary mt-1">
            Cargá tus tenencias y seguí su valor con las mismas cotizaciones de Mercados. Todo queda guardado en este navegador.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotonSecundario onClick={exportar} disabled={!p.tieneDatos}>⤓ Exportar backup</BotonSecundario>
          <BotonSecundario onClick={() => fileRef.current?.click()}>⤒ Importar</BotonSecundario>
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
          <BotonSecundario onClick={() => setModal({ tipo: "alta-pf" })}>+ Plazo fijo</BotonSecundario>
          <BotonPrimario onClick={() => setModal({ tipo: "compra" })}>+ Agregar compra</BotonPrimario>
        </div>
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
            Retiraste el plazo fijo de <strong>{reinvertir.entidad}</strong>: quedaron disponibles{" "}
            <strong>{formatMoneda(reinvertir.monto)}</strong>. ¿Los reinvertís en otro instrumento?
          </span>
          <div className="flex gap-2">
            <BotonSecundario onClick={() => { setModal({ tipo: "compra", montoInicial: reinvertir.monto }); setReinvertir(null); }}>
              Reinvertir
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
            Agregá una compra de cualquier instrumento de Mercados (FCI, cripto, CEDEARs, acciones, bonos, EE.UU., divisas)
            o constituí un plazo fijo. Podés cargar operaciones pasadas con la fecha y el precio que realmente pagaste.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <BotonPrimario onClick={() => setModal({ tipo: "compra" })}>+ Agregar compra</BotonPrimario>
            <BotonSecundario onClick={() => setModal({ tipo: "alta-pf" })}>+ Plazo fijo</BotonSecundario>
            <BotonSecundario onClick={() => fileRef.current?.click()}>Importar backup</BotonSecundario>
          </div>
          <p className="text-[11px] text-finanzar-textMuted mt-6 max-w-lg mx-auto">
            Sin cuenta ni servidor: los datos viven solo en el almacenamiento local de este navegador. Si borrás los datos del
            sitio o cambiás de dispositivo, los perdés — por eso conviene exportar un backup cada tanto.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs + selector de dólar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Kpi label="Valor total (ARS)" valor={formatMoneda(p.totales.valorTotal, "ARS", true)} sub={`Mercado + plazos fijos · USD al ${casaLabel.toLowerCase()}`} />
            <Kpi label="Capital invertido" valor={formatMoneda(p.totales.capitalInvertido, "ARS", true)} sub="Costo de lo que tenés hoy" />
            <Kpi
              label="Resultado no realizado"
              valor={`${p.totales.resultado >= 0 ? "+" : ""}${formatMoneda(p.totales.resultado, "ARS", true)}`}
              sub={formatPct(p.totales.resultadoPct)}
              tono={p.totales.resultado >= 0 ? "pos" : "neg"}
            />
            <Kpi
              label="Ganancia realizada"
              valor={`${p.totales.realizada >= 0 ? "+" : ""}${formatMoneda(p.totales.realizada, "ARS", true)}`}
              sub="Acumulada por ventas"
              tono={p.totales.realizada >= 0 ? "pos" : "neg"}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 px-1">
            <div className="flex items-center gap-2 text-xs text-finanzar-textSecondary">
              <span>Convertir USD a pesos con</span>
              <select
                value={p.config.dolarCasa}
                onChange={(e) => p.cambiarDolarCasa(e.target.value as any)}
                className="px-2 py-1 bg-finanzar-surface border border-finanzar-border rounded text-xs text-finanzar-textMain focus:outline-none focus:ring-1 focus:ring-finanzar-accent"
              >
                {CASAS_DOLAR.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <span className="font-mono tabular-nums text-finanzar-textMain">
                {p.dolar !== null ? `= ${formatMoneda(p.dolar)}` : "sin cotización"}
              </span>
              {p.dolarEsRespaldo && p.config.ultimoDolar && (
                <span className="text-finanzar-accent" title="Divisas no cargó en vivo; se usa la última cotización guardada.">
                  (última guardada, {formatFechaCorta(p.config.ultimoDolar.fecha)})
                </span>
              )}
            </div>
            <div className="text-[11px] text-finanzar-textMuted">
              {!isLive
                ? "Cargando cotizaciones en vivo…"
                : p.totales.sinValuar > 0
                ? `${p.totales.sinValuar} ${p.totales.sinValuar === 1 ? "posición sin cotización en vivo, valuada" : "posiciones sin cotización en vivo, valuadas"} al costo.`
                : "Valuado con cotizaciones en vivo."}
            </div>
          </div>

          <div className="mb-8">
            <PortfolioChart historial={p.historial} />
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
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatPrecio(pos.precioPromedio, pos.moneda)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">
                              {pos.precioActual !== null ? formatPrecio(pos.precioActual, pos.moneda) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatMoneda(pos.costoTotal, pos.moneda, true)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-finanzar-primary">{formatMoneda(valor, pos.moneda, true)}</td>
                            <td className="px-3 py-3 text-right">
                              {resultado === null ? (
                                <span className="text-finanzar-textMuted">—</span>
                              ) : (
                                <span className={`inline-flex flex-col items-end font-mono tabular-nums ${resultado >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                                  <span className="font-semibold">{resultado >= 0 ? "+" : ""}{formatMoneda(resultado, pos.moneda, true)}</span>
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
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textMain">{formatMoneda(pf.capital, "ARS", true)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{pf.tna.toFixed(2)}%</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(pf.fechaInicio)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-textSecondary">
                              {formatFechaCorta(pf.fechaVencimiento)}
                              {activoOVencido && !vencio && <span className="block text-[10px] text-finanzar-textMuted">en {diasRestantes} d</span>}
                            </td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums text-finanzar-positive">+{formatMoneda(devengado, "ARS", true)}</td>
                            <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-finanzar-primary">{formatMoneda(finales, "ARS", true)}</td>
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
                                        setReinvertir({ entidad: pf.entidad, monto: Number(finales.toFixed(2)) });
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
                      {movimientos.map((tx) => {
                        const moneda = tx.unidad === "precio_usd" ? "USD" : "ARS";
                        return (
                          <tr key={tx.id} className="hover:bg-finanzar-surfaceHover">
                            <td className="px-4 py-2.5 font-mono tabular-nums text-finanzar-textSecondary">{formatFechaCorta(tx.fecha)}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-1.5 py-0.5 rounded-xs text-[10px] uppercase tracking-wider font-semibold border ${
                                tx.tipo === "compra"
                                  ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                                  : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                              }`}>
                                {tx.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-finanzar-textMain">
                              <span className="font-medium">{tx.instrumentoNombre}</span>
                              {tx.ticker && <span className="ml-1.5 font-mono text-[10px] text-finanzar-textSecondary">{tx.ticker}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatCantidad(tx.cantidad, tx.categoria)}</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums text-finanzar-textSecondary">{formatPrecio(tx.precioUnitario, moneda)}</td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold">{formatMoneda(tx.cantidad * tx.precioUnitario, moneda, true)}</td>
                            <td className="px-3 py-2.5 text-finanzar-textMuted truncate max-w-[160px]">{tx.notas || ""}</td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <button onClick={() => setModal({ tipo: "editar-tx", transaccion: tx })} className="text-finanzar-primary hover:text-finanzar-accent underline mr-3">Editar</button>
                              <button onClick={() => p.eliminarTransaccion(tx.id)} className="text-finanzar-textSecondary hover:text-finanzar-negative underline">Eliminar</button>
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
              Tu portfolio se guarda solo en este navegador (sin cuenta ni servidor). Exportá un backup cada tanto: es la única copia.{" "}
              <Link to="/privacidad" className="underline hover:text-finanzar-primary">Más sobre privacidad</Link>.
            </p>
            {confirmBorrar ? (
              <span className="flex items-center gap-2">
                ¿Borrar todo el portfolio de este navegador?
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
          onSubmit={(tx) => { p.agregarTransaccion(tx); setModal(null); }}
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
    </main>
  );
}
