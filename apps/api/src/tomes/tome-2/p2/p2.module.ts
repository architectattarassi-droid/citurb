import { Module } from "@nestjs/common";
import { P2Controller } from "./p2.controller";
import { IntakeController } from "./intake.controller";
import { DossierService } from "./dossier.service";
import { ReminderService } from "./reminder.service";
import { PrismaModule } from "../../tome-at";
import { AreaController } from "./area/area.controller";
import { AreaService } from "./area/area.service";
import { OwnerNotifyModule } from "../../../modules/owner-notify/owner-notify.module";
import { StorageModule } from "../../../modules/storage/storage.module";
import { PhaseEngineModule } from "../../../modules/phase-engine/phase-engine.module";
import { MessagerieModule } from "../../../modules/messagerie/messagerie.module";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, OwnerNotifyModule, StorageModule, PhaseEngineModule, MessagerieModule, Tome5AuthModule],
  controllers: [P2Controller, AreaController, IntakeController],
  providers: [DossierService, AreaService, ReminderService],
})
export class P2Module {}
