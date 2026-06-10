import { Module } from '@nestjs/common';
import { PhaseEngineService } from './phase-engine.service';
import { PhaseEngineController } from './phase-engine.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [PhaseEngineController],
  providers: [PhaseEngineService],
  exports: [PhaseEngineService],
})
export class PhaseEngineModule {}
