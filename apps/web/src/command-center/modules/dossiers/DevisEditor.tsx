/**
 * DevisEditor — Passe 3
 *
 * Écran backoffice de SAISIE/ÉDITION de devis dossier-global (model Devis).
 * Route : /cc/dossiers/:id/devis
 *
 * - Saisie de lignes { désignation, quantité, unité, PU } → HT/TVA/TTC calculés.
 * - Enregistre via POST /p2/dossier/:id/devis (statut BROUILLON, montants serveur).
 * - Liste les devis existants du dossier + impression (GET /api/cc/devis/:id/html).
 *
 * Style : tokens CC (theme/tokens.ts), cohérent avec le reste du backoffice.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, apiBase, getToken } from "../../../tomes/tome4/apiClient";
import { CC } from "../../theme/tokens";
import CostEngine from "./CostEngine";

type Ligne = { designation: string; quantite: number; unite: string; prixUnitaire: number };
type Devis = {
  id: string;
  numero: string;
  titre: string;
  statut: string;
  phaseRef: string | null;
  montantHT: number;
  tva: number;
  montantTTC: number;
  lignes: Ligne[];
  createdAt: string;
};

const fmtMAD = (n: number) => (Number.isFinite(n) ? n.toLocaleString("fr-MA") : "0") + " DH";

/** Ouvre un endpoint HTML protégé JWT dans un nouvel onglet. */
async function openHtmlInTab(path: string) {
  const token = getToken() || "";
  const res = await fetch(`${apiBase()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    alert(`Erreur ${res.status} : ${await res.text()}`);
    return;
  }
  const html = await res.text();
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const emptyLine = (): Ligne => ({ designation: "", quantite: 1, unite: "Forfait", prixUnitaire: 0 });

export default function DevisEditor() {
  const { id: dossierId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [titre, setTitre] = useState("Devis prestations");
  const [tva, setTva] = useState(20);
  const [lignes, setLignes] = useState<Ligne[]>([emptyLine()]);
  const [existants, setExistants] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!dossierId) return;
    setLoading(true);
    try {
      const data = await apiFetch<Devis[]>(`/p2/dossier/${dossierId}/devis`);
      setExistants(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { reload(); }, [reload]);

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const tvaAmount = Math.round(totalHT * (tva / 100));
  const totalTTC = totalHT + tvaAmount;

  const updateLine = (i: number, patch: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLignes((ls) => [...ls, emptyLine()]);
  const removeLine = (i: number) => setLignes((ls) => ls.filter((_, idx) => idx !== i));

  const save = async () => {
    setErr(null); setOk(null);
    const cleanLignes = lignes
      .map((l) => ({ ...l, designation: l.designation.trim(), quantite: Number(l.quantite) || 0, prixUnitaire: Number(l.prixUnitaire) || 0 }))
      .filter((l) => l.designation && l.quantite > 0);
    if (!titre.trim()) { setErr("Titre requis"); return; }
    if (cleanLignes.length === 0) { setErr("Ajoute au moins une ligne (désignation + quantité)"); return; }
    setSaving(true);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/devis`, {
        method: "POST",
        body: { titre: titre.trim(), lignes: cleanLignes, tva },
      });
      setOk("Devis enregistré.");
      setLignes([emptyLine()]);
      setTitre("Devis prestations");
      await reload();
    } catch (e: any) {
      setErr(e?.message || "Enregistrement échoué");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.root}>
      <div style={S.headerRow}>
        <button onClick={() => navigate("/cc/dossiers")} style={S.btnGhost}>← Dossiers</button>
        <h1 style={S.h1}>Devis — dossier <code style={S.code}>{dossierId}</code></h1>
      </div>

      {/* ── Éditeur ── */}
      <section style={S.card}>
        <div style={S.eyebrow}>Nouveau devis</div>
        <CostEngine onApply={(ls, info) => { setLignes(ls); if (info.titre) setTitre(info.titre); if (info.tva) setTva(info.tva); }} />
        <label style={S.label}>Titre</label>
        <input style={S.input} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Honoraires conception" />

        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: "44%" }}>Désignation</th>
              <th style={{ ...S.th, ...S.num, width: "12%" }}>Qté</th>
              <th style={{ ...S.th, width: "16%" }}>Unité</th>
              <th style={{ ...S.th, ...S.num, width: "16%" }}>PU HT</th>
              <th style={{ ...S.th, ...S.num, width: "12%" }}>Total HT</th>
              <th style={{ ...S.th, width: "4%" }}></th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={S.td}><input style={S.cell} value={l.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} placeholder="Prestation…" /></td>
                <td style={S.td}><input type="number" min="0" step="0.5" style={{ ...S.cell, textAlign: "right" }} value={l.quantite} onChange={(e) => updateLine(i, { quantite: Number(e.target.value) })} /></td>
                <td style={S.td}><input style={S.cell} value={l.unite} onChange={(e) => updateLine(i, { unite: e.target.value })} /></td>
                <td style={S.td}><input type="number" min="0" step="100" style={{ ...S.cell, textAlign: "right" }} value={l.prixUnitaire} onChange={(e) => updateLine(i, { prixUnitaire: Number(e.target.value) })} /></td>
                <td style={{ ...S.td, ...S.num, color: CC.color.ink }}>{fmtMAD((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0))}</td>
                <td style={S.td}>{lignes.length > 1 && <button onClick={() => removeLine(i)} style={S.btnRemove} title="Retirer">✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addLine} style={S.btnAdd}>+ Ajouter une ligne</button>

        <div style={S.totals}>
          <div style={S.totalRow}><span>Total HT</span><span>{fmtMAD(totalHT)}</span></div>
          <div style={S.totalRow}>
            <span>TVA
              <input type="number" min="0" max="100" style={S.tvaInput} value={tva} onChange={(e) => setTva(Number(e.target.value))} />%
            </span>
            <span>{fmtMAD(tvaAmount)}</span>
          </div>
          <div style={{ ...S.totalRow, ...S.totalTTC }}><span>Total TTC</span><span>{fmtMAD(totalTTC)}</span></div>
        </div>

        {err && <div style={S.err}>⚠ {err}</div>}
        {ok && <div style={S.ok}>{ok}</div>}

        <div style={S.actions}>
          <button onClick={save} disabled={saving} style={S.btnPrimary}>{saving ? "Enregistrement…" : "Enregistrer le devis"}</button>
        </div>
      </section>

      {/* ── Devis existants ── */}
      <section style={S.card}>
        <div style={S.eyebrow}>Devis du dossier {loading ? "…" : `(${existants.length})`}</div>
        {!loading && existants.length === 0 && <div style={S.muted}>Aucun devis pour ce dossier.</div>}
        {existants.map((d) => (
          <div key={d.id} style={S.devisRow}>
            <div>
              <div style={S.devisNum}>{d.numero} <span style={S.badge}>{d.statut}</span></div>
              <div style={S.devisMeta}>{d.titre} · {d.lignes?.length ?? 0} ligne(s) · {d.phaseRef ? `phase ${d.phaseRef}` : "global"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={S.devisTtc}>{fmtMAD(d.montantTTC)}</span>
              <button onClick={() => openHtmlInTab(`/api/cc/devis/${d.id}/html`)} style={S.btnPrint}>📄 Imprimer</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { maxWidth: 920, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink },
  headerRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  h1: { fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: 0 },
  code: { fontSize: 12, color: CC.color.inkMid, background: CC.color.bgSoft, padding: "2px 6px", borderRadius: 4 },

  card: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: "20px 22px", marginBottom: 18 },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: `1px dotted ${CC.color.border}` },

  label: { display: "block", fontSize: 11, color: CC.color.inkMid, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", padding: "10px 12px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 14, marginBottom: 16, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },

  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 10, color: CC.color.navy, textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 8px", textAlign: "left", borderBottom: `2px solid ${CC.color.navy}` },
  td: { padding: "6px 8px", borderBottom: `1px solid ${CC.color.border}`, verticalAlign: "middle" },
  num: { textAlign: "right" },
  cell: { width: "100%", padding: "7px 8px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", background: CC.color.bg },

  btnAdd: { marginTop: 10, background: "transparent", border: `1px dashed ${CC.color.border}`, color: CC.color.or, padding: "8px 14px", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  btnRemove: { background: "transparent", border: 0, color: CC.color.danger, cursor: "pointer", fontSize: 14, fontWeight: 700 },

  totals: { marginLeft: "auto", width: 300, marginTop: 16 },
  totalRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 },
  totalTTC: { borderTop: `2px solid ${CC.color.navy}`, marginTop: 6, paddingTop: 10, fontSize: 17, fontWeight: 700, color: CC.color.navy },
  tvaInput: { width: 50, margin: "0 4px", padding: "2px 6px", border: `1px solid ${CC.color.border}`, borderRadius: 3, fontFamily: "inherit", fontSize: 13, textAlign: "right" },

  err: { background: CC.color.dangerBg, color: CC.color.danger, padding: "10px 14px", borderRadius: 4, fontSize: 13, marginTop: 14 },
  ok: { background: CC.color.successBg, color: CC.color.success, padding: "10px 14px", borderRadius: 4, fontSize: 13, marginTop: 14 },
  actions: { display: "flex", justifyContent: "flex-end", marginTop: 16 },
  btnPrimary: { background: CC.color.navy, color: CC.color.inkOnDark, border: 0, padding: "12px 26px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" },
  btnGhost: { background: "transparent", border: `1px solid ${CC.color.border}`, padding: "8px 16px", borderRadius: 6, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },

  devisRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${CC.color.border}` },
  devisNum: { fontSize: 14, fontWeight: 600, color: CC.color.navy },
  devisMeta: { fontSize: 12, color: CC.color.inkMid, marginTop: 2 },
  devisTtc: { fontSize: 15, fontWeight: 600, color: CC.color.ink },
  badge: { fontSize: 10, background: CC.color.bgSoft, color: CC.color.inkMid, padding: "2px 8px", borderRadius: 10, marginLeft: 8, letterSpacing: "0.04em" },
  btnPrint: { background: CC.color.orSoft, color: CC.color.navy, border: 0, padding: "8px 14px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  muted: { color: CC.color.inkMid, fontStyle: "italic", fontSize: 13 },
};
