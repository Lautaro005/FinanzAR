import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePortfolio } from "../../hooks/usePortfolio";
import { Instrumento } from "../../types";
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
} from "../../lib/aiChat";
import ChatView from "./ChatView";

export default function FloatingChatWidget({
  instruments,
  isLive = true,
}: {
  instruments: Instrumento[];
  isLive?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const portfolio = usePortfolio(instruments, isLive);

  // No renderizar el botón flotante si estamos en la ruta dedicada /chat
  const enRutaChat = location.pathname.startsWith("/chat");

  const [isOpen, setIsOpen] = useState(false);
  // layout: "floating" (default) | "sidebar" (desktop) | "fullscreen" (tablet / mobile)
  const [layoutMode, setLayoutMode] = useState<"floating" | "sidebar" | "fullscreen">("floating");
  const [showHistory, setShowHistory] = useState(false);

  // Sesiones de chat locales
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadChatSessions());
  const [activeId, setActiveIdState] = useState<string | null>(() => getActiveChatId());

  // Estado de streaming / generación
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Detectar ancho de pantalla para ajustar comportamiento según el dispositivo
  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;

  // En mobile siempre debe ser fullscreen como pide la especificación:
  // "en mobile view seria pantalla completa porque no tiene sentido hacerlo flotante"
  const currentEffectiveMode = isMobile ? "fullscreen" : layoutMode;

  // Sincronizar sesiones si cambian
  useEffect(() => {
    const cargadas = loadChatSessions();
    setSessions(cargadas);
    if (!activeId && cargadas.length > 0) {
      setActiveIdState(cargadas[0].id);
      setActiveChatId(cargadas[0].id);
    }
  }, [isOpen, activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  const handleSelectSession = (id: string) => {
    setActiveIdState(id);
    setActiveChatId(id);
    setShowHistory(false);
  };

  const handleNewChat = () => {
    const nueva = crearNuevaSesionChat("Nueva consulta");
    setSessions(loadChatSessions());
    setActiveIdState(nueva.id);
    setShowHistory(false);
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

  const toggleLayoutMode = () => {
    if (isDesktop) {
      setLayoutMode((prev) => (prev === "sidebar" ? "floating" : "sidebar"));
    } else if (isTablet) {
      setLayoutMode((prev) => (prev === "fullscreen" ? "floating" : "fullscreen"));
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

    // Construir prompt del sistema con el portfolio y mercados en vivo
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
      ...sesionActual.messages
        .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content.trim() })),
      { role: "user" as const, content: text.trim() },
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

  if (enRutaChat) {
    return null;
  }

  return (
    <>
      {/* Botón flotante abajo a la derecha */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2.5 px-4 py-3 bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface rounded-full shadow-lg border border-finanzar-accent/40 transition-all duration-200 group hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent"
          aria-label="Abrir asistente de Chat IA"
          title="FinanzAR IA · Consultas sobre tu portfolio y mercados"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-finanzar-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-finanzar-accent" />
          </span>
          <span className="font-semibold text-xs tracking-wide">Chat IA</span>
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-finanzar-accent" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Ventana de Chat */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-finanzar-surface border border-finanzar-border shadow-2xl transition-all duration-200 overflow-hidden ${
            currentEffectiveMode === "fullscreen"
              ? "inset-0 rounded-none"
              : currentEffectiveMode === "sidebar"
              ? "top-0 right-0 bottom-0 w-[440px] max-w-full rounded-none border-y-0 border-r-0 border-l"
              : "bottom-5 right-5 w-[420px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[calc(100vh-3.5rem)] rounded-lg"
          }`}
        >
          {/* Header del Chat */}
          <header className="px-4 py-3 bg-finanzar-surface border-b border-finanzar-border flex items-center justify-between flex-shrink-0 select-none">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-7 h-7 rounded-full bg-finanzar-bg border border-finanzar-border flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                🤖
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-serif font-bold text-sm text-finanzar-primary leading-tight truncate">
                    Finanz<span className="text-finanzar-accent">AR</span> IA
                  </h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-finanzar-positive animate-pulse" />
                </div>
                <p className="text-[10px] text-finanzar-textSecondary truncate">
                  {activeSession ? activeSession.title : "Asistente patrimonial"}
                </p>
              </div>
            </div>

            {/* Acciones a la derecha del Header */}
            <div className="flex items-center space-x-1 text-finanzar-textSecondary">
              {/* Botón de Historial */}
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={`p-1.5 rounded-xs transition-colors hover:text-finanzar-primary hover:bg-finanzar-surfaceHover ${
                  showHistory ? "bg-finanzar-bg text-finanzar-primary font-bold" : ""
                }`}
                title="Historial de consultas (local)"
                aria-label="Ver historial de chats"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 15" strokeLinecap="round" />
                </svg>
              </button>

              {/* Botón para cambiar disposición:
                  - En desktop: cambiar entre sidebar y ventana flotante
                  - En tablet: cambiar entre pantalla completa y ventana flotante */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={toggleLayoutMode}
                  className="p-1.5 rounded-xs hover:text-finanzar-primary hover:bg-finanzar-surfaceHover transition-colors"
                  title={
                    isDesktop
                      ? currentEffectiveMode === "sidebar"
                        ? "Restaurar a ventana flotante"
                        : "Acoplar a panel lateral (sidebar)"
                      : currentEffectiveMode === "fullscreen"
                      ? "Restaurar a ventana flotante"
                      : "Ver a pantalla completa"
                  }
                  aria-label="Cambiar modo de vista"
                >
                  {isDesktop ? (
                    currentEffectiveMode === "sidebar" ? (
                      /* Icono ventana flotante */
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <rect x="11" y="9" width="8" height="8" rx="1" />
                      </svg>
                    ) : (
                      /* Icono sidebar lateral */
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                      </svg>
                    )
                  ) : currentEffectiveMode === "fullscreen" ? (
                    /* Icono contraer de fullscreen */
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    /* Icono expandir a fullscreen */
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}

              {/* Botón Cerrar */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowHistory(false);
                }}
                className="p-1.5 rounded-xs hover:text-finanzar-negative hover:bg-finanzar-surfaceHover transition-colors ml-0.5"
                title="Cerrar chat"
                aria-label="Cerrar chat"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </header>

          {/* Cuerpo principal o Panel de Historial */}
          <div className="relative flex-1 overflow-hidden">
            {/* Si el usuario NO ha iniciado sesión, mostrar requerimiento de autenticación */}
            {!usuario ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-finanzar-bg">
                <div className="w-14 h-14 rounded-full bg-finanzar-surface border border-finanzar-border flex items-center justify-center text-2xl mb-4 shadow-sm">
                  🔒
                </div>
                <h4 className="font-serif text-lg font-bold text-finanzar-primary">
                  Iniciá sesión para usar FinanzAR IA
                </h4>
                <p className="text-xs text-finanzar-textSecondary mt-2 max-w-xs leading-relaxed">
                  El chat inteligente analiza tu cartera patrimonial y las cotizaciones del mercado en vivo.
                  Esta función es exclusiva para usuarios con cuenta.
                </p>
                <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/account");
                    }}
                    className="w-full py-2.5 px-4 bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface text-xs font-semibold rounded-xs shadow-xs transition-colors"
                  >
                    Iniciar sesión o Crear cuenta
                  </button>
                </div>
              </div>
            ) : showHistory ? (
              /* Panel deslizable de Historial de Chats */
              <div className="h-full flex flex-col bg-finanzar-surface overflow-hidden">
                <div className="p-3 border-b border-finanzar-borderSubtle flex items-center justify-between bg-finanzar-bg">
                  <span className="text-xs font-semibold text-finanzar-primary uppercase tracking-wider">
                    Historial de Consultas
                  </span>
                  <button
                    onClick={handleNewChat}
                    className="px-2.5 py-1 rounded-xs bg-finanzar-primary text-finanzar-surface text-xs font-medium hover:bg-finanzar-primaryHover transition-colors"
                  >
                    + Nuevo chat
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-finanzar-borderSubtle">
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-finanzar-textSecondary">
                      No tenés consultas anteriores guardadas.
                    </div>
                  ) : (
                    sessions.map((s) => {
                      const isActive = s.id === activeId;
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectSession(s.id)}
                          className={`p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            isActive ? "bg-finanzar-accentSubtle/40 font-medium" : "hover:bg-finanzar-surfaceHover"
                          }`}
                        >
                          <div className="truncate flex-1">
                            <p className="text-xs text-finanzar-text truncate">{s.title}</p>
                            <span className="text-[10px] text-finanzar-textSecondary">
                              {new Date(s.updatedAt).toLocaleDateString("es-AR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            className="p-1 text-finanzar-textSecondary hover:text-finanzar-negative transition-colors"
                            title="Eliminar consulta"
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

                <div className="p-3 border-t border-finanzar-border bg-finanzar-bg text-center">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-xs text-finanzar-primary font-medium hover:underline"
                  >
                    ← Volver al chat actual
                  </button>
                </div>
              </div>
            ) : (
              /* Vista del Chat */
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
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
