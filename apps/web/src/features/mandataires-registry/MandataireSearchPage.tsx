import React, { useEffect, useState } from "react";
import { apiBase } from "../../tomes/tome4/apiClient";

/**
 * MandataireSearchPage — annuaire public des mandataires agréés CITURBAREA.
 * Route /mandataires. Brique du parcours MRE (exécution démarches au Maroc).
 */
type Mandataire = {
  id: string; slug: string; nomComplet: string; profession: string; ordreNumero: string;
  ville: string; specialites: string[]; tarifHoraireMad: number; note: number;
  missionsCompletees: number; bio?: string; rayonKm?: number;
};

const VILLES = ["", "Casablanca", "Rabat", "Marrakech", "Tanger", "Fès", "Agadir", "Salé", "Meknès", "Kénitra", "Oujda", "Tétouan", "Errachidia"];
const PROF_LABEL: Record<string, string> = { AVOCAT: "Avocat", NOTAIRE: "Notaire", ADOUL: "Adoul", EXPERT_JUDICIAIRE: "Expert judiciaire", HUISSIER: "Huissier" };

export default function MandataireSearchPage() {
  const [ville, setVille] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [maxTarif, setMaxTarif] = useState("");
  const [results, setResults] = useState<Mandataire[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (ville) qs.set("ville", ville);
    if (specialite) qs.set("specialite", specialite);
    if (maxTarif) qs.set("maxTarif", maxTarif);
    fetch(`${apiBase()}/api/mandataires/search?${qs}`)
      .then((r) => r.json()).then((j) => setResults(j.results || [])).catch(() => setResults([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const fmtMad = (n: number) => new Intl.NumberFormat("fr-MA").format(n);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.18em", textTransform: "uppercase" }}>CITURBAREA · Réseau agréé</div>
        <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#0B1B3A" }}>Mandataires locaux agréés</h1>
        <p style={{ fontSize: 14, color: "rgba(11,27,58,0.6)", marginTop: 4 }}>
          Avocats, notaires et adouls vérifiés par CITURBAREA pour exécuter vos démarches au Maroc — idéal pour les MRE.
        </p>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0 24px" }}>
        <select value={ville} onChange={(e) => setVille(e.target.value)} style={sel}>
          {VILLES.map((v) => <option key={v} value={v}>{v || "Toutes les villes"}</option>)}
        </select>
        <input value={specialite} onChange={(e) => setSpecialite(e.target.value)} placeholder="Spécialité (ex: succession)" style={inp} />
        <input value={maxTarif} onChange={(e) => setMaxTarif(e.target.value)} placeholder="Tarif max MAD/h" inputMode="numeric" style={{ ...inp, maxWidth: 160 }} />
        <button onClick={load} style={btn}>Filtrer</button>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Chargement…</div>}
      {!loading && results.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Aucun mandataire ne correspond. Élargissez vos critères.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {results.map((m) => (
          <div key={m.id} style={{ background: "#fff", border: "1px solid rgba(11,27,58,0.1)", borderRadius: 14, padding: 18, boxShadow: "0 4px 12px rgba(11,27,58,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0B1B3A" }}>{m.nomComplet}</div>
                <div style={{ fontSize: 12.5, color: "rgba(11,27,58,0.6)" }}>{PROF_LABEL[m.profession]} · {m.ville} · {m.ordreNumero}</div>
              </div>
              <div style={{ background: "rgba(201,162,39,0.15)", color: "#9a7a1d", padding: "3px 8px", borderRadius: 8, fontWeight: 800, fontSize: 13 }}>★ {m.note}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
              {m.specialites.slice(0, 3).map((s) => (
                <span key={s} style={{ fontSize: 11, background: "#eef2ff", color: "#4338ca", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(11,27,58,0.55)", lineHeight: 1.5, minHeight: 36 }}>{m.bio}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(11,27,58,0.08)" }}>
              <div>
                <div style={{ fontWeight: 800, color: "#0B1B3A", fontSize: 15 }}>{fmtMad(m.tarifHoraireMad)} <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(11,27,58,0.5)" }}>MAD/h</span></div>
                <div style={{ fontSize: 11, color: "rgba(11,27,58,0.5)" }}>{m.missionsCompletees} missions · rayon {m.rayonKm} km</div>
              </div>
              <button style={{ ...btn, padding: "8px 14px", fontSize: 13 }}>Demander mission</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const sel: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, fontFamily: "inherit", background: "#fff" };
const inp: React.CSSProperties = { padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, fontFamily: "inherit", flex: "1 1 180px", minWidth: 0 };
const btn: React.CSSProperties = { padding: "10px 20px", borderRadius: 8, border: 0, background: "#0B1B3A", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
