import { Module } from "@nestjs/common";
import { PrismaModule } from "../tomes/tome-at/kernel/prisma/prisma.module";
import { LeadFunnelModule } from "../modules/lead-funnel/lead-funnel.module";
import { CCController } from "./cc.controller";
import { CCSnapshotService } from "./cc-snapshot.service";

@Module({
  // LeadFunnelModule importé pour fusionner les leads /api/lead-funnel/capture
  // avec les Dossiers leadQualif (sinon désynchro côté /cc/leads).
  imports: [PrismaModule, LeadFunnelModule],
  controllers: [CCController],
  providers: [CCSnapshotService],
})
export class CCModule {}
