import { ReactNode, useEffect } from "react";

/** Diálogo modal liviano (sin dependencias) con el lenguaje visual de la app. */
export default function Modal({
  titulo,
  subtitulo,
  onClose,
  children,
  ancho = "max-w-lg",
}: {
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-finanzar-primary/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className={`w-full ${ancho} max-h-[92vh] overflow-y-auto bg-finanzar-surface border border-finanzar-border rounded-t-lg sm:rounded-lg shadow-lg`}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-finanzar-borderSubtle sticky top-0 bg-finanzar-surface z-10">
          <div>
            <h2 className="font-serif text-xl font-bold text-finanzar-primary leading-tight">{titulo}</h2>
            {subtitulo && <p className="text-xs text-finanzar-textSecondary mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-finanzar-textSecondary hover:text-finanzar-negative text-sm font-medium px-2 py-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* Piezas de formulario compartidas por los modales del portfolio */

export const inputClass =
  "w-full px-3 py-2 bg-finanzar-bg border border-finanzar-border rounded text-sm text-finanzar-textMain placeholder-finanzar-textMuted focus:outline-none focus:ring-1 focus:ring-finanzar-accent disabled:opacity-60 tabular-nums";

export function Campo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider font-semibold text-finanzar-textSecondary mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-finanzar-textMuted mt-1">{hint}</span>}
    </label>
  );
}

export function BotonPrimario({
  children,
  onClick,
  disabled,
  type = "button",
  tono = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  tono?: "primary" | "negative";
}) {
  const colores =
    tono === "negative"
      ? "bg-finanzar-negative hover:opacity-90 text-white"
      : "bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-4 py-2 rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${colores}`}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-3 py-1.5 rounded border border-finanzar-border bg-finanzar-surface text-finanzar-primary hover:border-finanzar-accent text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${className}`}
    >
      {children}
    </button>
  );
}

/** Parsea un número escrito por el usuario aceptando coma o punto decimal. */
export function parseNum(v: string): number {
  if (!v) return NaN;
  const limpio = v.replace(/\s/g, "");
  // "1.234,56" (es-AR) → "1234.56"; "1234.56" → igual; "1,5" → "1.5"
  const normalizado =
    limpio.includes(",") ? limpio.replace(/\./g, "").replace(",", ".") : limpio;
  return Number(normalizado);
}
