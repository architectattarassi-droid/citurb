import { Injectable } from "@nestjs/common";

import { Tome0Service } from "../tomes/tome-0/tome-0.service";
import { Tome1Service } from "../tomes/tome-1/tome-1.service";
import { Tome2Service } from "../tomes/tome-2/tome-2.service";
import { Tome3Service } from "../tomes/tome-3/tome-3.service";
import { Tome4Service } from "../tomes/tome-4/tome-4.service";
import { Tome6Service } from "../tomes/tome-6/tome-6.service";
import { Tome7Service } from "../tomes/tome-7/tome-7.service";
import { Tome8Service } from "../tomes/tome-8/tome-8.service";
import { Tome10FinancingService } from "../tomes/tome-10/tome-10.service";

@Injectable()
export class TomePipelineService {
  constructor(
    private readonly tome0: Tome0Service,
    private readonly tome1: Tome1Service,
    private readonly tome2: Tome2Service,
    private readonly tome3: Tome3Service,
    private readonly tome4: Tome4Service,
    private readonly tome6: Tome6Service,
    private readonly tome7: Tome7Service,
    private readonly tome8: Tome8Service,
    private readonly tome10: Tome10FinancingService,
  ) {}

  health() {
    // cheap check that DI is wired
    return {
      tome0: !!this.tome0,
      tome1: !!this.tome1,
      tome2: !!this.tome2,
      tome3: !!this.tome3,
      tome4: !!this.tome4,
      // Tome 5 is the auth layer. It is not a pipeline service in V1 P0.
      tome5: false,
      tome6: !!this.tome6,
      tome7: !!this.tome7,
      tome8: !!this.tome8,
      // Tome 9 is ops layer. It is not a pipeline service in V1 P0.
      tome9: false,
      tome10: !!this.tome10,
    };
  }
}
