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

export const DEFAULT_GROQ_MODELS: AiModelInfo[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B IT" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill Llama 70B" },
  { id: "qwen-2.5-32b", name: "Qwen 2.5 32B" },
];

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
 * Consulta la lista de modelos de Groq desde su API.
 * Requiere API key para responder; si no hay key devuelve modelos populares de respaldo.
 */
export async function fetchGroqModels(apiKey: string): Promise<AiModelInfo[]> {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return DEFAULT_GROQ_MODELS;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${trimmed}`,
      },
    });

    if (!res.ok) {
      // Si la API key es inválida o hay error de auth, fallback a lista por defecto
      return DEFAULT_GROQ_MODELS;
    }

    const json = await res.json();
    if (!Array.isArray(json?.data)) {
      return DEFAULT_GROQ_MODELS;
    }

    const models: AiModelInfo[] = json.data
      .filter((m: any) => typeof m?.id === "string")
      .map((m: any) => ({
        id: m.id,
        name: m.id,
        contextLength: m.context_window,
      }))
      .sort((a: AiModelInfo, b: AiModelInfo) => a.id.localeCompare(b.id));

    return models.length > 0 ? models : DEFAULT_GROQ_MODELS;
  } catch {
    return DEFAULT_GROQ_MODELS;
  }
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
