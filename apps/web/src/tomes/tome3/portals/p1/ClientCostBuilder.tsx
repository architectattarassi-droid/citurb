/**
 * ClientCostBuilder — parcours CLIENT d'estimation du budget de construction.
 *
 * Deux expériences :
 *   1) « Standing global » — le client choisit un niveau (Économique → Premium)
 *      et obtient un coût de construction (fourchette + valeur retenue).
 *   2) « Composer mon projet » — le client personnalise lot par lot et choisit
 *      des FINITIONS présentées en vignettes (placeholders) avec leur prix.
 *
 * Réutilise le moteur validé costRangesMA (estimateLots) — aucune duplication.
 * Le budget retenu remonte via onApply() pour alimenter la suite (packs/honoraires).
 */

import React, { useMemo, useState } from "react";
import {
  COST_RANGES_MA, STANDING_LABELS, TYPE_LABELS, DISCLAIMER_LOTS,
  estimateLots, type Standing, type TypeProjet,
} from "../../../../command-center/modules/dossiers/costRangesMA";
import { FINITIONS, TIER_LABELS, defaultFinition } from "./finitionsCatalog";

const NAVY = "#0B1B3A";
const GOLD = "#C9A227";
const fmt = (n: number) => Math.round(n).toLocaleString("fr-MA") + " DH";
const median = (l: { min: number; max: number }) => Math.round((l.min + l.max) / 2);

type Mode = "STANDING" | "COMPOSE";

export type CostResult = {
  type: TypeProjet;
  mode: Mode;
  standing: Standing;
  surfaceM2: number;
  totalMAD: number;
  finitions?: Record<string, string>;
};

const TYPE_FROM_P1: Record<string, TypeProjet> = {
  villa: "VIL",
  immeuble: "IMM",
  renovation: "AME",
  mixte: "MIX",
};

