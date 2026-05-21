import React from "react";
import { CC_THEME } from "./theme";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * PostAttachments — rend les pièces jointes d'un post de manière adaptée
 * au type de fichier :
 *  - image  → miniature cliquable (ouvre la version full en nouvel onglet)
 *  - vidéo  → lecteur avec contrôles
 *  - audio  → lecteur audio
 *  - PDF    → carte « document » avec icône, nom, taille, clic pour ouvrir
 *  - autre  → lien fichier
 *
 * Prop `compact` réduit les tailles (utilisée dans les cartes du fil).
 */

type Attachment = {
  id?: string;
  fileKey: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
};

const fmtSize = (n?: number) => {
  if (!n) return "";
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
};

export function PostAttachments({ attachments, compact }: { attachments: Attachment[]; compact?: boolean }) {
  if (!attachments || attachments.length === 0) return null;

  const imageMax = compact ? 180 : 320;
  const videoMax = compact ? 360 : 520;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
      {attachments.map((a, idx) => {
        const url = `${apiBase()}/uploads/${a.fileKey}`;
        const key = a.id || a.fileKey || String(idx);

        if (/^image\//.test(a.mimeType)) {
          return (
            <a key={key} href={url} target="_blank" rel="noreferrer" style={{ display: "block", lineHeight: 0 }}>
              <img
                src={url}
                alt={a.filename}
                style={{
                  maxWidth: imageMax,
                  maxHeight: Math.round(imageMax * 0.78),
                  objectFit: "cover",
                  borderRadius: 8,
                  border: `1px solid ${CC_THEME.border}`,
                  display: "block",
                }}
              />
            </a>
          );
        }

        if (/^video\//.test(a.mimeType)) {
          return (
            <video
              key={key}
              src={url}
              controls
              preload="metadata"
              style={{ maxWidth: videoMax, width: "100%", borderRadius: 8, background: "#000" }}
            />
          );
        }

        if (/^audio\//.test(a.mimeType)) {
          return (
            <audio
              key={key}
              src={url}
              controls
              preload="metadata"
              style={{ maxWidth: videoMax, width: "100%" }}
            />
          );
        }

        if (a.mimeType === "application/pdf") {
          return (
            <div key={key} style={{ width: "100%", maxWidth: compact ? 560 : 720 }}>
              {/* Aperçu PDF intégré (rendu natif du navigateur) */}
              <iframe
                src={`${url}#view=FitH`}
                title={a.filename}
                style={{
                  width: "100%",
                  height: compact ? 460 : 620,
                  border: `1px solid ${CC_THEME.border}`,
                  borderRadius: 8,
                  background: "#fff",
                  display: "block",
                }}
              />
              {/* Lien de téléchargement / ouverture en grand sous l'aperçu */}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download={a.filename}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
                  padding: "8px 12px",
                  background: "#fff",
                  border: `1px solid ${CC_THEME.border}`,
                  borderRadius: 8,
                  textDecoration: "none",
                  color: CC_THEME.ink,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    background: "#dc2626", color: "#fff", padding: "3px 7px",
                    borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: ".05em",
                  }}
                >PDF</span>
                <span style={{ flex: 1, fontWeight: 600, color: CC_THEME.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.filename}
                </span>
                {a.sizeBytes ? <span style={{ color: CC_THEME.inkMuted, fontSize: 12 }}>{fmtSize(a.sizeBytes)}</span> : null}
                <span style={{ color: CC_THEME.or, fontWeight: 600 }}>↓ Télécharger</span>
              </a>
            </div>
          );
        }

        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 13,
              padding: "9px 14px",
              background: CC_THEME.bgSoft,
              borderRadius: 6,
              color: CC_THEME.inkMid,
              textDecoration: "none",
            }}
          >
            📎 {a.filename}
          </a>
        );
      })}
    </div>
  );
}
