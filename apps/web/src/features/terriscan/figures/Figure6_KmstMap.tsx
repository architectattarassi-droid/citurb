// Figure 6 — Carte schématique KMST (3 communes)
// Habitat International — schéma géométrique, point rouge Bir Rami Sud

interface Props { caption?: string }

export default function Figure6_KmstMap({ caption }: Props) {
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 720 480" width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <text x="360" y="22" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }}>
          KMST case-study system · Kénitra-Mehdiya-Sidi Taibi · Schematic geometry
        </text>

        {/* Façade atlantique (gauche) */}
        <path d="M0,40 L0,440 L120,440 Q140,300 130,200 Q125,120 115,40 Z" fill="#e8f0f7" stroke="#3a7ab2" strokeWidth="1"/>
        <text x="40" y="240" style={{ fontSize: 10, fill: "#3a7ab2", fontStyle: "italic" }}>Atlantic Ocean</text>

        {/* Sebou estuary (rivière) */}
        <path d="M120,200 Q200,180 280,210 Q360,240 440,220 Q520,200 600,230 L720,250"
          fill="none" stroke="#3a7ab2" strokeWidth="2" opacity="0.6"/>
        <text x="500" y="215" style={{ fontSize: 9, fill: "#3a7ab2", fontStyle: "italic" }}>Sebou estuary →</text>

        {/* MEHDIYA — petite, littorale */}
        <circle cx="160" cy="180" r="28" fill="#fafafa" stroke="#111" strokeWidth="1"/>
        <text x="160" y="180" textAnchor="middle" style={{ fontSize: 11, fontWeight: 600 }}>Mehdiya</text>
        <text x="160" y="195" textAnchor="middle" style={{ fontSize: 9, fill: "#444" }}>~50K · w=0.071</text>
        <text x="160" y="148" textAnchor="middle" style={{ fontSize: 8, fill: "#444" }}>S_CUE=0.381 · PA 2018 valid</text>

        {/* KÉNITRA — grande, centrale */}
        <circle cx="340" cy="260" r="68" fill="#fafafa" stroke="#111" strokeWidth="1.5"/>
        <text x="340" y="258" textAnchor="middle" style={{ fontSize: 13, fontWeight: 700 }}>Kénitra</text>
        <text x="340" y="276" textAnchor="middle" style={{ fontSize: 10, fill: "#444" }}>~450K · w=0.643</text>
        <text x="340" y="292" textAnchor="middle" style={{ fontSize: 9, fill: "#444" }}>S_CUE=0.745 · PA 2024 cancelled</text>

        {/* SIDI TAIBI — péri-urbaine sud */}
        <ellipse cx="480" cy="360" rx="65" ry="45" fill="#fafafa" stroke="#111" strokeWidth="1"/>
        <text x="480" y="358" textAnchor="middle" style={{ fontSize: 12, fontWeight: 600 }}>Sidi Taibi</text>
        <text x="480" y="374" textAnchor="middle" style={{ fontSize: 10, fill: "#444" }}>~220K · w=0.286</text>
        <text x="480" y="390" textAnchor="middle" style={{ fontSize: 9, fill: "#444" }}>S_CUE=0.241 · PA 2005 expired</text>

        {/* A1 motorway */}
        <line x1="120" y1="260" x2="600" y2="260" stroke="#444" strokeWidth="2" strokeDasharray="6 3"/>
        <text x="610" y="263" style={{ fontSize: 10, fill: "#444" }}>A1 motorway</text>

        {/* ONCF rail */}
        <line x1="120" y1="295" x2="600" y2="295" stroke="#111" strokeWidth="1.2"/>
        <line x1="120" y1="295" x2="600" y2="295" stroke="#111" strokeWidth="0.5" strokeDasharray="3 3"/>
        <text x="610" y="298" style={{ fontSize: 10, fill: "#111" }}>ONCF rail</text>

        {/* Point rouge Bir Rami Sud */}
        <circle cx="420" cy="330" r="6" fill="#D85A30" stroke="#111" strokeWidth="1"/>
        <line x1="420" y1="330" x2="500" y2="412" stroke="#D85A30" strokeWidth="0.8"/>
        <g transform="translate(495, 412)">
          <rect x="0" y="0" width="180" height="48" fill="#FAECE7" stroke="#D85A30" strokeWidth="0.8"/>
          <text x="6" y="14" style={{ fontSize: 10, fill: "#993C1D", fontWeight: 600 }}>Bir Rami Sud signal</text>
          <text x="6" y="28" style={{ fontSize: 9, fill: "#712B13" }}>CUE-DF = 0.889 · CUE-RT = 0.366</text>
          <text x="6" y="42" style={{ fontSize: 9, fill: "#712B13" }}>Rent gap: 25K → 300K MAD (4-12×)</text>
        </g>

        {/* Légende poids */}
        <g transform="translate(40, 420)">
          <text x="0" y="0" style={{ fontSize: 10, fontWeight: 600 }}>Population weights (aggregation rules §5.5):</text>
          <text x="0" y="14" style={{ fontSize: 10, fill: "#444" }}>
            w_Kénitra = 0.643 · w_Mehdiya = 0.071 · w_Sidi Taibi = 0.286 · sum = 1.000
          </text>
        </g>

        <text x="360" y="468" textAnchor="middle" style={{ fontSize: 9, fill: "#666" }}>
          Source: Natural Earth 10m, OSM. Schematic — analytical geometries in supplementary materials.
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
