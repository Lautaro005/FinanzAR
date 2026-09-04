import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full bg-finanzar-surface border-t border-finanzar-border mt-16 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cuadro de Disclaimer Regulatorio Obligatorio */}
        <div className="bg-finanzar-bg border border-finanzar-border rounded-md p-5 mb-8 text-finanzar-textMain">
          <div className="flex items-center space-x-2 text-finanzar-primary font-serif font-bold text-sm mb-2">
            <span className="text-finanzar-accent text-base">ℹ</span>
            <span>Aviso Legal & Transparencia Informativa</span>
          </div>
          <p className="text-xs text-finanzar-textSecondary leading-relaxed">
            FinanzAR es una herramienta de consulta exclusivamente informativa y comparativa. Los datos, tasas, cotizaciones y rendimientos aquí exhibidos provienen de APIs y fuentes públicas autorizadas y pueden presentar un pequeño delay respecto a la operativa en tiempo real. La información brindada no constituye oferta de compra ni venta, ni asesoramiento financiero, impositivo o legal. Para operar, consulte siempre con su entidad financiera, agente de liquidación y compensación (ALyC) o banco debidamente matriculado ante la CNV / BCRA.
          </p>
        </div>

        {/* Enlaces y Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-finanzar-borderSubtle text-xs text-finanzar-textSecondary">
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
