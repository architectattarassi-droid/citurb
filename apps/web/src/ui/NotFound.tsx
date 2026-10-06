/**
 * NotFound — page 404 de la SPA (remplace la redirection silencieuse vers
 * l'accueil). noindex : Cloudflare Pages répond 200 pour toute route SPA,
 * la balise évite que Google indexe ces pages comme des doublons.
 */
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { lienTel, lienWhatsApp } from "../config/contact";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page introuvable | CITURBAREA";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  const bouton: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", minHeight: 44, padding: "10px 18px",
    borderRadius: 10, fontWeight: 600, textDecoration: "none", fontSize: 15,
  };

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "#0f172a" }}>
      <p style={{ fontSize: 13, letterSpacing: 2, color: "#64748b", margin: 0 }}>ERREUR 404</p>
      <h1 style={{ fontSize: 28, margin: "8px 0 12px" }}>Cette page n'existe pas</h1>
      <p style={{ color: "#475569", lineHeight: 1.6, margin: "0 0 28px" }}>
        Le lien est peut-être ancien. Vous avez un projet de construction, de rénovation ou un terrain ?
        Un architecte vous répond.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        <Link to="/creer-compte" style={{ ...bouton, background: "#0b1b3a", color: "#fff" }}>Décrire mon projet</Link>
        <a href={lienWhatsApp("Bonjour, je souhaite parler de mon projet.")} target="_blank" rel="noopener noreferrer"
           style={{ ...bouton, background: "#16a34a", color: "#fff" }}>WhatsApp</a>
        <a href={lienTel} style={{ ...bouton, border: "1px solid #0b1b3a", color: "#0b1b3a" }}>Appeler</a>
      </div>
      <p style={{ marginTop: 32 }}>
        <Link to="/" style={{ color: "#1e3a8a" }}>Retour à l'accueil</Link>
      </p>
    </main>
  );
}
