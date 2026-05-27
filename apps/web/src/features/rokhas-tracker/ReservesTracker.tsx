/**
 * ReservesTracker — checklist mobile-first des réserves à lever.
 *
 * Pour chaque réserve :
 *  - sévérité colorée (INFO / AVIS / RESERVE / BLOQUANT)
 *  - deadline + countdown
 *  - bouton "Téléverser preuve" (input file caché)
 *  - statut OUVERTE / EN_COURS / LEVEE / FORCLOSE
 *
 * Mobile : tap réserve → expand pour détail complet (article loi, etc.).
 */
import React, { useRef, useState } from "react";
import {
  leverReserve,
  uploadPreuve,
  type RokhasReserve,
  type RokhasInstanceView,
  type ReserveSeverite,
} from "./rokhas-tracker.api";

const C = {
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
  info: "#3b4a5c",
  infoBg: "#eef2f7",
};

function sevPalette(s: ReserveSeverite) {
  switch (s) {
    case "BLOQUANT": return { bg: C.dangerBg, fg: C.danger };
    case "RESERVE":  return { bg: C.warningBg, fg: C.warning };
    case "AVIS":     return { bg: C.infoBg, fg: C.info };
    case "INFO":
    default:         return { bg: C.infoBg, fg: C.inkMid };
  }
}

function countdown(r: RokhasReserve): { text: string; color: string; bg: string } {
  if (r.status === "LEVEE")    return { text: "Levée", color: C.success, bg: C.successBg };
  if (r.status === "FORCLOSE") return { text: "Forclose", color: C.danger, bg: C.dangerBg };
  const jr = r.joursRestants ?? null;
  if (jr === null) return { text: "Sans délai", color: C.inkMid, bg: C.infoBg };
  if (jr < 0)      return { text: `Dépassée (${Math.abs(jr)}j)`, color: C.danger, bg: C.dangerBg };
  if (jr <= 7)    return { text: `${jr}j restants`, color: C.danger, bg: C.dangerBg };
  if (jr <= 21)   return { text: `${jr}j restants`, color: C.warning, bg: C.warningBg };
  return { text: `${jr}j restants`, color: C.success, bg: C.successBg };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export default function ReservesTracker({
  instance,
  onChange,
}: {
  instance: RokhasInstanceView;
  onChange?: (next: RokhasInstanceView) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const reserves = instance.reserves;
  const total = reserves.length;
  const levees = reserves.filter((r) => r.status === "LEVEE").length;
  const ouvertes = reserves.filter((r) => r.status === "OUVERTE" || r.status === "EN_COURS").length;
  const forcloses = reserves.filter((r) => r.status === "FORCLOSE").length;

  const onPickPreuve = async (r: RokhasReserve, file: File) => {
    setBusyId(r.id);
    setError(null);
    try {
      const up = await uploadPreuve(file);
      const res = await leverReserve(instance.dossierId, r.id, { preuveDocId: up.url, preuveUrl: up.url });
      onChange?.(res.instance);
    } catch (e: any) {
      setError(e?.message || "Upload échoué");
    } finally {
      setBusyId(null);
    }
  };

  if (total === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
        <div style={{ fontWeight: 700, color: C.ink }}>Aucune réserve à lever</div>
        <div style={{ fontSize: 13, color: C.inkMid, marginTop: 4 }}>Votre permis n'a pas de réserves bloquantes.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Bandeau résumé */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12,
        marginBottom: 12, display: "flex", gap: 16, flexWrap: "wrap",
      }}>
        <Stat value={total} label="Total" color={C.ink} />
        <Stat value={levees} label="Levées" color={C.success} />
        <Stat value={ouvertes} label="À lever" color={C.warning} />
        <Stat value={forcloses} label="Forcloses" color={C.danger} />
      </div>

      {error && (
        <div style={{
          padding: 10, marginBottom: 10, background: C.dangerBg,
          border: `1px solid ${C.danger}`, borderRadius: 8, color: C.danger, fontSize: 13,
        }}>{error}</div>
      )}

      {reserves.map((r) => {
        const sp = sevPalette(r.severite);
        const cd = countdown(r);
        const isExpanded = expandedId === r.id;
        const isLevee = r.status === "LEVEE";
        const isForclose = r.status === "FORCLOSE";
        return (
          <div
            key={r.id}
            style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              borderLeft: `4px solid ${sp.fg}`,
              padding: 14, marginBottom: 10, opacity: isLevee ? 0.7 : 1,
            }}
          >
            <div
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
              role="button"
              tabIndex={0}
              style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  padding: "3px 8px", borderRadius: 999, background: sp.bg, color: sp.fg,
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                }}>{r.severite}</span>
                <span style={{
                  padding: "3px 10px", borderRadius: 999, background: cd.bg, color: cd.color,
                  fontSize: 12, fontWeight: 600,
                }}>{cd.text}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>
                {r.titre}
              </div>
              {!isExpanded && (
                <div style={{ fontSize: 13, color: C.inkMid }}>
                  Butoir : {formatDate(r.deadlineLevee)} · tap pour détails
                </div>
              )}
            </div>

            {isExpanded && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {r.description && (
                  <div style={{ fontSize: 14, color: C.inkMid, lineHeight: 1.4 }}>{r.description}</div>
                )}
                <div style={{ fontSize: 12, color: C.inkMid, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {r.articleLoi && <span>Article : <strong>{r.articleLoi}</strong></span>}
                  <span>Butoir : <strong>{formatDate(r.deadlineLevee)}</strong></span>
                  {r.leveeAt && <span>Levée le <strong>{formatDate(r.leveeAt)}</strong></span>}
                </div>
                {r.preuveUrl && (
                  <div style={{ fontSize: 13 }}>
                    Preuve : <a href={r.preuveUrl} target="_blank" rel="noreferrer" style={{ color: C.success, textDecoration: "underline" }}>voir le document</a>
                  </div>
                )}
                {!isLevee && !isForclose && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
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
                      onClick={(e) => { e.stopPropagation(); inputRefs.current[r.id]?.click(); }}
                      disabled={busyId === r.id}
                      style={{
                        background: C.primary, color: "#fff", border: "none", borderRadius: 8,
                        padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                        minHeight: 44, opacity: busyId === r.id ? 0.5 : 1,
                      }}
                    >{busyId === r.id ? "Envoi…" : "Téléverser preuve"}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: C.inkMid, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}
