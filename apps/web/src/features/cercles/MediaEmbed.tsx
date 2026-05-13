/**
 * MediaEmbed — détecte un type d'URL et affiche un embed approprié
 * sans sortir de la plateforme :
 *  - YouTube → iframe embed
 *  - Facebook video/post → iframe FB plugin
 *  - Image (jpg/png/webp/gif) → <img>
 *  - Vidéo MP4 directe → <video controls>
 *  - Autre → lien cliquable simple (target=_blank)
 */
import React from "react";

type Props = { url: string; maxWidth?: number };

function parseYouTubeId(url: string): string | null {
  // youtu.be/<id>
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,15})/);
  if (short) return short[1];
  // youtube.com/watch?v=<id>
  const long = url.match(/[?&]v=([A-Za-z0-9_-]{6,15})/);
  if (long) return long[1];
  // youtube.com/shorts/<id>
  const shorts = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,15})/);
  if (shorts) return shorts[1];
  // youtube.com/embed/<id>
  const emb = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,15})/);
  if (emb) return emb[1];
  return null;
}

function isFacebookUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(facebook\.com|fb\.watch)\//i.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\//i.test(url);
}

function isVimeoUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function isImage(url: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url);
}
function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export default function MediaEmbed({ url, maxWidth = 560 }: Props) {
  const yt = parseYouTubeId(url);
  if (yt) {
    return (
      <div style={{ ...S.wrap, maxWidth, aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          title="YouTube video"
          frameBorder={0}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, borderRadius: 8 }}
        />
      </div>
    );
  }

  if (isFacebookUrl(url)) {
    const enc = encodeURIComponent(url);
    // Plugin FB officiel — pas besoin de SDK si on charge l'iframe direct
    return (
      <div style={{ ...S.wrap, maxWidth, aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.facebook.com/plugins/video.php?href=${enc}&show_text=false&width=${maxWidth}&t=0`}
          title="Facebook video"
          frameBorder={0}
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          style={{ width: "100%", height: "100%", border: 0, borderRadius: 8, background: "#000" }}
        />
        <div style={S.openExt}>
          <a href={url} target="_blank" rel="noreferrer">Si la vidéo ne s'affiche pas → ouvrir sur Facebook</a>
        </div>
      </div>
    );
  }

  if (isInstagramUrl(url)) {
    return (
      <div style={{ ...S.wrap, maxWidth }}>
        <iframe
          src={`${url.replace(/\/$/, "")}/embed/`}
          title="Instagram"
          frameBorder={0}
          scrolling="no"
          allowTransparency
          style={{ width: "100%", height: 560, border: 0, borderRadius: 8 }}
        />
      </div>
    );
  }

  const vimeoId = isVimeoUrl(url);
  if (vimeoId) {
    return (
      <div style={{ ...S.wrap, maxWidth, aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title="Vimeo video"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0, borderRadius: 8 }}
        />
      </div>
    );
  }

  if (isImage(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", maxWidth }}>
        <img src={url} alt="" style={{ width: "100%", borderRadius: 8, display: "block" }} />
      </a>
    );
  }

  if (isVideo(url)) {
    return (
      <video src={url} controls style={{ width: "100%", maxWidth, borderRadius: 8, background: "#000" }} />
    );
  }

  // Fallback : lien cliquable
  return (
    <a href={url} target="_blank" rel="noreferrer" style={S.link}>🔗 {url}</a>
  );
}

/**
 * Détecte si une URL est embeddable (pas un simple lien à laisser tel quel)
 */
export function isEmbeddable(url: string): boolean {
  return !!(
    parseYouTubeId(url) ||
    isFacebookUrl(url) ||
    isInstagramUrl(url) ||
    isVimeoUrl(url) ||
    isImage(url) ||
    isVideo(url)
  );
}

/**
 * Extrait toutes les URLs d'un texte
 */
export function extractUrls(text: string): string[] {
  const re = /(https?:\/\/[^\s)<>"]+)/g;
  return Array.from(text.matchAll(re)).map((m) => m[1]);
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: "100%", margin: "10px 0", position: "relative" },
  link: { color: "inherit", textDecoration: "underline", wordBreak: "break-all" },
  openExt: { fontSize: 11, color: "#8B91A1", marginTop: 4 },
};
