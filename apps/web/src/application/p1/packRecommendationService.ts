import type { ProjectType } from "../../domain/p1/types";

export type PackId = "type" | "custom" | "premium";

export interface PackRecommendation {
  recommended: PackId;
  reasons: string[];
}

/**
 * P1 — Pack recommendation (règles simples, V1)
 * Doctrine: explicable, déterministe, sans "boîte noire".
 */
export function recommendPack(input: {
  projectType?: ProjectType;
  planMode?: "type" | "personnalise";
  surface?: number;
  floors?: number;
  budget?: number;
}): PackRecommendation {
  const reasons: string[] = [];

  const surface = Number.isFinite(input.surface) ? (input.surface as number) : undefined;
  const floors = Number.isFinite(input.floors) ? (input.floors as number) : undefined;
  const budget = Number.isFinite(input.budget) ? (input.budget as number) : undefined;

  // Premium triggers (simple, conservative)
  const premiumTriggers: string[] = [];
  if (surface && surface >= 450) premiumTriggers.push("Surface élevée (≥ 450 m²)");
  if (floors && floors >= 4) premiumTriggers.push("R+ élevé (≥ 4 niveaux)");
  if (budget && budget >= 6_000_000) premiumTriggers.push("Budget élevé");

  if (premiumTriggers.length >= 2) {
    reasons.push("Projet complexe → accompagnement renforcé");
    reasons.push(...premiumTriggers);
    return { recommended: "premium", reasons };
  }

  // PlanMode first
  if (input.planMode === "personnalise") {
    reasons.push("Vous avez choisi un plan personnalisé");
    reasons.push("Itérations + optimisation sur mesure");
    return { recommended: "custom", reasons };
  }

  // Default
  reasons.push("Plan type : rapide, cadré, sans itération majeure");
  return { recommended: "type", reasons };
}
