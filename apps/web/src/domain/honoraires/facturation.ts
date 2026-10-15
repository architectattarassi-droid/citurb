/**
 * Acceptation, échéancier par phase, factures et état des paiements
 * (spec §1.9, §6.2, §6.3, §7 ; décision du fondateur du 15/10/2026 :
 * « chaque phase du projet se déclenche après paiement, suivant le contrat
 * et ses modalités de paiement »).
 *
 * Fonctions pures, en décimal exact, exécutées par le serveur (functions/_lib/facturationDepot.ts)
 * et par les écrans. Phases : référentiel P00…P14 (packages/contracts/src/gestion/referentiel.ts),
 * dont chaque phase liste les missions qu'elle porte (HON_AUTORISATION → P04…).
 */
import { PHASES_REF } from "../../../../../packages/contracts/src/gestion/referentiel";
import { Dec, type EntreeDecimal } from "./decimal";
import type { ResultatDevis } from "./devis";
import type { DefinitionPack, GrilleTarifaire, ModalitePaiement } from "./types";

export const TVA_DEFAUT = "20";
/** Délai de paiement d'une facture d'échéance (jours) — modifiable à l'émission. */
export const DELAI_PAIEMENT_DEFAUT = 15;

export const PHASES_PAIEMENT = PHASES_REF.map((p) => ({ code: p.code, ordre: p.ordre, libelle: p.libelleFr, libelleAr: p.libelleAr, missions: p.missions }));
const ORDRE = new Map(PHASES_PAIEMENT.map((p) => [p.code, p.ordre]));
export const ordrePhasePaiement = (code: string) => ORDRE.get(code) ?? 99;

/** Phases qui portent une mission, dans l'ordre (vide : mission non rattachée). */
export function phasesDeMission(code: string): string[] {
  return PHASES_PAIEMENT.filter((p) => p.missions.includes(code)).map((p) => p.code);
}

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

// ── Échéancier par phase ─────────────────────────────────────────────────

export interface EcheanceProposee {
  phaseCode: string;
  ordre: number;
  libelle: string;
  montantHT: string;
  /** SIGNATURE : due dès l'acceptation (acompte) ; DEBUT_PHASE : avant le démarrage de la phase. */
  declencheur: "SIGNATURE" | "DEBUT_PHASE";
  prestations: string[];
}

const libellePhase = (code: string) => PHASES_PAIEMENT.find((p) => p.code === code)?.libelle ?? code;
const phasePrincipale = (code: string) => phasesDeMission(code)[0] ?? "P00_IDEE_PROGRAMME";

/** Partage exact en n parts au centime, le reste sur la dernière. */
export function partager(montant: EntreeDecimal, n: number): Dec[] {
  const total = Dec.de(montant);
  const part = total.divise(n).centimes();
  const parts = Array.from({ length: n }, () => part);
  parts[n - 1] = total.moins(part.fois(n - 1));
  return parts;
}

/** Échéancier proposé à l'acceptation (modifiable par l'admin, chaque modification journalisée). */
export function echeancierParDefaut(lignes: LigneAcceptee[], modalite: ModalitePaiement): EcheanceProposee[] {
  if (!lignes.length) return [];
  const total = Dec.somme(lignes.map((l) => l.montantHT));
  const codes = lignes.map((l) => l.code);
  const phases = [...new Set(lignes.map((l) => phasePrincipale(l.code)))].sort((a, b) => ordrePhasePaiement(a) - ordrePhasePaiement(b));
  const premiere = phases[0];

  if (modalite === "AVANCE_TOTALE") {
    return [{ phaseCode: premiere, ordre: 1, libelle: "Règlement total à la commande", montantHT: total.fixe2(), declencheur: "SIGNATURE", prestations: codes }];
  }
  if (modalite === "50_50") {
    const derniere = [...new Set(lignes.flatMap((l) => phasesDeMission(l.code).length ? phasesDeMission(l.code) : [phasePrincipale(l.code)]))].sort((a, b) => ordrePhasePaiement(a) - ordrePhasePaiement(b)).pop() as string;
    const suivante = PHASES_PAIEMENT.find((p) => p.ordre === ordrePhasePaiement(derniere) + 1)?.code ?? derniere;
    const [a, b] = partager(total, 2);
    return [
      { phaseCode: premiere, ordre: 1, libelle: "Acompte de 50 % à la commande", montantHT: a.fixe2(), declencheur: "SIGNATURE", prestations: codes },
      { phaseCode: suivante, ordre: 2, libelle: "Solde de 50 % à la délivrance de la décision", montantHT: b.fixe2(), declencheur: "DEBUT_PHASE", prestations: codes },
    ];
  }
  // PAR_TRANCHES / PAR_VISITE : chaque mission est réglée avant chacune des phases qui la portent, à parts égales.
  const parPhase = new Map<string, { montant: Dec; prestations: Set<string> }>();
  for (const l of lignes) {
    const ps = phasesDeMission(l.code).length ? phasesDeMission(l.code) : [phasePrincipale(l.code)];
    partager(l.montantHT, ps.length).forEach((m, i) => {
      const e = parPhase.get(ps[i]) ?? { montant: Dec.ZERO, prestations: new Set<string>() };
      e.montant = e.montant.plus(m);
      e.prestations.add(l.code);
      parPhase.set(ps[i], e);
    });
  }
  return [...parPhase.entries()]
    .sort(([a], [b]) => ordrePhasePaiement(a) - ordrePhasePaiement(b))
    .map(([phaseCode, e], i) => ({
      phaseCode, ordre: i + 1, montantHT: e.montant.fixe2(), prestations: [...e.prestations],
      declencheur: i === 0 ? "SIGNATURE" as const : "DEBUT_PHASE" as const,
      libelle: i === 0 ? `Acompte à la signature — ${libellePhase(phaseCode)}` : `Tranche avant démarrage — ${libellePhase(phaseCode)}`,
    }));
}

