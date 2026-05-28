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
exports.ChefCopiloteController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const chef_copilote_service_1 = require("./chef-copilote.service");
/**
 * ChefCopiloteController — copilote IA chef de chantier (Tome 3).
 */
let ChefCopiloteController = class ChefCopiloteController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async ask(body) {
        const r = await this.svc.ask(body.dossierId, body.query, body.queryLang || "darija");
        return { ok: true, ...r };
    }
    async suggestions(dossierId) {
        const suggestions = await this.svc.suggestions(dossierId);
        return { ok: true, suggestions };
    }
};
exports.ChefCopiloteController = ChefCopiloteController;
__decorate([
    (0, common_1.Post)("ask"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChefCopiloteController.prototype, "ask", null);
__decorate([
    (0, common_1.Get)("suggestions/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChefCopiloteController.prototype, "suggestions", null);
exports.ChefCopiloteController = ChefCopiloteController = __decorate([
    (0, tome_at_1.Tome)("tome3"),
    (0, common_1.Controller)("api/chef-copilote"),
    __metadata("design:paramtypes", [chef_copilote_service_1.ChefCopiloteService])
], ChefCopiloteController);
