/**
 * Prix publics des matériaux (contrat docs/prix/contrat-fournisseurs-chiffrage.md §2) :
 * prix de référence (moteur de chiffrage / catalogue), mises à jour manuelles
 * du back-office ("PrixReferenceManuel") et médiane des fournisseurs Cercles
 * vérifiés (≥ 3 fournisseurs, sinon aucun prix fournisseur publié).
 * Tables absentes ou base indisponible : on répond quand même, sans marché.
 */
import { CATALOGUE_VERSION } from "../../apps/web/src/domain/materiaux/catalogue";
import { agregerMarche, fournisseursParCategorie, type FicheMarche, type Marche } from "../../apps/web/src/domain/materiaux/marche";
import { MATERIAUX_PUBLICS, prixReference } from "../../apps/web/src/domain/materiaux/reference";
import { regionDe } from "../../apps/web/src/domain/materiaux/regions";
import type { Sql } from "./cercles";

export interface PrixManuel { code: string; min: number; ref: number; max: number; source: string; sourceUrl: string | null; datePrix: string; auteur: string; at: string }

const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v ?? ""));

/** Dernière mise à jour manuelle par code (table append-only). */
export async function lirePrixManuels(sql: Sql): Promise<Record<string, PrixManuel>> {
  const lignes = await sql`SELECT DISTINCT ON ("code") * FROM "PrixReferenceManuel" ORDER BY "code", "createdAt" DESC`;
  const out: Record<string, PrixManuel> = {};
  for (const l of lignes)
    out[String(l.code)] = {
      code: String(l.code), min: Number(l.prixMinHT), ref: Number(l.prixHT), max: Number(l.prixMaxHT), source: String(l.source),
      sourceUrl: (l.sourceUrl as string) || null, datePrix: iso(l.datePrix).slice(0, 10), auteur: String(l.auteur), at: iso(l.createdAt),
    };
  return out;
}

/** `fictifs` : inclure les fournisseurs marqués fictifs (aperçu sur les hôtes de prévisualisation seulement). */
export async function lireFichesMarche(sql: Sql, fictifs = false): Promise<{ fiches: FicheMarche[]; fournisseurs: { region: string | null; zonesLivraison: string[]; categories: string[] }[] }> {
  const fiches = await sql`SELECT p."materiauCode", p."prixRefHT", p."updatedAt", p."validiteJusquau", f."id" AS "fournisseurId",
      f."region" AS "fournisseurRegion", f."zonesLivraison"
    FROM "SupplierPrice" p JOIN "Fournisseur" f ON f."id" = p."fournisseurId"
    WHERE p."statut" = 'APPROVED' AND f."statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE(f."meta"->>'fictif', 'false') <> 'true')
      AND p."updatedAt" > now() - interval '120 days'`;
  const fournisseurs = await sql`SELECT "region", "zonesLivraison", "categories" FROM "Fournisseur"
    WHERE "statut" = 'APPROVED' AND (${fictifs}::boolean OR COALESCE("meta"->>'fictif', 'false') <> 'true')`;
  return {
    fiches: fiches.map((l) => ({
      materiauCode: String(l.materiauCode), prixRefHT: Number(l.prixRefHT), updatedAt: iso(l.updatedAt),
      validiteJusquau: l.validiteJusquau ? iso(l.validiteJusquau).slice(0, 10) : null, fournisseurId: String(l.fournisseurId),
      fournisseurRegion: (l.fournisseurRegion as string) || null, zonesLivraison: liste(l.zonesLivraison),
    })),
    fournisseurs: fournisseurs.map((f) => ({ region: (f.region as string) || null, zonesLivraison: liste(f.zonesLivraison), categories: liste(f.categories) })),
  };
}

export interface DonneesPrix {
  fiches: FicheMarche[] | null;
  fournisseurs: { region: string | null; zonesLivraison: string[]; categories: string[] }[] | null;
  manuels: Record<string, PrixManuel>;
  /** Parents des codes créés à la modération (CIT-<PFX>-9NN → code générique), functions/_lib/catalogue.ts. */
  parents?: Record<string, string>;
}

/** Corps de la réponse publique (pur, testable). */
export function reponsePrix(d: DonneesPrix, regionBrute: string | null, codes: string[] | null, maintenant = Date.now()) {
  const region = regionBrute ? regionDe(regionBrute) : null;
  const marche: Record<string, Marche> = d.fiches ? agregerMarche(d.fiches, region, maintenant, (c) => d.parents?.[c]) : {};
  const voulus = codes?.length ? new Set(codes) : null;
  return {
    ok: true,
    catalogueVersion: CATALOGUE_VERSION,
    region,
    genereLe: new Date(maintenant).toISOString(),
    marcheDisponible: d.fiches !== null,
    fournisseursParCategorie: d.fournisseurs ? fournisseursParCategorie(d.fournisseurs, region) : null,
    materiaux: MATERIAUX_PUBLICS.filter((r) => !voulus || voulus.has(r.code)).map((r) => {
      const p = prixReference(r.code)!;
      const man = d.manuels[r.code];
      const m = marche[r.code] || null;
      const recherche = man
        ? { min: man.min, ref: man.ref, max: man.max, fiabilite: "B" as const, manuel: { source: man.source, sourceUrl: man.sourceUrl, datePrix: man.datePrix } }
        : { min: p.min, ref: p.ref, max: p.max, fiabilite: p.fiabilite };
      return {
        code: r.code, uniteRef: r.uniteRef, recherche, marche: m,
        retenu: m?.fiabilite === "A" && m.mediane != null
          ? { prix: m.mediane, fiabilite: "A", source: "fournisseurs" }
          : { prix: recherche.ref, fiabilite: recherche.fiabilite, source: man ? "manuel" : "recherche" },
      };
    }),
  };
}
