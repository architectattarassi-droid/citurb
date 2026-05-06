/**
 * ValidationsModule.tsx
 * Page admin centralisée pour les validations en attente.
 *
 *   Tab 1 — Packs (P1-P5): packValidation.status === PENDING_ADMIN_VALIDATION
 *           Action: Valider / Révoquer
 *   Tab 2 — Prestataires P6: p6Validation.status DRAFT|PENDING_REVIEW|NEEDS_DOCS
 *           Action: Verifier / Blacklist / Demander docs
 *
 * Endpoints:
 *   GET  /api/cc/pack-validation/pending
 *   GET  /api/cc/p6-review/pending
 *   PATCH /api/cc/pack-validation/:id/validate  + /revoke
 *   PATCH /api/cc/p6-review/:id/verify  + /blacklist + /needs-docs
 */

import React, { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import { useNavigate } from "react-router-dom";

type Tab = "PACKS" | "P6";

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 18px",
  background: "transparent",
  border: 0,
  color: active ? "#22d3ee" : "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  borderBottom: `2px solid ${active ? "#22d3ee" : "transparent"}`,
  marginBottom: -1,
});

const badgeStyle = (color: string, bg: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  color, background: bg,
});

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: "#e8eaf0", letterSpacing: "-0.02em", fontFamily: "'DM Mono', monospace" },
  subtitle: { margin: "4px 0 0", fontSize: 12, color: "#4a5568" },
  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #1e2330" },
  empty: { color: "#4a5568", padding: 32, textAlign: "center" as const, fontSize: 13 },
  tableWrap: { overflowX: "auto", border: "1px solid #1e2330", borderRadius: 10, background: "#0d1017" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { padding: "10px 14px", textAlign: "left" as const, color: "#4a5568", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontSize: 10, borderBottom: "1px solid #1e2330" },
  tr: { cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "10px 14px", verticalAlign: "middle" as const, borderBottom: "1px solid #1a1f2e" },
  btnPrimary: { background: "#10b981", color: "#fff", border: 0, padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 },
  btnDanger: { background: "#dc2626", color: "#fff", border: 0, padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600 },
  btnGhost: { background: "transparent", color: "#9ca3af", border: "1px solid #334155", padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 11 },
  err: { color: "#fca5a5", fontSize: 12, marginBottom: 12, background: "#1a0a0a", padding: 10, borderRadius: 6, border: "1px solid #ef444440" },
};

export default function ValidationsModule() {
  const [tab, setTab] = useState<Tab>("PACKS");
  const [packs, setPacks] = useState<any[]>([]);
  const [p6, setP6] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b] = await Promise.all([
        apiFetch<any>("/api/cc/pack-validation/pending"),
        apiFetch<any>("/api/cc/p6-review/pending"),
      ]);
      setPacks(a?.items ?? []);
      setP6(b?.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>◇ Validations</h1>
          <p style={S.subtitle}>Packs en attente d'activation + fiches prestataires P6 en attente de review</p>
        </div>
        <button onClick={load} style={S.btnGhost}>{loading ? "…" : "↻ Refresh"}</button>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}

      <div style={S.tabs}>
        <button style={tabStyle(tab === "PACKS")} onClick={() => setTab("PACKS")}>
          Packs à valider ({packs.length})
        </button>
        <button style={tabStyle(tab === "P6")} onClick={() => setTab("P6")}>
          Prestataires P6 ({p6.length})
        </button>
      </div>

      {tab === "PACKS" && <PacksTab items={packs} onChanged={load} />}
      {tab === "P6" && <P6Tab items={p6} onChanged={load} />}
    </div>
  );
}

// ─── PACKS TAB ─────────────────────────────────────────────────

