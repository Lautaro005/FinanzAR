// Historial de versiones que se muestra en /changelog.
//
// Criterio de numeración (semver acotado, documentado en references/finanzar-REFERENCE.md):
//   0.MINOR.PATCH mientras la app esté en beta pública.
//   - MINOR sube con cada funcionalidad o sección nueva visible para el usuario.
//   - PATCH sube con correcciones, ajustes visuales o cambios de datos sin funcionalidad nueva.
//   - 1.0.0 cuando el portfolio + cuenta lleven un tiempo estables sin cambios de forma en los datos.
// La entrada más nueva va PRIMERO. `APP_VERSION` es la versión vigente y se muestra en el footer.

export interface VersionChangelog {
  version: string;
  /** YYYY-MM-DD */
  fecha: string;
  titulo: string;
  cambios: string[];
}

export const CHANGELOG: VersionChangelog[] = [
  {
    version: "0.4.2",
    fecha: "2026-09-07",
    titulo: "Optimización de pantalla Chat IA sin scroll vertical, ajuste de componentes y robustez en respuestas",
    cambios: [
      "Pantalla /chat sin scroll vertical en la página: Header, barra de acciones y Footer compacto permanecen siempre a la vista ajustados al 100% del alto de pantalla (100dvh), confinando el desplazamiento exclusivamente al historial de mensajes.",
      "Ajuste proporcional y compacto de componentes en Chat IA: reducción armoniosa de tamaños en burbujas de diálogo, tipografía, sugerencias, estado vacío e input flotante sin reducir el ancho disponible.",
      "Corrección del popover de privacidad y modelo: apertura orientada hacia la izquierda en la ventana flotante y panel lateral, evitando recortes en los bordes de la pantalla.",
      "Procesamiento robusto de respuestas en streaming (SSE): decodificación tolerante de chunks de texto y razonamiento (reasoning_content) para modelos DeepSeek y Groq, depuración de mensajes vacíos y prevención de respuestas en blanco.",
    ],
  },
  {
    version: "0.4.1",
    fecha: "2026-09-07",
    titulo: "Soporte de tablas en respuestas de IA, diseño minimalista de chat e input flotante",
    cambios: [
      "Soporte completo de tablas Markdown en las respuestas del asistente: visualización prolija de cotizaciones y resúmenes de inversiones con alineación de columnas, tipografía tabular y contenedor con desplazamiento horizontal.",
      "Reorganización de información: se trasladaron los textos de privacidad y cambio de modelo/proveedor del pie del chat a un ícono de información (ⓘ) junto a 'Portfolio & Mercados conectados'.",
      "Rediseño minimalista de la pantalla /chat: remoción del título beta y eliminación de la barra lateral, unificando toda la pantalla con un único fondo continuo entre el header y el footer.",
      "Barra de acciones integrada bajo el header (estilo Portfolio): botones de 'Ver mi portfolio', 'Configurar IA', '+ Nuevo chat' y dropdown propio de historial de conversaciones sin dependencias externas.",
      "Input de chat flotante: campo de escritura y botón de envío suspendidos sobre el área inferior del chat con efecto translúcido y bordes redondeados.",
    ],
  },
  {
    version: "0.4.0",
    fecha: "2026-09-06",
    titulo: "Chat IA patrimonial con datos de mercado en vivo, widget flotante y optimizaciones en Portfolio",
    cambios: [
      "Sistema de Chat IA (Groq y OpenRouter) con streaming en tiempo real: responde consultas patrimoniales y financieras con conocimiento contextual de las tenencias del usuario y de las cotizaciones en vivo del mercado.",
      "Botón flotante en la esquina inferior derecha con ventana de chat adaptable: modo ventana flotante, panel lateral acoplado (sidebar en desktop) y pantalla completa (en tablet y mobile), con historial local de conversaciones en el dispositivo.",
      "Nueva pantalla dedicada /chat accesible desde la barra de navegación principal a la derecha de Portfolio, con barra lateral de historial de consultas, botón para nuevo chat y sugerencias rápidas.",
      "Acceso exclusivo al Chat IA para usuarios con cuenta iniciada, con pantalla de autenticación informativa.",
      "Desvinculación del cambio de divisa (ARS/USD): cambiar la moneda de visualización ahora es 100% local en el dispositivo, evitando escrituras y lecturas innecesarias en la base de datos (Turso).",
      "Mejoras en el gráfico de evolución del portfolio: la línea ahora arranca desde cero al añadir un nuevo activo y asciende hasta el capital invertido (reflejando caídas proporcionales en retiros de efectivo), y las etiquetas del eje vertical muestran números enteros redondos sin decimales ni comas (ej. $11k, $10k, $1M, $500).",
    ],
  },
  {
    version: "0.3.1",
    fecha: "2026-09-06",
    titulo: "Actualización de modelos de Groq en vivo y nuevo README del proyecto",
    cambios: [
      "Extracción en tiempo real de los modelos vigentes de Groq al ingresar la API key (consultando endpoint oficial https://api.groq.com/openai/v1/models con debounce).",
      "Actualización de los modelos recomendados de respaldo para Groq (Llama 3.3 70B, Llama 3.1 8B, OpenAI GPT-OSS 120B/20B, Qwen 3.6 27B, DeepSeek R1 Distill 70B) y remoción de modelos discontinuados.",
      "Migración transparente automática: si un usuario tenía configurado un modelo dado de baja, se migra a Llama 3.3 70B Versatile.",
      "Indicador visual dinámico en el selector de modelos (badge verde con conteo en vivo de modelos o estado de respaldo) y botón de recarga manual a demanda.",
      "Rediseño integral del README del proyecto en GitHub, enfocado en el usuario y explicando las capacidades de la app de forma clara y accesible.",
    ],
  },
  {
    version: "0.3.0",
    fecha: "2026-09-06",
    titulo: "Soporte para IA (Groq y OpenRouter) y mejoras de interfaz en Portfolio",
    cambios: [
      "Soporte de API Keys para Groq y OpenRouter en Mi cuenta (visible con sesión iniciada), organizado en panel de dos columnas con selector de proveedor.",
      "Selector de modelos personalizado (sin dropdown nativo de HTML) con buscador en tiempo real y soporte para filtrar solo modelos gratuitos en OpenRouter.",
      "Persistencia local de claves y modelo activo seleccionado para cada proveedor de IA.",
      "Portfolio: el estado de sincronización, el link a privacidad y la acción para borrar el portfolio se trasladaron al ícono de información (ⓘ) junto al título principal.",
      "Eliminada la línea divisoria y la fila inferior del pie en Portfolio para una interfaz más despejada.",
      "Ajuste en el popover de información US$ de Portfolio: se removió la indicación sobre cambiar la cotización en Mi cuenta.",
    ],
  },
  {
    version: "0.2.0",
    fecha: "2026-09-06",
    titulo: "Efectivo, Movimientos unificado y grafico con devengado real",
    cambios: [
      "Nueva seccion \"Efectivo\" en Portfolio: dinero que no esta invertido en ningun instrumento. Se carga a mano (+ Ingreso / - Retiro) y tambien se acredita solo al rescatar un FCI o retirar un plazo fijo.",
      "\"Movimientos\" ahora muestra TODO: antes solo listaba compras/ventas y un alta de plazo fijo, FCI o un rescate no aparecia. Se unifico con un historial de eventos (alta y retiro de plazo fijo, alta y rescate de FCI, ingreso y retiro de efectivo).",
      "El selector de cotizacion del dolar volvio a Portfolio (barra de acciones, debajo del header, junto al resto de las opciones) y se saco de Mi cuenta.",
      "El grafico de evolucion ahora reconstruye el devengado real de cada plazo fijo/FCI y el precio historico de cada posicion de mercado para los dias previos al primer punto guardado, en vez de una linea plana: si algo cargado hace unos dias viene ganando (o perdiendo), se ve la curva.",
      "El eje vertical del grafico ahora se ajusta al rango real de valores de cada vista, en vez de mostrar siempre la misma escala fija sin importar los datos.",
      "Retirar efectivo ahora baja el valor total mostrado en el grafico, igual que cualquier otra baja de valor.",
    ],
  },
  {
    version: "0.1.0",
    fecha: "2026-09-05",
    titulo: "Cuenta, sincronización y portfolio en pesos o dólares",
    cambios: [
      "Cuenta opcional (nombre, email y contraseña) con sesión persistente, ícono de perfil en el header y página Mi cuenta.",
      "Sincronización del portfolio con la cuenta: se activa desde Mi cuenta y cada cambio se guarda para verlo en cualquier dispositivo; si la cuenta y el dispositivo tienen portfolios distintos, elegís cuál conservar.",
      "Con la sincronización activa, exportar/importar backup pasan a Mi cuenta y el Portfolio muestra el estado de sincronización.",
      "Toggle AR$ / US$ junto al título del Portfolio: todos los valores (KPIs, tablas, movimientos y gráfico) se expresan en la moneda elegida, con un ícono de info que explica la conversión.",
      "La cotización del dólar para convertir se elige ahora en Mi cuenta → Configuración, con un selector visual que muestra cada cotización en vivo.",
      "Gráfico del portfolio: el eje cubre todo el rango elegido (7/30/90 días, 1 año) y desde el día en que cargaste activos se dibuja una línea plana que se va curvando con los puntos de cada día.",
      "Login y registro rediseñados, más livianos; las notas sobre qué guarda la cuenta quedaron debajo del formulario.",
      "Nueva página Changelog (esta), enlazada desde el pie junto a Privacidad, y política de privacidad actualizada con la sección de cuenta.",
    ],
  },
  {
    version: "0.0.x",
    fecha: "2026-09-03",
    titulo: "Versiones previas (sin numerar)",
    cambios: [
      "Mercados: plazos fijos, FCI (4 categorías), cripto, CEDEARs, acciones, bonos, EE.UU. y divisas con cotizaciones en vivo, gráficos históricos y comparador multiactivo.",
      "Indicador de mercado abierto/cerrado (Argentina, EE.UU., cripto) en el header y en las pestañas.",
      "Portfolio personal: compras/ventas a costo promedio, plazos fijos con devengo, FCI por rendimiento, consolidación en pesos, gráfico de evolución y backup JSON.",
      "Rendimiento de FCI calculado contra fotos completas de ~30 días, con fondos populares y actualizados.",
      "Snapshot histórico diario para las categorías sin histórico público (plazos fijos, FCI, bonos, EE.UU.).",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
