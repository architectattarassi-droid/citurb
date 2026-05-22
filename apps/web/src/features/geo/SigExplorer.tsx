import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../tomes/tome5/AuthProvider";
import { apiBase } from "../../tomes/tome4/apiClient";
import MapPicker from "./MapPicker";

/**
 * SigExplorer — explorateur SIG complet, accessible post-login uniquement.
 *
 * Doctrine : pas de couches d'urbanisme dans les wizards P1/P2/P5 avant
 * création de compte. L'explorateur SIG est disponible :
 *   - Espace client : route /sig (après login)
 *   - Backoffice CC : route /cc/sig (admin)
 *
 * Affiche pour chaque source :
 *   - L'organisme producteur (AURS, AUDRSO, …)
 *   - La région couverte
 *   - La date de publication officielle
 *   - La date du snapshot statique (en cas de geo-block IIS)
 */

type SigSource = {
  id: string;
  label: string;
  region: string;
  authority: string;
  publishedAt?: string;
  staticSnapshotAt?: string;
  layers: {
    id: string;
    label: string;
    geomType: "polygon" | "line" | "point";
    color: string;
    description?: string;
    publishedAt?: string;
  }[];
};

type Mode = "client" | "admin";

const fmtDate = (iso?: string): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
};

export default function SigExplorer({ mode = "client" }: { mode?: Mode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [sources, setSources] = useState<SigSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Garde-fou : on protège l'accès si pas connecté (selon le mode)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isAuthed) {
      navigate(mode === "admin" ? "/admin/login" : `/login?next=/sig`, { replace: true });
    }
  }, [auth.isAuthed, auth.loading, mode, navigate]);

  useEffect(() => {
    fetch(`${apiBase()}/api/sig/sources`)
      .then(r => r.json())
      .then(d => {
        if (!d?.ok) throw new Error(d?.error || "Erreur");
        setSources(d.sources);
      })
      .catch(e => setError(e?.message || "Erreur de chargement"));
  }, []);

  if (!auth.isAuthed) return null;

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.header}>
          <div>
            <div style={S.eyebrow}>{mode === "admin" ? "Backoffice" : "Espace client"} · Module SIG</div>
            <h1 style={S.title}>Explorateur des Plans d'Aménagement</h1>
            <p style={S.sub}>
              Cartographie centralisée de tous les Plans d'Aménagement (PA), zonages
              et documents d'urbanisme publics du Royaume — récupérés depuis les
              géoportails institutionnels (loi 12-90), hébergés sur nos propres
              serveurs. Aucune sortie vers un site externe.
            </p>
          </div>
        </div>

        {/* Carte principale + couches SIG (showSigLayers=true) */}
        <div style={S.mapBlock}>
          <MapPicker
            commune=""
            province=""
            region=""
            height={mode === "admin" ? 600 : 520}
            showSigLayers={true}
          />
        </div>

        {/* Catalogue détaillé des sources et couches avec dates */}
        <div style={S.catalogTitle}>📚 Catalogue des sources intégrées</div>
        {error && <div style={S.errBox}>⚠ {error}</div>}
        {!sources && !error && <div style={S.muted}>Chargement du catalogue…</div>}
        {sources && sources.length === 0 && <div style={S.muted}>Aucune source intégrée pour l'instant.</div>}

        {sources?.map(src => (
          <div key={src.id} style={S.sourceCard}>
            <div style={S.sourceHead}>
              <div>
                <div style={S.sourceAuthority}>{src.authority}</div>
                <div style={S.sourceLabel}>{src.label}</div>
                <div style={S.sourceRegion}>Région : {src.region}</div>
              </div>
              <div style={S.sourceDates}>
                <div style={S.dateLine}>
                  <span style={S.dateKey}>Publié officiellement :</span>
                  <span style={S.dateVal}>{fmtDate(src.publishedAt)}</span>
                </div>
                {src.staticSnapshotAt && (
                  <div style={S.dateLine}>
                    <span style={S.dateKey}>Snapshot local :</span>
                    <span style={S.dateVal}>{fmtDate(src.staticSnapshotAt)}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={S.layerGrid}>
              {src.layers.map(l => (
                <div key={l.id} style={{ ...S.layerCard, borderLeft: `4px solid ${l.color}` }}>
                  <div style={S.layerHead}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: l.color, display: "inline-block" }} />
                    <strong style={{ fontSize: 13.5 }}>{l.label}</strong>
                    <span style={S.geomBadge}>{l.geomType}</span>
                  </div>
                  {l.description && <div style={S.layerDesc}>{l.description}</div>}
                  <div style={S.layerMeta}>
                    <span>Couche #{l.id}</span>
                    <span>· {fmtDate(l.publishedAt)}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "rgba(11,27,58,0.55)" }}>
                    Endpoint : <code>/api/sig/{src.id}/{l.id}.geojson</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={S.footnote}>
          📝 Module en construction — nous intégrons en continu les PA des 29 agences
          urbaines du Royaume. Roadmap : AUDRSO (Drâa-Souss), CSRNO (Casablanca-Settat),
          VSH, AUH Hoceima, AUM Marrakech, AUT Tanger… Pour signaler une source
          institutionnelle non encore intégrée, contactez l'équipe SIG CITURBAREA.
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #fff, #f8f4ea)", padding: "32px 20px" },
  container: { maxWidth: 1280, margin: "0 auto" },
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.10em", color: "rgba(11,27,58,0.6)", textTransform: "uppercase", marginBottom: 8 },
  title: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 34, color: "#0B1B3A", margin: "0 0 8px", lineHeight: 1.15 },
  sub: { fontSize: 14, color: "rgba(11,27,58,0.7)", lineHeight: 1.65, maxWidth: 820 },
  mapBlock: { background: "#fff", border: "1px solid rgba(201,162,39,0.30)", borderRadius: 14, padding: 16, marginBottom: 28, boxShadow: "0 14px 42px rgba(11,27,58,0.10)" },
  catalogTitle: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, color: "#0B1B3A", margin: "10px 0 18px" },
  sourceCard: {
    background: "#fff", border: "1px solid rgba(11,27,58,0.12)", borderRadius: 14,
    padding: 18, marginBottom: 18, boxShadow: "0 8px 24px rgba(11,27,58,0.06)",
  },
  sourceHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid rgba(11,27,58,0.08)" },
  sourceAuthority: { fontSize: 11.5, fontWeight: 800, letterSpacing: "0.08em", color: "#C9A227", textTransform: "uppercase", marginBottom: 4 },
  sourceLabel: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 18, color: "#0B1B3A", fontWeight: 700, marginBottom: 4 },
  sourceRegion: { fontSize: 12.5, color: "rgba(11,27,58,0.65)", fontStyle: "italic" },
  sourceDates: { background: "rgba(11,27,58,0.04)", border: "1px solid rgba(11,27,58,0.08)", borderRadius: 10, padding: "10px 14px", minWidth: 240 },
  dateLine: { display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "2px 0" },
  dateKey: { color: "rgba(11,27,58,0.65)" },
  dateVal: { fontWeight: 700, color: "#0B1B3A", fontFamily: "ui-monospace, Menlo, Consolas, monospace" },
  layerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 },
  layerCard: { background: "rgba(255,255,255,0.85)", border: "1px solid rgba(11,27,58,0.10)", borderRadius: 10, padding: 12 },
  layerHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  layerDesc: { fontSize: 12, color: "rgba(11,27,58,0.7)", lineHeight: 1.5, marginBottom: 6 },
  layerMeta: { fontSize: 11, color: "rgba(11,27,58,0.55)", display: "flex", gap: 6 },
  geomBadge: { marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(11,27,58,0.08)", color: "rgba(11,27,58,0.7)" },
  footnote: { marginTop: 22, padding: 16, background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 10, fontSize: 13, color: "rgba(11,27,58,0.75)", lineHeight: 1.6 },
  errBox: { background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 13 },
  muted: { color: "rgba(11,27,58,0.55)", fontStyle: "italic", fontSize: 13.5 },
};