function PacksTab({ items, onChanged }: { items: any[]; onChanged: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const validate = async (dossierId: string) => {
    setBusy(dossierId);
    try {
      await apiFetch(`/api/cc/pack-validation/${dossierId}/validate`, { method: "PATCH", body: { note: "Validé via module Validations" } });
      onChanged();
    } catch (e: any) { alert("Erreur: " + (e?.message || "?")); }
    finally { setBusy(null); }
  };

  if (items.length === 0) return <div style={S.empty}>Aucun pack en attente de validation.</div>;

  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {["Client", "Porte", "Pack", "Montant payé", "Reçu le", "Actions"].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => {
            const d = it.dossier;
            const pv = it.packValidation;
            return (
              <tr key={d.id} style={{ ...S.tr, background: i % 2 === 0 ? "transparent" : "rgba(30,35,48,0.3)" }}>
                <td style={S.td}>
                  <div style={{ color: "#e8eaf0", fontWeight: 600 }}>{d.clientNom || d.raisonSociale || "—"}</div>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>{d.clientEmail || d.clientTel || "—"}</div>
                </td>
                <td style={S.td}><span style={badgeStyle("#fff", "#7c3aed")}>{d.porteType || "—"}</span></td>
                <td style={S.td}>
                  <div style={{ color: "#cbd5e1", fontSize: 12 }}>{d.title || "—"}</div>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>{d.commune || "—"}</div>
                </td>
                <td style={S.td}>
                  <span style={{ color: "#10b981", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                    {pv?.paymentAmount ? `${pv.paymentAmount.toLocaleString("fr-FR")} ${pv.paymentCurrency || "MAD"}` : "—"}
                  </span>
                  {pv?.paymentRef && <div style={{ color: "#6b7280", fontSize: 10 }}>{pv.paymentRef}</div>}
                </td>
                <td style={S.td}>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>{pv?.paidAt ? new Date(pv.paidAt).toLocaleString("fr-MA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                </td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={S.btnPrimary} onClick={() => validate(d.id)} disabled={busy === d.id}>
                      {busy === d.id ? "…" : "✓ Activer"}
                    </button>
                    <button style={S.btnGhost} onClick={() => navigate(`/cc/dossiers/${d.id}/shadow`)}>👁️ Voir</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── P6 TAB ────────────────────────────────────────────────────

function P6Tab({ items, onChanged }: { items: any[]; onChanged: () => void }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const verify = async (id: string) => {
    setBusy(id);
    try {
      await apiFetch(`/api/cc/p6-review/${id}/verify`, { method: "PATCH", body: { expiresInDays: 365 } });
      onChanged();
    } catch (e: any) { alert("Erreur: " + (e?.message || "?")); }
    finally { setBusy(null); }
  };
  const blacklist = async (id: string) => {
    const reason = window.prompt("Motif blacklist:");
    if (!reason) return;
    setBusy(id);
    try {
      await apiFetch(`/api/cc/p6-review/${id}/blacklist`, { method: "PATCH", body: { reason } });
      onChanged();
    } catch (e: any) { alert("Erreur: " + (e?.message || "?")); }
    finally { setBusy(null); }
  };

  if (items.length === 0) return <div style={S.empty}>Aucune fiche P6 en attente de review.</div>;

  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {["Société", "Type fiche", "Classe BTP", "Score", "Tier", "Statut", "Actions"].map(h => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => {
            const d = it.dossier;
            const tier = it.tier || "—";
            const tierColor = tier === "GOLD" ? "#fbbf24" : tier === "SILVER" ? "#94a3b8" : tier === "BRONZE" ? "#a16207" : "#ef4444";
            return (
              <tr key={d.id} style={{ ...S.tr, background: i % 2 === 0 ? "transparent" : "rgba(30,35,48,0.3)" }}>
                <td style={S.td}>
                  <div style={{ color: "#e8eaf0", fontWeight: 600 }}>{d.raisonSociale || d.clientNom || "—"}</div>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>{d.clientEmail || d.clientTel || "—"}</div>
                  <div style={{ color: "#6b7280", fontSize: 10 }}>{d.commune || "—"}</div>
                </td>
                <td style={S.td}>
                  <span style={badgeStyle("#fff", it.p6Type === "FOURNISSEUR_MATERIAUX" ? "#1d4ed8" : "#dc2626")}>
                    {it.p6Type === "FOURNISSEUR_MATERIAUX" ? "🏗️ Fournisseur" : "🛠️ Prestataire"}
                  </span>
                </td>
                <td style={S.td}><span style={{ color: "#cbd5e1" }}>{it.classeBTP ? `Classe ${it.classeBTP}` : "—"}</span></td>
                <td style={S.td}><span style={{ color: tierColor, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{it.score ?? "—"}</span></td>
                <td style={S.td}><span style={{ color: tierColor, fontWeight: 600 }}>{tier}</span></td>
                <td style={S.td}><span style={{ color: "#94a3b8", fontSize: 11 }}>{it.statusLabel}</span></td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={S.btnPrimary} onClick={() => verify(d.id)} disabled={busy === d.id}>
                      {busy === d.id ? "…" : "✓ Vérifier"}
                    </button>
                    <button style={S.btnDanger} onClick={() => blacklist(d.id)} disabled={busy === d.id}>
                      ✗ Blacklist
                    </button>
                    <button style={S.btnGhost} onClick={() => navigate(`/cc/dossiers/${d.id}/shadow`)}>👁️</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
