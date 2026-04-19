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
exports.FirmController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const firm_service_1 = require("./firm.service");
let FirmController = class FirmController {
    firmService;
    constructor(firmService) {
        this.firmService = firmService;
    }
    async seedDefault() {
        return this.firmService.seedDefault();
    }
    async create(body) {
        return this.firmService.create(body);
    }
    async findAll() {
        return this.firmService.findAll();
    }
    async findBySlug(slug) {
        return this.firmService.findBySlug(slug);
    }
    async update(id, body) {
        return this.firmService.update(id, body);
    }
    async assignUser(id, userId) {
        return this.firmService.assignUserToFirm(userId, id);
    }
    async listUsers(id) {
        return this.firmService.listFirmUsers(id);
    }
    async listDossiers(id) {
        return this.firmService.listFirmDossiers(id);
    }
};
exports.FirmController = FirmController;
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)('seed-default'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "seedDefault", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Post)(':id/users/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "assignUser", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)(':id/users'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "listUsers", null);
__decorate([
    (0, common_1.UseGuards)(tome_at_1.JwtAuthGuard),
    (0, common_1.Get)(':id/dossiers'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirmController.prototype, "listDossiers", null);
exports.FirmController = FirmController = __decorate([
    (0, common_1.Controller)('firms'),
    __metadata("design:paramtypes", [firm_service_1.FirmService])
], FirmController);
