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
  /** true en los días previos al primer punto guardado (línea plana o reconstrucción con el primer valor real). */
  estimado: boolean;
}

/**
 * Calcula los ticks y el dominio superior del eje Y con números redondos e intervalos limpios.
 * - En ARS:
 *   - Para montos bajos (hasta ~$25k) usa pasos limpios de a 5k (ej: $0, $5k, $10k).
 *   - A medida que crece el capital escala progresivamente a 10k, 20k, 25k, 50k, 100k, 200k, 250k, 500k, 1M, etc.
 * - En USD:
 *   - Pasos limpios de a 10, 20, 25, 50, 100, 200, 250, 500, 1k, etc.
 */
function calcularEscalaEjeY(maxVal: number, moneda: MonedaVista): { ticks: number[]; domain: [number, number] } {
  const stepsARS = [
    5_000,
    10_000,
    20_000,
    25_000,
    50_000,
    100_000,
    200_000,
    250_000,
    500_000,
    1_000_000,
    2_000_000,
    2_500_000,
    5_000_000,
    10_000_000,
    20_000_000,
    25_000_000,
    50_000_000,
    100_000_000,
  ];

  const stepsUSD = [
    10,
    20,
    25,
    50,
    100,
    200,
    250,
    500,
    1_000,
    2_000,
    2_500,
    5_000,
    10_000,
    20_000,
    25_000,
    50_000,
    100_000,
  ];

  const steps = moneda === "USD" ? stepsUSD : stepsARS;
  const baseMinStep = steps[0];

  if (!Number.isFinite(maxVal) || maxVal <= 0) {
    const defaultTop = baseMinStep * 2;
    return {
      ticks: [0, baseMinStep, defaultTop],
      domain: [0, defaultTop],
    };
  }

  // Buscamos un step que produzca entre 2 y 5 intervalos (3 a 6 ticks en pantalla)
  let chosenStep = steps[steps.length - 1];
  for (const s of steps) {
    const intervals = Math.ceil(maxVal / s);
    if (intervals <= 5) {
      chosenStep = s;
      break;
    }
  }

  // Si maxVal supera el límite de los steps fijos, calcular potencia de 10
  if (maxVal / chosenStep > 5) {
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const ratio = maxVal / magnitude;
    if (ratio <= 2) chosenStep = magnitude * 0.5;
    else if (ratio <= 5) chosenStep = magnitude;
    else chosenStep = magnitude * 2;
  }

  let top = Math.ceil(maxVal / chosenStep) * chosenStep;
  // Asegurar al menos 2 intervalos para que el gráfico respire si top === chosenStep
  if (top === chosenStep) {
    top = chosenStep * 2;
  }

  const ticks: number[] = [];
  for (let v = 0; v <= top; v += chosenStep) {
    ticks.push(v);
  }

  return {
    ticks,
    domain: [0, top],
  };
}

/**
 * Gráfico de evolución del portfolio (forward-only): el eje X cubre todo el
 * rango elegido (últimos 7/30/90/365 días) aunque todavía no haya puntos, y
 * la serie se construye día a día. Cuando se añade un nuevo activo, la serie
 * parte desde 0 y sube hasta el capital invertido. Al retirar efectivo o vender,
 * la curva refleja la baja correspondiente.
 */
