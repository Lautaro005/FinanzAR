import { Link } from "react-router-dom";
import { APP_VERSION } from "../lib/changelog";

export default function Footer({ compact = false }: { compact?: boolean }) {
  return (
    <footer
      className={`w-full bg-finanzar-surface border-t border-finanzar-border flex-shrink-0 ${
        compact ? "mt-0 py-2 sm:py-2.5" : "mt-16 py-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enlaces y Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-xs text-finanzar-textSecondary">
          <div className="flex items-center gap-4">
            <Link to="/acerca" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Acerca de
            </Link>
            <Link to="/privacidad" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Privacidad
            </Link>
            <Link to="/changelog" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Changelog
            </Link>
          </div>

          <p className="text-finanzar-textMuted text-right text-[11px] sm:text-xs">
            © {new Date().getFullYear()} FinanzAR ·{" "}
            <Link to="/changelog" className="font-mono hover:text-finanzar-primary" title="Ver novedades de esta versión">
              v{APP_VERSION}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
