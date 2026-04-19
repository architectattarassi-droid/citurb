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
exports.P1PacksSmsController = void 0;
const common_1 = require("@nestjs/common");
const otp_service_1 = require("../../../modules/otp/otp.service");
let P1PacksSmsController = class P1PacksSmsController {
    otp;
    constructor(otp) {
        this.otp = otp;
    }
    keyFrom(caseId) {
        const c = (caseId || "").trim();
        return c ? `case:${c}` : "";
    }
    async request(body) {
        const key = this.keyFrom(body?.caseId);
        const phone = (body?.phone || "").trim();
        return this.otp.requestSmsOtp(key, phone, { caseId: body?.caseId });
    }
    async verify(body) {
        const key = this.keyFrom(body?.caseId);
        const code = (body?.code || "").trim();
        return this.otp.verifySmsOtp(key, code);
    }
};
exports.P1PacksSmsController = P1PacksSmsController;
__decorate([
    (0, common_1.Post)("request"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P1PacksSmsController.prototype, "request", null);
__decorate([
    (0, common_1.Post)("verify"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P1PacksSmsController.prototype, "verify", null);
exports.P1PacksSmsController = P1PacksSmsController = __decorate([
    (0, common_1.Controller)("p1/packs/sms"),
    __metadata("design:paramtypes", [otp_service_1.OtpService])
], P1PacksSmsController);
