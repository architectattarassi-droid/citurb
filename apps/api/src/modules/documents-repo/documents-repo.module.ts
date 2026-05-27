import { Module } from "@nestjs/common";
import { PrismaModule } from "../../tomes/tome-at/kernel/prisma/prisma.module";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { DocumentsRepoController } from "./documents-repo.controller";
import { DocumentsRepoService } from "./documents-repo.service";
import { ESignatureService } from "./e-signature.service";

/**
 * Documents Repository (Tome 7) — module NestJS.
 *
 * Importe :
 *  - PrismaModule (global, mais déclaré pour clarté)
 *  - KernelModule (ProbativeLogService)
 *  - Tome5AuthModule (JwtAuthGuard)
 *  - EmailModule (global, injection directe d'EmailService)
 */
@Module({
  imports: [PrismaModule, KernelModule, Tome5AuthModule],
  controllers: [DocumentsRepoController],
  providers: [DocumentsRepoService, ESignatureService],
  exports: [DocumentsRepoService, ESignatureService],
})
export class DocumentsRepoModule {}
