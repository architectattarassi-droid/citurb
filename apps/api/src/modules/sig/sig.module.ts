import { Module } from "@nestjs/common";
import { SigController } from "./sig.controller";
import { SigDataService } from "./sig-data.service";
import { ZoneDetectorService } from "./zone-detector.service";

@Module({
  controllers: [SigController],
  providers: [SigDataService, ZoneDetectorService],
  exports: [SigDataService, ZoneDetectorService],
})
export class SigModule {}
