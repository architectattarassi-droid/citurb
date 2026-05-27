/**
 * PcDocumentsStep — Étape 2 : Téléversement des pièces.
 *
 * - Liste regroupée par catégorie.
 * - Pour chaque pièce : statut, upload, aide, lien "Comment obtenir ?".
 * - Bouton "Importer depuis mes documents" (stub UI — branchera plus tard
 *   le module documents-repo si disponible).
 */

import React, { useState } from "react";
import {
  PIECE_CATEGORY_LABELS,
  fileToBase64,
  uploadPcPiece,
  type EnrichedPiece,
  type PcDraftResponse,
  type PieceDefinition,
} from "./permis-construire.api";

interface Props {
  dossierId: string;
  checklist: EnrichedPiece[];
  onChange: (resp: PcDraftResponse) => void;
}

export default function PcDocumentsStep({ dossierId, checklist, onChange }: Props) {
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = React.useMemo(() => {
    const m = new Map<PieceDefinition["category"], EnrichedPiece[]>();
    for (const p of checklist) {
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    }
    return Array.from(m.entries());
  }, [checklist]);

  async function handleUpload(p: EnrichedPiece, file: File) {
    setError(null);
    setUploadingCode(p.code);
    try {
      const base64 = await fileToBase64(file);
      const resp = await uploadPcPiece(dossierId, {
        pieceCode: p.code,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        contentBase64: base64,
      });
      onChange(resp);
    } catch (e: any) {
      setError(e?.message ?? "Échec de l'upload");
    } finally {
      setUploadingCode(null);
    }
  }

  return (
    <div style={{ padding: "16px 12px", maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Pièces du dossier</h2>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        Téléversez chaque pièce requise. Les pièces marquées d'une étoile sont obligatoires.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: 8,
            borderRadius: 6,
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {grouped.map(([cat, items]) => (
        <section key={cat} style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#6b7280",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 4,
              marginBottom: 8,
            }}
          >
            {PIECE_CATEGORY_LABELS[cat] ?? cat}
          </h3>
          {items.map((p) => (
            <PieceCard
              key={p.code}
              piece={p}
              isUploading={uploadingCode === p.code}
              onUpload={(file) => handleUpload(p, file)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function PieceCard({
  piece,
  isUploading,
  onUpload,
}: {
  piece: EnrichedPiece;
  isUploading: boolean;
  onUpload: (f: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const st = piece.state.status;

  const badge = (() => {
    switch (st) {
      case "VALIDATED": return { bg: "#dcfce7", fg: "#166534", txt: "Validé" };
      case "UPLOADED":  return { bg: "#dbeafe", fg: "#1e40af", txt: "Téléversé" };
      case "REJECTED":  return { bg: "#fef3c7", fg: "#92400e", txt: "Rejeté" };
      default:          return { bg: "#fee2e2", fg: "#991b1b", txt: "Manquant" };
    }
  })();

  const accept = (piece.acceptMime ?? ["application/pdf"]).join(",");

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {piece.label}
            {piece.required && (
              <span style={{ color: "#dc2626", marginLeft: 4 }} aria-label="obligatoire">*</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            {piece.labelAr}
          </div>
          <p style={{ fontSize: 12, color: "#374151", margin: "6px 0 0 0" }}>
            {piece.description}
          </p>
          {(piece.helpText || piece.helpUrl) && (
            <details style={{ marginTop: 6, fontSize: 11 }}>
              <summary style={{ cursor: "pointer", color: "#2563eb" }}>
                Comment obtenir cette pièce ?
              </summary>
              {piece.helpText && (
                <p style={{ color: "#6b7280", marginTop: 4 }}>{piece.helpText}</p>
              )}
              {piece.helpUrl && (
                <a
                  href={piece.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline" }}
                >
                  {piece.helpUrl}
                </a>
              )}
            </details>
          )}
          {piece.state.fileName && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
              📎 {piece.state.fileName}{" "}
              {piece.state.fileSize ? `(${(piece.state.fileSize / 1024).toFixed(1)} KB)` : ""}
            </div>
          )}
        </div>

        <span
          style={{
            display: "inline-block",
            padding: "3px 8px",
            background: badge.bg,
            color: badge.fg,
            fontSize: 10,
            borderRadius: 999,
            fontWeight: 700,
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {badge.txt}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          style={{
            background: st === "MISSING" ? "#2563eb" : "#fff",
            color: st === "MISSING" ? "#fff" : "#2563eb",
            border: "1px solid #2563eb",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: isUploading ? "wait" : "pointer",
          }}
        >
          {isUploading ? "Envoi…" : st === "MISSING" ? "Téléverser" : "Remplacer"}
        </button>
        <button
          type="button"
          disabled
          title="À venir : import depuis vos documents existants"
          style={{
            background: "#fff",
            color: "#9ca3af",
            border: "1px dashed #d1d5db",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            cursor: "not-allowed",
          }}
        >
          Importer depuis mes documents
        </button>
      </div>
    </div>
  );
}
