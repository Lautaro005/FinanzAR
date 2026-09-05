import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { CHANGELOG } from "../lib/changelog";
import { formatFechaCorta } from "../lib/portfolio";

export default function ChangelogScreen() {
  useDocumentMeta(
    "Changelog",
    "Novedades de cada versión de FinanzAR: qué se agregó, qué se corrigió y cuándo.",
    "/changelog"
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      <div className="border-b border-finanzar-borderSubtle pb-6 mb-8">
        <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Novedades</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary mt-1">Changelog</h1>
        <p className="text-sm text-finanzar-textSecondary mt-2">
          Qué cambia en cada versión de FinanzAR. La versión vigente figura al pie de todas las páginas.
        </p>
      </div>

      <ol className="relative border-l border-finanzar-borderSubtle ml-2 space-y-10">
        {CHANGELOG.map((v, i) => (
          <li key={v.version} className="pl-6">
            <span
              className={`absolute -left-[5px] mt-2 w-2.5 h-2.5 rounded-full border-2 border-finanzar-bg ${
                i === 0 ? "bg-finanzar-accent" : "bg-finanzar-borderStrong"
              }`}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-serif text-xl font-bold text-finanzar-primary">
                v{v.version}
                {i === 0 && (
                  <span className="ml-2 align-middle text-[10px] uppercase tracking-wider font-sans font-semibold px-1.5 py-0.5 rounded-xs bg-finanzar-accentSubtle text-finanzar-accentHover border border-finanzar-accent/40">
                    actual
                  </span>
                )}
              </h2>
              <span className="text-xs text-finanzar-textSecondary">{formatFechaCorta(v.fecha)}</span>
            </div>
            <p className="text-sm font-medium text-finanzar-textMain mt-1">{v.titulo}</p>
            <ul className="mt-3 space-y-2 text-sm text-finanzar-textSecondary leading-relaxed list-disc pl-5 marker:text-finanzar-accent">
              {v.cambios.map((c, j) => (
                <li key={j}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
