import { useState, useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CategoryTabs, { CategoriaFiltro } from "./components/CategoryTabs";
import InstrumentTable from "./components/InstrumentTable";
import InstrumentChart from "./components/InstrumentChart";
import CompareDrawer, { COMPARISON_COLORS } from "./components/CompareDrawer";
import InstrumentDetailScreen from "./screens/InstrumentDetailScreen";
import AboutScreen from "./screens/AboutScreen";
import NotFoundScreen from "./screens/NotFoundScreen";
import PrivacyPolicyScreen from "./screens/PrivacyPolicyScreen";
import PortfolioScreen from "./screens/PortfolioScreen";
import { useDocumentMeta } from "./hooks/useDocumentMeta";
import { Categoria, Instrumento, PuntoHistorico } from "./types";
import { useInstruments } from "./hooks/useInstruments";
import { fetchInstrumentHistory } from "./lib/history";
import { sliceByRange } from "./lib/dateRange";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

/* ============================================================
   PANTALLA 1: HOME (MERCADOS & RENDIMIENTOS)
   ============================================================ */
function Home({
  instruments,
  categoryCounts,
  loading,
  selectedCompareIds,
  onToggleCompare,
  onRemoveCompare,
  onClearCompare,
}: {
  instruments: Instrumento[];
  categoryCounts: Record<Categoria, number>;
  loading: boolean;
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
  onRemoveCompare: (id: string) => void;
  onClearCompare: () => void;
}) {
  const navigate = useNavigate();
  useDocumentMeta(
    "Mercados y Rendimientos",
    "Tabla comparativa en vivo de plazos fijos, FCI, dólar, criptomonedas, CEDEARs, acciones, bonos y ETFs de EE.UU. disponibles en Argentina.",
    "/"
  );
  const [tab, setTab] = useState<CategoriaFiltro>("todos");
  const [detailInstrument, setDetailInstrument] = useState<Instrumento | null>(null);
  const [quickHistory, setQuickHistory] = useState<{
    data: PuntoHistorico[];
    isEstimate: boolean;
  } | null>(null);

  useEffect(() => {
    if (!detailInstrument) {
      setQuickHistory(null);
      return;
    }
    let cancelled = false;
    fetchInstrumentHistory(detailInstrument).then((res) => {
      if (!cancelled) setQuickHistory(res);
    });
    return () => {
      cancelled = true;
    };
  }, [detailInstrument]);

  // Filtrar instrumentos por categoría activa
  const categoryInstruments = useMemo(() => {
    if (tab === "todos") return instruments;
    return instruments.filter((item) => item.categoria === tab);
  }, [instruments, tab]);

  // Instrumentos seleccionados para el cajón de comparación
  const selectedInstruments = useMemo(() => {
    return instruments.filter((item) => selectedCompareIds.includes(item.id));
  }, [instruments, selectedCompareIds]);

  // Destacados editoriales rápidos (KPIs)
  const bestPf = useMemo(() => {
    const pfs = instruments.filter((i) => i.categoria === "pesos" && i.unidad === "TNA");
    return pfs.length > 0 ? pfs.reduce((max, i) => (i.tasaORendimientoActual > max.tasaORendimientoActual ? i : max)) : null;
  }, [instruments]);

  const btc = useMemo(() => {
    return instruments.find((i) => i.id === "crypto-bitcoin" || i.id === "crypto-btc");
  }, [instruments]);

  const topCedear = useMemo(() => {
    return instruments.find((i) => i.id === "cedears-spy" || i.id === "cedear-spy");
  }, [instruments]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      {/* Título de Sección Editorial */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">
            Pizarra Oficial Multiactivo
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tracking-tight mt-1">
            Mercados & Rendimientos
          </h1>
          <p className="text-sm text-finanzar-textSecondary mt-1">
            Comparativa transparente de alternativas para invertir y ahorrar en Argentina en tiempo real.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <Link
            to="/comparar"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-finanzar-surface border border-finanzar-border text-finanzar-primary hover:border-finanzar-accent font-medium shadow-xs transition-colors"
          >
            <span>❖ Ir al Comparador</span>
            {selectedCompareIds.length > 0 && (
              <span className="bg-finanzar-accent text-finanzar-surface px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {selectedCompareIds.length}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Tarjetas Resumen de Referencia (Prensa Financiera) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Mejor TNA Pesos */}
        {bestPf && (
          <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-4 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-medium text-finanzar-textSecondary block">
              Líder en Pesos (TNA)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-serif text-2xl font-bold text-finanzar-primary tabular-nums">
                {bestPf.tasaORendimientoActual.toFixed(2)}% TNA
              </span>
              <span className="text-xs text-finanzar-textSecondary truncate max-w-[120px]">
                {bestPf.entidadOFuente}
              </span>
            </div>
            <p className="text-[11px] text-finanzar-textMuted mt-1 truncate">{bestPf.nombre}</p>
          </div>
        )}

        {/* Cripto Referencia */}
        {btc && (
          <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-4 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-medium text-finanzar-textSecondary block">
              Bitcoin Referencia ARS
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-serif text-2xl font-bold text-finanzar-primary tabular-nums">
                $ {btc.tasaORendimientoActual.toLocaleString("es-AR")}
              </span>
              {btc.variacion24h !== undefined && (
                <span
                  className={`text-xs font-bold tabular-nums ${
                    btc.variacion24h >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"
                  }`}
                >
                  {btc.variacion24h >= 0 ? "↑" : "↓"} {Math.abs(btc.variacion24h).toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-finanzar-textMuted mt-1">CoinGecko Global / Liquidez AR</p>
          </div>
        )}

        {/* CEDEAR S&P 500 */}
        {topCedear && (
          <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-4 shadow-xs">
            <span className="text-[11px] uppercase tracking-wider font-medium text-finanzar-textSecondary block">
              Benchmark Global: CEDEAR S&P 500
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-serif text-2xl font-bold text-finanzar-primary tabular-nums">
                $ {topCedear.tasaORendimientoActual.toLocaleString("es-AR")}
              </span>
              {topCedear.variacion24h !== undefined && (
                <span
                  className={`text-xs font-bold tabular-nums ${
                    topCedear.variacion24h >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"
                  }`}
                >
                  {topCedear.variacion24h >= 0 ? "↑" : "↓"} {Math.abs(topCedear.variacion24h).toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-finanzar-textMuted mt-1">SPDR S&P 500 ETF (SPY) en pesos</p>
          </div>
        )}
      </div>

      {/* Selector de Categorías con conteos */}
      <CategoryTabs
        active={tab}
        onChange={(newTab) => {
          setTab(newTab);
          setDetailInstrument(null);
        }}
        counts={categoryCounts}
        total={instruments.length}
      />

      {/* Ficha Rápida Detallada si se selecciona en la tabla */}
      {detailInstrument && (
        <div className="mb-8 animate-fadeIn">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-textSecondary">
              Vista Rápida: {detailInstrument.nombre}
            </span>
            <div className="flex items-center space-x-3">
              <Link
                to={`/instrumento/${encodeURIComponent(detailInstrument.id)}`}
                className="text-xs text-finanzar-primary hover:text-finanzar-accent font-semibold underline"
              >
                Abrir ficha completa →
              </Link>
              <button
                onClick={() => setDetailInstrument(null)}
                className="text-xs text-finanzar-textSecondary hover:text-finanzar-negative font-medium"
              >
                ✕ Cerrar gráfico
              </button>
            </div>
          </div>
          <InstrumentChart
            titulo={detailInstrument.nombre}
            subtitulo={
              !quickHistory
                ? "Cargando histórico…"
                : quickHistory.isEstimate
                ? "Estimación — sin histórico oficial gratuito disponible"
                : `Histórico oficial — ${detailInstrument.entidadOFuente}`
            }
            valorActual={detailInstrument.tasaORendimientoActual}
            unidad={detailInstrument.unidad}
            variacion={detailInstrument.variacion24h}
            data={quickHistory?.data || detailInstrument.historico}
          />
        </div>
      )}

      {/* Tabla Principal de Instrumentos */}
      <InstrumentTable
        data={categoryInstruments}
        loading={loading && categoryInstruments.length === 0}
        selectedIds={selectedCompareIds}
        onToggleCompare={onToggleCompare}
        onSelectInstrument={(item) => setDetailInstrument(item)}
      />

      {/* Cajón de Comparación Flotante */}
      <CompareDrawer
        selectedInstruments={selectedInstruments}
        onRemove={onRemoveCompare}
        onClear={onClearCompare}
        onCompare={() => navigate("/comparar")}
      />
    </main>
  );
}

/* ============================================================
   PANTALLA 3: COMPARADOR MULTIACTIVO SUPERPUESTO
   ============================================================ */
function CompareScreen({
  instruments,
  selectedCompareIds,
  onToggleCompare,
  onClearCompare,
}: {
  instruments: Instrumento[];
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
}) {
  const navigate = useNavigate();
  useDocumentMeta(
    "Comparar Instrumentos",
    "Comparación lado a lado de instrumentos de inversión seleccionados, con gráfico normalizado a 30 días.",
    "/comparar"
  );

  // Instrumentos activos para comparar: únicamente los que el usuario eligió
  // a mano (sin benchmark ni preselección automática).
  const activeCompareInstruments = useMemo(() => {
    return instruments.filter((item) => selectedCompareIds.includes(item.id));
  }, [instruments, selectedCompareIds]);

  // Buscador para agregar instrumentos al comparador
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return instruments
      .filter(
        (i) =>
          !selectedCompareIds.includes(i.id) &&
          (i.nombre.toLowerCase().includes(q) ||
            i.entidadOFuente.toLowerCase().includes(q) ||
            i.categoria.toLowerCase().includes(q) ||
            (i.ticker && i.ticker.toLowerCase().includes(q)))
      )
      .slice(0, 8);
  }, [instruments, searchQuery, selectedCompareIds]);

  // Histórico real (data912 / CoinGecko) por instrumento activo en el comparador.
  // Cae a la estimación de cada instrumento si la fuente gratuita no tiene
  // serie histórica para esa categoría (ver lib/history.ts).
  const [historyMap, setHistoryMap] = useState<Record<string, PuntoHistorico[]>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      activeCompareInstruments.map((inst) =>
        fetchInstrumentHistory(inst).then((res) => [inst.id, res.data] as const)
      )
    ).then((entries) => {
      if (cancelled) return;
      setHistoryMap(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [activeCompareInstruments]);

  // El comparador se etiqueta como "Período 30 Días": se recorta cada serie
  // a los últimos 30 puntos para que la comparación sea real y consistente,
  // en vez de mezclar históricos de largos muy distintos entre instrumentos.
  const historyFor = (inst: Instrumento): PuntoHistorico[] =>
    sliceByRange(historyMap[inst.id] || inst.historico, "30d");

  // Generar datos normalizados base 0% (% de variación relativa en el período)
  const normalizedData = useMemo(() => {
    if (activeCompareInstruments.length === 0) return [];

    const dateSet = new Set<string>();
    activeCompareInstruments.forEach((inst) => {
      historyFor(inst).forEach((p) => dateSet.add(p.fecha));
    });
    const dates = Array.from(dateSet);

    return dates.map((date) => {
      const row: Record<string, any> = { fecha: date };

      activeCompareInstruments.forEach((inst) => {
        const hist = historyFor(inst);
        const basePoint = hist[0];
        const point = hist.find((p) => p.fecha === date) || basePoint;
        if (point && basePoint && basePoint.valor !== 0) {
          const pct = ((point.valor - basePoint.valor) / basePoint.valor) * 100;
          row[inst.id] = Number(pct.toFixed(2));
        } else {
          row[inst.id] = 0;
        }
      });

      return row;
    });
  }, [activeCompareInstruments, historyMap]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh]">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-finanzar-borderSubtle pb-6 mb-8">
        <div>
          <button
            onClick={() => navigate("/")}
            className="text-xs text-finanzar-textSecondary hover:text-finanzar-primary font-medium mb-2 flex items-center space-x-1"
          >
            <span>← Volver a Mercados</span>
          </button>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary">
            Comparador Multiactivo Superpuesto
          </h1>
          <p className="text-sm text-finanzar-textSecondary mt-1">
            Evolución porcentual normalizada (Base 0%) para comparar alternativas en igualdad de condiciones.
          </p>
        </div>

        {selectedCompareIds.length > 0 && (
          <button
            onClick={onClearCompare}
            className="text-xs text-finanzar-textSecondary hover:text-finanzar-negative underline self-start md:self-center"
          >
            Restablecer selección
          </button>
        )}
      </div>

      {/* Buscador para agregar instrumentos */}
      <div className="bg-finanzar-surface border border-finanzar-border rounded-md p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-finanzar-textSecondary mb-3">
          Agregar instrumentos a comparar (buscá por empresa, fondo, ticker o entidad; máx 6):
        </p>

        <div className="relative max-w-md mb-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ej: Apple, Banco Macro, GGAL, plazo fijo..."
            disabled={activeCompareInstruments.length >= 6}
            className="w-full pl-9 pr-4 py-2 bg-finanzar-bg border border-finanzar-border rounded text-sm text-finanzar-textMain placeholder-finanzar-textSecondary focus:outline-none focus:ring-1 focus:ring-finanzar-accent disabled:opacity-50"
          />
          <span className="absolute left-3 top-2.5 text-finanzar-textSecondary text-xs">🔍</span>

          {searchQuery.trim() && (
            <div className="absolute z-20 mt-1 w-full bg-finanzar-surface border border-finanzar-border rounded-md shadow-md overflow-hidden">
              {searchResults.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-finanzar-textSecondary">Sin resultados.</p>
              ) : (
                searchResults.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => {
                      onToggleCompare(inst.id);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-finanzar-surfaceHover flex items-center justify-between gap-2 border-b border-finanzar-borderSubtle last:border-b-0"
                  >
                    <span className="truncate">
                      <span className="font-medium text-finanzar-textMain">{inst.nombre}</span>
                      {inst.ticker && (
                        <span className="ml-2 font-mono text-[10px] text-finanzar-textSecondary">{inst.ticker}</span>
                      )}
                    </span>
                    <span className="text-finanzar-accent text-[11px] font-semibold flex-shrink-0">+ Agregar</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {activeCompareInstruments.length >= 6 && (
          <p className="text-[11px] text-finanzar-textSecondary mb-3">Alcanzaste el máximo de 6 instrumentos. Quitá uno para agregar otro.</p>
        )}

        {activeCompareInstruments.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeCompareInstruments.map((inst, index) => {
              const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
              return (
                <span
                  key={inst.id}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded text-xs font-semibold border bg-finanzar-bg border-finanzar-primary text-finanzar-primary"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate max-w-[160px]">{inst.nombre}</span>
                  <button
                    onClick={() => onToggleCompare(inst.id)}
                    className="text-finanzar-textSecondary hover:text-finanzar-negative"
                    aria-label={`Quitar ${inst.nombre} del comparador`}
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-finanzar-textSecondary">
            Todavía no agregaste ningún instrumento. Usá el buscador de arriba para empezar.
          </p>
        )}
      </div>

      {/* Gráfico Normalizado Recharts */}
      <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border p-6 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-finanzar-primary">
              Rendimiento Relativo Acumulado (%)
            </h2>
            <p className="text-xs text-finanzar-textSecondary">
              Base 0% en t₀ — Permite contrastar instrumentos con unidades dispares (TNA vs ARS vs USD).
            </p>
          </div>
          <span className="text-xs font-medium text-finanzar-textSecondary bg-finanzar-bg px-2.5 py-1 rounded border border-finanzar-borderSubtle">
            Período 30 Días
          </span>
        </div>

        {activeCompareInstruments.length === 0 ? (
          <div className="h-96 w-full flex items-center justify-center text-sm text-finanzar-textSecondary">
            Agregá al menos un instrumento arriba para ver el gráfico comparativo.
          </div>
        ) : (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData} margin={{ top: 20, right: 24, left: -10, bottom: 10 }}>
              <CartesianGrid stroke="#E8E2D5" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="fecha"
                tickLine={false}
                axisLine={{ stroke: "#DBD3C2" }}
                tick={{ fill: "#8B8478", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: "#DBD3C2" }}
                tick={{ fill: "#8B8478", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
                tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}%`}
                domain={["auto", "auto"]}
              />
              <ReferenceLine y={0} stroke="#8B8478" strokeWidth={1} strokeDasharray="2 2" />
              <Tooltip
                cursor={{ stroke: "#8B8478", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="bg-finanzar-surface border border-finanzar-border p-3.5 rounded-md shadow-md">
                      <p className="text-xs font-semibold text-finanzar-textSecondary mb-2 border-b border-finanzar-borderSubtle pb-1">
                        Corte temporal: {label}
                      </p>
                      <div className="space-y-1.5">
                        {payload.map((entry, idx) => {
                          const inst = activeCompareInstruments.find((i) => i.id === entry.dataKey);
                          const val = Number(entry.value);
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs space-x-4">
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-finanzar-textMain font-medium max-w-[160px] truncate">
                                  {inst?.nombre || entry.dataKey}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-semibold tabular-nums ${
                                  val >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"
                                }`}
                              >
                                {val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              {activeCompareInstruments.map((inst, index) => {
                const strokeColor = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
                return (
                  <Line
                    key={inst.id}
                    type="monotone"
                    dataKey={inst.id}
                    name={inst.nombre}
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      {/* Fichas Resumen Comparativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {activeCompareInstruments.map((inst, index) => {
          const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];

          const hist = historyFor(inst);
          const baseVal = hist[0]?.valor || inst.tasaORendimientoActual;
          const lastVal = hist[hist.length - 1]?.valor || inst.tasaORendimientoActual;
          const netChangePct = baseVal > 0 ? ((lastVal - baseVal) / baseVal) * 100 : 0;

          return (
            <div
              key={inst.id}
              className="bg-finanzar-surface border border-finanzar-border rounded-md p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs uppercase tracking-wider text-finanzar-textSecondary font-semibold">
                      {inst.categoria}
                    </span>
                  </div>
                  <Link
                    to={`/instrumento/${encodeURIComponent(inst.id)}`}
                    className="text-[11px] text-finanzar-primary hover:text-finanzar-accent underline font-medium"
                  >
                    Ver ficha ↗
                  </Link>
                </div>
                <h3 className="font-serif text-lg font-bold text-finanzar-textMain leading-snug">
                  {inst.nombre}
                </h3>
                <p className="text-xs text-finanzar-textSecondary mt-1">{inst.entidadOFuente}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-finanzar-borderSubtle flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-finanzar-textSecondary block uppercase font-medium">
                    Valor Actual
                  </span>
                  <span className="font-serif text-xl font-bold text-finanzar-primary tabular-nums">
                    {inst.unidad === "TNA"
                      ? `${inst.tasaORendimientoActual.toFixed(2)}%`
                      : inst.unidad === "precio_usd"
                      ? `US$ ${inst.tasaORendimientoActual.toLocaleString("es-AR")}`
                      : `$ ${inst.tasaORendimientoActual.toLocaleString("es-AR")}`}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-finanzar-textSecondary block uppercase font-medium">
                    Retorno Período
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tabular-nums border ${
                      netChangePct >= 0
                        ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                        : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                    }`}
                  >
                    <span>{netChangePct >= 0 ? "+" : ""}{netChangePct.toFixed(2)}%</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ============================================================
   APLICACIÓN PRINCIPAL (ROUTER + LAYOUT)
   ============================================================ */
export default function App() {
  const { instruments, categoryCounts, loading, isLive } = useInstruments();
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  const handleToggleCompare = (id: string) => {
    setSelectedCompareIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRemoveCompare = (id: string) => {
    setSelectedCompareIds((prev) => prev.filter((item) => item !== id));
  };

  const handleClearCompare = () => {
    setSelectedCompareIds([]);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-finanzar-bg text-finanzar-textMain font-sans">
        <Header isLive={isLive} />
        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  instruments={instruments}
                  categoryCounts={categoryCounts}
                  loading={loading}
                  selectedCompareIds={selectedCompareIds}
                  onToggleCompare={handleToggleCompare}
                  onRemoveCompare={handleRemoveCompare}
                  onClearCompare={handleClearCompare}
                />
              }
            />
            <Route
              path="/instrumento/:id"
              element={
                <InstrumentDetailScreen
                  instruments={instruments}
                  selectedCompareIds={selectedCompareIds}
                  onToggleCompare={handleToggleCompare}
                />
              }
            />
            <Route
              path="/comparar"
              element={
                <CompareScreen
                  instruments={instruments}
                  selectedCompareIds={selectedCompareIds}
                  onToggleCompare={handleToggleCompare}
                  onClearCompare={handleClearCompare}
                />
              }
            />
            <Route path="/portfolio" element={<PortfolioScreen />} />
            <Route path="/acerca" element={<AboutScreen />} />
            <Route path="/privacidad" element={<PrivacyPolicyScreen />} />
            <Route path="*" element={<NotFoundScreen />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}
