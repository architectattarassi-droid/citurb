import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { AdsController } from "./ads.controller";
import { AdsService } from "./ads.service";

/**
 * AdsModule — régie pub native (promo fournisseurs matériaux). PrismaModule global.
 */
@Module({
  imports: [Tome5AuthModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
