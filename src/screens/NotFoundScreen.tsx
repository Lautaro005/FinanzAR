import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const REDIRECT_SECONDS = 8;

export default function NotFoundScreen() {
  useDocumentMeta(
    "Página no encontrada (404)",
    "La página que buscás no existe o fue movida. Volvé al inicio de FinanzAR para ver la pizarra de tasas y rendimientos.",
    "/404"
  );

  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate("/", { replace: true });
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, navigate]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-[70vh] text-center">
      <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">Error 404</span>
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-finanzar-primary tracking-tight mt-2">
        Esta página no existe
      </h1>
      <p className="text-finanzar-textSecondary mt-4 max-w-lg mx-auto">
        Puede que el enlace esté roto o que el instrumento ya no esté disponible. Te llevamos al inicio en{" "}
        <strong className="text-finanzar-textMain tabular-nums">{secondsLeft}</strong> segundos.
      </p>
      <Link
        to="/"
        className="inline-block mt-8 px-5 py-2.5 rounded bg-finanzar-primary text-finanzar-surface font-semibold text-sm hover:bg-finanzar-accent transition-colors"
      >
        Ir al inicio ahora →
      </Link>
    </main>
  );
}
