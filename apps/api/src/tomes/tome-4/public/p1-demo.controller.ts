import { Controller, Get } from "@nestjs/common";
import { P1DemoService } from "./p1-demo.service";
import { Tome } from '../../tome-at';

@Tome('tome4')
@Controller("tome-4/demo")
export class P1DemoController {
  constructor(private readonly svc: P1DemoService) {}

  @Get("ping")
  ping() {
    return this.svc.ping();
  }
}
