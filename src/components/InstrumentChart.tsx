import { useState } from "react";
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

interface InstrumentChartProps {
  data: PuntoHistorico[];
  titulo?: string;
  subtitulo?: string;
  valorActual?: number;
  unidad?: string;
  variacion?: number;
  activeRange?: RangoTemporal;
  onRangeChange?: (range: RangoTemporal) => void;
}

export default function InstrumentChart({
  data,
  titulo,
  subtitulo,
  valorActual,
  unidad = "%",
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

  // Filtrar o simular slice de datos según rango si hay datos
  const displayedData = data && data.length > 0 ? data : [
    { fecha: "01/08", valor: 36.5 },
    { fecha: "08/08", valor: 37.0 },
    { fecha: "15/08", valor: 37.2 },
    { fecha: "22/08", valor: 38.0 },
    { fecha: "30/08", valor: 38.5 },
  ];

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
                {unidad === "precio_ars"
                  ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(valorActual)
                  : unidad === "precio_usd"
                  ? `US$ ${valorActual.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                  : `${valorActual.toFixed(2)}% ${unidad}`}
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
                        {Number(payload[0].value).toFixed(2)} {unidad}
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

