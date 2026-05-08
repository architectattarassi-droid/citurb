/**
 * ArchiveVault.tsx — Coffre-fort de fichiers
 *
 * Vue arborescente :
 *   Porte > Client > Dossier > Phase > Document
 *
 * Différent du module recherche : ici on parcourt la totalité du fonds
 * documentaire de l'atelier, classé par hiérarchie. C'est l'app Archive
 * dédiée — distincte du Command Center.
 *
 * Endpoint : GET /api/cc/archive/vault
 */

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, apiBase } from "../../../tomes/tome4/apiClient";
import { CC, PHASE_META } from "../../theme/tokens";

type FileNode = {
  id: string;
  name: string;
  type: "BASE" | "SOUS_PHASE";
  phase: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedAt: string;
  sousPhaseId?: string;
  visibleClient?: boolean;
};
type DossierNode = {
  id: string;
  title: string;
  porteType: string;
  commune: string | null;
  parcelRef: string | null;
  clientLabel: string;
  currentPhase: string | null;
  createdAt: string;
  filesCount: number;
  filesByPhase: Record<string, FileNode[]>;
};
type ClientGroup = { clientLabel: string; clientEmail: string | null; dossiers: DossierNode[] };
type PorteGroup = { porteType: string; clients: ClientGroup[] };
type VaultResponse = { ok: boolean; totalDossiers: number; totalFiles: number; portes: PorteGroup[] };

const PORTE_LABELS: Record<string, string> = {
  P1: "Particuliers", P2: "Promoteurs", P3: "Maîtrise d'ouvrage déléguée",
  P4: "Investisseurs fonciers", P5: "Rapports & expertises", P6: "Entreprises & fournisseurs",
};

