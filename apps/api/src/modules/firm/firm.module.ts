import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { FirmService } from './firm.service';
import { FirmController } from './firm.controller';
import { FirmResolverMiddleware } from './firm-resolver.middleware';
import { PrismaModule } from '../../tomes/tome-at';

@Module({
  imports: [PrismaModule],
  controllers: [FirmController],
  providers: [FirmService, FirmResolverMiddleware],
  exports: [FirmService],
})
export class FirmModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FirmResolverMiddleware).forRoutes('*');
  }
}
