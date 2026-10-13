/**
 * « Ce matériau sert à… » : ouvrages du moteur de chiffrage qui consomment un
 * matériau du catalogue (directement ou via un sous-ouvrage : béton, acier,
 * coffrage, mortier). Index inverse calculé une fois sur OUVRAGES.
 */
import { LOT_PAR_CODE } from "../chiffrage/lots";
import { OUVRAGES } from "../chiffrage/ouvrages";
import { materiau } from "./catalogue";
import { COMPOSANTS_PAR_CIT } from "./reference";

export interface Usage { code: string; libelle: string; unite: string; lot: string }

function matieres(code: string, vus = new Set<string>()): Set<string> {
  const o = OUVRAGES[code];
  const out = new Set<string>();
  if (!o || vus.has(code)) return out;
  vus.add(code);
  for (const c of o.composants) {
    if (c.type === "mat") out.add(c.ref);
    else if (c.type === "ouv") for (const m of matieres(c.ref, vus)) out.add(m);
  }
  return out;
}

const PAR_COMPOSANT = new Map<string, Usage[]>();
for (const o of Object.values(OUVRAGES)) {
  if (o.interne) continue;
  for (const m of matieres(o.code)) {
    const l = PAR_COMPOSANT.get(m) || [];
    l.push({ code: o.code, libelle: o.libelle, unite: o.unite, lot: LOT_PAR_CODE[o.lot]?.libelle || o.lot });
    PAR_COMPOSANT.set(m, l);
  }
}

/** Ouvrages qui utilisent le matériau (ou son matériau générique `parent`). */
export function usagesMateriau(code: string): Usage[] {
  const r = materiau(code);
  const codes = [code, ...(r?.parent ? [r.parent] : [])];
  const vus = new Set<string>();
  const out: Usage[] = [];
  for (const c of codes)
    for (const comp of COMPOSANTS_PAR_CIT[c] || [])
      for (const u of PAR_COMPOSANT.get(comp.id) || []) if (!vus.has(u.code)) { vus.add(u.code); out.push(u); }
  return out;
}
