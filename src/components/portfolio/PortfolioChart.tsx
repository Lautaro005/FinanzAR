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
import { MonedaVista, PuntoPortfolio, RangoTemporal } from "../../types";
import { RANGE_POINTS } from "../../lib/dateRange";
import { formatFechaCorta, formatMoneda, hoyISO, sumarDias } from "../../lib/portfolio";

const RANGOS: { label: string; value: RangoTemporal }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1A", value: "1a" },
  { label: "MÁX", value: "max" },
];

interface PuntoSerie {
  fecha: string;
  label: string;
  valorTotal: number | null;
  capitalInvertido: number | null;
  /** true en los días previos al primer punto guardado (línea plana con el primer valor real). */
  estimado: boolean;
}

/**
 * Gráfico de evolución del portfolio (forward-only): el eje X cubre todo el
 * rango elegido (últimos 7/30/90/365 días) aunque todavía no haya puntos, y
 * la serie se construye día a día: desde que el usuario tenía algo cargado
 * hasta el primer punto guardado se dibuja una línea plana con ese primer
 * valor, y entre puntos guardados se arrastra el último valor conocido. Con
 * los días la línea plana se va convirtiendo en curva real.
 */
export default function PortfolioChart({
  historial,
  moneda = "ARS",
  dolar,
  fechaInicioTenencias,
}: {
  historial: PuntoPortfolio[];
  /** Moneda de visualización elegida en el toggle del portfolio. */
  moneda?: MonedaVista;
  /** Cotización USD→ARS usada para convertir la serie (guardada en ARS) cuando la vista es US$. */
  dolar?: number | null;
  /** Fecha más antigua en que el usuario tenía algo cargado (arranque de la línea plana). */
  fechaInicioTenencias?: string | null;
}) {
  const [rango, setRango] = useState<RangoTemporal>("30d");
  const [mostrarCapital, setMostrarCapital] = useState(true);

  const enUsd = moneda === "USD" && dolar != null && dolar > 0;
  const aVista = (v: number) => (enUsd ? v / (dolar as number) : v);
  const monedaMostrada: MonedaVista = enUsd ? "USD" : "ARS";

  const data = useMemo<PuntoSerie[]>(() => {
    const hoy = hoyISO();
    const dias = RANGE_POINTS[rango];
    const primerReal = historial[0]?.fecha ?? null;
    // Arranque de la serie: lo más antiguo entre el primer punto guardado y la primera tenencia cargada.
    const inicioSerie =
      primerReal && fechaInicioTenencias ? (fechaInicioTenencias < primerReal ? fechaInicioTenencias : primerReal) : primerReal ?? fechaInicioTenencias;
    let desde: string;
    if (dias !== null) desde = sumarDias(hoy, -(dias - 1));
    else desde = inicioSerie && inicioSerie < hoy ? inicioSerie : sumarDias(hoy, -6);
    // Para MÁX, si la serie arranca antes del rango mínimo, se muestra completa.
    if (dias === null && inicioSerie && inicioSerie < desde) desde = inicioSerie;
    // Tope de puntos dibujados para no romper el render (una vez por día).
    const puntos: PuntoSerie[] = [];
    let idx = 0; // índice del último punto guardado con fecha <= d
    for (let d = desde; d <= hoy; d = sumarDias(d, 1)) {
      while (idx < historial.length && historial[idx].fecha <= d) idx++;
      const ultimo = idx > 0 ? historial[idx - 1] : null;
      let valorTotal: number | null = null;
      let capital: number | null = null;
      let estimado = false;
      if (inicioSerie && d >= inicioSerie) {
        if (ultimo) {
          valorTotal = ultimo.valorTotal;
          capital = ultimo.capitalInvertido;
        } else if (historial.length > 0) {
          // Antes del primer punto guardado: línea plana con el primer valor real.
          valorTotal = historial[0].valorTotal;
          capital = historial[0].capitalInvertido;
          estimado = true;
        }
      }
      puntos.push({
        fecha: d,
        label: formatFechaCorta(d),
        valorTotal: valorTotal === null ? null : aVista(valorTotal),
        capitalInvertido: capital === null ? null : aVista(capital),
        estimado,
      });
      if (puntos.length > 800) break;
    }
    return puntos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historial, rango, fechaInicioTenencias, enUsd, dolar]);

  const hayLinea = historial.length > 0;

  const xAxisInterval = Math.max(0, Math.ceil(data.length / 8) - 1);
  const simbolo = monedaMostrada === "USD" ? "US$" : "$";
  /** Etiquetas del eje Y: compactas pero con decimales suficientes para distinguir valores cercanos. */
  const compacto = (v: number) => {
    const abs = Math.abs(v);
    const fmt = (n: number, dec: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: dec });
    if (abs >= 1_000_000) return `${simbolo}${fmt(v / 1_000_000, abs < 10_000_000 ? 2 : 1)}M`;
    if (abs >= 1_000) return `${simbolo}${fmt(v / 1_000, abs < 10_000 ? 2 : abs < 100_000 ? 1 : 0)}k`;
    return `${simbolo}${fmt(v, abs < 100 ? 1 : 0)}`;
  };

  return (
    <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-finanzar-borderSubtle pb-4 mb-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary">Evolución del portfolio ({monedaMostrada === "USD" ? "US$" : "ARS"})</h2>
          <p className="text-xs text-finanzar-textSecondary mt-0.5">
            Un punto por día desde que empezaste a usarlo; antes del primer punto se dibuja una línea plana.
            {historial.length > 0 && ` ${historial.length} ${historial.length === 1 ? "punto guardado" : "puntos guardados"}.`}
            {enUsd && " Convertido a US$ con la cotización de hoy."}
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
        {!hayLinea ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-center text-sm text-finanzar-textSecondary px-6">
            <p className="font-medium text-finanzar-textMain">Todavía no hay puntos guardados.</p>
            <p className="text-xs mt-1 max-w-md">
              El primer punto se guarda apenas el portfolio se pueda valuar con cotizaciones en vivo; desde ahí el gráfico
              muestra una línea que se va curvando día a día.
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
                  const p = payload[0].payload as PuntoSerie;
                  if (p.valorTotal === null || p.capitalInvertido === null) return null;
                  const dif = p.valorTotal - p.capitalInvertido;
                  return (
                    <div className="bg-finanzar-surface border border-finanzar-border p-3 rounded-md shadow-md text-xs min-w-[180px]">
                      <p className="text-finanzar-textSecondary font-medium mb-1.5">
                        {label}
                        {p.estimado && <span className="ml-1 text-finanzar-accent">· previo al primer punto</span>}
                      </p>
                      <div className="flex justify-between gap-4">
                        <span className="text-finanzar-textSecondary">Valor total</span>
                        <span className="font-mono font-semibold tabular-nums text-finanzar-primary">{formatMoneda(p.valorTotal, monedaMostrada, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-finanzar-textSecondary">Invertido</span>
                        <span className="font-mono tabular-nums text-finanzar-textMain">{formatMoneda(p.capitalInvertido, monedaMostrada, true)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-finanzar-borderSubtle mt-1 pt-1">
                        <span className="text-finanzar-textSecondary">Resultado</span>
                        <span className={`font-mono font-semibold tabular-nums ${dif >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                          {dif >= 0 ? "+" : ""}{formatMoneda(dif, monedaMostrada, true)}
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
                  connectNulls={false}
                  isAnimationActive={false}
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
                connectNulls={false}
                isAnimationActive={false}
                dot={data.filter((d) => d.valorTotal !== null).length === 1 ? { r: 4, fill: "#1B2A4A", strokeWidth: 0 } : false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "#C89B3C" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
