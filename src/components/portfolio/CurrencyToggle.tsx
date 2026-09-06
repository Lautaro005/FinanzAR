import { useEffect, useRef, useState } from "react";
import { MonedaVista } from "../../types";

/** Banderas minimalistas en SVG (sin dependencias ni emojis, para que se vean igual en todos los sistemas). */
function BanderaAR({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#74ACDF" />
      <path d="M0 7h20v6H0z" fill="#FFFFFF" />
      <circle cx="10" cy="10" r="1.7" fill="#F6B40E" />
    </svg>
  );
}
function BanderaUS({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <defs>
        <clipPath id="finanzar-us-clip">
          <circle cx="10" cy="10" r="10" />
        </clipPath>
      </defs>
      <g clipPath="url(#finanzar-us-clip)">
        <rect width="20" height="20" fill="#FFFFFF" />
        {[0, 4, 8, 12, 16].map((y) => (
          <rect key={y} y={y} width="20" height="2" fill="#B22234" />
        ))}
        <rect width="9" height="10" fill="#3C3B6E" />
      </g>
    </svg>
  );
}

/**
 * Toggle ARS / US$ con el que se expresan todos los valores del portfolio.
 * Con US$ seleccionado aparece un ícono de info que explica con qué
 * cotización se convierte.
 */
export default function CurrencyToggle({
  value,
  onChange,
  casaLabel,
  dolarTexto,
}: {
  value: MonedaVista;
  onChange: (m: MonedaVista) => void;
  /** Etiqueta de la casa de dólar elegida en Configuración (ej. "Dólar MEP (bolsa)"). */
  casaLabel: string;
  /** Cotización formateada, o null si no cargó. */
  dolarTexto: string | null;
}) {
  const [infoAbierta, setInfoAbierta] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!infoAbierta) return;
    const cerrar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setInfoAbierta(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [infoAbierta]);

  const opciones: { id: MonedaVista; label: string; Bandera: typeof BanderaAR }[] = [
    { id: "ARS", label: "AR$", Bandera: BanderaAR },
    { id: "USD", label: "US$", Bandera: BanderaUS },
  ];

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Moneda del portfolio"
        className="inline-flex items-center p-1 rounded-full bg-finanzar-surfaceMuted border border-finanzar-borderSubtle"
      >
        {opciones.map(({ id, label, Bandera }) => {
          const activo = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onChange(id)}
              className={`inline-flex items-center gap-1.5 rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
                activo
                  ? "pl-1.5 pr-3 py-1 bg-finanzar-surface border border-finanzar-border shadow-sm text-finanzar-primary"
                  : "p-1 text-finanzar-textSecondary hover:text-finanzar-primary"
              }`}
              title={id === "ARS" ? "Ver en pesos argentinos" : "Ver en dólares"}
            >
              <Bandera className="w-5 h-5 rounded-full flex-shrink-0" />
              {activo && <span className="font-serif font-bold text-base leading-none tabular-nums">{label}</span>}
              {!activo && <span className="sr-only">{label}</span>}
            </button>
          );
        })}
      </div>

      {value === "USD" && (
        <>
          <button
            type="button"
            onClick={() => setInfoAbierta((v) => !v)}
            aria-label="Cómo se convierte a dólares"
            aria-expanded={infoAbierta}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-serif font-bold italic transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
              infoAbierta
                ? "bg-finanzar-primary border-finanzar-primary text-finanzar-surface"
                : "bg-finanzar-surface border-finanzar-border text-finanzar-textSecondary hover:text-finanzar-primary hover:border-finanzar-accent"
            }`}
          >
            i
          </button>
          {infoAbierta && (
            <div
              role="tooltip"
              className="absolute right-0 top-full mt-2 z-30 w-72 bg-finanzar-surface border border-finanzar-border rounded-md shadow-md p-3 text-xs text-finanzar-textSecondary animate-fadeIn"
            >
              <p>
                Los valores en pesos se convierten a dólares porque elegiste la conversión{" "}
                <strong className="text-finanzar-primary">{casaLabel}</strong>
                {dolarTexto ? <> (hoy {dolarTexto})</> : <> (sin cotización en vivo ahora)</>}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
