import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getEstadoMercados } from "../lib/marketHours";
import { useAuth } from "../hooks/useAuth";

export default function Header({ isLive = true }: { isLive?: boolean }) {
  const location = useLocation();
  const { usuario, estadoSync } = useAuth();
  const enCuenta = location.pathname.startsWith("/account");

  // Estado de apertura de mercados (argentino / EE.UU. / cripto), recalculado
  // cada minuto para que el texto del indicador siga vigente sin recargar la página.
  const [estadoMercados, setEstadoMercados] = useState(() => getEstadoMercados());
  useEffect(() => {
    const id = setInterval(() => setEstadoMercados(getEstadoMercados()), 60_000);
    return () => clearInterval(id);
  }, []);

  const navLinks = [
    { to: "/", label: "Mercados" },
    { to: "/comparar", label: "Comparador" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/chat", label: "Chat IA" },
    { to: "/acerca", label: "Acerca de" },
  ];

  return (
    <header className="w-full bg-finanzar-surface border-b border-finanzar-border shadow-sm sticky top-0 z-30">
      {/* Una sola fila: marca a la izquierda, navegación centrada, indicador de mercados a la derecha.
          En pantallas angostas la navegación baja a una segunda línea ocupando todo el ancho. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 grid grid-cols-[auto_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-1">
        <Link
          to="/"
          className="group flex items-baseline justify-self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent rounded-xs"
        >
          <span className="font-serif text-2xl font-bold tracking-tight text-finanzar-primary">
            Finanz<span className="text-finanzar-accent font-serif">AR</span>
          </span>
        </Link>

        <nav className="col-span-2 md:col-span-1 order-3 md:order-2 justify-self-center">
          <ul className="flex items-center space-x-1 sm:space-x-2 text-xs font-medium">
            {navLinks.map((link) => {
              const isActive =
                link.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.to);

              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`inline-block px-3 py-1 rounded-sm text-xs transition-colors ${
                      isActive
                        ? "text-finanzar-primary font-semibold bg-finanzar-bg border border-finanzar-border"
                        : "text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="order-2 md:order-3 justify-self-end flex items-center gap-2">
        <div
          className="hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-finanzar-bg border border-finanzar-borderSubtle text-xs text-finanzar-textSecondary"
          title={
            isLive
              ? `Argentina: ${estadoMercados.argentina ? "abierto" : "cerrado"} · EE.UU.: ${
                  estadoMercados.eeuu ? "abierto" : "cerrado"
                } · Cripto: abierto`
              : undefined
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-finanzar-positive animate-pulse" : "bg-finanzar-accent"
            }`}
          />
          <span>{isLive ? estadoMercados.textoHeader : "Datos en caché"}</span>
        </div>

        {/* Ícono de perfil → página de cuenta. Con sesión muestra la inicial del nombre. */}
        <Link
          to="/account"
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
        </div>
      </div>
    </header>
  );
}
