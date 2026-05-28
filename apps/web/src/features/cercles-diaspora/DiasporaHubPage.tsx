import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * DiasporaHubPage — hub central de la communauté MRE (/cercles/diaspora).
 * Agrège les briques du parcours MRE : estimation, mandataires, OPCI, procuration.
 */
export default function DiasporaHubPage() {
  const nav = useNavigate();
  const tiles = [
    { emoji: "📊", title: "Estimer un bien", desc: "Valeur réelle 48h (Zillow MA)", to: "/foncier/estimation" },
    { emoji: "⚖️", title: "Trouver un mandataire", desc: "Avocats & adouls agréés", to: "/mandataires" },
    { emoji: "🏘️", title: "Investir en OPCI", desc: "Immobilier fractionné AMMC", to: "/opci" },
    { emoji: "🗂️", title: "Mon parcours MRE", desc: "Procurations & escrow", to: "/mre" },
  ];
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.18em", textTransform: "uppercase" }}>CITURBAREA · Cercles Diaspora</div>
      <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color: "#0B1B3A" }}>Maroc Diaspora Hub</h1>
      <p style={{ fontSize: 14.5, color: "rgba(11,27,58,0.6)", marginTop: 6, maxWidth: 620 }}>
        Tout ce qu'il faut pour investir, hériter et construire au Maroc depuis l'étranger — en un seul endroit.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
        {tiles.map((t) => (
          <button key={t.to} onClick={() => nav(t.to)} style={{
            textAlign: "left", background: "#fff", border: "1px solid rgba(11,27,58,0.1)", borderRadius: 16,
            padding: 20, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(11,27,58,0.05)",
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
            <div style={{ fontSize: 32 }}>{t.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0B1B3A", marginTop: 10 }}>{t.title}</div>
            <div style={{ fontSize: 13, color: "rgba(11,27,58,0.6)", marginTop: 2 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 24, background: "linear-gradient(135deg, #0B1B3A, #1a2f5f)", color: "#fff", borderRadius: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#E8C66A" }}>🔴 Live Shopping immobilier — bientôt</div>
        <p style={{ fontSize: 14, opacity: 0.85, marginTop: 8, lineHeight: 1.6, margin: "8px 0 0" }}>
          Chaque mois, un immeuble vendu en direct à la diaspora : due diligence publique, Q&A live,
          souscription OPCI en temps réel. Inscrivez-vous pour être notifié du prochain événement.
        </p>
      </div>
    </div>
  );
}
