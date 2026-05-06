import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../tome5/AuthProvider";
import { apiFetch } from "../../../tome4/apiClient";

/**
 * P1MyDossiers — "Mon Espace" client
 *
 * Liste tous les dossiers du client connecté avec accès rapide à :
 *  - le dossier (P1Dossier)
 *  - les documents et phases (P1ClientPhases)
 *  - création d'un nouveau dossier
 */

type Dossier = {
  id: string;
  title: string;
  commune?: string | null;
  status: string;
  packSelected?: string | null;
  packPriceMAD?: number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  opsNote?: string | null;
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:         { label: "Brouillon",     bg: "#f1f5f9", color: "#64748b" },
  SUBMITTED:     { label: "Soumis",        bg: "#dbeafe", color: "#1d4ed8" },
  IN_REVIEW:     { label: "En examen",     bg: "#fef3c7", color: "#92400e" },
  APPROVED:      { label: "✓ Approuvé",    bg: "#dcfce7", color: "#166534" },
  NEEDS_CHANGES: { label: "⚠ À corriger",  bg: "#fff7ed", color: "#9a3412" },
  REJECTED:      { label: "Rejeté",        bg: "#fee2e2", color: "#991b1b" },
};

export default function P1MyDossiers() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!auth.isAuthed) return;
    setLoading(true);
    setError(null);
    try {
      const resp: any = await apiFetch("/p2/dossier");
      const items = resp?.items ?? resp?.dossiers ?? (Array.isArray(resp) ? resp : []);
      setDossiers(items);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [auth.isAuthed]);

  if (!auth.isAuthed) {
    return (
      <div style={{ padding: 32, textAlign: "center", maxWidth: 600, margin: "60px auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
        <h2>Connexion requise</h2>
        <p style={{ color: "#64748b" }}>Vous devez être connecté pour voir votre espace.</p>
        <button onClick={() => navigate("/login?next=/portal")} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "10px 20px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Se connecter</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>📁 Mon espace</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            Bonjour <b>{auth.email}</b> — voici vos dossiers projet.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ background: "#fff", color: "#475569", border: "1px solid #e2e8f0", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>↻ Rafraîchir</button>
          <button onClick={() => navigate("/p1")} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Nouveau dossier</button>
        </div>
      </div>

      {loading && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>Chargement…</div>}

      {error && (
        <div style={{ padding: "12px 16px", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && dossiers.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", background: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <h2 style={{ margin: "0 0 8px", color: "#475569" }}>Aucun dossier pour le moment</h2>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>Démarrez votre premier projet d'architecture.</p>
          <button onClick={() => navigate("/p1")} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "12px 24px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ Démarrer un nouveau dossier</button>
        </div>
      )}

      {!loading && dossiers.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {dossiers.map(d => {
            const badge = STATUS_BADGE[d.status] || STATUS_BADGE.DRAFT;
            return (
              <div key={d.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, transition: "box-shadow 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "")}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a", lineHeight: 1.3 }}>{d.title || "Dossier sans titre"}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, background: badge.bg, color: badge.color, whiteSpace: "nowrap", marginLeft: 8 }}>{badge.label}</span>
                </div>

                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
                  {d.commune && <span>📍 {d.commune}</span>}
                  {d.commune && d.packSelected && <span> · </span>}
                  {d.packSelected && <span>🎁 {d.packSelected}</span>}
                  {!d.commune && !d.packSelected && <span style={{ fontStyle: "italic" }}>Données en cours de saisie</span>}
                </div>

                {(d.status === "NEEDS_CHANGES" || d.status === "REJECTED") && d.opsNote && (
                  <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#9a3412", marginBottom: 12 }}>
                    💬 <b>Architecte :</b> {d.opsNote.slice(0, 120)}{d.opsNote.length > 120 ? "…" : ""}
                  </div>
                )}

                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>
                  Créé le {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                  {d.submittedAt && <> · Soumis le {new Date(d.submittedAt).toLocaleDateString("fr-FR")}</>}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigate(`/p1/dossier?dossier=${d.id}`)} style={{ flex: 1, minWidth: 130, background: "#1d4ed8", color: "#fff", border: 0, padding: "9px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    📂 Ouvrir
                  </button>
                  <button onClick={() => navigate(`/p1/dossier/phases?dossier=${d.id}`)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "9px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                    📁 Documents
                  </button>
                  <button onClick={() => navigate(`/payment/start?dossier=${d.id}`)} style={{ background: "#dc2626", color: "#fff", border: 0, padding: "9px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    💳 Payer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32, padding: 14, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: 12, color: "#1e3a8a", lineHeight: 1.5 }}>
        💡 <b>Astuce :</b> chaque dossier contient vos documents de base (titre foncier, CIN, etc.) et les versions soumises par votre architecte. Vous pouvez visualiser, valider ou demander des modifications directement dans l'application.
      </div>
    </div>
  );
}
