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
exports.UploadsController = void 0;
/**
 * UploadsController — points d'entrée upload présigné.
 *   POST /uploads/presign       → renvoie {uploadUrl, publicUrl, key, ...}
 *   PUT  /uploads/objects/*     → DEV/LOCAL uniquement : reçoit le binaire après vérif du jeton signé
 *
 * En production avec R2, le client PUT directement à R2 ; ce contrôleur n'expose
 * alors que `/uploads/presign`.
 */
const common_1 = require("@nestjs/common");
const node_path_1 = require("node:path");
const tome_at_1 = require("../../tomes/tome-at");
const object_storage_service_1 = require("./object-storage.service");
const local_driver_1 = require("./drivers/local.driver");
let UploadsController = class UploadsController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async presign(req, body) {
        if (!body?.mime || !body?.size || !body?.kind) {
            throw new common_1.BadRequestException("mime, size, kind requis");
        }
        const ownerKey = String(req.user?.userId ?? req.user?.id ?? "anonymous")
            .replace(/[^A-Za-z0-9_\-:.]/g, "_")
            .slice(0, 32);
        try {
            const out = await this.storage.presign({
                mime: body.mime,
                size: Number(body.size),
                kind: body.kind,
                ownerKey,
            });
            return { ok: true, data: out };
        }
        catch (e) {
            throw new common_1.BadRequestException(e?.message || "presign refusé");
        }
    }
    // DEV/LOCAL UNIQUEMENT — réception PUT d'un objet via jeton signé.
    // En production avec R2, ce point n'est jamais appelé (le PUT va à R2).
    async putLocalObject(req) {
        const key = req.params[0] || "";
        const q = req.query || {};
        const sig = String(q.sig || "");
        const exp = String(q.exp || "");
        const mime = String(q.mime || "");
        const size = String(q.size || "");
        if (!sig || !(0, local_driver_1.verifyLocalToken)(key, exp, mime, size, sig)) {
            throw new common_1.BadRequestException("token invalide ou expiré");
        }
        const max = Number(size);
        if (!Number.isFinite(max) || max <= 0)
            throw new common_1.BadRequestException("size invalide");
        const body = await new Promise((resolve, reject) => {
            const chunks = [];
            let total = 0;
            req.on("data", (c) => {
                total += c.length;
                if (total > max) {
                    req.destroy();
                    reject(new common_1.BadRequestException("Taille excédée"));
                    return;
                }
                chunks.push(c);
            });
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
        });
        if (body.length !== max)
            throw new common_1.BadRequestException("Taille inattendue");
        const uploadsDir = process.env.UPLOADS_DIR || (0, node_path_1.join)(process.cwd(), "uploads");
        await (0, local_driver_1.writeLocalObject)(uploadsDir, key, body);
        return { ok: true, key };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)("presign"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "presign", null);
__decorate([
    (0, common_1.Put)("objects/*"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "putLocalObject", null);
exports.UploadsController = UploadsController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("uploads"),
    __metadata("design:paramtypes", [object_storage_service_1.ObjectStorageService])
], UploadsController);
