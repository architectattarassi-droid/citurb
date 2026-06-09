/**
 * DossierPhaseDetailPage — Vue détail d'une phase (3 zones).
 *
 * Route : /dossiers/:id/phases/:phaseSlug
 *
 * Z1 SUIVI       — métadonnées (titre, objectif, statut, dates, acteurs,
 *                  validateurs, prérequis résolus en titres cliquables).
 * Z2 MARKETPLACE — affichage seulement (vague 3) : mode, cercle, catégories P6.
 * Z3 TRAÇABILITÉ — placeholder structuré (documents/PV/réserves en vague future).
 *
 * Style : design system CC ("studio architecte" — ivoire/navy/or).
 */
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CC } from "../../command-center/theme/tokens";
import {
  familleLabel,
  useDossierPhases,
} from "./useDossierPhases";
import { ErrorState, LoadingState } from "./errorStates";

type StatusKey = "DONE" | "IN_PROGRESS" | "NOT_STARTED";

const STATUS_LABEL: Record<StatusKey, string> = {
  DONE: "Terminée",
  IN_PROGRESS: "En cours",
  NOT_STARTED: "À démarrer",
};
const STATUS_FG: Record<StatusKey, string> = {
  DONE: CC.color.success,
  IN_PROGRESS: CC.color.info,
  NOT_STARTED: CC.color.inkMuted,
};
const STATUS_BG: Record<StatusKey, string> = {
  DONE: CC.color.successBg,
  IN_PROGRESS: CC.color.infoBg,
  NOT_STARTED: CC.color.bgSoft,
};

const ROOT: React.CSSProperties = {
  background: CC.color.bg,
  color: CC.color.ink,
  minHeight: "100vh",
  fontFamily: CC.font.body,
};

