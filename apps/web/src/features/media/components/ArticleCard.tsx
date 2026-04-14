import React, { useEffect, useMemo, useState } from "react";
import type { Article } from "../articles/types";
import { useAuth } from "../../../tomes/tome5/AuthProvider";
import { addComment, addShare, getArticleMeta, toggleLike } from "../articles/interactions";

/* ── helpers ────────────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

function plainText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mkExcerpt(a: Article) {
  if (a.excerpt?.trim()) return a.excerpt.trim();
  const t = plainText(a.content || "");
  return t.length > 260 ? t.slice(0, 260) + "…" : t;
}

const LANG_COLOR: Record<string, { bg: string; text: string }> = {
  fr: { bg: "#1e3a8a", text: "#fff" },
  ar: { bg: "#92400e", text: "#fff" },
  en: { bg: "#065f46", text: "#fff" },
};

const CAT_COLORS: Record<string, string> = {
  terrain: "#0369a1", investissement: "#7c3aed", urbanisme: "#0891b2",
  autorisation: "#b45309", chantier: "#be123c", budget: "#15803d",
  juridique: "#6d28d9", autre: "#475569",
};

const GRADIENTS = [
  "linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)",
  "linear-gradient(135deg,#0c1a2e 0%,#0b4f6c 100%)",
  "linear-gradient(135deg,#1a0533 0%,#2d1b69 100%)",
  "linear-gradient(135deg,#0f2027 0%,#203a43 60%,#2c5364 100%)",
  "linear-gradient(135deg,#0a192f 0%,#172a45 100%)",
];

/* ── ArticleCard ─────────────────────────────────────────────────────────── */
export function ArticleCard({ article, mode }: { article: Article; mode?: "landing" | "media" }) {
  const [expanded, setExpanded]         = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [saved, setSaved]               = useState(false);
  const [author, setAuthor]             = useState("");
  const [comment, setComment]           = useState("");
  const [meta, setMeta]                 = useState(() => getArticleMeta(article.id));
  const isAr                            = article.lang === "ar";
  const auth                            = useAuth();

  useEffect(() => { setMeta(getArticleMeta(article.id)); }, [article.id]);

  const grad = GRADIENTS[parseInt(article.id.replace(/\D/g, ""), 10) % GRADIENTS.length];
  const catColor = CAT_COLORS[article.category] ?? "#475569";
  const langStyle = LANG_COLOR[article.lang] ?? { bg: "#334155", text: "#fff" };
  const excerpt = useMemo(() => mkExcerpt(article), [article]);

  function submitComment() {
    if (!comment.trim() || !auth.isAuthed) return;
    const commentAuthor = auth.email || author || "Membre";
    setMeta(addComment(article.id, commentAuthor, comment));
    setComment("");
  }

  return (
    <article
      id={article.id}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 2px 12px rgba(0,0,0,.06)",
        overflow: "hidden",
        marginBottom: 24,
        transition: "box-shadow .2s",
      }}
    >
      {/* ══ PHOTO / COVER ══════════════════════════════════════════════════ */}
      <div style={{ position: "relative", height: 260, overflow: "hidden", background: grad }}>
        {article.cover && (
          <img
            src={article.cover}
            alt={article.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .9 }}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {/* Overlay gradient for readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 50%)" }} />

        {/* Badges top */}
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", background: langStyle.bg, color: langStyle.text }}>
            {article.lang.toUpperCase()}
          </span>
          <span style={{ padding: "4px 11px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: catColor, color: "#fff" }}>
            {article.category}
          </span>
        </div>

        {/* Author / date bottom-left */}
        <div style={{ position: "absolute", bottom: 14, left: 16, color: "#fff" }}>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: .95 }}>{article.authorName ?? "CITURBAREA"}</div>
          <div style={{ fontSize: 11, opacity: .7 }}>{fmtDate(article.createdAt)}</div>
        </div>
      </div>

      {/* ══ TITRE + TAGS ══════════════════════════════════════════════════ */}
      <div style={{ padding: "20px 24px 0" }} dir={isAr ? "rtl" : "ltr"}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>
          {article.title}
        </h2>
        {article.tags?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {article.tags.slice(0, 4).map(t => (
              <span key={t} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ══ EXTRAIT ════════════════════════════════════════════════════════ */}
      <div style={{ padding: "14px 24px 0" }} dir={isAr ? "rtl" : "ltr"}>
        <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.7 }}>
          {excerpt}
        </p>
      </div>

      {/* ══ CONTENU ÉTENDU ════════════════════════════════════════════════ */}
      {expanded && (
        <div
          style={{ padding: "16px 24px 0", fontSize: 14, color: "#334155", lineHeight: 1.8 }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      )}

      {/* ══ BOUTON LIRE TOUT / RÉDUIRE ════════════════════════════════════ */}
      <div style={{ padding: "12px 24px 0" }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            padding: "8px 18px", borderRadius: 99, border: "1.5px solid #1e3a8a",
            background: expanded ? "#1e3a8a" : "transparent", color: expanded ? "#fff" : "#1e3a8a",
            fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all .15s",
          }}
        >
          {expanded ? "▲ Réduire" : "Lire tout l'article ▼"}
        </button>
      </div>

      {/* ══ BARRE D'ACTIONS ═══════════════════════════════════════════════ */}
      <div style={{
        margin: "16px 24px 0",
        paddingTop: 14,
        borderTop: "1px solid #f1f5f9",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        {/* J'aime */}
        <ActionBtn
          active={!!meta.liked}
          icon={meta.liked ? "❤️" : "🤍"}
          label={`J'aime${meta.likes > 0 ? ` · ${meta.likes}` : ""}`}
          onClick={() => setMeta(toggleLike(article.id))}
          color="#e11d48"
        />

        {/* Commentaire */}
        <ActionBtn
          active={showComments}
          icon="💬"
          label={`Commenter${meta.comments.length > 0 ? ` · ${meta.comments.length}` : ""}`}
          onClick={() => setShowComments(v => !v)}
          color="#1e3a8a"
        />

        {/* Partager */}
        <ActionBtn
          active={false}
          icon="🔗"
          label={`Partager${meta.shares > 0 ? ` · ${meta.shares}` : ""}`}
          onClick={async () => {
            try { await navigator.clipboard.writeText(`${window.location.origin}/media#${article.id}`); } catch {}
            setMeta(addShare(article.id));
          }}
          color="#0891b2"
        />

        {/* Sauvegarder */}
        <ActionBtn
          active={saved}
          icon={saved ? "🔖" : "🔖"}
          label={saved ? "Sauvegardé" : "Sauvegarder"}
          onClick={() => setSaved(v => !v)}
          color="#7c3aed"
          activeBg="#ede9fe"
          activeText="#7c3aed"
        />

        {mode === "landing" && (
          <button
            onClick={() => (window.location.href = "/media")}
            style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 99, border: "none", background: "#1e3a8a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Voir tous les articles →
          </button>
        )}
      </div>

      {/* ══ SECTION COMMENTAIRES ══════════════════════════════════════════ */}
      {showComments && (
        <div style={{
          margin: "16px 24px 24px",
          padding: 20,
          background: "#f8fafc",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14, letterSpacing: ".02em" }}>
            💬 Commentaires ({meta.comments.length})
          </div>

          {/* Formulaire — réservé aux membres connectés */}
          {auth.isAuthed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 2 }}>
                Connecté en tant que <strong style={{ color: "#1e3a8a" }}>{auth.email}</strong>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitComment()}
                  placeholder={isAr ? "أضف تعليقك…" : "Votre commentaire…"}
                  style={{ flex: 1, padding: "9px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit" }}
                  dir={isAr ? "rtl" : "ltr"}
                />
                <button
                  onClick={submitComment}
                  disabled={!comment.trim()}
                  style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: comment.trim() ? "#1e3a8a" : "#cbd5e1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: comment.trim() ? "pointer" : "default", transition: "background .15s", whiteSpace: "nowrap" }}
                >
                  Envoyer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: "12px 16px", background: "#eff6ff", borderRadius: 10, border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: "#1e40af" }}>
                🔒 Connectez-vous pour laisser un commentaire
              </span>
              <a href="/login" style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, background: "#1e3a8a", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                Se connecter
              </a>
            </div>
          )}

          {/* Liste des commentaires */}
          {meta.comments.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Soyez le premier à commenter.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {meta.comments.slice(0, 10).map(c => (
                <div key={c.id} style={{
                  background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0",
                  padding: "10px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: "#1e3a8a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0,
                      }}>
                        {(c.author || "M")[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{c.author || "Membre"}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtDate(c.createdAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.6, paddingLeft: 38 }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowComments(false)}
            style={{ marginTop: 12, fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
          >
            Fermer les commentaires ↑
          </button>
        </div>
      )}

      {/* Padding bottom when comments closed */}
      {!showComments && <div style={{ height: 20 }} />}
    </article>
  );
}

/* ── ActionBtn ────────────────────────────────────────────────────────────── */
function ActionBtn({
  icon, label, onClick, active, color,
  activeBg, activeText,
}: {
  icon: string; label: string; onClick: () => void; active: boolean;
  color: string; activeBg?: string; activeText?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: 99,
        border: `1.5px solid ${active ? (activeBg ?? color) : "#e2e8f0"}`,
        background: active ? (activeBg ?? color) : "#fff",
        color: active ? (activeText ?? "#fff") : "#475569",
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        transition: "all .15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = color; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
