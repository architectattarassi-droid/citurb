/**
 * DocumentPreview — modale full-screen pour visualiser un document.
 *
 * - PDF → `<iframe>` (preview native navigateur)
 * - Image → `<img>` avec pinch-to-zoom CSS (touch-action manipulation)
 * - Autre → bouton "Télécharger pour ouvrir"
 */
import React, { useEffect, useState } from "react";
import { documentsRepoApi, type Document, formatBytes } from "./documents-repo.api";

type Props = {
  doc: Document;
  onClose: () => void;
};

const S = {
  backdrop: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(15,23,42,0.92)",
    zIndex: 9998,
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: "12px 16px",
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  title: { fontWeight: 600, overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const },
  body: { flex: 1, background: "#1e293b", display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, overflow: "auto" as const },
  iframe: { width: "100%", height: "100%", border: 0, background: "#fff" },
  img: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain" as const,
    touchAction: "manipulation" as const,
  },
  meta: { padding: 16, background: "#0f172a", color: "#cbd5e1", fontSize: 13, display: "flex" as const, flexWrap: "wrap" as const, gap: 16, justifyContent: "space-between" as const },
  fallback: { color: "#fff", textAlign: "center" as const, padding: 32, display: "flex" as const, flexDirection: "column" as const, gap: 12, alignItems: "center" as const },
  btn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none" as const,
  },
};

/** Modale plein écran de prévisualisation. */
export default function DocumentPreview({ doc, onClose }: Props) {
  const [fullDoc, setFullDoc] = useState<Document | null>(
    doc.signedUrl ? doc : null,
  );

  // Recharge le document si le signedUrl n'est pas présent.
  useEffect(() => {
    if (fullDoc?.signedUrl) return;
    documentsRepoApi.get(doc.id).then(setFullDoc).catch(() => setFullDoc(null));
  }, [doc.id, fullDoc]);

  const fileUrl = fullDoc?.signedUrl ? documentsRepoApi.fileUrl(fullDoc) : "";
  const mime = doc.mimeType.toLowerCase();
  const isPdf = mime.includes("pdf");
  const isImage = mime.startsWith("image/");

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label={`Aperçu ${doc.title}`}>
      <div style={S.header}>
        <div style={S.title}>{doc.title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {fileUrl ? (
            <a style={S.btn} href={fileUrl} target="_blank" rel="noopener noreferrer" download={doc.filename}>
              Télécharger
            </a>
          ) : null}
          <button type="button" style={S.btn} onClick={onClose}>Fermer</button>
        </div>
      </div>
      <div style={S.body}>
        {!fileUrl ? (
          <div style={S.fallback}>Chargement…</div>
        ) : isPdf ? (
          <iframe title={doc.title} src={fileUrl} style={S.iframe} />
        ) : isImage ? (
          <img src={fileUrl} alt={doc.title} style={S.img} />
        ) : (
          <div style={S.fallback}>
            <div>Aperçu non disponible pour ce format ({doc.ext.toUpperCase()}).</div>
            <a style={S.btn} href={fileUrl} download={doc.filename}>
              Télécharger pour ouvrir
            </a>
          </div>
        )}
      </div>
      <div style={S.meta}>
        <span>{doc.filename}</span>
        <span>{formatBytes(doc.sizeBytes)} · {doc.mimeType}</span>
        <span style={{ fontFamily: "monospace", fontSize: 11 }}>
          SHA-256 : {doc.hashSha256.slice(0, 12)}…{doc.hashSha256.slice(-6)}
        </span>
      </div>
    </div>
  );
}
