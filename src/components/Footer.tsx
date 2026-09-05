import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-finanzar-surface border-t border-finanzar-border mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enlaces y Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-finanzar-textSecondary">
          <div className="flex items-center gap-4">
            <Link to="/acerca" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Acerca de
            </Link>
            <Link to="/privacidad" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Privacidad
            </Link>
          </div>

          <p className="text-finanzar-textMuted text-right">
            © {new Date().getFullYear()} FinanzAR.
          </p>
        </div>
      </div>
    </footer>
  );
}
