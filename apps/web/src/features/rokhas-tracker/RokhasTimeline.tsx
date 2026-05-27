/**
 * RokhasTimeline — timeline verticale des étapes d'instruction Rokhas.
 *
 * Chaque étape :
 *  - icône statut (done / en cours / futur)
 *  - libellé + date (ou "en attente")
 *  - durée écoulée depuis l'étape précédente
 *
 * Mobile-first : full-width, gap généreux.
 */
import React from "react";
import type { RokhasEvent, RokhasEventType, RokhasInstanceView } from "./rokhas-tracker.api";

type Step = {
  type: RokhasEventType | "INSTRUCTION";
  label: string;
  optional?: boolean;
};

/** Étapes "officielles" du circuit Rokhas Maroc. */
const STEPS: Step[] = [
  { type: "DEPOT",         label: "Dépôt en commune" },
  { type: "ACCUSE",        label: "Accusé de réception" },
  { type: "AVIS_SERVICES", label: "Avis services techniques", optional: true },
  { type: "AVIS_AU",       label: "Avis Agence Urbaine", optional: true },
  { type: "COMMISSION",    label: "Commission communale" },
  { type: "VOTE",          label: "Vote de la commission" },
  { type: "DECISION",      label: "Décision" },
  { type: "DELIVRANCE",    label: "Délivrance de l'autorisation" },
];

const C = {
  done: "#0a7f3a",
  doneBg: "#e7f5ec",
  current: "#0d4f8c",
  currentBg: "#e6efff",
  future: "#9aa4b1",
  futureBg: "#f0f2f5",
  border: "#e3e7ec",
  ink: "#11181f",
  inkMid: "#5a6573",
  card: "#fff",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function firstEventOfType(events: RokhasEvent[], t: RokhasEventType): RokhasEvent | undefined {
  return events.find((e) => e.type === t);
}

export default function RokhasTimeline({ instance }: { instance: RokhasInstanceView }) {
  // Map étapes → événement réel (si trouvé)
  const stepResults = STEPS.map((s) => {
    if (s.type === "INSTRUCTION") return { step: s, event: undefined as RokhasEvent | undefined };
    return { step: s, event: firstEventOfType(instance.events, s.type as RokhasEventType) };
  });

  // Étape courante = première sans event après la dernière complétée
  const lastDoneIdx = (() => {
    let idx = -1;
    stepResults.forEach((s, i) => { if (s.event) idx = i; });
    return idx;
  })();
  const currentIdx = lastDoneIdx + 1 < stepResults.length ? lastDoneIdx + 1 : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
      {stepResults.map((sr, i) => {
        const isDone = !!sr.event;
        const isCurrent = i === currentIdx;
        const isLast = i === stepResults.length - 1;
        const color = isDone ? C.done : isCurrent ? C.current : C.future;
        const bg = isDone ? C.doneBg : isCurrent ? C.currentBg : C.futureBg;
        const icon = isDone ? "✓" : isCurrent ? "•" : "○";

        // Durée depuis l'étape précédente complétée
        let dureeNote: string | null = null;
        if (isDone && i > 0) {
          const prev = [...stepResults.slice(0, i)].reverse().find((p) => !!p.event);
          if (prev?.event && sr.event) {
            const d = diffDays(prev.event.date, sr.event.date);
            if (d >= 0) dureeNote = `+${d}j depuis ${prev.step.label.toLowerCase()}`;
          }
        }

        return (
          <div key={`${sr.step.type}-${i}`} style={{ display: "flex", gap: 14, alignItems: "stretch", minHeight: 64 }}>
            {/* Rail gauche (icône + ligne verticale) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32 }}>
              <div
                aria-hidden
                style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: bg, color, border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, flexShrink: 0,
                }}
              >{icon}</div>
              {!isLast && (
                <div style={{ flex: 1, width: 2, background: isDone ? C.done : C.border, marginTop: 4 }} />
              )}
            </div>
            {/* Contenu */}
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: isDone || isCurrent ? C.ink : C.inkMid,
                display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
              }}>
                {sr.step.label}
                {sr.step.optional && !isDone && (
                  <span style={{ fontSize: 10, color: C.inkMid, fontWeight: 600, padding: "1px 6px", border: `1px solid ${C.border}`, borderRadius: 4 }}>
                    optionnel
                  </span>
                )}
                {isCurrent && (
                  <span style={{ fontSize: 11, color: C.current, fontWeight: 700, padding: "2px 6px", background: C.currentBg, borderRadius: 4 }}>
                    EN COURS
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, marginTop: 2 }}>
                {isDone ? formatDate(sr.event!.date) : isCurrent ? "En attente…" : "À venir"}
                {dureeNote && <span style={{ marginLeft: 8, opacity: 0.8 }}>· {dureeNote}</span>}
              </div>
              {/* Payload utile (référence rokhas, etc) */}
              {isDone && sr.event?.payload?.refRokhasCommune && (
                <div style={{ fontSize: 12, color: C.inkMid, marginTop: 4 }}>
                  Réf. commune : <strong>{sr.event.payload.refRokhasCommune}</strong>
                </div>
              )}
              {sr.step.type === "DECISION" && instance.decision && (
                <div style={{ fontSize: 13, color: color, marginTop: 4, fontWeight: 600 }}>
                  {labelDecision(instance.decision.type)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function labelDecision(t: string): string {
  switch (t) {
    case "FAVORABLE": return "Favorable";
    case "FAVORABLE_AVEC_RESERVES": return "Favorable avec réserves";
    case "DEFAVORABLE": return "Défavorable";
    case "AJOURNE": return "Ajournée";
    default: return t;
  }
}
