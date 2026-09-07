import { useState, useMemo } from "react";

/**
 * Renderizador de Markdown liviano y seguro sin dependencias externas.
 * Soporta bloques colapsables de Razonamiento (<think>...</think>) con ícono
 * de cerebro y fondo contrastado, párrafos, negritas, cursivas, listas con viñetas,
 * listas numeradas, tablas Markdown con columnas alineadas, bloques de código
 * monoespaciados, código inline, títulos y citas editoriales.
 */
export default function MarkdownMessage({ content }: { content: string }) {
  const blocks = useMemo(() => {
    return parseMessageBlocks(content);
  }, [content]);

  return (
    <div className="space-y-2 text-xs sm:text-[13px] leading-relaxed text-finanzar-text break-words">
      {blocks.map((block, idx) => {
        if (block.type === "think") {
          return (
            <ReasoningAccordion
              key={`think-${idx}`}
              content={block.content}
              isStreaming={block.isStreaming}
            />
          );
        }
        return (
          <div key={`content-${idx}`} className="space-y-1.5">
            {parseMarkdown(block.content)}
          </div>
        );
      })}
    </div>
  );
}

interface MessageBlock {
  type: "think" | "content";
  content: string;
  isStreaming?: boolean;
}

/**
 * Separa los bloques <think>...</think> del contenido normal de la respuesta.
 * Soporta bloques cerrados y bloques incompletos en streaming (<think> sin </think> todavía).
 */
function parseMessageBlocks(raw: string): MessageBlock[] {
  if (!raw) return [];

  const blocks: MessageBlock[] = [];
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thinkRegex.exec(raw)) !== null) {
    // Texto antes de <think>
    const before = raw.slice(lastIndex, match.index);
    if (before.trim()) {
      blocks.push({ type: "content", content: before });
    }

    const thinkInner = match[1] || "";
    const matchedStr = match[0];
    const isClosed = /<\/think>$/i.test(matchedStr);

    if (thinkInner.trim() || !isClosed) {
      blocks.push({
        type: "think",
        content: thinkInner,
        isStreaming: !isClosed,
      });
    }

    lastIndex = match.index + matchedStr.length;
  }

  // Contenido restante después del último bloque de razonamiento
  const remainder = raw.slice(lastIndex);
  if (remainder.trim()) {
    blocks.push({ type: "content", content: remainder });
  }

  if (blocks.length === 0 && raw.trim()) {
    blocks.push({ type: "content", content: raw });
  }

  return blocks;
}

/**
 * Componente colapsable de Razonamiento para bloques <think>
 */
function ReasoningAccordion({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-1.5 rounded-md border border-finanzar-borderSubtle bg-[#EFE9DC]/75 overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#E5DDD0]/90 transition-colors select-none group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {/* Ícono de cerebro */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-finanzar-accent flex-shrink-0"
          >
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M12 5v14" />
            <path d="M9 13h6" />
          </svg>
          <span className="text-xs font-semibold text-finanzar-primary">Razonamiento</span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-finanzar-textSecondary font-normal ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-pulse" />
              Pensando…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-finanzar-textSecondary group-hover:text-finanzar-primary transition-colors">
          <span>{isOpen ? "Ocultar" : "Mostrar"}</span>
          <svg
            viewBox="0 0 24 24"
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 border-t border-finanzar-borderSubtle bg-[#E8E0D2]/50 text-[11px] sm:text-xs text-finanzar-textSecondary leading-relaxed space-y-1.5 font-sans">
          {parseMarkdown(content.trim())}
        </div>
      )}
    </div>
  );
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
        <div key={partIdx} className="my-1.5 rounded-xs bg-finanzar-bg border border-finanzar-border overflow-hidden">
          {lang && (
            <div className="px-2.5 py-0.5 bg-finanzar-surface border-b border-finanzar-borderSubtle text-[9px] font-mono uppercase tracking-wider text-finanzar-textSecondary">
              {lang}
            </div>
          )}
          <pre className="p-2.5 font-mono text-[11px] overflow-x-auto text-finanzar-text whitespace-pre">
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
          <ul key={key} className="list-disc list-inside space-y-0.5 my-1 pl-1">
            {listBuffer.items.map((it, idx) => (
              <li key={idx} className="text-finanzar-text">
                {renderInline(it)}
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="list-decimal list-inside space-y-0.5 my-1 pl-1">
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
          className="my-2 overflow-x-auto rounded-md border border-finanzar-border bg-finanzar-surface shadow-xs"
        >
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-finanzar-bg border-b border-finanzar-border text-[10px] font-semibold uppercase tracking-wider text-finanzar-textSecondary">
              <tr>
                {headers.map((h, hIdx) => {
                  const align = alignments[hIdx] || "left";
                  const alignCls =
                    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
                  return (
                    <th key={hIdx} className={`px-2.5 py-1.5 text-finanzar-primary ${alignCls}`}>
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
                        className={`px-2.5 py-1.5 text-finanzar-text leading-relaxed whitespace-nowrap sm:whitespace-normal ${alignCls}`}
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
        elements.push(<hr key={`hr-${partIdx}-${lineIdx}`} className="my-2 border-finanzar-borderSubtle" />);
        continue;
      }

      // Encabezados
      if (trimmed.startsWith("### ")) {
        flushList(`flush-h3-${partIdx}-${lineIdx}`);
        elements.push(
          <h4 key={`h3-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-xs sm:text-sm mt-2.5 mb-1">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
        continue;
      }
      if (trimmed.startsWith("## ")) {
        flushList(`flush-h2-${partIdx}-${lineIdx}`);
        elements.push(
          <h3 key={`h2-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-sm sm:text-base mt-3 mb-1">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
        continue;
      }
      if (trimmed.startsWith("# ")) {
        flushList(`flush-h1-${partIdx}-${lineIdx}`);
        elements.push(
          <h2 key={`h1-${partIdx}-${lineIdx}`} className="font-serif font-bold text-finanzar-primary text-base sm:text-lg mt-3.5 mb-1.5">
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
            className="border-l-2 border-finanzar-accent pl-2.5 my-1 italic text-finanzar-textSecondary text-xs"
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
          className="px-1.5 py-0.5 rounded-xs bg-finanzar-bg border border-finanzar-borderSubtle font-mono text-[10px] text-finanzar-primary"
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
