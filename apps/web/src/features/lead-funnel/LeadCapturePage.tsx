import React from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n/i18n";
import LeadCaptureForm from "./LeadCaptureForm";

/**
 * LeadCapturePage — /creer-compte et /creer-compte/client en mode
 * VITE_SIGNUP_MODE=lead (phase récolte, cf. signupMode.ts).
 *
 * Nom + téléphone (+ email facultatif) → POST /api/lead-funnel/capture.
 * Aucun compte créé, aucun code SMS/email demandé.
 */
export default function LeadCapturePage() {
  const t = useT();

  return (
    <div style={S.screen}>
      <div style={S.wrap}>
        <div style={S.head}>
          <Link to="/" style={S.back}>← {t("lead.page.back")}</Link>
          <h1 style={S.title}>{t("lead.page.title")}</h1>
          <p style={S.sub}>{t("lead.page.subtitle")}</p>
        </div>

        <div style={S.formWrap}>
          <LeadCaptureForm source="WEB_SIGNUP" withEmail />
        </div>

        <div style={S.footer}>
          {t("lead.page.pro")} <Link to="/inscription" style={S.footerLink}>{t("lead.page.pro_cta")}</Link>
          <br />
          {t("lead.page.already")} <Link to="/login" style={S.footerLink}>{t("lead.page.login")}</Link>
        </div>
      </div>
    </div>
  );
}

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    background:
      "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
  },
  wrap: { width: "100%", maxWidth: 520 },
  head: { textAlign: "center", marginBottom: 24 },
  back: { textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: 14, display: "inline-block", marginBottom: 16 },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  sub: { fontSize: 15, color: "rgba(11,27,58,0.68)", margin: 0, lineHeight: 1.6 },
  formWrap: { display: "flex", justifyContent: "center" },
  footer: { textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(11,27,58,0.68)", lineHeight: 1.9 },
  footerLink: { color: GOLD, fontWeight: 600, textDecoration: "none" },
};
