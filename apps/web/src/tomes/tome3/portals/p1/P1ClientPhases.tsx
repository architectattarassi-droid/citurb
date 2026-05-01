import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../tome5/AuthProvider";
import { apiFetch, apiBase } from "../../../tome4/apiClient";
import FileViewer from "../../../../ui/FileViewer";

/**
 * P1ClientPhases — Vue client des sous-phases soumises
 *
 * Pour chaque sous-phase reçue (statut SOUMISE / VALIDEE / REJETEE) :
 *  - Liste les documents visibles (PDF, JPG, IFC 3D)
 *  - Visualisation in-app via FileViewer
 *  - Boutons "Valider" / "Demander modifs" si SOUMISE
 *  - Note du client si REJETEE déjà
 *
 * Route : /p1/dossier/phases?dossier=<id>
 */

type Doc = {
  id: string;
  nom: string;
  filePath: string;
  mimeType?: string;
  fileSize?: number;
  visibleClient: boolean;
  createdAt: string;
};

type SP = {
  id: string;
  phaseRef: string;
  numero: number;
  titre?: string;
  label?: string;
  statut: "SOUMISE" | "VALIDEE" | "REJETEE" | string;
  noteClient?: string | null;
  notePrestataire?: string | null;
  dateSoumission?: string | null;
  dateValidation?: string | null;
  documents: Doc[];
};

const PHASE_LABELS: Record<string, string> = {
  PHASE_01_ESQUISSE: "01 · Esquisse",
  PHASE_02_APS: "02 · APS",
  PHASE_03_APD: "03 · APD",
  PHASE_04_MANDAT_BET: "04 · Mandat BET",
  PHASE_05_AUTORISATION: "05 · Autorisation",
  PHASE_06_DOSSIER_EXECUTION: "06 · Dossier exécution",
  PHASE_07_DCE: "07 · DCE",
  PHASE_08_MANDATS: "08 · Mandats",
  PHASE_09_OUVERTURE_CHANTIER: "09 · Ouverture chantier",
  PHASE_RECEPTION_PROVISOIRE: "Récep. provisoire",
  PHASE_RECEPTION_DEFINITIVE: "Récep. définitive",
  PHASE_PERMIS_HABITER: "Permis d'habiter",
};

