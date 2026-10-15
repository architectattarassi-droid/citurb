/**
 * Calcul d'un devis d'honoraires (spec §2.4, §4, §5.1, §7).
 *
 * Fonction pure : grille + projet + choix de lignes → lignes chiffrées,
 * sous-totaux par groupe A/B/C/D, totaux, packs. Les montants de ligne sont
 * arrondis au centime ; les totaux sont la somme des lignes arrondies.
 */
import { Dec, type EntreeDecimal } from "./decimal";
import type {
  Caractere, DefinitionPack, GrilleTarifaire, Groupe, Intervenant, ModalitePaiement, ModeTarification, Prestation,
  Presentation, TypeDevis, Typologie, Unite,
} from "./types";

export class DevisInvalide extends Error {
  constructor(readonly erreurs: string[]) { super(erreurs.join(" ; ")); }
}

export interface ProjetDevis {
  typologie?: Typologie;
  commune: string;
  surfacePlancher?: EntreeDecimal;
  nbNiveaux?: number;
  sousSol?: boolean;
}

export interface ChoixLigne {
  code: string;
  quantite?: EntreeDecimal;
  /** Prix unitaire / forfait négocié pour ce devis (remplace la valeur de grille). */
  prix?: EntreeDecimal;
  /** Caractère retenu pour ce devis (ex. TOPO commandée). */
  caractere?: Caractere;
}

export interface EntreeDevis {
  grille: GrilleTarifaire;
  type: TypeDevis;
  presentation: Presentation;
  projet: ProjetDevis;
  /** Absent pour une mission purement forfaitaire. */
  coutTravaux?: EntreeDecimal;
  tauxHonoraires?: EntreeDecimal;
  lignes: ChoixLigne[];
  /** Codes de missions déjà réglées par le client (règle 8) : jamais en ligne facturable. */
  missionsDejaReglees?: string[];
  modalitesPaiement?: ModalitePaiement;
  hypotheses?: string[];
}

export interface LigneCalculee {
  code: string;
  libelle: string;
  descriptif: string;
  modeTarification: ModeTarification;
  quotePart: Dec | null;
  quantite: Dec | null;
  unite?: Unite;
  prixUnitaire: Dec | null;
  /** null = « Sur devis » (hors domaine de validité ou non tarifé). */
  montant: Dec | null;
  surDevis: boolean;
  motifSurDevis?: string;
  caractere: Caractere;
  intervenant: Intervenant;
  horsHonoraires: boolean;
  groupe: Groupe;
  mentionRestrictive?: string;
}

export interface PackCalcule {
  code: DefinitionPack["code"];
  libelle: string;
  prestations: string[];
  quotePartCumulee: Dec;
  montant: Dec;
  mentionRestrictive?: string;
}

export interface ResultatDevis {
  type: TypeDevis;
  presentation: Presentation;
  coutTravaux: Dec | null;
  tauxHonoraires: Dec;
  assietteHonoraires: Dec | null;
  /** Section « Base de calcul » présente (mission au pourcentage). */
  sectionBaseDeCalcul: boolean;
  lignes: LigneCalculee[];
  /** Lignes d'honoraires présentées en packs (presentation PACKS). */
  packs: PackCalcule[];
  sousTotaux: Record<Groupe, Dec>;
  /** A + B. `incomplet` si une ligne obligatoire est « Sur devis ». */
  totalObligatoire: Dec;
  totalObligatoireIncomplet: boolean;
  totalToutesPrestations: Dec;
  hypotheses: string[];
}

export function groupeDe(caractere: Caractere, horsHonoraires: boolean): Groupe {
  if (caractere === "OBLIGATOIRE") return horsHonoraires ? "B_TECHNIQUE_OBLIGATOIRE" : "A_HONORAIRES_OBLIGATOIRES";
  if (caractere === "SUR_DEMANDE") return "D_SUR_DEMANDE";
  return "C_FACULTATIF";
}

