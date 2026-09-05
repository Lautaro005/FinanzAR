import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { useAuth } from "../hooks/useAuth";
import { ApiError } from "../lib/auth";
import { armarBackup, CASAS_DOLAR, cotizacionDolar, formatMoneda, loadConfig } from "../lib/portfolio";
import { actualizarConfigPortfolio, EVENTO_CONFIG_CAMBIO, EVENTO_PORTFOLIO_REEMPLAZADO } from "../lib/sync";
import { CasaDolar, Instrumento } from "../types";
import { BotonPrimario, BotonSecundario, Campo, inputClass } from "../components/portfolio/Modal";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

const mensajeDe = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error ? e.message : fallback);

export default function AccountScreen({ instruments }: { instruments: Instrumento[] }) {
  useDocumentMeta(
    "Mi cuenta",
    "Creá una cuenta en FinanzAR para sincronizar tu portfolio entre dispositivos.",
    "/account"
  );
  const auth = useAuth();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      <div className="border-b border-finanzar-borderSubtle pb-6 mb-8">
        <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Cuenta</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary mt-1">
          {auth.usuario ? `Hola, ${auth.usuario.nombre}` : "Mi cuenta"}
        </h1>
        <p className="text-sm text-finanzar-textSecondary mt-2">
          {auth.usuario
            ? "Desde acá manejás tu sesión y la sincronización de tu portfolio entre dispositivos."
            : "Una cuenta es opcional: FinanzAR funciona igual sin ella. Sirve para que tu portfolio te siga entre dispositivos."}
        </p>
      </div>

      {auth.cargando ? (
        <p className="text-sm text-finanzar-textSecondary">Consultando tu sesión…</p>
      ) : auth.usuario ? (
        <PanelCuenta />
      ) : (
        <PanelAcceso />
      )}

      <PanelConfiguracion instruments={instruments} />
    </main>
  );
}

/* ============================================================
   Sin sesión: iniciar sesión / crear cuenta
   ============================================================ */
