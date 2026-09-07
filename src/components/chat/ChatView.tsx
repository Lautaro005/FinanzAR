import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChatSession } from "../../lib/aiChat";
import { getAiConfig } from "../../lib/aiConfig";
import MarkdownMessage from "./MarkdownMessage";

const PROMPT_SUGGESTIONS = [
  "📊 Analizá la diversificación y riesgo de mi portfolio",
  "🏦 ¿Conviene renovar un plazo fijo o invertir en FCI hoy?",
  "💵 ¿Cómo está la brecha cambiaria (MEP vs Blue vs Oficial)?",
  "📈 Explicame la diferencia entre TNA y TEA para mis ahorros",
];

export interface ChatViewProps {
  session: ChatSession | null;
  onSendMessage: (text: string) => Promise<void>;
  isGenerating: boolean;
  streamingContent: string;
  onStopGeneration?: () => void;
  errorMessage: string | null;
  onClearError?: () => void;
  hasLivePortfolio?: boolean;
  isLive?: boolean;
  floatingInput?: boolean;
}

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
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aiConfig = getAiConfig();
  const provider = aiConfig.activeProvider;
  const activeModel = provider === "groq" ? aiConfig.groqModel : aiConfig.openRouterModel;
  const hasApiKey = provider === "groq" ? !!aiConfig.groqApiKey.trim() : !!aiConfig.openRouterApiKey.trim();

  // Cerrar popover de info al hacer clic fuera
  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  // Scroll al final al recibir nuevos mensajes o fragmentos del stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, streamingContent, isGenerating]);

  // Ajustar altura del textarea automáticamente
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const texto = inputText.trim();
    if (!texto || isGenerating) return;
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSendMessage(texto);
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
    <div className="flex flex-col h-full bg-finanzar-bg text-finanzar-text overflow-hidden relative">
      {/* Barra superior de estado / contexto */}
      <div className="px-4 py-2 bg-finanzar-bg border-b border-finanzar-borderSubtle flex items-center justify-between text-xs flex-shrink-0 z-10">
        <div className="flex items-center space-x-2 relative">
          <span
            className={`w-2 h-2 rounded-full ${isLive ? "bg-finanzar-positive animate-pulse" : "bg-finanzar-accent"}`}
          />
          <span className="font-medium text-finanzar-textMain">
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
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 p-3.5 bg-finanzar-surface border border-finanzar-border rounded-md shadow-lg z-30 text-xs text-finanzar-text animate-fadeIn">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-finanzar-primary flex items-center gap-1.5">
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
                <div className="mt-2.5 pt-2 border-t border-finanzar-borderSubtle flex items-center justify-between">
                  <span className="font-mono text-[10px] text-finanzar-textSecondary truncate max-w-[140px]" title={activeModel}>
                    {provider === "groq" ? "Groq" : "OpenRouter"} · {activeModel.split("/").pop()}
                  </span>
                  <Link
                    to="/account"
                    onClick={() => setShowInfo(false)}
                    className="text-[11px] font-medium text-finanzar-primary hover:text-finanzar-accent hover:underline transition-colors"
                  >
                    Cambiar modelo / proveedor →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-finanzar-textSecondary">
          <span className="font-mono truncate max-w-[150px] sm:max-w-[220px]" title={activeModel}>
            {provider === "groq" ? "Groq" : "OpenRouter"} · {activeModel.split("/").pop()}
          </span>
        </div>
      </div>

      {/* Alerta si falta configurar clave de API */}
      {!hasApiKey && (
        <div className="p-3 bg-finanzar-accentSubtle border-b border-finanzar-accent/30 flex items-start justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-start gap-2">
            <span className="text-finanzar-accent font-bold mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-finanzar-primary">Clave de API no configurada</p>
              <p className="text-finanzar-textSecondary mt-0.5">
                Para interactuar con la IA necesitás cargar tu API Key gratuita de Groq u OpenRouter.
              </p>
            </div>
          </div>
          <Link
            to="/account"
            className="px-2.5 py-1 rounded-xs bg-finanzar-primary text-finanzar-surface font-semibold text-[11px] hover:bg-finanzar-primaryHover flex-shrink-0"
          >
            Configurar en Mi cuenta →
          </Link>
        </div>
      )}

      {/* Alerta de error si ocurrió alguno durante la llamada */}
      {errorMessage && (
        <div className="p-3 bg-finanzar-negativeBg border-b border-finanzar-negativeBorder flex items-center justify-between text-xs text-finanzar-negative flex-shrink-0">
          <span className="truncate pr-2">{errorMessage}</span>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-finanzar-textSecondary hover:text-finanzar-negative font-bold"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Contenedor de mensajes / historial */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${floatingInput ? "pb-28 sm:pb-32" : ""}`}>
        {messages.length === 0 && !streamingContent && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-finanzar-surface border border-finanzar-border flex items-center justify-center text-xl mb-3 shadow-xs">
              🤖
            </div>
            <h3 className="font-serif text-lg font-bold text-finanzar-primary">FinanzAR Asistente IA</h3>
            <p className="text-xs text-finanzar-textSecondary mt-1 leading-relaxed">
              Analizá tu cartera en tiempo real, evaluá alternativas de ahorro en pesos y dólares, y consultá dudas
              económicas o financieras con base en las cotizaciones en vivo.
            </p>

            <div className="mt-6 w-full space-y-2 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-finanzar-textSecondary mb-2 text-center">
                Consultas sugeridas
              </p>
              {PROMPT_SUGGESTIONS.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  onClick={() => {
                    if (!isGenerating) void onSendMessage(sug);
                  }}
                  className="w-full text-left p-2.5 rounded-xs bg-finanzar-surface border border-finanzar-border hover:border-finanzar-accent text-xs text-finanzar-text hover:text-finanzar-primary transition-colors shadow-xs"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-md p-3.5 shadow-xs ${
                  isUser
                    ? "bg-finanzar-primary text-finanzar-surface font-medium"
                    : "bg-finanzar-surface border border-finanzar-border text-finanzar-text"
                }`}
              >
                {isUser ? (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : (
                  <MarkdownMessage content={m.content} />
                )}
              </div>

              <div className="flex items-center space-x-2 mt-1 px-1 text-[10px] text-finanzar-textSecondary">
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
            <div className="max-w-[92%] sm:max-w-[85%] rounded-md p-3.5 shadow-xs bg-finanzar-surface border border-finanzar-border text-finanzar-text">
              <MarkdownMessage content={streamingContent} />
              <span className="inline-block w-1.5 h-3 ml-1 bg-finanzar-accent animate-pulse" />
            </div>
          </div>
        )}

        {/* Indicador de pensamiento mientras no ha llegado el primer token */}
        {isGenerating && !streamingContent && (
          <div className="flex items-center space-x-2 p-3 bg-finanzar-surface border border-finanzar-border rounded-md w-28 text-xs text-finanzar-textSecondary">
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent animate-bounce [animation-delay:0.4s]" />
            <span className="text-[11px]">Pensando</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input de chat: flotante o anclado según la vista */}
      {floatingInput ? (
        <div className="sticky bottom-4 inset-x-0 px-4 max-w-3xl mx-auto w-full z-20 pointer-events-none">
          <form
            onSubmit={handleSubmit}
            className="pointer-events-auto bg-finanzar-surface/95 backdrop-blur-md border border-finanzar-border rounded-xl shadow-lg p-2 sm:p-2.5 transition-shadow hover:shadow-xl focus-within:border-finanzar-accent"
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
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-finanzar-text placeholder-finanzar-textSecondary/50 focus:outline-none resize-none max-h-32 disabled:opacity-50 py-1.5 px-2"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="px-3 py-1.5 rounded-lg bg-finanzar-negative text-finanzar-surface text-xs font-semibold hover:opacity-90 flex-shrink-0 transition-opacity"
                  title="Detener respuesta"
                >
                  ■ Detener
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim() || !hasApiKey}
                  className="p-2 rounded-lg bg-finanzar-primary text-finanzar-surface disabled:opacity-30 hover:bg-finanzar-primaryHover transition-colors flex-shrink-0 shadow-xs"
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="p-3 bg-finanzar-surface border-t border-finanzar-border flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="relative flex items-end gap-2 bg-finanzar-bg border border-finanzar-border rounded-md px-3 py-2 focus-within:border-finanzar-accent focus-within:ring-1 focus-within:ring-finanzar-accent">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribí tu consulta sobre portfolio o mercados… (Enter para enviar)"
                disabled={isGenerating || !hasApiKey}
                className="flex-1 bg-transparent border-none text-xs sm:text-sm text-finanzar-text placeholder-finanzar-textSecondary/50 focus:outline-none resize-none max-h-32 disabled:opacity-50"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="px-2.5 py-1.5 rounded-xs bg-finanzar-negative text-finanzar-surface text-xs font-semibold hover:opacity-90 flex-shrink-0 transition-opacity"
                  title="Detener respuesta"
                >
                  ■ Detener
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim() || !hasApiKey}
                  className="p-1.5 rounded-xs bg-finanzar-primary text-finanzar-surface disabled:opacity-30 hover:bg-finanzar-primaryHover transition-colors flex-shrink-0"
                  aria-label="Enviar mensaje"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
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
