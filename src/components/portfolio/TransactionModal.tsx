import { useEffect, useMemo, useState } from "react";
import { Instrumento, Transaccion } from "../../types";
import {
  formatCantidad,
  formatMoneda,
  formatPrecio,
  hoyISO,
  monedaDe,
  Posicion,
} from "../../lib/portfolio";
import Modal, { BotonPrimario, BotonSecundario, Campo, inputClass, parseNum } from "./Modal";

type Modo = "compra" | "venta" | "editar";

interface Props {
  modo: Modo;
  instruments: Instrumento[];
  /** Posición sobre la que se vende (modo "venta"). */
  posicion?: Posicion;
  /** Transacción a editar (modo "editar"). */
  transaccion?: Transaccion;
  /** Monto sugerido para precargar (ej. capital de un plazo fijo retirado que se reinvierte). */
  montoInicial?: number;
  onSubmit: (tx: Omit<Transaccion, "id"> & { id?: string }) => void;
  onClose: () => void;
}

const CATEGORIA_LABEL: Record<string, string> = {
  fci: "FCI",
  cripto: "Cripto",
  cedears: "CEDEAR",
  acciones: "Acción",
  bonos: "Bono",
  eeuu: "EE.UU.",
  divisas: "Divisa",
  pesos: "Pesos",
};

