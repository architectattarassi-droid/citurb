import { Module } from "@nestjs/common";

/**
 * Tome-AT = kernel primitives only.
 * Do NOT import other tomes here (import direction must remain clean).
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class TomeAtModule {}
