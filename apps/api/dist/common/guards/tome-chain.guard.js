"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TomeChainGuard = void 0;
const common_1 = require("@nestjs/common");
const contracts_1 = require("@citurbarea/contracts");
const raise_doctrine_1 = require("../../modules/kernel/raise-doctrine");
/**
 * TomeChainGuard
 * Enforces that any *mutation* call carries the canonical tome-chain header.
 * This is a contract guard to prevent accidental drift of clients/frontends.
 * Security still relies on Auth/Door/Permission/Entitlement/State guards.
 */
let TomeChainGuard = class TomeChainGuard {
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const header = (req.headers?.[contracts_1.HDR_TOME_CHAIN] ?? req.headers?.[contracts_1.HDR_TOME_CHAIN.toLowerCase()]);
        if (!header || header !== contracts_1.TOME_CHAIN_V1) {
            (0, raise_doctrine_1.raiseDoctrine)({
                messagePublic: "Action impossible (contrat client invalide).",
                httpStatus: 409,
                rule_id: contracts_1.RULES.CONTRACT_TOME_CHAIN_REQUIRED,
                error_code: "ERR-T@-CONTRACT-001-TOME_CHAIN_REQUIRED",
                category: "DOCTRINE_BLOCK",
                severity: "WARN",
                sources: [contracts_1.RULES.CONTRACT_TOME_CHAIN_REQUIRED],
                public_code: "CIT-409-0001",
            });
        }
        return true;
    }
};
exports.TomeChainGuard = TomeChainGuard;
exports.TomeChainGuard = TomeChainGuard = __decorate([
    (0, common_1.Injectable)()
], TomeChainGuard);
