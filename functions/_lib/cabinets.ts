/**
 * Cabinets d'architecture (ARC-BATI et autres) : architecte du projet et
 * répartition interne des honoraires. L'ÉMETTEUR des devis et factures est
 * CITURBAREA / HSE DECO (apps/web/src/domain/honoraires/emetteur.ts) : le
 * téléphone, l'e-mail et l'adresse d'un cabinet restent au back-office et
 * n'apparaissent sur aucun document. Identifiants (ICE, IF, RC, patente) :
 * facultatifs, jamais inventés.
 */
import type { Sql } from "./dossierAdmin";

export interface Cabinet {
  id: string; nom: string; architecte: string | null; titre: string | null; numeroOrdre: string | null;
  adresse: string | null; ville: string | null; telephone: string | null; email: string | null;
  ice: string | null; identifiantFiscal: string | null; rc: string | null; patente: string | null;
  logoUrl: string | null; grilleId: string | null; actif: boolean;
  /** Identifiants du cabinet non renseignés (information interne). */
  mentionsManquantes: string[];
}

/** Données de départ, servies tant que le SQL n'est pas collé (lecture seule). */
export const CABINET_ARC_BATI: Omit<Cabinet, "mentionsManquantes"> = {
  id: "cab_arc_bati", nom: "ARC-BATI ARCHITECTURE", architecte: "Yassine ATTARASSI", titre: "Architecte DENA, Ordre des Architectes du Maroc",
  numeroOrdre: null, adresse: null, ville: "Kénitra",
  telephone: null, email: null, ice: null, identifiantFiscal: null, rc: null, patente: null,
  logoUrl: null, grilleId: "arc-bati-2026-10", actif: true,
};

export function mentionsManquantes(c: Pick<Cabinet, "ice" | "identifiantFiscal" | "rc" | "patente">): string[] {
  return ([["ICE", c.ice], ["IF", c.identifiantFiscal], ["RC", c.rc], ["Patente", c.patente]] as const).filter(([, v]) => !v).map(([k]) => k);
}

const s = (v: unknown) => (v == null ? null : String(v));
export const versCabinet = (r: Record<string, unknown>): Cabinet => {
  const c = {
    id: String(r.id), nom: String(r.nom), architecte: s(r.architecte), titre: s(r.titre), numeroOrdre: s(r.numeroOrdre),
    adresse: s(r.adresse), ville: s(r.ville), telephone: s(r.telephone), email: s(r.email),
    ice: s(r.ice), identifiantFiscal: s(r.identifiantFiscal), rc: s(r.rc), patente: s(r.patente),
    logoUrl: s(r.logoUrl), grilleId: s(r.grilleId), actif: r.actif !== false,
  };
  return { ...c, mentionsManquantes: mentionsManquantes(c) };
};

export async function listerCabinets(sql: Sql): Promise<{ cabinets: Cabinet[]; sqlAColler: boolean }> {
  const t = await sql`SELECT to_regclass('public."Cabinet"') IS NOT NULL AS c`;
  if (!t[0]?.c) return { cabinets: [{ ...CABINET_ARC_BATI, mentionsManquantes: mentionsManquantes(CABINET_ARC_BATI) }], sqlAColler: true };
  const rows = await sql`SELECT * FROM "Cabinet" ORDER BY ("id" = 'cab_arc_bati') DESC, "nom" ASC LIMIT 200`;
  return { cabinets: rows.map(versCabinet), sqlAColler: false };
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

export function validerCabinet(b: Record<string, unknown>): { ok: true; c: Omit<Cabinet, "id" | "mentionsManquantes" | "actif" | "grilleId"> } | { ok: false; erreurs: string[] } {
  const erreurs: string[] = [];
  const nom = clip(b.nom, 160);
  if (!nom) erreurs.push("Nom du cabinet requis");
  const ice = clip(b.ice, 20)?.replace(/\s/g, "") || null;
  if (ice && !/^\d{15}$/.test(ice)) erreurs.push("ICE : 15 chiffres");
  const email = clip(b.email, 160)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erreurs.push("E-mail invalide");
  const logoUrl = clip(b.logoUrl, 500);
  if (logoUrl && !/^https:\/\//.test(logoUrl)) erreurs.push("Logo : adresse https:// attendue");
  if (erreurs.length) return { ok: false, erreurs };
  return {
    ok: true,
    c: {
      nom: nom as string, architecte: clip(b.architecte, 120), titre: clip(b.titre, 200), numeroOrdre: clip(b.numeroOrdre, 40),
      adresse: clip(b.adresse, 300), ville: clip(b.ville, 120), telephone: clip(b.telephone, 30), email,
      ice, identifiantFiscal: clip(b.identifiantFiscal, 30), rc: clip(b.rc, 30), patente: clip(b.patente, 30), logoUrl,
    },
  };
}
