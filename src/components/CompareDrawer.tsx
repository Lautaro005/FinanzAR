import { Instrumento } from "../types";

export const COMPARISON_COLORS = [
  "#1B2A4A", // Navy Primario
  "#C89B3C", // Dorado Acento
  "#2F5FA8", // Azul Medio
  "#B5502E", // Terracota
  "#5C6B73", // Pizarra
  "#5B6E4A", // Oliva
] as const;

interface CompareDrawerProps {
  selectedInstruments: Instrumento[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export default function CompareDrawer({
  selectedInstruments,
  onRemove,
  onClear,
  onCompare,
}: CompareDrawerProps) {
  if (selectedInstruments.length < 2) return null;

  return (
    <aside
      aria-label="Bandeja de Comparación de Activos"
      className="fixed bottom-0 inset-x-0 bg-finanzar-surface border-t-2 border-finanzar-accent shadow-drawer z-40 py-3.5 px-4 sm:px-8 transition-transform duration-200"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Chips de instrumentos con su color asignado */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 md:pb-0">
          <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-finanzar-textSecondary mr-1 whitespace-nowrap">
            <span className="text-finanzar-accent text-sm">❖</span>
            <span>Comparando ({selectedInstruments.length}):</span>
          </div>

          <div className="flex items-center space-x-2">
            {selectedInstruments.map((item, index) => {
              const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
              return (
                <div
                  key={item.id}
                  className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-sm bg-finanzar-bg border border-finanzar-border text-xs text-finanzar-textMain font-medium shadow-xs whitespace-nowrap"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate max-w-[130px]">{item.nombre}</span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-finanzar-textSecondary hover:text-finanzar-negative text-xs p-0.5 rounded transition-colors"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <button
            onClick={onClear}
            className="text-xs text-finanzar-textSecondary hover:text-finanzar-primary underline transition-colors whitespace-nowrap"
          >
            Limpiar selección
          </button>

          <button
            onClick={onCompare}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent whitespace-nowrap"
          >
            <span>Ver Gráfico Superpuesto</span>
            <span className="text-finanzar-accent font-bold">→</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

