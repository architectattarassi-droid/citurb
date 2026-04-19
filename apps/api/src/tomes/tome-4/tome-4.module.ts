import { Module } from "@nestjs/common";
import { P4Module } from "./p4/p4.module";
import { Tome4Service } from "./tome-4.service";
import { PublicController } from "./public/public.controller";
import { P1DemoController } from "./public/p1-demo.controller";
import { P1DemoService } from "./public/p1-demo.service";
import { P1PacksEmailController } from "./public/p1-packs-email.controller";
import { P1PacksSmsController } from "./public/p1-packs-sms.controller";
import { P1PacksQuoteController } from "./public/p1-packs-quote.controller";
import { P1PacksQuoteService } from "./public/p1-packs-quote.service";
import { PrismaModule } from "../tome-at/kernel/prisma/prisma.module";
import { OtpService } from "../../modules/otp/otp.service";

@Module({
  imports: [P4Module, PrismaModule],
  controllers: [PublicController, P1DemoController, P1PacksEmailController, P1PacksSmsController, P1PacksQuoteController],
  providers: [Tome4Service, P1DemoService, OtpService, P1PacksQuoteService],
  exports: [Tome4Service, P4Module],
})
export class Tome4Module {}
