// Conexión a Turso (libSQL). Las credenciales viven SOLO en variables de
// entorno del servidor (Vercel → Settings → Environment Variables); nunca en
// el repo ni en el bundle del navegador. Si faltan, el endpoint responde 503
// en vez de arrancar con un cliente roto.
import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new ConfigError("Falta TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en el entorno del servidor.");
  }
  client = createClient({ url, authToken });
  return client;
}

export class ConfigError extends Error {}
