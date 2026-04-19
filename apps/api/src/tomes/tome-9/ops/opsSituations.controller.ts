import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, Tome } from "../../tome-at";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { RolesGuard } from "../../tome-5/auth/roles.guard";
import { OpsSituationsService } from "./opsSituations.service";

@Tome('tome9')
@Controller("ops")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OPS", "OWNER", "ADMIN")
export class OpsSituationsController {
  constructor(private readonly svc: OpsSituationsService) {}

  @Get("projects/:projectId/situations")
  async list(@Param("projectId") projectId: string) {
    return { ok: true, items: await this.svc.listByProject(projectId) };
  }

  @Post("projects/:projectId/situations")
  async create(@Param("projectId") projectId: string, @Body() body: any) {
    return { ok: true, item: await this.svc.create(projectId, Number(body?.amountDeclared)) };
  }

  @Patch("situations/:id/validate")
  async validate(@Param("id") id: string, @Body() body: any) {
    const patch: any = {};
    for (const k of ["architectOk", "betOk", "controlOk", "topoOk"]) {
      if (typeof body?.[k] === "boolean") patch[k] = body[k];
    }
    return { ok: true, item: await this.svc.setValidation(id, patch) };
  }

  @Post("situations/:id/pay")
  async pay(@Param("id") id: string) {
    return { ok: true, item: await this.svc.pay(id) };
  }
}
