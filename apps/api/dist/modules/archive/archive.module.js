"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveModule = void 0;
const common_1 = require("@nestjs/common");
const archive_service_1 = require("./archive.service");
const archive_controller_1 = require("./archive.controller");
const prisma_module_1 = require("../../tomes/tome-at/kernel/prisma/prisma.module");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
let ArchiveModule = class ArchiveModule {
};
exports.ArchiveModule = ArchiveModule;
exports.ArchiveModule = ArchiveModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [archive_controller_1.ArchiveController],
        providers: [archive_service_1.ArchiveService],
        exports: [archive_service_1.ArchiveService],
    })
], ArchiveModule);
