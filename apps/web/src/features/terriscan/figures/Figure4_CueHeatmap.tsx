// Figure 4 — Heatmap CUE 9×7 sous-groupes (seule figure colorée)
// Habitat International — gradient blanc → vert, valeurs normalisées 0-1

interface Props { caption?: string }

interface Row { id: string; name: string; pivot?: boolean; scue: number; vals: (number | null)[] }

const HEADER = ["AF","DE","MC","GU","DF","RT","PS"]

const DATA: Row[] = [
  { id:"BINH_DUONG", name:"Binh Duong (R1)",  scue:0.673, vals:[0.982,0.548,1.000,0.630,0.538,0.814,0.444] },
  { id:"NEW_CAIRO",  name:"New Cairo (R2)",   scue:0.522, vals:[null,0.573,0.304,0.950,0.444,0.428,0.909] },
  { id:"KMST",       name:"KMST pivot (R3)",  scue:0.505, pivot:true, vals:[null,0.487,0.482,0.457,0.889,0.366,0.817] },
  { id:"SHEIKH",     name:"Sheikh Zayed (R4)",scue:0.494, vals:[0.827,0.325,0.392,0.329,0.800,0.662,0.094] },
  { id:"DIAMNIADIO", name:"Diamniadio (R5)",  scue:0.487, vals:[null,0.582,0.304,0.580,0.400,0.490,0.596] },
  { id:"MANTA",      name:"Manta (R6)",       scue:0.455, vals:[0.442,0.398,0.319,0.566,0.459,0.869,0.149] },
  { id:"SEKONDI",    name:"Sekondi-Tak. (R7)",scue:0.360, vals:[0.434,0.173,0.227,0.491,0.455,0.657,0.105] },
  { id:"BOUAKE",     name:"Bouaké (R8)",      scue:0.288, vals:[0.336,0.102,0.204,0.204,0.496,0.566,0.133] },
  { id:"PEMBA",      name:"Pemba-Metuge (R9)",scue:0.182, vals:[0.035,0.034,0.157,0.133,0.263,0.464,0.244] },
]

function cellFill(v: number | null): string {
  if (v === null) return "#f0f0f0"
  // Gradient white (1) → green dark (#1D9E75)
  const r = Math.round(255 - (255 - 29) * v)
  const g = Math.round(255 - (255 - 158) * v)
  const b = Math.round(255 - (255 - 117) * v)
  return `rgb(${r},${g},${b})`
}
function cellText(v: number | null): string {
  if (v === null) return "#888"
  return v >= 0.5 ? "#fff" : "#111"
}

export default function Figure4_CueHeatmap({ caption }: Props) {
  const CW = 56, CH = 28, LW = 150
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${LW + (HEADER.length + 1) * CW + 30} ${30 + (DATA.length + 1) * CH + 40}`}
        width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <text x={(LW + (HEADER.length + 1) * CW) / 2} y="22" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }}>
          CUE heatmap · n=9 entities × 7 sub-groups + composite (equal weights)
        </text>

        {/* Headers */}
        <g transform={`translate(${LW}, 40)`}>
          {HEADER.map((h,i)=>(
            <text key={h} x={i*CW + CW/2} y="0" textAnchor="middle" style={{ fontSize: 11, fontWeight: 600 }}>{h}</text>
          ))}
          <text x={HEADER.length*CW + CW/2} y="0" textAnchor="middle" style={{ fontSize: 11, fontWeight: 700 }}>S_CUE</text>
        </g>

        {/* Rows */}
        {DATA.map((r,i)=>{
          const y = 50 + i*CH
          return (
            <g key={r.id}>
              <text x={LW - 6} y={y + CH/2 + 4} textAnchor="end" style={{ fontSize: 10, fontWeight: r.pivot ? 700 : 400 }}>
                {r.name}
              </text>
              {r.vals.map((v,j)=>(
                <g key={j}>
                  <rect x={LW + j*CW} y={y} width={CW - 1} height={CH - 1} fill={cellFill(v)} stroke="#ddd" strokeWidth="0.3"/>
                  <text x={LW + j*CW + CW/2} y={y + CH/2 + 4} textAnchor="middle"
                    style={{ fontSize: 10, fill: cellText(v) }}>
                    {v === null ? "—" : v.toFixed(3)}
                  </text>
                </g>
              ))}
              {/* S_CUE column */}
              <rect x={LW + HEADER.length*CW} y={y} width={CW - 1} height={CH - 1}
                fill={cellFill(r.scue)} stroke="#111" strokeWidth="0.8"/>
              <text x={LW + HEADER.length*CW + CW/2} y={y + CH/2 + 4} textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 700, fill: cellText(r.scue) }}>
                {r.scue.toFixed(3)}
              </text>
              {r.pivot && (
                <line x1={LW - 3} y1={y} x2={LW - 3} y2={y + CH - 1} stroke="#1D9E75" strokeWidth="3"/>
              )}
            </g>
          )
        })}

        {/* Legend gradient */}
        <g transform={`translate(${LW}, ${50 + DATA.length*CH + 16})`}>
          <text x="0" y="0" style={{ fontSize: 10, fill: "#444" }}>0.0</text>
          {Array.from({length:10}).map((_,i)=>(
            <rect key={i} x={20 + i*16} y="-10" width="16" height="10" fill={cellFill(i/9)} stroke="#ddd" strokeWidth="0.3"/>
          ))}
          <text x="196" y="0" style={{ fontSize: 10, fill: "#444" }}>1.0</text>
          <text x="220" y="0" style={{ fontSize: 10, fill: "#666" }}>· "—" = n/a (no commune-level data)</text>
        </g>

        <text x={(LW + (HEADER.length + 1) * CW) / 2} y={(40 + (DATA.length + 1) * CH + 38)} textAnchor="middle"
          style={{ fontSize: 9, fill: "#666" }}>
          Source: TerriScan v5.2 · min-max normalisation · 37 CUE indicators · axis-mean imputation for n/a.
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
