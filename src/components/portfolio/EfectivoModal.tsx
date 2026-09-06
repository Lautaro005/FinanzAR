import { useState } from "react";
import { formatMoneda, hoyISO } from "../../lib/portfolio";
import Modal, { BotonPrimario, BotonSecundario, Campo, inputClass, parseNum } from "./Modal";

type Modo = "ingreso" | "retiro";

interface Props {
  /** Con qué pestaña abre el modal (el usuario puede cambiarla adentro). */
  modoInicial?: Modo;
  /** Saldo de efectivo disponible hoy, para no dejar retirar de más. */
  saldoDisponible: number;
  onSubmit: (mov: { tipo: Modo; monto: number; fecha: string; notas?: string }) => void;
  onClose: () => void;
}

/**
 * Alta de un ingreso o retiro de Efectivo: dinero dentro del portfolio que
 * no está invertido en ningún instrumento (lo que el usuario carga a mano, o
 * lo que queda tras rescatar un FCI o retirar un plazo fijo). Un retiro baja
 * el valor total del portfolio; un ingreso lo sube, sin generar resultado.
 */
export default function EfectivoModal({ modoInicial = "ingreso", saldoDisponible, onSubmit, onClose }: Props) {
  const [tipo, setTipo] = useState<Modo>(modoInicial);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [notas, setNotas] = useState("");

  const montoNum = parseNum(monto);
  const excedeSaldo = tipo === "retiro" && montoNum > saldoDisponible + 0.01;
  const valido = montoNum > 0 && !!fecha && !excedeSaldo;

  return (
    <Modal
      titulo={tipo === "ingreso" ? "Agregar efectivo" : "Retirar efectivo"}
      subtitulo="Dinero dentro de tu portfolio que no está invertido en ningún instrumento."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Tipo de movimiento" className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md">
          {(["ingreso", "retiro"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              onClick={() => setTipo(t)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-finanzar-accent ${
                tipo === t
                  ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-sm border border-finanzar-border"
                  : "text-finanzar-textSecondary hover:text-finanzar-textMain"
              }`}
            >
              {t === "ingreso" ? "Ingreso" : "Retiro"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Monto (ARS)">
            <input
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0,00"
              className={inputClass}
              autoFocus
            />
          </Campo>
          <Campo label="Fecha">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
          </Campo>
        </div>

        <Campo label="Notas (opcional)">
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder={tipo === "ingreso" ? "Ej: transferencia desde el banco…" : "Ej: transferencia a mi cuenta…"}
            className={inputClass}
          />
        </Campo>

        <div className="rounded-md border border-finanzar-borderSubtle bg-finanzar-bg px-4 py-3 text-xs flex justify-between">
          <span className="text-finanzar-textSecondary">Efectivo disponible hoy</span>
          <span className="font-mono tabular-nums font-semibold text-finanzar-primary">{formatMoneda(saldoDisponible)}</span>
        </div>
        {excedeSaldo && (
          <p className="text-xs text-finanzar-negative">No podés retirar más de lo disponible ({formatMoneda(saldoDisponible)}).</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario
            disabled={!valido}
            onClick={() => onSubmit({ tipo, monto: Number(montoNum.toFixed(2)), fecha, notas: notas.trim() || undefined })}
          >
            {tipo === "ingreso" ? "Agregar" : "Retirar"}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  );
}
