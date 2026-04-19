"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome4Module = void 0;
const common_1 = require("@nestjs/common");
const p4_module_1 = require("./p4/p4.module");
const tome_4_service_1 = require("./tome-4.service");
const public_controller_1 = require("./public/public.controller");
const p1_demo_controller_1 = require("./public/p1-demo.controller");
const p1_demo_service_1 = require("./public/p1-demo.service");
const p1_packs_email_controller_1 = require("./public/p1-packs-email.controller");
const p1_packs_sms_controller_1 = require("./public/p1-packs-sms.controller");
const p1_packs_quote_controller_1 = require("./public/p1-packs-quote.controller");
const p1_packs_quote_service_1 = require("./public/p1-packs-quote.service");
const prisma_module_1 = require("../tome-at/kernel/prisma/prisma.module");
const otp_service_1 = require("../../modules/otp/otp.service");
let Tome4Module = class Tome4Module {
};
exports.Tome4Module = Tome4Module;
exports.Tome4Module = Tome4Module = __decorate([
    (0, common_1.Module)({
        imports: [p4_module_1.P4Module, prisma_module_1.PrismaModule],
        controllers: [public_controller_1.PublicController, p1_demo_controller_1.P1DemoController, p1_packs_email_controller_1.P1PacksEmailController, p1_packs_sms_controller_1.P1PacksSmsController, p1_packs_quote_controller_1.P1PacksQuoteController],
        providers: [tome_4_service_1.Tome4Service, p1_demo_service_1.P1DemoService, otp_service_1.OtpService, p1_packs_quote_service_1.P1PacksQuoteService],
        exports: [tome_4_service_1.Tome4Service, p4_module_1.P4Module],
    })
], Tome4Module);
