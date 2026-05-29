// Figure 1 — Architecture conceptuelle RA-CUE-ULV
// Habitat International — noir/blanc, traits fins, sans-serif
// 180mm × 120mm format double-colonne

interface Props { caption?: string }

export default function Figure1_RaCueUlv({ caption }: Props) {
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 720 480" width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <style>{`
          .axis-rect { fill: #fff; stroke: #111; stroke-width: 1; }
          .axis-label { font-size: 14px; font-weight: 600; fill: #111; }
          .axis-meta  { font-size: 11px; fill: #444; }
          .group      { fill: #fafafa; stroke: #666; stroke-width: 0.5; }
          .group-text { font-size: 9px; fill: #222; }
          .composite  { fill: #f0f0f0; stroke: #111; stroke-width: 1; }
          .composite-text { font-size: 12px; fill: #111; font-weight: 600; }
          .arrow      { stroke: #111; stroke-width: 0.8; fill: none; marker-end: url(#arr); }
        `}</style>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#111"/>
          </marker>
        </defs>

        {/* Titre */}
        <text x="360" y="28" textAnchor="middle" style={{ fontSize: 16, fontWeight: 700 }}>
          Tri-axial RA-CUE-ULV framework — 142 indicators, 22 groups
        </text>

        {/* RA */}
        <rect x="40"  y="80"  width="200" height="100" className="axis-rect"/>
        <text x="140" y="110" textAnchor="middle" className="axis-label">RA · Régionalisation Avancée</text>
        <text x="140" y="130" textAnchor="middle" className="axis-meta">Institutional · 30% weight</text>
        <text x="140" y="148" textAnchor="middle" className="axis-meta">8 groups · 74 indicators</text>
        <text x="140" y="166" textAnchor="middle" className="axis-meta">Brenner (2004) state-spatial</text>

        {/* CUE — encadré pour validé */}
        <rect x="260" y="80"  width="200" height="100" className="axis-rect" style={{ strokeWidth: 2 }}/>
        <text x="360" y="110" textAnchor="middle" className="axis-label">CUE · Centralités Urbaines</text>
        <text x="360" y="130" textAnchor="middle" className="axis-meta">Functional · 40% weight</text>
        <text x="360" y="148" textAnchor="middle" className="axis-meta">7 groups · 37 indicators</text>
        <text x="360" y="166" textAnchor="middle" className="axis-meta" style={{ fontWeight: 600 }}>[VALIDATED, this paper]</text>

        {/* ULV */}
        <rect x="480" y="80"  width="200" height="100" className="axis-rect"/>
        <text x="580" y="110" textAnchor="middle" className="axis-label">ULV · Usages Locaux</text>
        <text x="580" y="130" textAnchor="middle" className="axis-meta">Experiential · 30% weight</text>
        <text x="580" y="148" textAnchor="middle" className="axis-meta">7 groups · 31 indicators</text>
        <text x="580" y="166" textAnchor="middle" className="axis-meta">Lefebvre 1968 · Gehl 2010</text>

        {/* Sous-groupes CUE (7) */}
        {["AF","DE","MC","GU","DF","RT","PS"].map((g,i)=>(
          <g key={g} transform={`translate(${262 + i*28}, 195)`}>
            <rect width="24" height="22" className="group"/>
            <text x="12" y="14" textAnchor="middle" className="group-text">{g}</text>
          </g>
        ))}

        {/* Indicateurs CUE */}
        <text x="360" y="235" textAnchor="middle" className="axis-meta">37 indicators · 6+6+5+5+5+5+5</text>

        {/* Flèches axes → composite */}
        <path d="M140,180 Q140,290 360,310" className="arrow"/>
        <path d="M360,180 L360,310" className="arrow"/>
        <path d="M580,180 Q580,290 360,310" className="arrow"/>

        {/* Composite */}
        <rect x="220" y="320" width="280" height="70" className="composite"/>
        <text x="360" y="345" textAnchor="middle" className="composite-text">
          S = 0.30 · S_RA + 0.40 · S_CUE + 0.30 · S_ULV
        </text>
        <text x="360" y="368" textAnchor="middle" className="axis-meta">AHP-Saaty CR = 0.013 &lt; 0.10</text>
        <text x="360" y="382" textAnchor="middle" className="axis-meta">22 sub-matrices · median CR = 0.034</text>

        {/* Footer */}
        <text x="360" y="430" textAnchor="middle" className="axis-meta" style={{ fontSize: 10 }}>
          Source: Yin (2018), Saaty (1980, 2008), Saisana et al. (2005).
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
