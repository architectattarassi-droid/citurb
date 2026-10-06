/**
 * RouteMeta — titre, canonical et robots par route de la SPA.
 *
 * Toutes les routes servent le même index.html (titre et canonical de
 * l'accueil) : sans ceci, /p1, /creer-compte, /simulateur… s'annoncent comme
 * l'accueil aux moteurs et aux onglets. useLayoutEffect : posé AVANT les
 * useEffect des pages, qui peuvent encore le préciser (VilleLanding, articles).
 */
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "https://citurbarea.com";
const SUFFIXE = " | CITURBAREA";

type Meta = { titre: string; index?: boolean };

/** Par préfixe ; le plus long qui correspond l'emporte. */
const ROUTES: Record<string, Meta> = {
  "/": { titre: "CITURBAREA — Expertise BTP & Immobilier Maroc", index: true },
  "/p1": { titre: "Construire sa maison au Maroc : architecte, plans et permis" + SUFFIXE, index: true },
  "/p2": { titre: "Promoteurs : honoraires d'architecte au barème CNOA" + SUFFIXE, index: true },
  "/p3": { titre: "Maîtrise d'ouvrage déléguée au Maroc" + SUFFIXE, index: true },
  "/p4": { titre: "Investisseur foncier : étude et valorisation de terrain" + SUFFIXE, index: true },
  "/p5": { titre: "Rapports et expertises immobilières" + SUFFIXE, index: true },
  "/creer-compte": { titre: "Parlez-nous de votre projet" + SUFFIXE, index: true },
  "/simulateur": { titre: "Simulateur de constructibilité d'un terrain" + SUFFIXE, index: true },
  "/cercles": { titre: "Cercles — le réseau des professionnels du BTP" + SUFFIXE, index: true },
  "/login": { titre: "Connexion" + SUFFIXE },
  "/portal": { titre: "Mes dossiers" + SUFFIXE },
  "/sig": { titre: "Explorateur SIG" + SUFFIXE },
};

function metaPour(path: string): Meta | null {
  let meilleur: string | null = null;
  for (const p of Object.keys(ROUTES)) {
    const ok = p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`);
    if (ok && (!meilleur || p.length > meilleur.length)) meilleur = p;
  }
  return meilleur ? ROUTES[meilleur] : null;
}

function poserLien(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function poserRobots(contenu: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!contenu) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.name = "robots";
    document.head.appendChild(el);
  }
  el.content = contenu;
}

export default function RouteMeta() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const m = metaPour(pathname);
    if (!m) return; // route non décrite : la page gère (ou NotFound pose noindex)
    document.title = m.titre;
    poserLien("canonical", `${BASE}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}`);
    poserRobots(m.index ? null : "noindex, follow");
  }, [pathname]);
  return null;
}
