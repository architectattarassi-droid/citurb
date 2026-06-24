/**
 * LotsEstimator — estimatif du COÛT DE CONSTRUCTION ventilé par lots (corps
 * d'état), en fourchette min–max DH/m². Basé sur costRangesMA (barème validé).
 *
 * Utilisé par le simulateur (consultation) et l'éditeur de devis (onApply →
 * lignes = valeur médiane de chaque lot).
 */

import React, { useMemo, useState } from "react";
import { CC } from "../../theme/tokens";
import SurfaceHelper from "./SurfaceHelper";
import {
  COST_RANGES_MA, STANDING_LABELS, TYPE_LABELS, DISCLAIMER_LOTS, INTERVENANTS_DEFAULT,
  estimateLots, type Standing, type TypeProjet, type Intervenant,
} from "./costRangesMA";

export type CalcLigne = { designation: string; quantite: number; unite: string; prixUnitaire: number };

const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA") + " DH";

export default function LotsEstimator({ onApply }: { onApply?: (lignes: CalcLigne[], info: { titre?: string; tva?: number }) => void }) {
  const [type, setType] = useState<TypeProjet>("HMB");
  const [standing, setStanding] = useState<Standing>("ECONOMIQUE");
  const [surface, setSurface] = useState(120);
  const [interv, setInterv] = useState<Intervenant[]>(INTERVENANTS_DEFAULT.map((i) => ({ ...i })));

  const standings = Object.keys(COST_RANGES_MA[type].ranges) as Standing[];
  // garde un standing valide quand on change de type
  const effStanding = standings.includes(standing) ? standing : standings[0];

  const res = useMemo(() => estimateLots(type, effStanding, surface), [type, effStanding, surface]);

  // Base honoraires = coût de construction médian (milieu de la fourchette).
  const baseCout = res ? Math.round((res.totalMin + res.totalMax) / 2) : 0;
  const honoraires = interv.map((i) => ({ ...i, montant: Math.round(i.rate * baseCout) }));
  const honoTotal = honoraires.reduce((s, h) => s + h.montant, 0);
  const setRate = (code: string, pct: number) =>
    setInterv((arr) => arr.map((i) => (i.code === code ? { ...i, rate: (Number(pct) || 0) / 100 } : i)));

  const apply = () => {
    if (!res || !onApply) return;
    const lignes: CalcLigne[] = res.lots.map((l) => ({
      designation: l.label, quantite: 1, unite: "Forfait", prixUnitaire: Math.round((l.min + l.max) / 2),
    }));
    onApply(lignes, {
      titre: `Estimatif construction — ${TYPE_LABELS[type]} · ${STANDING_LABELS[effStanding]} · ${surface} m²`,
      tva: 20,
    });
  };

  const applyHonoraires = () => {
    if (!onApply || baseCout <= 0) return;
    const lignes: CalcLigne[] = honoraires
      .filter((h) => h.montant > 0)
      .map((h) => ({ designation: `${h.label} (${(h.rate * 100).toFixed(2)}% du coût travaux)`, quantite: 1, unite: "Forfait", prixUnitaire: h.montant }));
    onApply(lignes, { titre: `Honoraires intervenants — ${TYPE_LABELS[type]} · ${surface} m²`, tva: 20 });
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
        <SurfaceHelper value={surface} onChange={(m2) => setSurface(m2)} />
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
              <button onClick={apply} style={S.btnApply}>↧ Appliquer les lots au devis</button>
              <span style={S.badge}>Prix appliqué : médiane de la fourchette estimative</span>
            </div>
          )}

          {/* ── Honoraires intervenants (calculés sur le coût de construction) ── */}
          <div style={S.honoHead}>Honoraires des intervenants <span style={{ fontWeight: 400, color: CC.color.inkMid }}>· base coût travaux médian {fmt(baseCout)}</span></div>
          <table style={S.table}>
            <thead><tr>
              <th style={{ ...S.th, width: "58%" }}>Intervenant</th>
              <th style={{ ...S.th, ...S.num, width: "18%" }}>Taux %</th>
              <th style={{ ...S.th, ...S.num, width: "24%" }}>Montant</th>
            </tr></thead>
            <tbody>
              {honoraires.map((h) => (
                <tr key={h.code}>
                  <td style={S.td}>{h.label}</td>
                  <td style={{ ...S.td, ...S.num }}>
                    <input type="number" min="0" step="0.1" value={+(h.rate * 100).toFixed(2)} onChange={(e) => setRate(h.code, Number(e.target.value))} style={S.rateInput} />
                  </td>
                  <td style={{ ...S.td, ...S.num }}>{fmt(h.montant)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...S.td, fontWeight: 700, color: CC.color.navy }}>Total honoraires</td>
                <td style={{ ...S.td, ...S.num, color: CC.color.inkMid }}>{(honoTotal && baseCout ? (honoTotal / baseCout) * 100 : 0).toFixed(1)}%</td>
                <td style={{ ...S.td, ...S.num, fontWeight: 700, color: CC.color.navy }}>{fmt(honoTotal)}</td>
              </tr>
            </tbody>
          </table>
          <div style={S.honoNote}>Architecte 5% et BET 2% reprennent le moteur P1/P2. Géotechnicien, topographe, contrôle et laboratoire sont indicatifs — ajuste les taux ci-dessus.</div>

          {onApply && (
            <div style={S.applyRow}>
              <button onClick={applyHonoraires} style={{ ...S.btnApply, background: CC.color.or }}>↧ Appliquer les honoraires au devis</button>
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
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" },
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
  honoHead: { marginTop: 22, paddingTop: 14, borderTop: `2px solid ${CC.color.border}`, fontSize: 13, fontWeight: 700, color: CC.color.navy },
  honoNote: { marginTop: 8, fontSize: 11, color: CC.color.inkMid, fontStyle: "italic", lineHeight: 1.6 },
  rateInput: { width: 70, padding: "5px 8px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, textAlign: "right", background: CC.color.bgRaised, color: CC.color.ink },
};
