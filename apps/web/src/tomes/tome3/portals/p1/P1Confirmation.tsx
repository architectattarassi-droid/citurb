/**
 * /p1/dossier — confirmation après le choix d'un pack (Porte 1).
 *
 * Remplace le tableau de bord client local (P1Dossier/P1Dashboard), dont les
 * pièces téléversées et le paiement n'allaient nulle part (API NestJS éteinte).
 * Le lead et le dossier sont déjà envoyés par P1Packs (/api/lead-funnel/capture,
 * /api/intake). L'espace dossier client revient avec le lot 3b du plan de
 * rebranchement. Aucun appel réseau ici.
 */
import React from "react";
import { Link } from "react-router-dom";
import { useT } from "../../../../i18n/i18n";
import { lienWhatsApp } from "../../../../config/contact";

export default function P1Confirmation() {
  const t = useT();
  const bouton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 18px",
    borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: 15,
  };
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "#0f172a" }}>
      <p style={{ fontSize: 13, letterSpacing: 1.5, color: "#15803d", margin: 0, fontWeight: 700 }}>✓ {t("p1conf.badge")}</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 12px", lineHeight: 1.25 }}>{t("p1conf.title")}</h1>
      <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 28px" }}>{t("p1conf.text")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        <Link to="/rendez-vous" style={{ ...bouton, background: "#0b1b3a", color: "#fff" }}>{t("p1conf.cta_rdv")}</Link>
        <a href={lienWhatsApp(t("p1conf.wa_message"))} target="_blank" rel="noopener noreferrer"
           style={{ ...bouton, background: "#16a34a", color: "#fff" }}>{t("p1conf.cta_whatsapp")}</a>
      </div>
      <p style={{ marginTop: 32 }}>
        <Link to="/" style={{ color: "#1e3a8a" }}>{t("p1conf.back")}</Link>
      </p>
    </main>
  );
}