/** Règle 3 : le forfait est-il dans son domaine de validité ? Renvoie le motif sinon. */
export function horsDomaine(p: Prestation, projet: ProjetDevis): string | null {
  const d = p.domaineValidite;
  if (!d) return null;
  if (d.typologies && (!projet.typologie || !d.typologies.includes(projet.typologie))) return "typologie hors du domaine de calibrage";
  if (d.surfacePlancherMax != null && (projet.surfacePlancher == null || Dec.de(projet.surfacePlancher).cmp(d.surfacePlancherMax) > 0)) return `surface de plancher au-delà de ${d.surfacePlancherMax} m²`;
  if (d.niveauxMax != null && (projet.nbNiveaux == null || projet.nbNiveaux > d.niveauxMax)) return `plus de ${d.niveauxMax} niveaux`;
  if (d.sousSol === false && projet.sousSol) return "projet avec sous-sol";
  return null;
}

const avecCommune = (s: string, commune: string) => s.replace(/\{commune\}/g, commune.trim() || "…");

export function calculerDevis(e: EntreeDevis): ResultatDevis {
  const erreurs: string[] = [];
  const reglees = new Set(e.missionsDejaReglees ?? []);
  const taux = Dec.de(e.tauxHonoraires ?? e.grille.tauxHonoraires);
  const cout = e.coutTravaux != null ? Dec.de(e.coutTravaux) : null;
  const assiette = cout ? cout.pourcent(taux).centimes() : null;
  const vus = new Set<string>();

  const lignes: LigneCalculee[] = [];
  for (const c of e.lignes) {
    const p = e.grille.prestations.find((x) => x.code === c.code);
    if (!p) { erreurs.push(`Prestation inconnue : ${c.code}`); continue; }
    if (!p.actif) { erreurs.push(`Prestation inactive : ${c.code}`); continue; }
    if (vus.has(c.code)) { erreurs.push(`Prestation en double : ${c.code}`); continue; }
    vus.add(c.code);
    if (reglees.has(c.code)) { erreurs.push(`« ${p.libelle} » est déjà réglée : elle figure en état du chantier, pas en ligne facturable (règle 8)`); continue; }

    const caractere = c.caractere ?? p.caractere;
    const base = {
      code: p.code, libelle: p.libelle, descriptif: avecCommune(p.descriptif, e.projet.commune), modeTarification: p.modeTarification,
      unite: p.unite, caractere, intervenant: p.intervenant, horsHonoraires: p.horsHonoraires,
      groupe: groupeDe(caractere, p.horsHonoraires), mentionRestrictive: p.mentionRestrictive,
    };
    const valeur = c.prix ?? p.valeur;
    const motif = c.prix != null ? null : valeur == null ? "prestation non encore tarifée" : horsDomaine(p, e.projet);

    let quotePart: Dec | null = null, quantite: Dec | null = null, pu: Dec | null = null, montant: Dec | null = null;
    switch (p.modeTarification) {
      case "POURCENTAGE_HONORAIRES":
        quotePart = Dec.de(p.valeur ?? 0);
        if (!assiette) { erreurs.push(`« ${p.libelle} » est au pourcentage : coût prévisionnel des travaux requis`); continue; }
        montant = assiette.pourcent(quotePart).centimes();
        break;
      case "POURCENTAGE_TRAVAUX":
        quotePart = Dec.de(p.valeur ?? 0);
        if (!cout) { erreurs.push(`« ${p.libelle} » : coût prévisionnel des travaux requis`); continue; }
        montant = cout.pourcent(quotePart).centimes();
        break;
      case "FORFAIT":
        if (!motif) { pu = Dec.de(valeur as EntreeDecimal); montant = pu.centimes(); }
        break;
      case "UNITAIRE":
        if (c.quantite == null) { erreurs.push(`« ${p.libelle} » : quantité requise`); continue; }
        quantite = Dec.de(c.quantite);
        if (quantite.estNegatif()) { erreurs.push(`« ${p.libelle} » : quantité négative`); continue; }
        if (!motif) { pu = Dec.de(valeur as EntreeDecimal); montant = pu.fois(quantite).centimes(); }
        break;
    }
    const surDevis = montant === null;
    lignes.push({ ...base, quotePart, quantite, prixUnitaire: pu, montant, surDevis, motifSurDevis: surDevis ? motif ?? undefined : undefined });
  }
  if (erreurs.length) throw new DevisInvalide(erreurs);

  // Packs : composition de prestations recalculée sur l'assiette (§4).
  let packs: PackCalcule[] = [];
  if (e.presentation === "PACKS") {
    if (!assiette) throw new DevisInvalide(["Présentation en packs : coût prévisionnel des travaux requis"]);
    packs = e.grille.packs.map((def) => {
      const qp = Dec.somme(def.prestations.map((code) => {
        const p = e.grille.prestations.find((x) => x.code === code);
        if (!p || p.modeTarification !== "POURCENTAGE_HONORAIRES") throw new DevisInvalide([`Pack ${def.code} : ${code} n'est pas une quote-part d'honoraires`]);
        return p.valeur ?? 0;
      }));
      return { code: def.code, libelle: def.libelle, prestations: def.prestations, quotePartCumulee: qp, montant: assiette.pourcent(qp).centimes(), mentionRestrictive: def.mentionRestrictive };
    });
  }

  const enPacks = (l: LigneCalculee) => e.presentation === "PACKS" && l.modeTarification === "POURCENTAGE_HONORAIRES";
  const sousTotaux: Record<Groupe, Dec> = { A_HONORAIRES_OBLIGATOIRES: Dec.ZERO, B_TECHNIQUE_OBLIGATOIRE: Dec.ZERO, C_FACULTATIF: Dec.ZERO, D_SUR_DEMANDE: Dec.ZERO };
  for (const l of lignes) if (l.montant && !enPacks(l)) sousTotaux[l.groupe] = sousTotaux[l.groupe].plus(l.montant);
  const obligatoires = lignes.filter((l) => !enPacks(l) && (l.groupe === "A_HONORAIRES_OBLIGATOIRES" || l.groupe === "B_TECHNIQUE_OBLIGATOIRE"));

  return {
    type: e.type,
    presentation: e.presentation,
    coutTravaux: cout,
    tauxHonoraires: taux,
    assietteHonoraires: assiette,
    sectionBaseDeCalcul: !!cout && lignes.some((l) => l.modeTarification.startsWith("POURCENTAGE")),
    lignes,
    packs,
    sousTotaux,
    totalObligatoire: sousTotaux.A_HONORAIRES_OBLIGATOIRES.plus(sousTotaux.B_TECHNIQUE_OBLIGATOIRE),
    totalObligatoireIncomplet: obligatoires.some((l) => l.surDevis),
    totalToutesPrestations: Dec.somme(lignes.filter((l) => l.montant && !enPacks(l)).map((l) => l.montant as Dec)),
    hypotheses: e.hypotheses ?? [],
  };
}

