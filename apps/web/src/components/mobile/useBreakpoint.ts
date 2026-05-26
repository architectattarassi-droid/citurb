import { useEffect, useState } from "react";

/**
 * useBreakpoint — hooks de détection responsive basés sur window.matchMedia.
 *
 * Breakpoints CITURBAREA :
 *   - mobile  : <= 768 px
 *   - tablet  : 769 - 1024 px
 *   - desktop : >= 1025 px
 *
 * Les hooks renvoient un booléen mis à jour live (resize / orientationchange)
 * et nettoient l'écouteur au démontage. SSR-safe : si `window` n'existe pas,
 * renvoient la valeur par défaut desktop (évite layout-shift au premier render).
 */

export type Breakpoint = "mobile" | "tablet" | "desktop";

const MQ_MOBILE = "(max-width: 768px)";
const MQ_TABLET = "(min-width: 769px) and (max-width: 1024px)";
const MQ_DESKTOP = "(min-width: 1025px)";

function safeMatch(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

function useMediaQuery(query: string, fallback: boolean): boolean {
  const [match, setMatch] = useState<boolean>(() => safeMatch(query, fallback));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatch(e.matches);
    // sync au cas où l'état initial diffère (hydratation)
    setMatch(mql.matches);
    // addEventListener moderne ; addListener legacy pour vieux Safari
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return match;
}

/** Hook bas-niveau renvoyant le label de breakpoint courant. */
export function useBreakpoint(): Breakpoint {
  const isMobile = useMediaQuery(MQ_MOBILE, false);
  const isTablet = useMediaQuery(MQ_TABLET, false);
  if (isMobile) return "mobile";
  if (isTablet) return "tablet";
  return "desktop";
}

/** True si viewport <= 768 px (mobile portrait / landscape étroit). */
export function useIsMobile(): boolean {
  return useMediaQuery(MQ_MOBILE, false);
}

/** True si viewport 769-1024 px (tablette portrait). */
export function useIsTablet(): boolean {
  return useMediaQuery(MQ_TABLET, false);
}

/** True si viewport >= 1025 px (laptop / desktop). */
export function useIsDesktop(): boolean {
  return useMediaQuery(MQ_DESKTOP, true);
}
