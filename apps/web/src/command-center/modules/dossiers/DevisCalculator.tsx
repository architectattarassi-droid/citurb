/**
 * DevisCalculator — génère les lignes d'un devis À PARTIR du calcul de coût
 * (logique Porte 1 = packs sur budget, Porte 2 = barème CNOA), au lieu d'une
 * saisie libre. Réutilise les moteurs serveur existants :
 *   - P1 : POST /p1/packs/quote (5% du budget × ratio pack + BET/MOD/Déco)
 *   - P2 : POST /p2/quote (surface × coût/m² barème CNOA × 5%, échelonné 40/30/30)
 *
 * onApply(lignes, { titre, tva }) → l'éditeur remplit le devis avec ces lignes.
 */

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import { CC } from "../../theme/tokens";

export type CalcLigne = { designation: string; quantite: number; unite: string; prixUnitaire: number };

const fmtMAD = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("fr-MA") : "0") + " DH";

const NIVEAUX = [
  { v: "ECONOMIQUE", l: "Économique" },
  { v: "STANDING", l: "Standing" },
  { v: "HAUT_STANDING", l: "Haut standing" },
  { v: "PREMIUM", l: "Premium" },
  { v: "BLACK", l: "Luxe (Black)" },
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

export default function DevisCalculator({ onApply }: { onApply: (lignes: CalcLigne[], info: { titre?: string; tva?: number }) => void }) {
  const [porte, setPorte] = useState<"P1" | "P2">("P2");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ lignes: CalcLigne[]; titre: string; sousTexte: string } | null>(null);

  // P1
  const [p1, setP1] = useState({ surfaceM2: 300, constructionLevel: "STANDING", pack: "AVANCE", betMode: "PLATFORM", addRemoteFollow: false, modEnabled: false, decoEnabled: false });
  // P2
  const [p2, setP2] = useState({ section: "IMM", categoryCode: "", surfacePlancherM2: 300, nbBatiments: 1, followMode: "ON_SITE" });
  const [cats, setCats] = useState<{ code: string; label: string }[]>([]);

  useEffect(() => {
    if (porte !== "P2" || p2.section === "LOT") { setCats([]); return; }
    apiFetch<{ ok: boolean; items: { code: string; label: string }[] }>(`/p2/categories?section=${p2.section}`)
      .then((r) => { const items = r?.items ?? []; setCats(items); setP2((s) => ({ ...s, categoryCode: items[0]?.code ?? "" })); })
      .catch(() => setCats([]));
  }, [porte, p2.section]);

  const calcP1 = async () => {
    const r: any = await apiFetch(`/p1/packs/quote`, { method: "POST", body: { input: p1 } });
    const a = r?.amounts; if (!a) throw new Error("Calcul P1 indisponible");
    const lignes: CalcLigne[] = [];
    const L = (designation: string, prixUnitaire: number) => { if (prixUnitaire > 0) lignes.push({ designation, quantite: 1, unite: "Forfait", prixUnitaire }); };
    const niv = NIVEAUX.find((n) => n.v === p1.constructionLevel)?.l ?? p1.constructionLevel;
    L(`Pack ${PACKS.find((x) => x.v === p1.pack)?.l ?? p1.pack} — conception architecturale\n${p1.surfaceM2} m² · niveau ${niv}`, a.packMAD);
    L("Suivi de chantier à distance", a.remoteFollowMAD);
    L("BET — études techniques (structure/fluides)", a.betMAD);
    L("MOD — maîtrise d'ouvrage déléguée", a.modMAD);
    L("Décoration / aménagement intérieur", a.decoMAD);
    if (lignes.length === 0) throw new Error("Aucun montant calculé (vérifie les options).");
    return { lignes, titre: `Honoraires P1 — Pack ${PACKS.find((x) => x.v === p1.pack)?.l}`, sousTexte: `Total calculé : ${fmtMAD(a.totalMAD)} HT` };
  };

  const calcP2 = async () => {
    if (p2.section === "LOT") throw new Error("Lotissement : grille en cours — devis personnalisé (saisie manuelle).");
    if (!p2.categoryCode) throw new Error("Choisis une catégorie.");
    const r: any = await apiFetch(`/p2/quote`, { method: "POST", body: { section: p2.section, categoryCode: p2.categoryCode, surfacePlancherM2: Number(p2.surfacePlancherM2), nbBatiments: Number(p2.nbBatiments), followMode: p2.followMode } });
    if (r?.ok === false) throw new Error(r?.error || "Calcul P2 refusé");
    const h = r?.honoraires; const b = r?.breakdown ?? h?.breakdown; if (!h || h.totalHT == null) throw new Error("Calcul P2 indisponible");
    const bd = h.breakdown ?? b;
    const catLabel = r?.meta?.categoryLabel ?? p2.categoryCode;
    const coutTravaux = r?.base?.coutTravauxEstime;
    const ctx = `${catLabel} · ${p2.surfacePlancherM2} m²${coutTravaux ? ` · coût travaux estimé ${fmtMAD(coutTravaux)}` : ""}`;
    const lignes: CalcLigne[] = [
      { designation: `Honoraires architecte — Esquisse + Autorisation (40%)\n${ctx}`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseA_esquisseAutorisation },
      { designation: `Honoraires architecte — DCE + CPS (30%)`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseB_dceCps },
      { designation: `Honoraires architecte — Suivi ${p2.followMode === "PHOTOS" ? "par photos (10%)" : "sur site (30%)"}`, quantite: 1, unite: "Forfait", prixUnitaire: bd.phaseC_suivi },
    ].filter((l) => Number(l.prixUnitaire) > 0);
    return { lignes, titre: `Honoraires CNOA — ${catLabel}`, sousTexte: `Honoraires 5% · total ${fmtMAD(h.totalHT)} HT` };
  };

  const compute = async () => {
    setErr(null); setBusy(true); setPreview(null);
    try {
      const res = porte === "P1" ? await calcP1() : await calcP2();
      setPreview(res);
    } catch (e: any) { setErr(e?.message || "Calcul impossible"); }
    finally { setBusy(false); }
  };

  return (
    <div style={S.box}>
      <div style={S.eyebrow}>Calcul du devis (coût de réalisation + prestation)</div>

      <div style={S.porteRow}>
        {(["P2", "P1"] as const).map((p) => (
          <button key={p} onClick={() => { setPorte(p); setPreview(null); setErr(null); }} style={{ ...S.porteBtn, ...(porte === p ? S.porteBtnActive : {}) }}>
            {p === "P1" ? "Porte 1 — Particulier (packs)" : "Porte 2 — Promoteur (barème CNOA)"}
          </button>
        ))}
      </div>

      {porte === "P1" ? (
        <div style={S.grid}>
          <F l="Surface plancher (m²)"><input type="number" style={S.in} value={p1.surfaceM2} onChange={(e) => setP1({ ...p1, surfaceM2: Number(e.target.value) })} /></F>
          <F l="Niveau de construction"><select style={S.in} value={p1.constructionLevel} onChange={(e) => setP1({ ...p1, constructionLevel: e.target.value })}>{NIVEAUX.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          <F l="Pack"><select style={S.in} value={p1.pack} onChange={(e) => setP1({ ...p1, pack: e.target.value })}>{PACKS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          <F l="BET"><select style={S.in} value={p1.betMode} onChange={(e) => setP1({ ...p1, betMode: e.target.value })}><option value="PLATFORM">Plateforme</option><option value="EXTERNAL">Externe (0)</option></select></F>
          <F l="Options"><div style={S.checks}>
            <label style={S.chk}><input type="checkbox" checked={p1.addRemoteFollow} onChange={(e) => setP1({ ...p1, addRemoteFollow: e.target.checked })} /> Suivi à distance</label>
            <label style={S.chk}><input type="checkbox" checked={p1.modEnabled} onChange={(e) => setP1({ ...p1, modEnabled: e.target.checked })} /> MOD</label>
            <label style={S.chk}><input type="checkbox" checked={p1.decoEnabled} onChange={(e) => setP1({ ...p1, decoEnabled: e.target.checked })} /> Déco</label>
          </div></F>
        </div>
      ) : (
        <div style={S.grid}>
          <F l="Section"><select style={S.in} value={p2.section} onChange={(e) => setP2({ ...p2, section: e.target.value })}>{SECTIONS.map((n) => <option key={n.v} value={n.v}>{n.l}</option>)}</select></F>
          <F l="Catégorie (barème)"><select style={S.in} value={p2.categoryCode} onChange={(e) => setP2({ ...p2, categoryCode: e.target.value })} disabled={p2.section === "LOT"}>{cats.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></F>
          <F l="Surface plancher (m²)"><input type="number" style={S.in} value={p2.surfacePlancherM2} onChange={(e) => setP2({ ...p2, surfacePlancherM2: Number(e.target.value) })} /></F>
          <F l="Nb bâtiments"><input type="number" min="1" style={S.in} value={p2.nbBatiments} onChange={(e) => setP2({ ...p2, nbBatiments: Number(e.target.value) })} /></F>
          <F l="Suivi"><select style={S.in} value={p2.followMode} onChange={(e) => setP2({ ...p2, followMode: e.target.value })}><option value="ON_SITE">Sur site (30%)</option><option value="PHOTOS">Photos (10%)</option></select></F>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button onClick={compute} disabled={busy} style={S.btnCalc}>{busy ? "Calcul…" : "Calculer"}</button>
        {err && <span style={S.err}>⚠ {err}</span>}
      </div>

      {preview && (
        <div style={S.preview}>
          <div style={S.previewHead}>{preview.titre} · <span style={{ color: CC.color.inkMid }}>{preview.sousTexte}</span></div>
          {preview.lignes.map((l, i) => (
            <div key={i} style={S.previewRow}><span>{l.designation.split("\n")[0]}</span><b>{fmtMAD(l.prixUnitaire)}</b></div>
          ))}
          <button onClick={() => onApply(preview.lignes, { titre: preview.titre, tva: 20 })} style={S.btnApply}>↧ Appliquer ces lignes au devis</button>
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
  in: { width: "100%", padding: "8px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },
  checks: { display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 },
  chk: { fontSize: 12, color: CC.color.ink, display: "flex", alignItems: "center", gap: 4 },
  btnCalc: { background: CC.color.or, color: "#fff", border: 0, padding: "9px 20px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
  err: { color: CC.color.danger, fontSize: 12 },
  preview: { marginTop: 14, padding: "12px 14px", background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 6 },
  previewHead: { fontSize: 13, fontWeight: 600, color: CC.color.navy, marginBottom: 8 },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: `1px dotted ${CC.color.border}` },
  btnApply: { marginTop: 12, background: CC.color.navy, color: CC.color.inkOnDark, border: 0, padding: "9px 18px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
};
