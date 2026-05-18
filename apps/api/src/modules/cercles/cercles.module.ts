import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../tomes/tome-at";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { CerclesService } from "./cercles.service";
import { MembershipsService } from "./memberships.service";
import { PostsService } from "./posts.service";
import { RoomsService } from "./rooms.service";
import { LiveKitService } from "./livekit.service";
import { EncryptionService } from "./encryption.service";
import { AnnuaireService } from "./annuaire.service";
import { FeedService } from "./feed.service";
import { SeedCerclesService } from "./seed-cercles.service";
import { MessagesService } from "./messages.service";
import { MessagesStreamService } from "./messages-stream.service";
import { JaasService } from "./jaas.service";
import { CercleInvitationsService } from "./cercle-invitations.service";
import { AssociationsService } from "./associations.service";
import { CerclesController } from "./cercles.controller";
import { MessagesController } from "./messages.controller";
import { CercleInvitationsController } from "./cercle-invitations.controller";
import { AssociationsController } from "./associations.controller";
import { DirectMessagesService } from "./direct-messages.service";
import { DirectMessagesStreamService } from "./direct-messages-stream.service";
import { DirectMessagesController } from "./direct-messages.controller";
import { GeneralFeedController } from "./general-feed.controller";
import { SupplierProductsService } from "./supplier-products.service";
import { MarketplaceController } from "./marketplace.controller";

@Module({
  imports: [
    PrismaModule,
    Tome5AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "dev-secret-change-me",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [CerclesController, MessagesController, CercleInvitationsController, AssociationsController, DirectMessagesController, GeneralFeedController, MarketplaceController],
  providers: [
    CerclesService,
    MembershipsService,
    PostsService,
    RoomsService,
    LiveKitService,
    EncryptionService,
    AnnuaireService,
    FeedService,
    SeedCerclesService,
    MessagesService,
    MessagesStreamService,
    JaasService,
    CercleInvitationsService,
    AssociationsService,
    DirectMessagesService,
    DirectMessagesStreamService,
    SupplierProductsService,
  ],
  exports: [
    CerclesService,
    MembershipsService,
    PostsService,
    RoomsService,
    AnnuaireService,
    FeedService,
    MessagesService,
    DirectMessagesService,
  ],
})
export class CerclesModule {}