function PanelAcceso() {
  const auth = useAuth();
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAviso(null);
    if (modo === "registro" && password.length < 8) {
      setAviso({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    setEnviando(true);
    try {
      if (modo === "login") await auth.login(email, password);
      else await auth.registrar(nombre, email, password);
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDe(err, "No se pudo completar la operación.") });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulario: sin tarjeta blanca — un panel liviano con un acento cálido */}
      <div className="relative overflow-hidden rounded-lg border border-finanzar-border/70 bg-gradient-to-br from-finanzar-accentSubtle via-finanzar-bg to-finanzar-bg">
        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-finanzar-accent via-finanzar-accent/40 to-transparent" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-finanzar-accent/10 blur-2xl" aria-hidden="true" />

        <form onSubmit={submit} className="relative p-6 sm:p-8 space-y-5">
          {/* Pestañas: subrayado, no cajas */}
          <div className="flex items-end gap-6 border-b border-finanzar-border/70">
            {(["login", "registro"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setAviso(null); }}
                className={`-mb-px pb-2 font-serif text-lg transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent rounded-xs ${
                  modo === m
                    ? "text-finanzar-primary font-bold border-finanzar-accent"
                    : "text-finanzar-textSecondary hover:text-finanzar-primary border-transparent"
                }`}
              >
                {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {modo === "registro" && (
              <div className="sm:col-span-2">
                <Campo label="Nombre">
                  <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={80} autoComplete="name" required />
                </Campo>
              </div>
            )}
            <Campo label="Email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required />
            </Campo>
            <Campo label="Contraseña" hint={modo === "registro" ? "Mínimo 8 caracteres." : undefined}>
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={128}
                autoComplete={modo === "registro" ? "new-password" : "current-password"}
                required
              />
            </Campo>
          </div>

          {aviso && <AvisoBox aviso={aviso} onClose={() => setAviso(null)} />}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <BotonPrimario type="submit" disabled={enviando}>
              {enviando ? "Un momento…" : modo === "login" ? "Iniciar sesión →" : "Crear cuenta →"}
            </BotonPrimario>
            <button
              type="button"
              onClick={() => { setModo(modo === "login" ? "registro" : "login"); setAviso(null); }}
              className="text-xs text-finanzar-textSecondary hover:text-finanzar-primary underline self-start sm:self-auto"
            >
              {modo === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
            </button>
          </div>
        </form>
      </div>

      {/* Qué guarda la cuenta — debajo del formulario, en tres notas cortas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-finanzar-textSecondary">
        {[
          { t: "Solo tres datos", d: "Nombre, email y contraseña. La contraseña se guarda como hash, nunca en texto plano." },
          { t: "Tu portfolio sigue acá", d: "Vive en este navegador. Solo se guarda en la cuenta si activás la sincronización." },
          { t: "Sin ataduras", d: "Podés desactivar la sincronización o eliminar la cuenta cuando quieras, desde esta misma página." },
        ].map((n) => (
          <div key={n.t} className="border-l-2 border-finanzar-accent/60 pl-3">
            <p className="font-semibold text-finanzar-primary">{n.t}</p>
            <p className="mt-0.5 leading-relaxed">{n.d}</p>
          </div>
        ))}
        <p className="sm:col-span-3">
          <Link to="/privacidad" className="underline hover:text-finanzar-primary">Política de privacidad</Link>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Con sesión: datos, sincronización, backup, cerrar sesión, eliminar
   ============================================================ */
function PanelCuenta() {
  const auth = useAuth();
  const u = auth.usuario!;
  const [aviso, setAviso] = useState<Aviso>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmDesactivar, setConfirmDesactivar] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [passwordEliminar, setPasswordEliminar] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleSync = async () => {
    setAviso(null);
    setOcupado(true);
    try {
      if (u.syncEnabled) {
        await auth.desactivarSync();
        setConfirmDesactivar(false);
        setAviso({ tipo: "ok", texto: "Sincronización desactivada. Se borró la copia de tu cuenta; el portfolio queda solo en este navegador." });
      } else {
        await auth.activarSync();
        setAviso({ tipo: "ok", texto: "Sincronización activada. Cada cambio en tu portfolio se guarda en tu cuenta." });
      }
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDe(err, "No se pudo cambiar la sincronización.") });
    } finally {
      setOcupado(false);
    }
  };

  const exportar = () => {
    const backup = armarBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzar-portfolio-${backup.exportadoEn.slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setAviso({ tipo: "ok", texto: "Backup exportado." });
  };

  const importar = async (file: File) => {
    setAviso(null);
    try {
      const backup = await auth.importarBackup(await file.text());
      setAviso({
        tipo: "ok",
        texto: `Backup importado y sincronizado: ${backup.transacciones.length} movimientos, ${backup.plazosFijos.length} plazos fijos y ${backup.fondosComunes.length} FCI.`,
      });
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDe(err, "No se pudo importar el archivo.") });
    }
  };

  const eliminar = async (e: FormEvent) => {
    e.preventDefault();
    setAviso(null);
    setOcupado(true);
    try {
      await auth.eliminarCuenta(passwordEliminar);
    } catch (err) {
      setAviso({ tipo: "error", texto: mensajeDe(err, "No se pudo eliminar la cuenta.") });
      setOcupado(false);
    }
  };

  const estadoSyncTexto =
    auth.estadoSync === "error"
      ? "Error de sincronización"
      : auth.estadoSync === "sincronizando"
      ? "Sincronización en progreso…"
      : "Sincronizado";

  return (
    <div className="space-y-6">
      {aviso && <AvisoBox aviso={aviso} onClose={() => setAviso(null)} />}

      {/* Datos */}
      <section className="bg-finanzar-surface border border-finanzar-border rounded-md p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-finanzar-primary text-finanzar-surface font-serif text-xl font-bold">
              {u.nombre.trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold text-finanzar-primary">{u.nombre}</p>
              <p className="text-xs text-finanzar-textSecondary">{u.email}</p>
            </div>
          </div>
          <BotonSecundario onClick={() => auth.logout()}>Cerrar sesión</BotonSecundario>
        </div>
      </section>

      {/* Sincronización */}
      <section className="bg-finanzar-surface border border-finanzar-border rounded-md p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-serif text-lg font-bold text-finanzar-primary">Sincronización del portfolio</h2>
            <p className="text-xs text-finanzar-textSecondary mt-1">
              Con la sincronización activa, los activos que cargues en{" "}
              <Link to="/portfolio" className="underline hover:text-finanzar-primary">Portfolio</Link> se guardan en tu cuenta y
              aparecen en cualquier dispositivo donde inicies sesión. Al desactivarla se borra la copia de la cuenta y el
              portfolio vuelve a vivir solo en este navegador.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={u.syncEnabled}
            disabled={ocupado}
            onClick={() => (u.syncEnabled ? setConfirmDesactivar(true) : toggleSync())}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
              u.syncEnabled ? "bg-finanzar-primary border-finanzar-primary" : "bg-finanzar-surfaceMuted border-finanzar-border"
            }`}
          >
            <span className="sr-only">Sincronizar portfolio con la cuenta</span>
            <span
              className={`inline-block h-4 w-4 rounded-full bg-finanzar-surface shadow-sm transform transition-transform ${
                u.syncEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {confirmDesactivar && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 rounded-md border border-finanzar-negativeBorder bg-finanzar-negativeBg text-xs text-finanzar-negative">
            <span className="flex-1">¿Desactivar la sincronización? Se borra la copia guardada en tu cuenta (lo de este navegador no se toca).</span>
            <div className="flex gap-2">
              <BotonPrimario tono="negative" onClick={toggleSync} disabled={ocupado}>Sí, desactivar</BotonPrimario>
              <BotonSecundario onClick={() => setConfirmDesactivar(false)}>Cancelar</BotonSecundario>
            </div>
          </div>
        )}

        {u.syncEnabled && (
          <div className="mt-5 pt-5 border-t border-finanzar-borderSubtle">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-medium text-finanzar-textSecondary">
                <span
                  className={`w-2 h-2 rounded-full ${
                    auth.estadoSync === "error"
                      ? "bg-finanzar-negative"
                      : auth.estadoSync === "sincronizando"
                      ? "bg-finanzar-accent animate-pulse"
                      : "bg-finanzar-positive"
                  }`}
                />
                {estadoSyncTexto}
                {auth.estadoSync === "error" && (
                  <button onClick={auth.reintentarSync} className="underline hover:text-finanzar-primary">Reintentar</button>
                )}
              </span>
              <div className="flex gap-2">
                <BotonSecundario onClick={exportar}>⤓ Exportar backup</BotonSecundario>
                <BotonSecundario onClick={() => fileRef.current?.click()}>⤒ Importar</BotonSecundario>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importar(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
            {auth.errorSync && <p className="text-[11px] text-finanzar-negative mt-2">{auth.errorSync}</p>}
            <p className="text-[11px] text-finanzar-textMuted mt-2">
              Importar un backup reemplaza el portfolio de este navegador y el de tu cuenta.
            </p>
          </div>
        )}
      </section>

      {/* Eliminar cuenta */}
      <section className="border border-finanzar-negativeBorder rounded-md p-6">
        <h2 className="font-serif text-lg font-bold text-finanzar-negative">Eliminar cuenta</h2>
        <p className="text-xs text-finanzar-textSecondary mt-1">
          Borra tu cuenta, tus sesiones y el portfolio sincronizado (si lo hubiera). Lo que está guardado en este navegador no
          se toca. Esta acción no se puede deshacer.
        </p>
        {confirmEliminar ? (
          <form onSubmit={eliminar} className="mt-4 flex flex-col sm:flex-row sm:items-end gap-2 max-w-lg">
            <div className="flex-1">
              <Campo label="Confirmá con tu contraseña">
                <input
                  className={inputClass}
                  type="password"
                  value={passwordEliminar}
                  onChange={(e) => setPasswordEliminar(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Campo>
            </div>
            <BotonPrimario type="submit" tono="negative" disabled={ocupado || !passwordEliminar}>Eliminar definitivamente</BotonPrimario>
            <BotonSecundario onClick={() => { setConfirmEliminar(false); setPasswordEliminar(""); }}>Cancelar</BotonSecundario>
          </form>
        ) : (
          <button onClick={() => setConfirmEliminar(true)} className="mt-3 text-xs text-finanzar-negative underline font-medium">
            Quiero eliminar mi cuenta
          </button>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   Configuración (visible con o sin sesión): cotización del dólar
   ============================================================ */
function PanelConfiguracion({ instruments }: { instruments: Instrumento[] }) {
  const [config, setConfig] = useState(() => loadConfig());
  useEffect(() => {
    const recargar = () => setConfig(loadConfig());
    window.addEventListener(EVENTO_CONFIG_CAMBIO, recargar);
    window.addEventListener(EVENTO_PORTFOLIO_REEMPLAZADO, recargar);
    return () => {
      window.removeEventListener(EVENTO_CONFIG_CAMBIO, recargar);
      window.removeEventListener(EVENTO_PORTFOLIO_REEMPLAZADO, recargar);
    };
  }, []);

  const elegir = (casa: CasaDolar) => setConfig(actualizarConfigPortfolio({ dolarCasa: casa }));

  return (
    <section className="mt-10 pt-8 border-t border-finanzar-borderSubtle">
      <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Configuración</span>
      <h2 className="font-serif text-2xl font-bold text-finanzar-primary mt-1">Cotización del dólar</h2>
      <p className="text-sm text-finanzar-textSecondary mt-1">
        Con esta cotización el Portfolio convierte tus tenencias en dólares a pesos (y al revés, si elegís ver todo en US$).
        Se guarda en este navegador y, si tenés la sincronización activa, también en tu cuenta.
      </p>

      <div role="radiogroup" aria-label="Casa de dólar" className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {CASAS_DOLAR.map((c) => {
          const activo = config.dolarCasa === c.id;
          const valor = cotizacionDolar(instruments, c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => elegir(c.id)}
              className={`relative text-left rounded-md border p-3.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
                activo
                  ? "border-finanzar-primary bg-finanzar-surface shadow-sm"
                  : "border-finanzar-border bg-finanzar-bg hover:border-finanzar-accent hover:bg-finanzar-surface"
              }`}
            >
              <span
                className={`absolute top-3 right-3 w-3.5 h-3.5 rounded-full border-2 ${
                  activo ? "border-finanzar-primary bg-finanzar-primary ring-2 ring-inset ring-finanzar-surface" : "border-finanzar-border bg-finanzar-surface"
                }`}
                aria-hidden="true"
              />
              <span className="block text-xs font-semibold text-finanzar-primary pr-5">{(() => { const l = c.label.replace("Dólar ", ""); return l.charAt(0).toUpperCase() + l.slice(1); })()}</span>
              <span className="block font-mono text-sm tabular-nums mt-1.5 text-finanzar-textMain">
                {valor !== null ? formatMoneda(valor) : <span className="text-finanzar-textMuted">sin cotización</span>}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AvisoBox({ aviso, onClose }: { aviso: NonNullable<Aviso>; onClose: () => void }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-3 rounded-md border text-xs ${
        aviso.tipo === "ok"
          ? "bg-finanzar-positiveBg border-finanzar-positiveBorder text-finanzar-positive"
          : "bg-finanzar-negativeBg border-finanzar-negativeBorder text-finanzar-negative"
      }`}
      role="status"
    >
      <span>{aviso.texto}</span>
      <button type="button" onClick={onClose} className="font-semibold" aria-label="Cerrar aviso">✕</button>
    </div>
  );
}
