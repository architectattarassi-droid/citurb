import { Body, Controller, Post } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { EstimationService } from "./estimation.service";
import { generateParcelles, generateComparables } from "./seed";
import type { EstimationInput, ComparableTransaction, ParcellePilote } from "./types";

// Seed généré une seule fois au boot (singleton process-level)
let _seedCache: { parcelles: ParcellePilote[]; comparables: ComparableTransaction[] } | null = null;
function getSeed() {
  if (!_seedCache) _seedCache = { parcelles: generateParcelles(), comparables: generateComparables() };
  return _seedCache;
}

/**
 * ZillowMaController — endpoint public d'estimation foncière.
 * Tome 0 = data nationale. Pas d'auth pour l'estimation simple (lead gen).
 * Le rapport détaillé + sauvegarde nécessitera login (à venir Q4).
 */
@Tome("tome0")
@Controller("api/zillow-ma")
export class ZillowMaController {
  constructor(private readonly estim: EstimationService) {}

  /**
   * Estimation foncière depuis lat/lng + caractéristiques bien.
   * Public — utilisé comme lead magnet sur la landing /foncier/estimation.
   */
  @Post("estimation")
  estimation(@Body() body: EstimationInput) {
    const seed = getSeed();
    const result = this.estim.estimate(body, seed.comparables, seed.parcelles);
    return { ok: true, result };
  }
}