/** Contrôle d'un échéancier modifié par l'admin : somme = montant accepté (spec §6.3), phases connues. */
export function verifierEcheancier(e: Array<Pick<EcheanceProposee, "phaseCode" | "montantHT" | "libelle">>, totalAccepte: EntreeDecimal): string[] {
  const erreurs: string[] = [];
  if (!e.length) erreurs.push("Échéancier vide");
  for (const x of e) {
    if (!ORDRE.has(x.phaseCode)) erreurs.push(`Phase inconnue : ${x.phaseCode}`);
    if (!x.libelle.trim()) erreurs.push("Échéance sans libellé");
    try { if (!Dec.de(x.montantHT).cmp(0)) erreurs.push(`Échéance à 0 : ${x.libelle}`); else if (Dec.de(x.montantHT).estNegatif()) erreurs.push(`Montant négatif : ${x.libelle}`); }
    catch { erreurs.push(`Montant illisible : ${x.libelle}`); }
  }
  if (!erreurs.length) {
    const somme = Dec.somme(e.map((x) => x.montantHT));
    if (!somme.egal(totalAccepte)) erreurs.push(`La somme des échéances (${somme.fixe2()}) doit égaler le montant accepté (${Dec.de(totalAccepte).fixe2()})`);
  }
  return erreurs;
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

// ── État des paiements par phase (lu par la gestion de projet) ───────────

export type StatutPaiementPhase = "NON_DUE" | "A_EMETTRE" | "EMISE" | "PARTIELLE" | "PAYEE" | "EN_RETARD";

export interface EcheanceEtat { id: string; devisId: string; phaseCode: string; libelle: string; montantHT: string; declencheur: "SIGNATURE" | "DEBUT_PHASE" }
export interface FactureEtat {
  id: string; numero: string; type: string; statut: string; echeanceId: string | null; factureOrigineId: string | null;
  montantTTC: string; netAPayer: string; dateEmission: string; dateEcheance: string;
}
export interface EncaissementEtat { factureId: string; montant: string; date: string }
export interface DeblocageEtat { phaseCode: string; motif: string; par: string; le: string }
export interface DevisEtat { id: string; numero: string | null; statut: string }

export interface PhasePaiement {
  phase: string; ordre: number; libelle: string;
  devis: Array<{ id: string; numero: string | null }>;
  echeances: Array<{ id: string; libelle: string; montantHT: string; facturee: boolean }>;
  factures: Array<{ id: string; numero: string; type: string; statut: string; du: string; paye: string; restant: string; dateEcheance: string }>;
  /** Montants TTC net (avoirs déduits) ; les échéances non encore facturées sont estimées au taux par défaut. */
  du: string; paye: string; restant: string; estime: boolean;
  statut: StatutPaiementPhase;
  datePaiementComplet: string | null;
  /** Une échéance non payée bloque le démarrage de la phase, sauf déblocage motivé par l'admin. */
  bloquante: boolean;
  deblocage: DeblocageEtat | null;
  aucuneEcheance: boolean;
}

const GRAVITE: StatutPaiementPhase[] = ["EN_RETARD", "A_EMETTRE", "PARTIELLE", "EMISE", "NON_DUE", "PAYEE"];

export function etatPaiementPhases(i: {
  phaseActuelle: string | null; aujourdhui: string; devis: DevisEtat[]; echeances: EcheanceEtat[]; factures: FactureEtat[];
  encaissements: EncaissementEtat[]; deblocages: DeblocageEtat[]; tauxTVA?: string;
}): PhasePaiement[] {
  const ordreActuel = i.phaseActuelle ? ordrePhasePaiement(i.phaseActuelle) : -1;
  const avoirsDe = (fid: string) => i.factures.filter((f) => f.type === "AVOIR" && f.factureOrigineId === fid && f.statut !== "ANNULEE");
  const payeDe = (fid: string) => i.encaissements.filter((e) => e.factureId === fid);

  return PHASES_PAIEMENT.map((ph) => {
    const echeances = i.echeances.filter((e) => e.phaseCode === ph.code);
    const deblocage = [...i.deblocages].reverse().find((d) => d.phaseCode === ph.code) ?? null;
    const statuts: StatutPaiementPhase[] = [];
    let du = Dec.ZERO, paye = Dec.ZERO, estime = false, dernierPaiement: string | null = null;
    const factures: PhasePaiement["factures"] = [];

    for (const e of echeances) {
      const fs = i.factures.filter((f) => f.echeanceId === e.id && f.type !== "AVOIR" && f.statut !== "ANNULEE" && f.statut !== "BROUILLON");
      if (!fs.length) {
        du = du.plus(totauxFacture(e.montantHT, i.tauxTVA ?? TVA_DEFAUT).ttc);
        estime = true;
        const exigible = e.declencheur === "SIGNATURE" || ph.ordre <= ordreActuel + 1;
        statuts.push(exigible ? "A_EMETTRE" : "NON_DUE");
        continue;
      }
      for (const f of fs) {
        const net = Dec.de(f.netAPayer).plus(Dec.somme(avoirsDe(f.id).map((a) => a.netAPayer)));
        const encs = payeDe(f.id);
        const p = Dec.somme(encs.map((x) => x.montant));
        const restant = net.moins(p);
        du = du.plus(net); paye = paye.plus(p);
        const solde = restant.cmp(0) <= 0;
        if (solde && encs.length) dernierPaiement = [dernierPaiement, ...encs.map((x) => x.date)].filter(Boolean).sort().pop() ?? null;
        statuts.push(solde ? "PAYEE" : f.dateEcheance < i.aujourdhui ? "EN_RETARD" : p.estNul() ? "EMISE" : "PARTIELLE");
        factures.push({ id: f.id, numero: f.numero, type: f.type, statut: f.statut, du: net.fixe2(), paye: p.fixe2(), restant: (restant.estNegatif() ? Dec.ZERO : restant).fixe2(), dateEcheance: f.dateEcheance });
      }
    }
    const statut = statuts.length ? GRAVITE.find((g) => statuts.includes(g)) as StatutPaiementPhase : "NON_DUE";
    const devisIds = new Set(echeances.map((e) => e.devisId));
    const restant = du.moins(paye);
    return {
      phase: ph.code, ordre: ph.ordre, libelle: ph.libelle,
      devis: i.devis.filter((d) => devisIds.has(d.id)).map((d) => ({ id: d.id, numero: d.numero })),
      echeances: echeances.map((e) => ({ id: e.id, libelle: e.libelle, montantHT: e.montantHT, facturee: i.factures.some((f) => f.echeanceId === e.id && f.type !== "AVOIR" && f.statut !== "ANNULEE") })),
      factures,
      du: du.fixe2(), paye: paye.fixe2(), restant: (restant.estNegatif() ? Dec.ZERO : restant).fixe2(), estime,
      statut,
      datePaiementComplet: statut === "PAYEE" ? dernierPaiement : null,
      bloquante: echeances.length > 0 && statut !== "PAYEE" && !deblocage,
      deblocage,
      aucuneEcheance: echeances.length === 0,
    };
  });
}

/** Statut d'une facture d'après ses encaissements et avoirs (spec §1.9). */
export function statutFacture(netAPayer: EntreeDecimal, encaisse: EntreeDecimal, avoirs: EntreeDecimal): "EMISE" | "PARTIELLEMENT_REGLEE" | "REGLEE" | "ANNULEE" {
  const net = Dec.de(netAPayer).plus(avoirs);
  if (net.cmp(0) <= 0) return "ANNULEE";
  const e = Dec.de(encaisse);
  if (e.cmp(net) >= 0) return "REGLEE";
  return e.estNul() ? "EMISE" : "PARTIELLEMENT_REGLEE";
}
