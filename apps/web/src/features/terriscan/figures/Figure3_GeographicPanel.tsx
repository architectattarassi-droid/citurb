// Figure 3 — Distribution géographique n=9 (projection équirectangulaire WGS84)
// Habitat International — noir/blanc, marqueurs scientifiques

interface Props { caption?: string }

interface PanelPoint { id: string; lon: number; lat: number; label: string; rank: number; pivot?: boolean }

const POINTS: PanelPoint[] = [
  { id:"KMST",       lon:-6.6,  lat:34.3, label:"KMST",         rank:3, pivot:true },
  { id:"DIAMNIADIO", lon:-17.1, lat:14.7, label:"Diamniadio",   rank:5 },
  { id:"SEKONDI",    lon:-1.7,  lat:4.9,  label:"Sekondi-Tak.", rank:7 },
  { id:"SHEIKH",     lon:30.9,  lat:30.0, label:"Sheikh Zayed", rank:4 },
  { id:"BOUAKE",     lon:-5.0,  lat:7.7,  label:"Bouaké",       rank:8 },
  { id:"PEMBA",      lon:40.5,  lat:-12.9,label:"Pemba-Metuge", rank:9 },
  { id:"NEW_CAIRO",  lon:31.6,  lat:30.0, label:"New Cairo",    rank:2 },
  { id:"BINH_DUONG", lon:106.6, lat:11.0, label:"Binh Duong",   rank:1 },
  { id:"MANTA",      lon:-80.7, lat:-0.9, label:"Manta",        rank:6 },
]

// Projection: x = (lon + 180) * w/360 ; y = (90 - lat) * h/180
function project(lon: number, lat: number, w: number, h: number): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * w, y: ((90 - lat) / 180) * h }
}

export default function Figure3_GeographicPanel({ caption }: Props) {
  const W = 720, H = 360
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H + 80}`} width="100%" xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#fff", fontFamily: "Inter, sans-serif", color: "#111" }}>
        <text x={W/2} y="22" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700 }}>
          Geographic distribution n=9 · WGS84 equirectangular · J_continent = 0.67
        </text>

        {/* Grille équateur + méridien */}
        <rect x="0" y="40" width={W} height={H} fill="#fafafa" stroke="#aaa" strokeWidth="0.5"/>
        <line x1="0" y1={40 + H/2} x2={W} y2={40 + H/2} stroke="#ccc" strokeWidth="0.5"/>
        <line x1={W/2} y1="40" x2={W/2} y2={40 + H} stroke="#ccc" strokeWidth="0.5"/>
        <text x={W - 6} y={40 + H/2 - 2} textAnchor="end" style={{ fontSize: 8, fill: "#888" }}>Equator</text>
        <text x={W/2 + 4} y={40 + 10} style={{ fontSize: 8, fill: "#888" }}>Prime Meridian</text>

        {/* Points */}
        {POINTS.map(p=>{
          const { x, y } = project(p.lon, p.lat, W, H)
          const yShift = 40
          return (
            <g key={p.id}>
              {p.pivot ? (
                <>
                  <circle cx={x} cy={y + yShift} r="9" fill="#fff" stroke="#111" strokeWidth="1.5"/>
                  <circle cx={x} cy={y + yShift} r="4" fill="#111"/>
                </>
              ) : (
                <circle cx={x} cy={y + yShift} r="5" fill="#444" stroke="#111" strokeWidth="0.5"/>
              )}
              <text x={x + 8} y={y + yShift - 6} style={{ fontSize: 10, fontWeight: p.pivot ? 700 : 400 }}>
                {p.label}
              </text>
              <text x={x + 8} y={y + yShift + 6} style={{ fontSize: 9, fill: "#666" }}>
                rank {p.rank}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(20, ${H + 50})`}>
          <circle cx="6" cy="0" r="9" fill="#fff" stroke="#111" strokeWidth="1.5"/>
          <circle cx="6" cy="0" r="4" fill="#111"/>
          <text x="22" y="3" style={{ fontSize: 11 }}>KMST pivot</text>
          <circle cx="120" cy="0" r="5" fill="#444" stroke="#111" strokeWidth="0.5"/>
          <text x="132" y="3" style={{ fontSize: 11 }}>Benchmark (8)</text>
          <text x="260" y="3" style={{ fontSize: 10, fill: "#444" }}>Africa 6/8 · Asia 1/8 · Americas 1/8 · J_model = 0.95 · J_age = 0.82</text>
        </g>

        <text x={W/2} y={H + 75} textAnchor="middle" style={{ fontSize: 9, fill: "#666" }}>
          Source: Africapolis-OECD (2024), national statistical institutes, WGS84 equirectangular projection.
        </text>
      </svg>
      {caption && <figcaption style={{ fontSize: 11, marginTop: 6, color: "#444" }}>{caption}</figcaption>}
    </figure>
  )
}
