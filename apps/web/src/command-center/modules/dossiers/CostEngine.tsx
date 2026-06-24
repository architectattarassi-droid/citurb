/**
 * CostEngine — moteur de coût UNIFIÉ P1/P2 (source de vérité = back).
 *
 * Utilisé À L'IDENTIQUE par :
 *   - le simulateur (/cc/simulateur)  → sans onApply (consultation)
 *   - l'éditeur de devis              → avec onApply (remplit les lignes)
 *
 * Inputs complets :
 *   - P1 : surface (directe OU auto = emprise RDC × niveaux + sous-sol),
 *          niveau de construction (Économique→Luxe), pack, BET, MOD, Déco,
 *          suivi à distance, mandat entreprise → POST /p1/packs/quote.
 *   - P2 : section, catégorie (barème CNOA), surface, nb bâtiments,
 *          surface terrain (LOT), mode de suivi → POST /p2/quote.
 */

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import { CC } from "../../theme/tokens";
import SurfaceHelper from "./SurfaceHelper";

export type CalcLigne = { designation: string; quantite: number; unite: string; prixUnitaire: number };

const fmtMAD = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("fr-MA") : "0") + " DH";

const NIVEAUX = [
  { v: "ECONOMIQUE", l: "Économique (basique)" },
  { v: "STANDING", l: "Standing" },
  { v: "HAUT_STANDING", l: "Haut standing" },
  { v: "PREMIUM", l: "Premium" },
  { v: "BLACK", l: "Luxe (budget libre)" },
];
const PACKS = [
  { v: "ESSENTIEL", l: "Essentiel" },
  { v: "AVANCE", l: "Avancé" },
  { v: "COMPLET", l: "Complet" },
];
const SECTIONS = [
  { v: "IMM", l: "Immeuble (unité)" },
  { v: "GR", l: "Groupement résidentiel" },
  { v: "EPIG", l: "Équipement (EPIG)" },
  { v: "AMG", l: "Aménagement" },
  { v: "LOT", l: "Lotissement (devis personnalisé)" },
];

