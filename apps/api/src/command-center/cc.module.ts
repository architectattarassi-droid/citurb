import { Module } from "@nestjs/common";
import { PrismaModule } from "../tomes/tome-at/kernel/prisma/prisma.module";
import { CCController } from "./cc.controller";
import { CCSnapshotService } from "./cc-snapshot.service";

@Module({
  imports: [PrismaModule],
  controllers: [CCController],
  providers: [CCSnapshotService],
})
export class CCModule {}
