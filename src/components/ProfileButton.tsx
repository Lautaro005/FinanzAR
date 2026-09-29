import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/** Ícono de perfil → página de cuenta. Con sesión muestra la inicial del nombre y el estado de sincronización. */
export default function ProfileButton() {
  const location = useLocation();
  const { usuario, estadoSync } = useAuth();
  const enCuenta = location.pathname.startsWith("/app/account");

  return (
    <Link
      to="/app/account"
      aria-label={usuario ? `Mi cuenta (${usuario.nombre})` : "Mi cuenta"}
      title={
        usuario
          ? `${usuario.nombre} · ${
              usuario.syncEnabled
                ? estadoSync === "error"
                  ? "error de sincronización"
                  : estadoSync === "sincronizando"
                  ? "sincronizando…"
                  : "portfolio sincronizado"
                : "sin sincronización"
            }`
          : "Iniciar sesión o crear cuenta"
      }
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent ${
        usuario
          ? "bg-finanzar-primary border-finanzar-primary text-finanzar-surface hover:bg-finanzar-primaryHover"
          : enCuenta
          ? "bg-finanzar-bg border-finanzar-border text-finanzar-primary"
          : "bg-finanzar-bg border-finanzar-borderSubtle text-finanzar-textSecondary hover:text-finanzar-primary hover:border-finanzar-border"
      }`}
    >
      {usuario ? (
        usuario.nombre.trim().charAt(0).toUpperCase()
      ) : (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M4.5 19.5c1.4-3.3 4.2-5 7.5-5s6.1 1.7 7.5 5" strokeLinecap="round" />
        </svg>
      )}
      {usuario?.syncEnabled && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-finanzar-surface ${
            estadoSync === "error"
              ? "bg-finanzar-negative"
              : estadoSync === "sincronizando"
              ? "bg-finanzar-accent animate-pulse"
              : "bg-finanzar-positive"
          }`}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
