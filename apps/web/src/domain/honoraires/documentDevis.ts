/**
 * Modèle de document d'un devis (spec §5.1, émetteur CITURBAREA / HSE DECO).
 *
 * Un seul modèle, neutre, rendu à l'identique en PDF (rendu/pdf.ts), en DOCX
 * (rendu/docx.ts) et en aperçu HTML : les deux fichiers portent donc le même
 * numéro et la même empreinte de contenu (SHA-256 du modèle, stockée sur le
 * devis à l'émission, §5.6).
 */
import { Dec, formatDH, formatM2 } from "./decimal";
import { LIBELLES_GROUPES, MENTIONS_SYSTEMATIQUES, TEXTES_MODALITES, type LigneCalculee } from "./devis";
import type { CalculComplet, EntreeDevisComplet } from "./devisComplet";
import { BANDEAU_SUIVI, EMETTEUR, type Emetteur } from "./emetteur";
import { lignesBaseCalcul } from "./metre";
import type { Caractere, Intervenant } from "./types";

// ── Modèle ───────────────────────────────────────────────────────────────

export interface Cellule {
  texte: string;
  /** Ligne en italique gris sous le texte (descriptif). */
  sous?: string;
  /** Mention restrictive en rouge (§4 : « Plan type 2D… »). */
  alerte?: string;
  gras?: boolean;
  /** Case à cocher (choix du pack). */
  caseACocher?: boolean;
  or?: boolean;
}
export interface Colonne { titre: string; largeur: number; align?: "gauche" | "droite" | "centre" }
export type StyleLigne = "normal" | "total" | "sousTotal";

export type Bloc =
  | { t: "entete"; marque: string; lignes: string[] }
  | { t: "titre"; texte: string; reference: string; sousTitre?: string }
  | { t: "identification"; lignes: Array<[string, string]> }
  | { t: "hypotheses"; titre: string; lignes: string[] }
  | { t: "section"; titre: string }
  | { t: "tableau"; colonnes: Colonne[]; lignes: Cellule[][]; styles?: StyleLigne[] }
  | { t: "paragraphe"; texte: string; style?: "note" | "normal" | "alerte" | "gras" }
  | { t: "liste"; items: string[] }
  | { t: "signatures"; gauche: string[]; droite: string[] }
  | { t: "bandeau"; lignes: string[] };

export interface DocumentDevis {
  version: 1;
  numero: string;
  brouillon: boolean;
  titre: string;
  blocs: Bloc[];
  piedDePage: string;
}

export interface ContexteDocument {
  numero: string | null;
  revision?: number;
  dateEmission: string;
  emetteur?: Emetteur;
  client: { nomAffiche: string; type: "PERSONNE" | "SOCIETE"; ice?: string | null; adresse?: string | null; ville?: string | null };
  projet: {
    intitule: string; gabarit?: string | null; lot?: string | null; lotissement?: string | null; commune: string; prefecture?: string | null;
    titreFoncier?: string | null; autorisationNum?: string | null; autorisationDate?: string | null; etatChantier?: string | null;
  };
  architecte: { nom: string; architecte?: string | null; titre?: string | null; numeroOrdre?: string | null } | null;
  missionsReglees: Array<{ libelle: string; date: string | null }>;
  /** Le client a un compte actif : lien direct vers son espace (§5.4). */
  compteActif?: boolean;
}

// ── Construction ─────────────────────────────────────────────────────────