export default function P1ClientPhases() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dossierId = searchParams.get("dossier")
    || (auth.userId ? localStorage.getItem(`citurbarea:p1:dossierId:${auth.userId}:v1`) : null);

  const [sousPhases, setSousPhases] = useState<SP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSP, setOpenSP] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ spId: string; note: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!dossierId) {
      setError("Aucun dossier dans l'URL");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list: SP[] = await apiFetch(`/p2/dossier/${dossierId}/client/sous-phases`);
      setSousPhases(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { load(); }, [load]);

  const validate = async (spId: string) => {
    setBusy(`v-${spId}`);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/sous-phases/${spId}/client-validate`, { method: "POST" });
      await load();
    } catch (e: any) {
      alert("Erreur validation : " + (e?.message || ""));
    } finally { setBusy(null); }
  };

  const submitReject = async () => {
    if (!rejectModal || !rejectModal.note.trim()) return;
    setBusy(`r-${rejectModal.spId}`);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/sous-phases/${rejectModal.spId}/client-reject`, {
        method: "POST",
        body: { note: rejectModal.note.trim() },
      });
      setRejectModal(null);
      await load();
    } catch (e: any) {
      alert("Erreur : " + (e?.message || ""));
    } finally { setBusy(null); }
  };

  const docUrl = (sp: SP, doc: Doc) =>
    `${apiBase()}/p2/dossier/${dossierId}/sous-phases/${sp.id}/documents/${doc.id}/download`;

  const docUrlWithToken = (sp: SP, doc: Doc) => {
    const tk = localStorage.getItem("citurbarea.token") || "";
    return `${docUrl(sp, doc)}?_t=${encodeURIComponent(tk)}`;
  };

  if (!dossierId) return <div style={{ padding: 24 }}>Aucun dossier sélectionné. <button onClick={() => navigate("/p1")}>Retour</button></div>;
  if (loading) return <div style={{ padding: 24, color: "#64748b" }}>Chargement…</div>;
  if (error) return <div style={{ padding: 24, color: "#ef4444" }}>⚠️ {error} <button onClick={load} style={{ marginLeft: 12 }}>Réessayer</button></div>;

  // Group by phaseRef
  const byPhase: Record<string, SP[]> = {};
  for (const sp of sousPhases) {
    (byPhase[sp.phaseRef] ||= []).push(sp);
  }
  const phaseRefs = Object.keys(byPhase).sort();

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, color: "#0f172a" }}>📁 Documents et phases</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
            Documents soumis par votre architecte. Visualisez, validez ou demandez des modifications.
          </p>
        </div>
        <button onClick={load} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          ↻ Rafraîchir
        </button>
      </div>

      {phaseRefs.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div>Aucun document soumis pour le moment.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Votre architecte vous enverra des documents à valider lorsqu'ils seront prêts.</div>
        </div>
      )}

      {phaseRefs.map(phase => (
        <div key={phase} style={{ marginBottom: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "#0f172a", color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
            {PHASE_LABELS[phase] || phase}
          </div>

          {byPhase[phase].map(sp => {
            const isOpen = openSP === sp.id;
            const statusColor = sp.statut === "VALIDEE" ? "#22c55e" : sp.statut === "REJETEE" ? "#f59e0b" : "#3b82f6";
            const statusLabel = sp.statut === "VALIDEE" ? "✓ Validé" : sp.statut === "REJETEE" ? "⚠ Modifs demandées" : "📥 À valider";

            return (
              <div key={sp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <div onClick={() => setOpenSP(isOpen ? null : sp.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: isOpen ? "#f8fafc" : "#fff" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>v{sp.numero}</span>
                  <span style={{ flex: 1, fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{sp.titre || sp.label || `Version ${sp.numero}`}</span>
                  <span style={{ fontSize: 11, background: statusColor, color: "#fff", padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>{statusLabel}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{sp.documents.length} doc{sp.documents.length > 1 ? "s" : ""}</span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{sp.dateSoumission ? new Date(sp.dateSoumission).toLocaleDateString("fr-FR") : ""}</span>
                  <span style={{ color: "#94a3b8" }}>{isOpen ? "▾" : "▸"}</span>
                </div>

                {isOpen && (
                  <div style={{ padding: "12px 16px 18px", background: "#fafbfd", borderTop: "1px solid #e2e8f0" }}>
                    {sp.notePrestataire && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#1e40af", marginBottom: 12 }}>
                        💬 <b>Note de l'architecte :</b> {sp.notePrestataire}
                      </div>
                    )}
                    {sp.statut === "REJETEE" && sp.noteClient && (
                      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#9a3412", marginBottom: 12 }}>
                        ⚠️ <b>Vos remarques :</b> {sp.noteClient}
                      </div>
                    )}

                    <div style={{ display: "grid", gap: 12 }}>
                      {sp.documents.length === 0 && (
                        <div style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 13 }}>Aucun document attaché.</div>
                      )}
                      {sp.documents.map(doc => {
                        const docOpen = openDoc === doc.id;
                        return (
                          <div key={doc.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 18 }}>{iconFor(doc)}</span>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{doc.nom}</span>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>{doc.mimeType || "?"} · {fmtSize(doc.fileSize)}</span>
                              <button onClick={() => setOpenDoc(docOpen ? null : doc.id)} style={btnPrim(docOpen ? "Masquer" : "Visualiser")}>
                                {docOpen ? "▴ Masquer" : "👁 Visualiser"}
                              </button>
                              <a href={docUrlWithToken(sp, doc)} download={doc.nom} style={btnSec("⬇")}>⬇</a>
                            </div>
                            {docOpen && (
                              <div style={{ padding: 12, background: "#0a0f1a" }}>
                                <FileViewer url={docUrlWithToken(sp, doc)} fileName={doc.nom} mimeType={doc.mimeType} height={500} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {sp.statut === "SOUMISE" && (
                      <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setRejectModal({ spId: sp.id, note: "" })}
                          disabled={!!busy}
                          style={{ background: "#fff", border: "1px solid #f59e0b", color: "#92400e", padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                        >
                          ⚠ Demander des modifications
                        </button>
                        <button
                          onClick={() => validate(sp.id)}
                          disabled={busy === `v-${sp.id}`}
                          style={{ background: "#16a34a", border: 0, color: "#fff", padding: "10px 18px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                        >
                          {busy === `v-${sp.id}` ? "…" : "✓ Valider cette version"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {rejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%" }}>
            <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>Demander des modifications</h2>
            <p style={{ fontSize: 13, color: "#64748b" }}>Décrivez précisément les modifications souhaitées :</p>
            <textarea
              value={rejectModal.note}
              onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
              rows={6}
              placeholder="Ex : modifier la hauteur du salon, déplacer la porte du garage, ajouter une fenêtre dans la chambre 2…"
              style={{ width: "100%", padding: 10, border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setRejectModal(null)} style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Annuler</button>
              <button onClick={submitReject} disabled={!rejectModal.note.trim() || !!busy} style={{ background: "#f59e0b", border: 0, color: "#fff", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtSize(b?: number): string {
  if (!b) return "?";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

function iconFor(doc: Doc): string {
  const e = (doc.nom.split(".").pop() || "").toLowerCase();
  if (doc.mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return "🖼";
  if (e === "pdf" || doc.mimeType === "application/pdf") return "📄";
  if (e === "ifc") return "🏗";
  if (e === "dwg" || e === "dxf") return "📐";
  if (e === "rvt" || e === "pln" || e === "skp") return "🏢";
  return "📎";
}

const btnPrim = (_l: string): React.CSSProperties => ({
  background: "#1d4ed8", color: "#fff", border: 0, padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 600,
});
const btnSec = (_l: string): React.CSSProperties => ({
  background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", padding: "5px 10px", borderRadius: 5, cursor: "pointer", fontSize: 14, textDecoration: "none",
});
