# Sistema de Diseño — FinanzAR

> **Versión:** 1.0.0  
> **Ámbito:** Frontend Web (React + TypeScript + Vite + Tailwind CSS + Recharts)  
> **Identidad de Marca:** Banca Privada & Prensa Financiera de Referencia (*Financial Times, The Economist, Bloomberg*)  
> **Regla de Estilo:** Sobriedad analítica y rigor tipográfico. **Cero estética crypto/neón.**

---

## 1. Fundamentos y Filosofía Visual

FinanzAR es una herramienta de análisis y toma de decisiones patrimoniales para el ahorrista e inversor argentino. Su interfaz debe transmitir **confianza institucional, serenidad, precisión y transparencia absoluta**.

### 1.1 Principios de Diseño
1. **Rigor Editorial:** Jerarquía clara inspirada en las páginas de mercados de la prensa financiera anglosajona clásica.
2. **Prioridad del Dato:** Los números y series de tiempo son el contenido principal; la interfaz actúa como soporte silencioso.
3. **Cromática Clásica y Cálida:** Se prescinde del fondo oscuro saturado y de los tonos flúo. La base es un papel crema (`#F7F4EC`) con tarjetas en blanco cálido (`#FFFDF8`) y tipografía en tinta carbón (`#26262B`).
4. **Semántica Financiera Sobria:** Se rechaza el típico combo "verde casino / rojo alarma". Las variaciones positivas se expresan en **azul medio financiero (`#2F5FA8`)** y las negativas en **terracota cálido (`#B5502E`)**.
5. **Alineación Numérica Perfecta:** Todas las cifras, tasas y precios utilizan fuentes con espaciado monoespaciado o cifras tabulares (`tabular-nums`) para posibilitar la comparación visual instantánea columna por columna.

---

## 2. Paleta de Colores Oficial

### 2.1 Colores Principales Obligatorios

| Nombre Token | Rol | Hex | HSL aproximado | Uso Principal |
|---|---|---|---|---|
| `primary` | Navy institucional / Tinta | `#1B2A4A` | `220° 46% 20%` | Encabezados principales, logo, botones primarios, bordes fuertes |
| `accent` | Dorado cálido / Mostaza | `#C89B3C` | `40° 56% 51%` | Indicadores de foco, tabs activas, CTAs selectos, acentos de marca |
| `bg` | Crema / Papel financiero | `#F7F4EC` | `45° 40% 95%` | Fondo de toda la aplicación (`body`) |
| `surface` | Blanco cálido | `#FFFDF8` | `43° 100% 99%` | Contenedores, tarjetas, tablas, drawers, modales |
| `text` | Carbón profundo | `#26262B` | `240° 6% 16%` | Títulos, valores clave, texto de máxima lectura |
| `text-secondary`| Gris piedra cálido | `#8B8478` | `38° 8% 51%` | Metadatos, etiquetas auxiliares, tickers, subtítulos |
| `positive` | Azul medio financiero | `#2F5FA8` | `216° 56% 42%` | Variaciones positivas (+), rendimientos superiores, flechas ↑ |
| `negative` | Terracota sobrio | `#B5502E` | `15° 60% 45%` | Variaciones negativas (-), pérdidas, flechas ↓ |

### 2.2 Colores Derivados y Superficies Auxiliares

| Nombre Token | Hex | Propósito |
|---|---|---|
| `primary-hover` | `#142038` | Hover de botones y elementos navy |
| `accent-hover` | `#B2872F` | Hover de elementos dorados |
| `accent-subtle` | `#F6EEDC` | Fondos de selección sutil y badges de acento |
| `surface-hover` | `#FDFBF4` | Hover de filas de tabla y tarjetas interactivas |
| `border-subtle` | `#E8E2D5` | Separadores internos de tablas y líneas secundarias |
| `border-default`| `#DBD3C2` | Bordes de tarjetas, inputs y divisores estructurales |
| `positive-bg` | `#EBF2FA` | Fondo de badges con variación positiva |
| `positive-border`| `#C2D6EE` | Borde de badges con variación positiva |
| `negative-bg` | `#FDF1ED` | Fondo de badges con variación negativa |
| `negative-border`| `#F0C4B6` | Borde de badges con variación negativa |

---

## 3. Variables CSS para `src/styles/globals.css`

Este bloque debe integrarse íntegramente en `src/styles/globals.css`.

