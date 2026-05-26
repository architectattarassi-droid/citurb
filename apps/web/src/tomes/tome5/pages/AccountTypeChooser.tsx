import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useT } from "../../../i18n/i18n";

/**
 * AccountTypeChooser — /creer-compte
 *
 * Sépare les deux publics avant l'inscription :
 *  - Professionnel du BTP  → réseau Cercles (/inscription)
 *  - Particulier / client  → espace client (/creer-compte/client)
 *
 * Accepte ?redirect= pour conserver la destination d'origine (porte P1…)
 * jusqu'à la fin de l'inscription client.
 */
export default function AccountTypeChooser() {
  const t = useT();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || params.get("next") || "";
  const clientHref = redirect
    ? `/creer-compte/client?redirect=${encodeURIComponent(redirect)}`
    : "/creer-compte/client";

  return (
    <div style={S.screen}>
      <div style={S.wrap}>
        <div style={S.head}>
          <Link to="/" style={S.back}>← {t("auth.back_home")}</Link>
          <h1 style={S.title}>{t("auth.signup_title")}</h1>
          <p style={S.sub}>{t("auth.signup_subtitle")}</p>
        </div>

        <div style={S.grid}>
          <Link to="/inscription" style={{ ...S.card, ...S.cardPro }}>
            <div style={S.icon}>📐</div>
            <div style={S.cardTitle}>{t("auth.profile_pro")}</div>
            <p style={S.cardDesc}>
              {t("auth.profile_pro_desc")}
            </p>
            <span style={{ ...S.cta, ...S.ctaPro }}>{t("auth.profile_pro_cta")} →</span>
          </Link>

          <Link to={clientHref} style={{ ...S.card, ...S.cardClient }}>
            <div style={S.icon}>🏠</div>
            <div style={S.cardTitle}>{t("auth.profile_client")}</div>
            <p style={S.cardDesc}>
              {t("auth.profile_client_desc")}
            </p>
            <span style={{ ...S.cta, ...S.ctaClient }}>{t("auth.profile_client_cta")} →</span>
          </Link>
        </div>

        <div style={S.footer}>
          {t("auth.already_account")} <Link to="/login" style={S.footerLink}>{t("auth.sign_in_btn")}</Link>
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
  wrap: { width: "100%", maxWidth: 760 },
  head: { textAlign: "center", marginBottom: 28 },
  back: { textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: 14, display: "inline-block", marginBottom: 16 },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 34, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  sub: { fontSize: 15, color: "rgba(11,27,58,0.68)", margin: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
  card: {
    display: "flex",
    flexDirection: "column",
    textDecoration: "none",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 20,
    padding: "30px 26px",
    boxShadow: "0 20px 60px rgba(11,27,58,0.12)",
  },
  cardPro: { borderTop: `4px solid ${NAVY}` },
  cardClient: { borderTop: `4px solid ${GOLD}` },
  icon: { fontSize: 34, marginBottom: 12 },
  cardTitle: { fontFamily: '"Playfair Display", serif', fontSize: 21, fontWeight: 700, color: NAVY, marginBottom: 10 },
  cardDesc: { fontSize: 13.5, color: "rgba(11,27,58,0.68)", lineHeight: 1.6, margin: "0 0 20px", flex: 1 },
  cta: { fontSize: 14, fontWeight: 700, padding: "12px 16px", borderRadius: 12, textAlign: "center" },
  ctaPro: { background: "linear-gradient(135deg, #0B1B3A, #123A7A)", color: "#fff" },
  ctaClient: { background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#fff" },
  footer: { textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(11,27,58,0.68)" },
  footerLink: { color: GOLD, fontWeight: 600, textDecoration: "none" },
};
