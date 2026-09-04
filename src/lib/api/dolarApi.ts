// Cliente tipado de DolarAPI (dolarapi.com) — https://dolarapi.com/docs/argentina/
// API gratuita, sin autenticación, mantenida por la comunidad. Expone las
// distintas cotizaciones del dólar en Argentina y, en un endpoint aparte,
// otras monedas (euro, real brasileño, etc.) siempre contra el peso
// argentino. No expone históricos (ver src/lib/history.ts: el gráfico de
// "divisas" reutiliza el histórico real de argentinadatos.com para las
// variantes de dólar que lo soportan, y cae a estimación honesta para el
// resto, igual que ya se hace con FCI/EE.UU. cuando no hay histórico libre).

export interface DolarApiCotizacion {
  moneda: string; // "USD" | "EUR" | "BRL" | ...
  casa: string; // "oficial" | "blue" | "bolsa" | "contadoconliqui" | "mayorista" | "cripto" | "tarjeta"
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

const BASE_URL = "https://dolarapi.com/v1";

export const fetchDolarApi = async <T = any>(endpoint: string): Promise<T> => {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`DolarAPI error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
};

// Todas las variantes del dólar (oficial, blue, bolsa/MEP, contado con
// liqui, mayorista, cripto, tarjeta).
export const getDolares = async (): Promise<DolarApiCotizacion[]> => {
  return fetchDolarApi<DolarApiCotizacion[]>("/dolares");
};

// Otras monedas (incluye USD oficial de nuevo + EUR, BRL, CLP, UYU, etc.)
// contra el peso argentino.
export const getOtrasCotizaciones = async (): Promise<DolarApiCotizacion[]> => {
  return fetchDolarApi<DolarApiCotizacion[]>("/cotizaciones");
};
