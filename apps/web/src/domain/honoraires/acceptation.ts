/**
 * Acceptation d'un devis et montants de facture — sans dépendance au référentiel des
 * phases (utilisable dans les écrans sans embarquer docs/gestion-projet/referentiel-phases.json).
 * Spec Devis & Facturation §1.9, §6.2, §7 (règles 2, 4).
 */
import { Dec, type EntreeDecimal } from "./decimal";
import type { ResultatDevis } from "./devis";
import type { DefinitionPack, GrilleTarifaire } from "./types";

export const TVA_DEFAUT = "20";
/** Délai de paiement d'une facture d'échéance (jours) — modifiable à l'émission. */
export const DELAI_PAIEMENT_DEFAUT = 15;

// ── Acceptation : lignes acceptées ──────────────────────────────────────

export interface LigneAcceptee { code: string; libelle: string; montantHT: string; horsHonoraires: boolean }

/**
 * Lignes que le client s'engage à payer à CITURBAREA.
 *   - Présentation PACKS : prestations du pack retenu (exactement un pack, règle 2).
 *   - Règle 4 : une prestation facultative, recommandée ou sur demande n'est
 *     facturée que si elle est commandée (`commandees`).
 *   - « Sur devis » : jamais facturable (un devis complémentaire est nécessaire).
 *   - Hors honoraires (BET, laboratoire, géomètre) : exclues par défaut — la spec v1
 *     ne refacture pas les autres intervenants ; paramètre à trancher par le fondateur.
 */
export function lignesAcceptees(
  r: ResultatDevis, grille: GrilleTarifaire,
  o: { pack?: DefinitionPack["code"] | null; commandees?: string[]; inclureHorsHonoraires?: boolean },
): { ok: true; lignes: LigneAcceptee[]; total: Dec } | { ok: false; erreur: string } {
  const commandees = new Set(o.commandees ?? []);
  const lignes: LigneAcceptee[] = [];
  if (r.presentation === "PACKS") {
    const pack = grille.packs.find((p) => p.code === o.pack);
    if (!pack) return { ok: false, erreur: "Choisir exactement un pack" };
    if (!r.assietteHonoraires) return { ok: false, erreur: "Assiette des honoraires absente" };
    for (const code of pack.prestations) {
      const p = grille.prestations.find((x) => x.code === code);
      if (!p?.valeur) continue;
      lignes.push({ code, libelle: `${p.libelle} (pack ${pack.libelle})`, montantHT: r.assietteHonoraires.pourcent(p.valeur).centimes().fixe2(), horsHonoraires: false });
    }
  } else if (o.pack) {
    return { ok: false, erreur: "Ce devis n'est pas présenté en packs" };
  }
  for (const l of r.lignes) {
    if (r.presentation === "PACKS" && !l.horsHonoraires) continue;
    if (!l.montant) continue;
    if (l.horsHonoraires && !o.inclureHorsHonoraires) continue;
    if (l.caractere !== "OBLIGATOIRE" && !commandees.has(l.code)) continue;
    lignes.push({ code: l.code, libelle: l.libelle, montantHT: l.montant.fixe2(), horsHonoraires: l.horsHonoraires });
  }
  if (!lignes.length) return { ok: false, erreur: "Aucune prestation facturable retenue" };
  return { ok: true, lignes, total: Dec.somme(lignes.map((l) => l.montantHT)) };
}

/** Partage exact en n parts au centime, le reste sur la dernière. */
export function partager(montant: EntreeDecimal, n: number): Dec[] {
  const total = Dec.de(montant);
  const part = total.divise(n).centimes();
  const parts = Array.from({ length: n }, () => part);
  parts[n - 1] = total.moins(part.fois(n - 1));
  return parts;
}

// ── Montants d'une facture ───────────────────────────────────────────────

export interface Totaux { ht: Dec; tauxTVA: Dec; tva: Dec; ttc: Dec; retenue: Dec; netAPayer: Dec }

/** HT → TVA (taux en %) → TTC ; retenue à la source éventuelle (champ prévu, spec §1.9). */
export function totauxFacture(montantHT: EntreeDecimal, tauxTVA: EntreeDecimal = TVA_DEFAUT, retenue: EntreeDecimal = 0): Totaux {
  const ht = Dec.de(montantHT).centimes(), t = Dec.de(tauxTVA);
  const tva = ht.pourcent(t).centimes();
  const ttc = ht.plus(tva);
  const ret = Dec.de(retenue).centimes();
  return { ht, tauxTVA: t, tva, ttc, retenue: ret, netAPayer: ttc.moins(ret) };
}

/** Statut d'une facture d'après ses encaissements et avoirs (spec §1.9). */
export function statutFacture(netAPayer: EntreeDecimal, encaisse: EntreeDecimal, avoirs: EntreeDecimal): "EMISE" | "PARTIELLEMENT_REGLEE" | "REGLEE" | "ANNULEE" {
  const net = Dec.de(netAPayer).plus(avoirs);
  if (net.cmp(0) <= 0) return "ANNULEE";
  const e = Dec.de(encaisse);
  if (e.cmp(net) >= 0) return "REGLEE";
  return e.estNul() ? "EMISE" : "PARTIELLEMENT_REGLEE";
}
