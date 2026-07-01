import { Module } from "@nestjs/common";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";

/** SeoModule — cockpit SEO/GEO interne (audit on-page, mots-clés, concurrents). */
@Module({
  imports: [Tome5AuthModule],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