```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* --- Paleta Obligatoria --- */
  --color-primary: #1B2A4A;
  --color-primary-hover: #142038;
  --color-primary-light: #2A3F6D;
  
  --color-accent: #C89B3C;
  --color-accent-hover: #B2872F;
  --color-accent-subtle: #F6EEDC;
  
  --color-bg: #F7F4EC;
  --color-surface: #FFFDF8;
  --color-surface-hover: #FDFBF4;
  --color-surface-muted: #F0EAE1;
  
  --color-text: #26262B;
  --color-text-secondary: #8B8478;
  --color-text-muted: #A39D92;
  
  --color-positive: #2F5FA8;
  --color-positive-bg: #EBF2FA;
  --color-positive-border: #C2D6EE;
  
  --color-negative: #B5502E;
  --color-negative-bg: #FDF1ED;
  --color-negative-border: #F0C4B6;

  --color-border: #DBD3C2;
  --color-border-subtle: #E8E2D5;
  --color-border-strong: #8B8478;

  /* --- Tipografía --- */
  --font-serif: 'Newsreader', Georgia, 'Times New Roman', serif;
  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  /* --- Espaciado Sistemático --- */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */

  /* --- Radios de Borde (Sobrios y Estructurados) --- */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* --- Sombras (Cálidas y Sutiles) --- */
  --shadow-sm: 0 1px 2px rgba(27, 42, 74, 0.04);
  --shadow-md: 0 4px 12px -2px rgba(27, 42, 74, 0.06), 0 2px 4px -1px rgba(27, 42, 74, 0.03);
  --shadow-lg: 0 10px 24px -4px rgba(27, 42, 74, 0.08), 0 4px 8px -2px rgba(27, 42, 74, 0.04);
  --shadow-drawer: 0 -8px 24px -4px rgba(27, 42, 74, 0.12);
}

/* Reglas Globales Base */
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Forzar cifras tabulares en datos cuantitativos */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Scrollbar con estilo institucional discreto */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg);
}
::-webkit-scrollbar-thumb {
  background: #DBD3C2;
  border-radius: var(--radius-sm);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
```

---

## 4. Tipografía y Escala Jerárquica

La tipografía combina el rigor periodístico con la ergonomía visual de una aplicación moderna de trading y análisis.

### 4.1 Familias
- **Headings y métricas destacadas:** `Newsreader` (Serif tradicional con proporciones ópticas modernas). Evoca la seriedad de los editoriales económicos del *Financial Times*.
- **Cuerpo, tablas y controles UI:** `Plus Jakarta Sans` (Sans-serif geométrica con gran legibilidad en tamaños reducidos).
- **Cifras financieras, tickers y tablas comparativas:** `JetBrains Mono` o `Plus Jakarta Sans` con clase `.tabular-nums`.

### 4.2 Escala Tipográfica Detallada

| Nivel | Tamaño (rem / px) | Interlineado (`line-height`) | Peso | Familia | Uso / Contexto |
|---|---|---|---|---|---|
| `display` | `2.5rem` (40px) | `3.0rem` (48px) | Bold (700) | Serif | Hero del comparador, portada |
| `h1` | `2.0rem` (32px) | `2.5rem` (40px) | Bold (700) | Serif | Título de pantalla o instrumento en ficha de detalle |
| `h2` | `1.5rem` (24px) | `2.0rem` (32px) | SemiBold (600) | Serif | Títulos de secciones principales, drawer de comparación |
| `h3` | `1.25rem` (20px) | `1.75rem` (28px) | SemiBold (600) | Serif | Encabezados de tarjetas, títulos de bloques de gráficos |
| `h4` | `1.0625rem` (17px) | `1.5rem` (24px) | SemiBold (600) | Sans | Subtítulos de tabla, categorías secundarias |
| `body-lg` | `1.0625rem` (17px) | `1.625rem` (26px) | Regular (400) | Sans | Introducciones, textos destacados, disclaimers principales |
| `body` (base) | `0.9375rem` (15px) | `1.5rem` (24px) | Regular (400) / Medium (500) | Sans | Filas de tabla, descripciones de producto, navegación |
| `body-sm` | `0.8125rem` (13px) | `1.25rem` (20px) | Regular (400) / Medium (500) | Sans | Metadatos secundarios, tickers, etiquetas de ejes en gráficos |
| `small` / `caption` | `0.75rem` (12px) | `1.0rem` (16px) | Medium (500) | Sans / Mono | Timestamps de actualización, footnotes legales, notas de datos |
| `metric-hero` | `2.75rem` (44px) | `1.0` (44px) | Bold (700) | Serif | Tasa o rendimiento actual destacado en ficha de detalle |
| `metric-table`| `1.0625rem` (17px) | `1.25rem` (20px) | SemiBold (600) | Sans + Tabular | Rendimiento porcentual y cotizaciones en filas de tabla |

---

## 5. Configuración de Tailwind CSS (`tailwind.config.ts`)

