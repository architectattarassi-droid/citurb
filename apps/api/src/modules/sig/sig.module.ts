import { Module } from "@nestjs/common";
import { SigController } from "./sig.controller";
import { SigDataService } from "./sig-data.service";

@Module({
  controllers: [SigController],
  providers: [SigDataService],
  exports: [SigDataService],
})
export class SigModule {}
