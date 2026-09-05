import { useDocumentMeta } from "../hooks/useDocumentMeta";

/**
 * Placeholder de la sección Portfolio. Se agrega vacía (solo header + footer,
 * heredados del layout en App.tsx) a pedido del usuario, para desarrollar el
 * contenido en una etapa posterior.
 */
export default function PortfolioScreen() {
  useDocumentMeta(
    "Portfolio",
    "Seguimiento de tu portfolio personal de inversiones en FinanzAR — próximamente.",
    "/portfolio"
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-[70vh] text-center">
      <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">
        Próximamente
      </span>
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-finanzar-primary tracking-tight mt-2">
        Portfolio
      </h1>
      <p className="text-finanzar-textSecondary mt-4 max-w-lg mx-auto">
        Esta sección está en construcción. Muy pronto vas a poder armar y hacer seguimiento acá de tu propio portfolio de inversiones.
      </p>
    </main>
  );
}
