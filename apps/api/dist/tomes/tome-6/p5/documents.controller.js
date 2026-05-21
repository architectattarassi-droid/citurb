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
exports.P5DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const tome_at_1 = require("../../tome-at");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
/**
 * P5 Documents Controller — upload des documents officiels (extrait Mohafadati,
 * titre foncier, plan parcellaire) en amont de la création du dossier.
 *
 * Doctrine : endpoint PUBLIC (pas d'auth) pour permettre l'upload avant signup,
 * mais avec garde-fous stricts :
 *   - Taille max 10 Mo
 *   - Mimetype PDF / JPG / PNG / WEBP / HEIC uniquement
 *   - Nom de fichier généré aléatoirement (impossible à deviner)
 *   - Stocké dans /uploads/p5-documents/
 *
 * L'URL retournée est ensuite passée dans brief.mohafadatiDocument lors de
 * l'intake. Le fichier est rattaché au dossier par l'admin si nécessaire.
 */
const UPLOAD_BASE = process.env.UPLOADS_DIR || (0, path_1.join)(process.cwd(), "uploads");
const P5_DOC_DIR = (0, path_1.join)(UPLOAD_BASE, "p5-documents");
try {
    (0, fs_1.mkdirSync)(P5_DOC_DIR, { recursive: true });
}
catch { }
const ALLOWED = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/i;
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
let P5DocumentsController = class P5DocumentsController {
    async upload(file) {
        if (!file)
            throw new common_1.BadRequestException("Aucun fichier reçu");
        if (!ALLOWED.test(file.mimetype)) {
            throw new common_1.BadRequestException(`Type ${file.mimetype} non autorisé`);
        }
        // Nom aléatoire pour éviter toute fuite (URL non devinable)
        const ext = (file.originalname.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const slug = (0, crypto_1.randomBytes)(12).toString("hex");
        const stored = `${slug}.${ext}`;
        const full = (0, path_1.join)(P5_DOC_DIR, stored);
        (0, fs_1.writeFileSync)(full, file.buffer);
        // Le nom UTF-8 d'origine (réencodé depuis latin1 fourni par multer)
        const originalUtf8 = Buffer.from(file.originalname, "latin1").toString("utf8");
        return {
            ok: true,
            url: `/uploads/p5-documents/${stored}`,
            filename: originalUtf8,
            size: file.size,
            mimetype: file.mimetype,
        };
    }
};
exports.P5DocumentsController = P5DocumentsController;
__decorate([
    (0, common_1.Post)("upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        limits: { fileSize: MAX_BYTES },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], P5DocumentsController.prototype, "upload", null);
exports.P5DocumentsController = P5DocumentsController = __decorate([
    (0, tome_at_1.Tome)("tome6"),
    (0, common_1.Controller)("p5/documents")
], P5DocumentsController);
