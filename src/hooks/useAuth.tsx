import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiError, authApi, Usuario } from "../lib/auth";
import { parsearBackup, PortfolioBackup } from "../lib/portfolio";
import {
  aplicarBackupLocal,
  backupLocal,
  dispositivoAdoptado,
  EVENTO_PORTFOLIO_CAMBIO,
  huellaPortfolio,
  limpiarMarcaDispositivo,
  marcarDispositivoAdoptado,
  notificarCambioPortfolio,
  portfolioVacio,
} from "../lib/sync";

export type EstadoSync = "inactivo" | "sincronizando" | "sincronizado" | "error";

/** Ambas copias tienen datos distintos: el usuario elige cuál conservar. */
export interface ConflictoSync {
  local: PortfolioBackup;
  cuenta: PortfolioBackup;
}

interface AuthContextValue {
  usuario: Usuario | null;
  /** true mientras se consulta la sesión al cargar la app. */
  cargando: boolean;
  estadoSync: EstadoSync;
  errorSync: string | null;
  conflicto: ConflictoSync | null;
  login: (email: string, password: string) => Promise<void>;
  registrar: (nombre: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  eliminarCuenta: (password: string) => Promise<void>;
  activarSync: () => Promise<void>;
  desactivarSync: () => Promise<void>;
  resolverConflicto: (eleccion: "cuenta" | "local") => Promise<void>;
  /** Importar un backup JSON cuando la sync está activa: reemplaza lo local y lo sube. */
  importarBackup: (texto: string) => Promise<PortfolioBackup>;
  /** Fuerza un push inmediato (por ejemplo, reintentar tras un error). */
  reintentarSync: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 800;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [estadoSync, setEstadoSync] = useState<EstadoSync>("inactivo");
  const [errorSync, setErrorSync] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<ConflictoSync | null>(null);

  const usuarioRef = useRef<Usuario | null>(null);
  usuarioRef.current = usuario;
  const timerRef = useRef<number | null>(null);
  const ultimaHuellaSubida = useRef<string | null>(null);

  /* ---------------- Push (subir lo local a la cuenta) ---------------- */
  const push = useCallback(async () => {
    const u = usuarioRef.current;
    if (!u?.syncEnabled) return;
    const local = backupLocal();
    const huella = huellaPortfolio(local);
    if (huella === ultimaHuellaSubida.current) {
      setEstadoSync("sincronizado");
      return;
    }
    setEstadoSync("sincronizando");
    setErrorSync(null);
    try {
      await authApi.putPortfolio(local);
      ultimaHuellaSubida.current = huella;
      setEstadoSync("sincronizado");
    } catch (e) {
      setEstadoSync("error");
      setErrorSync(e instanceof ApiError ? e.message : "No se pudo sincronizar.");
    }
  }, []);

  const programarPush = useCallback(() => {
    if (!usuarioRef.current?.syncEnabled) return;
    setEstadoSync("sincronizando");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void push();
    }, PUSH_DEBOUNCE_MS);
  }, [push]);

  // Cada mutación local del portfolio dispara un push (debounced).
  useEffect(() => {
    window.addEventListener(EVENTO_PORTFOLIO_CAMBIO, programarPush);
    return () => window.removeEventListener(EVENTO_PORTFOLIO_CAMBIO, programarPush);
  }, [programarPush]);

  /* ---------------- Sincronización inicial (al cargar / loguear / activar) ---------------- */
  const sincronizarInicial = useCallback(async (u: Usuario) => {
    setEstadoSync("sincronizando");
    setErrorSync(null);
    try {
      const { portfolio } = await authApi.getPortfolio();
      const cuenta = portfolio ? parsearBackup(JSON.stringify(portfolio)) : null;
      const local = backupLocal();
      const localVacio = portfolioVacio(local);
      const cuentaVacia = portfolioVacio(cuenta);

      if (cuentaVacia && localVacio) {
        marcarDispositivoAdoptado(u.id);
        ultimaHuellaSubida.current = huellaPortfolio(local);
        setEstadoSync("sincronizado");
        return;
      }
      if (cuentaVacia && !localVacio) {
        // La cuenta no tiene nada: se sube lo que hay en este dispositivo.
        await authApi.putPortfolio(local);
        ultimaHuellaSubida.current = huellaPortfolio(local);
        marcarDispositivoAdoptado(u.id);
        setEstadoSync("sincronizado");
        return;
      }
      // La cuenta tiene datos.
      const c = cuenta as PortfolioBackup;
      if (localVacio || huellaPortfolio(local) === huellaPortfolio(c) || dispositivoAdoptado(u.id)) {
        aplicarBackupLocal(c);
        ultimaHuellaSubida.current = huellaPortfolio(c);
        marcarDispositivoAdoptado(u.id);
        setEstadoSync("sincronizado");
        return;
      }
      // Ambos tienen datos distintos y este dispositivo nunca adoptó la cuenta: preguntar.
      setConflicto({ local, cuenta: c });
      setEstadoSync("sincronizando");
    } catch (e) {
      setEstadoSync("error");
      setErrorSync(e instanceof ApiError ? e.message : "No se pudo sincronizar.");
    }
  }, []);

  const resolverConflicto = useCallback(
    async (eleccion: "cuenta" | "local") => {
      const u = usuarioRef.current;
      if (!conflicto || !u) return;
      setConflicto(null);
      marcarDispositivoAdoptado(u.id);
      if (eleccion === "cuenta") {
        aplicarBackupLocal(conflicto.cuenta);
        ultimaHuellaSubida.current = huellaPortfolio(conflicto.cuenta);
        setEstadoSync("sincronizado");
      } else {
        ultimaHuellaSubida.current = null;
        await push();
      }
    },
    [conflicto, push]
  );

  /* ---------------- Sesión ---------------- */
  useEffect(() => {
    let cancelado = false;
    authApi
      .me()
      .then(({ user }) => {
        if (cancelado) return;
        setUsuario(user);
        if (user?.syncEnabled) void sincronizarInicial(user);
      })
      .catch(() => {
        /* sin backend disponible: la app sigue funcionando sin cuenta */
      })
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [sincronizarInicial]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await authApi.login(email, password);
      setUsuario(user);
      if (user.syncEnabled) await sincronizarInicial(user);
    },
    [sincronizarInicial]
  );

  const registrar = useCallback(async (nombre: string, email: string, password: string) => {
    const { user } = await authApi.register(nombre, email, password);
    setUsuario(user);
    setEstadoSync("inactivo");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Lo local queda como está (es del usuario); solo se corta la sesión.
      setUsuario(null);
      setEstadoSync("inactivo");
      setConflicto(null);
      limpiarMarcaDispositivo();
      ultimaHuellaSubida.current = null;
    }
  }, []);

  const eliminarCuenta = useCallback(async (password: string) => {
    await authApi.deleteAccount(password);
    setUsuario(null);
    setEstadoSync("inactivo");
    setConflicto(null);
    limpiarMarcaDispositivo();
    ultimaHuellaSubida.current = null;
  }, []);

  const activarSync = useCallback(async () => {
    const { user } = await authApi.setSync(true);
    setUsuario(user);
    usuarioRef.current = user;
    await sincronizarInicial(user);
  }, [sincronizarInicial]);

  const desactivarSync = useCallback(async () => {
    const { user } = await authApi.setSync(false);
    setUsuario(user);
    usuarioRef.current = user;
    setEstadoSync("inactivo");
    setConflicto(null);
    limpiarMarcaDispositivo();
    ultimaHuellaSubida.current = null;
  }, []);

  const importarBackup = useCallback(async (texto: string) => {
    const backup = parsearBackup(texto);
    aplicarBackupLocal(backup);
    notificarCambioPortfolio();
    return backup;
  }, []);

  const reintentarSync = useCallback(() => {
    ultimaHuellaSubida.current = null;
    void push();
  }, [push]);

  return (
    <AuthContext.Provider
      value={{
        usuario, cargando, estadoSync, errorSync, conflicto,
        login, registrar, logout, eliminarCuenta, activarSync, desactivarSync, resolverConflicto, importarBackup, reintentarSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
