import { Injectable } from "@nestjs/common";
import type { OrchestratorContext, TomeHandler } from "../types";

/**
 * Tome 4 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 4 live in the doctrine docs and are implemented incrementally.
 */
@Injectable()
export class Tome4Service implements TomeHandler {
  readonly tome = "T4" as const;

  async handle(ctx: OrchestratorContext): Promise<OrchestratorContext> {
    // No-op by default. Future implementation will apply Tome 4 rules.
    return ctx;
  }
}
