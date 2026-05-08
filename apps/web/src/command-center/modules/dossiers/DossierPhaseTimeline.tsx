/**
 * DossierPhaseTimeline.tsx — Frise des 12 phases atelier
 *
 * Lit /p2/dossier/:id/phase/status et affiche la progression :
 *   BRIEF → ESQUISSE → APS → APD → MANDAT_BET → AUTORISATION
 *         → DOSSIER_EXECUTION → DCE → MANDATS → OUVERTURE_CHANTIER
 *         → RÉCEPTIONS → PERMIS_HABITER
 *
 * Style atelier (ivoire, navy, or). Les phases sont regroupées par catégorie
 * (amorce / études / exécution / aboutissement).
 */

import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";
import { CC, PHASE_META, PHASE_ORDER } from "../../theme/tokens";

type PhaseStatus = "EN_COURS" | "COMPLETE" | "PENDING";

interface PhaseStatusResponse {
  current: string | null;
  completed: string[];
  pending: string[];
  records: { phase: string; statut: string; dateDebut?: string | null; dateFin?: string | null; note?: string | null }[];
}

interface Props {
  dossierId: string;
  compact?: boolean;
}

const GROUP_LABEL: Record<string, string> = {
  amorce:        "Amorce",
  etudes:        "Études",
  execution:     "Exécution",
  aboutissement: "Aboutissement",
};

export default function DossierPhaseTimeline({ dossierId, compact }: Props) {
  const [data, setData] = useState<PhaseStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/p2/dossier/${dossierId}/phase/status`)
      .then(res => { if (!cancelled) setData(res as PhaseStatusResponse); })
      .catch(() => { if (!cancelled) setError("Impossible de charger la frise des phases."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dossierId]);

  if (loading) return <div style={S.empty}>Chargement de la frise…</div>;
  if (error)   return <div style={{ ...S.empty, color: CC.color.warn }}>{error}</div>;
  if (!data)   return <div style={S.empty}>Aucune donnée de phase.</div>;

  // Statut effectif de chaque phase
  const completedSet = new Set(data.completed);
  const recordByPhase = new Map(data.records.map(r => [r.phase, r]));
  const phases = PHASE_ORDER.map(key => {
    const meta = PHASE_META[key];
    const status: PhaseStatus = completedSet.has(key) ? "COMPLETE" : data.current === key ? "EN_COURS" : "PENDING";
    return { key, meta, status, record: recordByPhase.get(key) };
  });

  // Regroupement par groupe d'étapes
  const groups = ["amorce", "etudes", "execution", "aboutissement"] as const;
  const grouped = groups.map(g => ({ id: g, phases: phases.filter(p => p.meta.group === g) }));

  // Calcul progression globale
  const total = phases.length;
  const done = phases.filter(p => p.status === "COMPLETE").length;
  const pct = Math.round((done / total) * 100);

  return (
    <div style={S.root}>
      {/* Bandeau de progression */}
      {!compact && (
        <div style={S.progressHead}>
          <div>
            <div style={S.eyebrow}>Progression</div>
            <div style={S.progressLabel}>
              {done} / {total} phases · <span style={{ color: CC.color.or }}>{pct}%</span>
            </div>
          </div>
          <div style={S.progressBar}>
            <div style={{ ...S.progressFill, width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Frise par groupe */}
      <div style={S.groups}>
        {grouped.map(g => (
          <div key={g.id} style={S.group}>
            <div style={S.groupTitle}>{GROUP_LABEL[g.id]}</div>
            <div style={S.phaseList}>
              {g.phases.map((p, idx) => {
                const isLast = idx === g.phases.length - 1;
                return (
                  <div key={p.key} style={S.phaseRow}>
                    <div style={S.dotCol}>
                      <Dot status={p.status} />
                      {!isLast && <div style={S.thread} />}
                    </div>
                    <div style={S.phaseBody}>
                      <div style={S.phaseHead}>
                        <span style={{ ...S.phaseName, color: p.status === "PENDING" ? CC.color.inkMuted : CC.color.ink }}>
                          {p.meta.label}
                        </span>
                        <StatusPill status={p.status} />
                      </div>
                      {p.record?.dateFin && (
                        <div style={S.phaseDate}>
                          Terminée le {new Date(p.record.dateFin).toLocaleDateString("fr-MA", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      )}
                      {p.status === "EN_COURS" && p.record?.dateDebut && (
                        <div style={S.phaseDate}>
                          Démarrée le {new Date(p.record.dateDebut).toLocaleDateString("fr-MA", { day: "numeric", month: "long", year: "numeric" })}
                        </div>
                      )}
                      {p.record?.note && <div style={S.phaseNote}>{p.record.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Dot({ status }: { status: PhaseStatus }) {
  const bg = status === "COMPLETE" ? CC.color.success : status === "EN_COURS" ? CC.color.or : "transparent";
  const ring = status === "COMPLETE" ? CC.color.success : status === "EN_COURS" ? CC.color.or : CC.color.border;
  const inner = status === "COMPLETE" ? "●" : status === "EN_COURS" ? "○" : "·";
  const innerColor = status === "COMPLETE" ? CC.color.bg : status === "EN_COURS" ? CC.color.bgRaised : CC.color.inkMuted;
  return (
    <div style={{
      width: 22, height: 22, borderRadius: "50%",
      background: bg, border: `2px solid ${ring}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, color: innerColor, fontWeight: 700, flexShrink: 0,
      boxShadow: status === "EN_COURS" ? `0 0 0 4px ${CC.color.orSoft}55` : "none",
    }}>
      {inner}
    </div>
  );
}

