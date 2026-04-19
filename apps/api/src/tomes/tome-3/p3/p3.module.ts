import { Module } from "@nestjs/common";
import { P3Controller } from "./p3.controller";
import { DossierStateMachineService } from "../state-machine.service";
import { DossierService } from "../../tome-2/p2/dossier.service";
import { PrismaModule } from "../../tome-at";
import { OwnerNotifyModule } from "../../../modules/owner-notify/owner-notify.module";
import { StorageModule } from "../../../modules/storage/storage.module";
import { PhaseEngineModule } from "../../../modules/phase-engine/phase-engine.module";
import { MessagerieModule } from "../../../modules/messagerie/messagerie.module";

@Module({
  imports: [PrismaModule, OwnerNotifyModule, StorageModule, PhaseEngineModule, MessagerieModule],
  controllers: [P3Controller],
  providers: [DossierStateMachineService, DossierService],
  exports: [DossierStateMachineService],
})
export class P3Module {}
