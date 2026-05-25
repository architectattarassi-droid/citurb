/**
 * PV Commission Rokhas — Vue d'ensemble des décisions
 *
 * Liste tous les PVs d'un dossier sous forme de cartes colorées :
 *  - vert = FAVORABLE
 *  - orange = FAVORABLE_AVEC_RESERVES / AJOURNE
 *  - rouge = DEFAVORABLE
 *  - gris = pas encore parsé
 *
 * Chaque carte expose : date commission, commune, nb réserves, lien PDF,
 * et bouton "Gérer réserves" si applicable.
 */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  listPvsByDossier,
  pdfUrl,
  type PvCommission,
  type DecisionCommission,
} from "./pv-commission.api";

const COLORS = {
  bg: "#f7f8fa",
  card: "#ffffff",
  border: "#e3e7ec",
  ink: "#11181f",
  inkMid: "#5a6573",
  primary: "#0d4f8c",
  success: "#0a7f3a",
  successBg: "#e7f5ec",
  warning: "#b76e00",
  warningBg: "#fff5e6",
  danger: "#b91c1c",
  dangerBg: "#fde8e8",
  neutral: "#6b7280",
  neutralBg: "#f0f2f5",
};

function decisionColors(d: DecisionCommission | null) {
  switch (d) {
    case "FAVORABLE":               return { bg: COLORS.successBg, fg: COLORS.success, border: COLORS.success };
    case "FAVORABLE_AVEC_RESERVES": return { bg: COLORS.warningBg, fg: COLORS.warning, border: COLORS.warning };
    case "AJOURNE":                 return { bg: COLORS.warningBg, fg: COLORS.warning, border: COLORS.warning };
    case "DEFAVORABLE":             return { bg: COLORS.dangerBg,  fg: COLORS.danger,  border: COLORS.danger };
    default:                        return { bg: COLORS.neutralBg, fg: COLORS.neutral, border: COLORS.border };
  }
}

const DECISION_LABEL: Record<string, string> = {
  FAVORABLE: "Favorable",
  FAVORABLE_AVEC_RESERVES: "Favorable avec réserves",
  DEFAVORABLE: "Défavorable",
  AJOURNE: "Ajourné",
};

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: COLORS.bg, padding: "20px 16px", fontFamily: "-apple-system, system-ui, sans-serif", color: COLORS.ink },
  container: { maxWidth: 960, margin: "0 auto" },
  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap" as const, gap: 10 },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  sub: { fontSize: 14, color: COLORS.inkMid, margin: "4px 0 0" },
  btnPrimary: {
    background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44,
    textDecoration: "none", display: "inline-block",
  },
  grid: { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" },
  card: {
    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: 16, display: "flex", flexDirection: "column" as const, gap: 10,
  },
  badge: {
    display: "inline-block", padding: "4px 10px", borderRadius: 999,
    fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  cardRow: { fontSize: 13, color: COLORS.inkMid },
  cardActions: { display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" as const },
  btnGhost: {
    background: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.primary}`,
    borderRadius: 6, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer",
    textDecoration: "none", minHeight: 36,
  },
  empty: { textAlign: "center" as const, padding: 60, color: COLORS.inkMid },
  loading: { padding: 40, textAlign: "center" as const, color: COLORS.inkMid, fontStyle: "italic" as const },
  error: { padding: 20, background: COLORS.dangerBg, border: `1px solid ${COLORS.danger}`, borderRadius: 8, color: COLORS.danger },
};

export default function PvCommissionDecisions() {
  const { dossierId = "" } = useParams<{ dossierId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<PvCommission[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dossierId) return;
    listPvsByDossier(dossierId)
      .then((r) => setItems(r.items))
      .catch((e: any) => setError(e?.message || "Erreur chargement"));
  }, [dossierId]);

  return (
    <div style={S.page}>
      <div style={S.container}>
        <div style={S.headerRow}>
          <div>
            <h1 style={S.h1}>Décisions de commission Rokhas</h1>
            <p style={S.sub}>Dossier <code>{dossierId}</code></p>
          </div>
          <Link to={`/p2/dossier/${dossierId}/pv-commission/upload`} style={S.btnPrimary}>
            + Uploader un PV
          </Link>
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}
        {!error && items === null && <div style={S.loading}>Chargement…</div>}
        {items !== null && items.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Aucun PV pour ce dossier</div>
            <div style={{ fontSize: 14 }}>Cliquez sur « Uploader un PV » pour commencer.</div>
          </div>
        )}

        {items && items.length > 0 && (
          <div style={S.grid}>
            {items.map((pv) => {
              const c = decisionColors(pv.decision);
              const reservesOuvertes = pv.reserves.filter((r) => r.status !== "LEVEE" && r.status !== "FORCLOSE").length;
              const reservesForcloses = pv.reserves.filter((r) => r.status === "FORCLOSE").length;
              return (
                <div key={pv.id} style={{ ...S.card, borderLeft: `4px solid ${c.border}` }}>
                  <div>
                    <span style={{ ...S.badge, background: c.bg, color: c.fg }}>
                      {pv.decision ? DECISION_LABEL[pv.decision] : "Non parsé"}
                    </span>
                  </div>
                  <h3 style={S.cardTitle}>
                    {pv.dateCommission
                      ? `Commission du ${new Date(pv.dateCommission).toLocaleDateString("fr-FR")}`
                      : `PV ${pv.id.slice(0, 12)}`}
                  </h3>
                  <div style={S.cardRow}>
                    {pv.communeName ? `Commune : ${pv.communeName}` : "Commune : —"}
                  </div>
                  {pv.rokhasReference && (
                    <div style={S.cardRow}>Réf. Rokhas : <code>{pv.rokhasReference}</code></div>
                  )}
                  {pv.reserves.length > 0 && (
                    <div style={S.cardRow}>
                      Réserves : <strong>{pv.reserves.length}</strong>
                      {reservesOuvertes > 0 && <span style={{ color: COLORS.warning }}> · {reservesOuvertes} à lever</span>}
                      {reservesForcloses > 0 && <span style={{ color: COLORS.danger }}> · {reservesForcloses} forcloses</span>}
                    </div>
                  )}
                  {pv.motifsRefus.length > 0 && (
                    <div style={S.cardRow}>
                      Motifs de refus : <strong>{pv.motifsRefus.length}</strong>
                    </div>
                  )}
                  <div style={S.cardActions}>
                    {pv.reserves.length > 0 && (
                      <button
                        onClick={() => navigate(`/p2/dossier/${dossierId}/pv-commission/${pv.id}/reserves`)}
                        style={S.btnGhost}
                      >
                        Réserves
                      </button>
                    )}
                    <a href={pdfUrl(pv.id)} target="_blank" rel="noreferrer" style={S.btnGhost}>
                      PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
