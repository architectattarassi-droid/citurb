"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsRepoModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../tomes/tome-at/kernel/prisma/prisma.module");
const kernel_module_1 = require("../kernel/kernel.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const documents_repo_controller_1 = require("./documents-repo.controller");
const documents_repo_service_1 = require("./documents-repo.service");
const e_signature_service_1 = require("./e-signature.service");
/**
 * Documents Repository (Tome 7) — module NestJS.
 *
 * Importe :
 *  - PrismaModule (global, mais déclaré pour clarté)
 *  - KernelModule (ProbativeLogService)
 *  - Tome5AuthModule (JwtAuthGuard)
 *  - EmailModule (global, injection directe d'EmailService)
 */
let DocumentsRepoModule = class DocumentsRepoModule {
};
exports.DocumentsRepoModule = DocumentsRepoModule;
exports.DocumentsRepoModule = DocumentsRepoModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, kernel_module_1.KernelModule, auth_module_1.Tome5AuthModule],
        controllers: [documents_repo_controller_1.DocumentsRepoController],
        providers: [documents_repo_service_1.DocumentsRepoService, e_signature_service_1.ESignatureService],
        exports: [documents_repo_service_1.DocumentsRepoService, e_signature_service_1.ESignatureService],
    })
], DocumentsRepoModule);