export default function ArchiveVault() {
  const [data, setData] = useState<VaultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPortes, setExpandedPortes] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedDossiers, setExpandedDossiers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/cc/archive/vault")
      .then(res => setData(res as VaultResponse))
      .catch((e: any) => setError(e?.message || "Impossible de charger le coffre-fort"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data || !search.trim()) return data;
    const q = search.toLowerCase();
    const portes = data.portes
      .map(p => ({
        ...p,
        clients: p.clients
          .map(c => ({
            ...c,
            dossiers: c.dossiers.filter(d =>
              d.title.toLowerCase().includes(q) ||
              c.clientLabel.toLowerCase().includes(q) ||
              (d.commune || "").toLowerCase().includes(q) ||
              (d.parcelRef || "").toLowerCase().includes(q) ||
              Object.values(d.filesByPhase).flat().some(f => f.name.toLowerCase().includes(q)),
            ),
          }))
          .filter(c => c.dossiers.length > 0),
      }))
      .filter(p => p.clients.length > 0);
    return { ...data, portes };
  }, [data, search]);

  const toggle = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next);
  };

  const downloadFile = async (file: FileNode, dossierId: string) => {
    const token = localStorage.getItem("citurbarea.token") || "";
    const url = file.type === "SOUS_PHASE" && file.sousPhaseId
      ? `${apiBase()}/p2/dossier/${dossierId}/sous-phases/${file.sousPhaseId}/documents/${file.id}/download?_t=${encodeURIComponent(token)}`
      : `${apiBase()}/p2/dossier/${dossierId}/documents/${file.id}/download?_t=${encodeURIComponent(token)}`;
    window.open(url, "_blank", "noopener");
  };

  if (loading) return <div style={S.empty}>Chargement du coffre-fort…</div>;
  if (error)   return <div style={{ ...S.empty, color: CC.color.danger }}>{error}</div>;
  if (!filtered) return null;

  return (
    <div style={S.root}>
      {/* Header éditorial */}
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Atelier · Coffre-fort</div>
          <h2 style={S.title}>Archive documentaire</h2>
          <p style={S.lead}>
            Tous les fichiers de l'atelier, classés par porte, client, dossier et phase.
            Une copie est conservée localement (<code>{LOCAL_PATH}</code>) et une seconde
            mirroirée sur GitHub (sauvegarde nuit, hash chain).
          </p>
        </div>
        <div style={S.headerStats}>
          <Stat label="Dossiers" value={filtered.totalDossiers} />
          <Stat label="Fichiers" value={filtered.totalFiles} accent={CC.color.or} />
          <Stat label="Portes" value={filtered.portes.length} />
        </div>
      </header>

      {/* Search */}
      <div style={S.searchBar}>
        <input
          style={S.search}
          placeholder="Rechercher dans les noms, communes, titres fonciers, fichiers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={S.legend}>
          <span style={{ ...S.legendDot, background: CC.color.or }} /> Phase courante
          <span style={{ ...S.legendDot, background: CC.color.success, marginLeft: 16 }} /> Document validé client
          <span style={{ ...S.legendDot, background: CC.color.inkMuted, marginLeft: 16 }} /> En cours
        </div>
      </div>

      {/* Tree */}
      <div style={S.tree}>
        {filtered.portes.map(porte => {
          const porteOpen = expandedPortes.has(porte.porteType);
          const porteFiles = porte.clients.reduce((s, c) => s + c.dossiers.reduce((s2, d) => s2 + d.filesCount, 0), 0);
          return (
            <div key={porte.porteType} style={S.porteBlock}>
              <button onClick={() => toggle(expandedPortes, setExpandedPortes, porte.porteType)} style={S.porteRow}>
                <span style={S.chevron}>{porteOpen ? "▾" : "▸"}</span>
                <span style={S.porteCode}>{porte.porteType}</span>
                <span style={S.porteLabel}>{PORTE_LABELS[porte.porteType] || porte.porteType}</span>
                <span style={S.porteCount}>{porte.clients.length} client(s) · {porteFiles} fichier(s)</span>
              </button>

              {porteOpen && porte.clients.map(client => {
                const cKey = `${porte.porteType}/${client.clientLabel}`;
                const cOpen = expandedClients.has(cKey);
                return (
                  <div key={cKey} style={S.clientBlock}>
                    <button onClick={() => toggle(expandedClients, setExpandedClients, cKey)} style={S.clientRow}>
                      <span style={S.chevron}>{cOpen ? "▾" : "▸"}</span>
                      <span style={S.clientName}>{client.clientLabel}</span>
                      {client.clientEmail && <span style={S.clientEmail}>· {client.clientEmail}</span>}
                      <span style={S.clientCount}>{client.dossiers.length} dossier(s)</span>
                    </button>

                    {cOpen && client.dossiers.map(dossier => {
                      const dOpen = expandedDossiers.has(dossier.id);
                      const phasesWithFiles = Object.keys(dossier.filesByPhase).sort();
                      return (
                        <div key={dossier.id} style={S.dossierBlock}>
                          <button onClick={() => toggle(expandedDossiers, setExpandedDossiers, dossier.id)} style={S.dossierRow}>
                            <span style={S.chevron}>{dOpen ? "▾" : "▸"}</span>
                            <span style={S.dossierTitle}>{dossier.title}</span>
                            {dossier.commune && <span style={S.dossierMeta}>· {dossier.commune}</span>}
                            {dossier.parcelRef && <span style={S.dossierMeta}>· {dossier.parcelRef}</span>}
                            {dossier.currentPhase && (
                              <span style={S.phasePill}>
                                {(PHASE_META[dossier.currentPhase]?.short) || dossier.currentPhase}
                              </span>
                            )}
                            <span style={S.dossierCount}>{dossier.filesCount} fichier(s)</span>
                          </button>

                          {dOpen && phasesWithFiles.map(phaseKey => {
                            const meta = PHASE_META[phaseKey];
                            const files = dossier.filesByPhase[phaseKey];
                            return (
                              <div key={phaseKey} style={S.phaseBlock}>
                                <div style={S.phaseHead}>
                                  <span style={S.phaseShort}>{meta?.short || phaseKey}</span>
                                  <span style={S.phaseLabel}>{meta?.label || phaseKey}</span>
                                  <span style={S.phaseCount}>{files.length} fichier(s)</span>
                                </div>
                                <div style={S.fileList}>
                                  {files.map(file => (
                                    <div key={file.id} style={S.fileRow}>
                                      <span style={S.fileIcon}>{iconFor(file.mimeType, file.name)}</span>
                                      <span style={S.fileName}>{file.name}</span>
                                      {typeof file.fileSize === "number" && <span style={S.fileSize}>{fmtBytes(file.fileSize)}</span>}
                                      <span style={S.fileDate}>{new Date(file.uploadedAt).toLocaleDateString("fr-FR")}</span>
                                      <button onClick={() => downloadFile(file, dossier.id)} style={S.dlBtn}>↓</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {filtered.portes.length === 0 && (
          <div style={S.empty}>Aucun fichier ne correspond à votre recherche.</div>
        )}
      </div>
    </div>
  );
}

const LOCAL_PATH = (typeof process !== "undefined" && (process as any).env?.STORAGE_ROOT) || "C:/CITURBAREA_DATA/dossiers/";

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={S.stat}>
      <div style={{ ...S.statValue, color: accent || CC.color.navy }}>{value.toLocaleString("fr-MA")}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function iconFor(mime: string | null | undefined, name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (mime?.startsWith("image/") || ["jpg","jpeg","png","webp","gif"].includes(ext)) return "🖼";
  if (mime?.includes("pdf") || ext === "pdf") return "📄";
  if (["dwg","dxf","ifc","rvt","skp","obj","fbx","glb"].includes(ext)) return "📐";
  if (["xlsx","xls","csv"].includes(ext)) return "📊";
  if (["docx","doc","odt"].includes(ext)) return "📝";
  if (["zip","rar","7z","tar","gz"].includes(ext)) return "🗜";
  return "📎";
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 24 },
  empty: { padding: 32, textAlign: "center", color: CC.color.inkMid, fontSize: 13.5, fontStyle: "italic" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 28, paddingBottom: 16, borderBottom: `1px solid ${CC.color.border}` },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 8px", fontFamily: CC.font.display, fontSize: 32, fontWeight: 600, color: CC.color.navy, letterSpacing: "-0.02em" },
  lead: { margin: 0, color: CC.color.inkMid, fontSize: 13.5, fontStyle: "italic", maxWidth: 580, lineHeight: 1.55 },
  headerStats: { display: "flex", gap: 16 },
  stat: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 8, padding: "12px 18px", textAlign: "right", minWidth: 90 },
  statValue: { fontFamily: CC.font.display, fontSize: 26, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontSize: 10, color: CC.color.inkMuted, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 4 },

  searchBar: { display: "flex", flexDirection: "column", gap: 10 },
  search: { padding: "10px 14px", border: `1px solid ${CC.color.border}`, borderRadius: 6, fontSize: 13.5, fontFamily: CC.font.body, background: CC.color.bgRaised, color: CC.color.ink, outline: "none" },
  legend: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: CC.color.inkMuted },
  legendDot: { display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 4 },

  tree: { display: "flex", flexDirection: "column", gap: 12 },

  porteBlock: { background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 10, overflow: "hidden", boxShadow: CC.shadow.soft },
  porteRow: { width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: CC.color.bgSoft, border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderBottom: `1px solid ${CC.color.border}` },
  porteCode: { fontFamily: CC.font.display, fontStyle: "italic", fontSize: 22, fontWeight: 600, color: CC.color.or, minWidth: 36 },
  porteLabel: { flex: 1, fontFamily: CC.font.display, fontSize: 17, color: CC.color.navy, fontWeight: 600 },
  porteCount: { fontSize: 11.5, color: CC.color.inkMuted, fontStyle: "italic" },

  clientBlock: { padding: "10px 20px 4px 50px", borderBottom: `1px dotted ${CC.color.border}` },
  clientRow: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  clientName: { fontSize: 14, color: CC.color.ink, fontWeight: 600 },
  clientEmail: { fontSize: 12, color: CC.color.inkMuted, fontStyle: "italic" },
  clientCount: { marginLeft: "auto", fontSize: 11, color: CC.color.inkMuted },

  dossierBlock: { padding: "6px 0 6px 28px", borderTop: `1px solid ${CC.color.borderSoft}` },
  dossierRow: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 0", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  dossierTitle: { fontSize: 13.5, color: CC.color.ink, fontWeight: 500 },
  dossierMeta: { fontSize: 12, color: CC.color.inkMuted },
  phasePill: { fontSize: 9.5, fontWeight: 600, padding: "3px 8px", borderRadius: 3, background: CC.color.bgSoft, color: CC.color.or, letterSpacing: "0.10em", textTransform: "uppercase", border: `1px solid ${CC.color.or}40` },
  dossierCount: { marginLeft: "auto", fontSize: 11, color: CC.color.inkMuted },

  phaseBlock: { padding: "6px 0 10px 28px" },
  phaseHead: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${CC.color.borderSoft}` },
  phaseShort: { fontFamily: CC.font.display, fontStyle: "italic", fontSize: 12, color: CC.color.or, fontWeight: 600, minWidth: 32 },
  phaseLabel: { fontSize: 12, color: CC.color.ink, fontWeight: 500 },
  phaseCount: { marginLeft: "auto", fontSize: 10.5, color: CC.color.inkMuted, fontStyle: "italic" },

  fileList: { display: "flex", flexDirection: "column", gap: 0, marginTop: 4, paddingLeft: 4 },
  fileRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: `1px solid ${CC.color.borderSoft}`, fontSize: 12.5 },
  fileIcon: { fontSize: 14, width: 20, textAlign: "center" },
  fileName: { flex: 1, color: CC.color.ink, fontFamily: CC.font.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileSize: { fontSize: 11, color: CC.color.inkMuted, fontVariantNumeric: "tabular-nums", minWidth: 60, textAlign: "right" },
  fileDate: { fontSize: 11, color: CC.color.inkMuted, fontStyle: "italic", minWidth: 80, textAlign: "right" },
  dlBtn: { background: CC.color.navy, color: CC.color.bg, border: 0, padding: "5px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" },

  chevron: { fontSize: 12, color: CC.color.inkMuted, width: 14, display: "inline-block" },
};
