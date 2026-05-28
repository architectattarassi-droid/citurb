import { Module } from "@nestjs/common";
import { KernelModule } from "../kernel/kernel.module";
import { Tome5AuthModule } from "../../tomes/tome-5/auth/auth.module";
import { ChefCopiloteController } from "./chef-copilote.controller";
import { ChefCopiloteService } from "./chef-copilote.service";

/**
 * ChefCopiloteModule — copilote IA chef de chantier darija (Tome 3).
 * Wishlist persona Brahim.
 */
@Module({
  imports: [KernelModule, Tome5AuthModule],
  controllers: [ChefCopiloteController],
  providers: [ChefCopiloteService],
  exports: [ChefCopiloteService],
})
export class ChefCopiloteModule {}
