import { useMemo, useState } from "react";
import { FondoComun, Instrumento } from "../../types";
import { diasEntre, formatMoneda, FondoComunValuado, hoyISO } from "../../lib/portfolio";
import Modal, { BotonPrimario, BotonSecundario, Campo, inputClass, parseNum } from "./Modal";

type Modo = "alta" | "editar" | "rescate";

interface Props {
  modo: Modo;
  instruments: Instrumento[];
  /** Fondo a editar o rescatar. */
  fondo?: FondoComunValuado;
  /** Capital sugerido (ej. plazo fijo retirado que se reinvierte). */
  capitalInicial?: number;
  onSubmit: (fc: Omit<FondoComun, "id" | "estado" | "realizada" | "rescates">) => void;
  onRescate?: (monto: number) => void;
  onClose: () => void;
}

/**
 * Alta / edición / rescate de un FCI "por rendimiento": a diferencia del
 * plazo fijo no tiene vencimiento ni cuotapartes — el capital devenga la TNA
 * del fondo (en vivo desde Mercados, o fija si el usuario la conoce) hasta
 * que se rescata total o parcialmente.
 */
export default function FondoComunModal({ modo, instruments, fondo, capitalInicial, onSubmit, onRescate, onClose }: Props) {
  const fcis = useMemo(() => instruments.filter((i) => i.categoria === "fci"), [instruments]);

  const [instrumento, setInstrumento] = useState<Instrumento | null>(
    () => (fondo?.instrumentId ? fcis.find((i) => i.id === fondo.instrumentId) || null : null)
  );
  const [nombreManual, setNombreManual] = useState(fondo && !fondo.instrumentId ? fondo.fondo : "");
  const [busqueda, setBusqueda] = useState("");
  const [capital, setCapital] = useState(
    capitalInicial ? String(Number(capitalInicial.toFixed(2))) : fondo ? String(fondo.capital) : ""
  );
  const [fechaInicio, setFechaInicio] = useState(fondo?.fechaInicio || hoyISO());
  const [modoTna, setModoTna] = useState<"vivo" | "fija">(fondo && typeof fondo.tnaFija === "number" ? "fija" : "vivo");
  const [tnaFija, setTnaFija] = useState(fondo && typeof fondo.tnaFija === "number" ? String(fondo.tnaFija) : "");
  const [notas, setNotas] = useState(fondo?.notas || "");
  const [montoRescate, setMontoRescate] = useState("");

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return fcis.filter((i) => i.nombre.toLowerCase().includes(q) || i.entidadOFuente.toLowerCase().includes(q)).slice(0, 8);
  }, [fcis, busqueda]);

  /* ---------------- Rescate ---------------- */
  if (modo === "rescate" && fondo) {
    const montoNum = parseNum(montoRescate);
    const valido = montoNum > 0 && montoNum <= fondo.valorActual + 1e-6;
    const proporcion = valido ? Math.min(1, montoNum / fondo.valorActual) : 0;
    const capitalRetirado = fondo.capital * proporcion;
    const realizada = montoNum - capitalRetirado;
    return (
      <Modal
        titulo={`Rescatar ${fondo.fondo}`}
        subtitulo={`Valor actual estimado ${formatMoneda(fondo.valorActual)} (capital ${formatMoneda(fondo.capital)}${
          fondo.tnaUsada !== null ? ` · ${fondo.tnaUsada.toFixed(2)}% TNA` : ""
        })`}
        onClose={onClose}
      >
        <div className="space-y-4">
          <Campo label="Monto a rescatar (ARS)" hint="Podés rescatar una parte: el capital restante sigue devengando.">
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={montoRescate}
                onChange={(e) => setMontoRescate(e.target.value)}
                placeholder="0,00"
                className={inputClass}
              />
              <BotonSecundario onClick={() => setMontoRescate(String(Number(fondo.valorActual.toFixed(2))))}>Todo</BotonSecundario>
            </div>
          </Campo>
          <div className="rounded-md border border-finanzar-borderSubtle bg-finanzar-bg px-4 py-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-finanzar-textSecondary">Capital que deja de devengar</span>
              <span className="font-mono tabular-nums">{valido ? formatMoneda(capitalRetirado) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-finanzar-textSecondary">Resultado realizado</span>
              <span className={`font-mono tabular-nums font-semibold ${realizada >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"}`}>
                {valido ? formatMoneda(realizada) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-t border-finanzar-borderSubtle pt-1.5">
              <span className="text-finanzar-textSecondary">Capital que queda</span>
              <span className="font-mono tabular-nums">{valido ? formatMoneda(fondo.capital - capitalRetirado) : "—"}</span>
            </div>
            {montoNum > fondo.valorActual + 1e-6 && (
              <p className="text-finanzar-negative font-medium">No podés rescatar más que el valor actual.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
            <BotonPrimario disabled={!valido} tono="negative" onClick={() => onRescate?.(Number(montoNum.toFixed(2)))}>
              Confirmar rescate
            </BotonPrimario>
          </div>
        </div>
      </Modal>
    );
  }

  /* ---------------- Alta / edición ---------------- */
  const capitalNum = parseNum(capital);
  const tnaFijaNum = parseNum(tnaFija);
  const tnaVivo = instrumento?.tasaORendimientoActual ?? null;
  // Sin un fondo de Mercados elegido no hay rendimiento en vivo: se fuerza TNA fija.
  const modoEfectivo: "vivo" | "fija" = instrumento ? modoTna : "fija";
  const tnaUsada = modoEfectivo === "fija" ? (tnaFijaNum >= 0 ? tnaFijaNum : null) : tnaVivo;
  const nombre = instrumento ? instrumento.nombre : nombreManual.trim();
  const dias = fechaInicio ? Math.max(0, diasEntre(fechaInicio, hoyISO())) : 0;
  const devengadoHoy = capitalNum > 0 && tnaUsada !== null ? capitalNum * (tnaUsada / 100 / 365) * dias : 0;
  const valido = nombre.length > 0 && capitalNum > 0 && !!fechaInicio && (modoEfectivo === "vivo" ? !!instrumento : tnaFijaNum >= 0);

  return (
    <Modal
      titulo={modo === "alta" ? "Nuevo FCI" : "Editar FCI"}
      subtitulo="Sin cuotapartes ni vencimiento: el capital devenga el rendimiento del fondo hasta que lo rescates."
      onClose={onClose}
    >
      <div className="space-y-4">
        {!instrumento ? (
          <Campo label="Fondo" hint="Buscá entre los FCI de Mercados para usar su rendimiento en vivo, o escribí el nombre a mano y cargá una TNA fija.">
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={busqueda || nombreManual}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setNombreManual(e.target.value);
                }}
                placeholder="Ej: Fima Premium, Balanz Money Market…"
                className={inputClass}
              />
              {busqueda.trim() && resultados.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-finanzar-surface border border-finanzar-border rounded-md shadow-md overflow-hidden max-h-64 overflow-y-auto">
                  {resultados.map((inst) => (
                    <button
                      key={inst.id}
                      type="button"
                      onClick={() => {
                        setInstrumento(inst);
                        setBusqueda("");
                        setNombreManual("");
                        setModoTna("vivo");
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-finanzar-surfaceHover flex items-center justify-between gap-2 border-b border-finanzar-borderSubtle last:border-b-0"
                    >
                      <span className="truncate">
                        <span className="font-medium text-finanzar-textMain">{inst.nombre}</span>
                        <span className="ml-2 text-[10px] text-finanzar-textSecondary">{inst.entidadOFuente}</span>
                      </span>
                      <span className="font-mono text-[11px] text-finanzar-positive flex-shrink-0">{inst.tasaORendimientoActual.toFixed(2)}% TNA</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Campo>
        ) : (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-finanzar-borderSubtle bg-finanzar-bg">
            <div className="min-w-0">
              <p className="text-sm font-medium text-finanzar-textMain truncate">{instrumento.nombre}</p>
              <p className="text-[11px] text-finanzar-textSecondary">
                {instrumento.entidadOFuente} · {instrumento.tasaORendimientoActual.toFixed(2)}% TNA en vivo
              </p>
            </div>
            <BotonSecundario onClick={() => setInstrumento(null)}>Cambiar</BotonSecundario>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Capital suscripto (ARS)">
            <input type="text" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0,00" className={inputClass} />
          </Campo>
          <Campo label="Fecha de suscripción" hint="Editable: podés cargar una suscripción pasada.">
            <input type="date" value={fechaInicio} max={hoyISO()} onChange={(e) => setFechaInicio(e.target.value)} className={inputClass} />
          </Campo>
        </div>

        <div>
          <span className="block text-[11px] uppercase tracking-wider font-semibold text-finanzar-textSecondary mb-1">Rendimiento</span>
          <div className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md mb-2">
            {(["vivo", "fija"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModoTna(m)}
                disabled={m === "vivo" && !instrumento}
                className={`px-3 py-1 text-xs font-medium rounded-sm transition-all disabled:opacity-40 ${
                  modoEfectivo === m
                    ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-sm border border-finanzar-border"
                    : "text-finanzar-textSecondary hover:text-finanzar-textMain"
                }`}
              >
                {m === "vivo" ? "En vivo (Mercados)" : "TNA fija"}
              </button>
            ))}
          </div>
          {modoEfectivo === "fija" ? (
            <input type="text" inputMode="decimal" value={tnaFija} onChange={(e) => setTnaFija(e.target.value)} placeholder="Ej: 32,5" className={inputClass} />
          ) : (
            <p className="text-[11px] text-finanzar-textMuted">
              {instrumento
                ? "Se usa el rendimiento anualizado que FinanzAR calcula para este fondo cada vez que se actualiza (varía día a día)."
                : "Elegí un fondo de Mercados para usar su rendimiento en vivo."}
            </p>
          )}
        </div>

        <Campo label="Notas (opcional)">
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: broker, cuenta…" className={inputClass} />
        </Campo>

        <div className="rounded-md border border-finanzar-borderSubtle bg-finanzar-bg px-4 py-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">TNA a usar</span>
            <span className="font-mono tabular-nums">{tnaUsada !== null ? `${tnaUsada.toFixed(2)}%` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">Devengado estimado a hoy ({dias} d)</span>
            <span className="font-mono tabular-nums text-finanzar-positive font-semibold">{devengadoHoy > 0 ? `+${formatMoneda(devengadoHoy)}` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">Valor estimado hoy</span>
            <span className="font-mono tabular-nums font-semibold">{capitalNum > 0 ? formatMoneda(capitalNum + devengadoHoy) : "—"}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario
            disabled={!valido}
            onClick={() =>
              onSubmit({
                instrumentId: instrumento?.id,
                fondo: nombre,
                capital: Number(capitalNum.toFixed(2)),
                fechaInicio,
                tnaFija: modoEfectivo === "fija" ? Number(tnaFijaNum.toFixed(4)) : undefined,
                ultimaTna: instrumento?.tasaORendimientoActual,
                notas: notas.trim() || undefined,
              })
            }
          >
            {modo === "alta" ? "Suscribir" : "Guardar cambios"}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  );
}
