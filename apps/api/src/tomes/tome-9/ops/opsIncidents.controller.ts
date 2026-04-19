import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-at";
import { Roles } from "../../tome-5/auth/roles.decorator";
import { RolesGuard } from "../../tome-5/auth/roles.guard";

@Tome('tome9')
@Controller("ops/incidents")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OPS", "ADMIN", "OWNER")
export class OpsIncidentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":id")
  async byId(@Param("id") id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    return { incident };
  }

  @Get()
  async list() {
    const incidents = await this.prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { incidents };
  }
}
