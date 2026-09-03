import { Link, useLocation } from "react-router-dom";

export default function Header({
  isLive = true,
  onRefresh,
}: {
  isLive?: boolean;
  onRefresh?: () => void;
}) {
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Mercados" },
    { to: "/comparar", label: "Comparador" },
    { to: "/acerca", label: "Acerca de" },
  ];

  return (
    <header className="w-full bg-finanzar-surface border-b border-finanzar-border shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Identidad y Branding */}
        <div className="flex items-center space-x-3">
          <Link
            to="/"
            className="group flex items-baseline space-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent rounded-xs"
          >
            <span className="font-serif text-2xl font-bold tracking-tight text-finanzar-primary">
              Finanz<span className="text-finanzar-accent font-serif">AR</span>
            </span>
          </Link>
          <span className="hidden md:inline-block text-xs uppercase tracking-wider text-finanzar-textSecondary font-medium border-l border-finanzar-border pl-3">
            Comparador Financiero Argentino
          </span>
        </div>

        {/* Estado y Navegación */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          <div className="hidden sm:inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-finanzar-bg border border-finanzar-borderSubtle text-xs text-finanzar-textSecondary">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? "bg-finanzar-positive animate-pulse" : "bg-finanzar-accent"
              }`}
            />
            <span>{isLive ? "Mercados en vivo" : "Datos en caché"}</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Actualizar cotizaciones"
              className="p-1.5 text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-bg rounded transition-colors text-xs"
            >
              ↻
            </button>
          )}

          <nav>
            <ul className="flex items-center space-x-1 sm:space-x-2 text-sm font-medium">
              {navLinks.map((link) => {
                const isActive =
                  link.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(link.to);

                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className={`px-3 py-1.5 rounded-sm text-xs sm:text-sm transition-colors ${
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
        </div>
      </div>
    </header>
  );
}
