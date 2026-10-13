/**
 * /login — page d'accès, sans mot de passe.
 *
 * L'ancienne connexion (POST /auth/login) visait l'API NestJS, éteinte. En
 * attendant le compte client léger (lien/code, cookie signé — plan de
 * rebranchement, lot 3a), la page oriente chacun vers ce qui fonctionne :
 *   - client : lien personnel reçu (espace RDV /rdv/:jeton), sinon /creer-compte,
 *     rendez-vous ou WhatsApp ;
 *   - fournisseur : espace fournisseur par code (/cercles/espace) ;
 *   - équipe : /cc/login.
 * Les écrans protégés redirigent ici : personne ne reste bloqué.
 * Aucun appel réseau.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useT } from "../../../i18n/i18n";
import { lienWhatsApp } from "../../../config/contact";

export default function Login() {
  const t = useT();
  return (
    <div style={S.screen}>
      <div style={S.wrap}>
        <div style={S.head}>
          <Link to="/" style={S.back}>← {t("acces.back")}</Link>
          <h1 style={S.title}>{t("acces.title")}</h1>
          <p style={S.sub}>{t("acces.subtitle")}</p>
        </div>

        <section style={S.card}>
          <h2 style={S.h2}>{t("acces.client.title")}</h2>
          <p style={S.text}>{t("acces.client.text")}</p>
          <div style={S.actions}>
            <Link to="/creer-compte" style={{ ...S.btn, ...S.primary }}>{t("acces.client.cta")}</Link>
            <Link to="/rendez-vous" style={{ ...S.btn, ...S.ghost }}>{t("acces.client.rdv")}</Link>
          </div>
        </section>

        <section style={S.card}>
          <h2 style={S.h2}>{t("acces.pro.title")}</h2>
          <p style={S.text}>{t("acces.pro.text")}</p>
          <div style={S.actions}>
            <Link to="/cercles/espace" style={{ ...S.btn, ...S.primary }}>{t("acces.pro.cta")}</Link>
            <Link to="/inscription" style={{ ...S.btn, ...S.ghost }}>{t("acces.pro.inscription")}</Link>
          </div>
        </section>

        <div style={S.footer}>
          <a href={lienWhatsApp(t("sommeil.wa_message", { page: "/login" }))} target="_blank" rel="noopener noreferrer" style={S.wa}>
            {t("acces.whatsapp")}
          </a>
          <Link to="/cc/login" style={S.equipe}>{t("acces.equipe")}</Link>
        </div>
      </div>
    </div>
  );
}

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";

const S: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px",
    background:
      "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72))",
  },
  wrap: { width: "100%", maxWidth: 560 },
  head: { textAlign: "center", marginBottom: 22 },
  back: { textDecoration: "none", color: "rgba(11,27,58,0.68)", fontSize: 14, display: "inline-block", marginBottom: 14 },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 30, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  sub: { fontSize: 15, color: "rgba(11,27,58,0.68)", margin: 0, lineHeight: 1.6 },
  card: {
    background: "rgba(255,255,255,0.95)", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 16,
    boxShadow: "0 12px 40px rgba(11,27,58,0.08)", padding: "20px 20px 18px", marginBottom: 14,
  },
  h2: { fontSize: 18, color: NAVY, margin: "0 0 6px" },
  text: { fontSize: 14, color: "rgba(11,27,58,0.75)", lineHeight: 1.6, margin: "0 0 14px" },
  actions: { display: "flex", flexWrap: "wrap", gap: 10 },
  btn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 16px",
    borderRadius: 10, fontWeight: 600, fontSize: 15, textDecoration: "none",
  },
  primary: { background: NAVY, color: "#fff" },
  ghost: { border: `1px solid ${NAVY}`, color: NAVY },
  footer: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8, fontSize: 14 },
  wa: { color: "#15803d", fontWeight: 600, textDecoration: "none" },
  equipe: { color: GOLD, fontWeight: 600, textDecoration: "none" },
};
