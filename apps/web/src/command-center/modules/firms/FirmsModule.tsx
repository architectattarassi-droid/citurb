import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";

type Firm = {
  id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  planType: string;
  active: boolean;
  createdAt: string;
};

const PLAN_BADGE: Record<string, { bg: string; color: string }> = {
  STARTER:    { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  PRO:        { bg: "rgba(96,165,250,0.15)",  color: "#60a5fa" },
  ENTERPRISE: { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
};

export default function FirmsModule() {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", ownerEmail: "", planType: "STARTER" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
  const [firmUsers, setFirmUsers] = useState<any[]>([]);
  const [firmDossiers, setFirmDossiers] = useState<any[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/firms")
      .then((data: any) => setFirms(Array.isArray(data) ? data : []))
      .catch(() => setFirms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectFirm = (f: Firm) => {
    setSelectedFirm(f);
    apiFetch(`/firms/${f.id}/users`).then((d: any) => setFirmUsers(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch(`/firms/${f.id}/dossiers`).then((d: any) => setFirmDossiers(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const assignUser = async () => {
    if (!selectedFirm || !assignUserId.trim()) return;
    setAssigning(true);
    try {
      await apiFetch(`/firms/${selectedFirm.id}/users/${assignUserId.trim()}`, { method: 'POST' });
      setAssignUserId("");
      selectFirm(selectedFirm);
    } catch {} finally { setAssigning(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/firms", { method: "POST", body: JSON.stringify(form) });
      setForm({ slug: "", name: "", ownerEmail: "", planType: "STARTER" });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.message || "Erreur création");
    } finally {
      setSubmitting(false);
    }
  };

  const cell: React.CSSProperties = {
    padding: "10px 12px", fontSize: 13, color: "#e8eaf0",
    borderBottom: "1px solid #1e2330",
  };
  const hdr: React.CSSProperties = {
    ...cell, fontSize: 11, fontWeight: 700, color: "#8892a4",
    textTransform: "uppercase", letterSpacing: "0.06em",
    background: "#0d1520",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e8eaf0" }}>
          🏢 Cabinets partenaires
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            padding: "8px 16px", background: "#1e3a8a", color: "#fff",
            border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700,
          }}
        >
          {showForm ? "✕ Annuler" : "+ Nouveau cabinet"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{
          background: "#0d1520", border: "1px solid #1e2330", borderRadius: 8,
          padding: "20px 24px", marginBottom: 24, display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: "12px 20px",
        }}>
          {[
            { key: "slug",       label: "Slug (ex: arcbati)",     placeholder: "arcbati" },
            { key: "name",       label: "Nom du cabinet",         placeholder: "Cabinet Arc Bati" },
            { key: "ownerEmail", label: "Email responsable",      placeholder: "contact@arcbati.ma" },
          ].map(f => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "#8892a4", fontWeight: 700, textTransform: "uppercase" }}>{f.label}</span>
              <input
                required
                value={(form as any)[f.key]}
                onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{
                  background: "#131923", border: "1px solid #1e2330", borderRadius: 4,
                  color: "#e8eaf0", padding: "6px 10px", fontSize: 13,
                }}
              />
            </label>
          ))}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, color: "#8892a4", fontWeight: 700, textTransform: "uppercase" }}>Plan</span>
            <select
              value={form.planType}
              onChange={e => setForm(v => ({ ...v, planType: e.target.value }))}
              style={{
                background: "#131923", border: "1px solid #1e2330", borderRadius: 4,
                color: "#e8eaf0", padding: "6px 10px", fontSize: 13,
              }}
            >
              <option>STARTER</option>
              <option>PRO</option>
              <option>ENTERPRISE</option>
            </select>
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="submit" disabled={submitting}
              style={{
                padding: "8px 20px", background: submitting ? "#1e2330" : "#1d4ed8",
                color: "#fff", border: "none", borderRadius: 6,
                cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700,
              }}
            >
              {submitting ? "Création…" : "Créer le cabinet"}
            </button>
            {error && <span style={{ color: "#f87171", fontSize: 12 }}>{error}</span>}
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: "#8892a4", fontSize: 13 }}>Chargement…</div>
      ) : (
        <div style={{ border: "1px solid #1e2330", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Slug", "Nom", "Email", "Plan", "Statut"].map(h => (
                  <th key={h} style={hdr}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {firms.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...cell, color: "#4a5568", textAlign: "center", padding: 24 }}>
                    Aucun cabinet enregistré
                  </td>
                </tr>
              ) : firms.map(f => {
                const plan = PLAN_BADGE[f.planType] || PLAN_BADGE.STARTER;
                return (
                  <tr key={f.id} style={{ background: selectedFirm?.id === f.id ? "rgba(96,165,250,0.07)" : "#0a0f1a", cursor: "pointer" }} onClick={() => selectFirm(f)}>
                    <td style={{ ...cell, fontFamily: "monospace", fontWeight: 700, color: "#93c5fd" }}>{f.slug}</td>
                    <td style={cell}>{f.name}</td>
                    <td style={{ ...cell, color: "#94a3b8" }}>{f.ownerEmail}</td>
                    <td style={cell}>
                      <span style={{ ...plan, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {f.planType}
                      </span>
                    </td>
                    <td style={cell}>
                      <span style={{
                        borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700,
                        background: f.active ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                        color: f.active ? "#34d399" : "#f87171",
                      }}>
                        {f.active ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selectedFirm && (
        <div style={{ marginTop: 24, background: "#0d1520", border: "1px solid #1e2330", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#e8eaf0" }}>
              {selectedFirm.name}
              <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{selectedFirm.slug}</span>
            </div>
            <span style={{ fontSize: 12, color: "#64748b", cursor: "pointer" }} onClick={() => setSelectedFirm(null)}>✕ Fermer</span>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: "#60a5fa" }}>👥 {firmUsers.length} utilisateur{firmUsers.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 12, color: "#34d399" }}>📁 {firmDossiers.length} dossier{firmDossiers.length !== 1 ? "s" : ""}</span>
          </div>

          {firmUsers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Utilisateurs</div>
              {firmUsers.map((u: any) => (
                <div key={u.id} style={{ fontSize: 12, color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #1e2330" }}>
                  {u.email} <span style={{ color: "#4a5568" }}>— {u.role}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <input
              value={assignUserId}
              onChange={e => setAssignUserId(e.target.value)}
              placeholder="userId à assigner"
              style={{ flex: 1, background: "#131923", border: "1px solid #1e2330", borderRadius: 4, color: "#e8eaf0", padding: "6px 10px", fontSize: 12 }}
            />
            <button
              onClick={assignUser} disabled={assigning || !assignUserId.trim()}
              style={{ padding: "6px 14px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
            >
              {assigning ? "…" : "Assigner"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
