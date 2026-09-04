import { Categoria } from "../types";

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
  return (
    <nav className="w-full bg-finanzar-surface border-b border-finanzar-border mb-6 rounded-t-md">
      <div className="flex space-x-2 sm:space-x-8 overflow-x-auto px-4 sm:px-6">
        {TABS.map((tab) => {
          const isSelected = active === tab.id;
          const count = tab.id === "todos" ? total : counts?.[tab.id as Categoria];

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center py-3.5 px-1 border-b-2 text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
                isSelected
                  ? "border-finanzar-accent text-finanzar-primary font-semibold"
                  : "border-transparent text-finanzar-textSecondary hover:text-finanzar-primary hover:border-finanzar-border font-medium"
              }`}
            >
              <span>{tab.label}</span>
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
