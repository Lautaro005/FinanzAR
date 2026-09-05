// Cliente del backend de cuentas (/api). La sesión viaja en una cookie
// httpOnly que el navegador maneja solo: acá nunca se ve ni se guarda un
// token. Todos los errores se normalizan a `ApiError` con un mensaje legible.

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  syncEnabled: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      ...init,
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisá tu conexión.", 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* sin cuerpo */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Error ${res.status} del servidor.`, res.status);
  }
  return data as T;
}

export const authApi = {
  me: () => apiFetch<{ user: Usuario | null }>("/api/auth/me"),
  register: (nombre: string, email: string, password: string) =>
    apiFetch<{ user: Usuario }>("/api/auth/register", { method: "POST", body: JSON.stringify({ nombre, email, password }) }),
  login: (email: string, password: string) =>
    apiFetch<{ user: Usuario }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST", body: "{}" }),
  deleteAccount: (password: string) =>
    apiFetch<{ ok: true }>("/api/auth/delete", { method: "POST", body: JSON.stringify({ password }) }),
  setSync: (enabled: boolean) =>
    apiFetch<{ user: Usuario }>("/api/sync", { method: "POST", body: JSON.stringify({ enabled }) }),
  getPortfolio: () => apiFetch<{ portfolio: unknown | null; updatedAt: string | null }>("/api/portfolio"),
  putPortfolio: (portfolio: unknown) =>
    apiFetch<{ updatedAt: string }>("/api/portfolio", { method: "PUT", body: JSON.stringify(portfolio) }),
};
