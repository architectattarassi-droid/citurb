import { Module } from '@nestjs/common';
import { SousPhaseService } from './sous-phase.service';
import { SousPhaseController } from './sous-phase.controller';

@Module({ providers: [SousPhaseService], exports: [SousPhaseService], controllers: [SousPhaseController] })
export class SousPhaseModule {}
