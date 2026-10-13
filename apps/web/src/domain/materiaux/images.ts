/**
 * Image de référence d'un matériau du catalogue : visuel neutre CITURBAREA
 * (par code, sinon par famille du catalogue), hébergé dans
 * apps/web/public/materiaux/img/, avec licence et source documentées
 * (images.json, rempli par apps/web/scripts/images-materiaux.mjs ou à la main).
 * Sans image : la page affiche l'icône de la catégorie (IconeFamille).
 */
import manifeste from "./images.json";
import { materiau } from "./catalogue";

export interface ImageReference {
  /** Chemin local : /materiaux/img/<fichier>. */
  url: string;
  legende: { fr: string; ar?: string };
  licence: string;
  /** Page d'origine de l'image (crédit), ou « visuel CITURBAREA ». */
  source: string;
  auteur?: string;
}

type Manifeste = { familles: Record<string, ImageReference>; codes: Record<string, ImageReference> };
const M = manifeste as unknown as Manifeste;

/** Seules les images hébergées par CITURBAREA et dotées d'une licence sont acceptées. */
export const imageValide = (i: ImageReference | undefined): i is ImageReference =>
  !!i && /^\/materiaux\/img\/[a-z0-9-]+\.(webp|jpg|jpeg|png|svg)$/.test(i.url) && i.licence.trim().length > 3 && i.source.trim().length > 3 && !!i.legende?.fr;

export function imageReference(code: string): ImageReference | null {
  const parCode = M.codes[code];
  if (imageValide(parCode)) return parCode;
  const r = materiau(code);
  const parFamille = r ? M.familles[r.famille] : undefined;
  return imageValide(parFamille) ? parFamille : null;
}

export const toutesImagesReference = (): [string, ImageReference][] => [...Object.entries(M.codes), ...Object.entries(M.familles)];
