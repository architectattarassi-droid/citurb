import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Tome10FinancingService } from "./tome-10.service";
import { Tome } from '../tome-at';

/**
 * NOTE: endpoints sont volontairement simples (stubs) pour ne pas casser le monorepo.
 * L'implémentation réelle doit passer par Orchestrator + Guards (T@ + T3).
 */
@Tome('tome10')
@Controller("t10/financing")
export class Tome10FinancingController {
  constructor(private readonly svc: Tome10FinancingService) {}

  @Get("projects/:projectId/eligibility")
  async getEligibility(@Param("projectId") projectId: string) {
    return this.svc.getEligibility(projectId);
  }

  @Post("projects/:projectId/prequal")
  async createPrequal(
    @Param("projectId") projectId: string,
    @Body() body: { household?: any; projectBudgetHint?: number; cityHint?: string }
  ) {
    return this.svc.createOrUpdatePrequal(projectId, body);
  }

  @Post("projects/:projectId/dossier")
  async buildBankDossier(
    @Param("projectId") projectId: string,
    @Body() body: { bankPartnerId?: string; consent?: boolean }
  ) {
    return this.svc.buildBankDossier(projectId, body);
  }
}
