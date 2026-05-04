import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, apiBase } from "../../../tomes/tome4/apiClient";
import RokhasPhaseTimeline from "../../../tomes/tome2/RokhasPhaseTimeline";
import FileViewer from "../../../ui/FileViewer";
import UploadButton from "../../../ui/UploadButton";

/**
 * DossierShadowView — Admin Shadow Mode
 *
 * Affiche EXACTEMENT ce que voit le client pour son dossier (status banner,
 * note OPS, timeline Rokhas en mode client, sous-phases) + un panneau admin
 * latéral avec actions de déblocage (forcer statut, effacer note OPS, etc.).
 *
 * Route: /cc/dossiers/:id/shadow
 * Auth: protégé par CCGuard (token requis), endpoints admin protégés ADMIN/OWNER côté API.
 */

const STATUSES = ["DRAFT", "SUBMITTED", "IN_REVIEW", "NEEDS_CHANGES", "APPROVED", "REJECTED"];

export default function DossierShadowView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [opsNoteDraft, setOpsNoteDraft] = useState("");

  const load = async () => {
    if (!id) {
      setError("Aucun ID de dossier dans l'URL");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d: any = await apiFetch(`/p2/dossier/${id}/complet`);
      if (!d || typeof d !== "object" || !d.id) {
        setError(`Réponse inattendue de l'API (id reçu: ${id}). Réponse: ${JSON.stringify(d).slice(0, 200)}`);
      } else {
        setDossier(d);
        setOpsNoteDraft(d?.opsNote || "");
      }
    } catch (e: any) {
      setError(`API ${e?.status || "?"} sur /p2/dossier/${id}/complet — ${e?.message || "erreur inconnue"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const callAdmin = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      await fn();
      await load();
    } catch (e: any) {
      alert("Erreur " + label + ": " + (e?.message || "inconnue"));
    } finally {
      setBusy(null);
    }
  };

  const unblock = () => callAdmin("unblock", () =>
    apiFetch(`/p2/dossier/${id}/admin/unblock`, { method: "POST", body: { newStatus: "DRAFT", clearOpsNote: true } })
  );

  const setStatus = (status: string) => callAdmin("setStatus", () =>
    apiFetch(`/p2/dossier/${id}/admin/patch`, { method: "PATCH", body: { status } })
  );

  const saveOpsNote = () => callAdmin("opsNote", () =>
    apiFetch(`/p2/dossier/${id}/admin/patch`, { method: "PATCH", body: { opsNote: opsNoteDraft || null } })
  );

  if (loading) return <div style={{ padding: 24, color: "#94a3b8", background: "#0d1117", height: "100%" }}>Chargement…</div>;
  if (error)   return (
    <div style={{ padding: 24, color: "#ef4444", background: "#0d1117", height: "100%" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>⚠️ Erreur</div>
      <div style={{ fontSize: 13, color: "#fca5a5", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{error}</div>
      <div style={{ marginTop: 16, fontSize: 11, color: "#64748b" }}>URL : {window.location.pathname} · ID param : {id || "(vide)"}</div>
      <button onClick={load} style={{ marginTop: 16, background: "#1d4ed8", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>Réessayer</button>
    </div>
  );
  if (!dossier) return (
    <div style={{ padding: 24, color: "#94a3b8", background: "#0d1117", height: "100%" }}>
      Dossier introuvable
      <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>ID demandé: {id || "(vide)"}</div>
      <button onClick={load} style={{ marginTop: 16, background: "#1d4ed8", color: "#fff", border: 0, padding: "8px 14px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>Réessayer</button>
    </div>
  );

  const apiStatus: string = dossier.status;
  const opsNote: string | null = dossier.opsNote;
  const statusColor =
    apiStatus === "REJECTED" ? "#ef4444"
    : apiStatus === "APPROVED" ? "#22c55e"
    : apiStatus === "NEEDS_CHANGES" ? "#f59e0b"
    : "#3b82f6";

  return (
    <div style={{ display: "flex", height: "100%", background: "#0d1117", color: "#e8eaf0", overflow: "hidden" }}>

      {/* ─── PANNEAU GAUCHE : VUE EXACTE CLIENT ─── */}
      <div style={{ flex: 1, overflowY: "auto", borderRight: "1px solid #1e2330" }}>
        <div style={{ background: "#1d4ed8", color: "#fff", padding: "10px 20px", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
          🔍 SHADOW VIEW — CE QUE VOIT EXACTEMENT LE CLIENT
        </div>

        <div style={{ padding: "8px 20px", background: "#f0f9ff", color: "#0369a1", borderBottom: "1px solid #bae6fd", display: "flex", gap: 20, fontSize: 12, flexWrap: "wrap" }}>
          <span><b>Statut DB :</b> {apiStatus}</span>
          {dossier.packSelected && <span><b>Pack :</b> {dossier.packSelected}{dossier.packPriceMAD ? ` — ${Number(dossier.packPriceMAD).toLocaleString("fr-FR")} MAD` : ""}</span>}
          <span><b>Owner :</b> {dossier.owner?.email || "—"}</span>
        </div>

        {(apiStatus === "NEEDS_CHANGES" || apiStatus === "REJECTED") && opsNote && (
          <div style={{ margin: "12px 20px", padding: "10px 14px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, fontSize: 13, color: "#854d0e" }}>
            <strong>Message de votre architecte :</strong><br />
            {opsNote}
          </div>
        )}

        {id && <BaseDossierDocsSection dossierId={id} dossier={dossier} onChange={load} />}

        {id && <RokhasPhaseTimeline dossierId={id} mode="client" />}

        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0 }}>Sous-phases & Documents</h3>
          {(dossier.sousPhases || []).map((sp: any) => (
            <SousPhaseCard key={sp.id} sp={sp} dossierId={id!} onChange={load} />
          ))}
          {(!dossier.sousPhases || dossier.sousPhases.length === 0) && (
            <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 12 }}>Aucune sous-phase pour ce dossier</div>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>
          <h3 style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0 }}>Documents ({(dossier.documents || []).length})</h3>
          {(dossier.documents || []).slice(0, 8).map((doc: any) => (
            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2330", fontSize: 12 }}>
              <span>{doc.docType || doc.storedName || doc.id}</span>
              <span style={{ color: "#64748b" }}>{doc.uploadedAt && new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</span>
            </div>
          ))}
          {(!dossier.documents || dossier.documents.length === 0) && (
            <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 12 }}>Aucun document</div>
          )}
        </div>
      </div>

      {/* ─── PANNEAU DROIT : ACTIONS ADMIN ─── */}
      <aside style={{ width: 380, padding: 16, background: "#090e18", overflowY: "auto", flexShrink: 0 }}>
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => navigate(`/cc/dossiers/${id}`)} style={{ background: "#1e2330", color: "#94a3b8", border: 0, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
            ← PhaseWorkspace (vue admin classique)
          </button>
        </div>

        <h2 style={{ fontSize: 13, color: "#60a5fa", marginTop: 0, textTransform: "uppercase", letterSpacing: 2 }}>🛠️ Actions Admin</h2>

        <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Statut courant</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: statusColor }}>{apiStatus}</div>
        </div>

        <div style={{ background: "#111827", border: "1px solid #991b1b", borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#fca5a5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>⚡ Déblocage rapide</div>
          <button
            onClick={unblock}
            disabled={busy === "unblock"}
            style={{ width: "100%", background: "#dc2626", color: "#fff", border: 0, padding: "10px 14px", borderRadius: 6, cursor: busy === "unblock" ? "wait" : "pointer", fontWeight: 700, fontSize: 12 }}
          >
            {busy === "unblock" ? "Déblocage…" : "Débloquer le dossier (→ DRAFT, ops note effacée)"}
          </button>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 8, lineHeight: 1.4 }}>
            Remet le dossier en brouillon et efface le message OPS — le client peut alors reprendre la main.
          </div>
        </div>

        <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Forcer un statut</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                disabled={s === apiStatus || busy === "setStatus"}
                style={{
                  background: s === apiStatus ? "#0a0f1a" : "#1e2330",
                  color: s === apiStatus ? "#4a5568" : "#e8eaf0",
                  border: 0, padding: "5px 10px", borderRadius: 4,
                  cursor: s === apiStatus ? "not-allowed" : "pointer",
                  fontSize: 11,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Note OPS</div>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>Visible côté client uniquement si NEEDS_CHANGES ou REJECTED</div>
          <textarea
            value={opsNoteDraft}
            onChange={(e) => setOpsNoteDraft(e.target.value)}
            rows={4}
            placeholder="Ex: documents manquants…"
            style={{ width: "100%", background: "#0a0f1a", color: "#e8eaf0", border: "1px solid #1e2330", borderRadius: 4, padding: 8, fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }}
          />
          <button
            onClick={saveOpsNote}
            disabled={busy === "opsNote"}
            style={{ marginTop: 6, background: "#1d4ed8", color: "#fff", border: 0, padding: "6px 12px", borderRadius: 4, cursor: busy === "opsNote" ? "wait" : "pointer", fontSize: 12 }}
          >
            {busy === "opsNote" ? "Sauvegarde…" : "Enregistrer note"}
          </button>
        </div>

        <ContractGeneratorBlock dossierId={dossier.id} />

        <VisaCroaBlock dossierId={dossier.id} />

        <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
          <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Métadonnées</div>
          <div><b>ID :</b> {dossier.id}</div>
          <div><b>Owner :</b> {dossier.owner?.email || "—"}</div>
          <div><b>Pack :</b> {dossier.packSelected || "—"}</div>
          <div><b>Phase :</b> {dossier.phase || "—"}</div>
          <div><b>Créé :</b> {dossier.createdAt && new Date(dossier.createdAt).toLocaleString("fr-FR")}</div>
          <div><b>MAJ :</b> {dossier.updatedAt && new Date(dossier.updatedAt).toLocaleString("fr-FR")}</div>
        </div>
      </aside>
    </div>
  );
}

// ─── SousPhaseCard : carte sous-phase + upload + viewer (admin) ─────────────
function SousPhaseCard({ sp, dossierId, onChange }: { sp: any; dossierId: string; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const docUrl = (docId: string) => {
    const tk = localStorage.getItem("citurbarea.token") || "";
    return `${apiBase()}/p2/dossier/${dossierId}/sous-phases/${sp.id}/documents/${docId}/download?_t=${encodeURIComponent(tk)}`;
  };

  const adminAction = async (action: "soumettre" | "valider" | "rejeter", note?: string) => {
    setBusy(action);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/sous-phases/${sp.id}/${action}`, {
        method: "POST",
        body: note ? { note } : {},
      });
      onChange();
    } catch (e: any) {
      alert("Erreur : " + (e?.message || ""));
    } finally { setBusy(null); }
  };

  const statColor =
    sp.statut === "VALIDEE" ? "#22c55e"
    : sp.statut === "REJETEE" ? "#ef4444"
    : sp.statut === "SOUMISE" ? "#f59e0b"
    : "#60a5fa";

  return (
    <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>v{sp.numero}</span>
        <span style={{ flex: 1, fontWeight: 500 }}>{sp.titre || sp.label}</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{(sp.documents || []).length} doc{(sp.documents || []).length > 1 ? "s" : ""}</span>
        <span style={{ background: statColor, color: "#fff", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{sp.statut}</span>
        <span style={{ color: "#94a3b8" }}>{open ? "▾" : "▸"}</span>
      </div>

      {open && (
        <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #1e2330" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{sp.phaseRef}</div>

          {sp.notePrestataire && (
            <div style={{ background: "#1e293b", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#cbd5e1", marginBottom: 10 }}>
              💬 <b>Note prestataire :</b> {sp.notePrestataire}
            </div>
          )}
          {sp.noteClient && (
            <div style={{ background: "#3a1a1a", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#fca5a5", marginBottom: 10 }}>
              ⚠️ <b>Note client (rejet) :</b> {sp.noteClient}
            </div>
          )}

          {/* Documents */}
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {(sp.documents || []).map((doc: any) => {
              const isOpen = openDoc === doc.id;
              return (
                <div key={doc.id} style={{ background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6 }}>
                  <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{iconFor(doc.nom, doc.mimeType)}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{doc.nom || doc.filePath}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{doc.mimeType?.split("/")[1] || "?"} · {fmtSizeAdmin(doc.fileSize)}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: doc.visibleClient ? "#16a34a" : "#64748b", color: "#fff" }}>
                      {doc.visibleClient ? "👁 visible client" : "🔒 admin only"}
                    </span>
                    <button onClick={() => setOpenDoc(isOpen ? null : doc.id)} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>
                      {isOpen ? "▴ Masquer" : "👁 Voir"}
                    </button>
                  </div>
                  {isOpen && (
                    <div style={{ padding: 10 }}>
                      <FileViewer url={docUrl(doc.id)} fileName={doc.nom || doc.filePath} mimeType={doc.mimeType} height={450} />
                    </div>
                  )}
                </div>
              );
            })}
            {(!sp.documents || sp.documents.length === 0) && (
              <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 12, padding: 8 }}>Aucun document</div>
            )}
          </div>

          {/* Upload + Actions admin */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #1e2330", paddingTop: 10, alignItems: "flex-start" }}>
            <UploadButton
              url={`${apiBase()}/p2/dossier/${dossierId}/sous-phases/${sp.id}/documents`}
              headers={{ Authorization: `Bearer ${localStorage.getItem("citurbarea.token") || ""}` }}
              maxSizeMB={500}
              label="📎 Uploader fichier"
              onComplete={() => onChange()}
              onError={(e) => alert("Upload échoué : " + e.message)}
            />

            {sp.statut === "EN_COURS" && (
              <button onClick={() => adminAction("soumettre")} disabled={busy !== null} style={{ background: "#f59e0b", color: "#fff", border: 0, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                {busy === "soumettre" ? "…" : "📤 Envoyer au client"}
              </button>
            )}
            {sp.statut === "SOUMISE" && (
              <>
                <button onClick={() => adminAction("valider", "Validé par admin")} disabled={busy !== null} style={{ background: "#16a34a", color: "#fff", border: 0, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                  ✓ Valider direct
                </button>
                <button onClick={() => { const n = prompt("Note de rejet:"); if (n) adminAction("rejeter", n); }} disabled={busy !== null} style={{ background: "#dc2626", color: "#fff", border: 0, padding: "6px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>
                  ✕ Rejeter
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 10, color: "#64748b" }}>
            Soumise : {sp.dateSoumission ? new Date(sp.dateSoumission).toLocaleString("fr-FR") : "—"} · Validée : {sp.dateValidation ? new Date(sp.dateValidation).toLocaleString("fr-FR") : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BaseDossierDocsSection : docs de base du dossier (titre foncier, etc.) ──
const BASE_DOC_TYPES = [
  { key: "doc_titre",       label: "Titre foncier / Attestation propriété", required: true },
  { key: "doc_cadastre",    label: "Plan cadastral",                         required: true },
  { key: "doc_contenances", label: "Fiche des contenances",                  required: true },
  { key: "doc_cin",         label: "CIN / Passeport copie",                  required: true },
  { key: "doc_contrat",     label: "Contrat architecte",                     required: true },
  { key: "doc_autres",      label: "Autres documents",                       required: false },
];

function BaseDossierDocsSection({ dossierId, dossier, onChange }: { dossierId: string; dossier: any; onChange: () => void }) {
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const docs: any[] = dossier.documents || [];

  const docUrl = (doc: any) => {
    const tk = localStorage.getItem("citurbarea.token") || "";
    return `${apiBase()}/uploads/dossiers/${doc.storedName}?_t=${encodeURIComponent(tk)}`;
  };

  const findDoc = (type: string) => docs.find(d => d.docType === type);
  const tk = localStorage.getItem("citurbarea.token") || "";

  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2330" }}>
      <h3 style={{ fontSize: 13, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 0, marginBottom: 12 }}>
        📁 Documents de base ({docs.length})
      </h3>
      <div style={{ display: "grid", gap: 8 }}>
        {BASE_DOC_TYPES.map((dt) => {
          const doc = findDoc(dt.key);
          const isOpen = openDoc === dt.key;
          return (
            <div key={dt.key} style={{ background: doc ? "#0a1f10" : "#1e2330", border: `1px solid ${doc ? "#16a34a" : "#3a3a4a"}`, borderRadius: 6 }}>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{doc ? "✅" : (dt.required ? "⚠️" : "•")}</span>
                <span style={{ flex: 1, fontSize: 13, color: doc ? "#e8eaf0" : "#94a3b8", fontWeight: dt.required ? 600 : 400 }}>
                  {dt.label}
                  {dt.required && !doc && <span style={{ marginLeft: 6, fontSize: 10, color: "#fbbf24" }}>(requis, manquant)</span>}
                </span>
                {doc && (
                  <>
                    <span style={{ fontSize: 10, color: "#64748b" }}>{doc.originalName} · {fmtSizeAdmin(doc.sizeBytes)}</span>
                    <button onClick={() => setOpenDoc(isOpen ? null : dt.key)} style={{ background: "#1d4ed8", color: "#fff", border: 0, padding: "3px 9px", borderRadius: 3, cursor: "pointer", fontSize: 11 }}>
                      {isOpen ? "▴" : "👁 Voir"}
                    </button>
                    <a href={docUrl(doc)} download={doc.originalName} style={{ background: "#1e2330", color: "#94a3b8", padding: "3px 8px", borderRadius: 3, fontSize: 11, textDecoration: "none" }}>⬇</a>
                  </>
                )}
                {!doc && (
                  <UploadButton
                    url={`${apiBase()}/p2/dossier/${dossierId}/documents?docType=${dt.key}`}
                    headers={{ Authorization: `Bearer ${tk}` }}
                    label="📎 Ajouter"
                    maxSizeMB={50}
                    onComplete={() => onChange()}
                    onError={(e) => alert("Upload échoué : " + e.message)}
                  />
                )}
              </div>
              {isOpen && doc && (
                <div style={{ padding: 8 }}>
                  <FileViewer url={docUrl(doc)} fileName={doc.originalName} mimeType={doc.mimeType} height={420} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
        💡 Ces documents sont uploadés depuis l'espace client OU directement par l'admin ici. Ils sont visibles dans les deux interfaces (front + back).
      </div>
    </div>
  );
}

function fmtSizeAdmin(b?: number): string {
  if (!b) return "?";
  if (b < 1024) return `${b}o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}Ko`;
  return `${(b / 1024 / 1024).toFixed(1)}Mo`;
}

// ─── ContractGeneratorBlock — admin sidebar bloc "Générer contrat type" ────
function ContractGeneratorBlock({ dossierId }: { dossierId: string }) {
  const [show, setShow] = useState(false);
  const [params, setParams] = useState({
    contratNumero: "",
    croaName: "",
    archNom: "",
    archCIN: "",
    archDomicile: "",
    archAutorisation: "",
    archAutorisationAnnee: "",
    archICE: "",
    archRC: "",
    archCNSS: "",
    archTel: "",
    archEmail: "",
    delaiEtudesJours: "",
    delaiTravauxMois: "",
    penaliteMOPourcentJour: "",
    penaliteMOEPourcentJour: "",
  });
  const set = (k: keyof typeof params) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setParams((p) => ({ ...p, [k]: e.target.value }));

  const open = () => {
    const tk = localStorage.getItem("citurbarea.token") || "";
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
    qs.append("_t", tk);
    const url = `${apiBase()}/p2/dossiers/${dossierId}/contrat?${qs.toString()}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Contrat type unifié CNOA</div>
        <button onClick={() => setShow((s) => !s)} style={{ background: "transparent", border: 0, color: "#a78bfa", fontSize: 11, cursor: "pointer" }}>
          {show ? "Masquer ▲" : "Configurer ▼"}
        </button>
      </div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
        Génère le contrat HTML imprimable (Construction CNOA 2024). Surface, honoraires et phases sont auto-remplis depuis le devis du dossier.
      </div>

      {show && (
        <div style={{ marginTop: 10, fontSize: 11 }}>
          <Sub label="N° contrat"><Inp v={params.contratNumero} onChange={set("contratNumero")} placeholder="2026-P2-0001" /></Sub>
          <Sub label="CROA territorial"><Inp v={params.croaName} onChange={set("croaName")} placeholder="CROA Rabat" /></Sub>
          <div style={{ fontSize: 9, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 4px" }}>Architecte (Maître d'Œuvre)</div>
          <Sub label="Nom complet"><Inp v={params.archNom} onChange={set("archNom")} placeholder="Mr. Yassine Attarassi" /></Sub>
          <Sub label="N° autorisation Ordre"><Inp v={params.archAutorisation} onChange={set("archAutorisation")} placeholder="1234" /></Sub>
          <Sub label="Année autorisation"><Inp v={params.archAutorisationAnnee} onChange={set("archAutorisationAnnee")} placeholder="2018" /></Sub>
          <Sub label="CIN"><Inp v={params.archCIN} onChange={set("archCIN")} placeholder="A123456" /></Sub>
          <Sub label="ICE"><Inp v={params.archICE} onChange={set("archICE")} placeholder="0000…" /></Sub>
          <Sub label="RC"><Inp v={params.archRC} onChange={set("archRC")} placeholder="…" /></Sub>
          <Sub label="CNSS"><Inp v={params.archCNSS} onChange={set("archCNSS")} placeholder="…" /></Sub>
          <Sub label="Domicile cabinet"><Inp v={params.archDomicile} onChange={set("archDomicile")} placeholder="Adresse cabinet" /></Sub>
          <Sub label="Téléphone"><Inp v={params.archTel} onChange={set("archTel")} placeholder="+212…" /></Sub>
          <Sub label="Email"><Inp v={params.archEmail} onChange={set("archEmail")} placeholder="contact@cabinet.ma" /></Sub>
          <div style={{ fontSize: 9, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 4px" }}>Délais & pénalités (Article 8)</div>
          <Sub label="Délai études (jours ouvrables)"><Inp v={params.delaiEtudesJours} onChange={set("delaiEtudesJours")} type="number" placeholder="60" /></Sub>
          <Sub label="Délai travaux (mois)"><Inp v={params.delaiTravauxMois} onChange={set("delaiTravauxMois")} type="number" placeholder="12" /></Sub>
          <Sub label="Pénalité MO (%/jour)"><Inp v={params.penaliteMOPourcentJour} onChange={set("penaliteMOPourcentJour")} type="number" placeholder="0.05" /></Sub>
          <Sub label="Pénalité Architecte (%/jour)"><Inp v={params.penaliteMOEPourcentJour} onChange={set("penaliteMOEPourcentJour")} type="number" placeholder="0.05" /></Sub>
        </div>
      )}

      <button
        onClick={open}
        style={{ marginTop: 10, background: "#7c3aed", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}
      >
        📄 Générer contrat (nouvel onglet)
      </button>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, lineHeight: 1.4 }}>
        Une fois ouvert, l'architecte clique <strong>Imprimer / Sauvegarder en PDF</strong> dans la barre haut.
      </div>
    </div>
  );
}

function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 6 }}>
      <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>
      <div style={{ marginTop: 2 }}>{children}</div>
    </label>
  );
}

function Inp(props: { v: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string }) {
  return (
    <input
      value={props.v}
      onChange={props.onChange}
      placeholder={props.placeholder}
      type={props.type || "text"}
      style={{ width: "100%", background: "#0a0f1a", color: "#e8eaf0", border: "1px solid #1e2330", borderRadius: 4, padding: "6px 8px", fontSize: 11, fontFamily: "inherit", boxSizing: "border-box" }}
    />
  );
}

// ─── VisaCroaBlock — admin sidebar bloc visa CROA (Chap V RI CNOA, J-15) ────
type VisaStatus = "NON_DEMANDE" | "DEMANDE_ENVOYEE" | "EN_COURS" | "OBTENU" | "REFUSE" | "EXPIRE";

const VISA_LABELS: Record<VisaStatus, { label: string; color: string; bg: string }> = {
  NON_DEMANDE: { label: "Non demandé", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  DEMANDE_ENVOYEE: { label: "Demande envoyée", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  EN_COURS: { label: "En cours d'examen", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  OBTENU: { label: "Visa obtenu ✓", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  REFUSE: { label: "Refusé", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  EXPIRE: { label: "Délai dépassé", color: "#dc2626", bg: "rgba(220,38,38,0.2)" },
};

function VisaCroaBlock({ dossierId }: { dossierId: string }) {
  const [state, setState] = useState<any>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState({
    status: "" as VisaStatus | "",
    croaName: "",
    numero: "",
    dateDemande: "",
    dateObtention: "",
    motifRefus: "",
    scanUrl: "",
    note: "",
  });

  const load = async () => {
    try {
      const r: any = await apiFetch(`/p2/dossiers/${dossierId}/visa-croa`);
      setState(r.visaCroa);
      setDaysRemaining(r.daysRemaining);
      if (r.visaCroa?.croaName) setDraft((d) => ({ ...d, croaName: d.croaName || r.visaCroa.croaName }));
      if (r.visaCroa?.numero) setDraft((d) => ({ ...d, numero: d.numero || r.visaCroa.numero }));
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement");
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [dossierId]);

  const save = async () => {
    setBusy(true); setErr("");
    try {
      const body: any = {};
      if (draft.status) body.status = draft.status;
      if (draft.croaName) body.croaName = draft.croaName;
      if (draft.numero) body.numero = draft.numero;
      if (draft.dateDemande) body.dateDemande = new Date(draft.dateDemande).toISOString();
      if (draft.dateObtention) body.dateObtention = new Date(draft.dateObtention).toISOString();
      if (draft.motifRefus) body.motifRefus = draft.motifRefus;
      if (draft.scanUrl) body.scanUrl = draft.scanUrl;
      if (draft.note) body.note = draft.note;
      const r: any = await apiFetch(`/p2/dossiers/${dossierId}/visa-croa`, { method: "PATCH", body });
      setState(r.visaCroa);
      setDaysRemaining(r.daysRemaining);
      setDraft({ status: "", croaName: r.visaCroa?.croaName || "", numero: r.visaCroa?.numero || "", dateDemande: "", dateObtention: "", motifRefus: "", scanUrl: "", note: "" });
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const status = (state?.status || "NON_DEMANDE") as VisaStatus;
  const cfg = VISA_LABELS[status] ?? VISA_LABELS.NON_DEMANDE;
  const isPending = status === "DEMANDE_ENVOYEE" || status === "EN_COURS";
  const dangerDays = daysRemaining != null && daysRemaining <= 3;
  const expired = daysRemaining != null && daysRemaining < 0;

  return (
    <div style={{ background: "#111827", border: "1px solid #1e2330", borderRadius: 6, padding: 14, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Visa CROA (Chap V RI CNOA)</div>
        <button onClick={() => setShow((s) => !s)} style={{ background: "transparent", border: 0, color: "#a78bfa", fontSize: 11, cursor: "pointer" }}>
          {show ? "Masquer ▲" : "Modifier ▼"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
          {cfg.label}
        </span>
        {state?.numero && <span style={{ fontSize: 11, color: "#9ca3af" }}>n° {state.numero}</span>}
        {state?.croaName && <span style={{ fontSize: 10, color: "#6b7280" }}>· {state.croaName}</span>}
      </div>

      {isPending && daysRemaining != null && (
        <div style={{ marginTop: 8, fontSize: 11, color: expired ? "#fca5a5" : (dangerDays ? "#fcd34d" : "#9ca3af") }}>
          {expired
            ? `⚠ Délai 15j dépassé de ${Math.abs(daysRemaining)} j (limite ${state.dateLimite?.slice(0, 10)})`
            : dangerDays
              ? `⚠ Plus que ${daysRemaining} j (limite ${state.dateLimite?.slice(0, 10)})`
              : `${daysRemaining} j restants — limite ${state.dateLimite?.slice(0, 10)}`}
        </div>
      )}

      {state?.dateObtention && (
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 6 }}>Obtenu le {state.dateObtention.slice(0, 10)}</div>
      )}
      {state?.scanUrl && (
        <a href={state.scanUrl} target="_blank" rel="noopener" style={{ display: "inline-block", marginTop: 6, color: "#a78bfa", fontSize: 11, textDecoration: "none" }}>
          📄 Voir scan visa
        </a>
      )}

      {show && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e2330", fontSize: 11 }}>
          {err && <div style={{ color: "#fca5a5", fontSize: 11, marginBottom: 8 }}>⚠ {err}</div>}

          <Sub label="Changer statut">
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as any })}
              style={{ width: "100%", background: "#0a0f1a", color: "#e8eaf0", border: "1px solid #1e2330", borderRadius: 4, padding: "6px 8px", fontSize: 11, fontFamily: "inherit" }}
            >
              <option value="">— Conserver —</option>
              {(Object.keys(VISA_LABELS) as VisaStatus[]).map((s) => (
                <option key={s} value={s}>{VISA_LABELS[s].label}</option>
              ))}
            </select>
          </Sub>

          <Sub label="CROA territorial"><Inp v={draft.croaName} onChange={(e) => setDraft({ ...draft, croaName: e.target.value })} placeholder="CROA Rabat" /></Sub>
          <Sub label="N° visa"><Inp v={draft.numero} onChange={(e) => setDraft({ ...draft, numero: e.target.value })} placeholder="2026/…" /></Sub>
          <Sub label="Date demande"><Inp v={draft.dateDemande} onChange={(e) => setDraft({ ...draft, dateDemande: e.target.value })} type="date" /></Sub>
          <Sub label="Date obtention"><Inp v={draft.dateObtention} onChange={(e) => setDraft({ ...draft, dateObtention: e.target.value })} type="date" /></Sub>
          <Sub label="URL scan visa (PDF)"><Inp v={draft.scanUrl} onChange={(e) => setDraft({ ...draft, scanUrl: e.target.value })} placeholder="https://..." /></Sub>
          {draft.status === "REFUSE" && (
            <Sub label="Motif refus"><Inp v={draft.motifRefus} onChange={(e) => setDraft({ ...draft, motifRefus: e.target.value })} placeholder="…" /></Sub>
          )}
          <Sub label="Note (optionnelle)"><Inp v={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Commentaire admin" /></Sub>

          <button
            onClick={save}
            disabled={busy}
            style={{ marginTop: 8, background: "#7c3aed", color: "#fff", border: 0, padding: "8px 12px", borderRadius: 4, cursor: busy ? "wait" : "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}
          >
            {busy ? "…" : "Enregistrer"}
          </button>

          {state?.history?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Historique</div>
              {[...state.history].reverse().slice(0, 5).map((h: any, i: number) => (
                <div key={i} style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4, paddingBottom: 4, borderBottom: "1px solid #1a1f2e" }}>
                  <span style={{ color: VISA_LABELS[h.status as VisaStatus]?.color }}>● {VISA_LABELS[h.status as VisaStatus]?.label}</span>
                  <span style={{ color: "#6b7280", marginLeft: 6 }}>{new Date(h.ts).toLocaleString("fr-MA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  {h.note && <div style={{ color: "#cbd5e1", marginTop: 2 }}>{h.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function iconFor(name: string, mime?: string): string {
  const e = (name?.split(".").pop() || "").toLowerCase();
  if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(e)) return "🖼";
  if (e === "pdf" || mime === "application/pdf") return "📄";
  if (e === "ifc") return "🏗";
  if (e === "dwg" || e === "dxf") return "📐";
  if (e === "rvt" || e === "pln" || e === "skp") return "🏢";
  return "📎";
}
