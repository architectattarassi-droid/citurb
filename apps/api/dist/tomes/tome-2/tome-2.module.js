"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome2Module = void 0;
const common_1 = require("@nestjs/common");
const p2_module_1 = require("./p2/p2.module");
const pv_chantier_module_1 = require("./pv-chantier/pv-chantier.module");
const pv_commission_module_1 = require("./pv-commission-rokhas/pv-commission.module");
const tome_2_service_1 = require("./tome-2.service");
const anti_desint_service_1 = require("./anti-desint.service");
const anti_desint_controller_1 = require("./anti-desint.controller");
const tome_at_1 = require("./../tome-at");
const kernel_module_1 = require("../../modules/kernel/kernel.module");
const owner_notify_module_1 = require("../../modules/owner-notify/owner-notify.module");
const auth_module_1 = require("../tome-5/auth/auth.module");
let Tome2Module = class Tome2Module {
};
exports.Tome2Module = Tome2Module;
exports.Tome2Module = Tome2Module = __decorate([
    (0, common_1.Module)({
        imports: [p2_module_1.P2Module, pv_chantier_module_1.PvChantierModule, pv_commission_module_1.PvCommissionModule, tome_at_1.PrismaModule, kernel_module_1.KernelModule, owner_notify_module_1.OwnerNotifyModule, auth_module_1.Tome5AuthModule],
        controllers: [anti_desint_controller_1.AntiDesintController],
        providers: [tome_2_service_1.Tome2Service, anti_desint_service_1.AntiDesintService],
        exports: [tome_2_service_1.Tome2Service, p2_module_1.P2Module, pv_chantier_module_1.PvChantierModule, pv_commission_module_1.PvCommissionModule, anti_desint_service_1.AntiDesintService],
    })
], Tome2Module);
