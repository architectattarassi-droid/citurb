import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../tomes/tome5/AuthProvider";
import { apiBase } from "../../tomes/tome4/apiClient";
import MapPicker from "./MapPicker";
import { useIsMobile, BottomSheet } from "../../components/mobile";

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
type AgenceUrbaine = {
  id: string;
  name: string;
  code: string;
  region: string;
  prefecturesCouvertes?: string[];
  provincesCouvertes?: string[];
  siteOfficiel?: string;
  geoportail?: string;
  geoportailStatus?: string;
  format?: string;
  anneeCreation?: number;
};
type Placeholder = {
  id: string;
  name: string;
  region: string;
  isPlaceholder: true;
  message: string;
  fiches: Fiche[];
};
type ReferencesResponse = {
  ok: true;
  _meta?: { version?: string; compiledAt?: string; doctrine?: string; totalCities?: number; totalFiches?: number; notPublishedYet?: string[] };
  global: Fiche[];
  cities?: CityReference[];
  matched?: CityReference[];
  agences?: AgenceUrbaine[];
  matchedAgences?: AgenceUrbaine[];
  placeholder?: Placeholder | null;
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
  const isMobile = useIsMobile();
  const [sources, setSources] = useState<SigSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferencesResponse | null>(null);
  const [referencesFilter, setReferencesFilter] = useState<string>("");
  /** Sur mobile, les sources/couches/références s'ouvrent dans une BottomSheet pour
   *  laisser la carte pleine largeur. */
  const [layersOpen, setLayersOpen] = useState(false);

  // GATING — vérifie que l'utilisateur a au moins un dossier créé.
  // L'admin/OPS bypass cette vérification.
  const [dossierCheck, setDossierCheck] = useState<"loading" | "has_dossiers" | "no_dossiers">("loading");
  const isAdmin = mode === "admin" || ["ADMIN", "OWNER", "OPS"].includes((auth.role || "").toUpperCase());

  // Garde-fou : on protège l'accès si pas connecté (selon le mode)
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.isAuthed) {
      navigate(mode === "admin" ? "/admin/login" : `/login?next=/sig`, { replace: true });
    }
  }, [auth.isAuthed, auth.loading, mode, navigate]);

  // GATING DOSSIER — vérifie que l'utilisateur a au moins 1 dossier créé.
  // Si admin/OPS → bypass. Sinon, fetch /p2/dossier et vérifie qu'il y a
  // au moins 1 dossier ; si 0 → écran "Créez d'abord un dossier".
  useEffect(() => {
    if (auth.loading || !auth.isAuthed) return;
    if (isAdmin) { setDossierCheck("has_dossiers"); return; }
    const tk = localStorage.getItem("citurbarea.token");
    fetch(`${apiBase()}/p2/dossier`, { headers: tk ? { Authorization: `Bearer ${tk}` } : {} })
      .then(r => r.json())
      .then((d: any) => {
        const list = Array.isArray(d) ? d : (d?.items || d?.dossiers || []);
        setDossierCheck(list && list.length > 0 ? "has_dossiers" : "no_dossiers");
      })
      .catch(() => setDossierCheck("no_dossiers"));
  }, [auth.loading, auth.isAuthed, isAdmin]);

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

  // ÉCRAN GATING : "Créez un dossier avant d'accéder à l'explorateur SIG"
  if (dossierCheck === "loading") {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 14, color: "rgba(11,27,58,0.55)", fontStyle: "italic" }}>
            Vérification de votre espace…
          </div>
        </div>
      </div>
    );
  }
  if (dossierCheck === "no_dossiers") {
    return (
      <div style={S.page}>
        <div style={{ ...S.container, maxWidth: 680 }}>
          <div style={{
            background: "#fff", border: "1px solid rgba(201,162,39,0.30)", borderRadius: 16,
            padding: 40, textAlign: "center" as const, boxShadow: "0 14px 42px rgba(11,27,58,0.10)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
            <h1 style={{ fontFamily: '"Playfair Display",Georgia,serif', fontSize: 28, color: "#0B1B3A", margin: "0 0 12px" }}>
              L'explorateur SIG est réservé aux clients avec dossier
            </h1>
            <p style={{ fontSize: 14, color: "rgba(11,27,58,0.72)", lineHeight: 1.65, margin: "0 0 22px" }}>
              Le module SIG (Plans d'Aménagement, référentiels DGI/ANCFCC, géoportails
              urbanistiques officiels) est un service métier réservé aux utilisateurs
              qui ont un dossier d'expertise en cours sur la plateforme.
              <br /><br />
              Créez d'abord un dossier (rapport d'expertise, projet immobilier,
              qualification foncière, etc.) via l'une de nos 6 portes — l'accès à
              l'explorateur SIG vous sera ensuite automatiquement débloqué.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/p5" style={{
                background: "linear-gradient(135deg,#C9A227,#E6C75B)", color: "#fff",
                padding: "12px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14,
                textDecoration: "none",
              }}>
                📋 Créer un rapport d'expertise (Porte 5)
              </a>
              <a href="/" style={{
                background: "#0B1B3A", color: "#fff",
                padding: "12px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14,
                textDecoration: "none",
              }}>
                🏠 Voir les 6 portes
              </a>
            </div>
            <div style={{ marginTop: 20, fontSize: 11.5, color: "rgba(11,27,58,0.55)", fontStyle: "italic" }}>
              Doctrine : protection de la qualité d'expertise + conformité loi 09-08 (données personnelles)
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sig-explorer-page" style={{ ...S.page, padding: isMobile ? "16px 12px 100px" : "32px 20px" }}>
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

        {/* Carte principale + couches SIG (showSigLayers=true). En mobile, on
            laisse la carte respirer en pleine largeur et on offre un bouton
            "Couches / Filtres" qui ouvre les fiches dans une BottomSheet. */}
        <div style={S.mapBlock}>
          <MapPicker
            commune=""
            province=""
            region=""
            height={isMobile ? 360 : (mode === "admin" ? 600 : 520)}
            showSigLayers={true}
          />
          {isMobile && (
            <div style={{ position: "sticky", top: 8, display: "flex", justifyContent: "flex-end", padding: "8px 4px", pointerEvents: "none" }}>
              <button
                type="button"
                onClick={() => setLayersOpen(true)}
                aria-label="Ouvrir les couches et fiches officielles"
                style={{
                  pointerEvents: "auto",
                  minHeight: 44,
                  padding: "0 16px",
                  background: "rgba(11,27,58,0.95)",
                  color: "#fff",
                  border: 0,
                  borderRadius: 22,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                }}
              >
                🗺 Couches & fiches
              </button>
            </div>
          )}
        </div>

        {/* Référentiels officiels DGI / ANCFCC / Taamir / Agences urbaines.
            En mobile, ce gros bloc est rendu DANS la BottomSheet pour laisser
            la carte respirer en pleine largeur. */}
        {references && !isMobile && (
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

            {/* Bandeau couverture nationale */}
            {references._meta && (
              <div style={S.coverageBanner}>
                <strong>📊 Couverture nationale</strong> ·
                {" "}{references._meta.totalCities || (references.cities?.length || 0)} villes DGI publiées ·
                {" "}{references.agences?.length || 0} Agences Urbaines (loi 12-90, 100 % du territoire) ·
                {" "}{references._meta.notPublishedYet?.length || 0} provinces sans PDF DGI propre — couvertes par contiguïté ou par leur AU compétente.
              </div>
            )}

            {/* Fiches par ville */}
            <div style={S.subTitleBlock}>
              <span style={S.subTitle}>🏙 Villes avec référentiel DGI publié</span>
              <span style={S.subTitleCount}>{filteredCities.length} / {references.cities?.length || 0}</span>
            </div>
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

            {/* Agences Urbaines (couverture nationale exhaustive) */}
            {references.agences && references.agences.length > 0 && (() => {
              const needle = referencesFilter.trim().toLowerCase();
              const filteredAU = !needle
                ? references.agences
                : references.agences.filter(au =>
                    au.name.toLowerCase().includes(needle) ||
                    au.region.toLowerCase().includes(needle) ||
                    au.code.toLowerCase().includes(needle) ||
                    [...(au.prefecturesCouvertes || []), ...(au.provincesCouvertes || [])]
                      .some(p => p.toLowerCase().includes(needle))
                  );
              return (
                <>
                  <div style={{ ...S.subTitleBlock, marginTop: 28 }}>
                    <span style={S.subTitle}>🏛 Agences Urbaines (PA, SDAU, zonage urbanistique)</span>
                    <span style={S.subTitleCount}>{filteredAU.length} / {references.agences.length}</span>
                  </div>
                  <div style={S.citiesGrid}>
                    {filteredAU.map(au => (
                      <div key={au.id} style={S.cityCard}>
                        <div style={S.cityHead}>
                          <div>
                            <div style={S.cityName}>{au.name}</div>
                            <div style={S.cityRegion}>
                              {au.code} · {au.region}
                              {au.anneeCreation ? ` · créée ${au.anneeCreation}` : ""}
                            </div>
                          </div>
                          <div style={{ ...S.cityBadge, background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#166534" }}>
                            AU
                          </div>
                        </div>
                        {((au.prefecturesCouvertes && au.prefecturesCouvertes.length > 0) ||
                          (au.provincesCouvertes && au.provincesCouvertes.length > 0)) && (
                          <div style={{ marginTop: 8, fontSize: 11.5, color: "rgba(11,27,58,0.65)", lineHeight: 1.5 }}>
                            <strong>Couvre :</strong>{" "}
                            {[...(au.prefecturesCouvertes || []), ...(au.provincesCouvertes || [])].join(", ")}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                          {au.geoportail && (
                            <a href={au.geoportail} target="_blank" rel="noopener noreferrer" style={S.ficheLink}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ ...S.ficheKindBadge, background: "rgba(34,197,94,0.10)", color: "#166534" }}>GÉOPORTAIL</span>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "#0B1B3A" }}>Carte interactive PA / SDAU</span>
                                <span style={{ color: "#C9A227", fontWeight: 700, fontSize: 12 }}>↗</span>
                              </div>
                              {au.format && <div style={S.ficheDesc}>{au.format}</div>}
                            </a>
                          )}
                          {au.siteOfficiel && (
                            <a href={au.siteOfficiel} target="_blank" rel="noopener noreferrer" style={S.ficheLink}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ ...S.ficheKindBadge, background: "rgba(11,27,58,0.06)", color: "rgba(11,27,58,0.7)" }}>SITE OFF.</span>
                                <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "#0B1B3A" }}>Site institutionnel</span>
                                <span style={{ color: "#C9A227", fontWeight: 700, fontSize: 12 }}>↗</span>
                              </div>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* Liste des provinces sans PDF DGI (transparence) */}
            {references._meta?.notPublishedYet && references._meta.notPublishedYet.length > 0 && (
              <details style={S.notPublishedBlock}>
                <summary style={S.notPublishedSummary}>
                  ⚠ {references._meta.notPublishedYet.length} provinces sans référentiel DGI propre publié
                </summary>
                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(11,27,58,0.7)", lineHeight: 1.6 }}>
                  Ces provinces ne disposent pas (encore) d'un PDF DGI distinct. Pour chacune,
                  consulter la fiche de l'Agence Urbaine compétente ci-dessus + le portail DGI national
                  (qui couvre ces zones par contiguïté dans le PDF de la grande ville voisine).
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {references._meta.notPublishedYet.map((p, i) => (
                      <span key={i} style={{
                        fontSize: 11.5, padding: "3px 8px", borderRadius: 4,
                        background: "rgba(245,158,11,0.10)", color: "#92400e",
                        border: "1px solid rgba(245,158,11,0.30)",
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            )}

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

      {/* BottomSheet mobile : référentiels DGI / ANCFCC / Agences urbaines.
          Réutilise les mêmes styles que le bloc desktop pour ne pas dupliquer. */}
      {isMobile && references && (
        <BottomSheet
          open={layersOpen}
          onClose={() => setLayersOpen(false)}
          snap="full"
          title="Couches & fiches officielles"
        >
          <input
            type="text"
            placeholder="🔎 Filtrer par ville ou région…"
            value={referencesFilter}
            onChange={(e) => setReferencesFilter(e.target.value)}
            inputMode="search"
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid rgba(11,27,58,0.2)",
              borderRadius: 10,
              fontSize: 14,
              minHeight: 44,
              marginBottom: 14,
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          {references._meta && (
            <div style={{ fontSize: 13, color: "rgba(11,27,58,0.7)", marginBottom: 12, padding: "10px 12px", background: "rgba(11,27,58,0.04)", borderRadius: 8, lineHeight: 1.5 }}>
              <strong>📊 Couverture</strong> · {references._meta.totalCities || (references.cities?.length || 0)} villes DGI · {references.agences?.length || 0} Agences Urbaines.
            </div>
          )}
          {/* Liste des fiches villes en cards verticales */}
          {filteredCities.map(city => (
            <div key={city.id} style={{ border: "1px solid rgba(11,27,58,0.1)", borderRadius: 10, padding: 12, marginBottom: 10, background: "#fff" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0B1B3A" }}>{city.name}</div>
              <div style={{ fontSize: 12.5, color: "rgba(11,27,58,0.65)", marginBottom: 8 }}>{city.region}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {city.fiches.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(11,27,58,0.04)", borderRadius: 8, textDecoration: "none", color: "#0B1B3A", fontSize: 13, minHeight: 44 }}>
                    <span style={{ flex: 1, fontWeight: 600 }}>{f.label}</span>
                    <span style={{ color: "#C9A227", fontWeight: 700 }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
          {filteredCities.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "rgba(11,27,58,0.55)", fontSize: 13 }}>
              Aucune ville ne correspond.
            </div>
          )}
        </BottomSheet>
      )}
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

  coverageBanner: {
    padding: "10px 14px", background: "rgba(34,197,94,0.06)",
    border: "1px solid rgba(34,197,94,0.25)", borderLeft: "4px solid #22c55e",
    borderRadius: 10, fontSize: 12.5, color: "rgba(11,27,58,0.85)", lineHeight: 1.6, marginBottom: 16,
  },
  subTitleBlock: { display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 10px" },
  subTitle: { fontSize: 13, fontWeight: 800, color: "rgba(11,27,58,0.85)", letterSpacing: "0.02em" },
  subTitleCount: { fontSize: 11, fontWeight: 700, color: "#C9A227", background: "rgba(201,162,39,0.10)", padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(201,162,39,0.30)" },
  notPublishedBlock: {
    marginTop: 22, padding: "10px 14px",
    background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.22)",
    borderRadius: 10,
  },
  notPublishedSummary: {
    cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#92400e",
  },
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
