import { Injectable } from "@nestjs/common";

@Injectable()
export class P1DemoService {
  // Phase A (P0): stub service to keep module wiring stable.
  // Real demo/preview logic comes later (after engine boots).
  ping() {
    return { ok: true, note: "p1-demo stub" };
  }
}
