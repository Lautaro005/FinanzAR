import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PuntoHistorico, RangoTemporal } from "../types";
import { sliceByRange } from "../lib/dateRange";

interface InstrumentChartProps {
  data: PuntoHistorico[];
  titulo?: string;
  subtitulo?: string;
  valorActual?: number;
  unidad?: "TNA" | "precio_ars" | "precio_usd";
  variacion?: number;
  activeRange?: RangoTemporal;
  onRangeChange?: (range: RangoTemporal) => void;
}

export default function InstrumentChart({
  data,
  titulo,
  subtitulo,
  valorActual,
  unidad = "TNA",
  variacion,
  activeRange = "30d",
  onRangeChange,
}: InstrumentChartProps) {
  const [selectedRange, setSelectedRange] = useState<RangoTemporal>(activeRange);

  const ranges: { label: string; value: RangoTemporal }[] = [
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "1A", value: "1a" },
    { label: "MÁX", value: "max" },
  ];

  const handleRangeClick = (r: RangoTemporal) => {
    setSelectedRange(r);
    onRangeChange?.(r);
  };

  const hasVariation = variacion !== undefined && variacion !== null;
  const isPositive = hasVariation && variacion! >= 0;

  // Formateo único para header y tooltip: evita que un `unidad` inesperado
  // (ej. un símbolo "$" pasado por error en vez del código interno) caiga
  // en un formato roto tipo "410425.00% $".
  const formatValue = (val: number): string => {
    if (unidad === "precio_ars") {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: val < 100 ? 2 : 0,
      }).format(val);
    }
    if (unidad === "precio_usd") {
      return `US$ ${val.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
    }
    return `${val.toFixed(2)}% TNA`;
  };

  const FALLBACK_DATA: PuntoHistorico[] = [
    { fecha: "01/08", valor: 36.5 },
    { fecha: "08/08", valor: 37.0 },
    { fecha: "15/08", valor: 37.2 },
    { fecha: "22/08", valor: 38.0 },
    { fecha: "30/08", valor: 38.5 },
  ];

  // Recorte real por rango: antes el selector 7D/30D/90D/1A/MÁX solo
  // cambiaba de estilo visualmente pero siempre graficaba la serie completa.
  const displayedData = useMemo(() => {
    const base = data && data.length > 0 ? data : FALLBACK_DATA;
    return sliceByRange(base, selectedRange);
  }, [data, selectedRange]);

  // Con series largas (histórico real de 90-365 puntos) no queremos un
  // tick por cada punto: se muestran ~8 etiquetas como máximo en el eje X.
  const xAxisInterval = Math.max(0, Math.ceil(displayedData.length / 8) - 1);

  return (
    <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border p-5 sm:p-6 shadow-sm mb-6">
      {/* Header del Gráfico con Métrica Destacada y Selector de Rango */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-finanzar-borderSubtle pb-5 mb-5">
        <div>
          {titulo && (
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-xl font-bold text-finanzar-primary">{titulo}</h3>
              {subtitulo && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-finanzar-bg text-finanzar-textSecondary border border-finanzar-borderSubtle">
                  {subtitulo}
                </span>
              )}
            </div>
          )}

          {valorActual !== undefined && (
            <div className="flex items-baseline space-x-3 mt-1.5">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tabular-nums tracking-tight">
                {formatValue(valorActual)}
              </span>

              {hasVariation && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums border ${
                    isPositive
                      ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                      : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                  }`}
                >
                  <span className="mr-0.5 font-bold">{isPositive ? "↑" : "↓"}</span>
                  <span>{Math.abs(variacion!).toFixed(2)}%</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selector de Rango Temporal */}
        <div className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md self-start md:self-center">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRangeClick(r.value)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-finanzar-accent ${
                selectedRange === r.value
                  ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-sm border border-finanzar-border"
                  : "text-finanzar-textSecondary hover:text-finanzar-textMain"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lienzo Recharts */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#E8E2D5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="fecha"
              tickLine={false}
              axisLine={{ stroke: "#DBD3C2" }}
              tick={{ fill: "#8B8478", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              interval={xAxisInterval}
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "#DBD3C2" }}
              tick={{ fill: "#8B8478", fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: "#8B8478", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-finanzar-surface border border-finanzar-border p-3 rounded-md shadow-md text-xs">
                      <p className="text-finanzar-textSecondary font-medium mb-1">{label}</p>
                      <p className="text-finanzar-primary font-serif text-base font-bold tabular-nums">
                        {formatValue(Number(payload[0].value))}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke="#1B2A4A"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "#C89B3C" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

