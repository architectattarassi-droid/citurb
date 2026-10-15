/**
 * Outil « Matériauthèque pro » (réservé, OUTILS_PRO.MATERIAUTHEQUE_PRO) : pour chaque
 * matériau que le pro chiffre (fiche de prix ou produit rattaché), son prix par
 * unité de référence face au marché de la région. Confidentialité inchangée :
 * médiane, minimum et maximum seulement à partir de 3 fournisseurs distincts
 * (agregerMarche), jamais le prix d'un autre pro.
 */
import { materiau } from "../../apps/web/src/domain/materiaux/catalogue";
import { agregerMarche } from "../../apps/web/src/domain/materiaux/marche";
import { regionDe } from "../../apps/web/src/domain/materiaux/regions";
import { exigerAcces } from "./accesPro";
import { fichesMarche, parentsCrees } from "./catalogue";
import type { DepotCatalogue } from "./catalogueDepot";
import { erreur, type Reponse } from "./cercles";
import type { Depot } from "./fournisseursDepot";

export async function positionPrix(fid: string, q: URLSearchParams, depot: Depot & DepotCatalogue): Promise<Reponse> {
  const refus = await exigerAcces(depot, fid, "MATERIAUTHEQUE_PRO");
  if (refus) return refus;
  const f = await depot.fParId(fid);
  if (!f) return erreur(404, "not_found");
  const region = regionDe(q.get("region") || String(f.region || "")) || null;
  const [fiches, produits, dyn] = await Promise.all([depot.offresFiches(false), depot.offresProduits(false), depot.refLister()]);
  const parents = parentsCrees(dyn);
  const toutes = [...fiches, ...produits];
  const marche = agregerMarche(fichesMarche(toutes, (o) => String(o.code)), region, Date.now(), (c) => parents[c]);
  const miens = new Map<string, number>();
  for (const o of toutes) if (o.fournisseurId === fid) miens.set(String(o.code), Math.min(Number(o.prix), miens.get(String(o.code)) ?? Infinity));
  return {
    status: 200,
    json: {
      ok: true, region,
      lignes: [...miens].map(([code, prix]) => {
        const m = marche[code];
        const ref = materiau(code);
        return {
          code, libelle: ref?.libelle || code, uniteRef: ref?.uniteRef || null, monPrix: prix, prixReference: ref?.prix.ref ?? null,
          marche: m ? { mediane: m.mediane, min: m.min, max: m.max, nbFournisseurs: m.nbFournisseurs, plusRecente: m.plusRecente } : null,
          ecartMediane: m?.mediane ? Math.round((prix / m.mediane - 1) * 1000) / 1000 : null,
        };
      }).sort((a, b) => a.code.localeCompare(b.code)),
    },
  };
}
