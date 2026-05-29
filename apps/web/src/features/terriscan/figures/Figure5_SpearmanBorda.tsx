// Figure 5 — Matrice Spearman ρ + Borda count
// Habitat International — deux panneaux N&B, swap rangs 4-5 visualisé

interface Props { caption?: string }

const METHODS = ["equal", "entropy", "variance", "CRITIC"]
const RHO = [
  [1.000, 0.983, 0.983, 1.000],
  [0.983, 1.000, 1.000, 0.983],
  [0.983, 1.000, 1.000, 0.983],
  [1.000, 0.983, 0.983, 1.000],
]

interface BordaRow { e: string; borda: number; equal: number; entropy: number; variance: number; CRITIC: number }
const BORDA: BordaRow[] = [
  { e:"Binh Duong",  borda:36, equal:1, entropy:1, variance:1, CRITIC:1 },
  { e:"New Cairo",   borda:32, equal:2, entropy:2, variance:2, CRITIC:2 },
  { e:"KMST",        borda:28, equal:3, entropy:3, variance:3, CRITIC:3 },
  { e:"Diamniadio",  borda:22, equal:5, entropy:4, variance:4, CRITIC:5 },
  { e:"Sheikh Z.",   borda:22, equal:4, entropy:5, variance:5, CRITIC:4 },
  { e:"Manta",       borda:16, equal:6, entropy:6, variance:6, CRITIC:6 },
  { e:"Sekondi",     borda:12, equal:7, entropy:7, variance:7, CRITIC:7 },
  { e:"Bouaké",      borda:8,  equal:8, entropy:8, variance:8, CRITIC:8 },
  { e:"Pemba",       borda:4,  equal:9, entropy:9, variance:9, CRITIC:9 },
]

export default function Figure5_SpearmanBorda({ caption }: Props) {
  const cell = 42, panelW = 280
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox="0 0 720 380" width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <text x="360" y="22" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }}>
          Inter-method robustness · Spearman ρ matrix + Borda count
        </text>

        {/* ── Spearman matrix ── */}
        <g transform="translate(40, 60)">
          <text x={(METHODS.length + 1) * cell / 2} y="-8" textAnchor="middle" style={{ fontSize: 12, fontWeight: 600 }}>
            Spearman ρ (n=9, 6 non-redundant pairs)
          </text>
          {METHODS.map((m,i)=>(
            <text key={"col-"+m} x={(i + 1) * cell + cell/2} y="14" textAnchor="middle" style={{ fontSize: 10, fontWeight: 600 }}>{m}</text>
          ))}
          {METHODS.map((m,i)=>(
            <text key={"row-"+m} x={cell/2} y={36 + i*cell + cell/2 - 4} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600 }}>{m}</text>
          ))}
          {RHO.map((row,i)=>row.map((v,j)=>{
            const isDiag = i === j
            const isOne  = v === 1.000 && !isDiag
            return (
              <g key={`${i}-${j}`}>
                <rect x={(j + 1) * cell} y={36 + i*cell} width={cell - 2} height={cell - 2}
                  fill={isDiag ? "#f0f0f0" : isOne ? "#e8f5ef" : "#fff"}
                  stroke="#111" strokeWidth="0.5"/>
                <text x={(j + 1) * cell + cell/2} y={36 + i*cell + cell/2 + 4}
                  textAnchor="middle"
                  style={{ fontSize: 10, fontWeight: isOne ? 700 : 400, fill: isOne ? "#0F6E56" : "#111" }}>
                  {v.toFixed(3)}
                </text>
              </g>
            )
          }))}
          <text x="0" y={36 + 4*cell + 18} style={{ fontSize: 9, fill: "#555" }}>
            ρ min = 0.983 · ρ mean = 0.989 · ρ max = 1.000
          </text>
          <text x="0" y={36 + 4*cell + 32} style={{ fontSize: 9, fill: "#555" }}>
            All pairs &gt;&gt; Saisana (2005) threshold ≥ 0.85
          </text>
          <text x="0" y={36 + 4*cell + 46} style={{ fontSize: 9, fill: "#555" }}>
            ρ = 1.000 exact: identical rank orderings, NOT uniform weights
          </text>
        </g>

        {/* ── Borda count ── */}
        <g transform={`translate(${40 + panelW + 80}, 60)`}>
          <text x="140" y="-8" textAnchor="middle" style={{ fontSize: 12, fontWeight: 600 }}>
            Borda count · 4 methods × 9 entities · max = 36
          </text>
          {/* Headers */}
          <text x="0" y="14" style={{ fontSize: 10, fontWeight: 700 }}>Entity</text>
          <text x="100" y="14" textAnchor="middle" style={{ fontSize: 10, fontWeight: 700 }}>Borda</text>
          {METHODS.map((m,i)=>(
            <text key={m} x={140 + i*30} y="14" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700 }}>{m.slice(0,4)}</text>
          ))}
          <line x1="-5" y1="20" x2="270" y2="20" stroke="#111" strokeWidth="0.5"/>
          {BORDA.map((r,i)=>{
            const isSwap = i === 3 || i === 4
            return (
              <g key={r.e} transform={`translate(0, ${30 + i*20})`}>
                {isSwap && <rect x="-5" y="-12" width="280" height="18" fill="#fafaf5" stroke="none"/>}
                <text x="0" y="0" style={{ fontSize: 10, fontWeight: i < 2 ? 600 : 400 }}>
                  {i+1}. {r.e}
                </text>
                <text x="100" y="0" textAnchor="middle" style={{ fontSize: 10, fontWeight: 600 }}>{r.borda}</text>
                {([r.equal, r.entropy, r.variance, r.CRITIC]).map((v,j)=>(
                  <text key={j} x={140 + j*30} y="0" textAnchor="middle" style={{ fontSize: 10 }}>{v}</text>
                ))}
              </g>
            )
          })}
          <text x="0" y={30 + BORDA.length*20 + 12} style={{ fontSize: 9, fill: "#555" }}>
            Top-2 invariant (Binh Duong + New Cairo) · Swap ranks 4-5 (Diamniadio/Sheikh Z.) shaded
          </text>
        </g>

        <text x="360" y="365" textAnchor="middle" style={{ fontSize: 9, fill: "#666" }}>
          Source: Saisana et al. (2005), Black (1958), Saari (2001). AHP-Saaty M2 triangulation: top-2 + bottom-3 confirmed.
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
