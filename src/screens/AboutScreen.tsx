import { useDocumentMeta } from "../hooks/useDocumentMeta";

export default function AboutScreen() {
  useDocumentMeta(
    "Acerca de",
    "Metodología, fuentes de datos públicas y frecuencia de actualización utilizadas por FinanzAR.",
    "/acerca"
  );
  const sources = [
    {
      categoria: "Plazo Fijo & Tasas",
      fuente: "argentinadatos.com",
      url: "https://argentinadatos.com",
      endpoint: "GET /v1/finanzas/tasas/plazoFijo",
      auth: "Sin clave (Pública)",
      frecuencia: "Diaria (Información consolidada BCRA)",
      descripcion: "Tasas Nominales Anuales (TNA) de bancos tradicionales y fintechs para clientes y no clientes.",
    },
    {
      categoria: "FCI Money Market",
      fuente: "argentinadatos.com / CAFCI",
      url: "https://argentinadatos.com",
      endpoint: "GET /v1/finanzas/fci/mercadoDinero/ultimo",
      auth: "Sin clave (Pública)",
      frecuencia: "Diaria al cierre",
      descripcion: "Valor de cuotaparte (VCP), patrimonio administrado y rendimiento de los fondos comunes de rescate inmediato.",
    },
    {
      categoria: "Criptopesos & Stablecoins",
      fuente: "argentinadatos.com",
      url: "https://argentinadatos.com",
      endpoint: "GET /v1/finanzas/criptopesos",
      auth: "Sin clave (Pública)",
      frecuencia: "Intradiaria",
      descripcion: "Rendimientos sobre saldos en tokens atados al peso (ARGt, wARS) provistos por billeteras locales.",
    },
    {
      categoria: "Criptoactivos Globales",
      fuente: "CoinGecko (Keyless Public API)",
      url: "https://www.coingecko.com",
      endpoint: "GET /api/v3/simple/price & market_chart",
      auth: "Sin clave (Atribución obligatoria)",
      frecuencia: "En vivo (~5-15 min con caché)",
      descripcion: "Precios de referencia en USD y ARS para Bitcoin, Ethereum, Solana, BNB, XRP y stablecoins.",
    },
    {
      categoria: "CEDEARs & Acciones Merval",
      fuente: "data912.com",
      url: "https://data912.apidocs.ar",
      endpoint: "GET /live/arg_cedears & /live/arg_stocks",
      auth: "Sin clave (Educativo/Público)",
      frecuencia: "Mercado en tiempo real BYMA",
      descripcion: "Último precio operado, puntas compradora/vendedora, volumen y variación porcentual 24h.",
    },
    {
      categoria: "Bonos & Deuda Soberana",
      fuente: "data912.com",
      url: "https://data912.apidocs.ar",
      endpoint: "GET /live/arg_bonds",
      auth: "Sin clave (Pública)",
      frecuencia: "Cierre y mercado en vivo",
      descripcion: "Cotizaciones de títulos de la deuda pública argentina (AL30, GD30, Letras del Tesoro, etc.).",
    },
    {
      categoria: "Mercado EE.UU. & S&P 500",
      fuente: "data912.com / Twelve Data",
      url: "https://data912.com",
      endpoint: "GET /live/usa_stocks",
      auth: "Sin clave",
      frecuencia: "Horario de negociación NYSE/Nasdaq",
      descripcion: "ETFs indexados (SPY, VOO, QQQ) y acciones estadounidenses para benchmark comparativo.",
    },
    {
      categoria: "Divisas (Dólar, Euro, Real)",
      fuente: "DolarAPI",
      url: "https://dolarapi.com/docs/argentina/",
      endpoint: "GET /v1/dolares & /v1/cotizaciones",
      auth: "Sin clave (Pública)",
      frecuencia: "Intradiaria",
      descripcion: "Cotizaciones de compra/venta del dólar (oficial, blue, MEP, CCL, mayorista, cripto, tarjeta), el euro y el real brasileño.",
    },
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      {/* Título de la Página */}
      <div className="border-b border-finanzar-borderSubtle pb-6 mb-8">
        <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">
          Transparencia & Rigor Metodológico
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary mt-1">
          Acerca de FinanzAR
        </h1>
        <p className="text-sm text-finanzar-textSecondary mt-2 max-w-3xl leading-relaxed">
          FinanzAR centraliza y compara objetivamente las alternativas de ahorro e inversión disponibles desde Argentina.
          Nuestra misión es proveer una referencia sobria, verificable y libre de sesgos para que cada ahorrista tome decisiones patrimoniales informadas.
        </p>
      </div>

      {/* Aviso Legal & Regulatorio Destacado */}
      <section className="bg-finanzar-surface border-l-4 border-finanzar-accent rounded-r-md border-y border-r border-finanzar-border p-6 shadow-sm mb-10">
        <div className="flex items-center space-x-2 text-finanzar-primary font-serif font-bold text-base mb-2">
          <span className="text-finanzar-accent text-lg">⚖</span>
          <h2>Aviso Legal y Disclaimer Oficial</h2>
        </div>
        <p className="text-xs sm:text-sm text-finanzar-textSecondary leading-relaxed">
          <strong>La app es estrictamente informativa y no constituye asesoramiento financiero.</strong> Las tasas y cotizaciones exhibidas tienen un pequeño delay respecto al mercado en tiempo real y pueden presentar variaciones según la plaza de negociación. Para cualquier decisión operativa, confirme siempre los valores vigentes directamente en su banco, Sociedad de Bolsa (ALyC) o exchange autorizado por la Comisión Nacional de Valores (CNV) y el Banco Central de la República Argentina (BCRA).
        </p>
      </section>

      {/* Metodología de Comparación Multi-Activo */}
      <section className="bg-finanzar-surface rounded-md border border-finanzar-border p-6 shadow-sm mb-10">
        <h2 className="font-serif text-xl font-bold text-finanzar-primary mb-3">
          Metodología: ¿Cómo comparamos peras con peras?
        </h2>
        <p className="text-xs sm:text-sm text-finanzar-textSecondary leading-relaxed mb-4">
          Uno de los principales desafíos del ahorrista argentino es comparar instrumentos que cotizan en unidades dispares: tasas nominales anuales fijas (TNA en plazos fijos y cuentas remuneradas), activos en pesos con volatilidad diaria (acciones y CEDEARs), y activos dolarizados (bonos globales y ETFs).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-finanzar-textSecondary">
          <div className="p-4 rounded bg-finanzar-bg border border-finanzar-borderSubtle">
            <h3 className="font-semibold text-finanzar-textMain text-sm mb-1">
              Normalización Porcentual Base 0%
            </h3>
            <p>
              En el <strong>Comparador Multiactivo</strong>, cada serie se indexa al punto de partida del período seleccionado (t₀ = 0%). Cada punto posterior refleja el rendimiento acumulado relativo:
            </p>
            <p className="font-mono text-[11px] bg-finanzar-surface p-2 rounded border border-finanzar-border mt-2 text-finanzar-primary">
              R_t = ((Valor_t - Valor_0) / Valor_0) × 100
            </p>
          </div>
          <div className="p-4 rounded bg-finanzar-bg border border-finanzar-borderSubtle">
            <h3 className="font-semibold text-finanzar-textMain text-sm mb-1">
              Tasas Fijas Devengadas
            </h3>
            <p>
              Para instrumentos con rendimiento nominal diario devengado (plazo fijo y cuentas remuneradas), la tasa anualizada (TNA) se proyecta diariamente según el devengamiento lineal proporcional al plazo transcurrido.
            </p>
          </div>
        </div>
      </section>

      {/* Tabla Detallada de Fuentes de Datos */}
      <section className="bg-finanzar-surface rounded-md border border-finanzar-border shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-finanzar-borderSubtle">
          <h2 className="font-serif text-xl font-bold text-finanzar-primary">
            Fuentes de Datos Públicas y Verificadas
          </h2>
          <p className="text-xs text-finanzar-textSecondary mt-1">
            Todas las fuentes utilizadas en esta primera versión son públicas, abiertas y gratuitas.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-finanzar-bg border-b border-finanzar-borderSubtle uppercase font-semibold text-finanzar-textSecondary">
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Fuente</th>
                <th className="px-4 py-3">Endpoint Base</th>
                <th className="px-4 py-3">Frecuencia</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-finanzar-borderSubtle">
              {sources.map((s, idx) => (
                <tr key={idx} className="hover:bg-finanzar-surfaceHover">
                  <td className="px-4 py-3.5 font-semibold text-finanzar-textMain whitespace-nowrap">
                    {s.categoria}
                  </td>
                  <td className="px-4 py-3.5">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-finanzar-primary hover:text-finanzar-accent underline font-medium"
                    >
                      {s.fuente} ↗
                    </a>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-finanzar-textSecondary">
                    {s.endpoint}
                  </td>
                  <td className="px-4 py-3.5 text-finanzar-textSecondary whitespace-nowrap">
                    {s.frecuencia}
                  </td>
                  <td className="px-4 py-3.5 text-finanzar-textSecondary max-w-xs">
                    {s.descripcion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Atribución Obligatoria CoinGecko */}
      <div className="text-center p-4 rounded bg-finanzar-bg border border-finanzar-borderSubtle text-xs text-finanzar-textSecondary">
        <span>Datos cripto provistos de forma pública y gratuita por </span>
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-finanzar-primary hover:underline"
        >
          CoinGecko (Data provided by CoinGecko)
        </a>.
      </div>
    </main>
  );
}
