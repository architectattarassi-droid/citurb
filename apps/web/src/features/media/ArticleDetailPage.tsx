import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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
  authorName?: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <a href="/media" style={S.linkBack}>← {isAr ? "العودة" : article.lang === "en" ? "Back" : "Retour"}</a>

        <div style={S.metaTop}>
          <span style={S.category}>{article.category}</span>
          {publishedDate && <span style={S.date}>{publishedDate}</span>}
          {article.authorName && <span style={S.author}>· {article.authorName}</span>}
        </div>

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
};
