import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { ArticlesService } from "./articles.service";

/**
 * OG Pre-render middleware
 *
 * Intercepte les requêtes des CRAWLERS sociaux (WhatsApp, Facebook, LinkedIn,
 * Twitter, etc.) sur les URLs d'articles et leur sert un HTML minimal avec les
 * balises Open Graph dynamiques (image, titre, description, URL canonique de
 * l'article) AVANT que le SPA React ne charge — les bots ne savent pas exécuter
 * JS, donc sans cette interception ils verraient les balises OG statiques par
 * défaut de index.html (mêmes pour toutes les pages).
 *
 * URLs interceptées :
 *   - /media/article/:slug  → article spécifique (cover article)
 *
 * Comportement :
 *   - Bot détecté + URL article + article PUBLISHED → HTML mini avec OG dynamique
 *   - Bot détecté + URL article + article introuvable → next() (le SPA gère 404)
 *   - Pas bot OU URL non-article → next() (le SPA prend la main)
 *
 * Pour debug, on peut forcer le pré-rendu en ajoutant ?_og=1 à l'URL.
 */
@Injectable()
export class OgPrerenderMiddleware implements NestMiddleware {
  // Liste fermée des User-Agents des bots sociaux connus. Conservative pour
  // éviter de servir le HTML mini à un humain.
  private readonly BOT_REGEX =
    /facebookexternalhit|facebookcatalog|Facebot|whatsapp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Applebot|Googlebot-Image|bingbot|DuckDuckBot|YandexBot|Embedly|Quora Link Preview|skypeuripreview|Iframely|Tumblr|vkShare|W3C_Validator/i;

  constructor(private readonly articlesService: ArticlesService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ua = (req.headers["user-agent"] as string) || "";
    const url = req.originalUrl || req.url || "";
    const forceOg = req.query._og === "1";

    const isBot = forceOg || this.BOT_REGEX.test(ua);
    if (!isBot) return next();

    // Pattern d'URL d'article — accepte /media/article/<slug>(?...)?
    // On garde large pour matcher /media/article/<slug>/ ou ?
    const match = /^\/media\/article\/([^/?#]+)/i.exec(url);
    if (!match) return next();
    const slug = decodeURIComponent(match[1]);

    try {
      const article = await this.articlesService.getBySlugPublic(slug);
      const html = this.renderArticleOgHtml(article, req);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=600"); // 10 min cache CDN
      res.status(200).send(html);
      return;
    } catch {
      // Article introuvable ou non publié → laisser le SPA gérer (page 404)
      return next();
    }
  }

  private renderArticleOgHtml(a: any, req: Request): string {
    const protoHeader = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "citurbarea.com";
    const canonical = `${protoHeader}://${host}/media/article/${encodeURIComponent(a.slug)}`;
    const title = escapeHtml(a.title || "Article CITURBAREA");
    const description = escapeHtml(truncate(a.excerpt || "", 200));
    const langAttr = a.lang === "ar" ? "ar" : a.lang === "en" ? "en" : "fr";
    const dirAttr = a.lang === "ar" ? "rtl" : "ltr";
    const cover = a.cover || `${protoHeader}://${host}/og-default.png`;
    const coverAbsolute = /^https?:\/\//i.test(cover) ? cover : `${protoHeader}://${host}${cover.startsWith("/") ? "" : "/"}${cover}`;
    const coverWidth = a.coverWidth || 1200;
    const coverHeight = a.coverHeight || 630;
    const publishedAt = a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date(a.createdAt).toISOString();
    const updatedAt = new Date(a.updatedAt || a.createdAt).toISOString();
    const tags = Array.isArray(a.tags) ? a.tags : [];
    const author = escapeHtml(a.authorName || "CITURBAREA");

    const tagsMeta = tags.map((t: string) => `  <meta property="article:tag" content="${escapeHtml(t)}" />`).join("\n");

    return `<!doctype html>
<html lang="${langAttr}" dir="${dirAttr}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — CITURBAREA</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />

<!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
<meta property="og:type" content="article" />
<meta property="og:site_name" content="CITURBAREA" />
<meta property="og:url" content="${canonical}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${coverAbsolute}" />
<meta property="og:image:secure_url" content="${coverAbsolute}" />
<meta property="og:image:type" content="${guessImageType(coverAbsolute)}" />
<meta property="og:image:width" content="${coverWidth}" />
<meta property="og:image:height" content="${coverHeight}" />
<meta property="og:image:alt" content="${title}" />
<meta property="og:locale" content="${langAttr === "ar" ? "ar_MA" : langAttr === "en" ? "en_US" : "fr_MA"}" />
<meta property="article:published_time" content="${publishedAt}" />
<meta property="article:modified_time" content="${updatedAt}" />
<meta property="article:author" content="${author}" />
<meta property="article:section" content="${escapeHtml(a.category || "Article")}" />
${tagsMeta}

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${coverAbsolute}" />
<meta name="twitter:image:alt" content="${title}" />

<!-- JSON-LD pour Google -->
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": a.title,
  "description": a.excerpt,
  "image": coverAbsolute,
  "datePublished": publishedAt,
  "dateModified": updatedAt,
  "author": { "@type": "Person", "name": a.authorName || "CITURBAREA" },
  "publisher": {
    "@type": "Organization",
    "name": "CITURBAREA",
    "logo": { "@type": "ImageObject", "url": `${protoHeader}://${host}/icons/icon.svg` },
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
  "articleSection": a.category,
  "inLanguage": langAttr,
  "keywords": tags.join(", "),
})}
</script>

<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:32px auto;padding:0 24px;color:#0B1B3A;line-height:1.6}h1{font-size:28px;margin:0 0 12px}.cover{width:100%;max-width:1200px;height:auto;border-radius:8px;margin:16px 0}.meta{color:#6b7280;font-size:14px;margin-bottom:24px}</style>
</head>
<body>
<h1>${title}</h1>
<div class="meta">Par ${author} · ${new Date(publishedAt).toLocaleDateString(langAttr === "ar" ? "ar-MA" : langAttr === "en" ? "en-US" : "fr-MA", { day: "numeric", month: "long", year: "numeric" })}</div>
${a.cover ? `<img class="cover" src="${coverAbsolute}" alt="${title}" />` : ""}
<p>${description}</p>
<p><a href="${canonical}">Lire l'article complet sur CITURBAREA →</a></p>
</body>
</html>`;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function guessImageType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
