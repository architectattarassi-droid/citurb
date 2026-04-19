import { Module } from '@nestjs/common';
import { MessagerieService } from './messagerie.service';

@Module({
  providers: [MessagerieService],
  exports: [MessagerieService],
})
export class MessagerieModule {}
