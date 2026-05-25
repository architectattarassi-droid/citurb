/**
 * PV Commission Rokhas — Composant upload
 *
 * - Drag & drop PDF (mobile : tap sur la zone ouvre le file picker)
 * - Preview du nom de fichier + taille
 * - Bouton "Uploader + parser" déclenche upload puis auto-parse
 * - Affiche le résultat du parsing (décision + nb réserves)
 *
 * Style inline `const S = {}`, cohérent avec le reste de la codebase.
 */
import React, { useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { uploadPv, parsePv, type PvCommission, type WorkflowOutcome } from "./pv-commission.api";

const COLORS = {
  bg: "#f7f8fa",
  card: "#ffffff",
  border: "#e3e7ec",
  ink: "#11181f",
  inkMid: "#5a6573",
  primary: "#0d4f8c",
  primaryHover: "#0a3e6e",
  success: "#0a7f3a",
  warning: "#b76e00",
  danger: "#b91c1c",
};

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: COLORS.bg, padding: "20px 16px", fontFamily: "-apple-system, system-ui, sans-serif", color: COLORS.ink },
  container: { maxWidth: 760, margin: "0 auto" },
  h1: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  sub: { fontSize: 14, color: COLORS.inkMid, margin: "0 0 18px" },
  card: { background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 16 },
  dropZone: {
    border: `2px dashed ${COLORS.border}`, borderRadius: 12, padding: "32px 16px",
    textAlign: "center" as const, cursor: "pointer", background: "#fafbfd",
    transition: "border-color 120ms, background 120ms",
  },
  dropZoneActive: { borderColor: COLORS.primary, background: "#eef5fb" },
  dropIcon: { fontSize: 36, marginBottom: 8 },
  fileLabel: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  fileHint: { fontSize: 13, color: COLORS.inkMid },
  preview: { display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#f0f4f8", borderRadius: 8, marginTop: 12 },
  previewIcon: { fontSize: 24 },
  previewName: { fontSize: 14, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  previewSize: { fontSize: 12, color: COLORS.inkMid },
  btnRow: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" as const },
  btn: {
    background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8,
    padding: "12px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
    minHeight: 44, // mobile-friendly target
  },
  btnGhost: { background: "transparent", color: COLORS.inkMid, border: `1px solid ${COLORS.border}` },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  result: { padding: 16, borderRadius: 10, marginTop: 12 },
  resultSuccess: { background: "#e7f5ec", border: `1px solid ${COLORS.success}` },
  resultWarn: { background: "#fff5e6", border: `1px solid ${COLORS.warning}` },
  resultDanger: { background: "#fde8e8", border: `1px solid ${COLORS.danger}` },
  resultTitle: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  resultDetail: { fontSize: 14, color: COLORS.inkMid },
  error: { color: COLORS.danger, fontSize: 14, marginTop: 12 },
};

export default function PvCommissionUpload() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ pv: PvCommission; workflow: WorkflowOutcome | null } | null>(null);

  const pickFile = useCallback((f: File | null) => {
    setError(null);
    setResult(null);
    if (!f) { setFile(null); return; }
    if (f.type !== "application/pdf") {
      setError(`Type "${f.type || "inconnu"}" non autorisé. Uploadez un PDF.`);
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError(`Fichier trop volumineux (${(f.size / 1024 / 1024).toFixed(1)} Mo, max 15 Mo).`);
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }, [pickFile]);

  const onSubmit = async () => {
    if (!file || !dossierId) return;
    setBusy(true); setError(null);
    try {
      const up = await uploadPv(dossierId, file);
      const parsed = await parsePv(up.pv.id);
      setResult({ pv: parsed.pv, workflow: parsed.workflow });
    } catch (e: any) {
      setError(e?.message || "Erreur upload/parsing");
    } finally {
      setBusy(false);
    }
  };

  const goToReserves = () => {
    if (result?.pv.id) navigate(`/p2/dossier/${dossierId}/pv-commission/${result.pv.id}/reserves`);
  };

  const goToList = () => navigate(`/p2/dossier/${dossierId}/pv-commission`);

  const decision = result?.pv.decision;
  const resultStyle =
    decision === "FAVORABLE" ? S.resultSuccess :
    decision === "FAVORABLE_AVEC_RESERVES" || decision === "AJOURNE" ? S.resultWarn :
    decision === "DEFAVORABLE" ? S.resultDanger : {};

  return (
    <div style={S.page}>
      <div style={S.container}>
        <h1 style={S.h1}>Upload PV de commission Rokhas</h1>
        <p style={S.sub}>Dossier <code>{dossierId}</code> — déposez le PDF du procès-verbal de la commission.</p>

        <div style={S.card}>
          <div
            style={{ ...S.dropZone, ...(dragActive ? S.dropZoneActive : {}) }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
          >
            <div style={S.dropIcon}>📄</div>
            <div style={S.fileLabel}>Touchez pour choisir un PDF</div>
            <div style={S.fileHint}>ou glissez le fichier ici · max 15 Mo</div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
            />
          </div>

          {file && (
            <div style={S.preview}>
              <div style={S.previewIcon}>📑</div>
              <div style={S.previewName}>{file.name}</div>
              <div style={S.previewSize}>{(file.size / 1024).toFixed(0)} Ko</div>
            </div>
          )}

          {error && <div style={S.error}>⚠ {error}</div>}

          <div style={S.btnRow}>
            <button
              onClick={onSubmit}
              disabled={!file || busy}
              style={{ ...S.btn, ...((!file || busy) ? S.btnDisabled : {}) }}
            >
              {busy ? "Traitement en cours…" : "Uploader + parser"}
            </button>
            <button onClick={goToList} style={{ ...S.btn, ...S.btnGhost }}>
              Voir les PVs existants
            </button>
          </div>
        </div>

        {result && (
          <div style={S.card}>
            <div style={{ ...S.result, ...resultStyle }}>
              <div style={S.resultTitle}>
                {decision === "FAVORABLE" && "✓ Décision FAVORABLE"}
                {decision === "FAVORABLE_AVEC_RESERVES" && `⚠ FAVORABLE avec ${result.pv.reserves.length} réserve(s)`}
                {decision === "DEFAVORABLE" && "✗ Décision DÉFAVORABLE"}
                {decision === "AJOURNE" && "⏸ Examen AJOURNÉ"}
                {!decision && "Décision non détectée"}
              </div>
              <div style={S.resultDetail}>
                Confiance parsing : {result.pv.parsingConfidence !== null ? `${Math.round(result.pv.parsingConfidence * 100)}%` : "—"}
                {result.pv.dateCommission && ` · Commission du ${new Date(result.pv.dateCommission).toLocaleDateString("fr-FR")}`}
                {result.pv.communeName && ` · ${result.pv.communeName}`}
              </div>
              {result.workflow && (
                <div style={{ ...S.resultDetail, marginTop: 8 }}>
                  Workflow déclenché : {result.workflow.actionsTriggered.join(", ") || "—"}
                  {result.workflow.tasksCreated > 0 && ` · ${result.workflow.tasksCreated} tâche(s) créée(s)`}
                  {result.workflow.incidentId && ` · incident #${result.workflow.incidentId.slice(0, 8)}`}
                </div>
              )}
            </div>
            <div style={S.btnRow}>
              {result.pv.reserves.length > 0 && (
                <button onClick={goToReserves} style={S.btn}>
                  Gérer les réserves ({result.pv.reserves.length})
                </button>
              )}
              <button onClick={goToList} style={{ ...S.btn, ...S.btnGhost }}>Retour à la liste</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
