/**
 * LangSwitcher — Composant UI partagé pour basculer entre FR/AR/EN.
 *
 * Variants:
 *   - "default": pill chips style landing (clair)
 *   - "compact": petit groupe pour topbars sombres
 *   - "minimal": juste 3 codes lang sans fioritures
 *
 * Position recommandée: dans le header avant les boutons d'auth, avec
 * un z-index modéré (10-50). Ne pas mettre en `position: fixed` global
 * car cause overlap avec d'autres éléments du header.
 */

import React from "react";
import { useLang, type Lang } from "./i18n";

export type LangSwitcherProps = {
  variant?: "default" | "compact" | "minimal";
  className?: string;
  style?: React.CSSProperties;
};

const LANGS: Array<{ code: Lang; label: string; flag: string }> = [
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "ar", label: "AR", flag: "🇲🇦" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

export default function LangSwitcher({ variant = "default", className, style }: LangSwitcherProps) {
  const { lang, setLang } = useLang();

  const styles = STYLES[variant];

  return (
    <div className={className} style={{ ...styles.wrap, ...style }} role="group" aria-label="Language">
      {LANGS.map(({ code, label, flag }) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            aria-label={label}
            style={{ ...styles.btn, ...(active ? styles.btnActive : {}) }}
          >
            {variant === "minimal" ? label : <span style={{ fontSize: variant === "compact" ? 12 : 13, fontWeight: 700 }}>{flag} {label}</span>}
          </button>
        );
      })}
    </div>
  );
}

const STYLES: Record<NonNullable<LangSwitcherProps["variant"]>, { wrap: React.CSSProperties; btn: React.CSSProperties; btnActive: React.CSSProperties }> = {
  default: {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: 3,
      background: "#f1f5f9", borderRadius: 99, padding: 3,
      border: "1px solid #e2e8f0",
    },
    btn: {
      background: "none", border: "none", borderRadius: 99,
      padding: "5px 11px", fontSize: 12, fontWeight: 700,
      color: "#64748b", cursor: "pointer", fontFamily: "inherit",
      transition: ".15s",
    },
    btnActive: {
      background: "#fff", color: "#1e3a8a",
      boxShadow: "0 1px 4px rgba(0,0,0,.08)",
    },
  },
  compact: {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: 2,
      background: "#1e293b", borderRadius: 8, padding: 2,
      border: "1px solid #334155",
    },
    btn: {
      background: "transparent", border: 0, borderRadius: 6,
      padding: "4px 8px", fontSize: 11, fontWeight: 600,
      color: "#94a3b8", cursor: "pointer", fontFamily: "inherit",
    },
    btnActive: {
      background: "#0f172a", color: "#22d3ee",
    },
  },
  minimal: {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: 8,
    },
    btn: {
      background: "transparent", border: 0, padding: "2px 4px",
      fontSize: 12, fontWeight: 700, color: "#64748b",
      cursor: "pointer", fontFamily: "inherit",
    },
    btnActive: {
      color: "#1e3a8a", textDecoration: "underline",
    },
  },
};