Archivo listo para producción en el proyecto:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',
          hover: '#142038',
          light: '#2A3F6D',
        },
        accent: {
          DEFAULT: '#C89B3C',
          hover: '#B2872F',
          subtle: '#F6EEDC',
        },
        bg: '#F7F4EC',
        surface: {
          DEFAULT: '#FFFDF8',
          hover: '#FDFBF4',
          muted: '#F0EAE1',
        },
        text: {
          DEFAULT: '#26262B',
          secondary: '#8B8478',
          muted: '#A39D92',
        },
        positive: {
          DEFAULT: '#2F5FA8',
          bg: '#EBF2FA',
          border: '#C2D6EE',
        },
        negative: {
          DEFAULT: '#B5502E',
          bg: '#FDF1ED',
          border: '#F0C4B6',
        },
        border: {
          DEFAULT: '#DBD3C2',
          subtle: '#E8E2D5',
          strong: '#8B8478',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(27, 42, 74, 0.04)',
        DEFAULT: '0 4px 12px -2px rgba(27, 42, 74, 0.06), 0 2px 4px -1px rgba(27, 42, 74, 0.03)',
        md: '0 4px 12px -2px rgba(27, 42, 74, 0.06), 0 2px 4px -1px rgba(27, 42, 74, 0.03)',
        lg: '0 10px 24px -4px rgba(27, 42, 74, 0.08), 0 4px 8px -2px rgba(27, 42, 74, 0.04)',
        drawer: '0 -8px 24px -4px rgba(27, 42, 74, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## 6. Especificación de Componentes React

A continuación se detalla la arquitectura de presentación de los 6 componentes centrales de FinanzAR.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header (Logo FinanzAR, status mercado, timestamp de actualización)      │
├────────────────────────────────────────────────────────────────────────┤
│ CategoryTabs (Pesos | Cripto | CEDEARs & Acciones | Bonos | EE.UU.)    │
├────────────────────────────────────────────────────────────────────────┤
│ Toolbar (Buscador, ordenamiento, filtros por entidad)                  │
├────────────────────────────────────────────────────────────────────────┤
│ InstrumentTable / InstrumentChart (Detalle o listado principal)        │
├────────────────────────────────────────────────────────────────────────┤
│ CompareDrawer (Barra fija inferior al seleccionar >= 2 instrumentos)   │
├────────────────────────────────────────────────────────────────────────┤
│ Footer (Fuentes de datos, transparencia y disclaimer legal)            │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 6.1 `Header.tsx`

#### Descripción Visual y Comportamiento
Barra superior de aspecto noble e institucional. Contiene el isotipo/logotipo de **FinanzAR** (texto en Serif Navy `#1B2A4A` con acento en Dorado `#C89B3C`), un subtítulo editorial fino ("Monitor de Rendimientos & Mercados"), un indicador de estado de datos en vivo (punto de estado + última hora de cotización) y un selector rápido de moneda de referencia o buscador modal.

#### Clases Tailwind Exactas
- **Contenedor exterior:** `w-full bg-surface border-b border-border shadow-sm sticky top-0 z-30`
- **Contenedor interior:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between`
- **Bloque Marca:** `flex items-baseline space-x-3`
- **Logo texto:** `font-serif text-2xl font-bold tracking-tight text-primary`
- **Acento logo:** `text-accent font-serif`
- **Subtítulo editorial:** `hidden md:inline-block text-xs uppercase tracking-wider text-text-secondary font-sans border-l border-border pl-3`
- **Status pill:** `inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-bg border border-border-subtle text-text-secondary`
- **Status dot (activo):** `w-2 h-2 rounded-full bg-positive`

#### Estados
- **Default:** Fondo blanco cálido con borde inferior nítido `#DBD3C2`.
- **Scrolled (Sticky):** Transición sutil agregando `shadow-md`.
- **Botón de actualización:** Hover en `bg-bg text-primary`, active en `scale-[0.98]`.

#### Ejemplo JSX Esquemático
```tsx
import React from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  lastUpdated?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdated = 'Hace 3 minutos',
  isRefreshing = false,
  onRefresh,
}) => {
  return (
    <header className="w-full bg-surface border-b border-border shadow-sm sticky top-0 z-30 transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Identidad */}
        <div className="flex items-center space-x-3">
          <a href="/" className="group flex items-baseline space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs">
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">
              Finanz<span className="text-accent font-serif">AR</span>
            </span>
          </a>
          <span className="hidden md:inline-block text-xs uppercase tracking-wider text-text-secondary font-medium border-l border-border pl-3">
            Comparador Financiero Argentino
          </span>
        </div>

        {/* Metadatos y Acciones */}
        <div className="flex items-center space-x-4">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-bg border border-border-subtle text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-positive animate-pulse" />
            <span className="hidden sm:inline">Mercados actualizados:</span>
            <span className="font-medium text-text">{lastUpdated}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Actualizar cotizaciones"
            className="inline-flex items-center justify-center p-2 rounded-md text-text-secondary hover:text-primary hover:bg-bg border border-transparent hover:border-border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
```

---

### 6.2 `CategoryTabs.tsx`

#### Descripción Visual y Comportamiento
Selector de categoría principal estilo pestaña editorial de prensa económica. Ofrece navegación fluida entre:
1. **Pesos** (Plazos fijos, Cuentas remuneradas, FCI Money Market)
2. **Cripto** (Top tokens globales + stablecoins ARS)
3. **CEDEARs & Acciones** (Instrumentos de renta variable argentina y certificados globales)
4. **Bonos** (Soberanos, Letras y Obligaciones Negociables)
5. **EE.UU.** (ETFs indexados como S&P 500 / VOO / SPY)

La pestaña activa presenta una línea inferior en oro cálido `#C89B3C` con tipografía SemiBold. Incluye una pequeña pastilla con el conteo de activos disponibles en dicha categoría.

#### Clases Tailwind Exactas
- **Contenedor de barra:** `w-full bg-surface border-b border-border`
- **Nav scroll horizontal:** `flex space-x-1 sm:space-x-4 overflow-x-auto max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- **Pestaña Base:** `group inline-flex items-center py-3.5 px-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`
- **Pestaña Activa:** `border-accent text-primary font-semibold`
- **Pestaña Inactiva:** `border-transparent text-text-secondary hover:text-primary hover:border-border`
- **Pastilla de Conteo Activa:** `ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-accent-subtle text-primary`
- **Pastilla de Conteo Inactiva:** `ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-bg text-text-secondary group-hover:bg-surface-muted`

#### Estados
- **Hover:** La pestaña no seleccionada intensifica el texto a `#1B2A4A` y tiñe el borde inferior con `#DBD3C2`.
- **Selected:** Borde inferior de 2px en `#C89B3C`, texto en `#1B2A4A` SemiBold.
- **Focus-visible:** Anillo de foco accesible dorado `ring-2 ring-accent`.

#### Ejemplo JSX Esquemático
```tsx
import React from 'react';

export type CategoryId = 'pesos' | 'cripto' | 'cedears' | 'bonos' | 'eeuu';

export interface CategoryItem {
  id: CategoryId;
  label: string;
  count?: number;
}

interface CategoryTabsProps {
  categories: CategoryItem[];
  selectedId: CategoryId;
  onSelect: (id: CategoryId) => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedId,
  onSelect,
}) => {
  return (
    <nav className="w-full bg-surface border-b border-border" aria-label="Categorías de Inversión">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-none">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedId;
            return (
              <button
                key={cat.id}
                onClick={() => onSelect(cat.id)}
                aria-current={isSelected ? 'page' : undefined}
                className={`group inline-flex items-center py-4 px-2 border-b-2 text-sm transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isSelected
                    ? 'border-accent text-primary font-semibold'
                    : 'border-transparent text-text-secondary hover:text-primary hover:border-border font-medium'
                }`}
              >
                <span>{cat.label}</span>
                {typeof cat.count === 'number' && (
                  <span
                    className={`ml-2 py-0.5 px-2 rounded-full text-xs transition-colors tabular-nums ${
                      isSelected
                        ? 'bg-accent-subtle text-primary font-semibold'
                        : 'bg-bg text-text-secondary group-hover:bg-surface-muted group-hover:text-text'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
```

---

### 6.3 `InstrumentTable.tsx`

#### Descripción Visual y Comportamiento
Es el corazón operativo de la home. Despliega la lista ordenada de instrumentos según la categoría activa. Cada fila resume:
1. Selector de comparación (checkbox estilizado).
2. Nombre del instrumento con su ticker y badge de categoría.
3. Entidad proveedora (Banco, Fintech, Broker, Exchange).
4. Tasa nominal anual (TNA), tasa efectiva o cotización última.
5. Variación reciente con indicación cromática estricta (Azul para subas, Terracota para bajas).
6. Botón de acceso a ficha histórica.

La tabla incluye cabeceras con iconos de ordenamiento interactivo (alfabético, rendimiento ascendente/descendente) y buscador por texto con debounce.

#### Clases Tailwind Exactas
- **Contenedor envolvente:** `w-full bg-surface rounded-md border border-border shadow-sm overflow-hidden`
- **Tabla HTML:** `min-w-full divide-y divide-border-subtle text-left text-sm`
- **Header (`th`):** `bg-bg px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary select-none cursor-pointer hover:text-primary transition-colors`
- **Fila (`tr` normal):** `bg-surface hover:bg-surface-hover transition-colors border-b border-border-subtle last:border-0`
- **Fila (`tr` seleccionada para comparar):** `bg-accent-subtle/30 hover:bg-accent-subtle/50`
- **Celda instrumento:** `px-4 py-3.5 font-medium text-text`
- **Celda entidad:** `px-4 py-3.5 text-text-secondary text-xs`
- **Celda rendimiento:** `px-4 py-3.5 text-right font-semibold text-text tabular-nums text-base`
- **Checkbox:** `w-4 h-4 rounded-xs border-border text-primary focus:ring-accent accent-primary cursor-pointer`

#### Estados
- **Hover de fila:** Cambio de fondo a `#FDFBF4`.
- **Fila marcada:** Fondo dorado sutil `#F6EEDC` con opacidad del 35%.
- **Loading (Skeleton):** Bloques rectangulares en `bg-border-subtle animate-pulse rounded-xs` simulando el texto.
- **Estado vacío:** Mensaje sobrio en tipografía Serif con sugerencia de limpiar filtros.

#### Ejemplo JSX Esquemático
```tsx
import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';

export interface InstrumentoRow {
  id: string;
  nombre: string;
  ticker?: string;
  categoria: string;
  entidad: string;
  rendimientoValor: number; // Ej: 38.5 para 38.50%
  rendimientoTipo: 'TNA' | 'TEA' | 'VAR_24H' | 'VAR_30D';
  variacionPeriodo?: number; // Positivo o negativo
  moneda: 'ARS' | 'USD';
  precioActual?: number;
}

interface InstrumentTableProps {
  data: InstrumentoRow[];
  selectedIds: string[];
  sortField: string;
  sortAsc: boolean;
  onSort: (field: string) => void;
  onToggleCompare: (id: string) => void;
  onSelectInstrument: (id: string) => void;
  isLoading?: boolean;
}

export const InstrumentTable: React.FC<InstrumentTableProps> = ({
  data,
  selectedIds,
  sortField,
  sortAsc,
  onSort,
  onToggleCompare,
  onSelectInstrument,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="w-full bg-surface rounded-md border border-border shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="h-10 bg-border-subtle/60 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full bg-surface rounded-md border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-subtle text-left">
          <thead className="bg-bg">
            <tr>
              <th scope="col" className="w-12 px-4 py-3.5 text-center text-xs font-semibold text-text-secondary">
                Comp.
              </th>
              <th
                scope="col"
                onClick={() => onSort('nombre')}
                className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary cursor-pointer hover:text-primary"
              >
                <div className="flex items-center space-x-1">
                  <span>Instrumento</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Entidad / Fuente
              </th>
              <th
                scope="col"
                onClick={() => onSort('rendimientoValor')}
                className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right cursor-pointer hover:text-primary"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Tasa / Rendimiento</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th scope="col" className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-text-secondary text-right">
                Variación
              </th>
              <th scope="col" className="w-16 px-4 py-3.5 text-center text-xs font-semibold text-text-secondary">
                Ver
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface">
            {data.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isPositive = (item.variacionPeriodo ?? 0) >= 0;

              return (
                <tr
                  key={item.id}
                  className={`transition-colors duration-100 ${
                    isSelected ? 'bg-accent-subtle/30' : 'hover:bg-surface-hover'
                  }`}
                >
                  {/* Checkbox Comparar */}
                  <td className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCompare(item.id)}
                      aria-label={`Comparar ${item.nombre}`}
                      className="w-4 h-4 rounded-xs border-border text-primary focus:ring-accent accent-primary cursor-pointer"
                    />
                  </td>

                  {/* Instrumento */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <button
                        onClick={() => onSelectInstrument(item.id)}
                        className="text-left font-medium text-text hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs"
                      >
                        {item.nombre}
                      </button>
                      {item.ticker && (
                        <span className="text-xs font-mono text-text-secondary mt-0.5">{item.ticker}</span>
                      )}
                    </div>
                  </td>

                  {/* Entidad */}
                  <td className="px-4 py-3.5 text-sm text-text-secondary">
                    {item.entidad}
                  </td>

                  {/* Rendimiento / Tasa */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="text-base font-semibold text-text tabular-nums">
                      {item.rendimientoValor.toFixed(2)}%
                    </div>
                    <span className="text-xs uppercase tracking-wider text-text-secondary font-medium">
                      {item.rendimientoTipo}
                    </span>
                  </td>

                  {/* Variación */}
                  <td className="px-4 py-3.5 text-right">
                    {item.variacionPeriodo !== undefined ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tabular-nums ${
                          isPositive
                            ? 'bg-positive-bg text-positive border border-positive-border'
                            : 'bg-negative-bg text-negative border border-negative-border'
                        }`}
                      >
                        {isPositive ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                        {Math.abs(item.variacionPeriodo).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </td>

                  {/* Botón Detalle */}
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => onSelectInstrument(item.id)}
                      className="p-1 rounded text-text-secondary hover:text-primary hover:bg-bg transition-colors"
                      title="Ver ficha histórica"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

### 6.4 `InstrumentChart.tsx`

#### Descripción Visual y Comportamiento
Despliega la evolución temporal del rendimiento o cotización histórica. Incluye:
- **Cabezal de métrica:** Cifra actual en formato gigante (`metric-hero`), con etiqueta de rendimiento anual o acumulado.
- **Selector de Rango Temporal:** Segmented control elegante con opciones `7D`, `30D`, `90D`, `1A`, `MÁX`.
- **Lienzo Recharts:** Gráfico de área/línea con degradado sutil navy-a-transparente, retícula horizontal discontinua gris piedra y tooltip institucional flotante.

#### Clases Tailwind Exactas
- **Contenedor de tarjeta:** `w-full bg-surface rounded-md border border-border p-6 shadow-sm`
- **Header métricas:** `flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border-subtle pb-5 mb-5`
- **Valor destacado:** `font-serif text-3xl sm:text-4xl font-bold text-primary tabular-nums tracking-tight`
- **Controles de rango (Segmented):** `inline-flex p-1 bg-bg border border-border-subtle rounded-md space-x-1`
- **Botón de rango activo:** `px-3 py-1 text-xs font-semibold bg-surface text-primary rounded-sm shadow-sm border border-border`
- **Botón de rango inactivo:** `px-3 py-1 text-xs font-medium text-text-secondary hover:text-text transition-colors`

#### Ejemplo JSX Esquemático
```tsx
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export type TimeRange = '7d' | '30d' | '90d' | '1a' | 'max';

export interface ChartDataPoint {
  fecha: string;
  valor: number;
}

interface InstrumentChartProps {
  title: string;
  ticker?: string;
  currentValue: number;
  unit: string;
  variation?: number;
  data: ChartDataPoint[];
  onRangeChange?: (range: TimeRange) => void;
}

export const InstrumentChart: React.FC<InstrumentChartProps> = ({
  title,
  ticker,
  currentValue,
  unit,
  variation = 0,
  data,
  onRangeChange,
}) => {
  const [activeRange, setActiveRange] = useState<TimeRange>('30d');
  const ranges: { label: string; value: TimeRange }[] = [
    { label: '7D', value: '7d' },
    { label: '30D', value: '30d' },
    { label: '90D', value: '90d' },
    { label: '1A', value: '1a' },
    { label: 'MÁX', value: 'max' },
  ];

  const handleRange = (r: TimeRange) => {
    setActiveRange(r);
    onRangeChange?.(r);
  };

  const isPositive = variation >= 0;

  return (
    <div className="w-full bg-surface rounded-md border border-border p-6 shadow-sm">
      {/* Cabecera con Métricas y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif text-2xl font-bold text-text">{title}</h2>
            {ticker && <span className="font-mono text-xs px-2 py-0.5 rounded bg-bg text-text-secondary border border-border-subtle">{ticker}</span>}
          </div>
          <div className="flex items-baseline space-x-3 mt-2">
            <span className="font-serif text-3xl sm:text-4xl font-bold text-primary tabular-nums tracking-tight">
              {currentValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {unit}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${
                isPositive ? 'bg-positive-bg text-positive' : 'bg-negative-bg text-negative'
              }`}
            >
              {isPositive ? `+${variation.toFixed(2)}%` : `${variation.toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* Segmented Control de Rangos */}
        <div className="inline-flex p-1 bg-bg border border-border-subtle rounded-md self-start md:self-center">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                activeRange === r.value
                  ? 'bg-surface text-primary font-semibold shadow-sm border border-border'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1B2A4A" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#1B2A4A" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D5" />
            <XAxis
              dataKey="fecha"
              tickLine={false}
              axisLine={{ stroke: '#DBD3C2' }}
              tick={{ fill: '#8B8478', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#DBD3C2' }}
              tick={{ fill: '#8B8478', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-surface border border-border p-3 rounded shadow-md text-xs">
                      <p className="text-text-secondary font-medium mb-1">{label}</p>
                      <p className="text-primary font-serif text-base font-bold tabular-nums">
                        {Number(payload[0].value).toFixed(2)} {unit}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              stroke="#1B2A4A"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#primaryGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

---

### 6.5 `CompareDrawer.tsx`

#### Descripción Visual y Comportamiento
Cajón flotante persistente anclado al borde inferior de la pantalla que se activa cuando el usuario selecciona **2 o más instrumentos** (hasta un límite óptimo de 5 para preservar la legibilidad gráfica).
- **Indicador de selección:** Chips con el nombre del instrumento y el color de trazo que le corresponderá en la gráfica normalizada.
- **Acción principal:** Botón "Comparar Rendimientos" que abre la vista superpuesta normalizada en base 100 (% de ganancia relativa).
- **Acción secundaria:** "Limpiar selección" para vaciar el listado.

#### Clases Tailwind Exactas
- **Contenedor fijo:** `fixed bottom-0 inset-x-0 bg-surface border-t-2 border-accent shadow-drawer z-40 py-3.5 px-4 sm:px-6 transition-transform duration-300 ease-in-out`
- **Contenedor interior:** `max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3`
- **Chip de instrumento:** `inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-bg border border-border-subtle text-xs text-text`
- **Punto de color del gráfico:** `w-2.5 h-2.5 rounded-full` (con color en línea según slot)
- **Botón Comparar:** `inline-flex items-center px-4 py-2 bg-primary hover:bg-primary-hover text-surface text-sm font-semibold rounded-md shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`

#### Ejemplo JSX Esquemático
```tsx
import React from 'react';
import { X, Layers, ArrowRight } from 'lucide-react';

export interface SelectedCompareItem {
  id: string;
  nombre: string;
  color: string;
}

interface CompareDrawerProps {
  selectedItems: SelectedCompareItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onLaunchComparison: () => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  selectedItems,
  onRemoveItem,
  onClearAll,
  onLaunchComparison,
}) => {
  if (selectedItems.length < 2) return null;

  return (
    <aside
      aria-label="Bandeja de Comparación de Activos"
      className="fixed bottom-0 inset-x-0 bg-surface border-t-2 border-accent shadow-drawer z-40 py-3 px-4 sm:px-8 animate-slide-up"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Chips de instrumentos con su color asignado */}
        <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 md:pb-0">
          <div className="flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider text-text-secondary mr-2">
            <Layers className="w-4 h-4 text-accent" />
            <span>Comparando ({selectedItems.length}):</span>
          </div>

          <div className="flex items-center space-x-2">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-sm bg-bg border border-border text-xs text-text font-medium"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[140px]">{item.nombre}</span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-text-secondary hover:text-negative p-0.5 rounded transition-colors"
                  aria-label={`Quitar ${item.nombre} de la comparación`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={onClearAll}
            className="text-xs text-text-secondary hover:text-primary underline px-2 py-1 transition-colors"
          >
            Limpiar selección
          </button>

          <button
            onClick={onLaunchComparison}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-hover text-surface text-xs sm:text-sm font-semibold rounded-md shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>Ver Gráfico Superpuesto</span>
            <ArrowRight className="w-4 h-4 text-accent" />
          </button>
        </div>
      </div>
    </aside>
  );
};
```

---

### 6.6 `Footer.tsx`

#### Descripción Visual y Comportamiento
Pie de página institucional que refuerza la transparencia editorial y el cumplimiento normativo. Se divide en tres zonas:
1. **Disclaimer Financiero Obligatorio:** Cuadro con tipografía sobria aclarando que la plataforma no es un intermediario ni provee asesoramiento financiero regulado.
2. **Atribución de Fuentes Públicas:** Listado transparente con enlaces y menciones a las fuentes: *argentinadatos.com, CoinGecko Public API, data912.com, Twelve Data y CAFCI*.
3. **Créditos y Leyenda Legal:** Copyright, política de privacidad y versión del motor.

#### Clases Tailwind Exactas
- **Contenedor principal:** `w-full bg-surface border-t border-border mt-16 py-12 text-text-secondary text-xs`
- **Caja de disclaimer:** `bg-bg border border-border-subtle rounded-md p-4 sm:p-5 mb-8 text-text`
- **Título disclaimer:** `font-serif text-sm font-semibold text-primary mb-1.5 flex items-center space-x-1.5`
- **Badge de fuente:** `px-2 py-1 rounded bg-bg border border-border text-[11px] font-medium text-text-secondary hover:text-primary transition-colors`

#### Ejemplo JSX Esquemático
```tsx
import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const sources = [
    { name: 'argentinadatos.com', url: 'https://argentinadatos.com' },
    { name: 'CoinGecko API', url: 'https://www.coingecko.com' },
    { name: 'data912.com', url: 'https://data912.apidocs.ar' },
    { name: 'CAFCI', url: 'https://www.cafci.org.ar' },
  ];

  return (
    <footer className="w-full bg-surface border-t border-border mt-20 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Disclaimer Regulatorio */}
        <div className="bg-bg border border-border rounded-md p-5 mb-8 text-text">
          <div className="flex items-center space-x-2 text-primary font-serif font-bold text-sm mb-2">
            <AlertCircle className="w-4 h-4 text-accent" />
            <span>Aviso Legal & Transparencia Informativa</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            FinanzAR es una plataforma digital exclusivamente informativa y comparativa. Los datos, tasas, cotizaciones y rendimientos exhibidos provienen de fuentes públicas y pueden contener demoras respecto al mercado en tiempo real. No constituye oferta de compra ni venta, ni asesoramiento financiero, impositivo o legal. Antes de realizar cualquier inversión, verifique las condiciones directamente ante la entidad bancaria, sociedad gerente de fondos comunes de inversión o agente de liquidación y compensación (ALyC) autorizado por la CNV.
          </p>
        </div>

        {/* Fuentes y Créditos */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-border-subtle text-xs text-text-secondary">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text">Fuentes integradas:</span>
            {sources.map((s) => (
              <a
                key={s.name}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-bg hover:bg-surface border border-border-subtle hover:border-border text-text transition-colors"
              >
                <span>{s.name}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>
            ))}
          </div>

          <p className="text-text-muted">
            © {new Date().getFullYear()} FinanzAR. Diseñado bajo estándares de prensa financiera seria.
          </p>
        </div>
      </div>
    </footer>
  );
};
```

---

## 7. Guía de Formateo y Visualización de Datos Financieros

El formateo numérico no es estético: es funcional a la toma de decisiones sin fatiga visual.

### 7.1 Regla Semántica de Variaciones

| Condición | Color | Token Tailwind | Icono | Fondo / Borde |
|---|---|---|---|---|
| **Alza / Ganancia** | `#2F5FA8` (Azul Medio) | `text-positive` | `↑` / `ArrowUp` | `bg-positive-bg border-positive-border` |
| **Baja / Pérdida** | `#B5502E` (Terracota) | `text-negative` | `↓` / `ArrowDown` | `bg-negative-bg border-negative-border` |
| **Sin Cambio** | `#8B8478` (Gris Piedra) | `text-text-secondary` | `—` / `Minus` | `bg-bg border-border-subtle` |

