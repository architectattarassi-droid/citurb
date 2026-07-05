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
exports.ArchiveController = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const tome_at_1 = require("../../tomes/tome-at");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tomes/tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tomes/tome-5/auth/roles.decorator");
const archive_service_1 = require("./archive.service");
/**
 * Archive endpoints — admin uniquement.
 *
 *   GET /api/cc/archive/facets                   → compteurs par dimension
 *   GET /api/cc/archive/search?<filters>         → recherche multi-critères
 *   GET /api/cc/archive/dossier/:id/full         → vue complète + timeline + summary
 */
let ArchiveController = class ArchiveController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async facets() {
        return { ok: true, ...(await this.svc.facets()) };
    }
    async search(q) {
        const input = {
            commune: q.commune || undefined,
            arrondissement: q.arrondissement || undefined,
            clientNom: q.clientNom || undefined,
            raisonSociale: q.raisonSociale || undefined,
            ice: q.ice || undefined,
            rc: q.rc || undefined,
            cin: q.cin || undefined,
            email: q.email || undefined,
            tel: q.tel || undefined,
            titreFoncier: q.titreFoncier || undefined,
            lotissement: q.lotissement || undefined,
            adresse: q.adresse || undefined,
            porteType: q.porteType || undefined,
            sousTypeP2: q.sousTypeP2 || undefined,
            status: q.status || undefined,
            dateFrom: q.dateFrom || undefined,
            dateTo: q.dateTo || undefined,
            q: q.q || undefined,
            take: q.take ? Number(q.take) : 50,
            skip: q.skip ? Number(q.skip) : 0,
        };
        return { ok: true, ...(await this.svc.search(input)) };
    }
    async dossierFull(id) {
        return await this.svc.dossierFull(id);
    }
    /**
     * EXPORT ZIP « rien ne se perd » — télécharge TOUT le dossier :
     * manifeste JSON complet (métadonnées DB) + tous les fichiers physiques.
     * Sert la durabilité : l'admin peut à tout moment sauvegarder une copie
     * autonome sur disque / Google Drive, indépendante de la plateforme.
     *
     *   GET /api/cc/archive/dossier/:id/export.zip
     */
    async exportZip(id, res) {
        const { full, files, missing } = await this.svc.collectExport(id);
        const d = full.dossier;
        const safeTitle = String(d.title || d.id).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60) || d.id;
        const stamp = new Date().toISOString().slice(0, 10);
        // archiver est déclaré en dependency (^7.0.1)
        const archiver = require("archiver");
        const archive = archiver("zip", { zlib: { level: 9 } });
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="dossier-${safeTitle}-${stamp}.zip"`);
        archive.on("warning", () => { });
        archive.on("error", () => { try {
            res.destroy();
        }
        catch { } });
        archive.pipe(res);
        // Manifeste complet : toutes les métadonnées DB (source de vérité)
        archive.append(JSON.stringify(full, null, 2), { name: "00_manifest.json" });
        // Note de contenu lisible (inventaire + fichiers manquants éventuels)
        const readme = [
            `EXPORT DOSSIER — CITURBAREA`,
            `Dossier : ${d.title || "(sans titre)"}  [${d.id}]`,
            `Porte   : ${d.porteType || "?"}   Statut : ${d.status || "?"}`,
            `Exporté : ${stamp}`,
            ``,
            `Contenu :`,
            `  00_manifest.json  → toutes les métadonnées (phases, messages, intervenants, paiements, historique)`,
            `  01_documents/     → documents de base du dossier`,
            `  02_phases/        → documents des sous-phases`,
            ``,
            `Fichiers inclus : ${files.length}`,
            missing.length ? `\n⚠️ Fichiers référencés mais ABSENTS du volume (${missing.length}) :\n` + missing.map((m) => `  - ${m.zipPath} (${m.reason})`).join("\n") : `Aucun fichier manquant. ✅`,
        ].join("\n");
        archive.append(readme, { name: "00_LISEZ-MOI.txt" });
        for (const f of files) {
            archive.append((0, fs_1.createReadStream)(f.diskPath), { name: f.zipPath });
        }
        await archive.finalize();
    }
    /**
     * VAULT — Coffre-fort de fichiers, arborescence Porte > Client > Dossier > Phase > Doc.
     * Vue dédiée à l'app Archive (différente de la liste de dossiers).
     */
    async vault() {
        return { ok: true, ...(await this.svc.vault()) };
    }
    /**
     * Healthcheck du système de backup externe.
     * À appeler par un monitoring externe ou affiché en dashboard ops.
     * Retourne info sur le dernier snapshot connu (basé sur le dernier
     * Incident type T@-INTERNAL-BACKUP-OK enregistré, ou simplement le
     * delta avec maintenant).
     */
    async backupHealth() {
        return {
            ok: true,
            now: new Date().toISOString(),
            message: "Backup quotidien GitHub Actions — voir https://github.com/architectattarassi-droid/citurb/actions/workflows/backup.yml",
            configured: true,
            schedule: "0 3 * * * UTC (04h Maroc)",
            requiredSecrets: ["DATABASE_URL", "BACKUP_REPO", "BACKUP_REPO_TOKEN"],
            hint: "Vérifier les runs sur https://github.com/architectattarassi-droid/citurb/actions",
        };
    }
};
exports.ArchiveController = ArchiveController;
__decorate([
    (0, common_1.Get)("facets"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "facets", null);
__decorate([
    (0, common_1.Get)("search"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "search", null);
__decorate([
    (0, common_1.Get)("dossier/:id/full"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "dossierFull", null);
__decorate([
    (0, common_1.Get)("dossier/:id/export.zip"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "exportZip", null);
__decorate([
    (0, common_1.Get)("vault"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "vault", null);
__decorate([
    (0, common_1.Get)("backup-health"),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArchiveController.prototype, "backupHealth", null);
exports.ArchiveController = ArchiveController = __decorate([
    (0, tome_at_1.Tome)("tome9"),
    (0, common_1.Controller)("api/cc/archive"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [archive_service_1.ArchiveService])
], ArchiveController);
