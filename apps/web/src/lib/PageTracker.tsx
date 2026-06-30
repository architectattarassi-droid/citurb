/**
 * PageTracker — suivi des visites côté public (sessions, pages, durée, sortie).
 *
 * Monté une seule fois dans le layout public. À chaque changement de route :
 *  - envoie un `page_leave` pour la page précédente (temps passé) ;
 *  - envoie un `view` pour la nouvelle page.
 * Sur fermeture/onglet caché (pagehide / visibilitychange) : envoie le `page_leave`
 * final (page de sortie) via sendBeacon — capture le moment où le visiteur quitte,
 * même sans devenir lead.
 *
 * RGPD/Loi 09-08 : aucune IP, aucun fingerprint — sessionId anonyme uniquement
 * (cf. analytics-tracker). N'émet pas pour les routes admin /cc.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackView, trackPageLeave } from "./analytics-tracker";

function isTracked(path: string): boolean {
  // On ne suit pas le backoffice ni les assets ; uniquement la plateforme publique.
  return !path.startsWith("/cc") && !path.startsWith("/admin");
}

export default function PageTracker() {
  const loc = useLocation();
  const path = loc.pathname;
  const prevPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  // Changement de route : clôture la page précédente + ouvre la nouvelle.
  useEffect(() => {
    const now = Date.now();
    if (prevPath.current && prevPath.current !== path && isTracked(prevPath.current)) {
      trackPageLeave(prevPath.current, now - enteredAt.current);
    }
    if (isTracked(path)) trackView(path);
    prevPath.current = path;
    enteredAt.current = now;
  }, [path]);

  // Sortie de la plateforme (fermeture onglet / app en arrière-plan).
  useEffect(() => {
    const onLeave = () => {
      if (document.visibilityState === "hidden" && prevPath.current && isTracked(prevPath.current)) {
        trackPageLeave(prevPath.current, Date.now() - enteredAt.current);
        enteredAt.current = Date.now(); // évite le double comptage si l'onglet revient
      }
    };
    window.addEventListener("visibilitychange", onLeave);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("visibilitychange", onLeave);
      window.removeEventListener("pagehide", onLeave);
    };
  }, []);

  return null;
}
