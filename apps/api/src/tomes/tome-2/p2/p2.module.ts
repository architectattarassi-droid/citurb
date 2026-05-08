import { Module } from "@nestjs/common";
import { P2Controller } from "./p2.controller";
import { IntakeController } from "./intake.controller";
import { AdminDossierController } from "./admin-dossier.controller";
import { QuoteController } from "./quote.controller";
import { ContractController } from "./contract.controller";
import { VisaCroaController } from "./visa-croa.controller";
import { DossierService } from "./dossier.service";
import { ReminderService } from "./reminder.service";
import { P2PricingService } from "./pricing.service";
import { P2ContractService } from "./contract.service";
import { PrismaModule } from "../../tome-at";
import { AreaController } from "./area/area.controller";
import { AreaService } from "./area/area.service";
import { OwnerNotifyModule } from "../../../modules/owner-notify/owner-notify.module";
import { ClientNotifyModule } from "../../../modules/client-notify/client-notify.module";
import { StorageModule } from "../../../modules/storage/storage.module";
import { PhaseEngineModule } from "../../../modules/phase-engine/phase-engine.module";
import { MessagerieModule } from "../../../modules/messagerie/messagerie.module";
import { Tome5AuthModule } from "../../tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, OwnerNotifyModule, ClientNotifyModule, StorageModule, PhaseEngineModule, MessagerieModule, Tome5AuthModule],
  controllers: [P2Controller, AreaController, IntakeController, AdminDossierController, QuoteController, ContractController, VisaCroaController],
  providers: [DossierService, AreaService, ReminderService, P2PricingService, P2ContractService],
})
export class P2Module {}