export default function DossierPhaseDetailPage() {
  const { id, phaseSlug } = useParams<{ id: string; phaseSlug: string }>();
  const navigate = useNavigate();
  const { snapshot, loading, error, reload } = useDossierPhases(id);

  if (!id || !phaseSlug) {
    return (
      <div style={ROOT}>
        <ErrorState
          title="URL incomplète"
          message="L'URL ne contient pas tous les paramètres nécessaires (dossier et phase)."
          onBack={() => navigate(-1)}
        />
      </div>
    );
  }

  if (loading) return <div style={ROOT}><LoadingState message="Chargement de la phase…" /></div>;

  if (error) {
    return (
      <div style={ROOT}>
        <ErrorState
          title={errorTitle(error.status)}
          message={error.message}
          details={(error.details as any)?.errors}
          onBack={() => navigate(`/dossiers/${id}/phases`)}
          onRetry={reload}
          backLabel="Liste des phases"
          showLoginLink={error.status === 401}
        />
      </div>
    );
  }

  if (!snapshot) return <div style={ROOT}><LoadingState message="Aucune donnée." /></div>;

  const node = snapshot.nodes.find(n => n.slug === phaseSlug);
  if (!node) {
    return (
      <div style={ROOT}>
        <ErrorState
          title="Phase introuvable"
          message={`Cette phase (« ${phaseSlug} ») n'est pas définie pour ce dossier (porte ${snapshot.porte}). Elle a peut-être été désactivée ou n'est pas applicable à ce type de projet.`}
          onBack={() => navigate(`/dossiers/${id}/phases`)}
          backLabel="Liste des phases"
        />
      </div>
    );
  }

  const byCode = new Map(snapshot.nodes.map(n => [n.code, n]));
  const prereqsResolved = node.prerequis.map(code => byCode.get(code) ?? null);

  return (
    <div style={ROOT}>
      {/* ── Header navy ──────────────────────────────────────────────────── */}
      <header style={{
        background: CC.color.bgDeep,
        color: CC.color.inkOnDark,
        padding: "28px 36px 24px",
        borderBottom: `1px solid ${CC.color.borderDeep}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          <Link to={`/dossiers/${id}/phases`} style={btnGhostDarkLink}>
            ← Liste des phases
          </Link>
          <span style={{
            fontSize: 10, color: CC.color.or, letterSpacing: "0.22em",
            textTransform: "uppercase", fontWeight: 600,
          }}>
            {familleLabel(node.famille)} · ordre {node.order}
          </span>
          {node.paiementMilestone && (
            <span style={{
              fontSize: 10, color: CC.color.or, fontWeight: 600,
              background: "rgba(176,141,87,0.18)",
              padding: "3px 9px", borderRadius: 3,
              letterSpacing: "0.10em", textTransform: "uppercase",
              border: `1px solid ${CC.color.or}66`,
            }}>
              Jalon paiement
            </span>
          )}
        </div>
        <h1 style={{
          fontFamily: CC.font.display, fontSize: 30, fontWeight: 600,
          margin: "0 0 6px", color: CC.color.inkOnDark, lineHeight: 1.15,
        }}>
          {node.title}
        </h1>
        <code style={{
          fontFamily: CC.font.mono, fontSize: 12,
          color: "#A8B0C0",
        }}>
          {node.code}
        </code>
      </header>

      <div style={{ padding: "28px 36px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Z1 — SUIVI ─────────────────────────────────────────────────── */}
        <Zone title="Suivi" subtitle="Métadonnées, statut, prérequis, acteurs" letter="Z1">
          <Row label="Statut">
            <StatusBadge status={node.status} />
          </Row>
          <Row label="Famille">{familleLabel(node.famille)}</Row>
          <Row label="Objectif">
            <span style={{ color: CC.color.inkMid, lineHeight: 1.55 }}>{node.objectif}</span>
          </Row>
          <Row label="Date de début">{fmtDate(node.startDate)}</Row>
          <Row label="Date d'échéance">{fmtDate(node.dueDate)}</Row>
          <Row label="Date de complétion">{fmtDate(node.completedAt)}</Row>
          <Row label="Acteurs impliqués">
            <ChipList items={node.acteurs} variant="navy" />
          </Row>
          <Row label="Validateurs">
            <ChipList items={node.validateurs} variant="success" />
          </Row>
          <Row label={`Prérequis (${prereqsResolved.length})`}>
            {prereqsResolved.length === 0 ? (
              <span style={{ color: CC.color.inkMuted, fontStyle: "italic" }}>
                Aucun — phase d'amorce du parcours
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                {prereqsResolved.map((p, i) => {
                  if (!p) return (
                    <div key={i} style={{ color: CC.color.inkMuted, fontSize: 12 }}>
                      <code style={{ fontFamily: CC.font.mono }}>{node.prerequis[i]}</code> (introuvable dans le catalogue)
                    </div>
                  );
                  const dot = p.status === "DONE" ? "●" : p.status === "IN_PROGRESS" ? "◉" : "○";
                  const dotColor = p.status === "DONE" ? CC.color.success
                    : p.status === "IN_PROGRESS" ? CC.color.info
                    : CC.color.inkMuted;
                  return (
                    <Link
                      key={p.code}
                      to={`/dossiers/${id}/phases/${p.slug}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        textDecoration: "none", color: CC.color.navy,
                        padding: "6px 10px", borderRadius: CC.size.radiusSm,
                        transition: `background .15s ${CC.ease}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = CC.color.bgSoft)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ color: dotColor, fontSize: 14 }}>{dot}</span>
                      <span style={{
                        fontFamily: CC.font.body, fontWeight: 500, fontSize: 13,
                        flex: 1,
                      }}>
                        {p.title}
                      </span>
                      <code style={{
                        fontFamily: CC.font.mono, fontSize: 11, color: CC.color.inkMuted,
                      }}>
                        {p.code}
                      </code>
                    </Link>
                  );
                })}
              </div>
            )}
          </Row>
        </Zone>

        {/* ── Z2 — MARKETPLACE ───────────────────────────────────────────── */}
        <Zone title="Marketplace" subtitle="Branchement catalogue prestataires & matériaux" letter="Z2">
          {node.marketplace.mode === "AUCUN" ? (
            <div style={{
              color: CC.color.inkMid, fontStyle: "italic" as const,
              padding: "8px 0", fontSize: 13,
            }}>
              Pas de marketplace pour cette phase — aucune commande ni prestataire à sélectionner.
            </div>
          ) : (
            <>
              <Row label="Mode">
                <span style={{
                  background: node.marketplace.mode === "STRICT" ? CC.color.dangerBg : CC.color.infoBg,
                  color: node.marketplace.mode === "STRICT" ? CC.color.danger : CC.color.info,
                  padding: "3px 10px", borderRadius: 3,
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.10em",
                  textTransform: "uppercase" as const,
                }}>
                  {node.marketplace.mode}
                </span>
                <span style={{ color: CC.color.inkMuted, fontSize: 12, marginLeft: 10 }}>
                  {node.marketplace.mode === "STRICT"
                    ? "passage obligatoire par la marketplace"
                    : "marketplace prioritaire mais non bloquante"}
                </span>
              </Row>
              <Row label="Cercle de rattachement">
                {node.marketplace.cercle ? (
                  <code style={{ fontFamily: CC.font.mono, fontSize: 12, color: CC.color.navy }}>
                    {node.marketplace.cercle}
                  </code>
                ) : (
                  <span style={{ color: CC.color.inkMuted }}>—</span>
                )}
              </Row>
              <Row label="Catégories proposées">
                <ChipList items={node.marketplace.categories} variant="or" />
              </Row>
              <Row label="Types d'opération">
                <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" as const }}>
                  <CheckFlag on={node.marketplace.commandeMateriaux} label="Commande matériaux" />
                  <CheckFlag on={node.marketplace.commandeService} label="Commande service" />
                  <CheckFlag on={node.marketplace.suiviRetour} label="Suivi de retour" />
                </div>
              </Row>
              <div style={{
                marginTop: 12, padding: "10px 14px", background: CC.color.bgSoft,
                borderLeft: `2px solid ${CC.color.or}`, borderRadius: CC.size.radiusSm,
                color: CC.color.inkMid, fontSize: 12, fontStyle: "italic" as const,
              }}>
                Affichage en lecture seule. Les actions de commande (sélection prestataire, devis,
                commande matériau) seront ajoutées avec les endpoints marketplace dans une vague ultérieure.
              </div>
            </>
          )}
        </Zone>

        {/* ── Z3 — TRAÇABILITÉ ───────────────────────────────────────────── */}
        <Zone title="Traçabilité" subtitle="Documents, PV, réserves, historique" letter="Z3">
          <div style={{
            padding: "16px 20px", background: CC.color.bgSoft,
            borderLeft: `2px solid ${CC.color.border}`, borderRadius: CC.size.radiusSm,
            color: CC.color.inkMid, fontSize: 13,
          }}>
            <div style={{
              fontFamily: CC.font.body, fontWeight: 600, marginBottom: 10,
              color: CC.color.navy, fontSize: 13,
            }}>
              Structure prévue
            </div>
            <ul style={{ marginLeft: 20, lineHeight: 1.8, fontSize: 12 }}>
              <li>Documents attendus de la phase — uploads + viewer</li>
              <li>PV générés et signés (PV_AVANT_BETONNAGE, PV_LOT, etc.)</li>
              <li>Réserves typées (par lot, entreprise, statut)</li>
              <li>Historique des transitions de statut</li>
              <li>Messagerie phase (chat) et réunions associées</li>
            </ul>
            <div style={{ marginTop: 12, color: CC.color.inkMuted, fontSize: 11 }}>
              Ces modules existent partiellement côté base (PhaseChat, PhaseReunion, PhaseHistorique,
              DossierSousPhase, SousPhaseDocument, DossierNonConformite). L'endpoint dédié les
              exposera dans une vague ultérieure.
            </div>
          </div>
        </Zone>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Zone({ title, subtitle, letter, children }: {
  title: string; subtitle?: string; letter: string; children: React.ReactNode;
}) {
  return (
    <section style={{
      background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`,
      borderRadius: CC.size.radius, padding: "20px 26px", marginBottom: 18,
      boxShadow: CC.shadow.soft,
    }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${CC.color.border}` }}>
        <span style={{
          fontFamily: CC.font.display, fontSize: 11, fontWeight: 600,
          color: CC.color.or, letterSpacing: "0.15em",
          padding: "3px 10px", border: `1px solid ${CC.color.or}88`,
          borderRadius: CC.size.radiusSm,
          background: CC.color.orSoft + "33",
        }}>
          {letter}
        </span>
        <h2 style={{
          fontFamily: CC.font.display, fontSize: 18, fontWeight: 600,
          color: CC.color.navy, margin: 0, lineHeight: 1.2,
        }}>
          {title}
        </h2>
        {subtitle && (
          <span style={{
            fontSize: 12, color: CC.color.inkMuted, fontStyle: "italic" as const,
            marginBottom: 2,
          }}>
            {subtitle}
          </span>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", gap: 16, padding: "10px 0",
      borderBottom: `1px solid ${CC.color.borderSoft}`,
      alignItems: "flex-start", fontSize: 13,
    }}>
      <span style={{
        color: CC.color.inkMuted, width: 200, flexShrink: 0,
        fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
        textTransform: "uppercase" as const, paddingTop: 2,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, color: CC.color.ink, fontSize: 13 }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusKey }) {
  return (
    <span style={{
      background: STATUS_BG[status],
      color: STATUS_FG[status],
      padding: "4px 12px", borderRadius: 3,
      fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      border: status === "NOT_STARTED" ? `1px solid ${CC.color.border}` : "none",
    }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ChipList({ items, variant }: {
  items: string[];
  variant: "navy" | "or" | "success";
}) {
  if (items.length === 0) {
    return <span style={{ color: CC.color.inkMuted, fontStyle: "italic" as const }}>—</span>;
  }
  const cfg = {
    navy: { bg: CC.color.infoBg, fg: CC.color.info, border: CC.color.info + "33" },
    or: { bg: CC.color.orSoft + "55", fg: CC.color.or, border: CC.color.or + "55" },
    success: { bg: CC.color.successBg, fg: CC.color.success, border: CC.color.success + "33" },
  }[variant];
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
      {items.map(item => (
        <span key={item} style={{
          background: cfg.bg, color: cfg.fg,
          padding: "3px 9px", borderRadius: 3,
          fontSize: 11, fontWeight: 600,
          fontFamily: CC.font.body,
          border: `1px solid ${cfg.border}`,
        }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function CheckFlag({ on, label }: { on: boolean; label: string }) {
  return (
    <span style={{
      color: on ? CC.color.success : CC.color.inkMuted,
      display: "inline-flex", alignItems: "center", gap: 5,
      fontWeight: on ? 600 : 400,
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 14, height: 14, borderRadius: 3,
        background: on ? CC.color.successBg : "transparent",
        border: `1px solid ${on ? CC.color.success : CC.color.border}`,
        color: on ? CC.color.success : CC.color.inkMuted, fontSize: 10, fontWeight: 700,
      }}>
        {on ? "✓" : ""}
      </span>
      {label}
    </span>
  );
}

function fmtDate(d?: string | null): React.ReactNode {
  if (!d) return <span style={{ color: CC.color.inkMuted }}>—</span>;
  try {
    return new Date(d).toLocaleString("fr-MA", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function errorTitle(status: number): string {
  if (status === 401) return "Session expirée";
  if (status === 403) return "Accès refusé";
  if (status === 404) return "Dossier introuvable";
  if (status === 422) return "Dossier non conforme";
  return "Une erreur est survenue";
}

const btnGhostDarkLink: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: CC.size.radiusSm,
  border: `1px solid ${CC.color.borderDeep}`,
  background: "transparent",
  color: CC.color.inkOnDark,
  fontSize: 12,
  fontWeight: 500,
  textDecoration: "none",
  fontFamily: CC.font.body,
  display: "inline-block",
};
