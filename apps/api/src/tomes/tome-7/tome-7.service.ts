import { Injectable } from "@nestjs/common";
import type { OrchestratorContext, TomeHandler } from "../types";

/**
 * Tome 7 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 7 live in the doctrine docs and are implemented incrementally.
 */
@Injectable()
export class Tome7Service implements TomeHandler {
  readonly tome = "T7" as const;

  async handle(ctx: OrchestratorContext): Promise<OrchestratorContext> {
    // No-op by default. Future implementation will apply Tome 7 rules.
    return ctx;
  }
}
