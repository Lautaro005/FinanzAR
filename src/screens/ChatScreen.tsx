import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePortfolio } from "../hooks/usePortfolio";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Instrumento } from "../types";
import {
  ChatSession,
  agregarMensajeASesion,
  construirPromptSistema,
  crearNuevaSesionChat,
  eliminarSesionChat,
  enviarMensajeChat,
  getActiveChatId,
  loadChatSessions,
  setActiveChatId,
} from "../lib/aiChat";
import ChatView from "../components/chat/ChatView";

const accionClass =
  "inline-block px-3 py-1 rounded-sm text-xs font-medium transition-colors text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent";

export default function ChatScreen({
  instruments,
  isLive = true,
}: {
  instruments: Instrumento[];
  isLive?: boolean;
}) {
  useDocumentMeta(
    "Chat IA · Asistente Patrimonial",
    "Asistente con Inteligencia Artificial conectado a tu portfolio y al mercado financiero argentino y global en tiempo real.",
    "/chat"
  );

  const navigate = useNavigate();
  const { usuario } = useAuth();
  const portfolio = usePortfolio(instruments, isLive);

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadChatSessions());
  const [activeId, setActiveIdState] = useState<string | null>(() => getActiveChatId());
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLLIElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cerrar dropdown de historial al hacer clic fuera
  useEffect(() => {
    if (!historyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [historyOpen]);

  // Asegurar que si hay sesiones exista una activa al entrar
  useEffect(() => {
    const cargadas = loadChatSessions();
    setSessions(cargadas);
    if (!activeId && cargadas.length > 0) {
      setActiveIdState(cargadas[0].id);
      setActiveChatId(cargadas[0].id);
    }
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  const handleSelectSession = (id: string) => {
    setActiveIdState(id);
    setActiveChatId(id);
    setHistoryOpen(false);
  };

  const handleNewChat = () => {
    const nueva = crearNuevaSesionChat("Nueva consulta");
    setSessions(loadChatSessions());
    setActiveIdState(nueva.id);
    setHistoryOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    eliminarSesionChat(id);
    const updated = loadChatSessions();
    setSessions(updated);
    if (activeId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveIdState(nextId);
      setActiveChatId(nextId);
    }
  };

  const handleSendMessage = async (text: string) => {
    setErrorMessage(null);
    let sesionActual = activeSession;
    if (!sesionActual) {
      sesionActual = crearNuevaSesionChat(text.slice(0, 36));
      setSessions(loadChatSessions());
      setActiveIdState(sesionActual.id);
    }

    const userMsg = {
      id: `${Date.now()}-u`,
      role: "user" as const,
      content: text,
      timestamp: new Date().toISOString(),
    };

    agregarMensajeASesion(sesionActual.id, userMsg);
    setSessions(loadChatSessions());

    // Prompt enriquecido con portfolio y mercado
    const systemPrompt = construirPromptSistema({
      usuarioNombre: usuario?.nombre || "Inversor",
      totales: portfolio.totales,
      posiciones: portfolio.posiciones,
      plazosFijos: portfolio.plazosFijos,
      fondosComunes: portfolio.fondosValuados,
      efectivoActual: portfolio.efectivoActual,
      dolar: portfolio.dolar,
      monedaVista: portfolio.config.monedaVista,
      instruments,
      isLive,
    });

    const conversationHistory = [
      { role: "system" as const, content: systemPrompt },
      ...sesionActual.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    setIsGenerating(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const completeAssistantText = await enviarMensajeChat({
        messages: conversationHistory,
        onChunk: (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        signal: controller.signal,
      });

      const assistantMsg = {
        id: `${Date.now()}-a`,
        role: "assistant" as const,
        content: completeAssistantText,
        timestamp: new Date().toISOString(),
      };

      agregarMensajeASesion(sesionActual.id, assistantMsg);
      setSessions(loadChatSessions());
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setErrorMessage(err.message || "Error al conectar con la IA.");
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      if (streamingContent && activeSession) {
        const partialMsg = {
          id: `${Date.now()}-a-partial`,
          role: "assistant" as const,
          content: streamingContent + " (respuesta interrumpida)",
          timestamp: new Date().toISOString(),
        };
        agregarMensajeASesion(activeSession.id, partialMsg);
        setSessions(loadChatSessions());
        setStreamingContent("");
      }
    }
  };

  // Cartel si el usuario NO está registrado ni ha iniciado sesión
  if (!usuario) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[75vh] flex items-center justify-center">
        <div className="w-full bg-finanzar-surface border border-finanzar-border rounded-lg p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-finanzar-bg border border-finanzar-border flex items-center justify-center text-3xl mx-auto mb-5 shadow-xs">
            🔒
          </div>
          <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent block mb-1">
            Función Exclusiva
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-finanzar-primary">
            Iniciá sesión para usar FinanzAR IA
          </h1>
          <p className="text-sm text-finanzar-textSecondary mt-3 max-w-lg mx-auto leading-relaxed">
            El sistema de Chat con Inteligencia Artificial se conecta automáticamente con tu portfolio personal y con
            las cotizaciones de mercado en tiempo real para brindarte análisis patrimoniales y respuestas a medida.
            Para acceder, necesitás una cuenta activa en FinanzAR.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/account")}
              className="w-full sm:w-auto px-6 py-2.5 bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface text-sm font-semibold rounded-xs shadow-sm transition-colors"
            >
              Iniciar sesión o Crear cuenta
            </button>
            <Link
              to="/portfolio"
              className="w-full sm:w-auto px-5 py-2.5 bg-finanzar-bg hover:bg-finanzar-surfaceHover border border-finanzar-border text-finanzar-primary text-sm font-medium rounded-xs transition-colors"
            >
              Ir a mi Portfolio
            </Link>
          </div>

          <p className="text-xs text-finanzar-textSecondary mt-6">
            La creación de cuenta es 100% gratuita y te permite sincronizar tu portfolio en todos tus dispositivos.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 flex flex-col bg-finanzar-bg min-h-[calc(100vh-4rem)]">
      {/* Barra de acciones de Chat IA, pegada debajo del header (mismo formato que Portfolio) */}
      <div className="w-full border-b border-finanzar-borderSubtle bg-finanzar-bg sticky top-16 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 sm:gap-x-2 gap-y-1 text-xs font-medium">
            <li>
              <button
                type="button"
                onClick={handleNewChat}
                className={`${accionClass} text-finanzar-primary font-semibold`}
              >
                + Nuevo chat
              </button>
            </li>
            <li>
              <Link to="/portfolio" className={accionClass}>
                Ver mi portfolio
              </Link>
            </li>
            <li>
              <Link to="/account" className={accionClass}>
                ⚙ Configurar IA
              </Link>
            </li>
            <li>
              <span className="text-finanzar-borderStrong select-none">·</span>
            </li>
            <li className="relative" ref={historyRef}>
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className={`${accionClass} inline-flex items-center gap-1.5 ${
                  historyOpen ? "bg-finanzar-surfaceHover text-finanzar-primary" : ""
                }`}
                aria-haspopup="true"
                aria-expanded={historyOpen}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-finanzar-textSecondary" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" strokeLinecap="round" />
                </svg>
                <span>Historial</span>
                {sessions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-finanzar-surface border border-finanzar-border text-[10px] text-finanzar-textSecondary font-mono">
                    {sessions.length}
                  </span>
                )}
                <svg
                  viewBox="0 0 24 24"
                  className={`w-3 h-3 transition-transform text-finanzar-textSecondary ${
                    historyOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Dropdown propio de historial de chats sin JS externo */}
              {historyOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-1.5 w-72 sm:w-80 bg-finanzar-surface border border-finanzar-border rounded-md shadow-lg py-1 z-30 max-h-80 overflow-y-auto divide-y divide-finanzar-borderSubtle animate-fadeIn">
                  <div className="p-2.5 bg-finanzar-bg flex items-center justify-between text-[11px] font-semibold text-finanzar-textSecondary uppercase tracking-wider">
                    <span>Conversaciones guardadas</span>
                    <button
                      onClick={() => {
                        handleNewChat();
                        setHistoryOpen(false);
                      }}
                      className="text-finanzar-primary hover:underline lowercase font-normal"
                    >
                      + nueva
                    </button>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-finanzar-textSecondary">
                      Sin conversaciones guardadas.
                    </div>
                  ) : (
                    sessions.map((s) => {
                      const isActive = s.id === activeId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleSelectSession(s.id);
                            setHistoryOpen(false);
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors group ${
                            isActive
                              ? "bg-finanzar-accentSubtle/50 font-medium text-finanzar-primary"
                              : "hover:bg-finanzar-surfaceHover text-finanzar-text"
                          }`}
                        >
                          <div className="truncate flex-1 min-w-0">
                            <p className="text-xs truncate">{s.title}</p>
                            <span className="text-[10px] text-finanzar-textSecondary block mt-0.5">
                              {new Date(s.updatedAt).toLocaleDateString("es-AR", {
                                day: "numeric",
                                month: "short",
                              })}
                              {" · "}
                              {new Date(s.updatedAt).toLocaleTimeString("es-AR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            className="p-1 text-finanzar-textSecondary hover:text-finanzar-negative opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar conversación"
                            aria-label="Eliminar conversación"
                          >
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* Contenedor del Chat que ocupa la pantalla completa de inicio a fin con un solo fondo */}
      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto h-[calc(100vh-7.5rem)] min-h-[500px]">
        <ChatView
          session={activeSession}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          streamingContent={streamingContent}
          onStopGeneration={handleStopGeneration}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          hasLivePortfolio={portfolio.tieneDatos}
          isLive={isLive}
          floatingInput={true}
        />
      </div>
    </main>
  );
}
