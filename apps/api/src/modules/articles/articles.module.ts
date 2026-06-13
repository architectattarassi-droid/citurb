import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ArticlesController } from "./articles.controller";
import { ArticlesService } from "./articles.service";
import { OgPrerenderMiddleware } from "./og-prerender.middleware";
import { PrismaModule } from "../../tomes/tome-at";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, OgPrerenderMiddleware],
  exports: [ArticlesService, OgPrerenderMiddleware],
})
export class ArticlesModule implements NestModule {
  /**
   * Branche le middleware OG sur les URLs publiques d'articles.
   * Le middleware ne sert le HTML pré-rendu QUE si l'User-Agent est un bot
   * social connu (FB/WhatsApp/LinkedIn/Twitter/etc.) ; sinon il next() et
   * c'est le fallback SPA classique de main.ts qui prend la main.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(OgPrerenderMiddleware)
      .forRoutes({ path: "media/article/*", method: RequestMethod.GET });
  }
}
