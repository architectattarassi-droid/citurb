"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorageModule = void 0;
/**
 * ObjectStorageModule — façade upload présigné (R2 prod / local dev).
 * Importe Tome5AuthModule pour exposer JwtAuthGuard au contrôleur d'upload.
 */
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const object_storage_service_1 = require("./object-storage.service");
const uploads_controller_1 = require("./uploads.controller");
let ObjectStorageModule = class ObjectStorageModule {
};
exports.ObjectStorageModule = ObjectStorageModule;
exports.ObjectStorageModule = ObjectStorageModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.Tome5AuthModule],
        controllers: [uploads_controller_1.UploadsController],
        providers: [object_storage_service_1.ObjectStorageService],
        exports: [object_storage_service_1.ObjectStorageService],
    })
], ObjectStorageModule);
