/**
 * ArchiveModule.tsx
 * Page admin /cc/archive — recherche multi-dimensionnelle + accès complet aux dossiers.
 *
 * Layout:
 *   Sidebar gauche (240px): filtres facettés avec compteurs
 *   Zone principale: barre recherche + table résultats
 *   Click ligne → /cc/archive/:id (vue complète)
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../tomes/tome4/apiClient";

type Facet = { name: string; count: number };
type Facets = {
  total: number;
  communes: Facet[];
  arrondissements: Facet[];
  portes: Facet[];
  sousTypes: Facet[];
  statuses: Facet[];
  lotissements: Facet[];
};

type ResultRow = {
  id: string;
  createdAt: string;
  title: string | null;
  commune: string | null;
  arrondissement: string | null;
  clientNom: string | null;
  clientEmail: string | null;
  clientTel: string | null;
  raisonSociale: string | null;
  rc: string | null;
  ice: string | null;
  parcelRef: string | null;
  porteType: string | null;
  status: string | null;
  titreFoncier?: string;
  lotissement?: string;
  packLabel?: string;
  montantTTC?: number;
  packValidationStatus?: string;
};

const PORTE_COLORS: Record<string, string> = {
  P1: "#3b82f6", P2: "#8b5cf6", P3: "#10b981", P4: "#f59e0b", P5: "#22d3ee", P6: "#ef4444",
};

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

const porteBadgeStyle = (p: string): React.CSSProperties => ({
  display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
  background: (PORTE_COLORS[p] || "#6b7280") + "30", color: PORTE_COLORS[p] || "#6b7280",
});

const S: Record<string, React.CSSProperties> = {
  root: { display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" },
  sidebar: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 10, padding: 14, position: "sticky" as const, top: 16, maxHeight: "calc(100vh - 100px)", overflowY: "auto" as const },
  facetGroup: { marginBottom: 18 },
  facetTitle: { fontSize: 10, color: "#22d3ee", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 700, marginBottom: 6 },
  facetItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", fontSize: 12, color: "#cbd5e1", cursor: "pointer", borderRadius: 4 },
  facetItemActive: { background: "rgba(34,211,238,0.15)", color: "#22d3ee", fontWeight: 600 },
  facetCount: { fontSize: 10, color: "#6b7280", fontFamily: "'DM Mono', monospace" },
  search: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 10, padding: 14, marginBottom: 14 },
  searchRow: { display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "8px 12px", fontSize: 12, fontFamily: "inherit" },
  pillBtn: { padding: "5px 10px", background: "#1e293b", color: "#cbd5e1", border: 0, borderRadius: 4, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  pillActive: { background: "rgba(34,211,238,0.2)", color: "#22d3ee" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, background: "#0d1017", border: "1px solid #1e2330", borderRadius: 10, overflow: "hidden" },
  th: { padding: "10px 12px", textAlign: "left" as const, color: "#4a5568", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontSize: 10, borderBottom: "1px solid #1e2330", background: "#0a0f1a", whiteSpace: "nowrap" as const },
  td: { padding: "10px 12px", borderBottom: "1px solid #1a1f2e", verticalAlign: "top" as const },
  empty: { padding: 48, textAlign: "center" as const, color: "#6b7280", background: "#0d1017", borderRadius: 10 },
};

export default function ArchiveModule() {
  const navigate = useNavigate();
  const [facets, setFacets] = useState<Facets | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    q: "",
    commune: "",
    porteType: "",
    status: "",
    lotissement: "",
    titreFoncier: "",
    raisonSociale: "",
    ice: "",
    dateFrom: "",
    dateTo: "",
  });

  const setF = (k: keyof typeof filters) => (v: string) => setFilters(prev => ({ ...prev, [k]: v }));

  const loadFacets = useCallback(async () => {
    try {
      const r: any = await apiFetch("/api/cc/archive/facets");
      if (r?.ok) setFacets(r);
    } catch (e: any) { setError(e?.message || "Erreur chargement facets"); }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) qs.append(k, String(v)); });
      qs.append("take", "100");
      const r: any = await apiFetch(`/api/cc/archive/search?${qs.toString()}`);
      if (r?.ok) setResults(r.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Erreur recherche");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadFacets(); }, [loadFacets]);
  useEffect(() => {
    const t = setTimeout(search, 300); // debounce
    return () => clearTimeout(t);
  }, [search]);

  const isFilterActive = useMemo(() => Object.values(filters).some(v => !!v), [filters]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e8eaf0", fontFamily: "'DM Mono', monospace" }}>📚 Archive — Recherche multi-dimensionnelle</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4a5568" }}>
          {facets?.total ?? "..."} dossiers indexés · accès complet aux données + documents · accessible 24/7 depuis n'importe quel poste
        </p>
      </div>

      <div style={S.root}>
        <aside style={S.sidebar}>
          <FacetGroup
            title="Porte"
            items={facets?.portes ?? []}
            active={filters.porteType}
            onClick={(v) => setF("porteType")(v === filters.porteType ? "" : v)}
            colorize={(v) => PORTE_COLORS[v]}
          />
          <FacetGroup
            title="Commune"
            items={(facets?.communes ?? []).slice(0, 12)}
            active={filters.commune}
            onClick={(v) => setF("commune")(v === filters.commune ? "" : v)}
          />
          <FacetGroup
            title="Statut"
            items={facets?.statuses ?? []}
            active={filters.status}
            onClick={(v) => setF("status")(v === filters.status ? "" : v)}
          />
          {(facets?.lotissements?.length ?? 0) > 0 && (
            <FacetGroup
              title="Lotissement"
              items={(facets?.lotissements ?? []).slice(0, 10)}
              active={filters.lotissement}
              onClick={(v) => setF("lotissement")(v === filters.lotissement ? "" : v)}
            />
          )}
          {isFilterActive && (
            <button
              onClick={() => setFilters({ q: "", commune: "", porteType: "", status: "", lotissement: "", titreFoncier: "", raisonSociale: "", ice: "", dateFrom: "", dateTo: "" })}
              style={{ ...S.pillBtn, marginTop: 12, background: "#1a0a0a", color: "#fca5a5", width: "100%", justifyContent: "center" }}
            >
              ✕ Réinitialiser tous les filtres
            </button>
          )}
        </aside>

        <main>
          <div style={S.search}>
            <div style={S.searchRow}>
              <input
                placeholder="🔍 Recherche libre (nom, raison sociale, ICE, RC, titre foncier, commune…)"
                value={filters.q}
                onChange={e => setF("q")(e.target.value)}
                style={{ ...S.inp, flex: 1, minWidth: 280, fontSize: 13, padding: "10px 14px" }}
              />
            </div>
            <div style={{ ...S.searchRow, marginTop: 8 }}>
              <input placeholder="Titre foncier" value={filters.titreFoncier} onChange={e => setF("titreFoncier")(e.target.value)} style={{ ...S.inp, width: 160 }} />
              <input placeholder="Raison sociale" value={filters.raisonSociale} onChange={e => setF("raisonSociale")(e.target.value)} style={{ ...S.inp, width: 180 }} />
              <input placeholder="ICE" value={filters.ice} onChange={e => setF("ice")(e.target.value)} style={{ ...S.inp, width: 130 }} />
              <input type="date" value={filters.dateFrom} onChange={e => setF("dateFrom")(e.target.value)} style={S.inp} title="Du" />
              <input type="date" value={filters.dateTo} onChange={e => setF("dateTo")(e.target.value)} style={S.inp} title="Au" />
              <span style={{ color: "#6b7280", fontSize: 11, marginLeft: "auto" }}>
                {results.length} résultat{results.length > 1 ? "s" : ""} {loading ? "(chargement…)" : ""}
              </span>
            </div>
          </div>

          {error && <div style={{ background: "#1a0a0a", border: "1px solid #ef444440", padding: 12, borderRadius: 6, color: "#fca5a5", marginBottom: 12, fontSize: 12 }}>⚠ {error}</div>}

          {!loading && results.length === 0 ? (
            <div style={S.empty}>
              {isFilterActive ? "Aucun dossier ne correspond à vos critères." : "Aucun dossier dans l'archive."}
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {["Date", "Porte", "Client / Société", "Commune", "Titre foncier / Lotissement", "Pack", "Montant", "Statut", ""].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(30,35,48,0.3)", cursor: "pointer" }} onClick={() => navigate(`/cc/archive/${d.id}`)}>
                    <td style={S.td}>
                      <span style={{ color: "#9ca3af", fontSize: 11 }}>
                        {new Date(d.createdAt).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "2-digit" })}
                      </span>
                    </td>
                    <td style={S.td}>
                      {d.porteType && <span style={porteBadgeStyle(d.porteType)}>{d.porteType}</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 12 }}>{d.clientNom || d.raisonSociale || "—"}</div>
                      {d.raisonSociale && d.clientNom && <div style={{ color: "#6b7280", fontSize: 10 }}>{d.raisonSociale}</div>}
                      {d.ice && <div style={{ color: "#9ca3af", fontSize: 10 }}>ICE: {d.ice}</div>}
                    </td>
                    <td style={S.td}>
                      <div style={{ color: "#cbd5e1" }}>{d.commune || "—"}</div>
                      {d.arrondissement && <div style={{ color: "#6b7280", fontSize: 10 }}>{d.arrondissement}</div>}
                    </td>
                    <td style={S.td}>
                      {d.titreFoncier && <div style={{ color: "#fcd34d", fontSize: 11 }}>📜 {d.titreFoncier}</div>}
                      {d.lotissement && <div style={{ color: "#a7f3d0", fontSize: 11 }}>🗺️ {d.lotissement}</div>}
                      {!d.titreFoncier && !d.lotissement && <span style={{ color: "#6b7280" }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ color: "#cbd5e1", fontSize: 11 }}>{d.packLabel || d.title?.slice(0, 40) || "—"}</div>
                    </td>
                    <td style={S.td}>
                      <span style={{ color: "#10b981", fontWeight: 600, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                        {fmtMAD(d.montantTTC)}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ color: "#9ca3af", fontSize: 10 }}>{d.status || "—"}</div>
                      {d.packValidationStatus && (
                        <div style={{ color: d.packValidationStatus === "ACTIVATED" ? "#34d399" : "#fcd34d", fontSize: 9, marginTop: 2 }}>
                          ● {d.packValidationStatus}
                        </div>
                      )}
                    </td>
                    <td style={S.td}>
                      <button style={{ background: "transparent", color: "#22d3ee", border: 0, fontSize: 16, cursor: "pointer" }}>→</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar Facet Group ─────────────────────────────────────────────

function FacetGroup({
  title, items, active, onClick, colorize,
}: {
  title: string;
  items: Facet[];
  active?: string;
  onClick: (name: string) => void;
  colorize?: (name: string) => string | undefined;
}) {
  if (items.length === 0) return null;
  return (
    <div style={S.facetGroup}>
      <div style={S.facetTitle}>{title}</div>
      {items.map(it => {
        const isActive = active === it.name;
        const color = colorize?.(it.name);
        return (
          <div
            key={it.name}
            style={{ ...S.facetItem, ...(isActive ? S.facetItemActive : {}), color: color || (isActive ? "#22d3ee" : "#cbd5e1") }}
            onClick={() => onClick(it.name)}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            <span style={S.facetCount}>{it.count}</span>
          </div>
        );
      })}
    </div>
  );
}
