import { Injectable } from "@nestjs/common";
import type { OrchestratorContext, TomeHandler } from "../types";

/**
 * Tome 0 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 0 live in the doctrine docs and are implemented incrementally.
 */
@Injectable()
export class Tome0Service implements TomeHandler {
  readonly tome = "T0" as const;

  async handle(ctx: OrchestratorContext): Promise<OrchestratorContext> {
    // No-op by default. Future implementation will apply Tome 0 rules.
    return ctx;
  }
}
