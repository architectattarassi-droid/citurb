/**
 * EnSommeil — page « bientôt disponible » d'un module dont le back-end était
 * l'API NestJS, éteinte (docs/architecture/plan-rebranchement.md).
 *
 * Aucun appel réseau, noindex, et toujours une issue : décrire son projet,
 * WhatsApp, rendez-vous visio. La route reste déclarée (les anciens liens ne
 * tombent pas en 404) mais n'apparaît plus dans les menus.
 *
 * variante="admin" : panneau sobre dans le back-office (/cc), sans appel à
 * l'action client.
 */
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { lienWhatsApp } from "../config/contact";
import { useT } from "../i18n/i18n";

type Props = {
  /** Nom du module (FR) : titre côté admin, contexte du message WhatsApp côté public. */
  module?: string;
  variante?: "public" | "admin";
  /** Lien de remplacement déjà disponible. Public : `libelle` est une clé i18n (sommeil.alt.*) ; admin : texte. */
  alternative?: { to: string; libelle: string };
};

export default function EnSommeil({ module, variante = "public", alternative }: Props) {
  const t = useT();

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  if (variante === "admin") {
    return (
      <div style={A.box} data-en-sommeil="admin">
        <div style={A.badge}>En cours de rebranchement</div>
        <h2 style={A.title}>{module ?? "Module"} — en sommeil</h2>
        <p style={A.text}>
          Ce module lisait l'ancienne API (éteinte). Il sera rebranché sur Cloudflare + Neon
          selon l'ordre de valeur du plan (docs/architecture/plan-rebranchement.md). Aucune donnée n'est perdue :
          les leads, rendez-vous, fournisseurs et terrains sont déjà sur le nouveau back-end.
        </p>
        <div style={A.links}>
          {alternative && <Link to={alternative.to} style={A.link}>→ {alternative.libelle}</Link>}
          <Link to="/cc/leads" style={A.link}>→ Leads</Link>
          <Link to="/cc/rendez-vous" style={A.link}>→ Rendez-vous</Link>
        </div>
      </div>
    );
  }

  const bouton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "10px 18px",
    borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: 15,
  };

  return (
    <main style={{ maxWidth: 580, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "#0f172a" }} data-en-sommeil="public">
      <p style={{ fontSize: 13, letterSpacing: 1.5, color: "#a16207", margin: 0, fontWeight: 700 }}>{t("sommeil.badge")}</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 12px", lineHeight: 1.25 }}>{t("sommeil.title")}</h1>
      <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 28px" }}>{t("sommeil.text")}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {alternative && <Link to={alternative.to} style={{ ...bouton, background: "#C9A227", color: "#0b1b3a" }}>{t(alternative.libelle)}</Link>}
        <Link to="/creer-compte" style={{ ...bouton, background: "#0b1b3a", color: "#fff" }}>{t("sommeil.cta_projet")}</Link>
        <a href={lienWhatsApp(t("sommeil.wa_message", { page: module ?? "" }))} target="_blank" rel="noopener noreferrer"
           style={{ ...bouton, background: "#16a34a", color: "#fff" }}>{t("sommeil.cta_whatsapp")}</a>
        <Link to="/rendez-vous" style={{ ...bouton, border: "1px solid #0b1b3a", color: "#0b1b3a" }}>{t("sommeil.cta_rdv")}</Link>
      </div>
      <p style={{ marginTop: 32 }}>
        <Link to="/" style={{ color: "#1e3a8a" }}>{t("sommeil.back")}</Link>
      </p>
    </main>
  );
}

const A: Record<string, React.CSSProperties> = {
  box: { maxWidth: 680, margin: "24px auto", padding: 24, borderRadius: 12, border: "1px dashed rgba(15,42,74,0.3)", background: "rgba(15,42,74,0.03)", color: "#0F2A4A" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#92400e", background: "#fef3c7", padding: "3px 8px", borderRadius: 6 },
  title: { fontSize: 20, margin: "12px 0 8px" },
  text: { fontSize: 14, lineHeight: 1.6, color: "#334155", margin: "0 0 16px" },
  links: { display: "flex", flexWrap: "wrap", gap: 16 },
  link: { color: "#1e3a8a", fontWeight: 600, textDecoration: "none", fontSize: 14 },
};
