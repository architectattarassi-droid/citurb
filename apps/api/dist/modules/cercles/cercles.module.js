"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CerclesModule = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tomes/tome-at");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const cercles_service_1 = require("./cercles.service");
const memberships_service_1 = require("./memberships.service");
const posts_service_1 = require("./posts.service");
const rooms_service_1 = require("./rooms.service");
const livekit_service_1 = require("./livekit.service");
const encryption_service_1 = require("./encryption.service");
const cercles_controller_1 = require("./cercles.controller");
let CerclesModule = class CerclesModule {
};
exports.CerclesModule = CerclesModule;
exports.CerclesModule = CerclesModule = __decorate([
    (0, common_1.Module)({
        imports: [tome_at_1.PrismaModule, auth_module_1.Tome5AuthModule],
        controllers: [cercles_controller_1.CerclesController],
        providers: [
            cercles_service_1.CerclesService,
            memberships_service_1.MembershipsService,
            posts_service_1.PostsService,
            rooms_service_1.RoomsService,
            livekit_service_1.LiveKitService,
            encryption_service_1.EncryptionService,
        ],
        exports: [cercles_service_1.CerclesService, memberships_service_1.MembershipsService, posts_service_1.PostsService, rooms_service_1.RoomsService],
    })
], CerclesModule);
