/**
 * SurfaceHelper — saisie de la surface plancher : directe OU calculée depuis les
 * détails projet (emprise RDC × (RDC + étages R+N) + sous-sol). Logique partagée
 * par le moteur honoraires (CostEngine) ET l'estimatif par lots (LotsEstimator)
 * pour que la simulation porte toujours sur le PLANCHER RÉEL.
 *
 * onChange(surfaceM2, hasBasement, detail) — detail = { emprise, etages, sousSol }
 * pour tracer la composition du plancher.
 */
import React, { useEffect, useMemo, useState } from "react";
import { CC } from "../../theme/tokens";

export type SurfaceDetail = { mode: "direct" | "auto"; emprise?: number; etages?: number; sousSol?: boolean };

export default function SurfaceHelper({
  value,
  onChange,
}: {
  value: number;
  onChange: (surfaceM2: number, hasBasement: boolean, detail: SurfaceDetail) => void;
}) {
  const [mode, setMode] = useState<"direct" | "auto">("direct");
  const [emprise, setEmprise] = useState(120);
  const [etages, setEtages] = useState(1); // R+N → N niveaux au-dessus du RDC
  const [sousSol, setSousSol] = useState(false);

  // Plancher = emprise × (RDC + étages + sous-sol éventuel)
  const auto = useMemo(
    () => Math.round(emprise * (1 + Math.max(0, etages) + (sousSol ? 1 : 0))),
    [emprise, etages, sousSol],
  );
  useEffect(() => {
    if (mode === "auto") onChange(auto, sousSol, { mode, emprise, etages, sousSol });
  }, [mode, auto, sousSol]);

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={S.lab}>Surface plancher (m²)</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <button type="button" onClick={() => setMode("direct")} style={{ ...S.modeBtn, ...(mode === "direct" ? S.modeOn : {}) }}>Saisie directe</button>
        <button type="button" onClick={() => setMode("auto")} style={{ ...S.modeBtn, ...(mode === "auto" ? S.modeOn : {}) }}>Calcul RDC + étages</button>
      </div>
      {mode === "direct" ? (
        <input type="number" min="0" style={S.in} value={value} onChange={(e) => onChange(Number(e.target.value), false, { mode: "direct" })} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <div><span style={S.miniLab}>Emprise RDC (m²)</span><input type="number" min="0" style={S.in} value={emprise} onChange={(e) => setEmprise(Number(e.target.value))} /></div>
          <div><span style={S.miniLab}>Étages (R+N)</span><input type="number" min="0" style={S.in} value={etages} onChange={(e) => setEtages(Number(e.target.value))} /></div>
          <label style={{ ...S.chk, paddingBottom: 8 }}><input type="checkbox" checked={sousSol} onChange={(e) => setSousSol(e.target.checked)} /> Sous-sol</label>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: CC.color.inkMid }}>→ Surface plancher totale : <b style={{ color: CC.color.navy }}>{auto} m²</b> ({1 + Math.max(0, etages) + (sousSol ? 1 : 0)} niveaux × {emprise} m²)</div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  lab: { display: "block", fontSize: 10, color: CC.color.inkMid, marginBottom: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" },
  miniLab: { display: "block", fontSize: 10, color: CC.color.inkMuted, marginBottom: 2 },
  in: { width: "100%", padding: "8px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, fontFamily: "inherit", fontSize: 13, boxSizing: "border-box", background: CC.color.bgRaised, color: CC.color.ink },
  modeBtn: { padding: "5px 10px", border: `1px solid ${CC.color.border}`, borderRadius: 4, background: CC.color.bgRaised, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600 },
  modeOn: { background: CC.color.orSoft, color: CC.color.navy, borderColor: CC.color.or },
  chk: { fontSize: 12, color: CC.color.ink, display: "flex", alignItems: "center", gap: 4 },
};
