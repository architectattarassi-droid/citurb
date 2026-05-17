/**
 * InlineComments — section commentaires repliable, affichée EN BAS d'un post.
 *
 * Pas de navigation : les commentaires se chargent et s'ajoutent sur place.
 * Une vidéo embarquée dans le post continue donc de jouer pendant qu'on
 * lit / écrit un commentaire.
 *
 * Utilisé par FeedHomePage (fil d'actualité) et CercleDetailPage.
 */

import React, { useEffect, useState } from "react";
import { CC_THEME } from "./theme";
import { cerclesApi, CerclePost } from "./api";

type Props = {
  cercleId: string;
  postId: string;
  onCountChange?: (n: number) => void;
};

export default function InlineComments({ cercleId, postId, onCountChange }: Props) {
  const [replies, setReplies] = useState<CerclePost[] | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await cerclesApi.postDetail(cercleId, postId);
      const list = r.data.replies || [];
      setReplies(list);
      onCountChange?.(list.length);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement commentaires");
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cercleId, postId]);

  const submit = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr(null);
    try {
      await cerclesApi.reply(cercleId, postId, body);
      setText("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Échec de l'envoi du commentaire");
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={S.wrap}>
      {loading && <div style={S.muted}>Chargement des commentaires…</div>}

      {!loading && replies && replies.length === 0 && (
        <div style={S.muted}>Aucun commentaire. Sois le premier à réagir.</div>
      )}

      {!loading && replies && replies.map((c) => {
        const name = c.author?.username || c.author?.email || "Membre";
        return (
          <div key={c.id} style={S.comment}>
            <div style={S.cAvatar}>{name.slice(0, 1).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.cHead}>
                <span style={S.cName}>{name}</span>
                <span style={S.cDate}>
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div style={S.cBody}>{c.body}</div>
            </div>
          </div>
        );
      })}

      {err && <div style={S.err}>⚠ {err}</div>}

      <div style={S.composer}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Écrire un commentaire… (Entrée pour envoyer)"
          rows={1}
          style={S.input}
        />
        <button onClick={submit} disabled={sending || !text.trim()} style={{ ...S.sendBtn, opacity: sending || !text.trim() ? 0.5 : 1 }}>
          {sending ? "…" : "Commenter"}
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 12, paddingTop: 12, borderTop: `1px solid ${CC_THEME.borderSoft}`, display: "flex", flexDirection: "column", gap: 10 },
  muted: { fontSize: 12.5, color: CC_THEME.inkMuted, fontStyle: "italic" },
  comment: { display: "flex", gap: 10, alignItems: "flex-start" },
  cAvatar: { width: 30, height: 30, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 12, fontWeight: 700, flexShrink: 0 },
  cHead: { display: "flex", alignItems: "baseline", gap: 8 },
  cName: { fontSize: 12.5, fontWeight: 600, color: CC_THEME.ink },
  cDate: { fontSize: 10.5, color: CC_THEME.inkMuted },
  cBody: { fontSize: 13, color: CC_THEME.ink, lineHeight: 1.5, marginTop: 2, whiteSpace: "pre-wrap" as const },
  err: { fontSize: 12, color: CC_THEME.danger },
  composer: { display: "flex", gap: 8, alignItems: "flex-end" },
  input: { flex: 1, padding: "8px 11px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", background: CC_THEME.bgRaised, resize: "vertical" as const, boxSizing: "border-box" as const, minHeight: 38 },
  sendBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "9px 16px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
};
