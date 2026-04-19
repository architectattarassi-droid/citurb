type ConstructionLevel = "ECONOMIQUE" | "STANDING" | "HAUT_STANDING" | "PREMIUM" | "BLACK";
type PackType = "ESSENTIEL" | "AVANCE" | "COMPLET";
type BetMode = "PLATFORM" | "EXTERNAL";

export type P1PacksQuoteInput = {
  surfaceM2: number;
  hasBasement?: boolean;
  constructionLevel: ConstructionLevel;
  pack: PackType;
  addRemoteFollow?: boolean;
  betMode: BetMode;
  modEnabled?: boolean;
  decoEnabled?: boolean;
  mandateEntreprise?: boolean;
  // BLACK only: optional explicit budget target (kept internal; UI may ask later)
  blackBudgetMAD?: number | null;
};

export type P1PacksQuoteOutput = {
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
};

/**
 * P1 Packs Quote (V162+)
 * Doctrine:
 * - Do NOT expose the engine to the client (no % or cost/m2 in output).
 * - Return only the pack/service amounts.
 * - Rounding is psychological (nearest 1,000 MAD) for display.
 */
export class P1PacksQuoteService {
  quote(input: P1PacksQuoteInput): P1PacksQuoteOutput {
    const notes: string[] = [];

    const surface = Number(input.surfaceM2);
    if (!Number.isFinite(surface) || surface <= 0) {
      throw new Error("Surface invalide.");
    }

    // Basement: counts as an additional full level (Sous-sol = RDC)
    // IMPORTANT: we do not expose this rule to the client UI; only the final pack amounts.
    const effectiveSurface = surface * (input.hasBasement ? 2.0 : 1.0);
    if (input.hasBasement) notes.push("Sous-sol pris en compte dans l’estimation.");

    const costPerM2 = this.costPerM2(input.constructionLevel, input.blackBudgetMAD, effectiveSurface);
    const budgetB = input.constructionLevel === "BLACK" && input.blackBudgetMAD && input.blackBudgetMAD > 0
      ? Number(input.blackBudgetMAD)
      : effectiveSurface * costPerM2;

    const architectH = budgetB * 0.05;

    const packRatio = input.pack === "ESSENTIEL" ? 0.20 : input.pack === "AVANCE" ? 0.40 : 1.00;
    const packMAD = architectH * packRatio;

    const remoteFollowMAD = input.addRemoteFollow && input.pack !== "COMPLET" ? architectH * 0.10 : 0;

    // BET (max 2% of budget) — prorata intelligent based on technical scope (not chantier follow-up)
    const betMax = budgetB * 0.02;
    const betRatio = input.pack === "ESSENTIEL" ? 0.20 : input.pack === "AVANCE" ? 0.55 : 1.00;
    const betMAD = input.betMode === "PLATFORM" ? betMax * betRatio : 0;

    const modMAD = input.modEnabled ? budgetB * 0.05 : 0;
    const decoMAD = input.decoEnabled ? budgetB * 0.03 : 0;

    const mandateEntrepriseAllowed = input.pack === "COMPLET" && input.betMode === "PLATFORM";
    if (input.mandateEntreprise && !mandateEntrepriseAllowed) {
      notes.push("Mandat entreprise indisponible sans dossier d’exécution + CPS et BET plateforme.");
    }
    if (input.mandateEntreprise && mandateEntrepriseAllowed) {
      notes.push("Mandat entreprise activé. Consultation et sélection via la plateforme.");
    }
    if (input.modEnabled) {
      notes.push("MOD activée: validation des travaux sur pièces (photos + rapports) avant libération des paiements.");
    }

    const totalMAD = packMAD + remoteFollowMAD + betMAD + modMAD + decoMAD;
    const totalMADRounded = this.roundPsychological(totalMAD);

    return {
      ok: true,
      currency: "MAD",
      meta: {
        pack: input.pack,
        constructionLevel: input.constructionLevel,
        betMode: input.betMode,
        mandateEntrepriseAllowed,
      },
      amounts: {
        packMAD: this.roundMoney(packMAD),
        remoteFollowMAD: this.roundMoney(remoteFollowMAD),
        betMAD: this.roundMoney(betMAD),
        modMAD: this.roundMoney(modMAD),
        decoMAD: this.roundMoney(decoMAD),
        totalMAD: this.roundMoney(totalMAD),
        totalMADRounded,
      },
      notes,
    };
  }

  private costPerM2(level: ConstructionLevel, blackBudgetMAD: number | null | undefined, surface: number): number {
    // Internal baselines (not exposed)
    if (level === "ECONOMIQUE") return 3000;
    if (level === "STANDING") return 4000;
    if (level === "HAUT_STANDING") return 5000;
    if (level === "PREMIUM") return 6000;
    // BLACK: if explicit budget is provided, derive an implicit m2 cost; else use a conservative baseline.
    if (blackBudgetMAD && blackBudgetMAD > 0 && surface > 0) return Math.max(6500, Math.round(blackBudgetMAD / surface));
    return 7000;
  }

  private roundMoney(n: number): number {
    // Keep line items stable (nearest 10 MAD)
    return Math.round(n / 10) * 10;
  }

  private roundPsychological(n: number): number {
    // Psychological rounding (nearest 1,000 MAD)
    return Math.round(n / 1000) * 1000;
  }
}
