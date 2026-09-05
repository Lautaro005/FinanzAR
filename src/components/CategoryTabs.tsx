import { useEffect, useState } from "react";
import { Categoria } from "../types";
import { isCategoriaAbierta } from "../lib/marketHours";

export type CategoriaFiltro = Categoria | "todos";

interface TabConfig {
  id: CategoriaFiltro;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "todos", label: "Todos" },
  { id: "pesos", label: "Plazos Fijos" },
  { id: "fci", label: "FCI" },
  { id: "cripto", label: "Cripto" },
  { id: "cedears", label: "CEDEARs" },
  { id: "acciones", label: "Acciones" },
  { id: "bonos", label: "Bonos" },
  { id: "eeuu", label: "EE.UU." },
  { id: "divisas", label: "Divisas" },
];

export default function CategoryTabs({
  active,
  onChange,
  counts,
  total,
}: {
  active: CategoriaFiltro;
  onChange: (c: CategoriaFiltro) => void;
  counts?: Partial<Record<Categoria, number>>;
  total?: number;
}) {
  // Estado de apertura por categoría, recalculado cada minuto (mismo intervalo
  // que el indicador del header) para que el punto rojo/verde no quede vencido.
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <nav className="w-full bg-finanzar-surface border-b border-finanzar-border mb-6 rounded-t-md">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-4 px-3 sm:px-6 py-0.5">
        {TABS.map((tab) => {
          const isSelected = active === tab.id;
          const count = tab.id === "todos" ? total : counts?.[tab.id as Categoria];
          const abierto = isCategoriaAbierta(tab.id, ahora);

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center py-3 px-1 border-b-2 text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
                isSelected
                  ? "border-finanzar-accent text-finanzar-primary font-semibold"
                  : "border-transparent text-finanzar-textSecondary hover:text-finanzar-primary hover:border-finanzar-border font-medium"
              }`}
            >
              <span className="flex items-center space-x-1.5">
                {abierto !== null && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      abierto ? "bg-finanzar-positive" : "bg-finanzar-negative"
                    }`}
                    title={abierto ? "Mercado abierto" : "Mercado cerrado"}
                  />
                )}
                <span>{tab.label}</span>
              </span>
              {typeof count === "number" && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs tabular-nums transition-colors ${
                    isSelected
                      ? "bg-finanzar-accentSubtle text-finanzar-primary font-semibold"
                      : "bg-finanzar-bg text-finanzar-textSecondary group-hover:bg-finanzar-surfaceMuted"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
