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
exports.CercleInvitationsController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const cercle_invitations_service_1 = require("./cercle-invitations.service");
const jwt_1 = require("@nestjs/jwt");
/**
 * CercleInvitationsController — Sprint F2
 *
 * Endpoints :
 *  - POST /api/cercles/:cercleId/invite-email   (auth modo+)  → envoyer multi-emails
 *  - GET  /api/cercles/:cercleId/invitations    (auth modo+)  → historique
 *  - GET  /api/cercles/invitations/lookup       (public)      → résoudre token avant inscription
 *  - POST /api/cercles/invitations/signup       (public)      → créer compte + rejoindre cercle
 */
let CercleInvitationsController = class CercleInvitationsController {
    invitations;
    jwt;
    constructor(invitations, jwt) {
        this.invitations = invitations;
        this.jwt = jwt;
    }
    uid(req) {
        return req?.user?.userId || req?.user?.sub;
    }
    // ── Multi-email invite (modo+) ─────────────────────────────────
    async invite(req, cercleId, body) {
        return {
            ok: true,
            data: await this.invitations.inviteByEmail(cercleId, this.uid(req), body.emails, body.message),
        };
    }
    // ── Liste des invitations émises (modo+) ──────────────────────
    async list(req, cercleId) {
        return { ok: true, data: await this.invitations.listForCercle(cercleId, this.uid(req)) };
    }
    // ── Résoudre un token (public, utilisé par la page d'inscription) ──
    async lookup(token) {
        if (!token)
            return { ok: false, error: "Token manquant" };
        try {
            const data = await this.invitations.lookupToken(token);
            return { ok: true, data };
        }
        catch (e) {
            return { ok: false, error: e?.message || "Invitation invalide" };
        }
    }
    // ── Inscription via invitation (public) ───────────────────────
    async signup(body) {
        const result = await this.invitations.signupViaInvite(body.token, body);
        // Auto-login après signup : génère un JWT pour redirection directe
        const access_token = this.jwt.sign({
            sub: result.userId,
            userId: result.userId,
            email: result.email,
            role: "CLIENT",
        });
        return { ok: true, data: { ...result, access_token } };
    }
};
exports.CercleInvitationsController = CercleInvitationsController;
__decorate([
    (0, common_1.Post)(":cercleId/invite-email"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CercleInvitationsController.prototype, "invite", null);
__decorate([
    (0, common_1.Get)(":cercleId/invitations"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("cercleId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CercleInvitationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)("invitations/lookup"),
    __param(0, (0, common_1.Query)("token")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CercleInvitationsController.prototype, "lookup", null);
__decorate([
    (0, common_1.Post)("invitations/signup"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CercleInvitationsController.prototype, "signup", null);
exports.CercleInvitationsController = CercleInvitationsController = __decorate([
    (0, tome_at_1.Tome)("tome8"),
    (0, common_1.Controller)("api/cercles"),
    __metadata("design:paramtypes", [cercle_invitations_service_1.CercleInvitationsService,
        jwt_1.JwtService])
], CercleInvitationsController);
