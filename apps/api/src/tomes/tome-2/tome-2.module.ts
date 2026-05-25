import { Module } from "@nestjs/common";
import { P2Module } from "./p2/p2.module";
import { PvChantierModule } from "./pv-chantier/pv-chantier.module";
import { PvCommissionModule } from "./pv-commission-rokhas/pv-commission.module";
import { Tome2Service } from "./tome-2.service";
import { AntiDesintService } from "./anti-desint.service";
import { AntiDesintController } from "./anti-desint.controller";
import { PrismaModule } from "./../tome-at";
import { KernelModule } from "../../modules/kernel/kernel.module";
import { OwnerNotifyModule } from "../../modules/owner-notify/owner-notify.module";
import { Tome5AuthModule } from "../tome-5/auth/auth.module";

@Module({
  imports: [P2Module, PvChantierModule, PvCommissionModule, PrismaModule, KernelModule, OwnerNotifyModule, Tome5AuthModule],
  controllers: [AntiDesintController],
  providers: [Tome2Service, AntiDesintService],
  exports: [Tome2Service, P2Module, PvChantierModule, PvCommissionModule, AntiDesintService],
})
export class Tome2Module {}
