// Sincronización del portfolio con la cuenta: helpers puros + eventos.
// El estado/orquestación vive en hooks/useAuth.tsx.
import {
  armarBackup,
  PortfolioBackup,
  saveConfig,
  saveFondosComunes,
  saveHistorial,
  savePlazosFijos,
  saveTransacciones,
} from "./portfolio";

/** Disparado tras cada mutación local del portfolio (usePortfolio, import). */
export const EVENTO_PORTFOLIO_CAMBIO = "finanzar:portfolio-cambio";
/** Disparado cuando el portfolio local fue reemplazado desde afuera (pull de la cuenta, import). */
export const EVENTO_PORTFOLIO_REEMPLAZADO = "finanzar:portfolio-reemplazado";

const KEY_DEVICE = "finanzar_sync_device_v1";

export const notificarCambioPortfolio = () => window.dispatchEvent(new Event(EVENTO_PORTFOLIO_CAMBIO));
export const notificarPortfolioReemplazado = () => window.dispatchEvent(new Event(EVENTO_PORTFOLIO_REEMPLAZADO));

export function aplicarBackupLocal(backup: PortfolioBackup) {
  saveTransacciones(backup.transacciones);
  savePlazosFijos(backup.plazosFijos);
  saveFondosComunes(backup.fondosComunes);
  saveHistorial(backup.historial);
  saveConfig(backup.config);
  notificarPortfolioReemplazado();
}

export const portfolioVacio = (b: PortfolioBackup | null | undefined): boolean =>
  !b || (b.transacciones.length === 0 && b.plazosFijos.length === 0 && b.fondosComunes.length === 0);

/** Huella del contenido (sin `exportadoEn`) para saber si dos copias son iguales. */
export function huellaPortfolio(b: PortfolioBackup): string {
  const s = JSON.stringify([b.transacciones, b.plazosFijos, b.fondosComunes, b.historial, b.config]);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

export const backupLocal = (): PortfolioBackup => armarBackup();

/* Marca por dispositivo: este navegador ya adoptó el portfolio de la cuenta `userId`
   (después de eso, ante diferencias, gana la cuenta sin volver a preguntar). */
export function dispositivoAdoptado(userId: string): boolean {
  try {
    return localStorage.getItem(KEY_DEVICE) === userId;
  } catch {
    return false;
  }
}
export function marcarDispositivoAdoptado(userId: string) {
  try {
    localStorage.setItem(KEY_DEVICE, userId);
  } catch {
    /* ignorar */
  }
}
export function limpiarMarcaDispositivo() {
  try {
    localStorage.removeItem(KEY_DEVICE);
  } catch {
    /* ignorar */
  }
}
