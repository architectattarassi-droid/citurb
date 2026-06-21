/**
 * CCSimulateur — simulateur de coût du backoffice.
 * Réutilise le MÊME moteur que le devis (CostEngine, logique P1/P2 back).
 * Route : /cc/simulateur
 */
import React from "react";
import CostEngine from "./CostEngine";
import { CC } from "../../theme/tokens";

export default function CCSimulateur() {
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 80px", fontFamily: CC.font.body, color: CC.color.ink }}>
      <h1 style={{ fontSize: 20, color: CC.color.navy, fontWeight: 600, margin: "0 0 6px" }}>Simulateur de coût</h1>
      <p style={{ fontSize: 13, color: CC.color.inkMid, margin: "0 0 18px" }}>
        Estime les honoraires selon la logique Porte 1 (packs sur budget) ou Porte 2 (barème CNOA).
        Le même moteur alimente la génération de devis.
      </p>
      <CostEngine />
    </div>
  );
}
