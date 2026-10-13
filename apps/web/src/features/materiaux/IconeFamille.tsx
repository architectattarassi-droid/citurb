/**
 * Icône de catégorie (visuel maison, SVG en ligne) : affichée quand un
 * matériau n'a pas d'image de référence documentée, et comme repère visuel.
 */
import React from "react";
import type { Categorie } from "../../domain/materiaux/types";
import { imageReference } from "../../domain/materiaux/images";

const TRACES: Record<Categorie, string> = {
  GROS_OEUVRE: "M3 20h18M4 20V9h16v11M4 14h16M9 9v5M15 14v6M12 4l8 5H4z",
  ETANCHEITE: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11zM3 21h18",
  ISOLATION: "M4 6h16v12H4zM4 10c3 0 3 4 6 4s3-4 6-4 3 4 4 4",
  VRD: "M3 18h18M5 18v-4h14v4M8 14V9h8v5M12 9V5",
  ELECTRICITE: "M13 2 4 14h7l-1 8 9-12h-7z",
  PLOMBERIE: "M4 8h10v4h6M14 8V5M20 12v7M7 8V4h4",
  CVC: "M12 2v20M4 6l16 12M20 6 4 18M9 3l3 3 3-3M9 21l3-3 3 3",
  STRUCTURE_METALLIQUE: "M3 20h18M5 20V6h14v14M5 6l14 14M19 6 5 20",
  MENUISERIE_ALU: "M5 3h14v18H5zM12 3v18M5 12h14",
  MENUISERIE_BOIS: "M6 3h12v18H6zM15 12h.01",
  FAUX_PLAFOND: "M3 6h18M5 6v3h14V6M8 9v2M16 9v2M3 21h18",
  REVETEMENT: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  MARBRERIE: "M3 5h18v14H3zM6 9c3 1 4 5 8 5s4-3 7-3",
  PEINTURE: "M4 4h13v5H4zM17 6h3v6h-8v3M11 15h2v6h-2z",
  QUINCAILLERIE: "M14 4a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-3 3-2-1-1-2z",
};

export default function IconeFamille({ categorie, taille = 40, className = "" }: { categorie: Categorie; taille?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true" className={className}
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={TRACES[categorie]} />
    </svg>
  );
}

/** Image de référence documentée si elle existe, sinon icône de la catégorie. */
export function VisuelMateriau({ code, categorie, taille = 56, lang }: { code: string; categorie: Categorie; taille?: number; lang?: string }) {
  const img = imageReference(code);
  if (img)
    return (
      <img src={img.url} alt={(lang === "ar" && img.legende.ar) || img.legende.fr} loading="lazy" width={taille} height={taille}
        className="shrink-0 rounded-lg object-cover" style={{ width: taille, height: taille }} title={`${img.licence}${img.auteur ? ` — ${img.auteur}` : ""}`} />
    );
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0B1B3A]" style={{ width: taille, height: taille }}>
      <IconeFamille categorie={categorie} taille={Math.round(taille * 0.6)} />
    </span>
  );
}
