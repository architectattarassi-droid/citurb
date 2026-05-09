/**
 * AnnuairePage — annuaire pro BTP marocain.
 *
 * Layout : sidebar facets + grid de cards profile (style LinkedIn pro).
 * Recherche multi-facette : métier, classe BTP, région, spécialité, vérifié.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, ProProfile, AnnuaireFacets } from "./api";

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

const REGION_LIST = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

export default function AnnuairePage() {
  const navigate = useNavigate();
  const [facets, setFacets] = useState<AnnuaireFacets | null>(null);
  const [results, setResults] = useState<ProProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<{ q: string; metier: string; classeBTP: string; region: string; verified?: boolean }>({
    q: "", metier: "", classeBTP: "", region: "",
  });
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const r = await cerclesApi.annuaireSearch({
        q: filters.q || undefined,
        metier: filters.metier || undefined,
        classeBTP: filters.classeBTP || undefined,
        region: filters.region || undefined,
        verified: filters.verified,
      });
      setResults(r.data);
      setTotal(r.meta.total);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    cerclesApi.annuaireFacets().then(r => setFacets(r.data)).catch(() => {});
    search();
  }, []);

  useEffect(() => {
    const t = setTimeout(search, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [filters.q, filters.metier, filters.classeBTP, filters.region, filters.verified]);

  return (
    <CerclesShell>
      <div style={S.layout}>
        <aside style={S.sidebarPanel}>
          <header style={{ marginBottom: 18 }}>
            <div style={S.eyebrow}>Atelier · Annuaire</div>
            <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600, marginTop: 4 }}>
              {facets?.total ?? 0} pros
            </div>
          </header>

          <input
            placeholder="Rechercher un pro, une spécialité…"
            value={filters.q}
            onChange={e => setFilters({ ...filters, q: e.target.value })}
            style={S.searchInput}
          />

          <FacetGroup
            title="Métier"
            items={facets?.metiers.map(m => ({ name: m.name, label: METIER_LABELS[m.name] || m.name, count: m.count })) || []}
            active={filters.metier}
            onClick={v => setFilters({ ...filters, metier: v === filters.metier ? "" : v })}
          />

          <FacetGroup
            title="Classe BTP"
            items={(facets?.classesBTP || []).map(c => ({ name: c.name, label: c.name, count: c.count }))}
            active={filters.classeBTP}
            onClick={v => setFilters({ ...filters, classeBTP: v === filters.classeBTP ? "" : v })}
          />

          <div style={S.facetGroup}>
            <div style={S.facetTitle}>Région</div>
            <select
              value={filters.region}
              onChange={e => setFilters({ ...filters, region: e.target.value })}
              style={S.regionSelect}
            >
              <option value="">Toutes</option>
              {REGION_LIST.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={S.facetGroup}>
            <div style={S.facetTitle}>Vérification</div>
            <label style={S.checkLabel}>
              <input type="checkbox" checked={filters.verified === true} onChange={e => setFilters({ ...filters, verified: e.target.checked ? true : undefined })} />
              <span>Pros vérifiés uniquement <span style={{ color: CC_THEME.success }}>✓</span></span>
            </label>
          </div>
        </aside>

        <main style={S.mainPanel}>
          <header style={S.headerMain}>
            <h1 style={S.title}>Annuaire des pros BTP</h1>
            <div style={S.resultsCount}>{loading ? "…" : `${total} résultat(s)`}</div>
          </header>

          {results.length === 0 && !loading && (
            <div style={S.emptyHero}>
              <h2 style={S.emptyTitle}>Aucun pro ne correspond</h2>
              <p style={S.emptyBody}>
                Essaie d'autres filtres, ou{" "}
                <Link to="/cercles/me/profile" style={{ color: CC_THEME.or, fontWeight: 600 }}>complète ton propre profil</Link>{" "}
                pour apparaître ici.
              </p>
            </div>
          )}

          <div style={S.grid}>
            {results.map(p => (
              <article key={p.id} style={S.card} onClick={() => navigate(`/cercles/profile/${p.userId}`)}>
                <div style={S.cardHead}>
                  <div style={{ ...S.avatar, background: p.isVerified ? CC_THEME.successBg : CC_THEME.orSoft }}>
                    {(p.displayName || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={S.cardName}>{p.displayName}</span>
                      {p.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, fontSize: 13 }}>✓</span>}
                    </div>
                    {p.title && <div style={S.cardTitle}>{p.title}</div>}
                  </div>
                </div>

                <div style={S.metierBadge}>{METIER_LABELS[p.metier] || p.metier}{p.classeBTP ? ` · ${p.classeBTP}` : ""}</div>

                {p.bio && <div style={S.cardBio}>{p.bio.slice(0, 140)}{p.bio.length > 140 ? "…" : ""}</div>}

                <div style={S.cardMeta}>
                  {p.villePrincipale && <span>📍 {p.villePrincipale}</span>}
                  {p.regions.length > 0 && <span>🗺 {p.regions.length} région(s)</span>}
                  {p.specialites.length > 0 && <span>🏷 {p.specialites.slice(0, 2).join(", ")}{p.specialites.length > 2 ? "…" : ""}</span>}
                </div>
              </article>
            ))}
          </div>
        </main>
      </div>
    </CerclesShell>
  );
}

function FacetGroup({ title, items, active, onClick }: {
  title: string;
  items: { name: string; label: string; count: number }[];
  active: string;
  onClick: (v: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div style={S.facetGroup}>
      <div style={S.facetTitle}>{title}</div>
      {items.map(it => (
        <button key={it.name} onClick={() => onClick(it.name)} style={{
          ...S.facetItem,
          background: active === it.name ? CC_THEME.bgSoft : "transparent",
          color: active === it.name ? CC_THEME.navy : CC_THEME.inkMid,
          fontWeight: active === it.name ? 600 : 500,
        }}>
          <span>{it.label}</span>
          <span style={S.facetCount}>{it.count}</span>
        </button>
      ))}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  layout: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, alignItems: "start" },
  sidebarPanel: { padding: "28px 22px", borderRight: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, minHeight: "100vh", position: "sticky" as const, top: 0 },
  mainPanel: { padding: "28px 32px 60px" },

  eyebrow: { fontSize: 10, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  searchInput: { width: "100%", padding: "9px 12px", fontSize: 12.5, fontFamily: CC_THEME.fontBody, background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", marginBottom: 22, boxSizing: "border-box" as const },

  facetGroup: { marginBottom: 20, paddingBottom: 16, borderBottom: `1px dotted ${CC_THEME.border}` },
  facetTitle: { fontSize: 9.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 },
  facetItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", fontSize: 12, cursor: "pointer", borderRadius: 4, border: 0, width: "100%", textAlign: "left" as const, fontFamily: "inherit", marginBottom: 1 },
  facetCount: { fontSize: 10, color: CC_THEME.inkMuted, fontFamily: CC_THEME.fontMono },

  regionSelect: { width: "100%", padding: "8px 10px", fontSize: 12, fontFamily: CC_THEME.fontBody, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 5, color: CC_THEME.ink, outline: "none", boxSizing: "border-box" as const, cursor: "pointer" },
  checkLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: CC_THEME.inkMid, cursor: "pointer", padding: 4 },

  headerMain: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${CC_THEME.border}` },
  title: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },
  resultsCount: { fontSize: 12, color: CC_THEME.inkMuted, fontStyle: "italic" },

  emptyHero: { padding: 48, textAlign: "center", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12 },
  emptyTitle: { margin: "0 0 8px", fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },
  emptyBody: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic", lineHeight: 1.6 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  card: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 16, cursor: "pointer", transition: `all 0.15s ${CC_THEME.ease}`, boxShadow: CC_THEME.shadowSoft },
  cardHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: "50%", color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 700, flexShrink: 0 },
  cardName: { fontSize: 14, fontWeight: 600, color: CC_THEME.ink, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  cardTitle: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },

  metierBadge: { fontSize: 11, color: CC_THEME.or, background: CC_THEME.orSoft + "60", padding: "3px 8px", borderRadius: 3, letterSpacing: "0.04em", fontWeight: 500, display: "inline-block" },

  cardBio: { fontSize: 12, color: CC_THEME.ink, lineHeight: 1.5, margin: "10px 0" },
  cardMeta: { display: "flex", flexWrap: "wrap" as const, gap: 8, fontSize: 10.5, color: CC_THEME.inkMuted, marginTop: 8 },
};
