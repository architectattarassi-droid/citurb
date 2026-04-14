/**
 * Domain P1 — Quote Engine (client-side mirror)
 *
 * DOCTRINE:
 * - EXACT replica of apps/api/src/tomes/tome-4/public/p1-packs-quote.service.ts
 * - DO NOT expose the engine to the client UI (no %, no cost/m2 in output).
 * - Return only the pack/service amounts.
 * - Rounding: nearest 1,000 MAD (psychological) for display.
 *
 * When the backend is available, P1Packs calls /p1/packs/quote (source of truth).
 * This module is the OFFLINE FALLBACK — same formulas, same output shape.
 */

export type ConstructionLevel = "ECONOMIQUE" | "STANDING" | "HAUT_STANDING" | "PREMIUM" | "BLACK";
export type PackType = "ESSENTIEL" | "AVANCE" | "COMPLET";
export type BetMode = "PLATFORM" | "EXTERNAL";

export interface QuoteInput {
  surfaceM2: number;
  hasBasement?: boolean;
  constructionLevel: ConstructionLevel;
  pack: PackType;
  addRemoteFollow?: boolean;
  betMode: BetMode;
  modEnabled?: boolean;
  decoEnabled?: boolean;
  mandateEntreprise?: boolean;
  blackBudgetMAD?: number | null;
}

export interface QuoteOutput {
  ok: true;
  currency: "MAD";
  meta: {
    pack: PackType;
    constructionLevel: ConstructionLevel;
    betMode: BetMode;
    mandateEntrepriseAllowed: boolean;
  };
  amounts: {
    packMAD: number;
    remoteFollowMAD: number;
    betMAD: number;
    modMAD: number;
    decoMAD: number;
    totalMAD: number;
    totalMADRounded: number;
  };
  notes: string[];
}

// ── Internal baselines (not exposed) ──
function costPerM2(level: ConstructionLevel, blackBudgetMAD: number | null | undefined, surface: number): number {
  if (level === "ECONOMIQUE") return 3000;
  if (level === "STANDING") return 4000;
  if (level === "HAUT_STANDING") return 5000;
  if (level === "PREMIUM") return 6000;
  if (blackBudgetMAD && blackBudgetMAD > 0 && surface > 0)
    return Math.max(6500, Math.round(blackBudgetMAD / surface));
  return 7000;
}

function roundMoney(n: number): number {
  return Math.round(n / 10) * 10;
}

function roundPsychological(n: number): number {
  return Math.round(n / 1000) * 1000;
}

export function quoteLocal(input: QuoteInput): QuoteOutput {
  const notes: string[] = [];
  const surface = Number(input.surfaceM2);
  if (!Number.isFinite(surface) || surface <= 0) {
    throw new Error("Surface invalide.");
  }

  const effectiveSurface = surface * (input.hasBasement ? 2.0 : 1.0);
  if (input.hasBasement) notes.push("Sous-sol pris en compte dans l'estimation.");

  const cpm2 = costPerM2(input.constructionLevel, input.blackBudgetMAD, effectiveSurface);
  const budgetB =
    input.constructionLevel === "BLACK" && input.blackBudgetMAD && input.blackBudgetMAD > 0
      ? Number(input.blackBudgetMAD)
      : effectiveSurface * cpm2;

  const architectH = budgetB * 0.05;

  const packRatio = input.pack === "ESSENTIEL" ? 0.20 : input.pack === "AVANCE" ? 0.40 : 1.00;
  const packMAD = architectH * packRatio;

  const remoteFollowMAD = input.addRemoteFollow && input.pack !== "COMPLET" ? architectH * 0.10 : 0;

  const betMax = budgetB * 0.02;
  const betRatio = input.pack === "ESSENTIEL" ? 0.20 : input.pack === "AVANCE" ? 0.55 : 1.00;
  const betMAD = input.betMode === "PLATFORM" ? betMax * betRatio : 0;

  const modMAD = input.modEnabled ? budgetB * 0.05 : 0;
  const decoMAD = input.decoEnabled ? budgetB * 0.03 : 0;

  const mandateEntrepriseAllowed = input.pack === "COMPLET" && input.betMode === "PLATFORM";
  if (input.mandateEntreprise && !mandateEntrepriseAllowed) {
    notes.push("Mandat entreprise indisponible sans dossier d'exécution + CPS et BET plateforme.");
  }
  if (input.mandateEntreprise && mandateEntrepriseAllowed) {
    notes.push("Mandat entreprise activé. Consultation et sélection via la plateforme.");
  }
  if (input.modEnabled) {
    notes.push("MOD activée: validation des travaux sur pièces (photos + rapports) avant libération des paiements.");
  }

  const totalMAD = packMAD + remoteFollowMAD + betMAD + modMAD + decoMAD;
  const totalMADRounded = roundPsychological(totalMAD);

  return {
    ok: true,
    currency: "MAD",
    meta: { pack: input.pack, constructionLevel: input.constructionLevel, betMode: input.betMode, mandateEntrepriseAllowed },
    amounts: {
      packMAD: roundMoney(packMAD),
      remoteFollowMAD: roundMoney(remoteFollowMAD),
      betMAD: roundMoney(betMAD),
      modMAD: roundMoney(modMAD),
      decoMAD: roundMoney(decoMAD),
      totalMAD: roundMoney(totalMAD),
      totalMADRounded,
    },
    notes,
  };
}
