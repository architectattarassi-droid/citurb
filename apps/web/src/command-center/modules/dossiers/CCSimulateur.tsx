/**
 * CCSimulateur — simulateur du backoffice. Trois moteurs :
 *   - « Chiffrage détaillé » (ChiffrageGadget : métré + sous-détails, même moteur que /chiffrage)
 *   - « Coût construction par lots » (LotsEstimator, fourchettes DH/m² ventilées)
 *   - « Honoraires P1/P2 » (CostEngine, packs / barème CNOA)
 * Route : /cc/simulateur
 */
import React, { Suspense, lazy, useState } from "react";
import CostEngine from "./CostEngine";
import LotsEstimator from "./LotsEstimator";
import { CC } from "../../theme/tokens";

const ChiffrageGadget = lazy(() => import("../../../features/chiffrage/ChiffrageGadget"));

export default function CCSimulateur() {
  const [tab, setTab] = useState<"chiffrage" | "lots" | "honoraires">("chiffrage");
  return (
    <div style={{ maxWidth: tab === "chiffrage" ? 1180 : 920, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink }}>
      <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Simulateur</h1>
      <p style={{ fontSize: 13, color: CC.color.inkMid, margin: "0 0 18px" }}>
        Chiffre un projet lot par lot (métré et sous-détails de prix), estime le coût par fourchettes ou calcule les honoraires CITURBAREA.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <button onClick={() => setTab("chiffrage")} style={{ ...tabBtn, ...(tab === "chiffrage" ? tabOn : {}) }}>Chiffrage détaillé (métré)</button>
        <button onClick={() => setTab("lots")} style={{ ...tabBtn, ...(tab === "lots" ? tabOn : {}) }}>Coût construction par lots</button>
        <button onClick={() => setTab("honoraires")} style={{ ...tabBtn, ...(tab === "honoraires" ? tabOn : {}) }}>Honoraires P1 / P2</button>
      </div>

      {tab === "chiffrage" ? (
        <Suspense fallback={<p style={{ fontSize: 13, color: CC.color.inkMid }}>Chargement…</p>}>
          <ChiffrageGadget variante="cc" />
        </Suspense>
      ) : tab === "lots" ? <LotsEstimator /> : <CostEngine />}
    </div>
  );
}

const tabBtn: React.CSSProperties = { padding: "10px 16px", border: `1px solid ${CC.color.border}`, borderRadius: 8, background: CC.color.bgRaised, color: CC.color.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600 };
const tabOn: React.CSSProperties = { background: CC.color.navy, color: CC.color.inkOnDark, borderColor: CC.color.navy };
