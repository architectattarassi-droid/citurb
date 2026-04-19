import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { CapsGuard } from "../../tome-at";
import { RequireCaps } from "../../tome-at";

/**
 * P5 v1 — endpoints métier (contracts only)
 * Doctrine: endpoints stables, impl itérative.
 */
@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome6')
@Controller("p5")
export class P5Controller {
  @RequireCaps("partner:sign")
  @Get("status")
  status() {
    return { ok: true, door: "p5", version: "v1" };
  }

@RequireCaps("partner:sign")
@Post("signature/request")
requestSignature(@Body() body: any) {
  return { ok: true, action: "signature_request", body, note: "stub v1" };
}

}
