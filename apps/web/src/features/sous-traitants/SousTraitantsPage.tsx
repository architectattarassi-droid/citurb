/**
 * SousTraitantsPage — page principale module Sous-Traitants P3 (Tome 3).
 *
 * Route : `/chantier/:dossierId/sous-traitants`
 *
 * Vue chef chantier / MOD :
 *   - Liste des lots TPHI avec sous-traitant assigné (ou bouton "Assigner")
 *   - Dashboard situations en attente validation + paiements à effectuer
 *   - Bandeau audit loi 32-99 (CONFORME / ANOMALIES / NON_CONFORME)
 *
 * Vue sous-traitant (terrain) :
 *   - Cards de ses lots assignés
 *   - FAB sticky "Déclarer situation" mobile-first
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LotCatalogEntry,
  Loi32_99Audit,
  SousTraitantAssignment,
  sousTraitantsApi,
  fmtMad,
} from "./sous-traitants.api";
import SousTraitantCard from "./SousTraitantCard";
import AssignSousTraitantModal from "./AssignSousTraitantModal";
import ContratSousTraitanceForm from "./ContratSousTraitanceForm";
import SituationTravauxForm from "./SituationTravauxForm";
import EvaluationModal from "./EvaluationModal";
import { me } from "../../tomes/tome4/apiClient";

const S = {
  wrap: { padding: 12, maxWidth: 1080, margin: "0 auto", paddingBottom: 96 },
  header: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
    flexWrap: "wrap" as const,
    marginBottom: 14,
  },
  title: { margin: 0, color: "#0f172a", fontSize: 22, fontWeight: 800 },
  sub: { margin: 0, color: "#64748b", fontSize: 13 },
  cta: {
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  auditBanner: (variant: "ok" | "warn" | "bad"): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
    background:
      variant === "ok" ? "#dcfce7" : variant === "warn" ? "#fef9c3" : "#fecaca",
    color:
      variant === "ok" ? "#166534" : variant === "warn" ? "#854d0e" : "#991b1b",
    border: `1px solid ${variant === "ok" ? "#bbf7d0" : variant === "warn" ? "#fde68a" : "#fecaca"}`,
  }),
  dash: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginBottom: 16,
  },
  dashCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  dashK: { fontSize: 11, color: "#64748b", textTransform: "uppercase" as const, fontWeight: 700 },
  dashV: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 12,
  },
  emptyLot: {
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    padding: 14,
    background: "#f8fafc",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 10,
  },
  fab: {
    position: "fixed" as const,
    bottom: 18,
    right: 18,
    background: "#0f172a",
    color: "#fff",
    border: 0,
    borderRadius: 999,
    padding: "14px 22px",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(15,23,42,0.35)",
    zIndex: 50,
  },
  anomalyItem: {
    fontSize: 12,
    padding: "4px 0",
    color: "#7f1d1d",
  },
  empty: {
    textAlign: "center" as const,
    padding: 32,
    color: "#64748b",
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
  },
};

type Modal =
  | { kind: "none" }
  | { kind: "assign"; preselectedLotCode?: string }
  | { kind: "contrat"; assignment: SousTraitantAssignment }
  | { kind: "situation"; assignment: SousTraitantAssignment }
  | { kind: "eval"; assignment: SousTraitantAssignment }
  | { kind: "history"; assignment: SousTraitantAssignment; timeline: Array<{ at: string; type: string; payload: any }> };

export default function SousTraitantsPage() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const [items, setItems] = useState<SousTraitantAssignment[]>([]);
  const [lots, setLots] = useState<LotCatalogEntry[]>([]);
  const [audit, setAudit] = useState<Loi32_99Audit | null>(null);
  const [me_user, setMe] = useState<{ userId: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [listR, lotsR, auditR] = await Promise.all([
        sousTraitantsApi.list(dossierId),
        sousTraitantsApi.catalogLots(),
        sousTraitantsApi.audit(dossierId),
      ]);
      setItems(listR.items);
      setLots(lotsR.lots);
      setAudit(auditR.audit);
    } catch (e: any) {
      setErr(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    reload();
    me()
      .then((r) => setMe({ userId: r.user.userId, role: r.user.role }))
      .catch(() => setMe(null));
  }, [reload]);

  const isChef = useMemo(() => {
    if (!me_user) return false;
    const r = me_user.role;
    return r === "ADMIN" || r === "OWNER" || r === "OPS" || r === "CLIENT";
  }, [me_user]);

  const mySupplierAssignments = useMemo(
    () => items.filter((a) => me_user && a.supplierUserId === me_user.userId),
    [items, me_user],
  );
  const isSupplierContext = mySupplierAssignments.length > 0;

  const pendingSituations = useMemo(
    () =>
      items.flatMap((a) =>
        a.situations
          .filter((s) => !s.validatedAt && !s.rejetMotif)
          .map((s) => ({ assignment: a, situation: s })),
      ),
    [items],
  );

  const totalContractedHT = items.reduce((sum, a) => sum + a.montantHt, 0);
  const totalPaidTTC = items.reduce(
    (sum, a) => sum + a.situations.filter((s) => s.paidAt).reduce((x, s) => x + s.montantPaiement, 0),
    0,
  );

  const lotsWithoutAssignment = useMemo(
    () => lots.filter((l) => !items.find((a) => a.lotCode === l.code && a.status !== "TERMINATED")),
    [lots, items],
  );

  async function handleValidate(assignmentId: string, sitId: string) {
    try {
      await sousTraitantsApi.validateSituation(assignmentId, sitId);
      reload();
    } catch (e: any) {
      alert(e?.message || "Erreur validation");
    }
  }

  async function handleReject(assignmentId: string, sitId: string) {
    const motif = window.prompt("Motif du rejet ?");
    if (!motif) return;
    try {
      await sousTraitantsApi.rejectSituation(assignmentId, sitId, motif);
      reload();
    } catch (e: any) {
      alert(e?.message || "Erreur rejet");
    }
  }

  async function openHistory(a: SousTraitantAssignment) {
    try {
      const r = await sousTraitantsApi.historique(a.id);
      setModal({ kind: "history", assignment: r.assignment, timeline: r.timeline });
    } catch (e: any) {
      alert(e?.message || "Erreur historique");
    }
  }

  const auditVariant: "ok" | "warn" | "bad" = !audit
    ? "ok"
    : audit.conformite === "CONFORME"
      ? "ok"
      : audit.conformite === "ANOMALIES"
        ? "warn"
        : "bad";

  if (loading) {
    return <div style={S.wrap}>Chargement…</div>;
  }

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Sous-traitants</h1>
          <p style={S.sub}>Dossier {dossierId.slice(0, 8)}… · {items.length} assignations</p>
        </div>
        {isChef ? (
          <button style={S.cta} onClick={() => setModal({ kind: "assign" })}>
            + Assigner un sous-traitant
          </button>
        ) : null}
      </div>

      {audit ? (
        <div style={S.auditBanner(auditVariant)}>
          <strong>Audit loi 32-99 — {audit.conformite}</strong>
          {" · "}
          {audit.declared} déclarés · {audit.undeclared} non déclarés ·{" "}
          {audit.missingAgrement} sans agrément · {audit.anomalies.length} anomalies
          {audit.anomalies.length > 0 ? (
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {audit.anomalies.slice(0, 5).map((x, i) => (
                <li key={i} style={S.anomalyItem}>
                  [{x.severity}] {x.code} · {x.supplierCabinet} ({x.lotCode}) — {x.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {isChef ? (
        <div style={S.dash}>
          <div style={S.dashCard}>
            <div style={S.dashK}>Assignations</div>
            <div style={S.dashV}>{items.length}</div>
          </div>
          <div style={S.dashCard}>
            <div style={S.dashK}>Situations à valider</div>
            <div style={{ ...S.dashV, color: pendingSituations.length ? "#ca8a04" : "#0f172a" }}>
              {pendingSituations.length}
            </div>
          </div>
          <div style={S.dashCard}>
            <div style={S.dashK}>Montant contracté HT</div>
            <div style={S.dashV}>{fmtMad(totalContractedHT)}</div>
          </div>
          <div style={S.dashCard}>
            <div style={S.dashK}>Payé TTC</div>
            <div style={S.dashV}>{fmtMad(totalPaidTTC)}</div>
          </div>
        </div>
      ) : null}

      {err ? (
        <div style={{ ...S.auditBanner("bad"), marginBottom: 14 }}>{err}</div>
      ) : null}

      {items.length === 0 && lotsWithoutAssignment.length === 0 ? (
        <div style={S.empty}>Aucune donnée disponible.</div>
      ) : (
        <div style={S.grid}>
          {items.map((a) => (
            <SousTraitantCard
              key={a.id}
              assignment={a}
              isChef={isChef}
              isSupplier={isSupplierContext && a.supplierUserId === me_user?.userId}
              onGenerateContrat={() => setModal({ kind: "contrat", assignment: a })}
              onSignContrat={() => setModal({ kind: "contrat", assignment: a })}
              onDeclareSituation={() => setModal({ kind: "situation", assignment: a })}
              onValidateSituation={(sitId) => handleValidate(a.id, sitId)}
              onRejectSituation={(sitId) => handleReject(a.id, sitId)}
              onEvaluate={() => setModal({ kind: "eval", assignment: a })}
              onShowHistory={() => openHistory(a)}
            />
          ))}

          {isChef
            ? lotsWithoutAssignment.map((l) => (
                <div key={l.code} style={S.emptyLot}>
                  <div>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                      Lot {String(l.numero).padStart(2, "0")}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {l.intitule}
                    </div>
                    {l.agrementRequis ? (
                      <div style={{ fontSize: 11, color: "#ca8a04", marginTop: 2 }}>
                        Agrément requis
                      </div>
                    ) : null}
                  </div>
                  <button
                    style={{ ...S.cta, padding: "8px 12px", fontSize: 12 }}
                    onClick={() => setModal({ kind: "assign", preselectedLotCode: l.code })}
                  >
                    Assigner
                  </button>
                </div>
              ))
            : null}
        </div>
      )}

      {/* FAB mobile sous-traitant */}
      {isSupplierContext && mySupplierAssignments.length === 1 ? (
        <button
          style={S.fab}
          onClick={() =>
            setModal({ kind: "situation", assignment: mySupplierAssignments[0] })
          }
        >
          + Déclarer situation
        </button>
      ) : null}

      {/* Modals */}
      {modal.kind === "assign" ? (
        <AssignSousTraitantModal
          dossierId={dossierId}
          preselectedLotCode={modal.preselectedLotCode}
          onCancel={() => setModal({ kind: "none" })}
          onAssigned={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      ) : null}

      {modal.kind === "contrat" ? (
        <ContratSousTraitanceForm
          assignment={modal.assignment}
          onClose={() => setModal({ kind: "none" })}
          onSigned={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      ) : null}

      {modal.kind === "situation" ? (
        <SituationTravauxForm
          assignment={modal.assignment}
          onClose={() => setModal({ kind: "none" })}
          onDeclared={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      ) : null}

      {modal.kind === "eval" ? (
        <EvaluationModal
          assignment={modal.assignment}
          onClose={() => setModal({ kind: "none" })}
          onEvaluated={() => {
            setModal({ kind: "none" });
            reload();
          }}
        />
      ) : null}

      {modal.kind === "history" ? (
        <HistoryModal
          assignment={modal.assignment}
          timeline={modal.timeline}
          onClose={() => setModal({ kind: "none" })}
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────── HistoryModal

function HistoryModal({
  assignment,
  timeline,
  onClose,
}: {
  assignment: SousTraitantAssignment;
  timeline: Array<{ at: string; type: string; payload: any }>;
  onClose(): void;
}) {
  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    zIndex: 1000,
  };
  const modal: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    maxWidth: 600,
    width: "100%",
    maxHeight: "92vh",
    padding: 20,
    overflowY: "auto",
  };
  const item: React.CSSProperties = {
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
  };
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 16, fontWeight: 800 }}>
          Historique · {assignment.supplierCabinet}
        </h2>
        {timeline.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>Aucun évènement.</div>
        ) : (
          timeline.map((e, i) => (
            <div key={i} style={item}>
              <div style={{ fontWeight: 700, color: "#1e40af" }}>
                {new Date(e.at).toLocaleString("fr-FR")} · {e.type}
              </div>
              <pre
                style={{
                  margin: "4px 0 0",
                  background: "#f8fafc",
                  padding: 6,
                  borderRadius: 4,
                  fontSize: 11,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(e.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            style={{
              background: "#0f172a",
              color: "#fff",
              border: 0,
              borderRadius: 6,
              padding: "9px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
