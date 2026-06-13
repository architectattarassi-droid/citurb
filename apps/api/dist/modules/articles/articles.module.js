"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesModule = void 0;
const common_1 = require("@nestjs/common");
const articles_controller_1 = require("./articles.controller");
const articles_service_1 = require("./articles.service");
const og_prerender_middleware_1 = require("./og-prerender.middleware");
const tome_at_1 = require("../../tomes/tome-at");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
let ArticlesModule = class ArticlesModule {
    /**
     * Branche le middleware OG sur les URLs publiques d'articles.
     * Le middleware ne sert le HTML pré-rendu QUE si l'User-Agent est un bot
     * social connu (FB/WhatsApp/LinkedIn/Twitter/etc.) ; sinon il next() et
     * c'est le fallback SPA classique de main.ts qui prend la main.
     */
    configure(consumer) {
        consumer
            .apply(og_prerender_middleware_1.OgPrerenderMiddleware)
            .forRoutes({ path: "media/article/*", method: common_1.RequestMethod.GET });
    }
};
exports.ArticlesModule = ArticlesModule;
exports.ArticlesModule = ArticlesModule = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [articles_controller_1.ArticlesController],
        providers: [articles_service_1.ArticlesService, og_prerender_middleware_1.OgPrerenderMiddleware],
        exports: [articles_service_1.ArticlesService, og_prerender_middleware_1.OgPrerenderMiddleware],
    })
], ArticlesModule);
