"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.P2Module = void 0;
const common_1 = require("@nestjs/common");
const p2_controller_1 = require("./p2.controller");
const dossier_service_1 = require("./dossier.service");
const reminder_service_1 = require("./reminder.service");
const tome_at_1 = require("../../tome-at");
const area_controller_1 = require("./area/area.controller");
const area_service_1 = require("./area/area.service");
const owner_notify_module_1 = require("../../../modules/owner-notify/owner-notify.module");
const storage_module_1 = require("../../../modules/storage/storage.module");
const phase_engine_module_1 = require("../../../modules/phase-engine/phase-engine.module");
const messagerie_module_1 = require("../../../modules/messagerie/messagerie.module");
let P2Module = class P2Module {
};
exports.P2Module = P2Module;
exports.P2Module = P2Module = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, owner_notify_module_1.OwnerNotifyModule, storage_module_1.StorageModule, phase_engine_module_1.PhaseEngineModule, messagerie_module_1.MessagerieModule],
        controllers: [p2_controller_1.P2Controller, area_controller_1.AreaController],
        providers: [dossier_service_1.DossierService, area_service_1.AreaService, reminder_service_1.ReminderService],
    })
], P2Module);
