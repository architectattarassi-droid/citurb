import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import ProjectMilestonesTimeline from "./ProjectMilestonesTimeline";
import PaymentFicheModal from "./PaymentFicheModal";

type Dossier = {
  id: string;
  title: string;
  commune: string | null;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  owner?: { email: string; username?: string | null; phone?: string | null; emailVerifiedAt?: string | null; phoneVerifiedAt?: string | null };
  _count?: { documents: number };
  packSelected?: string | null;
  projectId?: string | null;
  opsNote?: string | null;
  firmId?: string | null;
  firm?: { slug: string; name: string } | null;
};

type DocEntry = {
  id: string;
  docType: string;
  originalName: string;
  storedName: string;
  uploadedAt: string;
};

const DOC_LABELS: Record<string, string> = {
  doc_titre:       "Titre foncier",
  doc_cadastre:    "Plan cadastral",
  doc_contenances: "Fiche des contenances",
  doc_cin:         "CIN / Passeport",
  doc_contrat:     "Contrat architecte",
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:         { label: "Brouillon",   bg: "#1e2330", color: "#4a5568" },
  SUBMITTED:     { label: "Soumis",      bg: "rgba(251,146,60,0.15)", color: "#fb923c" },
  IN_REVIEW:     { label: "En examen",   bg: "rgba(96,165,250,0.15)", color: "#60a5fa" },
  APPROVED:      { label: "Approuvé",    bg: "rgba(52,211,153,0.15)", color: "#34d399" },
  NEEDS_CHANGES: { label: "À corriger",  bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  REJECTED:      { label: "Rejeté",      bg: "rgba(248,113,113,0.15)", color: "#f87171" },
};

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

export default function DossiersModule() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [txError, setTxError] = useState<Record<string, string>>({});
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [panelTransitioning, setPanelTransitioning] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [fichePayment, setFichePayment] = useState<any>(null);

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Dossier[]>("/p2/dossier/ops/all");
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.message ?? "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDossiers(); }, [fetchDossiers]);

  const fetchDocuments = async (id: string) => {
    setLoadingDocs(true);
    setDocuments([]);
    try {
      const res = await apiFetch<DocEntry[]>(`/p2/dossier/${id}/documents`);
      setDocuments(Array.isArray(res) ? res : []);
    } catch { /* silencieux */ } finally {
      setLoadingDocs(false);
    }
  };

  const selectDossier = (d: Dossier) => {
    setSelectedDossier(prev => prev?.id === d.id ? null : d);
    if (selectedDossier?.id !== d.id) {
      fetchDocuments(d.id);
      setPayments([]);
      apiFetch(`/p2/dossier/${d.id}/payments`)
        .then((data: any) => setPayments(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  const transitionDossier = async (dossierId: string, toStatus: string, note?: string) => {
    setPanelTransitioning(toStatus);
    try {
      const token = localStorage.getItem('citurbarea.token') || '';
      const resp = await fetch(`${API_BASE}/p3/dossier/${dossierId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toStatus, ...(note ? { note } : {}) }),
      });
      const data = await resp.json();
      if (data.ok) {
        setItems(prev => prev.map(d => d.id === dossierId ? { ...d, status: toStatus } : d));
        setSelectedDossier(prev => prev ? { ...prev, status: toStatus } : prev);
        setTransitionTarget(null);
        setTransitionNote("");
      }
    } catch (e) {
      console.error('Transition failed', e);
    } finally {
      setPanelTransitioning(null);
    }
  };

  const startReview = async (id: string) => {
    setTransitioning(id);
    setTxError(prev => { const n = { ...prev }; delete n[id]; return n; });
    try {
      await apiFetch(`/p3/dossier/${id}/transition`, { method: "POST", body: { toStatus: "IN_REVIEW" } });
      await fetchDossiers();
    } catch (e: any) {
      setTxError(prev => ({ ...prev, [id]: e?.message ?? "Erreur transition" }));
    } finally {
      setTransitioning(null);
    }
  };

  return (
    <div style={{ color: "#e8eaf0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "0.04em" }}>Dossiers</h2>
        <button onClick={fetchDossiers} style={btnStyle("#1e2330", "#8892a4")} disabled={loading}>
          {loading ? "…" : "↺ Rafraîchir"}
        </button>
      </div>

      {error && <div style={{ padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid #f87171", borderRadius: 8, color: "#f87171", marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {loading && items.length === 0 ? (
        <div style={{ color: "#4a5568", fontSize: 13, padding: 24, textAlign: "center" }}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#4a5568", fontSize: 13, padding: 24, textAlign: "center" }}>Aucun dossier.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e2330", color: "#4a5568", textAlign: "left" }}>
              {["ID", "Titre", "Client", "Statut", "Cabinet", "Docs", "Soumis le", "Action"].map(h => (
                <th key={h} style={{ padding: "8px 12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(d => {
              const badge = STATUS_BADGE[d.status] ?? STATUS_BADGE.DRAFT;
              const isSelected = selectedDossier?.id === d.id;
              return (
                <React.Fragment key={d.id}>
                  <tr
                    style={{ borderBottom: "1px solid #131820", cursor: "pointer", background: isSelected ? "rgba(96,165,250,0.05)" : undefined }}
                    onClick={() => selectDossier(d)}
                    onDoubleClick={() => navigate(`/cc/dossiers/${d.id}`)}
                  >
                    <td style={td}>
                      <span style={{ fontFamily: "monospace", color: "#4a5568", fontSize: 10 }}>{d.id.slice(0, 8)}…</span>
                      <button onClick={e => { e.stopPropagation(); navigate(`/cc/dossiers/${d.id}`); }} style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #1e40af', borderRadius: 3, cursor: 'pointer' }}>→</button>
                    </td>
                    <td style={td}>{d.title}</td>
                    <td style={td}>
                      <span style={{ color: "#8892a4" }}>{d.owner?.email ?? "—"}</span>
                      {d.owner?.emailVerifiedAt
                        ? <span style={{ marginLeft: 6, fontSize: 10, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✓ email</span>
                        : <span style={{ marginLeft: 6, fontSize: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✗ email</span>
                      }
                      {d.owner?.phone && (
                        d.owner?.phoneVerifiedAt
                          ? <span style={{ marginLeft: 4, fontSize: 10, background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✓ tel</span>
                          : <span style={{ marginLeft: 4, fontSize: 10, background: '#fef9c3', color: '#854d0e', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>✗ tel</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={td}>
                      {d.firm
                        ? <span style={{ fontSize: 10, background: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderRadius: 4, padding: '1px 6px' }}>{d.firm.slug}</span>
                        : <span style={{ color: '#4a5568' }}>—</span>
                      }
                    </td>
                    <td style={td}>
                      <span style={{ color: (d._count?.documents ?? 0) > 0 ? "#34d399" : "#4a5568" }}>
                        {d._count?.documents ?? 0}
                      </span>
                    </td>
                    <td style={td}>{d.submittedAt ? new Date(d.submittedAt).toLocaleDateString("fr-MA") : "—"}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      {d.status === "SUBMITTED" && (
                        <div>
                          <button
                            onClick={() => startReview(d.id)}
                            disabled={transitioning === d.id}
                            style={btnStyle("rgba(96,165,250,0.15)", "#60a5fa")}
                          >
                            {transitioning === d.id ? "…" : "Passer en review"}
                          </button>
                          {txError[d.id] && <div style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{txError[d.id]}</div>}
                        </div>
                      )}
                    </td>
                  </tr>
                  {isSelected && (
                    <tr style={{ background: "#0d1117" }}>
                      <td colSpan={7} style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Documents — {d.title}
                        </div>
                        {loadingDocs ? (
                          <div style={{ color: "#4a5568", fontSize: 12 }}>Chargement…</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.entries(DOC_LABELS).map(([type, label]) => {
                              const doc = documents.find(x => x.docType === type);
                              return (
                                <div key={type} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 12px", borderRadius: 6, background: "#131820", border: `1px solid ${doc ? "rgba(52,211,153,0.2)" : "#1e2330"}` }}>
                                  <span style={{ fontSize: 13 }}>{doc ? "✅" : "⏳"}</span>
                                  <span style={{ flex: 1, fontSize: 12, color: doc ? "#e8eaf0" : "#4a5568" }}>{label}</span>
                                  {doc ? (
                                    <>
                                      <span style={{ fontSize: 11, color: "#4a5568" }}>{doc.originalName} · {new Date(doc.uploadedAt).toLocaleDateString("fr-MA")}</span>
                                      <button
                                        onClick={() => window.open(`${API_BASE}/uploads/dossiers/${doc.storedName}`, "_blank")}
                                        style={btnStyle("rgba(52,211,153,0.1)", "#34d399")}
                                      >
                                        Voir
                                      </button>
                                    </>
                                  ) : (
                                    <span style={{ fontSize: 11, color: "#4a5568" }}>Manquant</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {d.status === 'IN_REVIEW' && (
                          <div style={{ marginTop: 16, padding: 12, background: "#0d1520", borderRadius: 8, border: "1px solid #1e2330" }}>
                            <div style={{ fontWeight: 700, marginBottom: 10, color: "#8892a4", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>⚙️ Action OPS</div>
                            {transitionTarget === null ? (
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => transitionDossier(d.id, 'APPROVED')}
                                  disabled={!!panelTransitioning}
                                  style={btnStyle("rgba(52,211,153,0.15)", "#34d399")}>
                                  {panelTransitioning === 'APPROVED' ? '…' : '✅ Approuver'}
                                </button>
                                <button onClick={() => setTransitionTarget('NEEDS_CHANGES')}
                                  disabled={!!panelTransitioning}
                                  style={btnStyle("rgba(251,191,36,0.15)", "#fbbf24")}>
                                  ⚠️ Demander corrections
                                </button>
                                <button onClick={() => setTransitionTarget('REJECTED')}
                                  disabled={!!panelTransitioning}
                                  style={btnStyle("rgba(248,113,113,0.15)", "#f87171")}>
                                  ❌ Rejeter
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 600, color: transitionTarget === 'REJECTED' ? '#f87171' : '#fbbf24' }}>
                                  {transitionTarget === 'REJECTED' ? '❌ Motif de rejet' : '⚠️ Corrections demandées'}
                                </div>
                                <textarea
                                  value={transitionNote}
                                  onChange={e => setTransitionNote(e.target.value)}
                                  placeholder="Décrivez les corrections nécessaires ou le motif de rejet…"
                                  style={{ width: "100%", minHeight: 72, padding: 8, borderRadius: 6, border: "1px solid #1e2330", fontSize: 12, resize: "vertical", boxSizing: "border-box", background: "#131820", color: "#e8eaf0" }}
                                />
                                {d.opsNote && (
                                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, padding: '4px 8px', background: '#0d1520', borderRadius: 4, border: '1px solid #1e2330' }}>
                                    📝 Note précédente : {d.opsNote}
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                  <button
                                    onClick={() => transitionDossier(d.id, transitionTarget, transitionNote)}
                                    disabled={!!panelTransitioning || !transitionNote.trim()}
                                    style={btnStyle(transitionTarget === 'REJECTED' ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)", transitionTarget === 'REJECTED' ? '#f87171' : '#fbbf24')}>
                                    {panelTransitioning ? '…' : 'Confirmer'}
                                  </button>
                                  <button onClick={() => { setTransitionTarget(null); setTransitionNote(""); }}
                                    style={btnStyle("#1e2330", "#8892a4")}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {payments.length > 0 && (
                          <div style={{ marginTop: 12, padding: 10, background: '#0d1520', borderRadius: 6, border: '1px solid #1e2330' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#8892a4', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>💳 Paiements</div>
                            {payments.map((p: any) => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#e8eaf0', padding: '3px 0', borderBottom: '1px solid #1e2330' }}>
                                <span style={{ fontWeight: 600 }}>{p.mode}</span>
                                <span>{p.amount} {p.currency}</span>
                                <span style={{ color: p.status === 'CONFIRMED' ? '#34d399' : p.status === 'REJECTED' ? '#f87171' : '#fbbf24' }}>{p.status}</span>
                                {(p.mode === 'CASH' || p.mode === 'CHEQUE') && (
                                  <button onClick={() => setFichePayment(p)} style={{ fontSize: 10, padding: '1px 6px', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }}>📄 Fiche</button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {d.projectId && (
                          <div style={{ marginTop: 16, borderTop: '1px solid #1e2330', paddingTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#8892a4', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                              Jalons du projet
                            </div>
                            <ProjectMilestonesTimeline projectId={d.projectId} isOps={true} onAdvance={() => {}} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      {fichePayment && (
        <PaymentFicheModal
          payment={fichePayment}
          dossier={selectedDossier || { id: '', title: '', commune: '' }}
          onClose={() => setFichePayment(null)}
        />
      )}
    </div>
  );
}

const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { padding: "5px 12px", background: bg, color, border: `1px solid ${color}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" };
}
