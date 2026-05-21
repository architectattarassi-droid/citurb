import React, { useState } from "react";

/**
 * TaamirEmbed — visualisation des documents d'urbanisme officiels via le
 * géoportail TAAMIR (MATNUHPV — Ministère de l'Aménagement du Territoire
 * National, de l'Urbanisme, de l'Habitat et de la Politique de la Ville).
 *
 * TAAMIR agrège +700 documents d'urbanisme approuvés (Plans d'Aménagement
 * PA, PADD, SDAU) des 29 agences urbaines marocaines. Consultation publique.
 *
 * Source : https://www.taamir.gov.ma/karazal/
 *
 * Mode v1 : iframe embed avec lien profond par commune (zoom approximatif).
 * Mode v2 (à tester techniquement) : récupération WMS/WFS directe pour
 * superposition des couches PA dans notre carte MapLibre.
 */
type Props = {
  commune?: string;
  province?: string;
  region?: string;
};

const TAAMIR_BASE_URL = "https://www.taamir.gov.ma/karazal/";

export default function TaamirEmbed({ commune, province, region }: Props) {
  const [open, setOpen] = useState(false);

  const localisation = [commune, province, region].filter(Boolean).join(", ");

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>🏛️ Source officielle</div>
          <div style={S.title}>Documents d'urbanisme — Géoportail TAAMIR</div>
          <div style={S.sub}>
            Plans d'Aménagement (PA), PADD, SDAU approuvés pour votre commune.
            Consultation directe sur le portail officiel du Ministère de l'Urbanisme.
            {localisation && <> Recherchez votre zone : <strong>{localisation}</strong>.</>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <a
            href={TAAMIR_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={S.btnExternal}
          >
            🔗 Ouvrir TAAMIR
          </a>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={S.btnToggle}
          >
            {open ? "✕ Masquer la carte" : "🗺️ Afficher la carte"}
          </button>
        </div>
      </div>

      {open && (
        <div style={S.iframeWrap}>
          <iframe
            src={TAAMIR_BASE_URL}
            title="Géoportail TAAMIR — Documents d'urbanisme du Maroc"
            style={S.iframe}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div style={S.iframeFooter}>
            Source : <a href="https://www.taamir.gov.ma" target="_blank" rel="noopener noreferrer" style={{ color: "#C9A227", fontWeight: 600 }}>taamir.gov.ma</a> ·
            MATNUHPV — données publiques, mises à jour par les 29 agences urbaines.
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    background: "linear-gradient(135deg, rgba(11,27,58,0.04), rgba(201,162,39,0.06))",
    border: "1px solid rgba(11,27,58,0.18)",
    borderLeft: "4px solid #0B1B3A",
    borderRadius: 14,
    padding: 18,
    margin: "16px 0",
  },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "rgba(11,27,58,0.65)", textTransform: "uppercase", marginBottom: 6 },
  title: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 18, fontWeight: 700, color: "#0B1B3A", marginBottom: 6 },
  sub: { fontSize: 13, color: "rgba(11,27,58,0.75)", lineHeight: 1.55, maxWidth: 620 },
  btnExternal: {
    background: "#0B1B3A", color: "#fff", padding: "8px 16px", borderRadius: 8,
    fontWeight: 700, fontSize: 13, textDecoration: "none", textAlign: "center", whiteSpace: "nowrap",
  },
  btnToggle: {
    background: "transparent", color: "#0B1B3A", padding: "8px 16px", borderRadius: 8,
    border: "1px solid rgba(11,27,58,0.25)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
  },
  iframeWrap: { marginTop: 16, background: "#fff", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(11,27,58,0.12)" },
  iframe: { width: "100%", height: 560, border: 0, display: "block" },
  iframeFooter: { padding: "10px 14px", background: "#f8f9fa", fontSize: 11.5, color: "rgba(11,27,58,0.65)", borderTop: "1px solid rgba(11,27,58,0.08)" },
};
