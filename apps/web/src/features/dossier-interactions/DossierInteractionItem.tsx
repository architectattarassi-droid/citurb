/**
 * DossierInteractionItem — 1 item du fil (mobile-first card).
 *
 * Icône + couleur dépendent du type. Affiche :
 *  - header (auteur, rôle, date relative, type chip)
 *  - body (markdown très simple — bold/italic/code inline + lien)
 *  - attachments (preview image / lecteur audio / lien fichier)
 *  - réactions (badges cliquables)
 *  - actions (réagir, répondre, éditer/supprimer si auteur)
 */

import React, { useMemo } from "react";
import { DossierInteraction, FAST_EMOJIS, InteractionType, dossierInteractionsApi } from "./dossier-interactions.api";

type Props = {
  it: DossierInteraction;
  currentUserId: string;
  currentUserRole?: string;
  dossierId: string;
  onChanged: (next: DossierInteraction) => void;
  onDeleted: (id: string) => void;
  onReply?: (parentId: string) => void;
};

const TYPE_META: Record<InteractionType, { icon: string; bg: string; fg: string; label: string }> = {
  COMMENT:          { icon: "💬", bg: "#EFF6FF", fg: "#1D4ED8", label: "Commentaire" },
  FILE_UPLOADED:    { icon: "📎", bg: "#ECFDF5", fg: "#047857", label: "Fichier" },
  STATUS_CHANGE:    { icon: "🔁", bg: "#FEF3C7", fg: "#92400E", label: "Statut" },
  PHASE_COMPLETED:  { icon: "✅", bg: "#DCFCE7", fg: "#15803D", label: "Phase" },
  PAYMENT_RECEIVED: { icon: "💳", bg: "#FAE8FF", fg: "#86198F", label: "Paiement" },
  SIGNATURE:        { icon: "✍️", bg: "#E0E7FF", fg: "#3730A3", label: "Signature" },
  MENTION:          { icon: "@",  bg: "#FEF3C7", fg: "#92400E", label: "Mention" },
  AUDIO_NOTE:       { icon: "🎙️", bg: "#FCE7F3", fg: "#9D174D", label: "Note vocale" },
  DECISION:         { icon: "⚖️", bg: "#F3E8FF", fg: "#6D28D9", label: "Décision" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "À l’instant";
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  if (diff < 7 * 86_400_000) return `Il y a ${Math.floor(diff / 86_400_000)} j`;
  return new Date(iso).toLocaleDateString();
}

function tinyMd(md: string): React.ReactNode {
  // Très simple : escape HTML puis transforme **bold**, *italic*, `code`, autolinks.
  const esc = (s: string) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let h = esc(md);
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(?:^|[^*])\*([^*]+)\*/g, (m, p1) => m.startsWith("*") ? `<em>${p1}</em>` : ` <em>${p1}</em>`);
  h = h.replace(/`([^`]+)`/g, '<code style="background:#F3F4F6;padding:1px 4px;border-radius:3px">$1</code>');
  h = h.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noreferrer noopener" style="color:#2563EB;text-decoration:underline">$1</a>');
  h = h.replace(/@(\w[\w_.-]{1,32})/g, '<span style="background:#FEF3C7;color:#92400E;padding:1px 4px;border-radius:3px">@$1</span>');
  h = h.replace(/\n/g, "<br/>");
  return <span dangerouslySetInnerHTML={{ __html: h }} />;
}

export default function DossierInteractionItem(props: Props) {
  const { it, currentUserId, currentUserRole, dossierId, onChanged, onDeleted, onReply } = props;
  const meta = TYPE_META[it.type] || TYPE_META.COMMENT;
  const isAuthor = it.authorUserId === currentUserId;
  const isStaff = currentUserRole && ["ADMIN", "OWNER", "OPS", "SUPER_ADMIN", "ADMIN_SUPPORT"].includes(currentUserRole);

  const ageMs = useMemo(() => Date.now() - new Date(it.createdAt).getTime(), [it.createdAt]);
  const canEdit = isAuthor && ageMs < 15 * 60 * 1000;
  const canDelete = isAuthor || !!isStaff;
  const canPin = !!isStaff;

  async function react(emoji: string) {
    try {
      const next = await dossierInteractionsApi.react(dossierId, it.id, emoji);
      onChanged(next);
    } catch (e: any) { alert(`Erreur réaction : ${e.message}`); }
  }
  async function pinToggle() {
    try {
      const next = await dossierInteractionsApi.pin(dossierId, it.id, !it.isPinned);
      onChanged(next);
    } catch (e: any) { alert(`Erreur épinglage : ${e.message}`); }
  }
  async function remove() {
    if (!confirm("Supprimer cette interaction ?")) return;
    try {
      await dossierInteractionsApi.remove(dossierId, it.id);
      onDeleted(it.id);
    } catch (e: any) { alert(`Erreur suppression : ${e.message}`); }
  }

  return (
    <article
      style={{
        background: it.isPinned ? "#FFFBEB" : "#FFFFFF",
        border: it.isPinned ? "1px solid #FDE68A" : "1px solid #E5E7EB",
        borderLeft: `3px solid ${meta.fg}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 8,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ background: meta.bg, color: meta.fg, padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
          <span style={{ marginRight: 4 }}>{meta.icon}</span>{meta.label}
        </span>
        {it.isPinned && (
          <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 6px", borderRadius: 10, fontSize: 11 }}>📌 Épinglé</span>
        )}
        <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{it.authorRole}</span>
        <span style={{ fontSize: 11, color: "#6B7280", marginLeft: "auto" }}>
          {timeAgo(it.createdAt)}{it.editedAt ? " · modifié" : ""}
        </span>
      </header>

      {/* Body */}
      {it.contentMD && (
        <div style={{ fontSize: 14, color: "#0F172A", lineHeight: 1.45, marginBottom: 6 }}>
          {tinyMd(it.contentMD)}
        </div>
      )}

      {/* Attachments */}
      {it.attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 8 }}>
          {it.attachments.map((a, i) => {
            if (a.mime.startsWith("image/")) {
              return (
                <a key={i} href={a.url} target="_blank" rel="noreferrer noopener">
                  <img src={a.url} alt={a.filename} style={{ maxWidth: 160, maxHeight: 160, borderRadius: 6, border: "1px solid #E5E7EB" }} />
                </a>
              );
            }
            if (a.mime.startsWith("audio/")) {
              return <audio key={i} src={a.url} controls style={{ height: 36, maxWidth: "100%" }} />;
            }
            return (
              <a key={i} href={a.url} target="_blank" rel="noreferrer noopener"
                 style={{ background: "#F1F5F9", color: "#0F172A", padding: "6px 10px", borderRadius: 6, fontSize: 12, textDecoration: "none", border: "1px solid #E2E8F0" }}>
                📎 {a.filename} <span style={{ color: "#6B7280" }}>({Math.round((a.size || 0) / 1024)} ko)</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Reactions row + quick-react */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {it.reactions.map((r) => {
          const mine = r.userIds.includes(currentUserId);
          return (
            <button
              key={r.emoji}
              onClick={() => react(r.emoji)}
              style={{
                background: mine ? "#DBEAFE" : "#F3F4F6",
                border: mine ? "1px solid #93C5FD" : "1px solid #E5E7EB",
                color: "#0F172A", borderRadius: 12, padding: "2px 8px", fontSize: 12, cursor: "pointer",
              }}
            >{r.emoji} {r.userIds.length}</button>
          );
        })}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {FAST_EMOJIS.map((e) => (
            <button key={e} onClick={() => react(e)} title={`Réagir ${e}`}
              style={{ background: "transparent", border: "1px solid transparent", color: "#94A3B8",
                       borderRadius: 999, width: 26, height: 26, cursor: "pointer", fontSize: 14 }}>{e}</button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 12, color: "#475569", flexWrap: "wrap" }}>
        {onReply && (
          <button onClick={() => onReply(it.id)} style={btnLink}>↩ Répondre</button>
        )}
        {canPin && (
          <button onClick={pinToggle} style={btnLink}>{it.isPinned ? "Désépingler" : "Épingler"}</button>
        )}
        {canDelete && (
          <button onClick={remove} style={{ ...btnLink, color: "#B91C1C" }}>Supprimer</button>
        )}
        {it.visibility !== "PUBLIC" && (
          <span style={{ marginLeft: "auto", color: it.visibility === "INTERNE_OPS" ? "#92400E" : "#6B21A8" }}>
            🔒 {it.visibility === "INTERNE_OPS" ? "Interne OPS" : "Privé"}
          </span>
        )}
      </div>
    </article>
  );
}

const btnLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#475569",
  cursor: "pointer",
  padding: 0,
  font: "inherit",
};
