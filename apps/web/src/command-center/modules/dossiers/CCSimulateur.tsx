/**
 * CCSimulateur — simulateur du backoffice. Deux moteurs, mêmes que le devis :
 *   - « Coût construction par lots » (LotsEstimator, fourchettes DH/m² ventilées)
 *   - « Honoraires P1/P2 » (CostEngine, packs / barème CNOA)
 * Route : /cc/simulateur
 */
import React, { useState } from "react";
import CostEngine from "./CostEngine";
import LotsEstimator from "./LotsEstimator";
import { CC } from "../../theme/tokens";

export default function CCSimulateur() {
  const [tab, setTab] = useState<"lots" | "honoraires">("lots");
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink }}>
      <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Simulateur</h1>
      <p style={{ fontSize: 13, color: CC.color.inkMid, margin: "0 0 18px" }}>
        Estime le coût de construction (par lots) ou les honoraires CITURBAREA. Le même moteur alimente les devis.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button onClick={() => setTab("lots")} style={{ ...tabBtn, ...(tab === "lots" ? tabOn : {}) }}>Coût construction par lots</button>
        <button onClick={() => setTab("honoraires")} style={{ ...tabBtn, ...(tab === "honoraires" ? tabOn : {}) }}>Honoraires P1 / P2</button>
      </div>

      {tab === "lots" ? <LotsEstimator /> : <CostEngine />}
    </div>
  );
}

const tabBtn: React.CSSProperties = { padding: "10px 16px", border: `1px solid ${CC.color.border}`, borderRadius: 8, background: CC.color.bgRaised, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 };
const tabOn: React.CSSProperties = { background: CC.color.navy, color: CC.color.inkOnDark, borderColor: CC.color.navy };
