/**
 * Échéances d'un dossier et rappels J−90 / J−30 / J−7 (lot GP4).
 *
 *   - péremption du permis : si les fondations n'ont pas commencé dans l'année qui suit
 *     la délivrance, l'autorisation est périmée (loi 12-90, art. 49) ;
 *   - expiration de l'autorisation saisie (colonne du dossier, spec Devis §8.4) ;
 *   - fin des assurances (TRC, décennale, autres polices saisies) et des cautions ;
 *   - garantie de parfait achèvement : réception provisoire + 12 mois (réception définitive) ;
 *   - garantie décennale : réception + 10 ans.
 * Calcul pur à partir des dates du dossier (colonnes + payload.gestion.dates) :
 * aucune table nouvelle. Les rappels déjà envoyés sont notés dans payload.gestion.rappels.
 */

export const SEUILS_RAPPEL = [90, 30, 7] as const;
export type Seuil = (typeof SEUILS_RAPPEL)[number];
export type Niveau = "DEPASSEE" | "J7" | "J30" | "J90" | null;

export interface DatesGestion {
  /** Date réelle de début des fondations (lève la péremption du permis). */
  debutFondations?: string | null;
  ouvertureChantier?: string | null;
  receptionProvisoire?: string | null;
  receptionDefinitive?: string | null;
  /** Polices d'assurance (TRC, décennale, RC…) et cautions, avec leur date de fin. */
  assurances?: Array<{ libelle: string; fin: string }>;
  cautions?: Array<{ libelle: string; fin: string }>;
  /** Autres échéances libres saisies par l'admin. */
  autres?: Array<{ libelle: string; date: string }>;
}

