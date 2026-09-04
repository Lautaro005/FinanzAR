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

export type FCICategoria =
  | "mercadoDinero"
  | "rentaFija"
  | "rentaVariable"
  | "rentaMixta"
  | "retornoTotal"
  | "otros";

export const getFCIUltimo = async (categoria: FCICategoria): Promise<FCIRaw[]> => {
  return fetchArgDatos<FCIRaw[]>(`/finanzas/fci/${categoria}/ultimo`);
};

// Fecha en formato YYYY/MM/DD.
export const getFCIPorFecha = async (categoria: FCICategoria, fecha: string): Promise<FCIRaw[]> => {
  return fetchArgDatos<FCIRaw[]>(`/finanzas/fci/${categoria}/${fecha}`);
};

// El penúltimo valor informado de cuotaparte por fondo (normalmente el día
// hábil anterior a "ultimo"). A diferencia de pedir una fecha calendario
// puntual —que en esta API solo trae los fondos que reportaron JUSTO ese
// día y suele estar casi vacía—, "ultimo" y "penultimo" son, cada uno, "el
// dato más reciente de cada fondo" y "el segundo más reciente de cada
// fondo", por lo que cubren prácticamente el 100% de los fondos y sirven
// como el par de puntos confiable para calcular un rendimiento real.
export const getFCIPenultimo = async (categoria: FCICategoria): Promise<FCIRaw[]> => {
  return fetchArgDatos<FCIRaw[]>(`/finanzas/fci/${categoria}/penultimo`);
};

// Alias retrocompatible.
export const getFCIMercadoDinero = async (): Promise<FCIRaw[]> => {
  return getFCIUltimo("mercadoDinero");
};

export const getCriptoPesos = async (): Promise<CriptoPesoRaw[]> => {
  return fetchArgDatos<CriptoPesoRaw[]>("/finanzas/criptopesos");
};

export const getDolarHistorico = async (casa: "blue" | "oficial" | "bolsa" | "contadoconliqui" | "cripto" = "blue"): Promise<DolarRaw[]> => {
  return fetchArgDatos<DolarRaw[]>(`/cotizaciones/dolares/${casa}`);
};

