/**
 * RokhasStatusBadge — badge visuel pour un statut Rokhas
 * (décision, jalon, ou état générique).
 */
import React from "react";
import type { RokhasDecisionType, RokhasEventType } from "./rokhas-tracker.api";

export type RokhasBadgeKind =
  | RokhasDecisionType
  | RokhasEventType
  | "EN_INSTRUCTION"
  | "DELIVRE";

const PALETTE: Record<string, { bg: string; fg: string; label: string }> = {
  FAVORABLE:                { bg: "#e7f5ec", fg: "#0a7f3a", label: "Favorable" },
  FAVORABLE_AVEC_RESERVES:  { bg: "#fff5e6", fg: "#b76e00", label: "Favorable avec réserves" },
  DEFAVORABLE:              { bg: "#fde8e8", fg: "#b91c1c", label: "Défavorable" },
  AJOURNE:                  { bg: "#eef2f7", fg: "#3b4a5c", label: "Ajourné" },
  DELIVRE:                  { bg: "#e7f5ec", fg: "#0a7f3a", label: "Permis délivré" },
  EN_INSTRUCTION:           { bg: "#eef2f7", fg: "#3b4a5c", label: "En instruction" },
  DEPOT:                    { bg: "#eef2f7", fg: "#3b4a5c", label: "Dépôt" },
  ACCUSE:                   { bg: "#eef2f7", fg: "#3b4a5c", label: "Accusé de réception" },
  COMMISSION:               { bg: "#eef2f7", fg: "#3b4a5c", label: "Commission" },
  AVIS_AU:                  { bg: "#eef2f7", fg: "#3b4a5c", label: "Avis AU" },
  AVIS_SERVICES:            { bg: "#eef2f7", fg: "#3b4a5c", label: "Avis services" },
  VOTE:                     { bg: "#eef2f7", fg: "#3b4a5c", label: "Vote" },
  DECISION:                 { bg: "#eef2f7", fg: "#3b4a5c", label: "Décision" },
  RESERVE_AJOUTE:           { bg: "#fff5e6", fg: "#b76e00", label: "Réserve ajoutée" },
  RESERVE_LEVEE:            { bg: "#e7f5ec", fg: "#0a7f3a", label: "Réserve levée" },
  DELIVRANCE:               { bg: "#e7f5ec", fg: "#0a7f3a", label: "Délivrance" },
};

const FALLBACK = { bg: "#eef2f7", fg: "#3b4a5c", label: "—" };

export default function RokhasStatusBadge({
  kind,
  label,
  size = "md",
}: {
  kind: RokhasBadgeKind | string;
  label?: string;
  size?: "sm" | "md";
}) {
  const p = PALETTE[kind] || FALLBACK;
  const padding = size === "sm" ? "2px 8px" : "4px 10px";
  const fontSize = size === "sm" ? 11 : 12;
  return (
    <span
      style={{
        display: "inline-block",
        padding,
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        fontSize,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label || p.label}
    </span>
  );
}
