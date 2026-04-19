import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { CapsGuard } from "../../tome-at";
import { RequireCaps } from "../../tome-at";

/**
 * P4 v1 — endpoints métier (contracts only)
 * Doctrine: endpoints stables, impl itérative.
 */
@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome4')
@Controller("p4")
export class P4Controller {
  @RequireCaps("data:analytics")
  @Get("status")
  status() {
    return { ok: true, door: "p4", version: "v1" };
  }

@RequireCaps("data:analytics")
@Get("metrics")
metrics() {
  return { ok: true, metrics: [], note: "stub v1" };
}

}
