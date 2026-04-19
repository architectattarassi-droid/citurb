"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirmModule = void 0;
const common_1 = require("@nestjs/common");
const firm_service_1 = require("./firm.service");
const firm_controller_1 = require("./firm.controller");
const firm_resolver_middleware_1 = require("./firm-resolver.middleware");
const tome_at_1 = require("../../tomes/tome-at");
let FirmModule = class FirmModule {
    configure(consumer) {
        consumer.apply(firm_resolver_middleware_1.FirmResolverMiddleware).forRoutes('*');
    }
};
exports.FirmModule = FirmModule;
exports.FirmModule = FirmModule = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule],
        controllers: [firm_controller_1.FirmController],
        providers: [firm_service_1.FirmService, firm_resolver_middleware_1.FirmResolverMiddleware],
        exports: [firm_service_1.FirmService],
    })
], FirmModule);
