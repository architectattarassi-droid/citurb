/**
 * Planning d'achat d'un projet : à partir d'un DQE du moteur de chiffrage
 * (chiffrer()), les matériaux à acheter regroupés par phase de réalisation,
 * quantités converties en unités de vente, date limite de commande et
 * budget fournitures par phase. Fonctions pures (tests : phases.test.ts).
 */
import { CORRESPONDANCE_CIT } from "../chiffrage/correspondanceCIT";
import type { Resultat } from "../chiffrage/dqe";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { MATERIAUX, prixHT } from "../chiffrage/referentiel";
import { materiau } from "./catalogue";
import { quantiteACommander, unitesVente } from "./conversions";
import { PHASE_REAL, PHASES_REALISATION, delaiComposant, phaseComposant, type DelaiAppro, type PhaseReal } from "./phases";

export interface LigneAchat {
  /** Composant du chiffrage (referentiel.ts). */
  composant: string;
  libelle: string;
  /** Code CIT du catalogue (null : fourni-posé ou forfait sans équivalent catalogue). */
  code: string | null;
  /** Quantité dans l'unité du chiffrage, pertes comprises. */
  quantite: number;
  unite: string;
  /** Quantité à commander en unité de vente (arrondie au-dessus). */
  commande: { quantite: number; unite: string; uniteLibelle: string } | null;
  /** Fournitures HT au prix de référence du chiffrage, coefficient de la ville compris. */
  montantHT: number;
  ouvrages: string[];
  delai: DelaiAppro;
  /** Jours avant le démarrage de la phase où il faut passer commande (= délai). */
  commanderJMoins: number;
  /** Date limite de commande (AAAA-MM-JJ) si une date de démarrage du chantier est donnée. */
  dateLimite: string | null;
}

export interface PhaseAchat {
  phase: PhaseReal;
  /** Début indicatif de la phase, en semaines après le démarrage du chantier (hypothèse). */
  debutSemaine: number;
  dureeSemaines: number;
  debut: string | null;
  lignes: LigneAchat[];
  budgetHT: number;
}

export interface PlanningAchat { phases: PhaseAchat[]; totalHT: number; ville: string; coefMat: number }

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Déroule un ouvrage (sous-ouvrages compris) en quantités de composants, pertes comprises. */
function derouler(code: string, qte: number, out: Map<string, number>, vus = 0) {
  const o = OUVRAGES[code];
  if (!o || vus > 6) return;
  for (const c of o.composants) {
    if (c.type === "mat") out.set(c.ref, (out.get(c.ref) ?? 0) + qte * c.qte * (1 + (c.perte ?? 0)));
    else if (c.type === "ouv") derouler(c.ref, qte * c.qte, out, vus + 1);
  }
}

/**
 * Calendrier indicatif (semaines) : villa R+1 de référence, gros œuvre et
 * planchers allongés de 3 semaines par niveau supplémentaire, 4 par sous-sol
 * (hypothèse CITURBAREA, à valider par l'architecte avec le planning de l'entreprise).
 */
export function calendrier(niveaux: number, sousSol: boolean): Record<PhaseReal, { debut: number; duree: number }> {
  // niveaux = RDC compris (R+1 → 2). Le sous-sol décale tout ce qui suit les fondations.
  const extraNiveaux = 3 * Math.max(0, niveaux - 2) - (niveaux < 2 ? 2 : 0);
  const extraSousSol = sousSol ? 4 : 0;
  const out = {} as Record<PhaseReal, { debut: number; duree: number }>;
  for (const p of PHASES_REALISATION) {
    const allonge = p.id === "GROS_OEUVRE" || p.id === "PLANCHERS";
    const decalage = (p.debut >= 6 ? extraSousSol : 0) + (p.debut >= 12 ? extraNiveaux : 0);
    out[p.id] = { debut: p.debut + decalage, duree: Math.max(1, p.duree + (allonge ? extraNiveaux : 0)) };
  }
  return out;
}

const ajouterJours = (iso: string, j: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + j);
  return d.toISOString().slice(0, 10);
};

export function planningAchat(r: Resultat, demarrage?: string | null): PlanningAchat {
  const valide = demarrage && /^\d{4}-\d{2}-\d{2}$/.test(demarrage) ? demarrage : null;
  const cal = calendrier(r.input.niveaux ?? 1, !!r.input.sousSol);
  // phase → composant → { quantité, ouvrages }
  const parPhase = new Map<PhaseReal, Map<string, { q: number; ouvrages: Set<string> }>>();
  for (const l of r.lignes) {
    const q = new Map<string, number>();
    derouler(l.ouvrage, l.qte, q);
    for (const [id, v] of q) {
      if (!(v > 0)) continue;
      const ph = phaseComposant(id, l.ouvrage, l.tags);
      const m = parPhase.get(ph) || new Map();
      const x = m.get(id) || { q: 0, ouvrages: new Set<string>() };
      x.q += v;
      x.ouvrages.add(l.ouvrage);
      m.set(id, x);
      parPhase.set(ph, m);
    }
  }
  const coef = r.region.mat || 1;
  const phases: PhaseAchat[] = [];
  for (const def of PHASES_REALISATION) {
    const m = parPhase.get(def.id);
    if (!m) continue;
    const { debut, duree } = cal[def.id];
    const debutIso = valide ? ajouterJours(valide, debut * 7) : null;
    const lignes: LigneAchat[] = [...m].map(([id, x]) => {
      const p = MATERIAUX[id];
      const corr = CORRESPONDANCE_CIT[id];
      const ref = corr ? materiau(corr.cit) : undefined;
      let commande: LigneAchat["commande"] = null;
      if (ref && corr) {
        const quantiteRef = x.q * corr.facteur;
        const u = ref.ventes[0] || unitesVente(ref)[0];
        const n = quantiteACommander(ref.code, u.code, quantiteRef);
        commande = n === null ? null : { quantite: n, unite: u.code, uniteLibelle: u.code === ref.uniteRef ? ref.uniteRef : u.libelle };
      }
      const delai = delaiComposant(id);
      return {
        composant: id, libelle: p?.libelle || id, code: corr?.cit ?? null, quantite: r2(x.q), unite: p?.unite || "",
        commande: commande ?? { quantite: Math.ceil(r2(x.q)), unite: p?.unite || "u", uniteLibelle: p?.unite || "u" },
        montantHT: Math.round((p ? prixHT(p) : 0) * coef * x.q), ouvrages: [...x.ouvrages], delai, commanderJMoins: delai.jours,
        dateLimite: debutIso ? ajouterJours(debutIso, -delai.jours) : null,
      };
    }).sort((a, b) => b.montantHT - a.montantHT);
    phases.push({ phase: def.id, debutSemaine: debut, dureeSemaines: duree, debut: debutIso, lignes, budgetHT: lignes.reduce((s, l) => s + l.montantHT, 0) });
  }
  phases.sort((a, b) => a.debutSemaine - b.debutSemaine || PHASES_REALISATION.findIndex((p) => p.id === a.phase) - PHASES_REALISATION.findIndex((p) => p.id === b.phase));
  return { phases, totalHT: phases.reduce((s, p) => s + p.budgetHT, 0), ville: r.region.ville, coefMat: coef };
}

export const libellePhase = (id: PhaseReal, lang: "fr" | "ar" | "en") => PHASE_REAL[id].libelle[lang];
