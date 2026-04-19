import { Injectable } from "@nestjs/common";
import type { OrchestratorContext, TomeHandler } from "../types";

/**
 * Tome 6 handler (placeholder executable).
 *
 * IMPORTANT:
 * - No business logic is removed; this handler is a stable hook point.
 * - Real rules for Tome 6 live in the doctrine docs and are implemented incrementally.
 */
@Injectable()
export class Tome6Service implements TomeHandler {
  readonly tome = "T6" as const;

  async handle(ctx: OrchestratorContext): Promise<OrchestratorContext> {
    // No-op by default. Future implementation will apply Tome 6 rules.
    return ctx;
  }
}
