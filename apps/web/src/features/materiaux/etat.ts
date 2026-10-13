/**
 * État client de la matériauthèque : panier de demande de prix, sélection du
 * comparateur, ville choisie (mémorisés dans le navigateur, try/catch :
 * navigation privée), et prix fournisseurs (GET /api/prix/materiaux).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { ajouterAuPanier, type LignePanier } from "../../domain/materiaux/demandePrix";
import type { Marche } from "../../domain/materiaux/marche";

const CLE = "citurbarea.materiaux.v1";
type Etat = { panier: LignePanier[]; compare: string[]; ville: string };
const VIDE: Etat = { panier: [], compare: [], ville: "" };

function lire(): Etat {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || "null");
    if (v && Array.isArray(v.panier) && Array.isArray(v.compare)) return { ...VIDE, ...v };
  } catch { /* stockage indisponible */ }
  return VIDE;
}

let etat: Etat = typeof window === "undefined" ? VIDE : lire();
const abonnes = new Set<() => void>();
function ecrire(e: Etat) {
  etat = e;
  try { localStorage.setItem(CLE, JSON.stringify(e)); } catch { /* ignoré */ }
  abonnes.forEach((f) => f());
}

export function useMateriaux() {
  const e = useSyncExternalStore((f) => { abonnes.add(f); return () => abonnes.delete(f); }, () => etat, () => VIDE);
  return {
    ...e,
    ajouter: (l: LignePanier) => ecrire({ ...etat, panier: ajouterAuPanier(etat.panier, l) }),
    majLigne: (i: number, l: Partial<LignePanier>) => ecrire({ ...etat, panier: etat.panier.map((x, k) => (k === i ? { ...x, ...l } : x)) }),
    retirerLigne: (i: number) => ecrire({ ...etat, panier: etat.panier.filter((_, k) => k !== i) }),
    vider: () => ecrire({ ...etat, panier: [] }),
    basculerCompare: (code: string) =>
      ecrire({ ...etat, compare: etat.compare.includes(code) ? etat.compare.filter((c) => c !== code) : [...etat.compare, code].slice(-4) }),
    viderCompare: () => ecrire({ ...etat, compare: [] }),
    setVille: (ville: string) => ecrire({ ...etat, ville }),
  };
}

/** Ouverture du panneau « Ma demande de prix » depuis n'importe quel composant. */
export const EVT_PANIER = "citurbarea:materiaux:panier";
export const ouvrirPanier = () => window.dispatchEvent(new Event(EVT_PANIER));

export interface PrixPublics {
  marcheDisponible: boolean;
  fournisseursParCategorie: Record<string, number> | null;
  marche: Record<string, Marche | null>;
  manuels: Record<string, { min: number; ref: number; max: number; source: string; sourceUrl: string | null; datePrix: string }>;
}

const cachePrix = new Map<string, Promise<PrixPublics | null>>();

function chargerPrix(ville: string): Promise<PrixPublics | null> {
  const k = ville.trim().toLowerCase();
  if (!cachePrix.has(k))
    cachePrix.set(k, fetch(`/api/prix/materiaux${k ? `?region=${encodeURIComponent(k)}` : ""}`)
      .then((r) => (r.ok && (r.headers.get("content-type") || "").includes("json") ? r.json() : null))
      .then((j) => {
        if (!j?.ok) return null;
        const marche: PrixPublics["marche"] = {};
        const manuels: PrixPublics["manuels"] = {};
        for (const m of j.materiaux || []) {
          marche[m.code] = m.marche;
          if (m.recherche?.manuel) manuels[m.code] = { min: m.recherche.min, ref: m.recherche.ref, max: m.recherche.max, ...m.recherche.manuel };
        }
        return { marcheDisponible: !!j.marcheDisponible, fournisseursParCategorie: j.fournisseursParCategorie || null, marche, manuels };
      })
      .catch(() => null));
  return cachePrix.get(k)!;
}

/** Prix fournisseurs et mises à jour manuelles pour une ville (null : hors ligne ou API absente). */
export function usePrixPublics(ville: string): PrixPublics | null {
  const [d, setD] = useState<PrixPublics | null>(null);
  useEffect(() => {
    let vivant = true;
    chargerPrix(ville).then((x) => vivant && setD(x));
    return () => { vivant = false; };
  }, [ville]);
  return d;
}
