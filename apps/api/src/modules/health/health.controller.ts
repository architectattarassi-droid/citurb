import { Controller, Get } from "@nestjs/common";
import { Tome } from '../../tomes/tome-at';

@Tome('tome_at')
@Controller("/health")
export class HealthController {
  @Get()
  ok() {
    return { ok: true };
  }
}
