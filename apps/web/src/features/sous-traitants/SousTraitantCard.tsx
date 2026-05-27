/**
 * SousTraitantCard — carte responsive d'un sous-traitant assigné à un lot.
 *
 * Affiche le lot, le cabinet, les montants, le statut et l'avancement cumulé.
 * Expose les actions contextuelles selon le statut (contrat, situation, éval).
 */

import React from "react";
import {
  SousTraitantAssignment,
  STATUS_COLOR,
  fmtMad,
} from "./sous-traitants.api";

type Props = {
  assignment: SousTraitantAssignment;
  isChef?: boolean; // true si l'utilisateur est chef de chantier / MO
  isSupplier?: boolean; // true si l'utilisateur est le sous-traitant
  onGenerateContrat?(): void;
  onSignContrat?(): void;
  onDeclareSituation?(): void;
  onValidateSituation?(sitId: string): void;
  onRejectSituation?(sitId: string): void;
  onEvaluate?(): void;
  onShowHistory?(): void;
};

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderLeftWidth: 5,
    borderRadius: 10,
    padding: 14,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 10,
  } as React.CSSProperties,
  top: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: 12,
    flexWrap: "wrap" as const,
  },
  lotLabel: { fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: 0.5 },
  cabinet: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginTop: 2 },
  intitule: { fontSize: 13, color: "#475569", marginTop: 1 },
  pill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: 999,
    letterSpacing: 0.3,
  },
  meta: {
    display: "flex" as const,
    gap: 14,
    flexWrap: "wrap" as const,
    fontSize: 13,
    color: "#0f172a",
    paddingTop: 8,
    borderTop: "1px solid #f1f5f9",
  },
  metaItem: { display: "flex" as const, flexDirection: "column" as const, gap: 1 },
  metaK: { fontSize: 10, color: "#94a3b8", textTransform: "uppercase" as const },
  metaV: { fontSize: 13, fontWeight: 600, color: "#0f172a" },
  pctWrap: {
    height: 8,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden" as const,
    width: "100%",
    marginTop: 4,
  },
  pctBar: { height: "100%", background: "#16a34a", transition: "width 200ms" },
  actions: {
    display: "flex" as const,
    gap: 8,
    flexWrap: "wrap" as const,
    paddingTop: 8,
    borderTop: "1px solid #f1f5f9",
  },
  btn: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDanger: {
    background: "#fff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 6,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  warnBanner: {
    background: "#fef3c7",
    color: "#854d0e",
    border: "1px solid #fde68a",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  situationItem: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "6px 0",
    borderBottom: "1px dashed #e2e8f0",
    fontSize: 12,
  },
};

const STATUS_BORDER: Record<string, string> = {
  PROPOSED: "#94a3b8",
  CONTRACTED: "#1e40af",
  IN_PROGRESS: "#ca8a04",
  COMPLETED: "#16a34a",
  TERMINATED: "#dc2626",
};

export default function SousTraitantCard({
  assignment,
  isChef,
  isSupplier,
  onGenerateContrat,
  onSignContrat,
  onDeclareSituation,
  onValidateSituation,
  onRejectSituation,
  onEvaluate,
  onShowHistory,
}: Props) {
  const a = assignment;
  const statusCfg = STATUS_COLOR[a.status];
  const cumul = a.situations
    .filter((s) => s.validatedAt)
    .reduce((max, s) => (s.pctAvancement > max ? s.pctAvancement : max), 0);
  const pendingSituations = a.situations.filter((s) => !s.validatedAt && !s.rejetMotif);
  const totalPaid = a.situations
    .filter((s) => s.paidAt)
    .reduce((sum, s) => sum + s.montantPaiement, 0);

  return (
    <div style={{ ...S.card, borderLeftColor: STATUS_BORDER[a.status] ?? "#94a3b8" }}>
      <div style={S.top}>
        <div style={{ minWidth: 0 }}>
          <div style={S.lotLabel}>
            Lot {a.lotNumero.toString().padStart(2, "0")} · {a.lotCode}
          </div>
          <div style={S.cabinet}>{a.supplierCabinet}</div>
          <div style={S.intitule}>{a.lotIntitule}</div>
          {a.supplierClasse ? (
            <div style={{ ...S.lotLabel, marginTop: 4 }}>{a.supplierClasse}</div>
          ) : null}
        </div>
        <span style={{ ...S.pill, background: statusCfg.bg, color: statusCfg.fg }}>
          {statusCfg.label}
        </span>
      </div>

      {!a.loi32_99_declared ? (
        <div style={S.warnBanner}>
          Sous-traitance non déclarée — risque loi 32-99
        </div>
      ) : null}

      <div style={S.meta}>
        <div style={S.metaItem}>
          <span style={S.metaK}>Montant HT</span>
          <span style={S.metaV}>{fmtMad(a.montantHt)}</span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaK}>TTC</span>
          <span style={S.metaV}>{fmtMad(a.montantTtc)}</span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaK}>Délai</span>
          <span style={S.metaV}>{a.conditions.delaiJours} j</span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaK}>Payé</span>
          <span style={S.metaV}>{fmtMad(totalPaid)}</span>
        </div>
        <div style={{ ...S.metaItem, flex: 1, minWidth: 140 }}>
          <span style={S.metaK}>Avancement</span>
          <div style={S.pctWrap}>
            <div style={{ ...S.pctBar, width: `${cumul}%` }} />
          </div>
          <span style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{cumul.toFixed(0)} %</span>
        </div>
      </div>

      {pendingSituations.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#854d0e", marginBottom: 4 }}>
            Situations en attente ({pendingSituations.length})
          </div>
          {pendingSituations.map((s) => (
            <div key={s.id} style={S.situationItem}>
              <span>
                {new Date(s.declaredAt).toLocaleDateString("fr-FR")} · {s.pctAvancement} %
                {" · "}
                {fmtMad(s.montantPaiement)}
              </span>
              {isChef ? (
                <span style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn} onClick={() => onValidateSituation?.(s.id)}>
                    Valider
                  </button>
                  <button style={S.btnDanger} onClick={() => onRejectSituation?.(s.id)}>
                    Rejeter
                  </button>
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {a.evaluation ? (
        <div style={{ fontSize: 12, color: "#0f172a" }}>
          <strong>Évaluation</strong> : {a.evaluation.scoreMoyen.toFixed(2)} / 5 ·{" "}
          Q {a.evaluation.qualite} · D {a.evaluation.delai} · Co {a.evaluation.communication} · R{" "}
          {a.evaluation.relation}
        </div>
      ) : null}

      <div style={S.actions}>
        {!a.contratPdfUrl && isChef ? (
          <button style={S.btn} onClick={onGenerateContrat}>
            Générer contrat
          </button>
        ) : null}
        {a.contratPdfUrl && !a.contratSignedAt ? (
          <button style={S.btn} onClick={onSignContrat}>
            Signer contrat
          </button>
        ) : null}
        {a.contratSignedAt && (a.status === "CONTRACTED" || a.status === "IN_PROGRESS") && isSupplier ? (
          <button style={S.btn} onClick={onDeclareSituation}>
            Déclarer situation
          </button>
        ) : null}
        {(a.status === "COMPLETED" || a.status === "TERMINATED") && !a.evaluation && isChef ? (
          <button style={S.btn} onClick={onEvaluate}>
            Évaluer
          </button>
        ) : null}
        <button style={S.btnGhost} onClick={onShowHistory}>
          Historique
        </button>
      </div>
    </div>
  );
}
