/**
 * cerclePostToArticle — convertit une publication PUBLIQUE Cercles
 * (`/api/feed/public`) vers la forme `Article` afin qu'elle s'affiche dans la
 * section « médias » de la landing AVEC LE MÊME RENDU que les articles du journal
 * (composant <ArticleCard/>). Les liens YouTube présents dans le corps sont
 * rendus : miniature en couverture + lecteur intégré dans le contenu déplié.
 */
import type { Article } from "../../features/media/articles/types";
import type { CerclePost } from "../../features/cercles/api";

const YT_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/g;

export function youtubeIds(text: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  YT_RE.lastIndex = 0;
  while ((m = YT_RE.exec(text || ""))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripUrls(s: string): string {
  return (s || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

function bodyToParagraphs(body: string): string {
  const blocks = (body || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!blocks.length) return "";
  return blocks
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function ytEmbeds(ids: string[]): string {
  return ids
    .map(
      (id) =>
        `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:14px 0;background:#000">` +
        `<iframe src="https://www.youtube.com/embed/${id}" title="Vidéo YouTube" loading="lazy" ` +
        `frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" ` +
        `allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"></iframe></div>`
    )
    .join("");
}

function excerptOf(body: string, n = 240): string {
  const t = stripUrls(body);
  return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
}

export function cerclePostToArticle(p: CerclePost): Article {
  const name =
    p.author?.username || p.author?.email?.split("@")[0] || "Membre Cercles";
  const ids = youtubeIds(`${p.title || ""}\n${p.body || ""}`);
  const isAr = /[؀-ۿ]/.test(p.body || p.title || "");
  const title =
    (p.title || "").trim() ||
    excerptOf(p.body, 80) ||
    "Publication de la communauté";

  const content =
    (ids.length ? ytEmbeds(ids) : "") +
    bodyToParagraphs(p.body) +
    `<p style="margin-top:14px"><a href="/post/${p.id}" style="color:#1e3a8a;font-weight:700;text-decoration:none">Voir la discussion sur Cercles →</a></p>`;

  return {
    id: p.id,
    title,
    lang: isAr ? "ar" : "fr",
    // Badge « Cercles » distinctif (hors énum stricte → couleur par défaut).
    category: "Cercles" as Article["category"],
    tags: ["Communauté"],
    excerpt: excerptOf(p.body),
    content,
    cover: ids.length ? `https://img.youtube.com/vi/${ids[0]}/hqdefault.jpg` : undefined,
    status: "published",
    authorName: name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
