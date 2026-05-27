/**
 * DocumentCard — carte synthétique d'un document.
 *
 * Affiche : icône catégorie, titre, statut signature (badge), métadonnées,
 * et boutons d'action (preview, sign, share, delete).
 */
import React from "react";
import {
  CATEGORY_ICON,
  CATEGORY_LABEL,
  type DocumentListItem,
  formatBytes,
  STATUS_COLOR,
} from "./documents-repo.api";

type Props = {
  doc: DocumentListItem;
  onPreview: () => void;
  onSign: () => void;
  onShare: () => void;
  onDelete: () => void;
  canDelete?: boolean;
};

const S = {
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fff",
    padding: 14,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  header: {
    display: "flex" as const,
    gap: 10,
    alignItems: "flex-start" as const,
  },
  icon: {
    fontFamily: "monospace" as const,
    fontSize: 13,
    fontWeight: 700,
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    color: "#0f172a",
    padding: "4px 8px",
    borderRadius: 6,
    flexShrink: 0,
  },
  title: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 1.3,
    overflow: "hidden" as const,
    display: "-webkit-box" as const,
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
  },
  category: { fontSize: 11, color: "#64748b", marginTop: 2 },
  badge: (c: { bg: string; fg: string }) => ({
    background: c.bg,
    color: c.fg,
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
  }),
  meta: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    fontSize: 11,
    color: "#64748b",
  },
  actions: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: "auto",
  },
  btn: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
    minWidth: 70,
  },
  btnPrimary: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flex: 1,
    minWidth: 70,
  },
  btnDanger: {
    background: "#fff",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};

/** Carte document — cliquable et signable. */
export default function DocumentCard({ doc, onPreview, onSign, onShare, onDelete, canDelete }: Props) {
  const status = STATUS_COLOR[doc.status];
  const canSign = doc.status === "DRAFT" || doc.status === "PENDING_SIGNATURE" || doc.status === "PARTIALLY_SIGNED";

  return (
    <article style={S.card}>
      <div style={S.header}>
        <span style={S.icon}>{CATEGORY_ICON[doc.category]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.title} title={doc.title}>{doc.title}</div>
          <div style={S.category}>{CATEGORY_LABEL[doc.category]}</div>
        </div>
        <span style={S.badge(status)}>{status.label}</span>
      </div>
      <div style={S.meta}>
        <span>{formatBytes(doc.sizeBytes)}</span>
        <span>·</span>
        <span>{new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}</span>
        {doc.signaturesCount > 0 ? (
          <>
            <span>·</span>
            <span>{doc.signaturesCount} signature{doc.signaturesCount > 1 ? "s" : ""}</span>
          </>
        ) : null}
        {doc.pendingSignaturesCount > 0 ? (
          <>
            <span>·</span>
            <span style={{ color: "#9a3412" }}>{doc.pendingSignaturesCount} en attente</span>
          </>
        ) : null}
      </div>
      <div style={S.actions}>
        <button type="button" style={S.btn} onClick={onPreview}>Aperçu</button>
        {canSign ? (
          <button type="button" style={S.btnPrimary} onClick={onSign}>Signer</button>
        ) : null}
        <button type="button" style={S.btn} onClick={onShare}>Partager</button>
        {canDelete && doc.status !== "ARCHIVED" && doc.status !== "SIGNED" ? (
          <button type="button" style={S.btnDanger} onClick={onDelete}>Suppr.</button>
        ) : null}
      </div>
    </article>
  );
}
