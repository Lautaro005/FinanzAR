import { useEffect } from "react";

const SITE_NAME = "FinanzAR";
const DEFAULT_DESCRIPTION =
  "Compará tasas y rendimientos de plazos fijos, FCI, dólar, criptomonedas, CEDEARs, acciones, bonos y ETFs de EE.UU. en un solo lugar, con datos públicos y gráficos históricos.";

function setMetaTag(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(path: string) {
  const url = `https://finanzar-delta.vercel.app${path}`;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
  setMetaTag("property", "og:url", url);
}

/**
 * Actualiza el <title>, la meta descripción, og:title/description y el
 * <link rel="canonical"> para la ruta actual. FinanzAR es una SPA (React)
 * renderizada del lado del cliente: estas actualizaciones ocurren después
 * de la carga inicial, por lo que un `curl`/`view-source` crudo (o un
 * crawler que no ejecute JavaScript) sigue viendo el título y meta genéricos
 * del index.html. Los motores de búsqueda y previews modernos (Google,
 * Twitter/X, LinkedIn, WhatsApp) sí ejecutan JS o usan el snapshot renderizado,
 * por lo que estos tags dinámicos igual se indexan correctamente.
 */
export function useDocumentMeta(title: string, description: string, path: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Comparador de inversiones en Argentina`;
    document.title = fullTitle;

    const desc = description || DEFAULT_DESCRIPTION;
    setMetaTag("name", "description", desc);
    setMetaTag("property", "og:title", fullTitle);
    setMetaTag("property", "og:description", desc);
    setCanonical(path);
  }, [title, description, path]);
}
