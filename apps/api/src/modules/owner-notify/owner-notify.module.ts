import { Module } from '@nestjs/common';
import { OwnerNotifyService } from './owner-notify.service';

@Module({ providers: [OwnerNotifyService], exports: [OwnerNotifyService] })
export class OwnerNotifyModule {}
