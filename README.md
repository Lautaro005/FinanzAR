# FinanzAR

> Plataforma analítica y comparadora de alternativas de inversión y ahorro en Argentina.

Centraliza en un único lugar las principales opciones para colocar capital en el mercado argentino —en pesos y en activos globales— exhibiendo **tasa/rendimiento vigente y series históricas interactivas** para facilitar la toma de decisiones patrimoniales transparentes.

---

## 🏛️ Identidad Visual & Paleta Oficial

FinanzAR está diseñada bajo la premisa de sobriedad y rigor editorial de la **banca privada y la prensa financiera clásica** (*Financial Times, Bloomberg, The Economist*). Se prescinde de la estética cripto/neón y de la clásica combinación rojo/verde de alarma o casino.

| Rol | Color / Denominación | Token Hex | Uso en la Interfaz |
|---|---|---|---|
| **Primario** | Azul tinta / Navy | `#1B2A4A` | Encabezados, marca, bordes estructurados y botones principales |
| **Acento** | Dorado cálido / Mostaza | `#C89B3C` | Tabs activas, chips destacados e indicadores de foco |
| **Fondo** | Crema / Papel financiero | `#F7F4EC` | Fondo de página (`body`) para lectura prolongada y descansada |
| **Texto Principal** | Carbón profundo | `#26262B` | Tipografía de títulos, métricas y lectura de máxima legibilidad |
| **Texto Secundario** | Gris piedra | `#8B8478` | Subtítulos, tickers, etiquetas de metadatos y divisores |
| **Variación Positiva** | Azul medio financiero | `#2F5FA8` | Rendimientos superiores, retornos acumulados positivos y flechas ↑ |
| **Variación Negativa** | Terracota sobrio | `#B5502E` | Variaciones desfavorables, caídas porcentuales y flechas ↓ |
| **Superficie / Tarjetas** | Blanco cálido | `#FFFDF8` | Contenedores, tarjetas métricas, tablas y modales |

---

## 🛠️ Stack Tecnológico

