/**
 * Référentiel des jalons : fusion des fichiers data/*.json (un par domaine),
 * contrôle d'intégrité et sélection des jalons applicables à un projet.
 */
import type { Conditions, Exigence, FichierReferentiel, Jalon, ModeleDocument, Norme } from "./types";

export * from "./types";

const fichiers = import.meta.glob<FichierReferentiel>("./data/*.json", { eager: true, import: "default" });

export interface Referentiel {
  normes: Map<string, Norme>;
  exigences: Map<string, Exigence>;
  modeles: Map<string, ModeleDocument>;
  jalons: Jalon[];
}

/** Fusionne des fichiers ; les doublons d'identifiant sont signalés par `problemes`. */
export function fusionner(liste: FichierReferentiel[]): Referentiel & { problemes: string[] } {
  const problemes: string[] = [];
  const normes = new Map<string, Norme>();
  const exigences = new Map<string, Exigence>();
  const modeles = new Map<string, ModeleDocument>();
  const jalons: Jalon[] = [];
  const codes = new Set<string>();
  const ajouter = <T extends { id: string }>(m: Map<string, T>, x: T, quoi: string, f: string) => {
    if (m.has(x.id)) problemes.push(`${f} : ${quoi} en double « ${x.id} »`);
    else m.set(x.id, x);
  };
  for (const f of liste) {
    for (const n of f.normes ?? []) ajouter(normes, n, "norme", f.domaine);
    for (const e of f.exigences ?? []) ajouter(exigences, e, "exigence", f.domaine);
    for (const d of f.modeles ?? []) ajouter(modeles, d, "modèle", f.domaine);
    for (const j of f.jalons ?? []) {
      if (codes.has(j.code)) problemes.push(`${f.domaine} : jalon en double « ${j.code} »`);
      codes.add(j.code);
      jalons.push(j);
    }
  }
  return { normes, exigences, modeles, jalons, problemes };
}

/** Contrôle d'intégrité : toute référence pointe vers un objet existant. */
export function controler(r: Referentiel): string[] {
  const p: string[] = [];
  const codes = new Set(r.jalons.map((j) => j.code));
  for (const e of r.exigences.values()) {
    if (!e.texte?.trim()) p.push(`exigence ${e.id} : texte vide`);
    for (const n of e.normes) if (!r.normes.has(n)) p.push(`exigence ${e.id} : norme inconnue « ${n} »`);
  }
  for (const n of r.normes.values()) {
    if (n.remplacePar && !r.normes.has(n.remplacePar)) p.push(`norme ${n.id} : remplacePar inconnu « ${n.remplacePar} »`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.majLe || "")) p.push(`norme ${n.id} : majLe invalide`);
  }
  for (const j of r.jalons) {
    if (!/^(\d{2}[A-Z]?_[A-Z0-9_]+|LOT_[A-Z0-9_]+)$/.test(j.phase)) p.push(`jalon ${j.code} : phase invalide « ${j.phase} »`);
    if (!j.code.startsWith(`${j.phase}.`)) p.push(`jalon ${j.code} : le code doit commencer par la phase`);
    for (const x of j.exigences) if (!r.exigences.has(x)) p.push(`jalon ${j.code} : exigence inconnue « ${x} »`);
    for (const d of j.documents) if (!r.modeles.has(d)) p.push(`jalon ${j.code} : modèle inconnu « ${d} »`);
    for (const pr of j.prerequis ?? []) if (!codes.has(pr)) p.push(`jalon ${j.code} : prérequis inconnu « ${pr} »`);
    for (const c of j.checklist) if (c.exigence && !r.exigences.has(c.exigence)) p.push(`jalon ${j.code} : point ${c.id} → exigence inconnue « ${c.exigence} »`);
    if (!j.checklist.length) p.push(`jalon ${j.code} : checklist vide`);
  }
  return p;
}

let cache: Referentiel | null = null;

/** Référentiel complet (données du dépôt). */
export function referentiel(): Referentiel {
  if (!cache) {
    const { problemes: _p, ...r } = fusionner(Object.values(fichiers));
    cache = r;
  }
  return cache;
}

export interface Projet {
  type: NonNullable<Conditions["types"]>[number];
  zoneSismique?: number;
  sousSol?: boolean;
  hauteurM?: number;
  erp?: boolean;
  ascenseur?: boolean;
  piscine?: boolean;
}

/** Une condition est-elle remplie par le projet ? (absente = toujours) */
export function applicable(c: Conditions | undefined, p: Projet): boolean {
  if (!c) return true;
  if (c.types && !c.types.includes(p.type)) return false;
  if (c.zoneSismiqueMin != null && (p.zoneSismique ?? 0) < c.zoneSismiqueMin) return false;
  if (c.sousSol != null && !!p.sousSol !== c.sousSol) return false;
  if (c.hauteurMinM != null && (p.hauteurM ?? 0) < c.hauteurMinM) return false;
  if (c.erp != null && !!p.erp !== c.erp) return false;
  if (c.ascenseur != null && !!p.ascenseur !== c.ascenseur) return false;
  if (c.piscine != null && !!p.piscine !== c.piscine) return false;
  return true;
}

/** Jalons du projet, triés par phase puis ordre, avec leurs exigences applicables. */
export function jalonsDuProjet(p: Projet, r: Referentiel = referentiel()) {
  return r.jalons
    .filter((j) => applicable(j.conditions, p))
    .sort((a, b) => a.phase.localeCompare(b.phase, "fr", { numeric: true }) || a.ordre - b.ordre)
    .map((j) => ({
      ...j,
      exigencesDetail: j.exigences.map((id) => r.exigences.get(id)!).filter((e) => e && applicable(e.conditions, p)),
      normesDetail: [...new Set(j.exigences.flatMap((id) => r.exigences.get(id)?.normes ?? []))].map((id) => r.normes.get(id)!).filter(Boolean),
      modelesDetail: j.documents.map((id) => r.modeles.get(id)!).filter(Boolean),
    }));
}
