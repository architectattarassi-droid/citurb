import { Module } from "@nestjs/common";
import { P4Controller } from "./p4.controller";
import { P4QuoteController } from "./quote.controller";
import { P4PricingService } from "./pricing.service";

@Module({
  controllers: [P4Controller, P4QuoteController],
  providers: [P4PricingService],
})
export class P4Module {}
