/**
 * LotsEstimator — estimatif du COÛT DE CONSTRUCTION ventilé par lots (corps
 * d'état), en fourchette min–max DH/m². Basé sur costRangesMA (barème validé).
 *
 * Utilisé par le simulateur (consultation) et l'éditeur de devis (onApply →
 * lignes = valeur médiane de chaque lot).
 */

import React, { useMemo, useState } from "react";
import { CC } from "../../theme/tokens";
import {
  COST_RANGES_MA, STANDING_LABELS, TYPE_LABELS, DISCLAIMER_LOTS,
  estimateLots, type Standing, type TypeProjet,
} from "./costRangesMA";

export type CalcLigne = { designation: string; quantite: number; unite: string; prixUnitaire: number };

const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA") + " DH";

export default function LotsEstimator({ onApply }: { onApply?: (lignes: CalcLigne[], info: { titre?: string; tva?: number }) => void }) {
  const [type, setType] = useState<TypeProjet>("HMB");
  const [standing, setStanding] = useState<Standing>("ECONOMIQUE");
  const [surface, setSurface] = useState(120);

  const standings = Object.keys(COST_RANGES_MA[type].ranges) as Standing[];
  // garde un standing valide quand on change de type
  const effStanding = standings.includes(standing) ? standing : standings[0];

  const res = useMemo(() => estimateLots(type, effStanding, surface), [type, effStanding, surface]);

  const apply = () => {
    if (!res || !onApply) return;
    const lignes: CalcLigne[] = res.lots.map((l) => ({
      designation: l.label,
      quantite: 1,
      unite: "Forfait",
      prixUnitaire: Math.round((l.min + l.max) / 2),
    }));
    onApply(lignes, {
      titre: `Estimatif construction — ${TYPE_LABELS[type]} · ${STANDING_LABELS[effStanding]} · ${surface} m²`,
      tva: 20,
    });
  };

  return (
    <div style={S.box}>
      <div style={S.eyebrow}>Coût de construction par lots (fourchette)</div>

      <div style={S.grid}>
        <F l="Type de projet">
          <select style={S.in} value={type} onChange={(e) => setType(e.target.value as TypeProjet)}>
            {(Object.keys(TYPE_LABELS) as TypeProjet[]).map((k) => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
          </select>
        </F>
        <F l="Standing">
          <select style={S.in} value={effStanding} onChange={(e) => setStanding(e.target.value as Standing)}>
            {standings.map((s) => <option key={s} value={s}>{STANDING_LABELS[s]}</option>)}
          </select>
        </F>
        <F l="Surface plancher (m²)">
          <input type="number" min="0" style={S.in} value={surface} onChange={(e) => setSurface(Number(e.target.value))} />
        </F>
      </div>

      {res && (
        <>
          <div style={S.totalBar}>
            <span>Coût travaux estimé ({STANDING_LABELS[effStanding]})</span>
            <b>{fmt(res.totalMin)} – {fmt(res.totalMax)}</b>
          </div>
          <div style={S.totalSub}>soit {res.rangeM2[0].toLocaleString("fr-MA")} – {res.rangeM2[1].toLocaleString("fr-MA")} DH/m²</div>

          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: "46%" }}>Lot</th>
              <th style={{ ...S.th, ...S.num, width: "12%" }}>Part</th>
              <th style={{ ...S.th, ...S.num, width: "21%" }}>Min</th>
              <th style={{ ...S.th, ...S.num, width: "21%" }}>Max</th>
            </tr></thead>
            <tbody>
              {res.lots.map((l) => (
                <tr key={l.code}>
                  <td style={S.td}>{l.label}</td>
                  <td style={{ ...S.td, ...S.num, color: CC.color.inkMid }}>{Math.round(l.pct * 100)}%</td>
                  <td style={{ ...S.td, ...S.num }}>{fmt(l.min)}</td>
                  <td style={{ ...S.td, ...S.num }}>{fmt(l.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {COST_RANGES_MA[type].note && <div style={S.note}>ℹ {COST_RANGES_MA[type].note}</div>}
          <div style={S.disclaimer}>{DISCLAIMER_LOTS}</div>

          {onApply && (
            <div style={S.applyRow}>
              <button onClick={apply} style={S.btnApply}>↧ Appliquer au devis</button>
              <span style={S.badge}>Prix appliqué : médiane de la fourchette estimative</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) {
  return <div><label style={S.lab}>{l}</label>{children}</div>;
}

const S: Record<string, React.CSSProperties> = {
  box: { background: CC.color.bgSoft, border: `1px solid ${CC.color.border}`, borderRadius: 8, padding: "16px 18px", marginBottom: 18 },
  eyebrow: { fontSize: 10, color: CC.color.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr", gap: "10px 16px" },
  lab: { display: "block", fontSize: 10, color: CC.color.inkMid, marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  in: { width: "100%", padding: "8px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },
  totalBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "10px 14px", background: CC.color.navy, color: CC.color.inkOnDark, borderRadius: 6, fontSize: 14 },
  totalSub: { fontSize: 12, color: CC.color.inkMid, marginTop: 4, textAlign: "right" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
  th: { fontSize: 10, color: CC.color.navy, textTransform: "uppercase", letterSpacing: "0.1em", padding: "8px 8px", textAlign: "left", borderBottom: `2px solid ${CC.color.navy}` },
  td: { padding: "7px 8px", borderBottom: `1px solid ${CC.color.border}`, fontSize: 13 },
  num: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  disclaimer: { marginTop: 12, fontSize: 11, color: CC.color.inkMid, fontStyle: "italic", lineHeight: 1.6, padding: "10px 12px", background: CC.color.bgRaised, borderRadius: 6, border: `1px solid ${CC.color.border}` },
  note: { marginTop: 12, fontSize: 12, color: CC.color.navy, lineHeight: 1.6, padding: "10px 12px", background: CC.color.orSoft, borderRadius: 6, borderLeft: `3px solid ${CC.color.or}` },
  applyRow: { marginTop: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  btnApply: { background: CC.color.navy, color: CC.color.inkOnDark, border: 0, padding: "9px 18px", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  badge: { fontSize: 11, color: CC.color.inkMid, background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, padding: "5px 10px", borderRadius: 12, fontStyle: "italic" },
};
