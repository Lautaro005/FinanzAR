/**
 * Configuración y clientes para proveedores de IA (Groq y OpenRouter).
 * Las claves y modelos se guardan en localStorage del usuario.
 */

export type AiProviderId = "groq" | "openrouter";

export interface AiModelInfo {
  id: string;
  name: string;
  isFree?: boolean;
  contextLength?: number;
  description?: string;
}

export interface AiConfig {
  activeProvider: AiProviderId;
  groqApiKey: string;
  groqModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
  openRouterOnlyFree: boolean;
}

const STORAGE_KEY = "finanzar_ai_config_v1";

const DISCONTINUED_GROQ_MODELS = [
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "qwen-2.5-32b",
];

export const DEFAULT_GROQ_MODELS: AiModelInfo[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
  { id: "openai/gpt-oss-120b", name: "OpenAI GPT-OSS 120B" },
  { id: "openai/gpt-oss-20b", name: "OpenAI GPT-OSS 20B" },
  { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill Llama 70B" },
];

const KNOWN_GROQ_NAMES: Record<string, string> = {
  "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
  "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
  "openai/gpt-oss-120b": "OpenAI GPT-OSS 120B",
  "openai/gpt-oss-20b": "OpenAI GPT-OSS 20B",
  "qwen/qwen3.6-27b": "Qwen 3.6 27B",
  "deepseek-r1-distill-llama-70b": "DeepSeek R1 Distill Llama 70B",
  "llama-3.2-1b-preview": "Llama 3.2 1B Preview",
  "llama-3.2-3b-preview": "Llama 3.2 3B Preview",
  "llama-3.2-11b-vision-preview": "Llama 3.2 11B Vision Preview",
  "llama-3.2-90b-vision-preview": "Llama 3.2 90B Vision Preview",
  "llama-guard-3-8b": "Llama Guard 3 8B",
  "groq/compound": "Groq Compound",
  "groq/compound-mini": "Groq Compound Mini",
};

export function formatGroqModelName(id: string): string {
  if (KNOWN_GROQ_NAMES[id]) return KNOWN_GROQ_NAMES[id];
  return id;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  activeProvider: "groq",
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
  openRouterApiKey: "",
  openRouterModel: "meta-llama/llama-3.3-70b-instruct:free",
  openRouterOnlyFree: false,
};

export function getAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);

    // Si había quedado un modelo descontinuado guardado, migrar a Llama 3.3 70B
    if (parsed.groqModel && DISCONTINUED_GROQ_MODELS.includes(parsed.groqModel)) {
      parsed.groqModel = "llama-3.3-70b-versatile";
    }

    return {
      ...DEFAULT_AI_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Error guardando configuración de IA:", e);
  }
}

/**
 * Consulta la lista de modelos de Groq desde su API oficial.
 * Retorna la lista formateada y si proviene de la API en vivo o de respaldo.
 */
export async function fetchGroqModelsWithStatus(
  apiKey: string
): Promise<{ models: AiModelInfo[]; isLive: boolean; error?: string }> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return { models: DEFAULT_GROQ_MODELS, isLive: false };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${trimmed}`,
      },
    });

    if (!res.ok) {
      // Si la API key es inválida (ej. 401) o falló la consulta, fallback a lista de respaldo
      return {
        models: DEFAULT_GROQ_MODELS,
        isLive: false,
        error: res.status === 401 ? "Clave de API inválida o expirada" : `Error HTTP ${res.status}`,
      };
    }

    const json = await res.json();
    if (!Array.isArray(json?.data)) {
      return { models: DEFAULT_GROQ_MODELS, isLive: false };
    }

    // Filtrar modelos de texto activos (excluyendo whisper/audio y modelos dados de baja)
    const models: AiModelInfo[] = json.data
      .filter(
        (m: any) =>
          typeof m?.id === "string" &&
          m.active !== false &&
          !m.id.toLowerCase().includes("whisper")
      )
      .map((m: any) => ({
        id: m.id,
        name: formatGroqModelName(m.id),
        contextLength: m.context_window,
      }))
      .sort((a: AiModelInfo, b: AiModelInfo) => a.name.localeCompare(b.name));

    return {
      models: models.length > 0 ? models : DEFAULT_GROQ_MODELS,
      isLive: models.length > 0,
    };
  } catch (err) {
    console.warn("No se pudieron cargar los modelos de Groq:", err);
    return { models: DEFAULT_GROQ_MODELS, isLive: false };
  }
}

/**
 * Consulta la lista de modelos de Groq desde su API.
 * Requiere API key para responder; si no hay key devuelve modelos vigentes de respaldo.
 */
export async function fetchGroqModels(apiKey: string): Promise<AiModelInfo[]> {
  const res = await fetchGroqModelsWithStatus(apiKey);
  return res.models;
}

/**
 * Consulta la lista completa de modelos de OpenRouter.
 * Es un endpoint público; si se pasa apiKey se envía en headers opcionalmente.
 */
export async function fetchOpenRouterModels(apiKey?: string): Promise<AiModelInfo[]> {
  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
    if (!res.ok) {
      throw new Error(`OpenRouter API status ${res.status}`);
    }

    const json = await res.json();
    if (!Array.isArray(json?.data)) {
      return [];
    }

    const models: AiModelInfo[] = json.data
      .filter((m: any) => typeof m?.id === "string")
      .map((m: any) => {
        const promptPrice = Number(m?.pricing?.prompt ?? 1);
        const completionPrice = Number(m?.pricing?.completion ?? 1);
        const isFree = m.id.endsWith(":free") || (promptPrice === 0 && completionPrice === 0);

        return {
          id: m.id,
          name: m.name || m.id,
          isFree,
          contextLength: m.context_length,
          description: m.description,
        };
      })
      .sort((a: AiModelInfo, b: AiModelInfo) => a.name.localeCompare(b.name));

    return models;
  } catch (err) {
    console.warn("No se pudieron cargar los modelos de OpenRouter:", err);
    return [];
  }
}
