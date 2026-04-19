import { SetMetadata } from '@nestjs/common';

// Canonical metadata keys (OPS-only; never leak to public)
export const META_TOME = 'citurbarea:tome';
export const META_RULE = 'citurbarea:rule_id';

export type TomeId =
  | 'tome_at'
  | 'tome0'
  | 'tome1'
  | 'tome2'
  | 'tome3'
  | 'tome4'
  | 'tome5'
  | 'tome6'
  | 'tome7'
  | 'tome8'
  | 'tome9'
  | 'tome10';

/**
 * Decorator required on every controller AND every handler.
 * Goal: prevent "free-floating" endpoints that bypass the Tome doctrine.
 */
export const Tome = (tome: TomeId) => SetMetadata(META_TOME, tome);

/**
 * Decorator required on every handler that enforces/implements a doctrine rule.
 * Example: @Rule('T3-R-L1-014')
 */
export const Rule = (ruleId: string) => SetMetadata(META_RULE, ruleId);
