import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../../tome-at";
import { CapsGuard } from "../../../tome-at";
import { RequireCaps } from "../../../tome-at";
import { AreaService } from "./area.service";

@UseGuards(JwtAuthGuard, CapsGuard)
@Tome('tome2')
@Controller("p2")
export class AreaController {
  constructor(private readonly areas: AreaService) {}

  // Read current area (owner or internal roles)
  @RequireCaps("dossier:read")
  @Get("dossier/:id/area")
  async current(@Req() req: any, @Param("id") id: string) {
    const area = await this.areas.current(req.user, id);
    return { ok: true, area };
  }

  @RequireCaps("dossier:read")
  @Get("dossier/:id/area/history")
  async history(@Req() req: any, @Param("id") id: string) {
    const items = await this.areas.history(req.user, id);
    return { ok: true, items };
  }

  // Client may declare a surface, but it never drives decisions
  @RequireCaps("dossier:area:declare")
  @Post("dossier/:id/area/declare")
  async declare(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const valueM2 = Number(body?.valueM2);
    const row = await this.areas.declare(req.user, id, valueM2);
    return { ok: true, area: row };
  }

  // Estimated area from payload facts (internal/system)
  @RequireCaps("dossier:area:estimate")
  @Post("dossier/:id/area/estimate")
  async estimate(@Req() req: any, @Param("id") id: string) {
    const row = await this.areas.estimate(req.user, id);
    return { ok: true, area: row };
  }

  // Verified (ADMIN/OWNER)
  @RequireCaps("dossier:area:verify")
  @Post("dossier/:id/area/verify")
  async verify(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const valueM2 = Number(body?.valueM2);
    const sources = Array.isArray(body?.sources) ? body.sources : [];
    const row = await this.areas.verify(req.user, id, valueM2, sources);
    return { ok: true, area: row };
  }

  // Complexity based on VERIFIED or ESTIMATED only
  @RequireCaps("dossier:read")
  @Get("dossier/:id/complexity")
  async complexity(@Req() req: any, @Param("id") id: string) {
    const res = await this.areas.complexity(req.user, id);
    return { ok: true, complexity: res };
  }
}
