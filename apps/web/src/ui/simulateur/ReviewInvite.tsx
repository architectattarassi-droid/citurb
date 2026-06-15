import React, { useState } from "react";
import { CC } from "../../command-center/theme/tokens";

/**
 * ReviewInvite — encart non bloquant d'invitation à laisser un avis Google.
 * Affiché après livraison du résultat détaillé. Fermable, facultatif, ne bloque rien.
 * URL via VITE_GOOGLE_REVIEW_URL (si absente, l'encart ne s'affiche pas).
 */
export default function ReviewInvite() {
  const url = (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL as string | undefined;
  const [closed, setClosed] = useState(false);
  if (!url || closed) return null;

  return (
    <div
      style={{
        marginTop: 24,
        background: CC.color.bgSoft,
        border: `1px solid ${CC.color.border}`,
        borderRadius: CC.size.radiusLg,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 22 }}>⭐</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: CC.color.ink, fontSize: 15 }}>
          Cet outil vous a été utile ?
        </div>
        <div style={{ color: CC.color.inkMid, fontSize: 13 }}>
          Votre avis nous aide à accompagner d'autres porteurs de projet.
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: CC.color.or,
          color: "#fff",
          padding: "8px 16px",
          borderRadius: CC.size.radius,
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        Laisser un avis
      </a>
      <button
        onClick={() => setClosed(true)}
        aria-label="Fermer"
        style={{
          background: "transparent",
          border: "none",
          color: CC.color.inkMuted,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
