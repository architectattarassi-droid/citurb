/**
 * DossierPhasesPage — Page liste générique des phases d'un dossier.
 *
 * Route : /dossiers/:id/phases
 *
 * AUCUNE phase hardcodée. Tout vient du snapshot GET /api/dossier/:id/phases.
 * Lecture seule (vague 3) — aucune mutation.
 *
 * Style : design system CC ("studio architecte" — ivoire/navy/or). Aligné sur
 * DossierPhaseTimeline et le reste de /command-center.
 */
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CC } from "../../command-center/theme/tokens";
import {
  familleLabel,
  groupByFamille,
  isVisuallyBlocked,
  useDossierPhases,
  type SnapshotNode,
} from "./useDossierPhases";
import { ErrorState, LoadingState } from "./errorStates";

type StatusKey = "DONE" | "IN_PROGRESS" | "NOT_STARTED" | "BLOCKED";

const STATUS_LABEL: Record<StatusKey, string> = {
  DONE: "Terminée",
  IN_PROGRESS: "En cours",
  NOT_STARTED: "À démarrer",
  BLOCKED: "Bloquée",
};

const STATUS_BG: Record<StatusKey, string> = {
  DONE: CC.color.successBg,
  IN_PROGRESS: CC.color.infoBg,
  NOT_STARTED: CC.color.bgSoft,
  BLOCKED: CC.color.dangerBg,
};

const STATUS_FG: Record<StatusKey, string> = {
  DONE: CC.color.success,
  IN_PROGRESS: CC.color.info,
  NOT_STARTED: CC.color.inkMuted,
  BLOCKED: CC.color.danger,
};

const STATUS_BORDER: Record<StatusKey, string> = {
  DONE: CC.color.success,
  IN_PROGRESS: CC.color.info,
  NOT_STARTED: CC.color.border,
  BLOCKED: CC.color.danger,
};

const ROOT: React.CSSProperties = {
  background: CC.color.bg,
  color: CC.color.ink,
  minHeight: "100vh",
  fontFamily: CC.font.body,
};

