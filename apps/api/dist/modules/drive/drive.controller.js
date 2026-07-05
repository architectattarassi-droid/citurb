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
exports.DriveController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const drive_service_1 = require("./drive.service");
/**
 * DriveController — connexion Google Drive + miroir de dossiers.
 *
 *   GET  /api/cc/drive/status            → état (configuré/connecté/email)   [ADMIN,OWNER]
 *   GET  /api/cc/drive/connect           → { authUrl } pour lancer le consentement [ADMIN,OWNER]
 *   GET  /api/cc/drive/callback          → redirection Google (PUBLIC, protégé par state)
 *   POST /api/cc/drive/mirror/:dossierId → pousse le dossier complet dans Drive [ADMIN,OWNER]
 *   POST /api/cc/drive/disconnect        → oublie le jeton                    [ADMIN,OWNER]
 */
let DriveController = class DriveController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    status() {
        return this.svc.status();
    }
    connect() {
        if (!this.svc.isConfigured()) {
            return { ok: false, error: "Google Drive non configuré (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants)" };
        }
        return { ok: true, authUrl: this.svc.authUrl() };
    }
    /**
     * Callback OAuth — appelé par Google dans le navigateur (pas de JWT).
     * Sécurisé par le paramètre `state` (anti-CSRF) + code single-use.
     * Renvoie une page HTML minimale de confirmation.
     */
    async callback(code, state, res) {
        const page = (title, msg, ok) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;background:#0d1017;color:#e8eaf0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;max-width:420px;padding:24px"><div style="font-size:48px">${ok ? "✅" : "⚠️"}</div><h1 style="font-size:20px">${title}</h1><p style="color:#9ca3af;line-height:1.5">${msg}</p><p style="color:#6b7280;font-size:13px">Tu peux fermer cette fenêtre.</p></div></body></html>`;
        try {
            if (!code || !state)
                throw new Error("Paramètres OAuth manquants");
            const { email } = await this.svc.handleCallback(code, state);
            res.status(200).type("html").send(page("Google Drive connecté", `Le miroir de sauvegarde est actif sur le compte <b>${email || "Google"}</b>.`, true));
        }
        catch (e) {
            res.status(400).type("html").send(page("Connexion échouée", String(e?.message || e), false));
        }
    }
    async mirror(dossierId) {
        return await this.svc.mirrorDossier(dossierId);
    }
    disconnect() {
        return this.svc.disconnect();
    }
};
exports.DriveController = DriveController;
__decorate([
    (0, common_1.Get)("status"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "status", null);
__decorate([
    (0, common_1.Get)("connect"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "connect", null);
__decorate([
    (0, common_1.Get)("callback"),
    __param(0, (0, common_1.Query)("code")),
    __param(1, (0, common_1.Query)("state")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DriveController.prototype, "callback", null);
__decorate([
    (0, common_1.Post)("mirror/:dossierId"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __param(0, (0, common_1.Param)("dossierId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DriveController.prototype, "mirror", null);
__decorate([
    (0, common_1.Post)("disconnect"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DriveController.prototype, "disconnect", null);
exports.DriveController = DriveController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/cc/drive"),
    __metadata("design:paramtypes", [drive_service_1.DriveService])
], DriveController);
