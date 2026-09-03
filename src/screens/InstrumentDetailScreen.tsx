import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Instrumento, RangoTemporal, PuntoHistorico } from "../types";
import InstrumentChart from "../components/InstrumentChart";
import { fetchInstrumentHistory } from "../lib/history";

interface InstrumentDetailScreenProps {
  instruments: Instrumento[];
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
}

export default function InstrumentDetailScreen({
  instruments,
  selectedCompareIds,
  onToggleCompare,
}: InstrumentDetailScreenProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangoTemporal>("30d");
  const [historyState, setHistoryState] = useState<{
    data: PuntoHistorico[];
    isEstimate: boolean;
    loading: boolean;
  }>({ data: [], isEstimate: true, loading: true });

  const decodedId = decodeURIComponent(id || "");
  const instrument = useMemo(() => {
    return instruments.find((item) => item.id === decodedId);
  }, [instruments, decodedId]);

  useEffect(() => {
    if (!instrument) return;
    let cancelled = false;
    setHistoryState((prev) => ({ ...prev, loading: true }));

    fetchInstrumentHistory(instrument).then((result) => {
      if (cancelled) return;
      setHistoryState({ data: result.data, isEstimate: result.isEstimate, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [instrument]);

  // Instrumentos relacionados de la misma categoría
  const relatedInstruments = useMemo(() => {
    if (!instrument) return [];
    return instruments
      .filter((item) => item.categoria === instrument.categoria && item.id !== instrument.id)
      .slice(0, 4);
  }, [instruments, instrument]);

  if (!instrument) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold text-finanzar-primary mb-2">
          Instrumento no encontrado
        </h2>
        <p className="text-sm text-finanzar-textSecondary mb-6">
          No pudimos localizar el activo "{decodedId}". Puede haber sido reclasificado o no estar disponible.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-finanzar-primary text-finanzar-surface rounded-md text-sm font-medium hover:bg-finanzar-primaryHover transition-colors"
        >
          ← Volver al panel de Mercados
        </Link>
      </main>
    );
  }

  const isSelectedForCompare = selectedCompareIds.includes(instrument.id);
  const hasVariation = instrument.variacion24h !== undefined && instrument.variacion24h !== null;
  const isPositive = hasVariation && instrument.variacion24h! >= 0;

  // Estadísticas del histórico (a partir del histórico real, no del sintético)
  const displayHistory = historyState.data.length > 0 ? historyState.data : instrument.historico;
  const minVal = displayHistory.length > 0 ? Math.min(...displayHistory.map((h) => h.valor)) : instrument.tasaORendimientoActual;
  const maxVal = displayHistory.length > 0 ? Math.max(...displayHistory.map((h) => h.valor)) : instrument.tasaORendimientoActual;

  const formatCurrencyOrRate = (val: number) => {
    if (instrument.unidad === "TNA") return `${val.toFixed(2)}% TNA`;
    if (instrument.unidad === "precio_usd") return `US$ ${val.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: val < 100 ? 2 : 0,
    }).format(val);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      {/* Navegación y Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs text-finanzar-textSecondary hover:text-finanzar-primary font-medium transition-colors"
        >
          <span>← Volver a Mercados</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onToggleCompare(instrument.id)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
              isSelectedForCompare
                ? "bg-finanzar-accentSubtle border-finanzar-accent text-finanzar-primary"
                : "bg-finanzar-surface border-finanzar-border text-finanzar-textMain hover:border-finanzar-primary"
            }`}
          >
            <span>{isSelectedForCompare ? "✓ En Comparador" : "+ Agregar a Comparar"}</span>
          </button>

          {selectedCompareIds.length >= 2 && (
            <button
              onClick={() => navigate("/comparar")}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold bg-finanzar-primary text-finanzar-surface hover:bg-finanzar-primaryHover transition-colors"
            >
              <span>Ver Comparativa ({selectedCompareIds.length}) →</span>
            </button>
          )}
        </div>
      </div>

      {/* Encabezado Principal */}
      <div className="bg-finanzar-surface rounded-md border border-finanzar-border p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-finanzar-bg text-finanzar-textSecondary border border-finanzar-borderSubtle">
                {instrument.categoria}
              </span>
              {instrument.ticker && (
                <span className="text-xs font-mono font-bold text-finanzar-accent px-2 py-0.5 rounded bg-finanzar-accentSubtle border border-finanzar-accent/30">
                  {instrument.ticker}
                </span>
              )}
              <span className="text-xs text-finanzar-textSecondary">
                • {instrument.entidadOFuente}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tracking-tight">
              {instrument.nombre}
            </h1>
            <p className="text-xs text-finanzar-textSecondary mt-2">
              Última actualización: {instrument.actualizadoEn}
            </p>
          </div>

          {/* Tarjeta de Tasa / Cotización Actual */}
          <div className="bg-finanzar-bg border border-finanzar-border rounded-md p-4 min-w-[240px]">
            <span className="text-xs uppercase tracking-wider font-medium text-finanzar-textSecondary block">
              {instrument.unidad === "TNA" ? "Tasa Nominal Anual (TNA)" : "Cotización Vigente"}
            </span>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="font-serif text-3xl font-bold text-finanzar-primary tabular-nums">
                {formatCurrencyOrRate(instrument.tasaORendimientoActual)}
              </span>
              {hasVariation && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tabular-nums border ${
                    isPositive
                      ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                      : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                  }`}
                >
                  <span>{isPositive ? "↑" : "↓"}</span>
                  <span className="ml-0.5">{Math.abs(instrument.variacion24h!).toFixed(2)}%</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-finanzar-borderSubtle text-xs">
          <div>
            <span className="text-finanzar-textSecondary block">Mínimo Histórico</span>
            <span className="font-mono font-semibold text-finanzar-textMain tabular-nums mt-0.5 block">
              {formatCurrencyOrRate(minVal)}
            </span>
          </div>
          <div>
            <span className="text-finanzar-textSecondary block">Máximo Histórico</span>
            <span className="font-mono font-semibold text-finanzar-textMain tabular-nums mt-0.5 block">
              {formatCurrencyOrRate(maxVal)}
            </span>
          </div>
          <div>
            <span className="text-finanzar-textSecondary block">Unidad de Medida</span>
            <span className="font-mono font-semibold text-finanzar-textMain mt-0.5 block uppercase">
              {instrument.unidad}
            </span>
          </div>
          <div>
            <span className="text-finanzar-textSecondary block">Mercado / Liquidez</span>
            <span className="font-semibold text-finanzar-textMain mt-0.5 block">
              {instrument.categoria === "pesos" ? "Inmediata / 30 Días" : "Mercado Abierto (T+1)"}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Histórico Principal con Selector de Rango */}
      <div className="mb-8">
        <InstrumentChart
          titulo={`Evolución Histórica — ${instrument.nombre}`}
          subtitulo={
            historyState.loading
              ? "Cargando histórico…"
              : historyState.isEstimate
              ? "Estimación — sin histórico oficial gratuito disponible para este instrumento"
              : `Histórico oficial — ${instrument.entidadOFuente}`
          }
          valorActual={instrument.tasaORendimientoActual}
          unidad={instrument.unidad}
          variacion={instrument.variacion24h}
          data={displayHistory}
          activeRange={range}
          onRangeChange={(newRange) => setRange(newRange)}
        />
      </div>

      {/* Descripción y Detalles Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2 bg-finanzar-surface rounded-md border border-finanzar-border p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-finanzar-primary mb-3">
            Análisis & Descripción del Instrumento
          </h3>
          <p className="text-sm text-finanzar-textSecondary leading-relaxed mb-4">
            {instrument.descripcion ||
              `Este instrumento forma parte de las alternativas disponibles para ahorristas e inversores en el mercado argentino. Su rendimiento se encuentra sujeto a la política monetaria, la cotización de los tipos de cambio de referencia y las condiciones de liquidez general.`}
          </p>
          <div className="p-4 rounded bg-finanzar-bg border border-finanzar-borderSubtle text-xs text-finanzar-textSecondary space-y-2">
            <p>
              <strong className="text-finanzar-textMain">Supervisión:</strong> Operado bajo normas del Banco Central de la República Argentina (BCRA) o Comisión Nacional de Valores (CNV).
            </p>
            <p>
              <strong className="text-finanzar-textMain">Moneda de liquidación:</strong> Pesos Argentinos (ARS) o Dólares Estadounidenses (USD) según corresponda.
            </p>
            {instrument.enlace && (
              <p>
                <a
                  href={instrument.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-finanzar-primary hover:text-finanzar-accent font-medium underline"
                >
                  Ver ficha oficial en el sitio de la entidad ↗
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Alternativas Similares */}
        <div className="bg-finanzar-surface rounded-md border border-finanzar-border p-6 shadow-sm">
          <h3 className="font-serif text-base font-bold text-finanzar-primary mb-4">
            Otras opciones en {instrument.categoria}
          </h3>
          <div className="space-y-3">
            {relatedInstruments.map((rel) => (
              <Link
                key={rel.id}
                to={`/instrumento/${encodeURIComponent(rel.id)}`}
                className="block p-3 rounded bg-finanzar-bg hover:bg-finanzar-surfaceHover border border-finanzar-borderSubtle hover:border-finanzar-border transition-colors"
              >
                <p className="text-xs font-semibold text-finanzar-textMain truncate">
                  {rel.nombre}
                </p>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-finanzar-textSecondary">{rel.entidadOFuente}</span>
                  <span className="font-mono font-bold text-finanzar-primary">
                    {formatCurrencyOrRate(rel.tasaORendimientoActual)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
