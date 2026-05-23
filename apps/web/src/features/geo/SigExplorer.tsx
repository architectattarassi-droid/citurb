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

type Fiche = {
  kind: string;
  label: string;
  url: string;
  publishedAt?: string;
  authority?: string;
  format?: string;
  description?: string;
};
type CityReference = {
  id: string;
  name: string;
  region: string;
  provinceCodes?: string[];
  communeCodes?: string[];
  fiches: Fiche[];
};
type ReferencesResponse = {
  ok: true;
  _meta?: { version?: string; compiledAt?: string; doctrine?: string };
  global: Fiche[];
  cities?: CityReference[];
  matched?: CityReference[];
  roadmap?: {
    phase2?: { title: string; status: string; description: string; estimatedDeliveryDays?: number };
    phase3?: { title: string; status: string; description: string };
  };
};

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
  const [references, setReferences] = useState<ReferencesResponse | null>(null);
  const [referencesFilter, setReferencesFilter] = useState<string>("");

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

  // Charge le registre des fiches DGI / ANCFCC / Taamir
  useEffect(() => {
    fetch(`${apiBase()}/api/sig/references`)
      .then(r => r.json())
      .then(d => { if (d?.ok) setReferences(d); })
      .catch(() => { /* silencieux — le panneau ne s'affiche juste pas */ });
  }, []);

  const filteredCities: CityReference[] = (() => {
    if (!references?.cities) return [];
    const needle = referencesFilter.trim().toLowerCase();
    if (!needle) return references.cities;
    return references.cities.filter(c =>
      c.name.toLowerCase().includes(needle) ||
      c.region.toLowerCase().includes(needle) ||
      c.id.toLowerCase().includes(needle)
    );
  })();

  if (!auth.isAuthed) return null;

  return (
    <div className="sig-explorer-page" style={S.page}>
      <style>{SIG_RESPONSIVE_CSS}</style>
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

        {/* Référentiels officiels DGI / ANCFCC / Taamir / Agences urbaines */}
        {references && (
          <div style={S.refsBlock}>
            <div style={S.refsHeader}>
              <div>
                <div style={S.refsEyebrow}>Niveau 1 · Module SIG-Référentiels</div>
                <div style={S.refsTitle}>📜 Fiches officielles DGI, ANCFCC & agences urbaines</div>
                <div style={S.refsSub}>
                  Aucune couche SIG publique n'existe pour la grille tarifaire DGI/ANCFCC.
                  Nous exposons ici les fiches officielles (PDFs DGI miroirés depuis le portail
                  tax.gov.ma, ANCFCC Valeurs Vénales, Taamir et géoportails des agences urbaines)
                  filtrables par ville. La couche SIG propriétaire <code>dgi_zones_v1</code>
                  (parsing PDF + géocodage) est en cours de développement.
                </div>
              </div>
              <input
                type="text" placeholder="🔎 Filtrer par ville ou région…"
                value={referencesFilter} onChange={(e) => setReferencesFilter(e.target.value)}
                style={S.refsFilter}
              />
            </div>

            {/* Fiches globales (DGI portail, ANCFCC valeurs vénales, Taamir) */}
            {references.global && references.global.length > 0 && (
              <div style={S.globalBlock}>
                <div style={S.globalTitle}>🇲🇦 Niveau national</div>
                <div style={S.globalGrid}>
                  {references.global.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={S.globalCard}>
                      <div style={S.globalCardLabel}>{f.label}</div>
                      {f.description && <div style={S.globalCardDesc}>{f.description}</div>}
                      <div style={S.globalCardMeta}>
                        {f.format && <span>{f.format}</span>}
                        {f.publishedAt && <span>· {fmtDate(f.publishedAt)}</span>}
                        <span style={{ marginLeft: "auto", color: "#C9A227", fontWeight: 700 }}>↗ Ouvrir</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Fiches par ville */}
            <div style={S.citiesGrid}>
              {filteredCities.map(city => (
                <div key={city.id} style={S.cityCard}>
                  <div style={S.cityHead}>
                    <div>
                      <div style={S.cityName}>{city.name}</div>
                      <div style={S.cityRegion}>{city.region}</div>
                    </div>
                    <div style={S.cityBadge}>{city.fiches.length} fiche{city.fiches.length > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {city.fiches.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" style={S.ficheLink}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{
                            ...S.ficheKindBadge,
                            background: f.kind === "dgi_pdf" ? "rgba(220,38,38,0.10)" :
                                        f.kind === "ancfcc_referential" ? "rgba(59,130,246,0.10)" :
                                        f.kind === "agence_urbaine" ? "rgba(34,197,94,0.10)" :
                                        "rgba(11,27,58,0.08)",
                            color: f.kind === "dgi_pdf" ? "#b91c1c" :
                                   f.kind === "ancfcc_referential" ? "#1e40af" :
                                   f.kind === "agence_urbaine" ? "#166534" :
                                   "rgba(11,27,58,0.7)",
                          }}>
                            {f.kind === "dgi_pdf" ? "DGI" : f.kind === "ancfcc_referential" ? "ANCFCC" : f.kind === "agence_urbaine" ? "Agence Urb." : f.authority || f.kind}
                          </span>
                          <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "#0B1B3A" }}>{f.label}</span>
                          {f.publishedAt && <span style={S.ficheDate}>{fmtDate(f.publishedAt)}</span>}
                          <span style={{ color: "#C9A227", fontWeight: 700, fontSize: 12 }}>↗</span>
                        </div>
                        {f.description && <div style={S.ficheDesc}>{f.description}</div>}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
              {filteredCities.length === 0 && (
                <div style={S.muted}>Aucune ville ne correspond à « {referencesFilter} ».</div>
              )}
            </div>

            {/* Roadmap visible — transparence sur Niveau 2 et Niveau 3 */}
            {references.roadmap && (
              <div style={S.roadmapBlock}>
                <div style={S.roadmapTitle}>🛣 Roadmap — production de la couche SIG propriétaire</div>
                {references.roadmap.phase2 && (
                  <div style={S.roadmapItem}>
                    <div style={S.roadmapItemHead}>
                      <span style={{ ...S.roadmapBadge, background: "rgba(245,158,11,0.15)", color: "#92400e" }}>
                        🚧 {references.roadmap.phase2.status === "in_progress" ? "EN COURS" : references.roadmap.phase2.status.toUpperCase()}
                      </span>
                      <strong>{references.roadmap.phase2.title}</strong>
                      {references.roadmap.phase2.estimatedDeliveryDays && (
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(11,27,58,0.55)" }}>
                          ≈ {references.roadmap.phase2.estimatedDeliveryDays} j-dev
                        </span>
                      )}
                    </div>
                    <div style={S.roadmapDesc}>{references.roadmap.phase2.description}</div>
                  </div>
                )}
                {references.roadmap.phase3 && (
                  <div style={S.roadmapItem}>
                    <div style={S.roadmapItemHead}>
                      <span style={{ ...S.roadmapBadge, background: "rgba(11,27,58,0.08)", color: "rgba(11,27,58,0.7)" }}>
                        ⏳ {references.roadmap.phase3.status.toUpperCase()}
                      </span>
                      <strong>{references.roadmap.phase3.title}</strong>
                    </div>
                    <div style={S.roadmapDesc}>{references.roadmap.phase3.description}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
          <div style={{ fontWeight: 700, color: "#0B1B3A", marginBottom: 8 }}>
            📝 Roadmap du module SIG — transparence sur ce qui est faisable
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>✅ Intégré et stable</strong> : découpage administratif national HCP
            (14 régions / 77 provinces / 1 505 communes), Plan d'Aménagement Rabat-Salé (AURS, 36 couches),
            imagerie satellite ESRI mondiale, fond OSM, géocodage Nominatim, projections Lambert Maroc.
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>🚧 En cours d'intégration</strong> : PA des autres agences urbaines
            (AUC Casablanca, AUM Marrakech, AUT Tanger, AUF Fès…) — sondage des géoportails
            Karaz/Ribatis en cours. Référentiel prix DGI par commune (parsing PDFs officiels).
          </div>
          <div style={{ marginBottom: 10 }}>
            <strong>⚠ Limites institutionnelles ANCFCC</strong> :
            <ul style={{ marginTop: 6, paddingLeft: 22, lineHeight: 1.6 }}>
              <li><strong>Cadastre parcellaire vectoriel</strong> : ANCFCC ne publie pas de WMS public — la
                base ne peut être obtenue qu'avec une convention B2B formelle (procédure 6-18 mois).</li>
              <li><strong>Plans cadastraux unitaires</strong> : 100 MAD par plan via le « Plan Cadastral en
                Ligne » ANCFCC, PDF watermarqué, livré par SMS sous 1 semaine. Non exploitable en masse.</li>
              <li><strong>Titres fonciers nominatifs</strong> : ouverts uniquement aux notaires certifiés
                depuis 01/2024 (10 DH/acte). Plateforme blockchain unifiée annoncée fin 2025-2026,
                exclusivement notaires + banques.</li>
            </ul>
          </div>
          <div>
            <strong>💡 Workaround actuel</strong> : utilisez l'imagerie satellite (bouton 🛰️ sur la carte)
            pour visualiser le parcellaire réel à défaut de WMS cadastre, puis demandez à votre client
            d'uploader son plan ANCFCC PDF (bloc « Extrait Mohafadati ») — l'expert le superposera
            manuellement lors du rapport.
          </div>
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

  refsBlock: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,244,234,0.6))",
    border: "1px solid rgba(201,162,39,0.30)",
    borderRadius: 14, padding: 22, marginBottom: 32,
    boxShadow: "0 14px 42px rgba(11,27,58,0.08)",
  },
  refsHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginBottom: 18 },
  refsEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", color: "#C9A227", textTransform: "uppercase", marginBottom: 6 },
  refsTitle: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, color: "#0B1B3A", marginBottom: 6 },
  refsSub: { fontSize: 12.5, color: "rgba(11,27,58,0.72)", lineHeight: 1.6, maxWidth: 720 },
  refsFilter: {
    width: 260, padding: "9px 12px",
    border: "1px solid rgba(11,27,58,0.18)", borderRadius: 8,
    fontSize: 13, fontFamily: "inherit", outline: "none",
    background: "rgba(255,255,255,0.92)", color: "#0B1B3A",
  },

  globalBlock: { marginBottom: 18, padding: "12px 14px", background: "rgba(11,27,58,0.03)", border: "1px solid rgba(11,27,58,0.08)", borderRadius: 10 },
  globalTitle: { fontSize: 12.5, fontWeight: 800, color: "rgba(11,27,58,0.85)", marginBottom: 10 },
  globalGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 },
  globalCard: {
    display: "flex", flexDirection: "column", gap: 4,
    padding: "10px 12px", background: "#fff",
    border: "1px solid rgba(11,27,58,0.10)", borderRadius: 8,
    textDecoration: "none", color: "#0B1B3A",
    transition: "all 0.15s ease",
  },
  globalCardLabel: { fontSize: 13, fontWeight: 700 },
  globalCardDesc: { fontSize: 11.5, color: "rgba(11,27,58,0.65)", lineHeight: 1.45 },
  globalCardMeta: { display: "flex", gap: 6, fontSize: 11, color: "rgba(11,27,58,0.55)", marginTop: 4 },

  citiesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 },
  cityCard: { background: "#fff", border: "1px solid rgba(11,27,58,0.10)", borderRadius: 10, padding: 14 },
  cityHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, paddingBottom: 8, borderBottom: "1px solid rgba(11,27,58,0.06)" },
  cityName: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: 17, color: "#0B1B3A", fontWeight: 700 },
  cityRegion: { fontSize: 11.5, color: "rgba(11,27,58,0.55)", fontStyle: "italic", marginTop: 2 },
  cityBadge: { fontSize: 11, fontWeight: 700, color: "#C9A227", background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.30)", padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" },
  ficheLink: {
    display: "flex", flexDirection: "column", gap: 4,
    padding: "8px 10px", background: "rgba(11,27,58,0.025)",
    border: "1px solid rgba(11,27,58,0.06)", borderRadius: 6,
    textDecoration: "none", color: "#0B1B3A",
  },
  ficheKindBadge: { fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em" },
  ficheDate: { fontSize: 10.5, color: "rgba(11,27,58,0.55)", fontFamily: "ui-monospace, Menlo, Consolas, monospace" },
  ficheDesc: { fontSize: 11, color: "rgba(11,27,58,0.62)", lineHeight: 1.45, paddingLeft: 2 },

  roadmapBlock: { marginTop: 22, padding: 14, background: "rgba(11,27,58,0.04)", border: "1px dashed rgba(11,27,58,0.18)", borderRadius: 10 },
  roadmapTitle: { fontSize: 12.5, fontWeight: 800, color: "rgba(11,27,58,0.85)", marginBottom: 10 },
  roadmapItem: { padding: "8px 0", borderTop: "1px dashed rgba(11,27,58,0.10)" },
  roadmapItemHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 },
  roadmapBadge: { fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.04em" },
  roadmapDesc: { fontSize: 11.5, color: "rgba(11,27,58,0.68)", lineHeight: 1.55, paddingLeft: 4 },
};

const SIG_RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .sig-explorer-page { padding: 16px 12px !important; }
  .sig-explorer-page h1 { font-size: 24px !important; line-height: 1.2 !important; }
  .sig-explorer-page input[type="text"] { width: 100% !important; }
}
@media (max-width: 480px) {
  .sig-explorer-page h1 { font-size: 20px !important; }
}
`;
