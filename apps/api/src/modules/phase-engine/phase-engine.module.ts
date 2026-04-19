import { Module } from '@nestjs/common';
import { PhaseEngineService } from './phase-engine.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [PhaseEngineService],
  exports: [PhaseEngineService],
})
export class PhaseEngineModule {}
