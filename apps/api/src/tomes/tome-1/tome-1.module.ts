import { Module } from "@nestjs/common";
import { Tome1Service } from "./tome-1.service";
import { PackValidationService } from "./pack-validation.service";
import { PackValidationController } from "./pack-validation.controller";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeCheckoutController } from "./stripe-checkout.controller";
import { UniversalContractService } from "./universal-contract.service";
import { UniversalContractController } from "./universal-contract.controller";
import { PrismaModule } from "../tome-at";
import { Tome5AuthModule } from "../tome-5/auth/auth.module";
import { ClientNotifyModule } from "../../modules/client-notify/client-notify.module";

@Module({
  imports: [PrismaModule, Tome5AuthModule, ClientNotifyModule],
  controllers: [PackValidationController, StripeWebhookController, StripeCheckoutController, UniversalContractController],
  providers: [Tome1Service, PackValidationService, UniversalContractService],
  exports: [Tome1Service, PackValidationService, UniversalContractService],
})
export class Tome1Module {}