function StatusPill({ status }: { status: PhaseStatus }) {
  const cfg = {
    COMPLETE: { bg: CC.color.successBg, fg: CC.color.success, label: "terminée" },
    EN_COURS: { bg: CC.color.warnBg,    fg: CC.color.warn,    label: "en cours" },
    PENDING:  { bg: "transparent",       fg: CC.color.inkMuted, label: "à venir" },
  }[status];
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 600, padding: "3px 8px",
      borderRadius: 3, background: cfg.bg, color: cfg.fg,
      letterSpacing: "0.10em", textTransform: "uppercase",
      border: status === "PENDING" ? `1px solid ${CC.color.border}` : "none",
    }}>
      {cfg.label}
    </span>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 24 },
  empty: {
    color: CC.color.inkMuted, fontSize: 13, fontStyle: "italic",
    padding: "16px 0", textAlign: "center",
  },

  progressHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 24, padding: "16px 18px",
    background: CC.color.bgSoft, borderRadius: CC.size.radius,
    border: `1px solid ${CC.color.border}`,
  },
  eyebrow: { fontSize: 9.5, color: CC.color.or, letterSpacing: "0.20em", textTransform: "uppercase", fontWeight: 600 },
  progressLabel: { fontFamily: CC.font.display, fontSize: 18, color: CC.color.navy, fontWeight: 600, marginTop: 3 },
  progressBar: { flex: 1, maxWidth: 320, height: 6, background: CC.color.bgRaised, borderRadius: 3, overflow: "hidden", border: `1px solid ${CC.color.border}` },
  progressFill: { height: "100%", background: CC.color.or, transition: `width 0.3s ${CC.ease}` },

  groups: { display: "flex", flexDirection: "column", gap: 28 },
  group: { display: "flex", flexDirection: "column", gap: 10 },
  groupTitle: {
    fontFamily: CC.font.body, fontSize: 10, color: CC.color.or,
    letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600,
    paddingBottom: 6, borderBottom: `1px solid ${CC.color.border}`,
  },
  phaseList: { display: "flex", flexDirection: "column", gap: 0, paddingTop: 4 },
  phaseRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  dotCol: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, flexShrink: 0 },
  thread: { width: 2, flexGrow: 1, minHeight: 22, background: CC.color.border, marginTop: 4, marginBottom: 4 },

  phaseBody: { flex: 1, paddingBottom: 12 },
  phaseHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  phaseName: { fontFamily: CC.font.display, fontSize: 15, fontWeight: 600, lineHeight: 1.3 },
  phaseDate: { fontSize: 11.5, color: CC.color.inkMuted, fontStyle: "italic", marginTop: 3 },
  phaseNote: { fontSize: 12, color: CC.color.inkMid, marginTop: 4, padding: "6px 10px", background: CC.color.bgSoft, borderRadius: 4, borderLeft: `2px solid ${CC.color.or}` },
};
