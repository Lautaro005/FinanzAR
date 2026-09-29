import { useMemo } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import ProfileButton from "../components/ProfileButton";
import { useAuth } from "../hooks/useAuth";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { Categoria, Instrumento } from "../types";

/* ============================================================
   LANDING (/) — presentación de FinanzAR. La app vive en /app.
   ============================================================ */

const CATEGORIAS: { id: Categoria; label: string }[] = [
  { id: "pesos", label: "Plazos fijos" },
  { id: "fci", label: "FCI" },
  { id: "divisas", label: "Dólar y divisas" },
  { id: "cripto", label: "Cripto" },
  { id: "cedears", label: "CEDEARs" },
  { id: "acciones", label: "Acciones" },
  { id: "bonos", label: "Bonos" },
  { id: "eeuu", label: "EE.UU." },
];

const FUNCIONES = [
  {
    n: "01",
    titulo: "Todo el mercado en una pizarra",
    texto:
      "Plazos fijos, FCI, dólar, cripto, CEDEARs, acciones, bonos y ETFs de EE.UU. en una sola tabla, con cotizaciones en vivo y gráficos históricos.",
    to: "/app",
    cta: "Ver mercados",
  },
  {
    n: "02",
    titulo: "Comparador multiactivo",
    texto:
      "Elegí hasta seis instrumentos de cualquier categoría y contrastá su rendimiento normalizado en un mismo gráfico, aunque se midan en TNA, pesos o dólares.",
    to: "/app/comparar",
    cta: "Comparar",
  },
  {
    n: "03",
    titulo: "Tu portfolio, en pesos o dólares",
    texto:
      "Cargá compras, plazos fijos, FCI y efectivo. Seguí el valor consolidado y el devengado diario, expresado en AR$ o en US$ MEP o Blue.",
    to: "/app/portfolio",
    cta: "Armar portfolio",
  },
  {
    n: "04",
    titulo: "Chat IA con contexto real",
    texto:
      "Consultá a modelos de Groq u OpenRouter con tus propias claves. Responde con tus tenencias y las cotizaciones del momento.",
    to: "/app/chat",
    cta: "Abrir chat",
  },
];

const FUENTES = ["BCRA", "CAFCI", "ArgentinaDatos", "DolarAPI", "BYMA · data912", "CoinGecko"];

type FilaPizarra = { etiqueta: string; detalle: string; valor: string; variacion?: number };

