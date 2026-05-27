/**
 * CommandeCard — carte récap d'une commande matériaux.
 * Mobile-first. Affiche statut badge + détails + actions contextuelles.
 *
 * Actions :
 *  - Chef chantier : "Réceptionner" (visible si EN_ROUTE / CONFIRMED)
 *  - Fournisseur :   "Confirmer", "Refuser", "Marquer en route"
 *  - Tous :          "Voir audit"
 */

import React from "react";
import { Commande, STATUS_COLOR, fmtMad } from "./livraisons-materiaux.api";

type Role = "chef" | "supplier" | "admin" | "viewer";

type Props = {
  commande: Commande;
  role: Role;
  onReceive?: (cmd: Commande) => void;
  onConfirm?: (cmd: Commande) => void;
  onReject?: (cmd: Commande) => void;
  onMarkPrete?: (cmd: Commande) => void;
  onShowAudit?: (cmd: Commande) => void;
};

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
    marginBottom: 12,
  } as React.CSSProperties,
  head: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  idLine: { fontSize: 12, color: "#64748b", fontWeight: 600, letterSpacing: 0.3 },
  date: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  badge: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  } as React.CSSProperties,
  meta: { fontSize: 13, color: "#334155", marginBottom: 4 },
  lignes: { margin: "8px 0", fontSize: 13, color: "#475569" },
  ligne: { display: "flex", justifyContent: "space-between", padding: "3px 0" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 6,
    marginTop: 6,
  } as React.CSSProperties,
  actions: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" as const },
  btn: {
    border: 0,
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    minHeight: 44, // mobile tap target
  } as React.CSSProperties,
  primary: { background: "#0f172a", color: "#fff" } as React.CSSProperties,
  success: { background: "#16a34a", color: "#fff" } as React.CSSProperties,
  danger: { background: "#dc2626", color: "#fff" } as React.CSSProperties,
  ghost: { background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" } as React.CSSProperties,
  anomalies: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    fontSize: 12,
    color: "#991b1b",
  } as React.CSSProperties,
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CommandeCard({
  commande,
  role,
  onReceive,
  onConfirm,
  onReject,
  onMarkPrete,
  onShowAudit,
}: Props) {
  const status = STATUS_COLOR[commande.status];
  const canReceive = role === "chef" || role === "admin";
  const isSupplier = role === "supplier" || role === "admin";

  const showConfirm = isSupplier && commande.status === "REQUEST";
  const showReject = isSupplier && commande.status === "REQUEST";
  const showPrete = isSupplier && commande.status === "CONFIRMED";
  const showReceive =
    canReceive && (commande.status === "EN_ROUTE" || commande.status === "CONFIRMED");

  return (
    <div style={S.card}>
      <div style={S.head}>
        <div>
          <div style={S.idLine}>#{commande.id.slice(-8).toUpperCase()}</div>
          <div style={S.date}>Livraison prévue : {formatDate(commande.dateLivraisonSouhaitee)}</div>
        </div>
        <span style={{ ...S.badge, background: status.bg, color: status.fg }}>{status.label}</span>
      </div>

      <div style={S.meta}>
        <strong>Adresse :</strong> {commande.adresseLivraison || "—"}
      </div>
      <div style={S.meta}>
        <strong>Fournisseur :</strong> <code style={{ fontSize: 12 }}>{commande.supplierUserId.slice(-10)}</code>
      </div>

      <div style={S.lignes}>
        {commande.lignes.map((l) => (
          <div key={l.id} style={S.ligne}>
            <span>{l.materialLabel} <small style={{ color: "#94a3b8" }}>×{l.qtyDemandee} {l.unit}</small></span>
            <span>{fmtMad(l.totalLigne, false)}</span>
          </div>
        ))}
        <div style={S.totalRow}>
          <span>Total TTC</span>
          <span>{fmtMad(commande.totalTtc)}</span>
        </div>
      </div>

      {commande.anomalies.length > 0 && (
        <div style={S.anomalies}>
          <strong>⚠ {commande.anomalies.length} anomalie(s) déclarée(s)</strong>
          <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
            {commande.anomalies.map((a) => (
              <li key={a.id}>{a.type} — {a.description.slice(0, 80)}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={S.actions}>
        {showReceive && onReceive && (
          <button style={{ ...S.btn, ...S.primary }} onClick={() => onReceive(commande)}>
            Réceptionner sur chantier
          </button>
        )}
        {showConfirm && onConfirm && (
          <button style={{ ...S.btn, ...S.success }} onClick={() => onConfirm(commande)}>
            Confirmer la commande
          </button>
        )}
        {showReject && onReject && (
          <button style={{ ...S.btn, ...S.danger }} onClick={() => onReject(commande)}>
            Refuser
          </button>
        )}
        {showPrete && onMarkPrete && (
          <button style={{ ...S.btn, ...S.primary }} onClick={() => onMarkPrete(commande)}>
            Livraison prête (en route)
          </button>
        )}
        {onShowAudit && (
          <button style={{ ...S.btn, ...S.ghost }} onClick={() => onShowAudit(commande)}>
            Audit
          </button>
        )}
      </div>
    </div>
  );
}
