import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChatSession } from "../../lib/aiChat";
import { getAiConfig } from "../../lib/aiConfig";
import MarkdownMessage from "./MarkdownMessage";

interface ChatViewProps {
  session: ChatSession | null;
  onSendMessage: (text: string) => Promise<void>;
  isGenerating: boolean;
  streamingContent: string;
  onStopGeneration: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
  hasLivePortfolio?: boolean;
  isLive?: boolean;
  floatingInput?: boolean;
}

const PROMPT_SUGGESTIONS = [
  "¿Cómo está distribuido mi portfolio y qué nivel de riesgo tiene?",
  "¿Me conviene renovar mis plazos fijos o pasar a bonos/LECAPs?",
  "Compará el rendimiento del dólar MEP vs Plazo Fijo en el último mes",
  "¿Cuáles son los CEDEARs más estables para diversificar en dólares?",
];

export default function ChatView({
  session,
  onSendMessage,
  isGenerating,
  streamingContent,
  onStopGeneration,
  errorMessage,
  onClearError,
  hasLivePortfolio = false,
  isLive = true,
  floatingInput = false,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const aiConfig = getAiConfig();
  const provider = aiConfig.activeProvider;
  const activeModel = provider === "groq" ? aiConfig.groqModel : aiConfig.openRouterModel;
  const hasApiKey = provider === "groq" ? Boolean(aiConfig.groqApiKey.trim()) : Boolean(aiConfig.openRouterApiKey.trim());

  // Auto-scroll al final del historial
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingContent]);

  // Click outside para cerrar popover de info
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInfo]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isGenerating) return;

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const messages = session?.messages || [];

  return (
    <div className="flex flex-col h-full min-h-0 bg-finanzar-bg text-finanzar-text overflow-hidden relative">
      {/* Barra superior de estado / contexto */}
      <div className="px-3 sm:px-4 py-1.5 bg-finanzar-bg border-b border-finanzar-borderSubtle flex items-center justify-between text-xs flex-shrink-0 z-10">
        <div className="flex items-center space-x-2 relative">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-finanzar-positive animate-pulse" : "bg-finanzar-accent"}`}
          />
          <span className="font-medium text-finanzar-textMain text-[11px] sm:text-xs">
            {hasLivePortfolio ? "Portfolio & Mercados conectados" : "Mercados en vivo conectados"}
          </span>

          {/* Ícono de información con popover de privacidad y cambio de modelo */}
          <div className="relative inline-flex items-center" ref={infoRef}>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="p-1 rounded-full text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover transition-colors focus-visible:outline-none"
              title="Información de privacidad y modelo"
              aria-label="Información sobre privacidad y modelo"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2.5" />
              </svg>
            </button>

            {showInfo && (
              <div
                className={`absolute top-full mt-2 w-64 sm:w-72 max-w-[calc(100vw-2.5rem)] p-3 bg-finanzar-surface border border-finanzar-border rounded-md shadow-lg z-30 text-xs text-finanzar-text animate-fadeIn ${
                  floatingInput ? "left-0" : "right-0"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-finanzar-primary flex items-center gap-1.5 text-xs">
                    <span>🔒</span>
                    <span>Privacidad & Modelo</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    className="text-finanzar-textSecondary hover:text-finanzar-text text-xs p-0.5"
                    aria-label="Cerrar"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-finanzar-textSecondary leading-relaxed">
                  FinanzAR IA analiza datos del mercado y tu portfolio de forma privada.
                </p>
                <div className="mt-2 pt-2 border-t border-finanzar-borderSubtle flex items-center justify-between">
                  <span className="font-mono text-[10px] text-finanzar-textSecondary truncate max-w-[130px]" title={activeModel}>
                    {provider === "groq" ? "Groq" : "OpenRouter"} · {activeModel.split("/").pop()}
                  </span>
                  <Link
                    to="/account"
                    onClick={() => setShowInfo(false)}
                    className="text-[11px] font-medium text-finanzar-primary hover:text-finanzar-accent hover:underline transition-colors"
                  >
                    Cambiar modelo →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-finanzar-textSecondary">
          <span className="font-mono truncate max-w-[140px] sm:max-w-[200px]" title={activeModel}>
            {provider === "groq" ? "Groq" : "OpenRouter"} · {activeModel.split("/").pop()}
          </span>
        </div>
      </div>

      {/* Alerta si falta configurar clave de API */}
      {!hasApiKey && (
        <div className="p-2.5 bg-finanzar-accentSubtle border-b border-finanzar-accent/30 flex items-start justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-finanzar-accent font-bold mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-finanzar-primary text-xs">Clave de API no configurada</p>
              <p className="text-finanzar-textSecondary text-[11px] mt-0.5">
                Para interactuar con la IA necesitás cargar tu API Key gratuita de Groq u OpenRouter.
              </p>
            </div>
          </div>
          <Link
            to="/account"
            className="px-2.5 py-1 rounded-xs bg-finanzar-primary text-finanzar-surface font-semibold text-[11px] hover:bg-finanzar-primaryHover flex-shrink-0"
          >
            Configurar →
          </Link>
        </div>
      )}

      {/* Alerta de error durante generación */}
      {errorMessage && (
        <div className="p-2.5 bg-finanzar-negativeBg border-b border-finanzar-negativeBorder flex items-center justify-between text-xs text-finanzar-negative flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="text-[11px] sm:text-xs">{errorMessage}</span>
          </div>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-finanzar-textSecondary hover:text-finanzar-negative font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Contenedor de mensajes / historial */}
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 ${floatingInput ? "pb-20 sm:pb-24" : ""}`}>
        {messages.length === 0 && !streamingContent && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto my-auto">
            <div className="w-10 h-10 rounded-full bg-finanzar-surface border border-finanzar-border flex items-center justify-center text-lg mb-2 shadow-xs">
              🤖
            </div>
            <h3 className="font-serif text-base font-bold text-finanzar-primary">FinanzAR Asistente IA</h3>
            <p className="text-[11px] text-finanzar-textSecondary mt-1 leading-relaxed max-w-sm">
              Analizá tu cartera en tiempo real, evaluá alternativas de ahorro en pesos y dólares, y consultá dudas
              económicas o financieras con base en las cotizaciones en vivo.
            </p>

            <div className="mt-4 w-full space-y-1.5 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-finanzar-textSecondary mb-1 text-center">
                Consultas sugeridas
              </p>
              {PROMPT_SUGGESTIONS.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => {
                    if (!isGenerating) void onSendMessage(sug);
                  }}
                  className="w-full text-left p-2 rounded-xs bg-finanzar-surface border border-finanzar-border hover:border-finanzar-accent text-xs text-finanzar-text hover:text-finanzar-primary transition-colors shadow-2xs"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          const rawContent = m.content?.trim() || (isUser ? "" : "(Respuesta sin contenido devuelta por el modelo)");
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-md shadow-xs ${
                  isUser
                    ? "max-w-[85%] sm:max-w-[75%] px-3 py-2 bg-finanzar-primary text-finanzar-surface font-medium"
                    : "max-w-[90%] sm:max-w-[82%] px-3.5 py-2.5 bg-finanzar-surface border border-finanzar-border text-finanzar-text"
                }`}
              >
                {isUser ? (
                  <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed">{rawContent}</p>
                ) : (
                  <MarkdownMessage content={rawContent} />
                )}
              </div>

              <div className="flex items-center space-x-2 mt-0.5 px-1 text-[10px] text-finanzar-textSecondary">
                <span>
                  {new Date(m.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {!isUser && (
                  <button
                    onClick={() => handleCopy(m.id, m.content)}
                    className="hover:text-finanzar-primary transition-colors"
                    title="Copiar respuesta"
                  >
                    {copiadoId === m.id ? "✓ Copiado" : "Copiar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Mensaje en streaming en vivo */}
        {isGenerating && streamingContent && (
          <div className="flex flex-col items-start">
            <div className="max-w-[90%] sm:max-w-[82%] rounded-md px-3.5 py-2.5 shadow-xs bg-finanzar-surface border border-finanzar-border text-finanzar-text">
              <MarkdownMessage content={streamingContent} />
              <span className="inline-block w-1.5 h-3 ml-1 bg-finanzar-accent animate-pulse" />
            </div>
          </div>
        )}

        {/* Indicador de pensamiento mientras no ha llegado el primer token */}
        {isGenerating && !streamingContent && (
          <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-finanzar-surface border border-finanzar-border rounded-md w-24 text-[11px] text-finanzar-textSecondary shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce [animation-delay:0.4s]" />
            <span className="text-[10px]">Pensando</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de chat: flotante o anclado según la vista */}
      {floatingInput ? (
        <div className="sticky bottom-2 sm:bottom-3 inset-x-0 px-3 sm:px-4 max-w-2xl mx-auto w-full z-20 pointer-events-none">
          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto bg-finanzar-surface/95 backdrop-blur-md border border-finanzar-border rounded-lg shadow-md p-1.5 sm:p-2 transition-shadow hover:shadow-lg focus-within:border-finanzar-accent"
          >
            <div className="relative flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu consulta sobre portfolio o mercados… (Enter para enviar)"
                disabled={isGenerating || !hasApiKey}
                className="flex-1 bg-transparent border-none text-xs sm:text-[13px] text-finanzar-text placeholder-finanzar-textSecondary/50 focus:outline-none resize-none max-h-28 disabled:opacity-50 py-1 px-2"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="px-2.5 py-1 rounded-md bg-finanzar-negative text-finanzar-surface text-xs font-semibold hover:opacity-90 flex-shrink-0 transition-opacity"
                  title="Detener respuesta"
                >
                  ■ Detener
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim() || !hasApiKey}
                  className="p-1.5 rounded-md bg-finanzar-primary text-finanzar-surface disabled:opacity-30 hover:bg-finanzar-primaryHover transition-colors flex-shrink-0 shadow-xs"
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="p-2 sm:p-2.5 bg-finanzar-surface border-t border-finanzar-border flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <div className="relative flex items-end gap-1.5 bg-finanzar-bg border border-finanzar-border rounded-md px-2.5 py-1.5 focus-within:border-finanzar-accent focus-within:ring-1 focus-within:ring-finanzar-accent">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu consulta sobre portfolio o mercados… (Enter para enviar)"
                disabled={isGenerating || !hasApiKey}
                className="flex-1 bg-transparent border-none text-xs text-finanzar-text placeholder-finanzar-textSecondary/50 focus:outline-none resize-none max-h-24 disabled:opacity-50"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="px-2 py-1 rounded-xs bg-finanzar-negative text-finanzar-surface text-xs font-semibold hover:opacity-90 flex-shrink-0 transition-opacity"
                  title="Detener respuesta"
                >
                  ■ Detener
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim() || !hasApiKey}
                  className="p-1.5 rounded-xs bg-finanzar-primary text-finanzar-surface disabled:opacity-30 hover:bg-finanzar-primaryHover transition-colors flex-shrink-0 shadow-xs"
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
