import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, CerclePost, CercleDetail } from "./api";

export default function PostDetailPage() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const [cercle, setCercle] = useState<CercleDetail | null>(null);
  const [post, setPost] = useState<CerclePost | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !postId) return;
    try {
      const c = await cerclesApi.detail(slug);
      setCercle(c.data);
      const p = await cerclesApi.postDetail(c.data.id, postId);
      setPost(p.data);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    }
  }, [slug, postId]);

  useEffect(() => { load(); }, [load]);

  const submitReply = async () => {
    if (!cercle || !post || !reply.trim()) return;
    setBusy(true);
    try {
      await cerclesApi.reply(cercle.id, post.id, reply);
      setReply("");
      await load();
    } finally { setBusy(false); }
  };

  return (
    <CerclesShell>
      {err && <div style={{ padding: 24, color: CC_THEME.danger }}>{err}</div>}
      {post && cercle && (
        <div style={S.root}>
          <div style={S.eyebrow}>{cercle.name}</div>
          {post.title && <h1 style={S.title}>{post.title}</h1>}

          <div style={S.author}>
            <div style={S.avatar}>{(post.author.username || post.author.email).slice(0, 1).toUpperCase()}</div>
            <div>
              <div style={S.authorName}>{post.author.username || post.author.email}</div>
              <div style={S.date}>{new Date(post.createdAt).toLocaleString("fr-FR")}</div>
            </div>
          </div>

          <div style={S.body}>{post.body}</div>

          <div style={S.footer}>
            <span style={S.metric}>👍 {post.upvotes}</span>
            <span style={S.metric}>💬 {post.replyCount} réponse(s)</span>
          </div>

          <hr style={S.sep} />

          <h2 style={S.repliesTitle}>Réponses</h2>

          {(post.replies || []).map(r => (
            <div key={r.id} style={S.reply}>
              <div style={S.author}>
                <div style={S.avatar}>{(r.author.username || r.author.email).slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={S.authorName}>{r.author.username || r.author.email}</div>
                  <div style={S.date}>{new Date(r.createdAt).toLocaleString("fr-FR")}</div>
                </div>
              </div>
              <div style={{ ...S.body, fontSize: 13.5 }}>{r.body}</div>
            </div>
          ))}

          {(!post.replies || post.replies.length === 0) && (
            <div style={{ color: CC_THEME.inkMuted, fontStyle: "italic", padding: "12px 0" }}>Pas encore de réponse.</div>
          )}

          <div style={S.composer}>
            <textarea
              style={S.replyInput}
              placeholder="Écrire une réponse…"
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={submitReply} disabled={busy || !reply.trim()} style={S.btnPrimary}>
                {busy ? "Envoi…" : "Répondre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CerclesShell>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "32px 48px 60px", maxWidth: 760 },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "8px 0 16px", fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },

  author: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 38, height: 38, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 14, fontWeight: 700 },
  authorName: { fontSize: 13.5, fontWeight: 600 },
  date: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic" },

  body: { fontSize: 14.5, lineHeight: 1.7, color: CC_THEME.ink, whiteSpace: "pre-wrap", marginBottom: 16 },
  footer: { display: "flex", gap: 16, alignItems: "center", paddingTop: 14, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  metric: { fontSize: 12.5, color: CC_THEME.inkMid },

  sep: { border: 0, borderTop: `1px solid ${CC_THEME.border}`, margin: "32px 0 24px" },
  repliesTitle: { margin: "0 0 16px", fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, fontWeight: 600 },

  reply: { padding: "16px 18px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.borderSoft}`, borderRadius: 8, marginBottom: 10 },

  composer: { marginTop: 24, padding: 16, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, boxShadow: CC_THEME.shadowSoft },
  replyInput: { width: "100%", padding: "10px 12px", fontSize: 13.5, fontFamily: CC_THEME.fontBody, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", resize: "vertical", boxSizing: "border-box" as const },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "8px 18px", borderRadius: 5, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
