import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { PrismaService } from "../tomes/tome-at/kernel/prisma/prisma.service";
import { CCSnapshotService } from "./cc-snapshot.service";

@Controller("api/cc")
export class CCController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotService: CCSnapshotService,
  ) {}

  @Get("snapshot/current")
  snapshotCurrent() {
    return this.snapshotService.current();
  }

  @Get("media")
  media() {
    return { items: [
      { id: "m1", title: "500 000 DH : نستثمر ولا نبني؟", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
      { id: "m2", title: "5 أخطاء كتخسر الملايين", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 2, views: 0, leads: 0 },
      { id: "m3", title: "Étape 6: التسوية Terrassement", type: "SHORT", status: "PLANNED", weekNumber: 1, views: 0, leads: 0 },
      { id: "m4", title: "بئر الرامي : تحليل شامل", type: "VIDEO_LONG", status: "PLANNED", weekNumber: 3, views: 0, leads: 0 },
    ]};
  }

  @Get("leads")
  async leads() {
    const items = await this.prisma.dossier.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, createdAt: true, title: true, commune: true, status: true },
    });
    return items.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      nom: d.title || "Lead",
      ville: d.commune || "—",
      type: "PARTICULIER",
      source: "SITE",
      status: mapStatus(d.status),
      interet: d.title,
    }));
  }

  @Patch("leads/:id")
  async updateLead() {
    return { ok: true };
  }

  @Post("leads")
  async createLead(@Body() body: any) {
    const item = await this.prisma.dossier.create({
      data: {
        ownerId: body.ownerId || "owner-dev",
        title: body.nom || "Lead manuel",
        commune: body.ville || null,
        payload: body,
      },
    });
    return {
      id: item.id, createdAt: item.createdAt, nom: item.title, ville: item.commune || "—", type: "PARTICULIER", source: "DIRECT", status: "NEW", interet: item.title,
    };
  }
}

function mapStatus(status: string): string {
  if (status === "APPROVED") return "CLIENT";
  if (status === "SUBMITTED") return "QUALIFIED";
  if (status === "NEEDS_CHANGES") return "CONTACTED";
  return "NEW";
}
