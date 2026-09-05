import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PuntoPortfolio, RangoTemporal } from "../../types";
import { RANGE_POINTS } from "../../lib/dateRange";
import { formatFechaCorta, formatMoneda } from "../../lib/portfolio";

const RANGOS: { label: string; value: RangoTemporal }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1A", value: "1a" },
  { label: "MÁX", value: "max" },
];

/**
 * Gráfico de evolución del portfolio (forward-only): solo muestra los puntos
 * que realmente se fueron guardando desde que el usuario empezó a usarlo.
 * Línea principal: valor total; secundaria: capital invertido.
 */
export default function PortfolioChart({ historial }: { historial: PuntoPortfolio[] }) {
  const [rango, setRango] = useState<RangoTemporal>("30d");
  const [mostrarCapital, setMostrarCapital] = useState(true);

  const data = useMemo(() => {
    const dias = RANGE_POINTS[rango];
    const recorte = dias === null || historial.length <= dias ? historial : historial.slice(-dias);
    return recorte.map((p) => ({ ...p, label: formatFechaCorta(p.fecha) }));
  }, [historial, rango]);

  const xAxisInterval = Math.max(0, Math.ceil(data.length / 8) - 1);
  const compacto = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${Math.round(v / 1_000)}k` : `$${v}`;

  return (
    <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-finanzar-borderSubtle pb-4 mb-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary">Evolución del portfolio (ARS)</h2>
          <p className="text-xs text-finanzar-textSecondary mt-0.5">
            Se guarda un punto por día desde que empezaste a usarlo — no se reconstruye el pasado.
            {historial.length > 0 && ` ${historial.length} ${historial.length === 1 ? "punto guardado" : "puntos guardados"}.`}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-center">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-finanzar-textSecondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarCapital}
              onChange={(e) => setMostrarCapital(e.target.checked)}
              className="accent-[#C89B3C]"
            />
            Capital invertido
          </label>
          <div className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md">
            {RANGOS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRango(r.value)}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-finanzar-accent ${
                  rango === r.value
                    ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-sm border border-finanzar-border"
                    : "text-finanzar-textSecondary hover:text-finanzar-textMain"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        {data.length < 2 ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-center text-sm text-finanzar-textSecondary px-6">
            <p className="font-medium text-finanzar-textMain">
              {data.length === 0 ? "Todavía no hay puntos guardados." : "Hay un solo punto guardado."}
            </p>
            <p className="text-xs mt-1 max-w-md">
              El gráfico arranca a mostrar una línea a partir del segundo día que entres a esta sección con datos
              cargados y cotizaciones en vivo. Cada operación también guarda el punto de hoy.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E8E2D5" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
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
                tickFormatter={compacto}
                domain={["auto", "auto"]}
                width={64}
              />
              <Tooltip
                cursor={{ stroke: "#8B8478", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[0].payload as PuntoPortfolio;
                  const dif = p.valorTotal - p.capitalInvertido;
                  return (
                    <div className="bg-finanzar-surface border border-finanzar-border p-3 rounded-md shadow-md text-xs min-w-[180px]">
                      <p className="text-finanzar-textSecondary font-medium mb-1.5">{label}</p>
                      <div className="flex justify-between gap-4">
                        <span className="text-finanzar-textSecondary">Valor total</span>
                        <span className="font-mono font-semibold tabular-nums text-finanzar-primary">{formatMoneda(p.valorTotal, "ARS", true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-finanzar-textSecondary">Invertido</span>
                        <span className="font-mono tabular-nums text-finanzar-textMain">{formatMoneda(p.capitalInvertido, "ARS", true)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-finanzar-borderSubtle mt-1 pt-1">
                        <span className="text-finanzar-textSecondary">Resultado</span>
                        <span className={`font-mono font-semibold tabular-nums ${dif >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                          {dif >= 0 ? "+" : ""}{formatMoneda(dif, "ARS", true)}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              {mostrarCapital && (
                <Line
                  type="stepAfter"
                  dataKey="capitalInvertido"
                  name="Capital invertido"
                  stroke="#C89B3C"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 3, strokeWidth: 0, fill: "#C89B3C" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="valorTotal"
                name="Valor total"
                stroke="#1B2A4A"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#C89B3C" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
