/**
 * Projet du planning d'achat : fragment d'URL #p=… (comme /chiffrage/devis),
 * sinon dernier projet planifié dans ce navigateur (paramètres de projet
 * uniquement, aucune donnée personnelle).
 */
import type { ProjetInput } from "../../domain/chiffrage";
import { PROJET_DEFAUT } from "../chiffrage/ChiffrageGadget";

export const CLE_PROJET = "citurbarea.materiaux.projet";

export function lireProjet(hash: string): ProjetInput | null {
  const m = hash.match(/^#p=(.+)$/);
  let brut: string | null = m ? m[1] : null;
  if (!brut) { try { brut = localStorage.getItem(CLE_PROJET); } catch { brut = null; } }
  if (!brut) return null;
  try {
    const p = JSON.parse(m ? decodeURIComponent(brut) : brut);
    return p && typeof p === "object" && !Array.isArray(p) ? { ...PROJET_DEFAUT, ...p } : null;
  } catch { return null; }
}

/** Dernier projet planifié (paramètres de projet uniquement, aucune donnée personnelle). */
export function memoriserProjet(p: ProjetInput) {
  try { localStorage.setItem(CLE_PROJET, JSON.stringify(p)); } catch { /* stockage indisponible */ }
}

