import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { CerclesService } from "./cercles.service";
import { MembershipsService } from "./memberships.service";
import { PostsService } from "./posts.service";
import { RoomsService } from "./rooms.service";
import { LiveKitService } from "./livekit.service";
import { EncryptionService } from "./encryption.service";
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
  ],
  exports: [CerclesService, MembershipsService, PostsService, RoomsService],
})
export class CerclesModule {}
