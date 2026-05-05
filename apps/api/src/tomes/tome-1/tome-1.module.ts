import { Module } from "@nestjs/common";
import { Tome1Service } from "./tome-1.service";
import { PackValidationService } from "./pack-validation.service";
import { PackValidationController } from "./pack-validation.controller";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { PrismaModule } from "../tome-at";
import { Tome5AuthModule } from "../tome-5/auth/auth.module";

@Module({
  imports: [PrismaModule, Tome5AuthModule],
  controllers: [PackValidationController, StripeWebhookController],
  providers: [Tome1Service, PackValidationService],
  exports: [Tome1Service, PackValidationService],
})
export class Tome1Module {}
