/**
 * Bordereau des prix – détail estimatif (BPDE) aligné sur les postes du CPS :
 * chaque ligne du DQE est rattachée à son poste (correspondance.ts), avec
 * sous-postes « -a, -b… » quand plusieurs ouvrages partagent un poste (un PU
 * par ouvrage) et postes complémentaires « N.Cx » hors gabarit.
 */
import type { Resultat } from "../chiffrage/dqe";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { CORRESPONDANCE_CPS, LOTS_SANS_GABARIT } from "./correspondance";
import { LOT_CPS_PAR_CODE, fr } from "./gabarits";

export type PosteBPDE = {
  numero: string;
  designation: string;
  unite: string;
  modeMetre?: string;
  quantite: number;
  pu: number;
  montant: number;
  ouvrages: string[];
  complementaire: boolean;
  note?: string;
};
export type LotBPDE = { code: string; numero: number; intitule: string; sansGabarit: boolean; postes: PosteBPDE[]; total: number };

const UNITE: Record<string, string> = { m2: "m²", m3: "m³", "m²": "m²", "m³": "m³" };
export const uniteCps = (u: string) => UNITE[u] ?? u;
const lettre = (i: number) => String.fromCharCode(97 + i);
/** Arrondi au centime : le BPDE imprimé doit se recalculer exactement (quantité × PU = montant). */
const c2 = (n: number) => Math.round(n * 100) / 100;
/** Intitulé de lot sans préfixe « Lot n°NN — » (déjà numéroté dans le document). */
const intitule = (s: string) => s.replace(/^Lot\s*n°?\s*\d+\s*[—–-]\s*/i, "");

export function bordereau(r: Resultat): LotBPDE[] {
  // Regroupe les lignes par ouvrage (un ouvrage = un PU) puis par poste CPS.
  type Bloc = { ouvrage: string; qte: number; pu: number; montant: number };
  const parOuvrage = new Map<string, Bloc>();
  for (const l of r.lignes) {
    const b = parOuvrage.get(l.ouvrage) ?? { ouvrage: l.ouvrage, qte: 0, pu: l.pu, montant: 0 };
    b.qte += l.qte;
    b.montant += l.montant;
    parOuvrage.set(l.ouvrage, b);
  }
  // Fusions : le montant de l'ouvrage passe dans le poste de l'ouvrage principal (PU recalculé).
  for (const b of [...parOuvrage.values()]) {
    const cible = CORRESPONDANCE_CPS[b.ouvrage]?.fusionAvec;
    const principal = cible ? parOuvrage.get(cible) : undefined;
    if (!principal) continue;
    principal.montant += b.montant;
    principal.pu = principal.montant / (principal.qte || 1);
    parOuvrage.delete(b.ouvrage);
  }
  const lots = new Map<string, Map<string, Bloc[]>>();
  for (const b of parOuvrage.values()) {
    const c = CORRESPONDANCE_CPS[b.ouvrage];
    if (!c) throw new Error(`Ouvrage sans correspondance CPS : ${b.ouvrage}`);
    const cle = c.poste ?? `C:${b.ouvrage}`;
    const m = lots.get(c.lot) ?? new Map<string, Bloc[]>();
    m.set(cle, [...(m.get(cle) ?? []), b]);
    lots.set(c.lot, m);
  }

  const out: LotBPDE[] = [];
  // Lot 00 : installation de chantier au forfait.
  const g0 = LOT_CPS_PAR_CODE.LOT_00_GENERALITES;
  const p0 = g0.bordereau.find((p) => p.code === "00.01")!;
  out.push({
    code: g0.code, numero: 0, intitule: intitule(fr(g0.intitule)), sansGabarit: false, total: c2(r.installationHT),
    postes: [{ numero: "00.01", designation: fr(p0.designation), unite: "ff", modeMetre: fr(p0.modeMetreMD), quantite: 1, pu: c2(r.installationHT), montant: c2(r.installationHT), ouvrages: ["INS"], complementaire: false }],
  });

  for (const [code, postes] of lots) {
    const g = LOT_CPS_PAR_CODE[code];
    const sg = LOTS_SANS_GABARIT[code];
    const numero = g ? g.numero : sg.numero;
    const lignes: PosteBPDE[] = [];
    let nComp = 0;
    const cles = [...postes.keys()].sort((a, b) => (a.startsWith("C:") ? 1 : 0) - (b.startsWith("C:") ? 1 : 0) || a.localeCompare(b, "fr", { numeric: true }));
    for (const cle of cles) {
      const blocs = postes.get(cle)!;
      if (cle.startsWith("C:")) {
        const b = blocs[0];
        const o = OUVRAGES[b.ouvrage];
        nComp += 1;
        const qc = c2(b.qte), pc = c2(b.pu);
        lignes.push({ numero: `${numero}.C${nComp}`, designation: o.libelle, unite: uniteCps(o.unite), modeMetre: o.note, quantite: qc, pu: pc, montant: c2(qc * pc), ouvrages: [b.ouvrage], complementaire: true });
        continue;
      }
      const poste = g!.bordereau.find((p) => p.code === cle);
      if (!poste) throw new Error(`Poste CPS introuvable : ${code}#${cle}`);
      blocs.forEach((b, i) => {
        const c = CORRESPONDANCE_CPS[b.ouvrage];
        const f = c.facteur ?? 1;
        const sous = blocs.length > 1;
        lignes.push({
          numero: sous ? `${cle}-${lettre(i)}` : cle,
          // Sous-poste : intitulé court de l'article + ouvrage précis (le texte complet reste au mode de métré).
          designation: sous ? `${fr(poste.designation).split(/[,(]/)[0].trim()} — ${OUVRAGES[b.ouvrage].libelle}` : fr(poste.designation),
          unite: uniteCps(poste.unite),
          modeMetre: fr(poste.modeMetreMD),
          quantite: c2(b.qte * f),
          pu: c2(b.pu / f),
          montant: c2(c2(b.qte * f) * c2(b.pu / f)),
          ouvrages: [b.ouvrage],
          complementaire: false,
          note: c.note,
        });
      });
    }
    out.push({ code, numero, intitule: g ? intitule(fr(g.intitule)) : sg.intitule, sansGabarit: !g, postes: lignes, total: c2(lignes.reduce((s, p) => s + p.montant, 0)) });
  }
  return out.sort((a, b) => a.numero - b.numero);
}
