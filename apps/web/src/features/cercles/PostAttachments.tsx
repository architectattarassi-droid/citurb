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
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: compact ? "10px 14px" : "14px 18px",
                background: "#fff",
                border: `1px solid ${CC_THEME.border}`,
                borderRadius: 10,
                textDecoration: "none",
                color: CC_THEME.ink,
                boxShadow: CC_THEME.shadowSoft,
                minWidth: compact ? 220 : 280,
                maxWidth: "100%",
              }}
            >
              <div
                style={{
                  width: compact ? 38 : 48,
                  height: compact ? 46 : 58,
                  borderRadius: 5,
                  background: "#dc2626",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: compact ? 11 : 13,
                  letterSpacing: ".05em",
                  flexShrink: 0,
                }}
              >
                PDF
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: compact ? 13 : 14,
                    fontWeight: 600,
                    color: CC_THEME.navy,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.filename}
                </div>
                <div style={{ fontSize: 11.5, color: CC_THEME.inkMuted, marginTop: 3 }}>
                  PDF{a.sizeBytes ? ` · ${fmtSize(a.sizeBytes)}` : ""} · cliquer pour ouvrir
                </div>
              </div>
            </a>
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