export interface Echeance {
  cle: string;
  type: "PEREMPTION_PERMIS" | "EXPIRATION_AUTORISATION" | "ASSURANCE" | "CAUTION" | "PARFAIT_ACHEVEMENT" | "DECENNALE" | "AUTRE";
  libelle: string;
  libelleAr: string;
  date: string;
  joursRestants: number;
  niveau: Niveau;
  /** Ce qu'il faut faire, en une phrase simple. */
  action: string;
  base: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const valide = (s: unknown): s is string => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export function ajouter(date: string, o: { mois?: number; ans?: number }): string {
  const d = new Date(`${date}T00:00:00Z`);
  const jour = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCFullYear(d.getUTCFullYear() + (o.ans ?? 0));
  d.setUTCMonth(d.getUTCMonth() + (o.mois ?? 0));
  const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(jour, fin));
  return d.toISOString().slice(0, 10);
}
export const joursEntre = (de: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
export function niveau(j: number): Niveau {
  return j < 0 ? "DEPASSEE" : j <= 7 ? "J7" : j <= 30 ? "J30" : j <= 90 ? "J90" : null;
}

const texte = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
/** Lit et borne les dates saisies (formulaire admin). */
export function validerDates(v: unknown): DatesGestion {
  const o = (v && typeof v === "object" && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
  const out: DatesGestion = {};
  for (const k of ["debutFondations", "ouvertureChantier", "receptionProvisoire", "receptionDefinitive"] as const) if (valide(o[k])) out[k] = o[k] as string;
  const liste = (x: unknown, champ: "fin" | "date") => (Array.isArray(x) ? x : []).slice(0, 20)
    .map((e) => (e && typeof e === "object" ? e as Record<string, unknown> : {}))
    .filter((e) => texte(e.libelle, 120) && valide(e[champ]))
    .map((e) => ({ libelle: texte(e.libelle, 120), [champ]: e[champ] as string }));
  const a = liste(o.assurances, "fin"), c = liste(o.cautions, "fin"), x = liste(o.autres, "date");
  if (a.length) out.assurances = a as DatesGestion["assurances"];
  if (c.length) out.cautions = c as DatesGestion["cautions"];
  if (x.length) out.autres = x as DatesGestion["autres"];
  return out;
}

export interface FaitsDossier {
  autorisationDate?: string | null;
  autorisationExpiration?: string | null;
  dates: DatesGestion;
  /** Les fondations ont-elles commencé (étape du dossier ou jalon de l'espace projet) ? */
  fondationsCommencees: boolean;
}

/** Échéances du dossier, triées de la plus proche à la plus lointaine. */
export function echeancesDuDossier(f: FaitsDossier, aujourdhui: string): Echeance[] {
  const out: Echeance[] = [];
  const ajout = (e: Omit<Echeance, "joursRestants" | "niveau">) => {
    const j = joursEntre(aujourdhui, e.date);
    out.push({ ...e, joursRestants: j, niveau: niveau(j) });
  };
  const d = f.dates;
  if (valide(f.autorisationDate) && !f.fondationsCommencees && !valide(d.debutFondations)) {
    ajout({
      cle: "PEREMPTION_PERMIS", type: "PEREMPTION_PERMIS", date: ajouter(f.autorisationDate, { ans: 1 }),
      libelle: "Péremption du permis si les fondations ne commencent pas", libelleAr: "سقوط رخصة البناء إذا لم تنطلق الأساسات",
      action: "Commencer les fondations avant cette date, sinon le permis est périmé (loi 12-90, art. 49).", base: "Loi 12-90, art. 49",
    });
  }
  if (valide(f.autorisationExpiration)) {
    ajout({
      cle: "EXPIRATION_AUTORISATION", type: "EXPIRATION_AUTORISATION", date: f.autorisationExpiration,
      libelle: "Expiration de l'autorisation", libelleAr: "انتهاء صلاحية الرخصة",
      action: "Proposer au client le renouvellement de l'autorisation.", base: "Dossier (date saisie)",
    });
  }
  (d.assurances ?? []).forEach((a, i) => ajout({
    cle: `ASSURANCE_${i}`, type: "ASSURANCE", date: a.fin, libelle: `Fin de l'assurance : ${a.libelle}`, libelleAr: `نهاية التأمين: ${a.libelle}`,
    action: "Demander l'attestation de renouvellement avant la fin.", base: "Police saisie",
  }));
  (d.cautions ?? []).forEach((c, i) => ajout({
    cle: `CAUTION_${i}`, type: "CAUTION", date: c.fin, libelle: `Fin de la caution : ${c.libelle}`, libelleAr: `نهاية الكفالة: ${c.libelle}`,
    action: "Vérifier s'il faut prolonger la caution ou en donner mainlevée.", base: "Caution saisie",
  }));
  if (valide(d.receptionProvisoire)) {
    if (!valide(d.receptionDefinitive)) ajout({
      cle: "PARFAIT_ACHEVEMENT", type: "PARFAIT_ACHEVEMENT", date: ajouter(d.receptionProvisoire, { mois: 12 }),
      libelle: "Fin de la garantie de parfait achèvement (réception définitive)", libelleAr: "نهاية ضمان الإتمام الكامل (التسليم النهائي)",
      action: "Organiser la visite de réception définitive et faire lever les dernières réserves.", base: "Marché : réception provisoire + 12 mois",
    });
    ajout({
      cle: "DECENNALE", type: "DECENNALE", date: ajouter(d.receptionProvisoire, { ans: 10 }),
      libelle: "Fin de la garantie décennale", libelleAr: "نهاية الضمان العشري",
      action: "Faire un dernier tour des désordres éventuels avec le client avant la fin de la garantie.", base: "DOC art. 769 (réception + 10 ans)",
    });
  }
  (d.autres ?? []).forEach((x, i) => ajout({ cle: `AUTRE_${i}`, type: "AUTRE", date: x.date, libelle: x.libelle, libelleAr: x.libelle, action: "Échéance saisie par l'administration.", base: "Saisie" }));
  return out.sort((a, b) => a.joursRestants - b.joursRestants);
}

/**
 * Rappels à envoyer maintenant : pour chaque échéance à J−90, J−30 ou J−7 (ou dépassée),
 * le seuil le plus urgent atteint et pas encore envoyé. Un seul e-mail par seuil.
 */
export function rappelsDus(echeances: Echeance[], envoyes: Record<string, number[]>): Array<{ echeance: Echeance; seuil: Seuil }> {
  const out: Array<{ echeance: Echeance; seuil: Seuil }> = [];
  for (const e of echeances) {
    if (e.joursRestants > 90 || e.joursRestants < -30) continue;
    const atteint = [...SEUILS_RAPPEL].sort((a, b) => a - b).find((s) => e.joursRestants <= s);
    if (!atteint) continue;
    const deja = envoyes[`${e.cle}|${e.date}`] ?? [];
    if (deja.some((s) => s <= atteint)) continue;
    out.push({ echeance: e, seuil: atteint });
  }
  return out;
}