export default function PortfolioChart({
  historial,
  moneda = "ARS",
  dolar,
  fechaInicioTenencias,
  calcularRetroactivo,
}: {
  historial: PuntoPortfolio[];
  /** Moneda de visualización elegida en el toggle del portfolio. */
  moneda?: MonedaVista;
  /** Cotización USD→ARS usada para convertir la serie (guardada en ARS) cuando la vista es US$. */
  dolar?: number | null;
  /** Fecha más antigua en que el usuario tenía algo cargado (arranque de la reconstrucción retroactiva). */
  fechaInicioTenencias?: string | null;
  /**
   * Reconstruye el valor del portfolio en un día anterior al primer punto
   * guardado (devengo real de PF/FCI + precio histórico de cada posición),
   * para que ese tramo muestre la ganancia/pérdida real en vez de una línea
   * plana. Si falta o devuelve null para un día puntual, ese día cae de
   * vuelta a la línea plana con el primer valor real guardado.
   */
  calcularRetroactivo?: (fecha: string) => { valorTotal: number; capitalInvertido: number } | null;
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

    // Día cero: día anterior al arranque para que la línea inicie desde cero y suba a lo invertido
    const diaCero = inicioSerie ? sumarDias(inicioSerie, -1) : null;

    let desde: string;
    if (dias !== null) {
      desde = sumarDias(hoy, -(dias - 1));
    } else {
      desde = diaCero && diaCero < hoy ? diaCero : sumarDias(hoy, -6);
    }
    // Para MÁX, si la serie arranca antes del rango mínimo, se muestra completa desde diaCero
    if (dias === null && diaCero && diaCero < desde) desde = diaCero;

    // Tope de puntos dibujados para no romper el render (una vez por día).
    const puntos: PuntoSerie[] = [];
    let idx = 0; // índice del último punto guardado con fecha <= d
    for (let d = desde; d <= hoy; d = sumarDias(d, 1)) {
      while (idx < historial.length && historial[idx].fecha <= d) idx++;
      const ultimo = idx > 0 ? historial[idx - 1] : null;
      let valorTotal: number | null = null;
      let capital: number | null = null;
      let estimado = false;

      if (diaCero && d === diaCero) {
        // Al añadir un nuevo activo, la curva nace en 0 y sube a lo que invirtió
        valorTotal = 0;
        capital = 0;
        estimado = false;
      } else if (inicioSerie && d >= inicioSerie) {
        if (ultimo) {
          valorTotal = ultimo.valorTotal;
          capital = ultimo.capitalInvertido;
        } else {
          // Antes del primer punto guardado: reconstruir el día con devengo real de
          // PF/FCI y precio histórico de cada posición (ver calcularTotalesEnFecha).
          const retro = calcularRetroactivo ? calcularRetroactivo(d) : null;
          if (retro) {
            valorTotal = retro.valorTotal;
            capital = retro.capitalInvertido;
            estimado = true;
          } else if (historial.length > 0) {
            // Sin forma de reconstruir ese día puntual: línea plana con el primer valor real.
            valorTotal = historial[0].valorTotal;
            capital = historial[0].capitalInvertido;
            estimado = true;
          }
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
  }, [historial, rango, fechaInicioTenencias, enUsd, dolar, calcularRetroactivo]);

  const hayLinea = data.some((d) => d.valorTotal !== null);

  const xAxisInterval = Math.max(0, Math.ceil(data.length / 8) - 1);
  const simbolo = monedaMostrada === "USD" ? "US$" : "$";

  const maxValorCalculado = useMemo(() => {
    let max = 0;
    for (const p of data) {
      if (p.valorTotal !== null && p.valorTotal > max) max = p.valorTotal;
      if (mostrarCapital && p.capitalInvertido !== null && p.capitalInvertido > max) {
        max = p.capitalInvertido;
      }
    }
    return max;
  }, [data, mostrarCapital]);

  const { ticks: yTicks, domain: yDomain } = useMemo(() => {
    return calcularEscalaEjeY(maxValorCalculado, monedaMostrada);
  }, [maxValorCalculado, monedaMostrada]);

  /**
   * Etiquetas del eje Y: números enteros redondos estrictos sin decimales ni comas
   * (ejemplo: $0, $5k, $10k, $25k, $1M, US$50, US$1k).
   */
  const compacto = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000 && v % 1_000_000 === 0) {
      const m = Math.round(v / 1_000_000);
      return `${simbolo}${m.toLocaleString("es-AR")}M`;
    }
    if (abs >= 1_000) {
      const k = Math.round(v / 1_000);
      return `${simbolo}${k.toLocaleString("es-AR")}k`;
    }
    return `${simbolo}${Math.round(v).toLocaleString("es-AR")}`;
  };

  return (
    <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-finanzar-borderSubtle pb-4 mb-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary">Evolución del portfolio ({monedaMostrada === "USD" ? "US$" : "ARS"})</h2>
          <p className="text-xs text-finanzar-textSecondary mt-0.5">
            Un punto por día desde que empezaste a usarlo; antes del primer punto se reconstruye con el devengo y los
            precios de esos días.
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
              className="w-3.5 h-3.5 rounded-xs border-finanzar-border text-finanzar-primary focus:ring-finanzar-accent accent-finanzar-primary cursor-pointer"
            />
            <span>Capital invertido</span>
          </label>
          <div className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md space-x-1">
            {RANGOS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRango(r.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-xs transition-colors ${
                  rango === r.value
                    ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-xs border border-finanzar-border"
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
        {!hayLinea ? (          <div className="h-full w-full flex flex-col items-center justify-center text-center text-sm text-finanzar-textSecondary px-6">
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
                ticks={yTicks}
                domain={yDomain}
                allowDecimals={false}
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
                        {p.estimado && <span className="ml-1 text-finanzar-accent">· estimado</span>}
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
