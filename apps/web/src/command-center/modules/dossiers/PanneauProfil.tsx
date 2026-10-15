/**
 * Profil du projet (lot GP1) — fiche /cc/dossiers/:id.
 * Budget, niveaux, surface et équipements : ils décident des étapes et des
 * documents qui s'appliquent (bureau de contrôle au-delà de 5 MDH, TRC et
 * décennale au-delà de 3 étages ou 800 m², ascenseur, piscine…).
 * Enregistré dans le payload du dossier (action « profil ») : aucune table nouvelle.
 */
import React, { useEffect, useState } from "react";
import { CC } from "../../theme/tokens";

export type Profil = {
  type: string | null; budgetMDH?: number | null; etagesHorsSol?: number | null; sousSols?: number | null; surfacePlancherM2?: number | null;
  [k: string]: unknown;
};

const TYPES: [string, string][] = [
  ["VILLA", "Villa / maison individuelle"], ["IMMEUBLE", "Immeuble"], ["EQUIPEMENT", "Équipement (ERP, commerce, bureaux)"],
  ["LOTISSEMENT", "Lotissement"], ["RENOVATION_EXTENSION", "Rénovation, extension, surélévation"],
];
const CASES: [string, string][] = [
  ["ascenseur", "Ascenseur"], ["piscine", "Piscine"], ["erp", "Reçoit du public (ERP)"], ["climatisation", "Climatisation"], ["gaz", "Gaz"],
  ["solaire", "Solaire"], ["demolition", "Construction à démolir"], ["mitoyennete", "Mitoyenneté"], ["credit", "Crédit bancaire"],
  ["copropriete", "Copropriété"], ["lotissementAutorise", "Lot dans un lotissement autorisé"], ["terrainNonImmatricule", "Terrain non immatriculé"], ["indivision", "Indivision"],
];

export default function PanneauProfil({ profil, ordre, occupe, agir }: {
  profil: Profil; ordre: { conseil: string; antenne?: string; aVerifier: boolean; via: string; libelle: string } | null; occupe: boolean;
  agir: (c: Record<string, unknown>, m: string) => Promise<void>;
}) {
  const [p, setP] = useState<Profil>(profil);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => setP(profil), [profil]);
  const num = (k: string) => (p[k] == null ? "" : String(p[k]));
  const setNum = (k: string, v: string) => setP({ ...p, [k]: v === "" ? null : Number(v.replace(",", ".")) });
  const ctc = p.budgetMDH == null ? "budget à renseigner" : Number(p.budgetMDH) > 5 ? "obligatoire (budget > 5 MDH)" : "non obligatoire (budget ≤ 5 MDH), recommandé";
  const assur = (p.etagesHorsSol ?? 0) > 3 || (p.surfacePlancherM2 ?? 0) > 800 || p.type === "EQUIPEMENT";

  return (
    <section style={S.carte}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <h2 style={S.h2}>Profil du projet</h2>
        <button style={S.lienBtn} onClick={() => setOuvert(!ouvert)}>{ouvert ? "Fermer" : "Modifier"}</button>
      </div>
      <p style={S.petit}>
        {TYPES.find(([k]) => k === p.type)?.[1] ?? "Type à préciser"}
        {p.budgetMDH != null ? ` · budget ${p.budgetMDH} MDH` : " · budget non renseigné"}
        {p.etagesHorsSol != null ? ` · R+${p.etagesHorsSol}` : ""}{p.sousSols ? ` · ${p.sousSols} sous-sol(s)` : ""}
        {p.surfacePlancherM2 != null ? ` · ${p.surfacePlancherM2} m² de plancher` : ""}
      </p>
      <p style={S.petit}>
        <b>Bureau de contrôle</b> : {ctc}. <b>TRC et décennale</b> : {assur ? "obligatoires (plus de 3 étages ou 800 m²)" : "non obligatoires d'après le profil, recommandées"}.
      </p>
      <p style={S.petit}>
        <b>Visa</b> : {ordre ? ordre.libelle : "conseil régional de l'Ordre à déterminer (commune ou préfecture inconnue de la table)"}
        {ordre ? ` (trouvé par « ${ordre.via} »)` : ""}
      </p>
      {ouvert && (
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <div style={S.ligne}>
            <label style={S.champ}>Type
              <select style={S.input} value={p.type ?? ""} onChange={(e) => setP({ ...p, type: e.target.value || null })}>
                <option value="">—</option>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label style={S.champ}>Budget de travaux (MDH)<input style={S.input} inputMode="decimal" value={num("budgetMDH")} onChange={(e) => setNum("budgetMDH", e.target.value)} /></label>
            <label style={S.champ}>Étages hors sol (R+…)<input style={S.input} inputMode="numeric" value={num("etagesHorsSol")} onChange={(e) => setNum("etagesHorsSol", e.target.value)} /></label>
            <label style={S.champ}>Sous-sols<input style={S.input} inputMode="numeric" value={num("sousSols")} onChange={(e) => setNum("sousSols", e.target.value)} /></label>
            <label style={S.champ}>Surface de plancher (m²)<input style={S.input} inputMode="numeric" value={num("surfacePlancherM2")} onChange={(e) => setNum("surfacePlancherM2", e.target.value)} /></label>
          </div>
          <div style={S.ligne}>
            {CASES.map(([k, l]) => (
              <label key={k} style={{ ...S.petit, display: "flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" checked={p[k] === true} onChange={(e) => setP({ ...p, [k]: e.target.checked })} /> {l}
              </label>
            ))}
          </div>
          <div><button style={S.btn} disabled={occupe} onClick={() => void agir({ action: "profil", profil: p }, "Profil du projet enregistré.")}>Enregistrer le profil</button></div>
        </div>
      )}
    </section>
  );
}

const S = {
  carte: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: 14, margin: "12px 0" } as React.CSSProperties,
  h2: { fontSize: 15, color: CC.color.navy, margin: "0 0 6px" } as React.CSSProperties,
  petit: { fontSize: 12.5, color: CC.color.inkMid, lineHeight: 1.6, margin: "2px 0" } as React.CSSProperties,
  lienBtn: { background: "none", border: "none", color: CC.color.info, cursor: "pointer", fontSize: 12.5, textDecoration: "underline" } as React.CSSProperties,
  ligne: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" } as React.CSSProperties,
  champ: { display: "grid", gap: 3, fontSize: 12.5, color: CC.color.inkMid } as React.CSSProperties,
  input: { padding: "7px 9px", borderRadius: 6, border: `1px solid ${CC.color.border}`, fontSize: 13, background: "#fff", minHeight: 34, minWidth: 120 } as React.CSSProperties,
  btn: { padding: "8px 14px", borderRadius: 6, border: `1px solid ${CC.color.navy}`, background: CC.color.navy, color: "#fff", cursor: "pointer", fontSize: 13, minHeight: 36 } as React.CSSProperties,
};
