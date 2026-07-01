"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const seo_controller_1 = require("./seo.controller");
const seo_service_1 = require("./seo.service");
/** SeoModule — cockpit SEO/GEO interne (audit on-page, mots-clés, concurrents). */
let SeoModule = class SeoModule {
};
exports.SeoModule = SeoModule;
exports.SeoModule = SeoModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.Tome5AuthModule],
        controllers: [seo_controller_1.SeoController],
        providers: [seo_service_1.SeoService],
        exports: [seo_service_1.SeoService],
    })
], SeoModule);
