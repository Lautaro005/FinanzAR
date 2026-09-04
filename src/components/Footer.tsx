import { Link } from "react-router-dom";

export default function Footer() {
  const sources = [
    { name: "argentinadatos.com", url: "https://argentinadatos.com", desc: "Plazos fijos, FCI y dólar" },
    { name: "CoinGecko API", url: "https://www.coingecko.com", desc: "Criptoactivos globales" },
    { name: "data912.com", url: "https://data912.apidocs.ar", desc: "CEDEARs, Acciones y Bonos" },
    { name: "CAFCI", url: "https://www.cafci.org.ar", desc: "Cámara Arg. de FCI" },
  ];

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

        {/* Fuentes y Atribuciones */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-finanzar-borderSubtle text-xs text-finanzar-textSecondary">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-finanzar-textMain">Fuentes de datos públicas:</span>
            {sources.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.desc}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-finanzar-bg hover:bg-finanzar-surfaceHover border border-finanzar-borderSubtle hover:border-finanzar-border text-finanzar-textMain transition-colors"
              >
                <span>{s.name}</span>
                <span className="text-[10px] text-finanzar-accent">↗</span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link to="/acerca" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Acerca de
            </Link>
            <Link to="/privacidad" className="text-finanzar-textSecondary hover:text-finanzar-primary underline">
              Privacidad
            </Link>
            <p className="text-finanzar-textMuted text-right">
              © {new Date().getFullYear()} FinanzAR. Diseñado bajo estándares de prensa financiera seria.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

