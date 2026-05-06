import { Module } from "@nestjs/common";
import { ClientNotifyService } from "./client-notify.service";

@Module({
  providers: [ClientNotifyService],
  exports: [ClientNotifyService],
})
export class ClientNotifyModule {}
