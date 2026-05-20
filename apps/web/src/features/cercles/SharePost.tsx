import React, { useState } from "react";
import { CC_THEME } from "./theme";

/**
 * SharePost — boutons de partage WhatsApp / Facebook / X / LinkedIn + copier-lien.
 *
 * Utilisé pour les posts publics du fil général et sur la page publique
 * /post/:id. La cible des partages est l'URL publique du post (ouvrable
 * sans authentification, indexable par les réseaux sociaux).
 */
export function SharePost({ url, title, compact }: { url: string; title?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = title || "Découvrez ce post CITURBAREA Cercles";
  const enc = (s: string) => encodeURIComponent(s);

  const targets: Array<{ name: string; href: string; label: string; bg: string }> = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(text + " — " + url)}`, label: "WhatsApp", bg: "#25D366" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, label: "Facebook", bg: "#1877F2" },
    { name: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, label: "X", bg: "#0F1419" },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, label: "LinkedIn", bg: "#0A66C2" },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard refusé */ }
  };

  const btnBase: React.CSSProperties = {
    padding: compact ? "5px 10px" : "9px 14px",
    borderRadius: 6,
    fontSize: compact ? 11.5 : 13,
    fontWeight: 600,
    color: "#fff",
    textDecoration: "none",
    border: 0,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
  const icon: React.CSSProperties = { fontSize: compact ? 13 : 14, lineHeight: 1 };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {targets.map((t, i) => (
        <a
          key={t.name}
          href={t.href}
          target="_blank"
          rel="noreferrer noopener"
          style={{ ...btnBase, background: t.bg }}
          title={`Partager sur ${t.name}`}
        >
          <span style={icon}>{["💬", "📘", "𝕏", "in"][i]}</span>
          {t.label}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        style={{ ...btnBase, background: copied ? "#16a34a" : CC_THEME.navy }}
        title="Copier le lien public"
      >
        <span style={icon}>{copied ? "✓" : "🔗"}</span>
        {copied ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