/** Montant retenu à l'acceptation d'un devis en packs (règle 2 : exactement un pack). */
export function montantPackRetenu(r: ResultatDevis, packCode: string | null | undefined): Dec {
  if (r.presentation !== "PACKS") throw new DevisInvalide(["Ce devis n'est pas présenté en packs"]);
  const p = r.packs.find((x) => x.code === packCode);
  if (!p) throw new DevisInvalide(["Choisir exactement un pack"]);
  return p.montant;
}

export const TEXTES_MODALITES: Record<ModalitePaiement, string> = {
  AVANCE_TOTALE: "La totalité du forfait est payable d'avance, à la commande. Le dépôt du dossier n'est engagé qu'après encaissement.",
  "50_50": "50 % à la commande, solde à la délivrance de la décision.",
  PAR_TRANCHES: "Règlement par tranches, à l'achèvement de chaque mission.",
  PAR_VISITE: "Suivi de chantier réglable à la visite ; nombre de visites arrêté au démarrage du chantier.",
};

export const MENTIONS_SYSTEMATIQUES = [
  "Les frais et taxes communaux sont à la charge du maître d'ouvrage.",
  "Les délais de délivrance dépendent des services instructeurs et ne sont pas garantis par le cabinet.",
  "Montants en dirhams ; TVA applicable selon la réglementation en vigueur.",
  "Devis valable 30 jours ; son acceptation vaut ordre de service.",
];

export const LIBELLES_GROUPES: Record<Groupe, string> = {
  A_HONORAIRES_OBLIGATOIRES: "A — Honoraires obligatoires de l'architecte",
  B_TECHNIQUE_OBLIGATOIRE: "B — Prestations techniques obligatoires",
  C_FACULTATIF: "C — Prestations facultatives ou recommandées",
  D_SUR_DEMANDE: "D — Missions sur demande",
};
