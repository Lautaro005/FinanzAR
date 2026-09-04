import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Instrumento } from "../types";

interface InstrumentTableProps {
  data: Instrumento[];
  loading?: boolean;
  selectedIds?: string[];
  onToggleCompare?: (id: string) => void;
  onSelectInstrument?: (instrumento: Instrumento) => void;
}

type SortField = "nombre" | "tasaORendimientoActual" | "variacion24h" | "entidadOFuente";

export default function InstrumentTable({
  data,
  loading = false,
  selectedIds = [],
  onToggleCompare,
  onSelectInstrument,
}: InstrumentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("tasaORendimientoActual");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = data.filter((item) => {
      const q = searchTerm.toLowerCase();
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.entidadOFuente.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) ||
        (item.ticker && item.ticker.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (valA === undefined) valA = 0;
      if (valB === undefined) valB = 0;

      if (typeof valA === "string") {
        return sortAsc
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [data, searchTerm, sortField, sortAsc]);

  const formatValue = (item: Instrumento) => {
    if (item.unidad === "TNA") {
      return `${item.tasaORendimientoActual.toFixed(2)}% TNA`;
    }
    if (item.unidad === "precio_ars") {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: item.tasaORendimientoActual < 100 ? 2 : 0,
      }).format(item.tasaORendimientoActual);
    }
    if (item.unidad === "precio_usd") {
      return `US$ ${item.tasaORendimientoActual.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `${item.tasaORendimientoActual}`;
  };

  const getCategoryBadgeClass = (categoria: string) => {
    switch (categoria) {
      case "pesos":
        return "bg-[#EAF0F8] text-[#1B2A4A] border border-[#CBDCEE]";
      case "fci":
        return "bg-[#EFEAF5] text-[#4A3B70] border border-[#D9CDEB]";
      case "cripto":
        return "bg-[#ECEAE4] text-[#26262B] border border-[#D6D2C4]";
      case "cedears":
      case "acciones":
        return "bg-[#F6EEDC] text-[#8C6B1B] border border-[#E8D9B5]";
      case "bonos":
        return "bg-[#ECEEF2] text-[#2C3E50] border border-[#CBD2DD]";
      case "eeuu":
        return "bg-[#E5ECF6] text-[#1E3A63] border border-[#B8CEEA]";
      default:
        return "bg-finanzar-bg text-finanzar-textSecondary border border-finanzar-border";
    }
  };

  return (
    <div className="w-full bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden">
      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 border-b border-finanzar-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-finanzar-surface">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por empresa, fondo, ticker o entidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-finanzar-bg border border-finanzar-border rounded text-sm text-finanzar-textMain placeholder-finanzar-textSecondary focus:outline-none focus:ring-1 focus:ring-finanzar-accent"
          />
          <span className="absolute left-3 top-2.5 text-finanzar-textSecondary text-xs">
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-2.5 text-xs text-finanzar-textSecondary hover:text-finanzar-primary"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-xs text-finanzar-textSecondary flex items-center space-x-2">
          <span>Mostrando: <strong className="text-finanzar-textMain">{filteredAndSortedData.length}</strong> instrumentos</span>
          {selectedIds.length > 0 && (
            <span className="text-finanzar-accent font-semibold">
              ({selectedIds.length} seleccionados para comparar)
            </span>
          )}
        </div>
      </div>

      {/* Contenido de la Tabla */}
      {loading ? (
        <div className="p-12 text-center text-finanzar-textSecondary">
          <span className="inline-block animate-spin mr-2">⟳</span>
          Cargando cotizaciones oficiales...
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        <div className="p-12 text-center text-finanzar-textSecondary">
          No se encontraron alternativas que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="overflow-auto max-h-[1500px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-finanzar-borderSubtle bg-finanzar-bg text-xs font-semibold uppercase tracking-wider text-finanzar-textSecondary select-none">
                {onToggleCompare && (
                  <th scope="col" className="w-12 px-4 py-3.5 text-center">
                    Comp.
                  </th>
                )}
                <th
                  scope="col"
                  onClick={() => handleSort("nombre")}
                  className="px-4 py-3.5 cursor-pointer hover:text-finanzar-primary transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Instrumento</span>
                    <span>{sortField === "nombre" ? (sortAsc ? "↑" : "↓") : "⇅"}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort("entidadOFuente")}
                  className="px-4 py-3.5 cursor-pointer hover:text-finanzar-primary transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Entidad / Mercado</span>
                    <span>{sortField === "entidadOFuente" ? (sortAsc ? "↑" : "↓") : "⇅"}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort("tasaORendimientoActual")}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-finanzar-primary transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Tasa / Rendimiento</span>
                    <span>{sortField === "tasaORendimientoActual" ? (sortAsc ? "↑" : "↓") : "⇅"}</span>
                  </div>
                </th>
                <th
                  scope="col"
                  onClick={() => handleSort("variacion24h")}
                  className="px-4 py-3.5 text-right cursor-pointer hover:text-finanzar-primary transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Var 24h</span>
                    <span>{sortField === "variacion24h" ? (sortAsc ? "↑" : "↓") : "⇅"}</span>
                  </div>
                </th>
                <th scope="col" className="w-24 px-4 py-3.5 text-center">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-finanzar-borderSubtle bg-finanzar-surface">
              {filteredAndSortedData.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const hasVariation = item.variacion24h !== undefined && item.variacion24h !== null;
                const isPositive = hasVariation && item.variacion24h! >= 0;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors duration-100 ${
                      isSelected
                        ? "bg-finanzar-accentSubtle/40 hover:bg-finanzar-accentSubtle/60"
                        : "hover:bg-finanzar-surfaceHover"
                    }`}
                  >
                    {/* Checkbox Comparar */}
                    {onToggleCompare && (
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleCompare(item.id)}
                          aria-label={`Comparar ${item.nombre}`}
                          className="w-4 h-4 rounded-xs border-finanzar-border text-finanzar-primary focus:ring-finanzar-accent accent-finanzar-primary cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Nombre y Categoría */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <Link
                          to={`/instrumento/${encodeURIComponent(item.id)}`}
                          className="text-left font-medium text-finanzar-textMain hover:text-finanzar-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-finanzar-accent rounded-xs"
                        >
                          {item.nombre}
                        </Link>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.2 rounded ${getCategoryBadgeClass(
                              item.categoria
                            )}`}
                          >
                            {item.categoria}
                          </span>
                          {item.ticker && (
                            <span
                              className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-finanzar-bg border border-finanzar-borderSubtle text-finanzar-textSecondary"
                              title={`Ticker: ${item.ticker}`}
                            >
                              {item.ticker}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Entidad */}
                    <td className="px-4 py-3.5 text-sm text-finanzar-textSecondary">
                      {item.entidadOFuente}
                    </td>

                    {/* Tasa / Valor Actual */}
                    <td className="px-4 py-3.5 text-right font-semibold text-finanzar-textMain tabular-nums text-base">
                      {formatValue(item)}
                    </td>

                    {/* Variación 24h: Positivo Azul #2F5FA8 con ↑, Negativo Terracota #B5502E con ↓ */}
                    <td className="px-4 py-3.5 text-right">
                      {hasVariation ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums border ${
                            isPositive
                              ? "bg-finanzar-positiveBg text-finanzar-positive border-finanzar-positiveBorder"
                              : "bg-finanzar-negativeBg text-finanzar-negative border-finanzar-negativeBorder"
                          }`}
                        >
                          <span className="mr-0.5 font-bold">{isPositive ? "↑" : "↓"}</span>
                          <span>{Math.abs(item.variacion24h!).toFixed(2)}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-finanzar-textMuted">—</span>
                      )}
                    </td>

                    {/* Botones Ficha Detalle y Preview */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {onSelectInstrument && (
                          <button
                            onClick={() => onSelectInstrument(item)}
                            className="p-1 text-xs rounded text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-bg transition-colors"
                            title="Ver vista rápida del gráfico"
                          >
                            📊
                          </button>
                        )}
                        <Link
                          to={`/instrumento/${encodeURIComponent(item.id)}`}
                          className="px-2 py-1 text-xs rounded text-finanzar-primary hover:bg-finanzar-bg border border-transparent hover:border-finanzar-border transition-colors font-medium"
                          title="Abrir ficha completa"
                        >
                          Ficha →
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