export default function ClientCostBuilder({
  surfaceM2,
  projectTypeHint,
  onApply,
  appliedTotal,
}: {
  surfaceM2: number | null;
  projectTypeHint?: string;
  onApply?: (r: CostResult) => void;
  appliedTotal?: number | null;
}) {
  const defaultType = TYPE_FROM_P1[String(projectTypeHint || "").toLowerCase()] || "VIL";
  const [type, setType] = useState<TypeProjet>(defaultType);
  const [surface, setSurface] = useState<number>(surfaceM2 && surfaceM2 > 0 ? Math.round(surfaceM2) : 150);
  const [mode, setMode] = useState<Mode>("STANDING");

  const standings = Object.keys(COST_RANGES_MA[type].ranges) as Standing[];
  const [standing, setStanding] = useState<Standing>(standings.includes("STANDARD") ? "STANDARD" : standings[0]);
  const effStanding = standings.includes(standing) ? standing : standings[0];

  // Mode COMPOSE : standing de base (gros œuvre) + finitions par lot.
  const [baseStanding, setBaseStanding] = useState<Standing>(standings.includes("STANDARD") ? "STANDARD" : standings[0]);
  const effBase = standings.includes(baseStanding) ? baseStanding : standings[0];
  const [finSel, setFinSel] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    Object.keys(FINITIONS).forEach((lot) => { const d = defaultFinition(lot); if (d) init[lot] = d.id; });
    return init;
  });

  const resStanding = useMemo(() => estimateLots(type, effStanding, surface), [type, effStanding, surface]);
  const resBase = useMemo(() => estimateLots(type, effBase, surface), [type, effBase, surface]);

  // Coût en mode COMPOSE : lot médian, finition = médiane × facteur.
  const composeLots = useMemo(() => {
    if (!resBase) return [];
    return resBase.lots.map((l) => {
      const opts = FINITIONS[l.code];
      if (opts && opts.length) {
        const sel = opts.find((o) => o.id === finSel[l.code]) || opts[0];
        return { ...l, price: Math.round(median(l) * sel.factor), finition: sel };
      }
      return { ...l, price: median(l), finition: null as any };
    });
  }, [resBase, finSel]);

  const composeTotal = composeLots.reduce((s, l) => s + l.price, 0);
  const standingTotal = resStanding ? resStanding.lots.reduce((s, l) => s + median(l), 0) : 0;
  const currentTotal = mode === "STANDING" ? standingTotal : composeTotal;

  const apply = () => {
    if (!currentTotal || !onApply) return;
    onApply({
      type, mode, surfaceM2: surface, totalMAD: currentTotal,
      standing: mode === "STANDING" ? effStanding : effBase,
      finitions: mode === "COMPOSE" ? finSel : undefined,
    });
  };

  return (
    <div style={S.card}>
      <div style={S.head}>
        <div>
          <div style={S.kicker}>Étape budget</div>
          <div style={S.title}>Définissez votre budget de construction</div>
          <div style={S.sub}>Choisissez un standing global, ou composez votre projet lot par lot avec les finitions.</div>
        </div>
      </div>

      {/* Type + surface */}
      <div style={S.row}>
        <label style={S.field}>
          <span style={S.lbl}>Type de projet</span>
          <select value={type} onChange={(e) => setType(e.target.value as TypeProjet)} style={S.input}>
            {(Object.keys(COST_RANGES_MA) as TypeProjet[]).map((k) => (
              <option key={k} value={k}>{TYPE_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label style={S.field}>
          <span style={S.lbl}>Surface plancher (m²)</span>
          <input type="number" min={1} value={surface} onChange={(e) => setSurface(Math.max(0, Number(e.target.value) || 0))} style={S.input} />
        </label>
      </div>

      {/* Mode tabs */}
      <div style={S.tabs}>
        <button type="button" onClick={() => setMode("STANDING")} style={{ ...S.tab, ...(mode === "STANDING" ? S.tabOn : {}) }}>
          Choisir un standing
        </button>
        <button type="button" onClick={() => setMode("COMPOSE")} style={{ ...S.tab, ...(mode === "COMPOSE" ? S.tabOn : {}) }}>
          Composer mon projet
        </button>
      </div>

      {mode === "STANDING" ? (
        <div style={S.standingGrid}>
          {standings.map((st) => {
            const r = estimateLots(type, st, surface);
            const med = r ? r.lots.reduce((s, l) => s + median(l), 0) : 0;
            const on = st === effStanding;
            return (
              <button key={st} type="button" onClick={() => setStanding(st)} style={{ ...S.stCard, ...(on ? S.stCardOn : {}) }}>
                <div style={S.stName}>{STANDING_LABELS[st]}</div>
                <div style={S.stRange}>{r ? `${(r.rangeM2[0]).toLocaleString("fr-MA")}–${(r.rangeM2[1]).toLocaleString("fr-MA")} DH/m²` : "—"}</div>
                <div style={S.stTotal}>{fmt(med)}</div>
                {on && <div style={S.stPick}>✓ Sélectionné</div>}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ ...S.row, marginBottom: 6 }}>
            <label style={S.field}>
              <span style={S.lbl}>Niveau de base (gros œuvre)</span>
              <select value={baseStanding} onChange={(e) => setBaseStanding(e.target.value as Standing)} style={S.input}>
                {standings.map((st) => <option key={st} value={st}>{STANDING_LABELS[st]}</option>)}
              </select>
            </label>
            <div style={{ ...S.field, justifyContent: "flex-end" }}>
              <span style={S.lbl}>&nbsp;</span>
              <div style={S.hint}>Les lots de finition se personnalisent ci-dessous ; les autres suivent le niveau de base.</div>
            </div>
          </div>

          <div style={S.lots}>
            {composeLots.map((l) => {
              const opts = FINITIONS[l.code];
              return (
                <div key={l.code} style={S.lotRow}>
                  <div style={S.lotHead}>
                    <div style={S.lotName}>{l.label}</div>
                    <div style={S.lotPrice}>{fmt(l.price)}</div>
                  </div>
                  {opts && opts.length > 0 && (
                    <div style={S.finRow}>
                      {opts.map((o) => {
                        const on = (finSel[l.code] || "") === o.id;
                        return (
                          <button key={o.id} type="button" onClick={() => setFinSel((m) => ({ ...m, [l.code]: o.id }))} style={{ ...S.finCard, ...(on ? S.finCardOn : {}) }}>
                            <div style={{ ...S.finSwatch, background: o.img ? `center/cover url(${o.img})` : o.swatch }} />
                            <div style={S.finLabel}>{o.label}</div>
                            <div style={S.finTier}>{TIER_LABELS[o.tier]}</div>
                            <div style={S.finPrice}>{fmt(median(l) * o.factor)}</div>
                            {on && <div style={S.finPick}>✓</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total + apply */}
      <div style={S.totalBar}>
        <div>
          <div style={S.totalLbl}>Coût de construction estimé</div>
          <div style={S.totalVal}>{fmt(currentTotal)}</div>
          <div style={S.totalSub}>≈ {surface > 0 ? fmt(currentTotal / surface).replace(" DH", " DH/m²") : "—"} · hors honoraires, terrain & taxes</div>
        </div>
        <button type="button" onClick={apply} disabled={!currentTotal} style={{ ...S.applyBtn, ...(currentTotal ? {} : S.applyOff) }}>
          {appliedTotal && Math.round(appliedTotal) === Math.round(currentTotal) ? "✓ Budget défini" : "Définir comme mon budget"}
        </button>
      </div>

      <div style={S.disclaimer}>{DISCLAIMER_LOTS}</div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: { marginTop: 18, padding: 22, borderRadius: 18, background: "#fff", border: "1px solid rgba(201,162,39,0.28)", boxShadow: "0 14px 40px rgba(11,27,58,0.07)" },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 },
  kicker: { fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: GOLD },
  title: { fontFamily: '"Playfair Display", serif', fontSize: 22, fontWeight: 700, color: NAVY, margin: "4px 0 4px" },
  sub: { fontSize: 13.5, color: "rgba(11,27,58,0.65)", lineHeight: 1.5 },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  lbl: { fontSize: 12, fontWeight: 800, color: "rgba(11,27,58,0.7)", letterSpacing: "0.02em" },
  hint: { fontSize: 12, color: "rgba(11,27,58,0.55)", lineHeight: 1.45 },
  input: { padding: "11px 13px", borderRadius: 12, border: "1px solid rgba(11,27,58,0.18)", fontSize: 14, background: "#fff", color: NAVY, outline: "none" },
  tabs: { display: "flex", gap: 8, margin: "6px 0 16px", background: "rgba(11,27,58,0.05)", padding: 5, borderRadius: 14 },
  tab: { flex: 1, padding: "11px 12px", borderRadius: 10, border: "none", background: "transparent", color: "rgba(11,27,58,0.6)", fontWeight: 800, fontSize: 13.5, cursor: "pointer" },
  tabOn: { background: "#fff", color: NAVY, boxShadow: "0 2px 8px rgba(11,27,58,0.10)" },
  standingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 },
  stCard: { textAlign: "left", padding: 16, borderRadius: 14, border: "1px solid rgba(11,27,58,0.14)", background: "#fff", cursor: "pointer", position: "relative" },
  stCardOn: { borderColor: GOLD, background: "rgba(201,162,39,0.07)", boxShadow: "0 6px 18px rgba(201,162,39,0.18)" },
  stName: { fontWeight: 800, color: NAVY, fontSize: 15 },
  stRange: { fontSize: 12, color: "rgba(11,27,58,0.55)", margin: "4px 0 8px" },
  stTotal: { fontSize: 18, fontWeight: 900, color: NAVY },
  stPick: { marginTop: 8, fontSize: 12, fontWeight: 800, color: GOLD },
  lots: { display: "grid", gap: 12, marginTop: 6 },
  lotRow: { padding: 12, borderRadius: 14, border: "1px solid rgba(11,27,58,0.10)", background: "rgba(11,27,58,0.015)" },
  lotHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  lotName: { fontWeight: 800, color: NAVY, fontSize: 14 },
  lotPrice: { fontWeight: 900, color: NAVY, fontSize: 14, whiteSpace: "nowrap" },
  finRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 8, marginTop: 10 },
  finCard: { textAlign: "left", padding: 8, borderRadius: 12, border: "1px solid rgba(11,27,58,0.14)", background: "#fff", cursor: "pointer", position: "relative" },
  finCardOn: { borderColor: GOLD, boxShadow: "0 4px 12px rgba(201,162,39,0.22)" },
  finSwatch: { height: 46, borderRadius: 8, marginBottom: 7, border: "1px solid rgba(11,27,58,0.10)" },
  finLabel: { fontSize: 12, fontWeight: 800, color: NAVY, lineHeight: 1.25 },
  finTier: { fontSize: 10.5, color: GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 },
  finPrice: { fontSize: 12, fontWeight: 800, color: "rgba(11,27,58,0.7)", marginTop: 3 },
  finPick: { position: "absolute", top: 6, right: 8, color: GOLD, fontWeight: 900, fontSize: 13 },
  totalBar: { marginTop: 18, padding: 16, borderRadius: 16, background: "linear-gradient(135deg, rgba(11,27,58,0.96), rgba(11,27,58,0.86))", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" },
  totalLbl: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em", textTransform: "uppercase" },
  totalVal: { fontSize: 26, fontWeight: 900, color: "#fff", margin: "2px 0" },
  totalSub: { fontSize: 12, color: "rgba(255,255,255,0.6)" },
  applyBtn: { padding: "13px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#fff", fontWeight: 800, fontSize: 14.5, cursor: "pointer", whiteSpace: "nowrap" },
  applyOff: { background: "rgba(201,162,39,0.5)", cursor: "not-allowed" },
  disclaimer: { marginTop: 12, fontSize: 11, color: "rgba(11,27,58,0.5)", lineHeight: 1.5 },
};