> ⚠️ **REGLA ESTRICTA:** No utilizar verde (#00FF00, #10B981) ni rojo chillón (#EF4444) en ningún componente de la plataforma. La paleta Azul/Terracota mantiene la elegancia del sistema.

### 7.2 Convenciones Numéricas por Tipo de Activo

```typescript
// Helper institucional de formateo monetario y tasas
export const formatFinancial = {
  // Tasas de Interés (Plazo Fijo, Cuentas, FCI)
  rate: (val: number, type: 'TNA' | 'TEA' = 'TNA'): string => {
    return `${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% ${type}`;
  },

  // Moneda Nacional (Pesos Argentinos)
  ars: (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(amount);
  },

  // Moneda Extranjera (Dólares Estadounidenses)
  usd: (amount: number): string => {
    return `US$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  // Criptoactivos (Precisión ampliada según magnitud)
  crypto: (amount: number, symbol: string): string => {
    const decimals = amount < 1 ? 4 : 2;
    return `${symbol} ${amount.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  },

  // Variación Porcentual
  percentageChange: (val: number): string => {
    const prefix = val > 0 ? '+' : '';
    return `${prefix}${val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }
};
```

### 7.3 Badges de Categoría Institucionales

Para mantener consistencia en tablas, tarjetas y comparadores:

| Categoría | Clases Tailwind recomendadas |
|---|---|
| **Pesos** | `bg-[#EAF0F8] text-[#1B2A4A] border border-[#CBDCEE]` |
| **Cripto** | `bg-[#ECEAE4] text-[#26262B] border border-[#D6D2C4]` |
| **CEDEARs & Acciones** | `bg-[#F6EEDC] text-[#8C6B1B] border border-[#E8D9B5]` |
| **Bonos** | `bg-[#ECEEF2] text-[#2C3E50] border border-[#CBD2DD]` |
| **EE.UU. (ETFs)** | `bg-[#E5ECF6] text-[#1E3A63] border border-[#B8CEEA]` |

---

## 8. Especificación Técnica para Gráficos Recharts

Para el comparador multi-instrumento (donde se superponen curvas de activos con diferentes naturalezas), se definen 6 colores armónicos y exclusivos:

### 8.1 Paleta Cromática para Líneas de Comparación

```typescript
export const COMPARISON_CHART_COLORS = [
  '#1B2A4A', // Trazo 1: Navy Primario
  '#C89B3C', // Trazo 2: Dorado Acento
  '#2F5FA8', // Trazo 3: Azul Medio
  '#B5502E', // Trazo 4: Terracota
  '#5C6B73', // Trazo 5: Pizarra Gris
  '#5B6E4A', // Trazo 6: Oliva Seco
] as const;
```

### 8.2 Parámetros de Configuración de Recharts

```tsx
// Configuración recomendada para Recharts en el Comparador Normalizado (% de variación relativa)
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={normalizedData} margin={{ top: 20, right: 24, left: -10, bottom: 8 }}>
    {/* Retícula solo horizontal en gris cálido sutil */}
    <CartesianGrid stroke="#E8E2D5" strokeDasharray="3 3" vertical={false} />

    {/* Eje X temporal */}
    <XAxis
      dataKey="fecha"
      tick={{ fill: '#8B8478', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
      tickLine={false}
      axisLine={{ stroke: '#DBD3C2' }}
    />

    {/* Eje Y porcentual con formato +X.XX% */}
    <YAxis
      tick={{ fill: '#8B8478', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
      tickLine={false}
      axisLine={{ stroke: '#DBD3C2' }}
      tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v}%`}
      domain={['auto', 'auto']}
    />

    {/* Línea de base 0% neutra */}
    <ReferenceLine y={0} stroke="#8B8478" strokeWidth={1} strokeDasharray="2 2" />

    {/* Crosshair institucional */}
    <Tooltip
      cursor={{ stroke: '#8B8478', strokeWidth: 1, strokeDasharray: '4 4' }}
      content={({ active, payload, label }) => {
        if (!active || !payload) return null;
        return (
          <div className="bg-surface border border-border p-3.5 rounded-md shadow-md">
            <p className="text-xs font-semibold text-text-secondary mb-2 border-b border-border-subtle pb-1">
              {label}
            </p>
            <div className="space-y-1.5">
              {payload.map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-text font-medium">{entry.name}</span>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-text">
                    {Number(entry.value) >= 0 ? `+${Number(entry.value).toFixed(2)}%` : `${Number(entry.value).toFixed(2)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />

    {/* Trazos de línea limpios con strokeWidth de 2px */}
    {selectedInstruments.map((item, index) => (
      <Line
        key={item.id}
        type="monotone"
        dataKey={item.id}
        name={item.nombre}
        stroke={COMPARISON_CHART_COLORS[index % COMPARISON_CHART_COLORS.length]}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4, strokeWidth: 0, fill: COMPARISON_CHART_COLORS[index % COMPARISON_CHART_COLORS.length] }}
      />
    ))}
  </LineChart>
</ResponsiveContainer>
```

---

## 9. Criterios de Accesibilidad y Ergonomía

1. **Ratios de Contraste WCAG 2.1 (Nivel AAA / AA):**
   - Texto Carbón (`#26262B`) sobre fondo Crema (`#F7F4EC`): Ratio **11.4:1** (Supera ampliamente WCAG AAA).
   - Primario Navy (`#1B2A4A`) sobre Superficie (`#FFFDF8`): Ratio **12.6:1** (Supera WCAG AAA).
   - Acento Dorado (`#C89B3C`) sobre Blanco (`#FFFDF8`): Usado en textos grandes, bordes o fondos con texto Navy (`#1B2A4A` sobre `#C89B3C` tiene ratio **5.2:1**).
2. **Focus Rings Visibles:**
   - Todos los elementos interactivos (`button`, `a`, `input`) deben poseer:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg`.
3. **Soporte `prefers-reduced-motion`:**
   - Las animaciones del drawer y el pulso de actualización se desactivan suavemente bajo `motion-reduce:transition-none`.
