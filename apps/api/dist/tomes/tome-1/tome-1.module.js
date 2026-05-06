"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tome1Module = void 0;
const common_1 = require("@nestjs/common");
const tome_1_service_1 = require("./tome-1.service");
const pack_validation_service_1 = require("./pack-validation.service");
const pack_validation_controller_1 = require("./pack-validation.controller");
const stripe_webhook_controller_1 = require("./stripe-webhook.controller");
const stripe_checkout_controller_1 = require("./stripe-checkout.controller");
const universal_contract_service_1 = require("./universal-contract.service");
const universal_contract_controller_1 = require("./universal-contract.controller");
const tome_at_1 = require("../tome-at");
const auth_module_1 = require("../tome-5/auth/auth.module");
let Tome1Module = class Tome1Module {
};
exports.Tome1Module = Tome1Module;
exports.Tome1Module = Tome1Module = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [pack_validation_controller_1.PackValidationController, stripe_webhook_controller_1.StripeWebhookController, stripe_checkout_controller_1.StripeCheckoutController, universal_contract_controller_1.UniversalContractController],
        providers: [tome_1_service_1.Tome1Service, pack_validation_service_1.PackValidationService, universal_contract_service_1.UniversalContractService],
        exports: [tome_1_service_1.Tome1Service, pack_validation_service_1.PackValidationService, universal_contract_service_1.UniversalContractService],
    })
], Tome1Module);