export default function TransactionModal({
  modo,
  instruments,
  posicion,
  transaccion,
  montoInicial,
  onSubmit,
  onClose,
}: Props) {
  // Instrumento elegido: fijo en venta/edición, buscable en compra.
  const [instrumento, setInstrumento] = useState<Instrumento | null>(() => {
    if (posicion?.instrumento) return posicion.instrumento;
    if (transaccion) return instruments.find((i) => i.id === transaccion.instrumentId) || null;
    return null;
  });
  const [busqueda, setBusqueda] = useState("");

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return instruments
      .filter(
        (i) =>
          i.categoria !== "pesos" && // los plazos fijos tienen su propio flujo
          i.categoria !== "fci" && // los FCI se cargan por rendimiento desde "+ FCI"
          (i.nombre.toLowerCase().includes(q) ||
            i.entidadOFuente.toLowerCase().includes(q) ||
            i.categoria.toLowerCase().includes(q) ||
            (i.ticker && i.ticker.toLowerCase().includes(q)))
      )
      .slice(0, 8);
  }, [instruments, busqueda]);

  const tipo: Transaccion["tipo"] = modo === "venta" ? "venta" : transaccion?.tipo || "compra";
  const unidad = instrumento?.unidad || posicion?.unidad || transaccion?.unidad || "precio_ars";
  const esTna = unidad === "TNA";
  const moneda = monedaDe(unidad);
  const categoria = instrumento?.categoria || posicion?.categoria || transaccion?.categoria || "cedears";

  // Precio de referencia en vivo: para instrumentos con TNA no hay precio de
  // mercado en la app, así que se sugiere 1 (cantidad = monto en pesos).
  const precioVivo = instrumento ? (esTna ? 1 : instrumento.tasaORendimientoActual) : null;

  const [modoMonto, setModoMonto] = useState<"monto" | "cantidad">(montoInicial ? "monto" : "cantidad");
  const [precio, setPrecio] = useState<string>(transaccion ? String(transaccion.precioUnitario) : "");
  const [cantidad, setCantidad] = useState<string>(transaccion ? String(transaccion.cantidad) : "");
  const [monto, setMonto] = useState<string>(montoInicial ? String(montoInicial) : "");
  const [fecha, setFecha] = useState<string>(transaccion?.fecha || hoyISO());
  const [notas, setNotas] = useState<string>(transaccion?.notas || "");
  const [precioTocado, setPrecioTocado] = useState(!!transaccion);

  // Autocompletar el precio con el valor en vivo al elegir instrumento (editable).
  useEffect(() => {
    if (precioTocado || precioVivo === null) return;
    setPrecio(String(precioVivo));
  }, [precioVivo, precioTocado]);

  const precioNum = parseNum(precio);
  const cantidadNum = modoMonto === "cantidad" ? parseNum(cantidad) : precioNum > 0 ? parseNum(monto) / precioNum : NaN;
  const montoNum = modoMonto === "monto" ? parseNum(monto) : cantidadNum * precioNum;

  const maxVenta = posicion?.cantidad ?? Infinity;
  const excedeMax = tipo === "venta" && cantidadNum > maxVenta + 1e-9;

  const valido =
    !!instrumento || modo !== "compra"
      ? precioNum > 0 && cantidadNum > 0 && !!fecha && !excedeMax
      : false;

  // Preview de resultado realizado al vender (costo promedio ponderado).
  const realizadaPreview =
    tipo === "venta" && posicion && cantidadNum > 0 && precioNum > 0
      ? (precioNum - posicion.precioPromedio) * Math.min(cantidadNum, maxVenta)
      : null;

  const titulo =
    modo === "compra" ? "Agregar compra" : modo === "venta" ? `Vender ${posicion?.nombre || ""}` : "Editar movimiento";

  const handleSubmit = () => {
    if (!valido) return;
    const base = instrumento;
    onSubmit({
      id: transaccion?.id,
      instrumentId: base?.id || posicion?.instrumentId || transaccion!.instrumentId,
      tipo,
      fecha,
      cantidad: Number(cantidadNum.toFixed(10)),
      precioUnitario: Number(precioNum.toFixed(8)),
      notas: notas.trim() || undefined,
      instrumentoNombre: base?.nombre || posicion?.nombre || transaccion!.instrumentoNombre,
      categoria: base?.categoria || posicion?.categoria || transaccion!.categoria,
      unidad,
      ticker: base?.ticker || posicion?.ticker || transaccion?.ticker,
    });
  };

  return (
    <Modal
      titulo={titulo}
      subtitulo={
        modo === "venta"
          ? `Tenés ${formatCantidad(maxVenta, categoria)} — precio promedio ${formatPrecio(posicion?.precioPromedio || 0, moneda)}`
          : "El precio se sugiere con el valor en vivo, pero cargá el que realmente pagaste."
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Instrumento */}
        {modo === "compra" && !instrumento ? (
          <Campo label="Instrumento" hint="Buscá por empresa, ticker o moneda. Plazos fijos y FCI se cargan desde sus propios botones.">
            <div className="relative">
              <input
                autoFocus
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej: Apple, Bitcoin, GGAL, AL30, SPY…"
                className={inputClass}
              />
              {busqueda.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-finanzar-surface border border-finanzar-border rounded-md shadow-md overflow-hidden max-h-64 overflow-y-auto">
                  {resultados.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-finanzar-textSecondary">Sin resultados.</p>
                  ) : (
                    resultados.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => {
                          setInstrumento(inst);
                          setBusqueda("");
                          setPrecioTocado(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-finanzar-surfaceHover flex items-center justify-between gap-2 border-b border-finanzar-borderSubtle last:border-b-0"
                      >
                        <span className="truncate">
                          <span className="font-medium text-finanzar-textMain">{inst.nombre}</span>
                          {inst.ticker && (
                            <span className="ml-2 font-mono text-[10px] text-finanzar-textSecondary">{inst.ticker}</span>
                          )}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-finanzar-textSecondary flex-shrink-0">
                          {CATEGORIA_LABEL[inst.categoria] || inst.categoria}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Campo>
        ) : (
          <div className="flex items-center justify-between gap-3 px-3 py-2 rounded border border-finanzar-borderSubtle bg-finanzar-bg">
            <div className="min-w-0">
              <p className="text-sm font-medium text-finanzar-textMain truncate">
                {instrumento?.nombre || posicion?.nombre || transaccion?.instrumentoNombre}
              </p>
              <p className="text-[11px] text-finanzar-textSecondary">
                {CATEGORIA_LABEL[categoria] || categoria}
                {precioVivo !== null && !esTna && ` · en vivo ${formatPrecio(precioVivo, moneda)}`}
                {esTna && instrumento && ` · ${instrumento.tasaORendimientoActual.toFixed(2)}% TNA`}
              </p>
            </div>
            {modo === "compra" && (
              <BotonSecundario onClick={() => setInstrumento(null)}>Cambiar</BotonSecundario>
            )}
          </div>
        )}

        {esTna && (
          <p className="text-[11px] text-finanzar-textSecondary bg-finanzar-accentSubtle border border-finanzar-borderSubtle rounded px-3 py-2">
            Para FCI y criptopesos la app no tiene precio de cuotaparte: podés cargar el valor de cuotaparte que
            pagaste, o dejar el precio en 1 y cargar directamente el monto en pesos. El valor actual se estima
            devengando la TNA vigente.
          </p>
        )}

        {/* Toggle Monto / Cantidad */}
        <div className="inline-flex p-1 bg-finanzar-bg border border-finanzar-borderSubtle rounded-md">
          {(["cantidad", "monto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModoMonto(m)}
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${
                modoMonto === m
                  ? "bg-finanzar-surface text-finanzar-primary font-semibold shadow-sm border border-finanzar-border"
                  : "text-finanzar-textSecondary hover:text-finanzar-textMain"
              }`}
            >
              {m === "cantidad" ? "Por cantidad" : `Por monto (${moneda})`}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label={`Precio unitario (${moneda})`}>
            <input
              type="text"
              inputMode="decimal"
              value={precio}
              onChange={(e) => {
                setPrecio(e.target.value);
                setPrecioTocado(true);
              }}
              placeholder="0,00"
              className={inputClass}
            />
          </Campo>

          {modoMonto === "cantidad" ? (
            <Campo label="Cantidad" hint={tipo === "venta" ? `Máximo: ${formatCantidad(maxVenta, categoria)}` : undefined}>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                {tipo === "venta" && (
                  <BotonSecundario onClick={() => setCantidad(String(maxVenta))}>Todo</BotonSecundario>
                )}
              </div>
            </Campo>
          ) : (
            <Campo label={`Monto total (${moneda})`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0,00"
                  className={inputClass}
                />
                {tipo === "venta" && precioNum > 0 && (
                  <BotonSecundario onClick={() => setMonto(String(maxVenta * precioNum))}>Todo</BotonSecundario>
                )}
              </div>
            </Campo>
          )}

          <Campo label="Fecha" hint="Editable: podés cargar operaciones pasadas.">
            <input
              type="date"
              value={fecha}
              max={hoyISO()}
              onChange={(e) => setFecha(e.target.value)}
              className={inputClass}
            />
          </Campo>

          <Campo label="Notas (opcional)">
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: broker, comisión…"
              className={inputClass}
            />
          </Campo>
        </div>

        {/* Preview */}
        <div className="rounded-md border border-finanzar-borderSubtle bg-finanzar-bg px-4 py-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">Cantidad</span>
            <span className="font-mono tabular-nums text-finanzar-textMain">
              {cantidadNum > 0 ? formatCantidad(cantidadNum, categoria) : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-finanzar-textSecondary">{tipo === "venta" ? "Total a cobrar" : "Total invertido"}</span>
            <span className="font-mono tabular-nums text-finanzar-textMain">
              {montoNum > 0 ? formatMoneda(montoNum, moneda) : "—"}
            </span>
          </div>
          {realizadaPreview !== null && (
            <div className="flex justify-between border-t border-finanzar-borderSubtle pt-1.5">
              <span className="text-finanzar-textSecondary">Resultado realizado</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  realizadaPreview >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"
                }`}
              >
                {formatMoneda(realizadaPreview, moneda)}
              </span>
            </div>
          )}
          {excedeMax && (
            <p className="text-finanzar-negative font-medium">No podés vender más de lo que tenés.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <BotonSecundario onClick={onClose}>Cancelar</BotonSecundario>
          <BotonPrimario onClick={handleSubmit} disabled={!valido} tono={tipo === "venta" ? "negative" : "primary"}>
            {modo === "compra" ? "Confirmar compra" : modo === "venta" ? "Confirmar venta" : "Guardar cambios"}
          </BotonPrimario>
        </div>
      </div>
    </Modal>
  );
}
