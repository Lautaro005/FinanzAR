import { useDocumentMeta } from "../hooks/useDocumentMeta";

export default function PrivacyPolicyScreen() {
  useDocumentMeta(
    "Política de Privacidad",
    "Cómo FinanzAR maneja los datos de navegación: qué se guarda en tu dispositivo, qué se comparte con terceros y cómo contactarnos.",
    "/privacidad"
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      <div className="border-b border-finanzar-borderSubtle pb-6 mb-8">
        <span className="text-xs uppercase tracking-wider font-semibold text-finanzar-accent">
          Legal
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-finanzar-primary mt-1">
          Política de Privacidad
        </h1>
        <p className="text-xs text-finanzar-textSecondary mt-2">
          Última actualización: septiembre de 2026.
        </p>
      </div>

      <div className="space-y-8 text-sm text-finanzar-textSecondary leading-relaxed">
        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            1. Qué es FinanzAR
          </h2>
          <p>
            FinanzAR es una herramienta informativa y comparativa de instrumentos de ahorro e inversión disponibles en Argentina. No es un bróker, ALyC, banco ni entidad regulada por la CNV o el BCRA: no gestiona cuentas, no ejecuta operaciones ni recibe fondos de los usuarios.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            2. Qué datos NO recolectamos
          </h2>
          <p>
            FinanzAR no requiere registro ni inicio de sesión. No solicitamos nombre, correo electrónico, DNI/CUIT, datos bancarios ni ninguna información que permita identificarte personalmente para usar la aplicación.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            3. Almacenamiento local en tu navegador
          </h2>
          <p>
            Para acelerar la carga y reducir pedidos innecesarios a las APIs públicas de terceros, FinanzAR guarda temporalmente en el almacenamiento local de tu navegador (localStorage): cotizaciones y tasas ya consultadas (con una vigencia corta, de minutos), y los instrumentos que hayas marcado para comparar durante tu visita. Esta información queda únicamente en tu dispositivo, no se envía a ningún servidor propio de FinanzAR y podés borrarla en cualquier momento limpiando los datos del sitio desde la configuración de tu navegador.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            4. Datos técnicos de hosting y analítica
          </h2>
          <p>
            El sitio está alojado en Vercel, que puede registrar logs técnicos estándar de acceso (dirección IP, user-agent, fecha/hora) con fines de operación, seguridad y métricas agregadas, conforme a su propia política de privacidad. FinanzAR no incorpora píxeles de seguimiento publicitario ni vende ni comparte datos de navegación con terceros con fines comerciales.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            5. Fuentes de datos de terceros
          </h2>
          <p>
            Las cotizaciones, tasas y rendimientos que se muestran provienen de APIs públicas de terceros (ArgentinaDatos, CoinGecko, data912.com, entre otras detalladas en la sección{" "}
            <a href="/acerca" className="text-finanzar-primary hover:text-finanzar-accent underline font-medium">
              Acerca de
            </a>
            ). FinanzAR no controla ni se responsabiliza por la disponibilidad, exactitud o políticas de privacidad de esos servicios externos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            6. Cambios a esta política
          </h2>
          <p>
            Esta política puede actualizarse a medida que la aplicación incorpore nuevas funcionalidades. La fecha de la última actualización figura al inicio de esta página.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg font-bold text-finanzar-primary mb-2">
            7. Contacto
          </h2>
          <p>
            Para consultas sobre esta política, podés escribirnos a través de los canales indicados en la sección{" "}
            <a href="/acerca" className="text-finanzar-primary hover:text-finanzar-accent underline font-medium">
              Acerca de
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
