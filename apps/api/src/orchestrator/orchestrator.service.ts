import { Injectable } from "@nestjs/common";

import { TomePipelineService } from "./tome-pipeline.service";

@Injectable()
export class OrchestratorService {
  constructor(private readonly pipeline: TomePipelineService) {}

  health() {
    return {
      ok: true,
      pipeline: this.pipeline.health(),
      at: new Date().toISOString(),
    };
  }
}
