import { useMemo, useState } from "react";
import { Instrumento, PlazoFijo } from "../../types";
import { diasEntre, formatMoneda, hoyISO, sumarDias } from "../../lib/portfolio";
import Modal, { BotonPrimario, BotonSecundario, Campo, inputClass, parseNum } from "./Modal";

type Modo = "alta" | "renovar" | "editar";

interface Props {
  modo: Modo;
  instruments: Instrumento[];
  /** PF base: el que se renueva (modo "renovar") o se edita (modo "editar"). */
  plazoFijo?: PlazoFijo;
  /** Capital sugerido (ej. valor final del PF que se renueva). */
  capitalInicial?: number;
  onSubmit: (pf: Omit<PlazoFijo, "id" | "estado">) => void;
  onClose: () => void;
}

export default function PlazoFijoModal({ modo, instruments, plazoFijo, capitalInicial, onSubmit, onClose }: Props) {
  // Entidades con TNA vigente hoy (categoría "pesos"), para prellenar.
  const entidades = useMemo(() => {
    const map = new Map<string, Instrumento>();
    instruments
      .filter((i) => i.categoria === "pesos" && i.unidad === "TNA")
      .forEach((i) => {
        const key = i.entidadOFuente || i.nombre;
        const prev = map.get(key);
        if (!prev || i.tasaORendimientoActual > prev.tasaORendimientoActual) map.set(key, i);
      });
    return Array.from(map.values()).sort((a, b) => a.entidadOFuente.localeCompare(b.entidadOFuente));
  }, [instruments]);

  const base = plazoFijo;
  const [entidad, setEntidad] = useState(base?.entidad || "");
  const [capital, setCapital] = useState(
    capitalInicial ? String(Number(capitalInicial.toFixed(2))) : base && modo === "editar" ? String(base.capital) : ""
  );
  const [tna, setTna] = useState(base ? String(base.tna) : "");
  const [fechaInicio, setFechaInicio] = useState(
    modo === "editar" && base ? base.fechaInicio : modo === "renovar" && base ? base.fechaVencimiento : hoyISO()
  );
  const [plazoDias, setPlazoDias] = useState(
    base ? String(Math.max(1, diasEntre(base.fechaInicio, base.fechaVencimiento))) : "30"
  );
  const [notas, setNotas] = useState(base?.notas || "");

  const capitalNum = parseNum(capital);
  const tnaNum = parseNum(tna);
  const diasNum = Math.floor(parseNum(plazoDias));
  const fechaVencimiento = fechaInicio && diasNum > 0 ? sumarDias(fechaInicio, diasNum) : "";

  const interes = capitalNum > 0 && tnaNum >= 0 && diasNum > 0 ? capitalNum * (tnaNum / 100 / 365) * diasNum : 0;
  const valido = entidad.trim().length > 0 && capitalNum > 0 && tnaNum >= 0 && diasNum > 0 && !!fechaInicio;

  const elegirEntidad = (nombre: string) => {
    setEntidad(nombre);
    const inst = entidades.find((e) => (e.entidadOFuente || e.nombre) === nombre);
    if (inst && modo !== "editar") setTna(String(inst.tasaORendimientoActual));
  };

  const titulo = modo === "alta" ? "Nuevo plazo fijo" : modo === "renovar" ? "Renovar plazo fijo" : "Editar plazo fijo";

  return (
    <Modal
      titulo={titulo}
      subtitulo={
        modo === "renovar"
          ? `El capital sugerido es el valor final del plazo fijo vencido (${formatMoneda(capitalInicial || 0)}). Podés cambiar entidad y tasa.`
          : "Elegí una entidad para tomar su TNA vigente, o cargá a mano la tasa que te pactaron."
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <Campo label="Entidad (banco / fintech)">
          <input
            list="finanzar-entidades-pf"
            type="text"
            value={entidad}
            onChange={(e) => elegirEntidad(e.target.value)}
            placeholder="Ej: Banco Nación, Mercado Pago…"
            className={inputClass}
            autoFocus={modo !== "renovar"}
          />
          <datalist id="finanzar-entidades-pf">
            {entidades.map((e) => (
              <option key={e.id} value={e.entidadOFuente || e.nombre}>
                {`${e.tasaORendimientoActual.toFixed(2)}% TNA`}
              </option>
            ))}
          </datalist>
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Capital (ARS)">
            <input
              type="text"
              inputMode="decimal"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="0,00"
              className={inputClass}
            />
          </Campo>
          <Campo label="TNA (%)" hint="Tasa fija pactada al constituirlo.">
            <input
              type="text"
              inputMode="decimal"
              value={tna}
              onChange={(e) => setTna(e.target.value)}
              placeholder="Ej: 35,5"
              className={inputClass}
            />
          </Campo>
          <Campo label="Fecha de inicio">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className={inputClass} />
          </Campo>
          <Campo label="Plazo (días)" hint={fechaVencimiento ? `Vence el ${fechaVencimiento.split("-").reverse().join("/")}` : undefined}>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={plazoDias}
                onChange={(e) => setPlazoDias(e.target.value)}
                className={inputClass}
              />
              {[30, 60, 90].map((d) => (
                <BotonSecundario key={d} onClick={() => setPlazoDias(String(d))}>
                  {d}
                </BotonSecundario>
              ))}
            </div>
          </Campo>
        </div>

        <Campo label="Notas (opcional)">
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: renovación automática, cuenta…"
            className={inputClass}
          />
        </Campo>

        <div className="rounded-md border border-finanzar-borderSubtle bg-finanzar-bg px-4 py-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">Interés al vencimiento</span>
            <span className="font-mono tabular-nums text-finanzar-positive font-semibold">
              {interes > 0 ? `+${formatMoneda(interes)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">Valor final</span>
            <span className="font-mono tabular-nums text-finanzar-textMain font-semibold">
              {capitalNum > 0 ? formatMoneda(capitalNum + interes) : "—"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario
            disabled={!valido}
            onClick={() =>
              onSubmit({
                entidad: entidad.trim(),
                capital: Number(capitalNum.toFixed(2)),
                tna: Number(tnaNum.toFixed(4)),
                fechaInicio,
                fechaVencimiento,
                notas: notas.trim() || undefined,
              })
            }
          >
            {modo === "alta" ? "Constituir" : modo === "renovar" ? "Renovar" : "Guardar cambios"}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  );
}
