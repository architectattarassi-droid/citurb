/**
 * SurfaceHelper — saisie de la surface plancher, 3 modes :
 *   - Directe : m² saisis.
 *   - RDC + étages : emprise × (RDC + étages + sous-sol).
 *   - Parcelle (CES + cour) : qualification complète portée de P1Landing
 *     (CES selon type, cour avec/sans, galerie RDC, sous-sol, R+N, voie large).
 *
 * Logique partagée par le moteur honoraires (CostEngine) ET l'estimatif par lots
 * (LotsEstimator) → la simulation porte toujours sur un PLANCHER RÉEL.
 */
import React, { useEffect, useMemo, useState } from "react";
import { CC } from "../../theme/tokens";
import { computeParcelleSP, type ParcelleInput, type Bati } from "./parcelleSP";

export type SurfaceDetail = { mode: "direct" | "auto" | "parcelle"; [k: string]: unknown };

export default function SurfaceHelper({
  value,
  onChange,
}: {
  value: number;
  onChange: (surfaceM2: number, hasBasement: boolean, detail: SurfaceDetail) => void;
}) {
  const [mode, setMode] = useState<"direct" | "auto" | "parcelle">("direct");

  // ── Mode "auto" (emprise × niveaux) ──
  const [emprise, setEmprise] = useState(120);
  const [etagesA, setEtagesA] = useState(1);
  const [sousSolA, setSousSolA] = useState(false);
  const auto = useMemo(
    () => Math.round(emprise * (1 + Math.max(0, etagesA) + (sousSolA ? 1 : 0))),
    [emprise, etagesA, sousSolA],
  );

  // ── Mode "parcelle" (CES + cour) ──
  const [p, setP] = useState<ParcelleInput>({
    bati: "immeuble", surfaceTerrain: 150, etages: 3, voieLarge: false, sousSol: false,
    villaType: "isolee", immeubleType: "standard", facades: 2, galerie: true, rdcCourMode: "unknown", courSurface: 0,
  });
  const setPF = (patch: Partial<ParcelleInput>) => setP((s) => ({ ...s, ...patch }));
  const parcelleSP = useMemo(() => computeParcelleSP(p), [p]);

  useEffect(() => {
    if (mode === "auto") onChange(auto, sousSolA, { mode, emprise, etages: etagesA, sousSol: sousSolA });
  }, [mode, auto, sousSolA]);
  useEffect(() => {
    if (mode === "parcelle" && parcelleSP != null) onChange(parcelleSP, p.sousSol, { mode, sp: parcelleSP, ...p });
  }, [mode, parcelleSP, p.sousSol]);

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={S.lab}>Surface plancher (m²)</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={() => setMode("direct")} style={{ ...S.modeBtn, ...(mode === "direct" ? S.modeOn : {}) }}>Saisie directe</button>
        <button type="button" onClick={() => setMode("auto")} style={{ ...S.modeBtn, ...(mode === "auto" ? S.modeOn : {}) }}>RDC + étages</button>
        <button type="button" onClick={() => setMode("parcelle")} style={{ ...S.modeBtn, ...(mode === "parcelle" ? S.modeOn : {}) }}>Parcelle (CES + cour)</button>
      </div>

      {mode === "direct" && (
        <input type="number" min="0" style={S.in} value={value} onChange={(e) => onChange(Number(e.target.value), false, { mode: "direct" })} />
      )}

      {mode === "auto" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <div><span style={S.miniLab}>Emprise RDC (m²)</span><input type="number" min="0" style={S.in} value={emprise} onChange={(e) => setEmprise(Number(e.target.value))} /></div>
          <div><span style={S.miniLab}>Étages (R+N)</span><input type="number" min="0" style={S.in} value={etagesA} onChange={(e) => setEtagesA(Number(e.target.value))} /></div>
          <label style={{ ...S.chk, paddingBottom: 8 }}><input type="checkbox" checked={sousSolA} onChange={(e) => setSousSolA(e.target.checked)} /> Sous-sol</label>
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: CC.color.inkMid }}>→ Surface plancher : <b style={{ color: CC.color.navy }}>{auto} m²</b> ({1 + Math.max(0, etagesA) + (sousSolA ? 1 : 0)} niveaux × {emprise} m²)</div>
        </div>
      )}

      {mode === "parcelle" && (
        <div style={S.parcelle}>
          <div style={S.pgrid}>
            <div><span style={S.miniLab}>Type de bâti</span>
              <select style={S.in} value={p.bati} onChange={(e) => setPF({ bati: e.target.value as Bati })}>
                <option value="immeuble">Immeuble</option>
                <option value="villa">Villa</option>
              </select>
            </div>
            <div><span style={S.miniLab}>Surface terrain (m²)</span><input type="number" min="0" style={S.in} value={p.surfaceTerrain} onChange={(e) => setPF({ surfaceTerrain: Number(e.target.value) })} /></div>
            <div><span style={S.miniLab}>Étages (R+N)</span><input type="number" min="0" style={S.in} value={p.etages} onChange={(e) => setPF({ etages: Number(e.target.value) })} /></div>
          </div>

          {p.bati === "villa" ? (
            <div style={S.pgrid}>
              <div><span style={S.miniLab}>Type de villa</span>
                <select style={S.in} value={p.villaType} onChange={(e) => setPF({ villaType: e.target.value as any })}>
                  <option value="isolee">Isolée (CES 0,3)</option>
                  <option value="jumelee">Jumelée (CES 0,4)</option>
                  <option value="bande">En bande (CES 0,5)</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <div style={S.pgrid}>
                <div><span style={S.miniLab}>Type d'immeuble</span>
                  <select style={S.in} value={p.immeubleType} onChange={(e) => setPF({ immeubleType: e.target.value as any })}>
                    <option value="standard">Standard (CES 1,0)</option>
                    <option value="maison_ville">Maison de ville (CES 0,7)</option>
                    <option value="rdc_commercial">RDC commercial</option>
                  </select>
                </div>
                <div><span style={S.miniLab}>Façades</span>
                  <select style={S.in} value={p.facades} onChange={(e) => setPF({ facades: Number(e.target.value) })}>
                    <option value={2}>≥ 2 façades</option>
                    <option value={1}>1 façade (mitoyen)</option>
                  </select>
                </div>
                {p.immeubleType === "rdc_commercial" && (
                  <label style={{ ...S.chk, paddingTop: 18 }}><input type="checkbox" checked={p.galerie !== false} onChange={(e) => setPF({ galerie: e.target.checked })} /> Galerie (recul, CES 0,7)</label>
                )}
              </div>

              {Number(p.facades) === 1 && (
                <div style={S.pgrid}>
                  <div><span style={S.miniLab}>Cour (1 façade)</span>
                    <select style={S.in} value={p.rdcCourMode} onChange={(e) => setPF({ rdcCourMode: e.target.value as any })}>
                      <option value="unknown">À étudier (hypothèse haute)</option>
                      <option value="with_cour">Avec cour</option>
                      <option value="without_cour">Sans cour (cour de jour/étage)</option>
                    </select>
                  </div>
                  {p.rdcCourMode === "with_cour" && (
                    <div><span style={S.miniLab}>Surface cour (m²)</span><input type="number" min="0" style={S.in} value={p.courSurface} onChange={(e) => setPF({ courSurface: Number(e.target.value) })} /></div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={S.poptions}>
            <label style={S.chk}><input type="checkbox" checked={p.voieLarge} onChange={(e) => setPF({ voieLarge: e.target.checked })} /> Voie ≥ 12 m (porte-à-faux)</label>
            <label style={S.chk}><input type="checkbox" checked={p.sousSol} onChange={(e) => setPF({ sousSol: e.target.checked })} /> Sous-sol</label>
          </div>

          <div style={{ fontSize: 12, color: CC.color.inkMid, marginTop: 6 }}>
            → Surface plancher estimée : <b style={{ color: CC.color.navy }}>{parcelleSP != null ? `${parcelleSP} m²` : "—"}</b>
            <span style={{ fontStyle: "italic" }}> (CES + cour réglementaires + forfait 24 m²)</span>
          </div>
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
  parcelle: { padding: "12px 14px", background: CC.color.bgRaised, border: `1px solid ${CC.color.border}`, borderRadius: 6, display: "flex", flexDirection: "column", gap: 10 },
  pgrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  poptions: { display: "flex", gap: 18, flexWrap: "wrap", paddingTop: 4 },
};
