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
exports.RokhasController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const rokhas_service_1 = require("./rokhas.service");
let RokhasController = class RokhasController {
    rokhas;
    constructor(rokhas) {
        this.rokhas = rokhas;
    }
    // COCKPIT ARCHITECTE — vue complète
    async get(id) {
        return this.rokhas.getOrCreate(id);
    }
    async phases(id) {
        return this.rokhas.getPhaseTimeline(id);
    }
    // FRONT CLIENT — vue filtrée (visibleClient=true uniquement)
    async clientView(id) {
        return this.rokhas.getClientView(id);
    }
    async sync(id, body) {
        return this.rokhas.syncFromRokhas(id, body);
    }
    async advance(id, body, req) {
        if (rokhas_service_1.PHASES_ARCHITECTE_ONLY.includes(body.toPhase)) {
            const role = req.user?.role;
            if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
                throw new common_1.ForbiddenException('Cette phase nécessite une validation architecte');
            }
        }
        return this.rokhas.advancePhase(id, body.toPhase, req.user.userId, body.remarques);
    }
    async addDoc(id, body, req) {
        return this.rokhas.addDocument(id, { ...body, uploadePar: req.user.userId });
    }
    // ARCHITECTE ONLY — valide avant envoi
    async validateDoc(docId, req) {
        const role = req.user?.role;
        if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
            throw new common_1.ForbiddenException("Validation réservée à l'architecte");
        }
        return this.rokhas.validateDocument(docId, req.user.userId);
    }
    // ARCHITECTE ONLY — décide d'envoyer au client
    async sendDoc(docId, req) {
        const role = req.user?.role;
        if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
            throw new common_1.ForbiddenException("Envoi réservé à l'architecte");
        }
        return this.rokhas.sendDocumentToClient(docId);
    }
    // ── PORTAIL CLIENT ────────────────────────────────────────────────────────
    // Phases 1 & 2 — saisie des données (client ou architecte), bloqué si phase >= 4
    async saisie(id, body, req) {
        return this.rokhas.saveSaisieData(id, body, req.user.userId);
    }
    // Phase 3 — e-Signature Barid (architecte uniquement)
    async esign(id, req) {
        const role = req.user?.role;
        if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
            throw new common_1.ForbiddenException('La signature e-Barid est réservée à l\'architecte');
        }
        return this.rokhas.signEsign(id, req.user.userId);
    }
    // Client soumet ses données pour une phase déléguée (7, 9, permis habiter)
    async clientSubmit(id, body, req) {
        return this.rokhas.submitClientData(id, {
            phase: body.phase,
            fields: body.fields,
            triggeredBy: req.user.userId,
        });
    }
    // Client récupère ses données + état complet du dossier Rokhas
    async clientData(id) {
        return this.rokhas.getClientData(id);
    }
    // OPS/ADMIN — liste dossiers avec sync Puppeteer en attente
    async pendingSync(req) {
        if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès OPS requis');
        }
        return this.rokhas.getPendingSyncDossiers();
    }
    // Puppeteer callback — marque sync terminé
    async syncComplete(rokhasId, req) {
        if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
            throw new common_1.ForbiddenException('Accès OPS requis');
        }
        await this.rokhas.markSyncComplete(rokhasId);
        return { ok: true };
    }
};
exports.RokhasController = RokhasController;
__decorate([
    (0, common_1.Get)('dossier/:id/rokhas'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "get", null);
__decorate([
    (0, common_1.Get)('dossier/:id/rokhas/phases'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "phases", null);
__decorate([
    (0, common_1.Get)('dossier/:id/rokhas/client-view'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "clientView", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/sync'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "sync", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/advance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "advance", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/documents'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "addDoc", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/documents/:docId/validate'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "validateDoc", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/documents/:docId/send'),
    __param(0, (0, common_1.Param)('docId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "sendDoc", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/saisie'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "saisie", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/esign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "esign", null);
__decorate([
    (0, common_1.Post)('dossier/:id/rokhas/client-submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "clientSubmit", null);
__decorate([
    (0, common_1.Get)('dossier/:id/rokhas/client-data'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "clientData", null);
__decorate([
    (0, common_1.Get)('rokhas/pending-sync'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "pendingSync", null);
__decorate([
    (0, common_1.Post)('rokhas/:rokhasId/sync-complete'),
    __param(0, (0, common_1.Param)('rokhasId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RokhasController.prototype, "syncComplete", null);
exports.RokhasController = RokhasController = __decorate([
    (0, common_1.Controller)('p2'),
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    __metadata("design:paramtypes", [rokhas_service_1.RokhasService])
], RokhasController);
