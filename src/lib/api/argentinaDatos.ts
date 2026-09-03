// Cliente tipado de API ArgentinaDatos (argentinadatos.com)
// Sin autenticación requerida para endpoints v1

export interface PlazoFijoRaw {
  entidad: string;
  logo: string | null;
  tnaClientes: number;
  tnaNoClientes: number;
  enlace: string | null;
}

export interface FCIRaw {
  fondo: string;
  horizonte?: string;
  fecha: string;
  vcp: number;
  ccp?: number;
  patrimonio?: number;
}

export interface CriptoPesoRaw {
  token: string;
  entidad: string;
  tna: number;
}

export interface DolarRaw {
  casa: string;
  compra: number;
  venta: number;
  fecha: string;
}

const BASE_URL = "https://api.argentinadatos.com/v1";

export const fetchArgDatos = async <T = any>(endpoint: string): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`ArgentinaDatos API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
};

export const getPlazosFijos = async (): Promise<PlazoFijoRaw[]> => {
  return fetchArgDatos<PlazoFijoRaw[]>("/finanzas/tasas/plazoFijo");
};

export const getFCIMercadoDinero = async (): Promise<FCIRaw[]> => {
  return fetchArgDatos<FCIRaw[]>("/finanzas/fci/mercadoDinero/ultimo");
};

export const getCriptoPesos = async (): Promise<CriptoPesoRaw[]> => {
  return fetchArgDatos<CriptoPesoRaw[]>("/finanzas/criptopesos");
};

export const getDolarHistorico = async (casa: "blue" | "oficial" | "bolsa" | "contadoconliqui" | "cripto" = "blue"): Promise<DolarRaw[]> => {
  return fetchArgDatos<DolarRaw[]>(`/cotizaciones/dolares/${casa}`);
};