export default function DossierPhasesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { snapshot, loading, error, reload } = useDossierPhases(id);

  if (!id) {
    return (
      <div style={ROOT}>
        <ErrorState
          title="Identifiant de dossier manquant"
          message="L'URL ne contient pas d'identifiant de dossier valide."
          onBack={() => navigate(-1)}
        />
      </div>
    );
  }
  if (loading) return <div style={ROOT}><LoadingState message="Chargement des phases…" /></div>;

  if (error) {
    return (
      <div style={ROOT}>
        <ErrorState
          title={errorTitle(error.status)}
          message={error.message}
          details={(error.details as any)?.errors}
          onBack={() => navigate(-1)}
          onRetry={reload}
        />
      </div>
    );
  }

  if (!snapshot) return <div style={ROOT}><LoadingState message="Aucune donnée." /></div>;

  const groups = groupByFamille(snapshot.nodes);
  const currentSet = new Set(snapshot.currentIds);
  const completedIds = snapshot.completedIds;
  const done = snapshot.completedIds.length;
  const total = snapshot.nodes.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={ROOT}>
      {/* ── Header navy ──────────────────────────────────────────────────── */}
      <header style={{
        background: CC.color.bgDeep,
        color: CC.color.inkOnDark,
        padding: "28px 36px 22px",
        borderBottom: `1px solid ${CC.color.borderDeep}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <button onClick={() => navigate(-1)} style={btnGhostDark}>← Retour</button>
          <span style={{
            fontSize: 10, color: CC.color.or, letterSpacing: "0.22em",
            textTransform: "uppercase", fontWeight: 600,
          }}>
            Phases du dossier
          </span>
        </div>
        <h1 style={{
          fontFamily: CC.font.display, fontSize: 28, fontWeight: 600,
          margin: "4px 0 6px", color: CC.color.inkOnDark, lineHeight: 1.2,
        }}>
          {snapshot.porte} · {total} phases
        </h1>
        <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#C9D1E0" }}>
          <span>
            <code style={{
              fontFamily: CC.font.mono, fontSize: 12, color: CC.color.inkOnDark,
              background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 3,
            }}>{snapshot.dossierId}</code>
          </span>
          {snapshot.typeOperationFoncier !== "aucun" && (
            <span>Foncier : <strong style={{ color: CC.color.or }}>{snapshot.typeOperationFoncier}</strong></span>
          )}
          <span>
            {done} terminée{done > 1 ? "s" : ""} · {pct}%
          </span>
        </div>
      </header>

      <div style={{ padding: "28px 36px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Bandeau mismatch legacy ─────────────────────────────────────── */}
        {snapshot.meta.anyLegacyMismatch && (
          <div style={{
            padding: "12px 18px", background: CC.color.warnBg,
            borderLeft: `3px solid ${CC.color.warn}`, borderRadius: CC.size.radiusSm,
            marginBottom: 24, fontSize: 13, color: CC.color.ink,
          }}>
            <strong style={{ color: CC.color.warn }}>Convention legacy détectée</strong>
            {" — "}
            {snapshot.meta.nbRecordsMatched}/{snapshot.meta.nbRecordsTotal} enregistrement(s)
            {" "}matchent le catalogue v7. Les autres sont au format ancien
            (<code style={{ fontFamily: CC.font.mono, fontSize: 12 }}>PHASE_NN_xxx</code>)
            et apparaîtront comme « à démarrer ». Migration prévue en vague ultérieure.
          </div>
        )}

        {/* ── Bandeau progression ─────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 18, marginBottom: 32,
          padding: "14px 20px", background: CC.color.bgSoft,
          borderRadius: CC.size.radius, border: `1px solid ${CC.color.border}`,
        }}>
          <div style={{ minWidth: 100 }}>
            <div style={eyebrow}>Progression</div>
            <div style={{
              fontFamily: CC.font.display, fontSize: 22, color: CC.color.navy,
              fontWeight: 600, marginTop: 2,
            }}>
              {pct}<span style={{ fontSize: 14, color: CC.color.inkMid }}>%</span>
            </div>
          </div>
          <div style={{
            flex: 1, height: 6, background: CC.color.border,
            borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", background: CC.color.or,
              width: `${pct}%`, transition: `width .3s ${CC.ease}`,
            }} />
          </div>
          <div style={{ fontSize: 12, color: CC.color.inkMid }}>
            {done} / {total} phases
            {snapshot.currentIds.length > 0 && (
              <> · <span style={{ color: CC.color.info }}>{snapshot.currentIds.length} en cours</span></>
            )}
          </div>
        </div>

        {/* ── Groupes par famille ─────────────────────────────────────────── */}
        {groups.map(g => (
          <section key={g.famille} style={{ marginBottom: 36 }}>
            <h2 style={{
              fontFamily: CC.font.body, fontSize: 10, color: CC.color.or,
              letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600,
              paddingBottom: 8, borderBottom: `1px solid ${CC.color.border}`,
              marginBottom: 14, marginTop: 0,
            }}>
              {familleLabel(g.famille)} <span style={{ color: CC.color.inkMuted, fontWeight: 500 }}>
                ({g.nodes.length})
              </span>
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 12,
            }}>
              {g.nodes.map(node => {
                const effectiveStatus: StatusKey = currentSet.has(node.code)
                  ? "IN_PROGRESS"
                  : node.status === "DONE"
                    ? "DONE"
                    : isVisuallyBlocked(node, completedIds)
                      ? "BLOCKED"
                      : "NOT_STARTED";
                return (
                  <Link
                    key={node.code}
                    to={`/dossiers/${id}/phases/${node.slug}`}
                    style={{
                      textDecoration: "none", color: "inherit", display: "block",
                      background: CC.color.bgRaised,
                      border: `1px solid ${CC.color.border}`,
                      borderLeft: `3px solid ${STATUS_BORDER[effectiveStatus]}`,
                      borderRadius: CC.size.radius,
                      padding: "14px 16px",
                      boxShadow: CC.shadow.soft,
                      transition: `box-shadow .15s ${CC.ease}, transform .15s ${CC.ease}`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = CC.shadow.raise;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = CC.shadow.soft;
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                      <StatusDot status={effectiveStatus} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: CC.font.display, fontWeight: 600, fontSize: 15,
                          color: CC.color.ink, lineHeight: 1.3,
                          overflow: "hidden", textOverflow: "ellipsis",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {node.title}
                        </div>
                        <code style={{
                          fontFamily: CC.font.mono, fontSize: 10,
                          color: CC.color.inkMuted, marginTop: 2, display: "block",
                        }}>
                          {node.code}
                        </code>
                      </div>
                      {node.paiementMilestone && (
                        <span title="Jalon de paiement" style={{
                          fontSize: 11, color: CC.color.or, fontWeight: 600,
                          background: CC.color.orSoft + "AA",
                          padding: "3px 7px", borderRadius: 3,
                          flexShrink: 0,
                        }}>
                          Jalon ●
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <StatusBadge status={effectiveStatus} />
                      {node.completedAt && (
                        <span style={{ fontSize: 11, color: CC.color.inkMuted, fontStyle: "italic" }}>
                          {new Date(node.completedAt).toLocaleDateString("fr-MA", { day: "numeric", month: "short", year: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* ── État neutre si tout vide ────────────────────────────────────── */}
        {snapshot.currentIds.length === 0 && snapshot.completedIds.length === 0 && (
          <div style={{
            padding: "20px 24px", background: CC.color.bgRaised,
            border: `1px dashed ${CC.color.border}`, borderRadius: CC.size.radius,
            color: CC.color.inkMid, textAlign: "center", marginTop: 24, fontSize: 13,
          }}>
            Aucune phase en cours ni complétée pour ce dossier — le workflow démarrera
            dès qu'une phase sera activée par l'équipe.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: StatusKey }) {
  const ring = STATUS_FG[status];
  const fill = status === "DONE" ? CC.color.success
    : status === "IN_PROGRESS" ? CC.color.or
    : status === "BLOCKED" ? CC.color.danger
    : "transparent";
  const inner = status === "DONE" ? "●" : status === "IN_PROGRESS" ? "○" : status === "BLOCKED" ? "✕" : "·";
  const innerColor = status === "DONE" ? CC.color.inkOnDark
    : status === "IN_PROGRESS" ? CC.color.bgDeep
    : status === "BLOCKED" ? CC.color.inkOnDark
    : CC.color.inkMuted;
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%",
      background: fill, border: `2px solid ${ring}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, color: innerColor, fontWeight: 700, flexShrink: 0, marginTop: 1,
      boxShadow: status === "IN_PROGRESS" ? `0 0 0 4px ${CC.color.orSoft}66` : "none",
    }}>
      {inner}
    </div>
  );
}

function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <span style={{
      background: STATUS_BG[status],
      color: STATUS_FG[status],
      padding: "3px 9px", borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: "0.10em",
      textTransform: "uppercase",
      border: status === "NOT_STARTED" ? `1px solid ${CC.color.border}` : "none",
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function errorTitle(status: number): string {
  if (status === 401) return "Session expirée";
  if (status === 403) return "Accès refusé";
  if (status === 404) return "Dossier introuvable";
  if (status === 422) return "Dossier non conforme";
  return "Une erreur est survenue";
}

const btnGhostDark: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: CC.size.radiusSm,
  border: `1px solid ${CC.color.borderDeep}`,
  background: "transparent",
  color: CC.color.inkOnDark,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: CC.font.body,
};

const eyebrow: React.CSSProperties = {
  fontSize: 10, color: CC.color.or, letterSpacing: "0.22em",
  textTransform: "uppercase", fontWeight: 600,
};