- **Framework UI:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling:** [Vite 5](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS 3](https://tailwindcss.com/) (configuración personalizada de tokens y tipografías `Newsreader`, `Plus Jakarta Sans` y `JetBrains Mono`)
- **Visualización de Datos:** [Recharts](https://recharts.org/) (gráficos vectoriales interactivos con tooltip tabular y soporte multiserie)
- **Enrutamiento:** [React Router DOM v6](https://reactrouter.com/)
- **Persistencia & Caché:** `localStorage` nativo con TTL (Time-To-Live) configurable por fuente.

---

## 📊 Fuentes de Datos Gratuitas y Públicas

FinanzAR opera en su versión v1 consumiendo APIs abiertas sin necesidad de autenticación paga o intermediación propietaria:

| Instrumento / Mercado | Fuente Proveedora | Endpoint Base | Frecuencia de Actualización |
|---|---|---|---|
| **Plazo Fijo Bancario** | `argentinadatos.com` | `GET /v1/finanzas/tasas/plazoFijo` | Diaria (información oficial BCRA) |
| **FCI Money Market** | `argentinadatos.com` | `GET /v1/finanzas/fci/mercadoDinero/ultimo` | Diaria (cierre CAFCI) |
| **Cripto-Pesos (Stablecoins)** | `argentinadatos.com` | `GET /v1/finanzas/criptopesos` | Intradiaria (Belo, Ripio, etc.) |
| **Dólar (Oficial, Blue, MEP, CCL)** | `argentinadatos.com` | `GET /v1/cotizaciones/dolares` | Intradiaria y series históricas |
| **Criptoactivos Globales** | `CoinGecko Keyless Public API` | `GET /api/v3/simple/price` | En vivo (*Data provided by CoinGecko*) |
| **CEDEARs (Acciones y ETFs Extranjeros)** | `data912.com` | `GET /live/arg_cedears` | En tiempo real BYMA |
| **Acciones Argentinas (Merval)** | `data912.com` | `GET /live/arg_stocks` | En tiempo real BYMA |
| **Bonos Soberanos & Deuda Pública** | `data912.com` | `GET /live/arg_bonds` | Mercado abierto BYMA / MAE |
| **Acciones & ETFs EE.UU. (S&P 500, etc.)** | `data912.com` | `GET /live/usa_stocks` | En vivo mercados NYSE / Nasdaq |

---

## 📱 Pantallas Implementadas

1. **Pizarra de Mercados (Home `/`)**:
   - Indicadores KPI superiores con los activos líderes del mercado.
   - Pestañas por categoría: *Pesos, Cripto, CEDEARs, Acciones, Bonos, EE.UU.* con conteo en tiempo real.
   - Buscador universal por nombre, ticker o emisor.
   - Tabla ordenable por rendimiento, variación 24h, entidad o nombre.
   - Previsualización rápida de gráfico y acceso directo a ficha.
   - Cajón flotante (*CompareDrawer*) para agregar hasta 6 instrumentos en simultáneo.

2. **Ficha de Instrumento (`/instrumento/:id`)**:
   - Encabezado con datos regulatorios, emisor y ticker.
   - Tarjeta métrica destacada de TNA o cotización vigente.
   - Gráfico de alta resolución con selector de horizonte temporal (`7D`, `30D`, `90D`, `1A`, `MÁX`).
   - Mínimos y máximos históricos del activo.
   - Panel de alternativas similares de la misma categoría.
   - Botón directo para incorporar a la comparación multiactivo.

3. **Comparador Multiactivo Superpuesto (`/comparar`)**:
   - Normalización porcentual base 0% ($t_0 = 0\%$) para contrastar activos con unidades dispares (tasas TNA vs precios en ARS vs cotizaciones en USD).
   - Selector interactivo de activos con colores diferenciados de la paleta institucional.
   - Gráfico multiserie con tooltip dinámico de alta precisión.
   - Tarjetas de retorno acumulado en el período comparado.

4. **Acerca de & Metodología (`/acerca`)**:
   - Transparencia detallada de cada endpoint y proveedor.
   - Explicación matemática del modelo de normalización relativa.
   - Atribuciones formales requeridas.
   - Aviso legal y disclaimer regulatorio obligatorio.

---

## 📁 Estructura del Código

```text
FinanzAR/
├── src/
│   ├── main.tsx                    # Punto de entrada de React
│   ├── App.tsx                     # Router principal y pantallas Home & Compare
│   ├── types.ts                    # Modelo unificado de datos (Instrumento, Categoria, etc.)
│   ├── screens/
│   │   ├── InstrumentDetailScreen.tsx # Ficha dedicada con gráfico grande y métricas
│   │   └── AboutScreen.tsx         # Página de transparencia de fuentes y metodología
│   ├── components/
│   │   ├── Header.tsx              # Barra de navegación con indicador de estado en vivo
│   │   ├── CategoryTabs.tsx        # Selector por segmentos con badges de cantidad
│   │   ├── InstrumentTable.tsx     # Tabla comparativa con ordenamiento y filtros
│   │   ├── InstrumentChart.tsx     # Gráfico histórico interactivo Recharts
│   │   ├── CompareDrawer.tsx       # Bandeja inferior para selección multiactivo
│   │   └── Footer.tsx              # Disclaimer legal y accesos a fuentes
│   ├── hooks/
│   │   ├── useInstruments.ts       # Hook unificado que orquesta todas las fuentes
│   │   ├── useArgentinaDatos.ts    # Fetch y normalización de plazos fijos, FCI y criptopesos
│   │   ├── useCoinGecko.ts         # Fetch de criptomonedas con protección de rate-limiting
│   │   └── useData912.ts           # Fetch de CEDEARs, acciones locales y bonos
│   ├── lib/
│   │   ├── api/
│   │   │   ├── argentinaDatos.ts   # Cliente tipado de ArgentinaDatos
│   │   │   ├── coingecko.ts        # Cliente tipado de CoinGecko API
│   │   │   └── data912.ts          # Cliente tipado de Data912
│   │   ├── cache.ts                # Motor de almacenamiento local con TTL
│   │   ├── normalize.ts            # Transformadores de datos raw al modelo Instrumento
│   │   └── mockData.ts             # Datos de referencia y respaldo offline de alta fidelidad
│   └── styles/
│       └── globals.css             # Tokens CSS de la paleta y configuración tipográfica
├── public/
├── index.html
├── package.json
├── tailwind.config.ts
└── README.md
```

---

## 🚀 Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo local
npm run dev

# 3. Compilar para producción (TypeScript + Vite)
npm run build

# 4. Previsualizar compilación de producción
npm run preview

# 5. Verificación de tipos TypeScript
npm run lint
```

---

## ⚖️ Aviso Legal y Disclaimer

> **FinanzAR es una herramienta exclusivamente informativa y comparativa.**  
> Los datos, cotizaciones y tasas presentados provienen de fuentes públicas y pueden contener un pequeño retardo respecto a la cotización en tiempo real. La información provista no constituye recomendación ni oferta de compra o venta de ningún instrumento financiero. Antes de operar, consulte siempre con su banco, agente de liquidación y compensación (ALyC) o asesor financiero matriculado ante la **Comisión Nacional de Valores (CNV)** y el **Banco Central de la República Argentina (BCRA)**.
