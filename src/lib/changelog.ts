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
