import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getEstadoMercados } from "../lib/marketHours";

export default function Header({ isLive = true }: { isLive?: boolean }) {
  const location = useLocation();

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

        <div
          className="order-2 md:order-3 justify-self-end hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-finanzar-bg border border-finanzar-borderSubtle text-xs text-finanzar-textSecondary"
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
      </div>
    </header>
  );
}