function formatValor(inst: Instrumento): string {
  if (inst.unidad === "TNA") return `${inst.tasaORendimientoActual.toFixed(2)}% TNA`;
  if (inst.unidad === "precio_usd") return `US$ ${inst.tasaORendimientoActual.toLocaleString("es-AR")}`;
  return `$ ${inst.tasaORendimientoActual.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

export default function LandingScreen({
  instruments,
  categoryCounts,
  loading,
  isLive,
}: {
  instruments: Instrumento[];
  categoryCounts: Record<Categoria, number>;
  loading: boolean;
  isLive: boolean;
}) {
  useDocumentMeta(
    "",
    "FinanzAR: compará plazos fijos, FCI, dólar, cripto, CEDEARs, acciones y bonos en Argentina, y seguí tu portfolio en pesos o dólares. Gratis y sin publicidad.",
    "/"
  );
  const { usuario, cargando } = useAuth();

  // Pizarra de referencia del hero: mismos destacados que la pantalla de Mercados.
  const filas = useMemo<FilaPizarra[]>(() => {
    const out: FilaPizarra[] = [];
    const pfs = instruments.filter((i) => i.categoria === "pesos" && i.unidad === "TNA");
    const mejorPf = pfs.length > 0 ? pfs.reduce((max, i) => (i.tasaORendimientoActual > max.tasaORendimientoActual ? i : max)) : null;
    if (mejorPf) out.push({ etiqueta: "Mejor plazo fijo", detalle: mejorPf.entidadOFuente, valor: formatValor(mejorPf) });

    const buscar = (...ids: string[]) => instruments.find((i) => ids.includes(i.id));
    const refs: [string, string, Instrumento | undefined][] = [
      ["Dólar Blue", "Venta", buscar("divisas-usd-blue")],
      ["Dólar MEP", "Venta", buscar("divisas-usd-bolsa")],
      ["Bitcoin", "En pesos", buscar("crypto-bitcoin", "crypto-btc")],
      ["CEDEAR S&P 500", "SPY", buscar("cedears-spy", "cedear-spy")],
    ];
    refs.forEach(([etiqueta, detalle, inst]) => {
      if (inst) out.push({ etiqueta, detalle, valor: formatValor(inst), variacion: inst.variacion24h });
    });
    return out;
  }, [instruments]);

  const totalInstrumentos = instruments.length;

  return (
    <div className="min-h-screen flex flex-col bg-finanzar-bg text-finanzar-textMain font-sans">
      {/* ---------------- Header de la landing ---------------- */}
      <header className="w-full bg-finanzar-surface/95 backdrop-blur border-b border-finanzar-border shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-baseline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finanzar-accent rounded-xs"
          >
            <span className="font-serif text-2xl font-bold tracking-tight text-finanzar-primary">
              Finanz<span className="text-finanzar-accent font-serif">AR</span>
            </span>
          </Link>

          <nav className="hidden md:block" aria-label="Secciones">
            <ul className="flex items-center gap-1 text-xs font-medium">
              {[
                { href: "#funciones", label: "Funciones" },
                { href: "#privacidad", label: "Privacidad" },
                { href: "#fuentes", label: "Fuentes" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-block px-3 py-1 rounded-sm text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  to="/app/changelog"
                  className="inline-block px-3 py-1 rounded-sm text-finanzar-textSecondary hover:text-finanzar-primary hover:bg-finanzar-surfaceHover transition-colors"
                >
                  Novedades
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {cargando ? (
              <span className="w-8 h-8 rounded-full bg-finanzar-surfaceMuted animate-pulse" aria-hidden="true" />
            ) : usuario ? (
              <>
                <Link
                  to="/app"
                  className="hidden sm:inline-flex items-center px-3 py-1.5 rounded text-xs font-semibold bg-finanzar-primary text-finanzar-surface hover:bg-finanzar-primaryHover transition-colors"
                >
                  Abrir la app →
                </Link>
                <ProfileButton />
              </>
            ) : (
              <>
                <Link
                  to="/app/account"
                  className="inline-flex items-center px-3 py-1.5 rounded text-xs font-medium text-finanzar-primary hover:bg-finanzar-surfaceHover transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/app/account?modo=registro"
                  className="inline-flex items-center px-3 py-1.5 rounded text-xs font-semibold bg-finanzar-primary text-finanzar-surface hover:bg-finanzar-primaryHover transition-colors"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden border-b border-finanzar-borderSubtle">
          <span
            className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 rounded-full bg-finanzar-accent/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">
                Beta pública · Gratis y sin publicidad
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-finanzar-primary tracking-tight leading-[1.05] mt-3">
                Tus ahorros, con la claridad de una pizarra financiera.
              </h1>
              <p className="text-base sm:text-lg text-finanzar-textSecondary mt-5 max-w-xl leading-relaxed">
                FinanzAR reúne tasas, cotizaciones y rendimientos de todo lo que se puede comprar en Argentina para que
                compares alternativas y sigas tu portfolio en un solo lugar.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-finanzar-primary text-finanzar-surface font-semibold text-sm hover:bg-finanzar-primaryHover shadow-sm transition-colors"
                >
                  Ver mercados en vivo →
                </Link>
                <Link
                  to="/app/portfolio"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-finanzar-surface border border-finanzar-border text-finanzar-primary font-semibold text-sm hover:border-finanzar-accent transition-colors"
                >
                  {usuario ? "Ir a mi portfolio" : "Armar mi portfolio"}
                </Link>
              </div>
              <p className="text-xs text-finanzar-textMuted mt-4">
                No hace falta crear una cuenta: tu portfolio se guarda en este navegador.
              </p>
            </div>

            {/* Pizarra en vivo */}
            <div className="bg-finanzar-surface border border-finanzar-border rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-finanzar-borderSubtle">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-finanzar-textSecondary">
                  Pizarra de referencia
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-finanzar-textSecondary">
                  <span
                    className={`w-2 h-2 rounded-full ${isLive ? "bg-finanzar-positive animate-pulse" : "bg-finanzar-accent"}`}
                  />
                  {isLive ? "En vivo" : loading ? "Cargando…" : "Datos en caché"}
                </span>
              </div>

              <ul className="divide-y divide-finanzar-borderSubtle">
                {filas.length === 0
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="px-5 py-3.5 flex items-center justify-between">
                        <span className="h-3 w-28 rounded-xs bg-finanzar-surfaceMuted animate-pulse" />
                        <span className="h-4 w-20 rounded-xs bg-finanzar-surfaceMuted animate-pulse" />
                      </li>
                    ))
                  : filas.map((f) => (
                      <li key={f.etiqueta} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-finanzar-textMain">{f.etiqueta}</p>
                          <p className="text-[11px] text-finanzar-textMuted truncate">{f.detalle}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-serif text-lg font-bold text-finanzar-primary tabular-nums">{f.valor}</p>
                          {f.variacion !== undefined && (
                            <p
                              className={`text-[11px] font-bold tabular-nums ${
                                f.variacion >= 0 ? "text-finanzar-positive" : "text-finanzar-negative"
                              }`}
                            >
                              {f.variacion >= 0 ? "↑" : "↓"} {Math.abs(f.variacion).toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
              </ul>

              <Link
                to="/app"
                className="block px-5 py-3 bg-finanzar-bg border-t border-finanzar-borderSubtle text-xs font-semibold text-finanzar-primary hover:text-finanzar-accent transition-colors"
              >
                {totalInstrumentos > 0 ? `Ver los ${totalInstrumentos} instrumentos →` : "Ver todos los instrumentos →"}
              </Link>
            </div>
          </div>
        </section>

        {/* ---------------- Categorías ---------------- */}
        <section className="bg-finanzar-surface border-b border-finanzar-borderSubtle">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-finanzar-textSecondary">
            {CATEGORIAS.map((c) => (
              <span key={c.id} className="inline-flex items-baseline gap-1.5">
                <span className="font-medium text-finanzar-textMain">{c.label}</span>
                {categoryCounts[c.id] > 0 && (
                  <span className="font-mono text-[10px] text-finanzar-textMuted tabular-nums">{categoryCounts[c.id]}</span>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* ---------------- Funciones ---------------- */}
        <section id="funciones" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-20">
          <div className="max-w-2xl mb-10">
            <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Qué podés hacer</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary tracking-tight mt-1">
              Menos pestañas abiertas, mejores decisiones.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-finanzar-border border border-finanzar-border rounded-lg overflow-hidden">
            {FUNCIONES.map((f) => (
              <Link
                key={f.n}
                to={f.to}
                className="group bg-finanzar-surface p-6 sm:p-8 hover:bg-finanzar-surfaceHover transition-colors flex flex-col"
              >
                <span className="font-mono text-xs text-finanzar-accent">{f.n}</span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-finanzar-primary mt-2">{f.titulo}</h3>
                <p className="text-sm text-finanzar-textSecondary mt-2 leading-relaxed flex-1">{f.texto}</p>
                <span className="text-xs font-semibold text-finanzar-primary group-hover:text-finanzar-accent mt-5 transition-colors">
                  {f.cta} →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------------- Privacidad ---------------- */}
        <section id="privacidad" className="border-y border-finanzar-borderSubtle bg-finanzar-surface scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Privacidad</span>
              <h2 className="font-serif text-3xl font-bold text-finanzar-primary tracking-tight mt-1">
                Tus números son tuyos.
              </h2>
              <p className="text-sm text-finanzar-textSecondary mt-3 leading-relaxed">
                FinanzAR funciona sin cuenta. Si querés ver tu portfolio en el celular y en la compu, creás una y activás
                la sincronización; si no, nada sale de tu navegador.
              </p>
              <Link
                to="/app/privacidad"
                className="inline-block mt-4 text-xs font-semibold text-finanzar-primary hover:text-finanzar-accent underline"
              >
                Leer la política de privacidad
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-finanzar-textSecondary">
              {[
                { t: "Local por defecto", d: "El portfolio vive en tu navegador. Podés exportarlo o importarlo como backup JSON." },
                { t: "Sincronización opcional", d: "Con cuenta, cada cambio se copia a la nube. Si la desactivás, esa copia se borra." },
                { t: "Tus claves de IA", d: "Las API keys de Groq y OpenRouter se guardan en tu dispositivo, no en nuestros servidores." },
              ].map((n) => (
                <div key={n.t} className="border-l-2 border-finanzar-accent/60 pl-4">
                  <p className="font-semibold text-finanzar-primary">{n.t}</p>
                  <p className="mt-1 leading-relaxed text-xs">{n.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- Fuentes ---------------- */}
        <section id="fuentes" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center scroll-mt-20">
          <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-textSecondary">
            Datos de fuentes públicas
          </span>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-4">
            {FUENTES.map((f) => (
              <span key={f} className="font-serif text-lg sm:text-xl text-finanzar-primary/80">
                {f}
              </span>
            ))}
          </div>
          <Link
            to="/app/acerca"
            className="inline-block mt-5 text-xs text-finanzar-textSecondary hover:text-finanzar-primary underline"
          >
            Metodología y frecuencia de actualización
          </Link>
        </section>

        {/* ---------------- CTA final ---------------- */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="relative overflow-hidden rounded-lg bg-finanzar-primary px-6 py-12 sm:px-12 text-center">
            <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-finanzar-accent to-transparent" aria-hidden="true" />
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-surface tracking-tight">
              Empezá a comparar hoy.
            </h2>
            <p className="text-sm text-finanzar-surface/70 mt-3 max-w-lg mx-auto">
              Sin registro, sin tarjeta y sin publicidad. Abrí la pizarra y mirá dónde rinde más tu plata.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
              <Link
                to="/app"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded bg-finanzar-accent text-finanzar-primary font-semibold text-sm hover:bg-finanzar-accentHover transition-colors"
              >
                Abrir FinanzAR →
              </Link>
              {!usuario && (
                <Link
                  to="/app/account?modo=registro"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded border border-finanzar-surface/30 text-finanzar-surface font-semibold text-sm hover:border-finanzar-accent transition-colors"
                >
                  Crear cuenta gratis
                </Link>
              )}
            </div>
          </div>
          <p className="text-[11px] text-finanzar-textMuted text-center mt-6 max-w-2xl mx-auto leading-relaxed">
            FinanzAR es una herramienta informativa: no es un bróker ni una entidad regulada, no ejecuta operaciones y no
            brinda asesoramiento financiero. Verificá siempre las condiciones con cada entidad antes de invertir.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
