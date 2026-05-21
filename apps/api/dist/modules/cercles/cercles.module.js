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
const jwt_1 = require("@nestjs/jwt");
const tome_at_1 = require("../../tomes/tome-at");
const auth_module_1 = require("../../tomes/tome-5/auth/auth.module");
const cercles_service_1 = require("./cercles.service");
const memberships_service_1 = require("./memberships.service");
const posts_service_1 = require("./posts.service");
const rooms_service_1 = require("./rooms.service");
const livekit_service_1 = require("./livekit.service");
const encryption_service_1 = require("./encryption.service");
const annuaire_service_1 = require("./annuaire.service");
const feed_service_1 = require("./feed.service");
const seed_cercles_service_1 = require("./seed-cercles.service");
const messages_service_1 = require("./messages.service");
const messages_stream_service_1 = require("./messages-stream.service");
const jaas_service_1 = require("./jaas.service");
const cercle_invitations_service_1 = require("./cercle-invitations.service");
const associations_service_1 = require("./associations.service");
const cercles_controller_1 = require("./cercles.controller");
const messages_controller_1 = require("./messages.controller");
const cercle_invitations_controller_1 = require("./cercle-invitations.controller");
const associations_controller_1 = require("./associations.controller");
const direct_messages_service_1 = require("./direct-messages.service");
const direct_messages_stream_service_1 = require("./direct-messages-stream.service");
const direct_messages_controller_1 = require("./direct-messages.controller");
const general_feed_controller_1 = require("./general-feed.controller");
const marketplace_service_1 = require("./marketplace.service");
const marketplace_controller_1 = require("./marketplace.controller");
const pro_access_guard_1 = require("./pro-access.guard");
let CerclesModule = class CerclesModule {
};
exports.CerclesModule = CerclesModule;
exports.CerclesModule = CerclesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            tome_at_1.PrismaModule,
            auth_module_1.Tome5AuthModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET || "dev-secret-change-me",
                signOptions: { expiresIn: "7d" },
            }),
        ],
        controllers: [cercles_controller_1.CerclesController, messages_controller_1.MessagesController, cercle_invitations_controller_1.CercleInvitationsController, associations_controller_1.AssociationsController, direct_messages_controller_1.DirectMessagesController, general_feed_controller_1.GeneralFeedController, marketplace_controller_1.MarketplaceController],
        providers: [
            cercles_service_1.CerclesService,
            memberships_service_1.MembershipsService,
            posts_service_1.PostsService,
            rooms_service_1.RoomsService,
            livekit_service_1.LiveKitService,
            encryption_service_1.EncryptionService,
            annuaire_service_1.AnnuaireService,
            feed_service_1.FeedService,
            seed_cercles_service_1.SeedCerclesService,
            messages_service_1.MessagesService,
            messages_stream_service_1.MessagesStreamService,
            jaas_service_1.JaasService,
            cercle_invitations_service_1.CercleInvitationsService,
            associations_service_1.AssociationsService,
            direct_messages_service_1.DirectMessagesService,
            direct_messages_stream_service_1.DirectMessagesStreamService,
            marketplace_service_1.MarketplaceService,
            pro_access_guard_1.ProAccessGuard,
        ],
        exports: [
            cercles_service_1.CerclesService,
            memberships_service_1.MembershipsService,
            posts_service_1.PostsService,
            rooms_service_1.RoomsService,
            annuaire_service_1.AnnuaireService,
            feed_service_1.FeedService,
            messages_service_1.MessagesService,
            direct_messages_service_1.DirectMessagesService,
        ],
    })
], CerclesModule);
