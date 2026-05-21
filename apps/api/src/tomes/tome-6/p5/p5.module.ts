import { Module } from "@nestjs/common";
import { P5Controller } from "./p5.controller";
import { P5QuoteController } from "./quote.controller";
import { P5DocumentsController } from "./documents.controller";
import { P5PricingService } from "./pricing.service";

@Module({
  controllers: [P5Controller, P5QuoteController, P5DocumentsController],
  providers: [P5PricingService],
})
export class P5Module {}
