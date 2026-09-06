import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  AiConfig,
  AiModelInfo,
  DEFAULT_GROQ_MODELS,
  fetchGroqModelsWithStatus,
  fetchOpenRouterModels,
  getAiConfig,
  saveAiConfig,
} from "../../lib/aiConfig";
import { inputClass } from "../portfolio/Modal";

/**
 * Dropdown personalizado (Tailwind puro, sin <select> de HTML nativo)
 * para seleccionar el modelo de IA activo. Incluye buscador interno y soporte
 * de click outside.
 */
function CustomModelDropdown({
  models,
  selectedModelId,
  onSelect,
  loading = false,
  emptyMessage = "No se encontraron modelos.",
}: {
  models: AiModelInfo[];
  selectedModelId: string;
  onSelect: (modelId: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cerrar al clickear afuera
  useEffect(() => {
    if (!abierto) return;
    const clickAfuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", clickAfuera);
    return () => document.removeEventListener("mousedown", clickAfuera);
  }, [abierto]);

  // Enfocar el input de búsqueda al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setBusqueda("");
    }
  }, [abierto]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [models, busqueda]);

  const modeloActual = useMemo(
    () => models.find((m) => m.id === selectedModelId),
    [models, selectedModelId]
  );

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Botón trigger */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs bg-finanzar-surface border rounded-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
          abierto
            ? "border-finanzar-accent ring-1 ring-finanzar-accent"
            : "border-finanzar-border hover:border-finanzar-borderStrong"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {loading ? (
            <span className="text-finanzar-textMuted italic">Cargando modelos…</span>
          ) : modeloActual ? (
            <>
              <span className="font-mono text-finanzar-textMain truncate">{modeloActual.name}</span>
              {modeloActual.isFree && (
                <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-semibold tracking-wider uppercase bg-finanzar-positiveBg text-finanzar-positive border border-finanzar-positiveBorder flex-shrink-0">
                  Gratis
                </span>
              )}
            </>
          ) : selectedModelId ? (
            <span className="font-mono text-finanzar-textMain truncate">{selectedModelId}</span>
          ) : (
            <span className="text-finanzar-textMuted">Seleccionar un modelo…</span>
          )}
        </div>

        <svg
          className={`w-4 h-4 text-finanzar-textSecondary flex-shrink-0 transition-transform duration-150 ${
            abierto ? "transform rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 8l4 4 4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Menú desplegable */}
      {abierto && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-40 bg-finanzar-surface border border-finanzar-border rounded-md shadow-xl overflow-hidden animate-fadeIn"
        >
          {/* Buscador interno */}
          <div className="p-2 border-b border-finanzar-borderSubtle bg-finanzar-bg/50">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={`Buscar entre ${models.length} modelos…`}
                className="w-full px-2.5 py-1.5 text-xs bg-finanzar-surface border border-finanzar-border rounded-xs text-finanzar-textMain placeholder-finanzar-textMuted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-finanzar-accent"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-finanzar-textMuted hover:text-finanzar-textMain"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista de opciones */}
          <div className="max-h-56 overflow-y-auto divide-y divide-finanzar-borderSubtle">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-finanzar-textSecondary">
                Consultando modelos en la API…
              </div>
            ) : filtrados.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-finanzar-textMuted">
                {emptyMessage}
              </div>
            ) : (
              filtrados.map((m) => {
                const activo = m.id === selectedModelId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={activo}
                    onClick={() => {
                      onSelect(m.id);
                      setAbierto(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 text-xs transition-colors hover:bg-finanzar-surfaceHover ${
                      activo
                        ? "bg-finanzar-accentSubtle/50 text-finanzar-primary font-medium"
                        : "text-finanzar-textMain"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono truncate">{m.name}</span>
                        {m.isFree && (
                          <span className="px-1.5 py-0.2 rounded-xs text-[9px] font-semibold tracking-wider uppercase bg-finanzar-positiveBg text-finanzar-positive border border-finanzar-positiveBorder flex-shrink-0">
                            Gratis
                          </span>
                        )}
                      </div>
                      {m.name !== m.id && (
                        <p className="font-mono text-[10px] text-finanzar-textMuted truncate mt-0.5">
                          {m.id}
                        </p>
                      )}
                    </div>
                    {activo && (
                      <span className="text-finanzar-accent font-bold text-sm flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Contenedor "API Keys" para Groq y OpenRouter.
 * Aparece en /account debajo de "Sincronización del portfolio" (solo usuarios logueados).
 * Dos columnas: izquierda selector de proveedor (Groq / OpenRouter), derecha API key y dropdown de modelos.
 */
export default function ApiKeysCard() {
  const [config, setConfig] = useState<AiConfig>(getAiConfig);
  const [mostrarKey, setMostrarKey] = useState(false);

  // Modelos de Groq y estado de conexión
  const [groqModels, setGroqModels] = useState<AiModelInfo[]>(DEFAULT_GROQ_MODELS);
  const [cargandoGroq, setCargandoGroq] = useState(false);
  const [groqIsLive, setGroqIsLive] = useState(false);
  const [groqError, setGroqError] = useState<string | null>(null);

  // Modelos de OpenRouter
  const [openRouterModels, setOpenRouterModels] = useState<AiModelInfo[]>([]);
  const [cargandoOpenRouter, setCargandoOpenRouter] = useState(false);

  const [guardadoAviso, setGuardadoAviso] = useState(false);

  // Guardar configuración automáticamente al mutar
  const actualizarConfig = (parcial: Partial<AiConfig>) => {
    setConfig((prev) => {
      const nuevo = { ...prev, ...parcial };
      saveAiConfig(nuevo);
      return nuevo;
    });
    setGuardadoAviso(true);
    setTimeout(() => setGuardadoAviso(false), 2000);
  };

  // Función reutilizable para cargar modelos de Groq
  const recargarGroq = useCallback(async (key: string) => {
    const trimmed = key.trim();
    if (!trimmed) {
      setGroqModels(DEFAULT_GROQ_MODELS);
      setGroqIsLive(false);
      setGroqError(null);
      return;
    }
    setCargandoGroq(true);
    setGroqError(null);
    try {
      const { models, isLive, error } = await fetchGroqModelsWithStatus(trimmed);
      setGroqModels(models);
      setGroqIsLive(isLive);
      setGroqError(error || null);
    } catch {
      setGroqModels(DEFAULT_GROQ_MODELS);
      setGroqIsLive(false);
      setGroqError("Error al conectar con Groq");
    } finally {
      setCargandoGroq(false);
    }
  }, []);

  // Cargar modelos de Groq con debounce al ingresar la key
  useEffect(() => {
    let cancelado = false;
    const timer = setTimeout(() => {
      if (!cancelado) {
        recargarGroq(config.groqApiKey);
      }
    }, config.groqApiKey.trim() ? 400 : 0);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [config.groqApiKey, recargarGroq]);

  // Cargar modelos de OpenRouter al montar o al cambiar la key
  const recargarOpenRouter = useCallback(async (key: string) => {
    setCargandoOpenRouter(true);
    try {
      const res = await fetchOpenRouterModels(key);
      setOpenRouterModels(res);
    } finally {
      setCargandoOpenRouter(false);
    }
  }, []);

  useEffect(() => {
    recargarOpenRouter(config.openRouterApiKey);
  }, [config.openRouterApiKey, recargarOpenRouter]);

  const activeProvider = config.activeProvider;

  // Filtrado de OpenRouter según casilla "solo gratis"
  const openRouterFiltrados = useMemo(() => {
    if (!config.openRouterOnlyFree) return openRouterModels;
    return openRouterModels.filter((m) => m.isFree);
  }, [openRouterModels, config.openRouterOnlyFree]);

  return (
    <section className="bg-finanzar-surface border border-finanzar-border rounded-md p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary">API Keys</h2>
          <p className="text-xs text-finanzar-textSecondary mt-0.5">
            Configurá tus credenciales y seleccioná el modelo para integración con IA.
          </p>
        </div>
        {guardadoAviso && (
          <span className="text-[11px] font-medium text-finanzar-positive animate-fadeIn flex items-center gap-1">
            <span>✓</span> Guardado localmente
          </span>
        )}
      </div>

      {/* Contenedor de 2 columnas: izquierda más angosta con los proveedores */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 border-t border-finanzar-borderSubtle pt-5">
        {/* Columna izquierda (selector de proveedores) */}
        <div className="sm:col-span-4 lg:col-span-3 space-y-1.5 sm:border-r border-finanzar-borderSubtle sm:pr-4">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-finanzar-textMuted block mb-2">
            Proveedor
          </span>

          {/* Opción Groq */}
          <button
            type="button"
            onClick={() => actualizarConfig({ activeProvider: "groq" })}
            className={`w-full text-left px-3 py-2.5 rounded-sm text-xs transition-all flex items-center justify-between ${
              activeProvider === "groq"
                ? "bg-finanzar-bg border-l-2 border-finanzar-accent text-finanzar-primary font-bold shadow-2xs"
                : "text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover border-l-2 border-transparent"
            }`}
          >
            <div>
              <span className="block font-medium">Groq</span>
              <span className="block text-[10px] text-finanzar-textMuted mt-0.5 font-normal">
                {config.groqApiKey ? "Clave configurada" : "Sin clave"}
              </span>
            </div>
            {activeProvider === "groq" && (
              <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent" />
            )}
          </button>

          {/* Opción OpenRouter */}
          <button
            type="button"
            onClick={() => actualizarConfig({ activeProvider: "openrouter" })}
            className={`w-full text-left px-3 py-2.5 rounded-sm text-xs transition-all flex items-center justify-between ${
              activeProvider === "openrouter"
                ? "bg-finanzar-bg border-l-2 border-finanzar-accent text-finanzar-primary font-bold shadow-2xs"
                : "text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover border-l-2 border-transparent"
            }`}
          >
            <div>
              <span className="block font-medium">OpenRouter</span>
              <span className="block text-[10px] text-finanzar-textMuted mt-0.5 font-normal">
                {config.openRouterApiKey ? "Clave configurada" : "Sin clave"}
              </span>
            </div>
            {activeProvider === "openrouter" && (
              <span className="w-1.5 h-1.5 rounded-full bg-finanzar-accent" />
            )}
          </button>
        </div>

        {/* Columna derecha (contenido activo) */}
        <div className="sm:col-span-8 lg:col-span-9 space-y-5">
          {activeProvider === "groq" && (
            <>
              {/* Campo superior: API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-finanzar-textMain">
                    API Key de Groq
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-finanzar-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>console.groq.com</span>
                    <span className="text-[9px]">↗</span>
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={mostrarKey ? "text" : "password"}
                    className={`${inputClass} font-mono text-xs pr-16`}
                    placeholder="gsk_..."
                    value={config.groqApiKey}
                    onChange={(e) => actualizarConfig({ groqApiKey: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-finanzar-textMuted hover:text-finanzar-textSecondary font-medium"
                  >
                    {mostrarKey ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <p className="text-finanzar-textMuted">
                    {config.groqApiKey
                      ? "Tu clave se almacena únicamente en tu navegador."
                      : "Ingresá tu API key de Groq para consultar todos los modelos en tiempo real."}
                  </p>
                  {config.groqApiKey && (
                    <button
                      type="button"
                      onClick={() => recargarGroq(config.groqApiKey)}
                      disabled={cargandoGroq}
                      className="text-finanzar-accent hover:underline inline-flex items-center gap-1 flex-shrink-0"
                    >
                      <span className={cargandoGroq ? "animate-spin" : ""}>↻</span>
                      <span>{cargandoGroq ? "Actualizando…" : "Recargar"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Campo inferior: Dropdown personalizado de modelos */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-finanzar-textMain">
                    Modelo activo
                  </label>
                  {groqIsLive ? (
                    <span className="text-[10px] text-finanzar-positive bg-finanzar-positiveBg border border-finanzar-positiveBorder px-1.5 py-0.2 rounded-xs font-medium">
                      ● Modelos en vivo de Groq ({groqModels.length})
                    </span>
                  ) : config.groqApiKey ? (
                    <span className="text-[10px] text-finanzar-textSecondary bg-finanzar-bg border border-finanzar-border px-1.5 py-0.2 rounded-xs">
                      {groqError || "Modelos de respaldo"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-finanzar-textMuted">
                      Modelos recomendados ({groqModels.length})
                    </span>
                  )}
                </div>
                <CustomModelDropdown
                  models={groqModels}
                  selectedModelId={config.groqModel}
                  onSelect={(modelId) => actualizarConfig({ groqModel: modelId })}
                  loading={cargandoGroq}
                  emptyMessage="No se encontraron modelos en Groq."
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-finanzar-textMuted">
                  <span>
                    Modelo seleccionado:{" "}
                    <strong className="font-mono text-finanzar-primary">
                      {config.groqModel || "Ninguno"}
                    </strong>
                  </span>
                  {cargandoGroq && <span>Consultando API de Groq…</span>}
                </div>
              </div>
            </>
          )}

          {activeProvider === "openrouter" && (
            <>
              {/* Campo superior: API Key */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-finanzar-textMain">
                    API Key de OpenRouter
                  </label>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-finanzar-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>openrouter.ai</span>
                    <span className="text-[9px]">↗</span>
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={mostrarKey ? "text" : "password"}
                    className={`${inputClass} font-mono text-xs pr-16`}
                    placeholder="sk-or-v1-..."
                    value={config.openRouterApiKey}
                    onChange={(e) => actualizarConfig({ openRouterApiKey: e.target.value })}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-finanzar-textMuted hover:text-finanzar-textSecondary font-medium"
                  >
                    {mostrarKey ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <p className="text-finanzar-textMuted">
                    {config.openRouterApiKey
                      ? "Tu clave se almacena únicamente en tu navegador."
                      : "OpenRouter unifica cientos de modelos de IA con una sola API key."}
                  </p>
                  <button
                    type="button"
                    onClick={() => recargarOpenRouter(config.openRouterApiKey)}
                    disabled={cargandoOpenRouter}
                    className="text-finanzar-accent hover:underline inline-flex items-center gap-1 flex-shrink-0"
                  >
                    <span className={cargandoOpenRouter ? "animate-spin" : ""}>↻</span>
                    <span>{cargandoOpenRouter ? "Actualizando…" : "Recargar"}</span>
                  </button>
                </div>
              </div>

              {/* Casilla: Filtrar solo modelos gratis */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={config.openRouterOnlyFree}
                    onChange={(e) => actualizarConfig({ openRouterOnlyFree: e.target.checked })}
                    className="w-4 h-4 rounded-xs border-finanzar-border text-finanzar-primary focus:ring-finanzar-accent focus:ring-offset-0"
                  />
                  <span className="text-xs font-medium text-finanzar-textMain">
                    Filtrar solo modelos gratis
                  </span>
                </label>
              </div>

              {/* Campo inferior: Dropdown personalizado de modelos */}
              <div>
                <label className="block text-xs font-semibold text-finanzar-textMain mb-1">
                  Modelo activo
                </label>
                <CustomModelDropdown
                  models={openRouterFiltrados}
                  selectedModelId={config.openRouterModel}
                  onSelect={(modelId) => actualizarConfig({ openRouterModel: modelId })}
                  loading={cargandoOpenRouter}
                  emptyMessage={
                    config.openRouterOnlyFree
                      ? "No se encontraron modelos gratuitos."
                      : "No se encontraron modelos en OpenRouter."
                  }
                />
                <div className="flex items-center justify-between mt-1 text-[11px] text-finanzar-textMuted">
                  <span>
                    Modelo seleccionado:{" "}
                    <strong className="font-mono text-finanzar-primary">
                      {config.openRouterModel || "Ninguno"}
                    </strong>
                  </span>
                  <span>{openRouterFiltrados.length} disponibles</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
