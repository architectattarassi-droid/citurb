import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { CapsGuard } from "../../tome-at";
import { RequireCaps } from "../../tome-at";

/**
 * P6 v1 — endpoints métier (contracts only)
 * Doctrine: endpoints stables, impl itérative.
 */
@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome7')
@Controller("p6")
export class P6Controller {
  @RequireCaps("api:access")
  @Get("status")
  status() {
    return { ok: true, door: "p6", version: "v1" };
  }

@RequireCaps("api:access")
@Get("keys")
keys() {
  return { ok: true, keys: [], note: "stub v1" };
}

}
