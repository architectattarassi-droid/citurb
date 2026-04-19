"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P1PacksEmailController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const otp_service_1 = require("../../../modules/otp/otp.service");
let P1PacksEmailController = class P1PacksEmailController {
    otp;
    constructor(otp) {
        this.otp = otp;
    }
    async request(_req, body) {
        // Public endpoint: used in the P1 tunnel before any JWT/account exists.
        // Bind the unlock flow to the CASE id.
        const caseId = String(body?.caseId || body?.order?.caseId || "").trim();
        const email = String(body?.email || body?.order?.requester?.email || "").trim();
        if (!caseId)
            return { ok: false, message: "CaseId manquant." };
        if (!email)
            return { ok: false, message: "Email manquant." };
        const contextKey = `case:${caseId}`;
        return this.otp.requestEmailOtp(contextKey, email, body?.order || {});
    }
    async verify(_req, body) {
        const caseId = String(body?.caseId || "").trim();
        const code = String(body?.code || "").trim();
        if (!caseId)
            return { ok: false, message: "CaseId manquant." };
        if (!code)
            return { ok: false, message: "Code manquant." };
        const contextKey = `case:${caseId}`;
        return this.otp.verifyEmailOtp(contextKey, code);
    }
};
exports.P1PacksEmailController = P1PacksEmailController;
__decorate([
    (0, common_1.Post)("request"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], P1PacksEmailController.prototype, "request", null);
__decorate([
    (0, common_1.Post)("verify"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], P1PacksEmailController.prototype, "verify", null);
exports.P1PacksEmailController = P1PacksEmailController = __decorate([
    (0, tome_at_1.Tome)('tome4'),
    (0, common_1.Controller)("p1/packs/email"),
    __metadata("design:paramtypes", [otp_service_1.OtpService])
], P1PacksEmailController);
