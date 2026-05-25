/**
 * PV Commission Rokhas — Tracker de levée de réserves
 *
 * Checklist mobile-first des réserves d'un PV avec :
 *  - Sévérité colorée (mineure / majeure / bloquante)
 *  - Date butoir + countdown (jours restants ou forclose)
 *  - Bouton "Téléverser preuve" par réserve → upload + lever automatique
 *  - Statut visuel (OUVERTE / LEVÉE / FORCLOSE)
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getPv,
  leverReserve,
  uploadPreuve,
  pdfUrl,
  type PvCommission,
  type PvReserve,
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
};

function severiteColor(sev: PvReserve["severite"]) {
  if (sev === "BLOQUANTE") return COLORS.danger;
  if (sev === "MAJEURE") return COLORS.warning;
  return COLORS.inkMid;
}

function countdownLabel(r: PvReserve): { text: string; color: string } {
  if (r.status === "LEVEE") return { text: "Levée", color: COLORS.success };
  if (r.status === "FORCLOSE") return { text: "Forclose", color: COLORS.danger };
  if (r.joursRestants === null) return { text: "Pas de délai", color: COLORS.inkMid };
  if (r.joursRestants < 0) return { text: `Délai dépassé (${Math.abs(r.joursRestants)}j)`, color: COLORS.danger };
  if (r.joursRestants <= 7) return { text: `${r.joursRestants}j restants`, color: COLORS.danger };
  if (r.joursRestants <= 21) return { text: `${r.joursRestants}j restants`, color: COLORS.warning };
  return { text: `${r.joursRestants}j restants`, color: COLORS.inkMid };
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: COLORS.bg, padding: "20px 16px", fontFamily: "-apple-system, system-ui, sans-serif", color: COLORS.ink },
  container: { maxWidth: 820, margin: "0 auto" },
  back: { fontSize: 13, color: COLORS.primary, textDecoration: "none", marginBottom: 8, display: "inline-block" },
  h1: { fontSize: 22, fontWeight: 700, margin: "4px 0 6px" },
  sub: { fontSize: 14, color: COLORS.inkMid, margin: "0 0 16px" },
  summary: {
    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: 14, marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap" as const,
  },
  stat: { display: "flex", flexDirection: "column" as const, gap: 2 },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 12, color: COLORS.inkMid, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  reserveCard: {
    background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
    padding: 16, marginBottom: 12, display: "flex", flexDirection: "column" as const, gap: 10,
  },
  reserveHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" as const },
  reserveOrdre: { fontSize: 14, fontWeight: 700, color: COLORS.ink },
  badge: { display: "inline-block", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.4 },
  reserveTitre: { fontSize: 16, fontWeight: 600, margin: 0 },
  reserveDesc: { fontSize: 14, color: COLORS.inkMid, lineHeight: 1.4 },
  reserveMeta: { fontSize: 12, color: COLORS.inkMid, display: "flex", gap: 12, flexWrap: "wrap" as const },
  countdownPill: { padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 },
  actions: { display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" as const },
  btnUpload: {
    background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    minHeight: 44,
  },
  btnUploadDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnSecondary: {
    background: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.primary}`,
    borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
    minHeight: 44, textDecoration: "none", display: "inline-block",
  },
  preuveLink: { fontSize: 13, color: COLORS.success, textDecoration: "underline" },
  loading: { padding: 40, textAlign: "center" as const, color: COLORS.inkMid, fontStyle: "italic" as const },
  empty: { padding: 40, textAlign: "center" as const, color: COLORS.inkMid },
  error: { padding: 12, background: COLORS.dangerBg, border: `1px solid ${COLORS.danger}`, borderRadius: 8, color: COLORS.danger, marginBottom: 12, fontSize: 14 },
};

export default function PvCommissionReservesTracker() {
  const { dossierId = "", pvId = "" } = useParams<{ dossierId: string; pvId: string }>();
  const [pv, setPv] = useState<PvCommission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const reload = useCallback(() => {
    getPv(pvId).then((r) => setPv(r.pv)).catch((e: any) => setError(e?.message || "Erreur"));
  }, [pvId]);

  useEffect(() => { if (pvId) reload(); }, [pvId, reload]);

  const onPickPreuve = async (reserve: PvReserve, file: File) => {
    if (!pv) return;
    setBusyId(reserve.id); setError(null);
    try {
      const up = await uploadPreuve(file);
      await leverReserve(pv.id, reserve.id, { preuveUrl: up.url });
      reload();
    } catch (e: any) {
      setError(e?.message || "Erreur upload");
    } finally {
      setBusyId(null);
    }
  };

  if (error && !pv) return <div style={S.page}><div style={S.container}><div style={S.error}>⚠ {error}</div></div></div>;
  if (!pv) return <div style={S.page}><div style={S.container}><div style={S.loading}>Chargement…</div></div></div>;

  const total = pv.reserves.length;
  const levees = pv.reserves.filter((r) => r.status === "LEVEE").length;
  const ouvertes = pv.reserves.filter((r) => r.status !== "LEVEE" && r.status !== "FORCLOSE").length;
  const forcloses = pv.reserves.filter((r) => r.status === "FORCLOSE").length;

  return (
    <div style={S.page}>
      <div style={S.container}>
        <Link to={`/p2/dossier/${dossierId}/pv-commission`} style={S.back}>← Retour aux PVs</Link>
        <h1 style={S.h1}>Suivi des réserves</h1>
        <p style={S.sub}>
          PV {pv.id.slice(0, 12)}
          {pv.dateCommission && ` · Commission du ${new Date(pv.dateCommission).toLocaleDateString("fr-FR")}`}
          {pv.communeName && ` · ${pv.communeName}`}
        </p>

        <div style={S.summary}>
          <div style={S.stat}>
            <div style={S.statValue}>{total}</div>
            <div style={S.statLabel}>Total</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: COLORS.success }}>{levees}</div>
            <div style={S.statLabel}>Levées</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: COLORS.warning }}>{ouvertes}</div>
            <div style={S.statLabel}>À lever</div>
          </div>
          <div style={S.stat}>
            <div style={{ ...S.statValue, color: COLORS.danger }}>{forcloses}</div>
            <div style={S.statLabel}>Forcloses</div>
          </div>
          <div style={{ ...S.stat, marginLeft: "auto" }}>
            <a href={pdfUrl(pv.id)} target="_blank" rel="noreferrer" style={S.btnSecondary}>
              Voir le PDF
            </a>
          </div>
        </div>

        {error && <div style={S.error}>⚠ {error}</div>}

        {total === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Aucune réserve sur ce PV</div>
          </div>
        )}

        {pv.reserves.map((r) => {
          const cd = countdownLabel(r);
          const sevColor = severiteColor(r.severite);
          const isLevee = r.status === "LEVEE";
          const isForclose = r.status === "FORCLOSE";
          return (
            <div key={r.id} style={{ ...S.reserveCard, borderLeft: `4px solid ${sevColor}`, opacity: isLevee ? 0.7 : 1 }}>
              <div style={S.reserveHeader}>
                <div style={S.reserveOrdre}>Réserve n°{r.ordre}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ ...S.badge, background: sevColor === COLORS.danger ? COLORS.dangerBg : sevColor === COLORS.warning ? COLORS.warningBg : "#f0f2f5", color: sevColor }}>
                    {r.severite}
                  </span>
                  <span style={{ ...S.countdownPill, background: cd.color === COLORS.success ? COLORS.successBg : cd.color === COLORS.danger ? COLORS.dangerBg : COLORS.warningBg, color: cd.color }}>
                    {cd.text}
                  </span>
                </div>
              </div>
              <h3 style={S.reserveTitre}>{r.titre}</h3>
              <p style={S.reserveDesc}>{r.description}</p>
              <div style={S.reserveMeta}>
                {r.articleLoi && <span>Article : <strong>{r.articleLoi}</strong></span>}
                {r.deadlineLevee && <span>Butoir : {new Date(r.deadlineLevee).toLocaleDateString("fr-FR")}</span>}
                {r.leveeAt && <span>Levée le {new Date(r.leveeAt).toLocaleDateString("fr-FR")}</span>}
              </div>
              {r.preuveUrl && (
                <div>
                  Preuve : <a href={r.preuveUrl} target="_blank" rel="noreferrer" style={S.preuveLink}>voir le document</a>
                </div>
              )}
              {!isLevee && !isForclose && (
                <div style={S.actions}>
                  <input
                    ref={(el) => { inputRefs.current[r.id] = el; }}
                    type="file"
                    accept="application/pdf,image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickPreuve(r, f);
                    }}
                  />
                  <button
                    onClick={() => inputRefs.current[r.id]?.click()}
                    disabled={busyId === r.id}
                    style={{ ...S.btnUpload, ...(busyId === r.id ? S.btnUploadDisabled : {}) }}
                  >
                    {busyId === r.id ? "Envoi…" : "Téléverser preuve"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
