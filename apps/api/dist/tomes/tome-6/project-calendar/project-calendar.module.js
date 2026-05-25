"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectCalendarModule = void 0;
const common_1 = require("@nestjs/common");
const project_calendar_controller_1 = require("./project-calendar.controller");
const project_calendar_service_1 = require("./project-calendar.service");
/**
 * ProjectCalendarModule — calendrier projet (Gantt + CPM + tâches) par dossier.
 *
 * Tome 6 — workflows dossiers.
 * PrismaService est exposé en global via PrismaModule (@Global) chargé au
 * niveau du kernel : aucune import explicite nécessaire ici.
 */
let ProjectCalendarModule = class ProjectCalendarModule {
};
exports.ProjectCalendarModule = ProjectCalendarModule;
exports.ProjectCalendarModule = ProjectCalendarModule = __decorate([
    (0, common_1.Module)({
        controllers: [project_calendar_controller_1.ProjectCalendarController],
        providers: [project_calendar_service_1.ProjectCalendarService],
        exports: [project_calendar_service_1.ProjectCalendarService],
    })
], ProjectCalendarModule);
