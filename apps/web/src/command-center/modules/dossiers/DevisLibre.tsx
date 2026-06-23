/**
 * DevisLibre — Passe B
 *
 * Création d'un devis AUTONOME (sans dossier) : l'admin saisit les coordonnées
 * client + les lignes, le devis est persisté (DEV-LIBRE-NNNN) puis imprimable.
 * Route : /cc/devis
 *
 * Back : POST/GET /api/cc/devis · impression GET /api/cc/devis/:id/html.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiBase, getToken } from "../../../tomes/tome4/apiClient";
import { CC } from "../../theme/tokens";
import CostEngine from "./CostEngine";
import LotsEstimator from "./LotsEstimator";

type Ligne = { designation: string; quantite: number; unite: string; prixUnitaire: number };
type ClientInfo = {
  raisonSociale?: string; clientNom?: string; representant?: string;
  ice?: string; rc?: string; address?: string; commune?: string;
  clientTel?: string; clientEmail?: string;
};
type Devis = { id: string; numero: string; titre: string; statut: string; montantTTC: number; lignes: Ligne[]; clientInfo?: ClientInfo | null; createdAt: string };

const fmtMAD = (n: number) => (Number.isFinite(n) ? n.toLocaleString("fr-MA") : "0") + " DH";

async function openHtmlInTab(path: string) {
  const token = getToken() || "";
  const res = await fetch(`${apiBase()}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) { alert(`Erreur ${res.status} : ${await res.text()}`); return; }
  const url = URL.createObjectURL(new Blob([await res.text()], { type: "text/html;charset=utf-8" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const emptyLine = (): Ligne => ({ designation: "", quantite: 1, unite: "Forfait", prixUnitaire: 0 });

export default function DevisLibre() {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientInfo>({});
  const [titre, setTitre] = useState("Devis prestations");
  const [tva, setTva] = useState(20);
  const [porteType, setPorteType] = useState<"P1" | "P2">("P2");
  const [lignes, setLignes] = useState<Ligne[]>([emptyLine()]);
  const [existants, setExistants] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch<{ ok: boolean; devis: Devis[] }>(`/api/cc/devis`);
      setExistants(r?.devis ?? []);
    } catch (e: any) { setErr(e?.message || "Chargement impossible"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const totalHT = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0), 0);
  const tvaAmount = Math.round(totalHT * (tva / 100));
  const totalTTC = totalHT + tvaAmount;

  const updateLine = (i: number, patch: Partial<Ligne>) => setLignes((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const setC = (patch: Partial<ClientInfo>) => setClient((c) => ({ ...c, ...patch }));

  const save = async () => {
    setErr(null); setOk(null);
    const cleanLignes = lignes
      .map((l) => ({ ...l, designation: l.designation.trim(), quantite: Number(l.quantite) || 0, prixUnitaire: Number(l.prixUnitaire) || 0 }))
      .filter((l) => l.designation && l.quantite > 0);
    if (!titre.trim()) { setErr("Titre requis"); return; }
    if (!client.raisonSociale?.trim() && !client.clientNom?.trim()) { setErr("Renseigne au moins la raison sociale OU le nom du client"); return; }
    if (cleanLignes.length === 0) { setErr("Ajoute au moins une ligne (désignation + quantité)"); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/cc/devis`, { method: "POST", body: { titre: titre.trim(), lignes: cleanLignes, tva, clientInfo: client, porteType } });
      setOk("Devis enregistré — un dossier brouillon (phase devis) a été créé.");
      setLignes([emptyLine()]); setTitre("Devis prestations"); setClient({});
      await reload();
    } catch (e: any) { setErr(e?.message || "Enregistrement échoué"); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.root}>
      <div style={S.headerRow}>
        <button onClick={() => navigate("/cc/dossiers")} style={S.btnGhost}>← Dossiers</button>
        <h1 style={S.h1}>Nouveau devis <span style={S.sub}>(crée un dossier brouillon · phase devis)</span></h1>
      </div>

      <section style={S.card}>
        <div style={S.eyebrow}>Client</div>
        <div style={S.grid2}>
          <Field label="Raison sociale"><input style={S.input} value={client.raisonSociale || ""} onChange={(e) => setC({ raisonSociale: e.target.value })} placeholder="Société / cabinet" /></Field>
          <Field label="Nom du client"><input style={S.input} value={client.clientNom || ""} onChange={(e) => setC({ clientNom: e.target.value })} placeholder="Personne physique / contact" /></Field>
          <Field label="ICE"><input style={S.input} value={client.ice || ""} onChange={(e) => setC({ ice: e.target.value })} /></Field>
          <Field label="RC"><input style={S.input} value={client.rc || ""} onChange={(e) => setC({ rc: e.target.value })} /></Field>
          <Field label="Adresse"><input style={S.input} value={client.address || ""} onChange={(e) => setC({ address: e.target.value })} /></Field>
          <Field label="Commune"><input style={S.input} value={client.commune || ""} onChange={(e) => setC({ commune: e.target.value })} /></Field>
          <Field label="Téléphone"><input style={S.input} value={client.clientTel || ""} onChange={(e) => setC({ clientTel: e.target.value })} /></Field>
          <Field label="Email"><input style={S.input} value={client.clientEmail || ""} onChange={(e) => setC({ clientEmail: e.target.value })} /></Field>
        </div>
      </section>

      <section style={S.card}>
        <div style={S.eyebrow}>Devis</div>
        <LotsEstimator onApply={(ls, info) => { setLignes(ls); if (info.titre) setTitre(info.titre); if (info.tva) setTva(info.tva); }} />
        <CostEngine onApply={(ls, info) => { setLignes(ls); if (info.titre) setTitre(info.titre); if (info.tva) setTva(info.tva); if (info.porte) setPorteType(info.porte); }} />
        <Field label="Titre"><input style={S.input} value={titre} onChange={(e) => setTitre(e.target.value)} /></Field>

        <table style={S.table}>
          <thead><tr>
            <th style={{ ...S.th, width: "44%" }}>Désignation</th>
            <th style={{ ...S.th, ...S.numH, width: "12%" }}>Qté</th>
            <th style={{ ...S.th, width: "16%" }}>Unité</th>
            <th style={{ ...S.th, ...S.numH, width: "16%" }}>PU HT</th>
            <th style={{ ...S.th, ...S.numH, width: "12%" }}>Total HT</th>
            <th style={{ ...S.th, width: "4%" }}></th>
          </tr></thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i}>
                <td style={S.td}><input style={S.cell} value={l.designation} onChange={(e) => updateLine(i, { designation: e.target.value })} placeholder="Prestation…" /></td>
                <td style={S.td}><input type="number" min="0" step="0.5" style={{ ...S.cell, textAlign: "right" }} value={l.quantite} onChange={(e) => updateLine(i, { quantite: Number(e.target.value) })} /></td>
                <td style={S.td}><input style={S.cell} value={l.unite} onChange={(e) => updateLine(i, { unite: e.target.value })} /></td>
                <td style={S.td}><input type="number" min="0" step="100" style={{ ...S.cell, textAlign: "right" }} value={l.prixUnitaire} onChange={(e) => updateLine(i, { prixUnitaire: Number(e.target.value) })} /></td>
                <td style={{ ...S.td, ...S.numH }}>{fmtMAD((Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0))}</td>
                <td style={S.td}>{lignes.length > 1 && <button onClick={() => setLignes((ls) => ls.filter((_, idx) => idx !== i))} style={S.btnRemove}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={() => setLignes((ls) => [...ls, emptyLine()])} style={S.btnAdd}>+ Ajouter une ligne</button>

        <div style={S.totals}>
          <div style={S.totalRow}><span>Total HT</span><span>{fmtMAD(totalHT)}</span></div>
          <div style={S.totalRow}><span>TVA <input type="number" min="0" max="100" style={S.tvaInput} value={tva} onChange={(e) => setTva(Number(e.target.value))} />%</span><span>{fmtMAD(tvaAmount)}</span></div>
          <div style={{ ...S.totalRow, ...S.totalTTC }}><span>Total TTC</span><span>{fmtMAD(totalTTC)}</span></div>
        </div>

        {err && <div style={S.err}>⚠ {err}</div>}
        {ok && <div style={S.ok}>{ok}</div>}
        <div style={S.actions}><button onClick={save} disabled={saving} style={S.btnPrimary}>{saving ? "Enregistrement…" : "Enregistrer le devis libre"}</button></div>
      </section>

      <section style={S.card}>
        <div style={S.eyebrow}>Devis libres {loading ? "…" : `(${existants.length})`}</div>
        {!loading && existants.length === 0 && <div style={S.muted}>Aucun devis libre.</div>}
        {existants.map((d) => (
          <div key={d.id} style={S.devisRow}>
            <div>
              <div style={S.devisNum}>{d.numero} <span style={S.badge}>{d.statut}</span></div>
              <div style={S.devisMeta}>{d.titre} · {d.clientInfo?.raisonSociale || d.clientInfo?.clientNom || "—"} · {d.lignes?.length ?? 0} ligne(s)</div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><label style={S.label}>{label}</label>{children}</div>;
}

const S: Record<string, React.CSSProperties> = {
  root: { maxWidth: 920, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink },
  headerRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  h1: { fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: 0 },
  sub: { fontSize: 13, color: CC.color.inkMid, fontWeight: 400 },
  card: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, padding: "20px 22px", marginBottom: 18 },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14, paddingBottom: 8, borderBottom: `1px dotted ${CC.color.border}` },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" },
  label: { display: "block", fontSize: 11, color: CC.color.inkMid, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", padding: "10px 12px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 14, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 6 },
  th: { fontSize: 10, color: CC.color.navy, textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 8px", textAlign: "left", borderBottom: `2px solid ${CC.color.navy}` },
  td: { padding: "6px 8px", borderBottom: `1px solid ${CC.color.border}`, verticalAlign: "middle" },
  numH: { textAlign: "right" },
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
  badge: { fontSize: 10, background: CC.color.bgSoft, color: CC.color.inkMid, padding: "2px 8px", borderRadius: 10, marginLeft: 8 },
  btnPrint: { background: CC.color.orSoft, color: CC.color.navy, border: 0, padding: "8px 14px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  muted: { color: CC.color.inkMid, fontStyle: "italic", fontSize: 13 },
};
