import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * MreDiasporaLanding — page publique du parcours MRE (Pivot Visa du foncier).
 * Cible : 4M Marocains résidents à l'étranger (115 Mrd MAD/an remittances,
 * ~35 Mrd MAD/an vers l'immobilier).
 */
export default function MreDiasporaLanding() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* HERO */}
      <div style={{ background: "linear-gradient(135deg, #0B1B3A 0%, #1a2f5f 100%)", color: "#fff", padding: "64px 20px 72px", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "#E8C66A", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 14 }}>
            CITURBAREA Diaspora · Pivot Visa du foncier
          </div>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 800, lineHeight: 1.15 }}>
            Investissez, héritez, construisez au Maroc — <span style={{ color: "#E8C66A" }}>depuis l'étranger, 100% digital</span>
          </h1>
          <p style={{ marginTop: 18, fontSize: 17, opacity: 0.85, lineHeight: 1.6 }}>
            Procuration adoulaire électronique (signature depuis Montréal, Bruxelles, Paris…),
            mandataire local agréé qui exécute vos démarches, et compte séquestre Bank Al-Maghrib
            qui protège votre argent à chaque jalon validé.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => nav("/mre/dashboard")} style={ctaPrimary}>Créer mon compte MRE</button>
            <button onClick={() => nav("/foncier/estimation")} style={ctaSecondary}>Estimer mon bien</button>
          </div>
        </div>
      </div>

      {/* 3 USE CASES */}
      <div style={{ maxWidth: 1080, margin: "-40px auto 0", padding: "0 20px 56px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        <UseCaseCard emoji="🏛️" title="Héritage à distance" desc="Règlement de succession + partage d'indivision entre héritiers dispersés (Canada, France, Belgique…) sans 8 allers-retours. Procuration eIDAS + Apostille de La Haye." />
        <UseCaseCard emoji="🏘️" title="Achat sécurisé" desc="Achetez un bien que vous voyez en vidéo géolocalisée, dont le prix est vérifié (Zillow MA), avec escrow qui ne libère qu'à la signature notariée confirmée." />
        <UseCaseCard emoji="🏗️" title="Construction supervisée" desc="Construisez votre villa pilotée par CITURBAREA : caméra IA chantier, PV à valeur probante, paiements échelonnés par jalons validés à distance." />
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div style={{ background: "#f9fafb", padding: "56px 20px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#0B1B3A", margin: "0 0 36px" }}>Comment ça marche</h2>
          <div style={{ display: "grid", gap: 16 }}>
            <Step n={1} title="Créez votre profil MRE certifié" desc="Pays de résidence + passeport marocain + attestation consulaire." />
            <Step n={2} title="Choisissez un mandataire local agréé" desc="Avocat ou adoul vérifié par CITURBAREA dans la ville de votre bien." />
            <Step n={3} title="Signez la procuration depuis l'étranger" desc="Signature électronique horodatée + Apostille de La Haye (opposable au Maroc)." />
            <Step n={4} title="Approvisionnez le compte séquestre" desc="Votre argent reste protégé chez Bank Al-Maghrib, libéré jalon par jalon." />
            <Step n={5} title="Suivez tout en temps réel" desc="Vidéos, photos, statuts, validations — vous décidez de chaque libération de fonds." />
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: "#0B1B3A", color: "#fff", padding: "48px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24 }}>
          <Stat big="4 M" small="Marocains à l'étranger" />
          <Stat big="115 Mrd" small="MAD/an de transferts" />
          <Stat big="35 Mrd" small="MAD/an vers l'immobilier" />
          <Stat big="48 h" small="pour estimer un bien" />
        </div>
      </div>
    </div>
  );
}

const ctaPrimary: React.CSSProperties = {
  padding: "14px 28px", borderRadius: 10, border: 0, background: "#E8C66A", color: "#0B1B3A",
  fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
};
const ctaSecondary: React.CSSProperties = {
  padding: "14px 28px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.4)", background: "transparent",
  color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
};

function UseCaseCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(11,27,58,0.1)", borderRadius: 16, padding: 24, boxShadow: "0 8px 24px rgba(11,27,58,0.06)" }}>
      <div style={{ fontSize: 36 }}>{emoji}</div>
      <h3 style={{ margin: "12px 0 8px", fontSize: 18, fontWeight: 700, color: "#0B1B3A" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 14, color: "rgba(11,27,58,0.65)", lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", background: "#fff", padding: 18, borderRadius: 12, border: "1px solid rgba(11,27,58,0.08)" }}>
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "#0B1B3A", color: "#E8C66A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "rgba(11,27,58,0.6)", marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 800, color: "#E8C66A" }}>{big}</div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{small}</div>
    </div>
  );
}
