import { Module } from '@nestjs/common';
import { LambertService } from './lambert.service';

@Module({
  providers: [LambertService],
  exports: [LambertService],
})
export class GeoModule {}
