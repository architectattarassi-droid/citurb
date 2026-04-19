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
exports.SousPhaseController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../tomes/tome-at/security/jwt-auth.guard");
const sous_phase_service_1 = require("./sous-phase.service");
let SousPhaseController = class SousPhaseController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    complet(id) { return this.svc.getDossierComplet(id); }
    snapshot(id, ref) { return this.svc.getSnapshot(id, ref); }
    listSP(id, pr) {
        return this.svc.db.dossierSousPhase.findMany({ where: { dossierId: id, ...(pr ? { phaseRef: pr } : {}) }, orderBy: { numero: 'asc' }, include: { documents: true } });
    }
    createSP(id, b, r) { return this.svc.createSousPhase(id, b.phaseRef, b.titre, b.notePrestataire, r.user?.userId); }
    updateSP(sid, b, r) { return this.svc.updateSousPhase(sid, { ...b, acteurId: r.user?.userId }); }
    soumettre(sid, r) { return this.svc.updateSousPhase(sid, { statut: 'SOUMISE', acteurId: r.user?.userId }); }
    valider(sid, b, r) { return this.svc.updateSousPhase(sid, { statut: 'VALIDEE', acteurId: r.user?.userId, remarques: b.note }); }
    rejeter(sid, b, r) { return this.svc.updateSousPhase(sid, { statut: 'REJETEE', acteurId: r.user?.userId, noteClient: b.note }); }
    getChats(id, ref) { return this.svc.getChats(id, ref); }
    sendChat(id, ref, b, r) {
        return this.svc.chat(id, ref, r.user?.userId, r.user?.role, b.contenu, { sousPhaseId: b.sousPhaseId, type: b.type, filePath: b.filePath, fileName: b.fileName });
    }
    markRead(id, ref, r) { return this.svc.markRead(id, ref, r.user?.userId); }
    listReu(id, pr) { return this.svc.listReunions(id, pr); }
    createReu(id, b, r) { return this.svc.createReunion(id, b.phaseRef, b, r.user?.userId); }
    updateReu(rid, b) { return this.svc.updateReunion(rid, b); }
    listDev(id, pr) { return this.svc.listDevis(id, pr); }
    createDev(id, b, r) { return this.svc.createDevis(id, b.phaseRef, r.user?.userId, b.titre, b.lignes, b); }
    updateDevStatut(did, b) { return this.svc.updateDevisStatut(did, b.statut, b.note); }
    listFac(id, pr) { return this.svc.listFactures(id, pr); }
    createFac(id, b, r) { return this.svc.createFacture(id, b.phaseRef, r.user?.userId, b.titre, b.lignes, b); }
    paiement(fid, b) { return this.svc.paiement(fid, b.montantPaye, b.modePaiement, b.reference); }
    hist(id, pr) { return this.svc.getHistorique(id, pr); }
};
exports.SousPhaseController = SousPhaseController;
__decorate([
    (0, common_1.Get)('complet'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "complet", null);
__decorate([
    (0, common_1.Get)('phase/:ref/snapshot'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('ref')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "snapshot", null);
__decorate([
    (0, common_1.Get)('sous-phases'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('phaseRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "listSP", null);
__decorate([
    (0, common_1.Post)('sous-phases'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "createSP", null);
__decorate([
    (0, common_1.Patch)('sous-phases/:sid'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "updateSP", null);
__decorate([
    (0, common_1.Post)('sous-phases/:sid/soumettre'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "soumettre", null);
__decorate([
    (0, common_1.Post)('sous-phases/:sid/valider'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "valider", null);
__decorate([
    (0, common_1.Post)('sous-phases/:sid/rejeter'),
    __param(0, (0, common_1.Param)('sid')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "rejeter", null);
__decorate([
    (0, common_1.Get)('phase/:ref/chat'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('ref')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "getChats", null);
__decorate([
    (0, common_1.Post)('phase/:ref/chat'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('ref')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "sendChat", null);
__decorate([
    (0, common_1.Post)('phase/:ref/chat/read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('ref')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "markRead", null);
__decorate([
    (0, common_1.Get)('reunions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('phaseRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "listReu", null);
__decorate([
    (0, common_1.Post)('reunions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "createReu", null);
__decorate([
    (0, common_1.Patch)('reunions/:rid'),
    __param(0, (0, common_1.Param)('rid')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "updateReu", null);
__decorate([
    (0, common_1.Get)('devis'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('phaseRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "listDev", null);
__decorate([
    (0, common_1.Post)('devis'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "createDev", null);
__decorate([
    (0, common_1.Patch)('devis/:did/statut'),
    __param(0, (0, common_1.Param)('did')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "updateDevStatut", null);
__decorate([
    (0, common_1.Get)('factures'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('phaseRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "listFac", null);
__decorate([
    (0, common_1.Post)('factures'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "createFac", null);
__decorate([
    (0, common_1.Post)('factures/:fid/paiement'),
    __param(0, (0, common_1.Param)('fid')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "paiement", null);
__decorate([
    (0, common_1.Get)('historique'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('phaseRef')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SousPhaseController.prototype, "hist", null);
exports.SousPhaseController = SousPhaseController = __decorate([
    (0, common_1.Controller)('p2/dossier/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sous_phase_service_1.SousPhaseService])
], SousPhaseController);