export default function CostEngine({ onApply }: { onApply?: (lignes: CalcLigne[], info: { titre?: string; tva?: number; porte?: "P1" | "P2" }) => void }) {
  const [porte, setPorte] = useState<"P1" | "P2">("P2");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ lignes: CalcLigne[]; titre: string; sousTexte: string; detail: { l: string; v: number }[] } | null>(null);

  const [p1, setP1] = useState({ surfaceM2: 300, hasBasement: false, constructionLevel: "STANDING", pack: "AVANCE", betMode: "PLATFORM", addRemoteFollow: false, modEnabled: false, decoEnabled: false, mandateEntreprise: false, blackBudgetMAD: 0 });
  const [p2, setP2] = useState({ section: "IMM", categoryCode: "", surfacePlancherM2: 300, nbBatiments: 1, surfaceTerrainHa: 0, followMode: "ON_SITE" });
  const [cats, setCats] = useState<{ code: string; label: string }[]>([]);

  useEffect(() => {
    if (porte !== "P2" || p2.section === "LOT") { setCats([]); return; }
    apiFetch<{ ok: boolean; items: { code: string; label: string }[] }>(`/p2/categories?section=${p2.section}`)
      .then((r) => { const items = r?.items ?? []; setCats(items); setP2((s) => ({ ...s, categoryCode: items[0]?.code ?? "" })); })
      .catch(() => setCats([]));
  }, [porte, p2.section]);

  const calcP1 = async () => {
    const body: any = { ...p1, blackBudgetMAD: p1.constructionLevel === "BLACK" && p1.blackBudgetMAD > 0 ? p1.blackBudgetMAD : null };
    const r: any = await apiFetch(`/p1/packs/quote`, { method: "POST", body: { input: body } });
    const a = r?.amounts; if (!a) throw new Error("Calcul P1 indisponible");
    const detail = [
      { l: "Pack conception", v: a.packMAD },
      { l: "Suivi à distance", v: a.remoteFollowMAD },
      { l: "BET (études techniques)", v: a.betMAD },
      { l: "MOD", v: a.modMAD },
      { l: "Décoration", v: a.decoMAD },
    ].filter((d) => d.v > 0);
    const niv = NIVEAUX.find((n) => n.v === p1.constructionLevel)?.l ?? p1.constructionLevel;
    const packL = PACKS.find((x) => x.v === p1.pack)?.l ?? p1.pack;
    const lignes: CalcLigne[] = [];
    const add = (designation: string, prixUnitaire: number) => { if (prixUnitaire > 0) lignes.push({ designation, quantite: 1, unite: "Forfait", prixUnitaire }); };
    add(`Pack ${packL} — conception architecturale\n${p1.surfaceM2} m² · niveau ${niv}`, a.packMAD);
    add("Suivi de chantier à distance", a.remoteFollowMAD);
    add("BET — études techniques (structure/fluides)", a.betMAD);
    add("MOD — maîtrise d'ouvrage déléguée", a.modMAD);
    add("Décoration / aménagement intérieur", a.decoMAD);
    if (lignes.length === 0) throw new Error("Aucun montant calculé (vérifie les options).");
    return { lignes, titre: `Honoraires P1 — Pack ${packL}`, sousTexte: `Total ${fmtMAD(a.totalMAD)} HT`, detail };
  };

  const calcP2 = async () => {
    if (p2.section === "LOT") throw new Error("Lotissement : grille en cours — devis personnalisé (saisie manuelle).");
    if (!p2.categoryCode) throw new Error("Choisis une catégorie.");
    const r: any = await apiFetch(`/p2/quote`, { method: "POST", body: { section: p2.section, categoryCode: p2.categoryCode, surfacePlancherM2: Number(p2.surfacePlancherM2), nbBatiments: Number(p2.nbBatiments), followMode: p2.followMode } });
    if (r?.ok === false) throw new Error(r?.error || "Calcul P2 refusé");
    const h = r?.honoraires; if (!h || h.totalHT == null) throw new Error("Calcul P2 indisponible");
    const bd = h.breakdown;
    const catLabel = r?.meta?.categoryLabel ?? p2.categoryCode;
    const coutTravaux = r?.base?.coutTravauxEstime;
    const coutM2 = r?.base?.coutConstructionM2;
    const ctx = `${catLabel} · ${p2.surfacePlancherM2} m²${coutTravaux ? ` · coût travaux ${fmtMAD(coutTravaux)}` : ""}`;
    const detail = [
      { l: "Esquisse + Autorisation (40%)", v: bd.phaseA_esquisseAutorisation },
      { l: "DCE + CPS (30%)", v: bd.phaseB_dceCps },
      { l: `Suivi ${p2.followMode === "PHOTOS" ? "photos (10%)" : "site (30%)"}`, v: bd.phaseC_suivi },
    ].filter((d) => Number(d.v) > 0);
    const lignes: CalcLigne[] = [
      { designation: `Honoraires architecte — Esquisse + Autorisation (40%)\n${ctx}`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseA_esquisseAutorisation },
      { designation: `Honoraires architecte — DCE + CPS (30%)`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseB_dceCps },
      { designation: `Honoraires architecte — Suivi ${p2.followMode === "PHOTOS" ? "par photos (10%)" : "sur site (30%)"}`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseC_suivi },
    ].filter((l) => Number(l.prixUnitaire) > 0);
    return { lignes, titre: `Honoraires CNOA — ${catLabel}`, sousTexte: `5% · coût/m² ${fmtMAD(coutM2 || 0)} · total ${fmtMAD(h.totalHT)} HT`, detail };
  };

  const compute = async () => {
    setErr(null); setBusy(true); setPreview(null);
    try { setPreview(porte === "P1" ? await calcP1() : await calcP2()); }
    catch (e: any) { setErr(e?.message || "Calcul impossible"); }
    finally { setBusy(false); }
  };

  return (
    <div style={S.box}>
      <div style={S.eyebrow}>Moteur de coût — réalisation + prestation</div>

      <div style={S.porteRow}>
        {(["P2", "P1"] as const).map((p) => (
          <button key={p} onClick={() => { setPorte(p); setPreview(null); setErr(null); }} style={{ ...S.porteBtn, ...(porte === p ? S.porteBtnActive : {}) }}>
            {p === "P1" ? "Porte 1 — Particulier (packs)" : "Porte 2 — Promoteur (barème CNOA)"}
          </button>
        ))}
      </div>

      {porte === "P1" ? (
        <div style={S.grid}>
          <SurfaceHelper value={p1.surfaceM2} onChange={(m2, hb) => setP1((s) => ({ ...s, surfaceM2: m2, hasBasement: hb || s.hasBasement }))} />
          <F l="Niveau de construction"><select style={S.in} value={p1.constructionLevel} onChange={(e) => setP1({ ...p1, constructionLevel: e.target.value })}>{NIVEAUX.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          {p1.constructionLevel === "BLACK" && <F l="Budget travaux cible (MAD)"><input type="number" min="0" style={S.in} value={p1.blackBudgetMAD} onChange={(e) => setP1({ ...p1, blackBudgetMAD: Number(e.target.value) })} /></F>}
          <F l="Pack"><select style={S.in} value={p1.pack} onChange={(e) => setP1({ ...p1, pack: e.target.value })}>{PACKS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          <F l="BET"><select style={S.in} value={p1.betMode} onChange={(e) => setP1({ ...p1, betMode: e.target.value })}><option value="PLATFORM">Plateforme</option><option value="EXTERNAL">Externe (0)</option></select></F>
          <F l="Options"><div style={S.checks}>
            <label style={S.chk}><input type="checkbox" checked={p1.addRemoteFollow} onChange={(e) => setP1({ ...p1, addRemoteFollow: e.target.checked })} /> Suivi à distance</label>
            <label style={S.chk}><input type="checkbox" checked={p1.modEnabled} onChange={(e) => setP1({ ...p1, modEnabled: e.target.checked })} /> MOD</label>
            <label style={S.chk}><input type="checkbox" checked={p1.decoEnabled} onChange={(e) => setP1({ ...p1, decoEnabled: e.target.checked })} /> Déco</label>
            <label style={S.chk}><input type="checkbox" checked={p1.mandateEntreprise} onChange={(e) => setP1({ ...p1, mandateEntreprise: e.target.checked })} /> Mandat entreprise</label>
          </div></F>
        </div>
      ) : (
        <div style={S.grid}>
          <F l="Section"><select style={S.in} value={p2.section} onChange={(e) => setP2({ ...p2, section: e.target.value })}>{SECTIONS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          {p2.section !== "LOT" && <F l="Catégorie (barème CNOA)"><select style={S.in} value={p2.categoryCode} onChange={(e) => setP2({ ...p2, categoryCode: e.target.value })}>{cats.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></F>}
          {p2.section === "LOT"
            ? <F l="Surface terrain (ha)"><input type="number" min="0" step="0.1" style={S.in} value={p2.surfaceTerrainHa} onChange={(e) => setP2({ ...p2, surfaceTerrainHa: Number(e.target.value) })} /></F>
            : <SurfaceHelper value={p2.surfacePlancherM2} onChange={(m2) => setP2((s) => ({ ...s, surfacePlancherM2: m2 }))} />}
          <F l="Nombre de bâtiments"><input type="number" min="1" style={S.in} value={p2.nbBatiments} onChange={(e) => setP2({ ...p2, nbBatiments: Number(e.target.value) })} /></F>
          <F l="Mode de suivi"><select style={S.in} value={p2.followMode} onChange={(e) => setP2({ ...p2, followMode: e.target.value })}><option value="ON_SITE">Sur site (30%)</option><option value="PHOTOS">Photos (10%)</option></select></F>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button onClick={compute} disabled={busy} style={S.btnCalc}>{busy ? "Calcul…" : "Calculer"}</button>
        {err && <span style={S.err}>⚠ {err}</span>}
      </div>

      {preview && (
        <div style={S.preview}>
          <div style={S.previewHead}>{preview.titre} · <span style={{ color: CC.color.inkMid }}>{preview.sousTexte}</span></div>
          {preview.detail.map((d, i) => (
            <div key={i} style={S.previewRow}><span>{d.l}</span><b>{fmtMAD(d.v)}</b></div>
          ))}
          {onApply && <button onClick={() => onApply(preview.lignes, { titre: preview.titre, tva: 20, porte })} style={S.btnApply}>↧ Appliquer ces lignes au devis</button>}
        </div>
      )}
    </div>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <div><label style={S.lab}>{l}</label>{children}</div>;
}

const S: Record<string, React.CSSProperties> = {
  box: { background: CC.color.bgSoft, border: `1px solid ${CC.color.border}`, borderRadius: 8, padding: "16px 18px", marginBottom: 18 },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 },
  porteRow: { display: "flex", gap: 8, marginBottom: 14 },
  porteBtn: { flex: 1, padding: "9px 12px", border: `1px solid ${CC.color.border}`, borderRadius: 6, background: CC.color.bgRaised, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 },
  porteBtnActive: { background: CC.color.navy, color: CC.color.inkOnDark, borderColor: CC.color.navy },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" },
  lab: { display: "block", fontSize: 10, color: CC.color.inkMid, marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  miniLab: { display: "block", fontSize: 10, color: CC.color.inkMuted, marginBottom: 2 },
  in: { width: "100%", padding: "8px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },
  modeBtn: { padding: "5px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, background: CC.color.bgRaised, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 },
  modeOn: { background: CC.color.orSoft, color: CC.color.navy, borderColor: CC.color.or },
  checks: { display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 },
  chk: { fontSize: 12, color: CC.color.ink, display: "flex", alignItems: "center", gap: 4 },
  btnCalc: { background: CC.color.or, color: "#fff", border: 0, padding: "9px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
  err: { color: CC.color.danger, fontSize: 12 },
  preview: { marginTop: 14, padding: "12px 14px", background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 6 },
  previewHead: { fontSize: 13, fontWeight: 600, color: CC.color.navy, marginBottom: 8 },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px dotted ${CC.color.border}` },
  btnApply: { marginTop: 12, background: CC.color.navy, color: CC.color.inkOnDark, border: 0, padding: "9px 18px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
};
