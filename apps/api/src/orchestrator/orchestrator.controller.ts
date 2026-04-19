import { Controller, Get } from "@nestjs/common";

import { OrchestratorService } from "./orchestrator.service";
import { Tome } from '../tomes/tome-at';

@Tome('tome_at')
@Controller("orchestrator")
export class OrchestratorController {
  constructor(private readonly orchestrator: OrchestratorService) {}

  @Get("health")
  health() {
    return this.orchestrator.health();
  }
}
