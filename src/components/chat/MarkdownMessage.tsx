import { useMemo } from "react";

/**
 * Renderizador de Markdown liviano y seguro sin dependencias externas.
 * Soporta párrafos, negritas, cursivas, listas con viñetas, listas numeradas,
 * tablas Markdown con columnas alineadas, bloques de código monoespaciados,
 * código inline, títulos y citas editoriales.
 */
export default function MarkdownMessage({ content }: { content: string }) {
  const parsed = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  return <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-finanzar-text break-words">{parsed}</div>;
}

interface TableBuffer {
  headers: string[];
  alignments: ("left" | "center" | "right")[];
  rows: string[][];
}

function parseMarkdown(text: string) {
  if (!text) return null;

  // Separar bloques por bloques de código primero
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, partIdx) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const codeLines = part.slice(3, -3).trim().split("\n");
      // Posible lenguaje en la primera línea
      let lang = "";
      let code = "";
      if (codeLines[0] && /^[a-zA-Z0-9_-]+$/.test(codeLines[0].trim())) {
        lang = codeLines[0].trim();
        code = codeLines.slice(1).join("\n");
      } else {
        code = codeLines.join("\n");
      }

      return (
        <div key={partIdx} className="my-2 rounded-xs bg-finanzar-bg border border-finanzar-border overflow-hidden">
          {lang && (
            <div className="px-3 py-1 bg-finanzar-surface border-b border-finanzar-borderSubtle text-[10px] font-mono uppercase tracking-wider text-finanzar-textSecondary">
              {lang}
            </div>
          )}
          <pre className="p-3 font-mono text-xs overflow-x-auto text-finanzar-text whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Dividir en párrafos / líneas
    const lines = part.split("\n");
    const elements: JSX.Element[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let tableBuffer: TableBuffer | null = null;

    const flushList = (key: string) => {
      if (!listBuffer) return;
      if (listBuffer.type === "ul") {
        elements.push(
          <ul key={key} className="list-disc list-inside space-y-1 my-1.5 pl-1">
            {listBuffer.items.map((it, idx) => (
              <li key={idx} className="text-finanzar-text">
                {renderInline(it)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="list-decimal list-inside space-y-1 my-1.5 pl-1">
            {listBuffer.items.map((it, idx) => (
              <li key={idx} className="text-finanzar-text">
                {renderInline(it)}
              </li>
            ))}
          </ol>
        );
      }
      listBuffer = null;
    };

    const flushTable = (key: string) => {
      if (!tableBuffer) return;
      const { headers, alignments, rows } = tableBuffer;

      elements.push(
        <div
          key={key}
          className="my-3 overflow-x-auto rounded-md border border-finanzar-border bg-finanzar-surface shadow-xs"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-finanzar-bg border-b border-finanzar-border text-[11px] font-semibold uppercase tracking-wider text-finanzar-textSecondary">
              <tr>
                {headers.map((h, hIdx) => {
                  const align = alignments[hIdx] || "left";
                  const alignCls =
                    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                  return (
                    <th key={hIdx} className={`px-3 py-2 text-finanzar-primary ${alignCls}`}>
                      {renderInline(h)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-finanzar-borderSubtle">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-finanzar-surfaceHover/50 transition-colors">
                  {headers.map((_, cIdx) => {
                    const cell = row[cIdx] ?? "";
                    const align = alignments[cIdx] || "left";
                    const alignCls =
                      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                    return (
                      <td
                        key={cIdx}
                        className={`px-3 py-2 text-finanzar-text leading-relaxed whitespace-nowrap sm:whitespace-normal ${alignCls}`}
                      >
                        {renderInline(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = null;
    };

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Línea vacía
      if (!trimmed) {
        flushList(`flush-list-${partIdx}-${lineIdx}`);
        flushTable(`flush-table-${partIdx}-${lineIdx}`);
        continue;
      }

      // Soporte a Tablas Markdown:
      // Comprobar si la línea actual y la siguiente forman un encabezado + delimitador (|---|---|)
      if (
        !tableBuffer &&
        trimmed.includes("|") &&
        lineIdx + 1 < lines.length &&
        isTableDelimiter(lines[lineIdx + 1])
      ) {
        flushList(`flush-pre-table-${partIdx}-${lineIdx}`);
        const headers = parseTableRow(trimmed);
        const alignments = parseAlignments(lines[lineIdx + 1]);
        tableBuffer = {
          headers,
          alignments,
          rows: [],
        };
        lineIdx++; // Saltar la línea del delimitador
        continue;
      }

      // Si estamos dentro de una tabla
      if (tableBuffer) {
        if (trimmed.includes("|")) {
          tableBuffer.rows.push(parseTableRow(trimmed));
          continue;
        } else {
          // Si la línea no contiene |, termina la tabla
          flushTable(`table-${partIdx}-${lineIdx}`);
        }
      }

      // Separador horizontal
      if (/^---+$/.test(trimmed)) {
        flushList(`flush-hr-${partIdx}-${lineIdx}`);
        elements.push(<hr key={`hr-${partIdx}-${lineIdx}`} className="my-3 border-finanzar-borderSubtle" />);
        continue;
      }

      // Encabezados
      if (trimmed.startsWith("### ")) {
        flushList(`flush-h3-${partIdx}-${lineIdx}`);
        elements.push(
          <h4 key={`h3-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-sm mt-3 mb-1">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushList(`flush-h2-${partIdx}-${lineIdx}`);
        elements.push(
          <h3 key={`h2-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-base mt-3.5 mb-1.5">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushList(`flush-h1-${partIdx}-${lineIdx}`);
        elements.push(
          <h2 key={`h1-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-lg mt-4 mb-2">
            {renderInline(trimmed.slice(2))}
          </h2>
        );
        continue;
      }

      // Cita en bloque
      if (trimmed.startsWith("> ")) {
        flushList(`flush-quote-${partIdx}-${lineIdx}`);
        elements.push(
          <blockquote
            key={`quote-${partIdx}-${lineIdx}`}
            className="border-l-2 border-finanzar-accent pl-3 my-1.5 italic text-finanzar-textSecondary"
          >
            {renderInline(trimmed.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Lista con viñeta (- o *)
      const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
      if (bulletMatch) {
        if (!listBuffer || listBuffer.type !== "ul") {
          flushList(`flush-pre-ul-${partIdx}-${lineIdx}`);
          listBuffer = { type: "ul", items: [] };
        }
        listBuffer.items.push(bulletMatch[1]);
        continue;
      }

      // Lista numerada (1. 2.)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        if (!listBuffer || listBuffer.type !== "ol") {
          flushList(`flush-pre-ol-${partIdx}-${lineIdx}`);
          listBuffer = { type: "ol", items: [] };
        }
        listBuffer.items.push(numMatch[2]);
        continue;
      }

      // Párrafo normal
      flushList(`flush-p-${partIdx}-${lineIdx}`);
      elements.push(
        <p key={`p-${partIdx}-${lineIdx}`} className="text-finanzar-text">
          {renderInline(trimmed)}
        </p>
      );
    }

    flushList(`flush-final-${partIdx}`);
    flushTable(`flush-final-table-${partIdx}`);
    return <div key={partIdx}>{elements}</div>;
  });
}

/** Comprueba si una línea cumple con la sintaxis de delimitador de tabla Markdown (|---|---|) */
function isTableDelimiter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  return cells.length >= 1 && cells.every((c) => /^:?-+:?$/.test(c));
}

/** Extrae las celdas de una fila de tabla Markdown */
function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const content = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return content.split("|").map((c) => c.trim());
}

/** Extrae la alineación de cada columna según los dos puntos en el delimitador (:---, :---:, ---:) */
function parseAlignments(delimiterLine: string): ("left" | "center" | "right")[] {
  const cells = delimiterLine.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  return cells.map((cell) => {
    const start = cell.startsWith(":");
    const end = cell.endsWith(":");
    if (start && end) return "center";
    if (end) return "right";
    return "left";
  });
}

function renderInline(raw: string): (string | JSX.Element)[] {
  // Dividir por código inline `code`
  const segments = raw.split(/(`[^`]+`)/g);

  return segments.map((seg, sIdx) => {
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
      return (
        <code
          key={sIdx}
          className="px-1.5 py-0.5 rounded-xs bg-finanzar-bg border border-finanzar-borderSubtle font-mono text-[11px] text-finanzar-primary"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }

    // Procesar negritas (**bold**) y cursivas (*italic*)
    const formatted: (string | JSX.Element)[] = [];
    const boldSegments = seg.split(/(\*\*[^*]+\*\*)/g);

    boldSegments.forEach((bSeg, bIdx) => {
      if (bSeg.startsWith("**") && bSeg.endsWith("**") && bSeg.length > 4) {
        formatted.push(
          <strong key={`${sIdx}-b-${bIdx}`} className="font-semibold text-finanzar-text">
            {bSeg.slice(2, -2)}
          </strong>
        );
      } else {
        // Cursivas
        const italicSegments = bSeg.split(/(\*[^*]+\*)/g);
        italicSegments.forEach((iSeg, iIdx) => {
          if (iSeg.startsWith("*") && iSeg.endsWith("*") && iSeg.length > 2) {
            formatted.push(
              <em key={`${sIdx}-b-${bIdx}-i-${iIdx}`} className="italic">
                {iSeg.slice(1, -1)}
              </em>
            );
          } else if (iSeg) {
            formatted.push(iSeg);
          }
        });
      }
    });

    return <span key={sIdx}>{formatted}</span>;
  });
}
