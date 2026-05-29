// Figure 2 — Protocole de sélection 37 → 22 → 8
// Habitat International — entonnoir + tableau 8×6

interface Props { caption?: string }

interface PanelRow { name: string; c1: number; c2: number; c3: number; c4: number; c5: number; c6: number; total: string }

const PANEL: PanelRow[] = [
  { name: "Manta-Montecristi (EC)",  c1:1,   c2:1,   c3:1,   c4:1,   c5:1,   c6:1,   total: "6.0/6" },
  { name: "Diamniadio-Rufisque (SN)", c1:1,   c2:1,   c3:1,   c4:0.5, c5:1,   c6:1,   total: "5.5/6" },
  { name: "Pemba-Metuge (MZ)",       c1:1,   c2:1,   c3:1,   c4:0.5, c5:1,   c6:1,   total: "5.5/6" },
  { name: "Binh Duong (VN)",         c1:1,   c2:1,   c3:1,   c4:0,   c5:1,   c6:1,   total: "5.0/6" },
  { name: "New Cairo (EG)",          c1:1,   c2:1,   c3:1,   c4:0,   c5:1,   c6:1,   total: "5.0/6" },
  { name: "Sekondi-Takoradi (GH)",   c1:1,   c2:1,   c3:1,   c4:0.5, c5:1,   c6:0.5, total: "5.0/6" },
  { name: "Bouaké-Sakassou (CI)",    c1:1,   c2:1,   c3:0.5, c4:0.5, c5:1,   c6:1,   total: "5.0/6" },
  { name: "Sheikh Zayed (EG)",       c1:0,   c2:1,   c3:1,   c4:0.5, c5:1,   c6:1,   total: "4.5/6" },
]

export default function Figure2_SelectionProtocol({ caption }: Props) {
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 720 520" width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <style>{`
          .funnel { fill: #fafafa; stroke: #111; stroke-width: 1; }
          .lbl    { font-size: 12px; fill: #111; font-weight: 600; }
          .meta   { font-size: 10px; fill: #444; }
          .hdr    { font-size: 10px; font-weight: 700; fill: #111; }
        `}</style>

        <text x="360" y="24" textAnchor="middle" style={{ fontSize: 16, fontWeight: 700 }}>
          Case-selection protocol: funnel 37 → 22 → 8 + auditable C1-C6 matrix
        </text>

        {/* Entonnoir */}
        <polygon points="60,60 300,60 240,110 120,110" className="funnel"/>
        <text x="180" y="84" textAnchor="middle" className="lbl">Universe — 37 candidates</text>
        <text x="180" y="100" textAnchor="middle" className="meta">Africapolis-OECD 2024 · GHSL-JRC</text>

        <polygon points="120,120 240,120 210,170 150,170" className="funnel"/>
        <text x="180" y="145" textAnchor="middle" className="lbl">22 qualified · C1-C6 ≥ 4/6</text>

        <polygon points="150,180 210,180 195,220 165,220" className="funnel"/>
        <text x="180" y="206" textAnchor="middle" className="lbl">8 retained</text>
        <text x="180" y="232" textAnchor="middle" className="meta">strict C1 (200–800K) + strict C5 (no capital)</text>

        {/* Exclusion notes */}
        <text x="340" y="100" className="meta">Excluded by C1 (&lt; 200K):</text>
        <text x="340" y="116" className="meta">Konza ~50K, Eko Atlantic ~60K,</text>
        <text x="340" y="132" className="meta">Tatu City ~10K, Lavasa ~15K,</text>
        <text x="340" y="148" className="meta">Songdo 170K, Putrajaya 100K</text>
        <text x="340" y="178" className="meta">Excluded by C5 (capital):</text>
        <text x="340" y="194" className="meta">Vientiane, Sejong, Astana,</text>
        <text x="340" y="210" className="meta">Putrajaya (federal)</text>
        <text x="340" y="232" className="meta">Tenochtitlán-Mex: no admin perimeter</text>

        {/* Tableau 8 × 6 */}
        <g transform="translate(60, 270)">
          <text x="0" y="-8" className="lbl">8 × 6 scoring matrix · fuzzy {`{0, 0.5, 1}`} (Ragin 2000)</text>
          {/* Headers */}
          <text x="0"   y="14" className="hdr">Entity</text>
          {["C1","C2","C3","C4","C5","C6","Σ"].map((h,i)=>(
            <text key={h} x={200 + i*48} y="14" textAnchor="middle" className="hdr">{h}</text>
          ))}
          <line x1="-5" y1="20" x2="610" y2="20" stroke="#111" strokeWidth="0.5"/>
          {PANEL.map((r,i)=>(
            <g key={r.name} transform={`translate(0, ${26 + i*20})`}>
              <text x="0" y="0" style={{ fontSize: 10 }}>{r.name}</text>
              {[r.c1,r.c2,r.c3,r.c4,r.c5,r.c6].map((v,j)=>(
                <text key={j} x={200 + j*48} y="0" textAnchor="middle" style={{ fontSize: 10 }}>
                  {v.toFixed(v === 0.5 ? 1 : 0)}
                </text>
              ))}
              <text x={200 + 6*48} y="0" textAnchor="middle" style={{ fontSize: 10, fontWeight: 600 }}>{r.total}</text>
            </g>
          ))}
          <line x1="-5" y1={26 + PANEL.length*20 - 4} x2="610" y2={26 + PANEL.length*20 - 4} stroke="#111" strokeWidth="0.3"/>
          <text x="0" y={26 + PANEL.length*20 + 12} className="meta">Panel mean (KMST pivot excluded) = 41.5 ÷ 8 = 5.19/6</text>
        </g>

        <text x="360" y="500" textAnchor="middle" className="meta" style={{ fontSize: 10 }}>
          Source: Yin (2018), Seawright &amp; Gerring (2008), Goertz &amp; Mahoney (2012), Ragin (2000).
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
