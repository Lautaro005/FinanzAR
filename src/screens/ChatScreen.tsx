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
import { getAiConfig } from "../lib/aiConfig";
import ChatView from "../components/chat/ChatView";

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const aiConfig = getAiConfig();

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
    setMobileSidebarOpen(false);
  };

  const handleNewChat = () => {
    const nueva = crearNuevaSesionChat("Nueva consulta");
    setSessions(loadChatSessions());
    setActiveIdState(nueva.id);
    setMobileSidebarOpen(false);
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-[calc(100vh-5rem)] min-h-[550px] flex flex-col">
      {/* Barra superior de la pantalla */}
      <div className="flex items-center justify-between pb-3 border-b border-finanzar-borderSubtle mb-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Botón menú para móvil (abre/cierra el sidebar de historial) */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="md:hidden p-1.5 rounded-xs border border-finanzar-border text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surface"
            aria-label="Abrir historial de consultas"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-finanzar-primary flex items-center gap-2">
              <span>Finanz<span className="text-finanzar-accent">AR</span> IA</span>
              <span className="text-xs font-sans font-medium px-2 py-0.5 rounded-full bg-finanzar-bg border border-finanzar-borderSubtle text-finanzar-textSecondary hidden sm:inline">
                Beta
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            to="/portfolio"
            className="hidden sm:inline-flex items-center space-x-1 text-finanzar-textSecondary hover:text-finanzar-primary"
          >
            <span>Ver mi Portfolio →</span>
          </Link>
          <Link
            to="/account"
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-finanzar-surface border border-finanzar-border hover:border-finanzar-accent text-finanzar-primary font-medium text-xs shadow-xs transition-colors"
          >
            <span>⚙ Configurar IA</span>
          </Link>
        </div>
      </div>

      {/* Contenedor dividido en 2 columnas (Sidebar a la izquierda + Chat a la derecha) */}
      <div className="flex-1 flex bg-finanzar-surface border border-finanzar-border rounded-lg shadow-sm overflow-hidden relative">
        {/* Sidebar izquierdo: Historial de chats y botón nuevo */}
        <aside
          className={`w-72 bg-finanzar-surface border-r border-finanzar-border flex flex-col flex-shrink-0 z-20 transition-transform md:translate-x-0 ${
            mobileSidebarOpen
              ? "absolute inset-y-0 left-0 shadow-xl translate-x-0"
              : "absolute inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0"
          }`}
        >
          {/* Cabecera del sidebar con botón + Nuevo chat */}
          <div className="p-3 border-b border-finanzar-border bg-finanzar-bg flex items-center justify-between gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 py-2 px-3 rounded-xs bg-finanzar-primary hover:bg-finanzar-primaryHover text-finanzar-surface text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>+</span>
              <span>Nuevo chat</span>
            </button>

            {mobileSidebarOpen && (
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="md:hidden p-1.5 text-finanzar-textSecondary hover:text-finanzar-primary"
                aria-label="Cerrar panel de historial"
              >
                ✕
              </button>
            )}
          </div>

          {/* Listado de chats anteriores */}
          <div className="flex-1 overflow-y-auto divide-y divide-finanzar-borderSubtle">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-finanzar-textSecondary">
                Sin conversaciones previas. Escribí una consulta para comenzar.
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`p-3 flex items-center justify-between gap-2 cursor-pointer transition-colors group ${
                      isActive ? "bg-finanzar-accentSubtle/50 font-medium" : "hover:bg-finanzar-surfaceHover"
                    }`}
                  >
                    <div className="truncate flex-1 min-w-0">
                      <p className={`text-xs truncate ${isActive ? "text-finanzar-primary font-semibold" : "text-finanzar-text"}`}>
                        {s.title}
                      </p>
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

          {/* Pie del sidebar con modelo activo */}
          <div className="p-3 border-t border-finanzar-border bg-finanzar-bg text-xs flex flex-col gap-1">
            <span className="text-[11px] text-finanzar-textSecondary">
              Proveedor: <strong className="text-finanzar-primary uppercase">{aiConfig.activeProvider}</strong>
            </span>
            <span className="font-mono text-[10px] text-finanzar-textSecondary truncate">
              {aiConfig.activeProvider === "groq" ? aiConfig.groqModel : aiConfig.openRouterModel}
            </span>
          </div>
        </aside>

        {/* Overlay backdrop en móviles al abrir el sidebar */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden absolute inset-0 bg-finanzar-primary/20 z-10"
          />
        )}

        {/* Área principal del chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>
      </div>
    </main>
  );
}
