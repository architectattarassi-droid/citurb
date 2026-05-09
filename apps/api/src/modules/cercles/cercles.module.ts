import { Module } from "@nestjs/common";
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
import { CerclesController } from "./cercles.controller";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [CerclesController],
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
  ],
  exports: [CerclesService, MembershipsService, PostsService, RoomsService, AnnuaireService, FeedService],
})
export class CerclesModule {}