const dateFr = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${j} ${mois[m - 1]} ${a}`;
};
const ajouterJours = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const INTERVENANT: Record<Intervenant, string> = { ARCHITECTE: "Architecte", BUREAU_ETUDES: "Bureau d'études", LABORATOIRE: "Laboratoire", GEOMETRE: "Géomètre" };
const CARACTERE: Record<Caractere, string> = { OBLIGATOIRE: "Obligatoire", FACULTATIVE: "Facultative", RECOMMANDEE: "Recommandée", SUR_DEMANDE: "Sur demande" };
const montant = (l: LigneCalculee) => (l.montant ? formatDH(l.montant) : "Sur devis");
/** Total d'un groupe de lignes : « Sur devis » si rien n'est chiffré, mention si une partie l'est. */
const totalTexte = (ls: LigneCalculee[]) => {
  const chiffrees = ls.filter((l) => l.montant);
  if (!chiffrees.length && ls.length) return "Sur devis";
  const t = formatDH(Dec.somme(chiffrees.map((l) => l.montant as Dec)));
  return chiffrees.length < ls.length ? `${t} + Sur devis` : t;
};
const pct = (d: Dec) => `${d.toString().replace(".", ",")} %`;

export function construireDocument(e: EntreeDevisComplet, calc: Extract<CalculComplet, { ok: true }>, ctx: ContexteDocument): DocumentDevis {
  const r = calc.resultat;
  const em = ctx.emetteur ?? EMETTEUR;
  const brouillon = !ctx.numero;
  const numero = ctx.numero ?? "BROUILLON";
  const suffixe = r.type === "COMPLEMENTAIRE" ? " — MISSION COMPLÉMENTAIRE" : r.type === "MISSION_PARTIELLE" ? " — MISSION PARTIELLE" : "";
  const titre = `DEVIS D'HONORAIRES${suffixe}`;
  const blocs: Bloc[] = [];

  // En-tête : l'émetteur est CITURBAREA / HSE DECO (décision du 15/10/2026).
  blocs.push({
    t: "entete", marque: em.marque,
    lignes: [
      `Plateforme de mise en relation et de gestion de projets — ${em.raisonSociale}`,
      [em.siege, `Tél. ${em.telephone}`, em.site].filter(Boolean).join(" | "),
      [em.ice && `ICE ${em.ice}`, em.identifiantFiscal && `IF ${em.identifiantFiscal}`, em.rc && `RC ${em.rc}`, em.patente && `Patente ${em.patente}`].filter(Boolean).join(" · "),
    ].filter(Boolean),
  });
  blocs.push({ t: "titre", texte: titre, reference: `N° ${numero} — ${dateFr(ctx.dateEmission)}`, sousTitre: e.objet?.trim() || ctx.projet.intitule });

  // Tableau d'identification : lignes vides masquées, sauf impression pour remplissage manuel.
  const p = ctx.projet;
  const situation = [p.lot, p.lotissement, [p.commune, p.prefecture].filter(Boolean).join(" — ")].filter(Boolean).join(", ");
  const autorisation = p.autorisationNum ? `${p.autorisationNum}${p.autorisationDate ? ` du ${dateFr(p.autorisationDate)}` : ""}` : "";
  const etat = [p.etatChantier, ...ctx.missionsReglees.map((m) => `${m.libelle} : réalisé et réglé${m.date ? ` (${dateFr(m.date)})` : ""}`)].filter(Boolean).join(". ");
  const archi = ctx.architecte ? [ctx.architecte.nom, [ctx.architecte.architecte, ctx.architecte.titre].filter(Boolean).join(", "), ctx.architecte.numeroOrdre && `n° d'Ordre ${ctx.architecte.numeroOrdre}`].filter(Boolean).join(" — ") : "";
  const ident: Array<[string, string]> = [
    ["Maître d'ouvrage", [ctx.client.nomAffiche, ctx.client.type === "SOCIETE" && ctx.client.ice ? `ICE ${ctx.client.ice}` : ""].filter(Boolean).join(" — ")],
    ["Architecte du projet", archi],
    ["Projet", [p.intitule, p.gabarit].filter(Boolean).join(" — ")],
    ["Situation", situation],
    ["Titre foncier", p.titreFoncier || ""],
    ["Autorisation initiale", autorisation],
    ["État du chantier", etat],
    ["Date du devis", dateFr(ctx.dateEmission)],
    ["Validité", `${e.validiteJours} jours, jusqu'au ${dateFr(ajouterJours(ctx.dateEmission, e.validiteJours))}`],
  ];
  blocs.push({ t: "identification", lignes: e.pourRemplissageManuel ? ident : ident.filter(([, v]) => v) });

  if (r.hypotheses.length) blocs.push({ t: "hypotheses", titre: "Hypothèses de calcul à confirmer par le maître d'ouvrage", lignes: r.hypotheses });

  let n = 1;
  // 1. Base de calcul (pourcentage) ou 1'. Objet de la mission (forfait).
  if (r.sectionBaseDeCalcul && calc.cout && calc.surfacePlancher) {
    blocs.push({ t: "section", titre: `${n++}. BASE DE CALCUL` });
    const base = lignesBaseCalcul(calc.niveaux);
    blocs.push({
      t: "tableau",
      colonnes: [{ titre: "Niveau", largeur: 0.3 }, { titre: "Détail du calcul", largeur: 0.45 }, { titre: "Surface", largeur: 0.25, align: "droite" }],
      lignes: [...base.map((b) => [{ texte: b.niveaux }, { texte: b.detail }, { texte: formatM2(b.surface) }]),
        [{ texte: "Surface de plancher totale", gras: true }, { texte: "" }, { texte: formatM2(calc.surfacePlancher), gras: true }]],
      styles: [...base.map(() => "normal" as const), "total"],
    });
    const pu = Dec.de(e.puElevation as string);
    const lignesCout: Cellule[][] = [[{ texte: "Élévation / construction" }, { texte: `${formatM2(calc.surfacePlancher)} × ${formatDH(pu)}/m²` }, { texte: formatDH(calc.cout.coutElevation) }]];
    const styles: StyleLigne[] = ["normal"];
    if (e.fondations && !e.fondations.incluses) {
      lignesCout.push([{ texte: "Fondations (un seul niveau)" }, { texte: `${formatM2(calc.empriseAuSol ?? Dec.ZERO)} × ${formatDH(e.fondations.pu)}/m²` }, { texte: formatDH(calc.cout.coutFondations) }]);
      styles.push("normal");
    }
    lignesCout.push([{ texte: "Coût prévisionnel des travaux", gras: true }, { texte: "" }, { texte: formatDH(calc.cout.coutTravaux), gras: true }]);
    lignesCout.push([{ texte: "Honoraires d'architecte (assiette)", gras: true }, { texte: `${pct(r.tauxHonoraires)} du coût prévisionnel` }, { texte: formatDH(r.assietteHonoraires as Dec), gras: true }]);
    styles.push("total", "total");
    blocs.push({ t: "tableau", colonnes: [{ titre: "Poste", largeur: 0.38 }, { titre: "Calcul", largeur: 0.37 }, { titre: "Montant", largeur: 0.25, align: "droite" }], lignes: lignesCout, styles });
    blocs.push({ t: "paragraphe", style: "note", texte: "Le coût prévisionnel est une estimation servant de base de calcul aux honoraires ; il n'engage pas le coût réel de construction." });
  } else {
    blocs.push({ t: "section", titre: `${n++}. OBJET DE LA MISSION` });
    const missions = r.lignes.filter((l) => !l.horsHonoraires && l.groupe === "A_HONORAIRES_OBLIGATOIRES");
    for (const l of missions) blocs.push({ t: "paragraphe", style: "gras", texte: l.libelle }, { t: "paragraphe", texte: l.descriptif });
  }

  // 2. Honoraires.
  const honoraires = r.lignes.filter((l) => !l.horsHonoraires);
  if (r.presentation === "PACKS" && r.packs.length) {
    blocs.push({ t: "section", titre: `${n++}. HONORAIRES — CHOIX DU PACK (un seul pack à cocher)` });
    blocs.push({
      t: "tableau",
      colonnes: [{ titre: "", largeur: 0.06, align: "centre" }, { titre: "Pack", largeur: 0.5 }, { titre: "Quote-part", largeur: 0.17, align: "droite" }, { titre: "Montant", largeur: 0.27, align: "droite" }],
      lignes: r.packs.map((pk) => [
        { texte: "", caseACocher: true },
        {
          texte: `Pack ${pk.libelle}`, gras: true, or: pk.code === "PREMIUM", alerte: pk.mentionRestrictive,
          sous: pk.prestations.map((c) => honoraires.find((l) => l.code === c)?.libelle ?? c).join(" + "),
        },
        { texte: pct(pk.quotePartCumulee) },
        { texte: formatDH(pk.montant), gras: true, or: pk.code === "PREMIUM" },
      ]),
    });
    blocs.push({ t: "paragraphe", style: "note", texte: `Total des honoraires à 100 % : ${formatDH(r.assietteHonoraires as Dec)} (${pct(r.tauxHonoraires)} du coût prévisionnel), affiché pour mémoire.` });
  } else if (honoraires.length) {
    blocs.push({ t: "section", titre: `${n++}. HONORAIRES DE L'ARCHITECTE` });
    const lignes = honoraires.map((l) => [
      { texte: l.libelle, sous: r.sectionBaseDeCalcul ? l.descriptif : undefined, alerte: l.mentionRestrictive },
      { texte: CARACTERE[l.caractere] },
      { texte: l.quotePart ? pct(l.quotePart) : "Forfait" },
      { texte: montant(l), gras: true },
    ]);
    blocs.push({
      t: "tableau",
      colonnes: [{ titre: "Mission", largeur: 0.47 }, { titre: "Caractère", largeur: 0.18 }, { titre: "Quote-part", largeur: 0.13, align: "droite" }, { titre: "Montant", largeur: 0.22, align: "droite" }],
      lignes: [...lignes, [{ texte: "Sous-total honoraires", gras: true }, { texte: "" }, { texte: "" }, { texte: totalTexte(honoraires), gras: true }]],
      styles: [...lignes.map(() => "normal" as const), "sousTotal"],
    });
  }

  // 3. Prestations hors honoraires (intervenant nommé, sous-total propre).
  const hors = r.lignes.filter((l) => l.horsHonoraires && l.groupe !== "D_SUR_DEMANDE");
  if (hors.length) {
    blocs.push({ t: "section", titre: `${n++}. PRESTATIONS HORS HONORAIRES D'ARCHITECTE` });
    blocs.push({ t: "paragraphe", style: "note", texte: "Prestations réalisées par d'autres intervenants, distinctes des honoraires de l'architecte." });
    const lignes = hors.map((l) => [
      { texte: l.libelle, sous: [l.descriptif, l.quantite && l.prixUnitaire ? `${l.quantite.toString().replace(".", ",")} × ${formatDH(l.prixUnitaire)}` : ""].filter(Boolean).join(" — ") },
      { texte: INTERVENANT[l.intervenant] },
      { texte: CARACTERE[l.caractere] },
      { texte: montant(l), gras: true },
    ]);
    blocs.push({
      t: "tableau",
      colonnes: [{ titre: "Prestation", largeur: 0.41 }, { titre: "Intervenant", largeur: 0.18 }, { titre: "Caractère", largeur: 0.19 }, { titre: "Montant", largeur: 0.22, align: "droite" }],
      lignes: [...lignes, [{ texte: "Sous-total hors honoraires", gras: true }, { texte: "" }, { texte: "" }, { texte: totalTexte(hors), gras: true }]],
      styles: [...lignes.map(() => "normal" as const), "sousTotal"],
    });
  }

  // Groupe unique : total juste après les prestations, avant les exclusions.
  const groupes = new Set(r.lignes.filter((l) => !(r.presentation === "PACKS" && !l.horsHonoraires)).map((l) => l.groupe));
  if (groupes.size <= 1 && r.presentation !== "PACKS") blocs.push({ t: "paragraphe", style: "gras", texte: `TOTAL DU DEVIS : ${totalTexte(r.lignes)}` });

  // 4. Exclusions / missions sur demande.
  const surDemande = r.lignes.filter((l) => l.groupe === "D_SUR_DEMANDE");
  const exclusions = e.exclusions.map((x) => x.trim()).filter(Boolean);
  if (exclusions.length || surDemande.length) {
    blocs.push({ t: "section", titre: `${n++}. EXCLUSIONS ET MISSIONS SUR DEMANDE` });
    if (exclusions.length) blocs.push({ t: "paragraphe", texte: "Ne sont pas compris dans le présent devis :" }, { t: "liste", items: exclusions });
    if (surDemande.length) blocs.push({ t: "paragraphe", texte: "Missions réalisables sur demande :" }, { t: "liste", items: surDemande.map((l) => `${l.libelle} (${INTERVENANT[l.intervenant].toLowerCase()}) : ${montant(l)}`) });
  }

  // 5. Récapitulatif (si plusieurs groupes).
  if (groupes.size > 1) {
    blocs.push({ t: "section", titre: `${n++}. RÉCAPITULATIF` });
    const lignes: Cellule[][] = [];
    const styles: StyleLigne[] = [];
    const ajoute = (txt: string, v: string, s: StyleLigne) => { lignes.push([{ texte: txt, gras: s !== "normal" }, { texte: v, gras: s !== "normal" }]); styles.push(s); };
    if (r.presentation !== "PACKS") ajoute(LIBELLES_GROUPES.A_HONORAIRES_OBLIGATOIRES, formatDH(r.sousTotaux.A_HONORAIRES_OBLIGATOIRES), "normal");
    else ajoute("A — Honoraires de l'architecte", "selon le pack retenu", "normal");
    ajoute(LIBELLES_GROUPES.B_TECHNIQUE_OBLIGATOIRE, totalTexte(r.lignes.filter((l) => l.groupe === "B_TECHNIQUE_OBLIGATOIRE")), "normal");
    ajoute(`TOTAL À ENGAGER OBLIGATOIREMENT (A + B)${r.presentation === "PACKS" ? " hors pack" : ""}${r.totalObligatoireIncomplet ? " — hors lignes « Sur devis »" : ""}`, formatDH(r.totalObligatoire), "total");
    if (!r.sousTotaux.C_FACULTATIF.estNul()) ajoute(LIBELLES_GROUPES.C_FACULTATIF, formatDH(r.sousTotaux.C_FACULTATIF), "normal");
    if (!r.sousTotaux.D_SUR_DEMANDE.estNul()) ajoute(LIBELLES_GROUPES.D_SUR_DEMANDE, formatDH(r.sousTotaux.D_SUR_DEMANDE), "normal");
    blocs.push({ t: "tableau", colonnes: [{ titre: "Groupe", largeur: 0.72 }, { titre: "Montant", largeur: 0.28, align: "droite" }], lignes, styles });
  }

  // 6. Modalités.
  blocs.push({ t: "section", titre: `${n++}. MODALITÉS` });
  blocs.push({ t: "paragraphe", texte: TEXTES_MODALITES[e.modalitesPaiement] });
  blocs.push({ t: "liste", items: MENTIONS_SYSTEMATIQUES.map((m) => m.replace("Devis valable 30 jours", `Devis valable ${e.validiteJours} jours`)) });

  blocs.push({
    t: "signatures",
    gauche: ["Le maître d'ouvrage", ctx.client.nomAffiche, "« Lu et approuvé », date et signature", ...(r.presentation === "PACKS" ? ["Pack retenu : cocher une seule case ci-dessus"] : [])],
    droite: [`Pour ${em.marque} — ${em.raisonSociale}`, ...(ctx.architecte ? [`Architecte du projet : ${ctx.architecte.nom}`] : [])],
  });
  blocs.push({ t: "bandeau", lignes: ctx.compteActif ? [BANDEAU_SUIVI[0], "Votre dossier est consultable à tout moment dans votre espace client : www.citurbarea.com/mon-espace"] : BANDEAU_SUIVI });

  return { version: 1, numero, brouillon, titre, blocs, piedDePage: `${em.marque} — Devis N° ${numero}` };
}

// ── Empreinte (§5.6) ─────────────────────────────────────────────────────

/** JSON canonique : clés triées, pour une empreinte stable. */
export function jsonCanonique(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonCanonique).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${jsonCanonique((v as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
}

export async function empreinteDocument(d: DocumentDevis): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(jsonCanonique(d)));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ligne imprimée en pied de page des deux formats. */
export const mentionEmpreinte = (empreinte: string | null) => (empreinte ? `Empreinte du contenu : ${empreinte.slice(0, 16)}` : "Brouillon — sans valeur contractuelle");
