"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ObjectStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectStorageService = void 0;
/**
 * ObjectStorageService — façade unique pour la génération d'URLs présignées.
 * Sélectionne le driver R2 si les env Cloudflare sont présentes, sinon retombe
 * sur le driver local (dev uniquement, binaire via API — entorse documentée).
 */
const common_1 = require("@nestjs/common");
const object_storage_types_1 = require("./object-storage.types");
const local_driver_1 = require("./drivers/local.driver");
const r2_driver_1 = require("./drivers/r2.driver");
let ObjectStorageService = ObjectStorageService_1 = class ObjectStorageService {
    logger = new common_1.Logger(ObjectStorageService_1.name);
    apiBase = process.env.API_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
    driver() {
        return (0, r2_driver_1.r2EnvIfReady)() ? "r2" : "local";
    }
    async presign(input) {
        (0, object_storage_types_1.validatePresign)(input);
        const r2 = (0, r2_driver_1.r2EnvIfReady)();
        if (r2)
            return (0, r2_driver_1.r2Presign)(input, r2);
        if ((process.env.NODE_ENV || "").toLowerCase() === "production") {
            this.logger.warn("R2 non configuré en production — bascule sur stockage LOCAL (binaire transite par l'API). " +
                "Provisionner R2_ACCOUNT_ID / R2_BUCKET / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_PUBLIC_BASE_URL.");
        }
        return (0, local_driver_1.localPresign)(input, this.apiBase);
    }
};
exports.ObjectStorageService = ObjectStorageService;
exports.ObjectStorageService = ObjectStorageService = ObjectStorageService_1 = __decorate([
    (0, common_1.Injectable)()
], ObjectStorageService);
