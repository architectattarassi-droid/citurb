import { Global, Module } from "@nestjs/common";
import { PrismaDossiersService } from "./prisma-dossiers.service";

@Global()
@Module({
  providers: [PrismaDossiersService],
  exports: [PrismaDossiersService],
})
export class PrismaDossiersModule {}
