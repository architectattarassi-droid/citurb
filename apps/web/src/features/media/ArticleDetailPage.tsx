import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../tomes/tome5/AuthProvider";
import { apiFetch } from "../../tomes/tome4/apiClient";
import { cabinetApi, youtubeId } from "../cabinet/api";

/**
 * ArticleDetailPage — page publique de lecture d'un article.
 *
 * Route : /media/article/:slug
 *
 * Cette page sert l'humain qui clique sur le lien. Les BOTS sociaux
 * (WhatsApp, FB, LinkedIn, Twitter) sont eux interceptés par le middleware
 * OG du backend (apps/api/src/modules/articles/og-prerender.middleware.ts)
 * qui leur sert un HTML mini avec les balises Open Graph dynamiques (cover
 * spécifique à l'article + titre + description). Ce composant React, lui,
 * ne se lance que pour les humains qui exécutent JS.
 *
 * On met également à jour `document.title` côté client pour les onglets
 * et le partage via navigator.share quand l'API n'est pas interceptée.
 */
type Article = {
  id: string;
  slug: string;
  title: string;
  lang: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  cover?: string | null;
  coverWidth?: number | null;
  coverHeight?: number | null;
  publishedAt?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const auth = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Édition par l'auteur du post ──────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<Pick<Article, "title" | "excerpt" | "content" | "cover">>({
    title: "",
    excerpt: "",
    content: "",
    cover: "",
  });
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // L'utilisateur peut éditer s'il est l'auteur du post OU un admin.
  const canEdit =
    !!auth.isAuthed &&
    !!article &&
    (article.authorId === auth.userId ||
      ["ADMIN", "OWNER", "OPS"].includes((auth.role || "").toUpperCase()));

  const startEdit = () => {
    if (!article) return;
    setDraft({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      cover: article.cover || "",
    });
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  /** Upload d'une nouvelle image/vidéo de couverture → met à jour draft.cover. */
  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    const kind = file.type.startsWith("video/") ? "video" : "photo";
    setUploading(true);
    setSaveError(null);
    try {
      const { publicUrl } = await cabinetApi.uploadFile(file, kind);
      setDraft((d) => ({ ...d, cover: publicUrl }));
    } catch (e: any) {
      setSaveError(e?.message || "Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  /** Insère une vidéo YouTube (embed responsive) à la fin du contenu HTML. */
  const insertYoutube = () => {
    const url = window.prompt("Collez le lien de la vidéo YouTube :");
    if (!url) return;
    const id = youtubeId(url);
    if (!id) {
      window.alert("Lien YouTube non reconnu.");
      return;
    }
    const embed =
      `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:14px 0;background:#000">` +
      `<iframe src="https://www.youtube.com/embed/${id}" title="Vidéo YouTube" loading="lazy" ` +
      `frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" ` +
      `allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe></div>`;
    setDraft((d) => ({ ...d, content: `${d.content}\n${embed}` }));
  };

  const saveEdit = async () => {
    if (!article) return;
    if (!draft.title.trim()) {
      setSaveError("Le titre est requis.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // PATCH /api/articles/mine/:id — le slug n'est PAS envoyé → URL préservée.
      const updated = await apiFetch<Article>(`/api/articles/mine/${article.id}`, {
        method: "PATCH",
        body: {
          title: draft.title,
          excerpt: draft.excerpt,
          content: draft.content,
          cover: draft.cover || null,
        },
      });
      setArticle((prev) => (prev ? { ...prev, ...updated } : updated));
      if (typeof document !== "undefined") document.title = `${updated.title} — CITURBAREA`;
      setEditing(false);
    } catch (e: any) {
      setSaveError(e?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    fetch(`/api/articles/slug/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("Article introuvable.");
          throw new Error(`Erreur ${r.status}`);
        }
        return r.json();
      })
      .then((a: Article) => {
        setArticle(a);
        if (typeof document !== "undefined") {
          document.title = `${a.title} — CITURBAREA`;
        }
      })
      .catch((e) => setError(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  }, [slug]);

  const onShare = async () => {
    if (typeof navigator === "undefined") return;
    const url = window.location.href;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: article?.title,
          text: article?.excerpt,
          url,
        });
      } catch {
        // user cancelled — silent
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Lien copié — vous pouvez le coller dans WhatsApp / LinkedIn / Email.");
      } catch {
        // ignore
      }
    }
  };

  if (loading) {
    return (
      <div style={S.wrap}>
        <div style={S.loading}>Chargement…</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={S.wrap}>
        <div style={S.error}>
          <h1>Article introuvable</h1>
          <p>{error}</p>
          <a href="/media" style={S.linkBack}>← Retour aux articles</a>
        </div>
      </div>
    );
  }

  const isAr = article.lang === "ar";
  const langCode = isAr ? "ar-MA" : article.lang === "en" ? "en-US" : "fr-MA";
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(langCode, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div style={{ ...S.wrap, direction: isAr ? "rtl" : "ltr" }} lang={article.lang}>
      <article style={S.article}>
        <div style={S.topbar}>
          <a href="/media" style={S.linkBack}>← {isAr ? "العودة" : article.lang === "en" ? "Back" : "Retour"}</a>
          {canEdit && !editing && (
            <button onClick={startEdit} style={S.editBtn}>
              ✏️ {isAr ? "تعديل" : article.lang === "en" ? "Edit" : "Modifier"}
            </button>
          )}
        </div>

        <div style={S.metaTop}>
          <span style={S.category}>{article.category}</span>
          {publishedDate && <span style={S.date}>{publishedDate}</span>}
          {article.authorName && <span style={S.author}>· {article.authorName}</span>}
        </div>

        {editing ? (
          <div style={S.editForm}>
            <p style={S.editHint}>
              ✏️ Vous modifiez ce post. <strong>L'URL reste identique</strong> — les liens déjà partagés
              continueront de fonctionner.
            </p>

            <label style={S.label}>Titre</label>
            <input
              style={S.input}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />

            <label style={S.label}>Chapeau (résumé)</label>
            <textarea
              style={{ ...S.input, minHeight: 70, resize: "vertical" }}
              value={draft.excerpt}
              onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
            />

            <label style={S.label}>Image / vidéo de couverture</label>
            {draft.cover && (
              <img src={draft.cover} alt="" style={{ ...S.cover, margin: "0 0 10px" }} />
            )}
            <div style={S.row}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={(e) => onCoverFile(e.target.files?.[0])}
              />
              <button type="button" style={S.secondaryBtn} onClick={() => coverInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Envoi…" : "📷 Changer l'image"}
              </button>
              {draft.cover && (
                <button type="button" style={S.secondaryBtn} onClick={() => setDraft((d) => ({ ...d, cover: "" }))}>
                  🗑️ Retirer
                </button>
              )}
            </div>
            <input
              style={{ ...S.input, fontSize: 13 }}
              placeholder="…ou collez une URL d'image"
              value={draft.cover || ""}
              onChange={(e) => setDraft((d) => ({ ...d, cover: e.target.value }))}
            />

            <label style={S.label}>Contenu</label>
            <textarea
              style={{ ...S.input, minHeight: 260, fontFamily: "ui-monospace, monospace", fontSize: 14, resize: "vertical" }}
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            />
            <div style={S.row}>
              <button type="button" style={S.secondaryBtn} onClick={insertYoutube}>
                ▶️ Insérer une vidéo YouTube
              </button>
            </div>

            {saveError && <p style={S.saveError}>{saveError}</p>}

            <div style={{ ...S.row, marginTop: 16 }}>
              <button style={S.saveBtn} onClick={saveEdit} disabled={saving || uploading}>
                {saving ? "Enregistrement…" : "💾 Enregistrer"}
              </button>
              <button style={S.secondaryBtn} onClick={cancelEdit} disabled={saving}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={S.title}>{article.title}</h1>

            {article.excerpt && <p style={S.excerpt}>{article.excerpt}</p>}

            {article.cover && (
              <img
                src={article.cover}
                alt={article.title}
                width={article.coverWidth || undefined}
                height={article.coverHeight || undefined}
                style={S.cover}
              />
            )}

            <div
              style={S.content}
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </>
        )}

        {article.tags?.length > 0 && (
          <div style={S.tags}>
            {article.tags.map((t) => (
              <span key={t} style={S.tag}>#{t}</span>
            ))}
          </div>
        )}

        <div style={S.actions}>
          <button onClick={onShare} style={S.shareBtn}>
            🔗 {isAr ? "مشاركة" : article.lang === "en" ? "Share" : "Partager"}
          </button>
          <span style={S.views}>{article.views} {isAr ? "مشاهدة" : article.lang === "en" ? "views" : "vues"}</span>
        </div>
      </article>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px 16px 64px",
    color: "#0B1B3A",
  },
  article: {
    maxWidth: 760,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 16,
    padding: "32px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(11,27,58,0.04)",
  },
  loading: {
    textAlign: "center",
    padding: 64,
    color: "#6b7280",
    fontFamily: "system-ui, sans-serif",
  },
  error: {
    maxWidth: 480,
    margin: "120px auto 0",
    textAlign: "center",
    padding: 32,
    background: "#fff",
    borderRadius: 12,
  },
  linkBack: {
    display: "inline-block",
    marginBottom: 24,
    color: "#9F7C34",
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  metaTop: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    fontSize: 13,
    color: "#6b7280",
  },
  category: {
    background: "#9F7C34",
    color: "#fff",
    padding: "3px 10px",
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  date: {},
  author: {},
  title: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 1.2,
    margin: "12px 0 16px",
    fontFamily: "Georgia, 'Playfair Display', serif",
  },
  excerpt: {
    fontSize: 18,
    lineHeight: 1.5,
    color: "#475569",
    fontStyle: "italic",
    margin: "0 0 24px",
    paddingLeft: 16,
    borderLeft: "3px solid #9F7C34",
  },
  cover: {
    width: "100%",
    height: "auto",
    borderRadius: 12,
    margin: "16px 0 28px",
  },
  content: {
    fontSize: 17,
    lineHeight: 1.7,
    color: "#1f2937",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    margin: "32px 0 16px",
  },
  tag: {
    background: "rgba(159,124,52,0.08)",
    color: "#9F7C34",
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    paddingTop: 24,
    borderTop: "1px solid #e2e8f0",
  },
  shareBtn: {
    background: "#0B1B3A",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  views: {
    fontSize: 13,
    color: "#6b7280",
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  editBtn: {
    background: "#0B1B3A",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 24,
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    margin: "8px 0 4px",
  },
  editHint: {
    background: "rgba(159,124,52,0.08)",
    color: "#7a5e23",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    lineHeight: 1.5,
    margin: "0 0 18px",
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0B1B3A",
    margin: "12px 0 6px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 15,
    color: "#0B1B3A",
    background: "#fff",
    outline: "none",
  },
  row: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    margin: "8px 0",
  },
  secondaryBtn: {
    background: "#fff",
    color: "#0B1B3A",
    border: "1px solid #d1d5db",
    padding: "9px 14px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  saveBtn: {
    background: "#9F7C34",
    color: "#fff",
    border: "none",
    padding: "11px 22px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  saveError: {
    color: "#b91c1c",
    fontSize: 14,
    margin: "10px 0 0",
  },
};
