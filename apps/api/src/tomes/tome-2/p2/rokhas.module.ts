import { Module } from '@nestjs/common';
import { RokhasService } from './rokhas.service';
import { RokhasController } from './rokhas.controller';
import { PrismaModule } from '../../tome-at';

@Module({
  imports: [PrismaModule],
  providers: [RokhasService],
  controllers: [RokhasController],
  exports: [RokhasService],
})
export class RokhasModule {}
