import { Injectable } from "@nestjs/common";
import { PrismaService } from "../tomes/tome-at/kernel/prisma/prisma.service";

@Injectable()
export class CCSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async current() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dossiersTotal, leadsNew, approved, submitted, incidents] = await Promise.all([
      this.prisma.dossier.count(),
      this.prisma.dossier.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.dossier.count({ where: { status: "APPROVED" as any } }),
      this.prisma.dossier.count({ where: { status: { in: ["SUBMITTED", "NEEDS_CHANGES"] as any } } }),
      this.prisma.incident.count().catch(() => 0),
    ]);

    return {
      ytSubscribers: 0,
      emailsCollected: 0,
      leadsNew,
      consultationsDone: 0,
      projectsActive: submitted,
      revenueMois: 0,
      dossierCount: dossiersTotal,
      blockedCount: incidents,
      approvedCount: approved,
      funnel: [
        { name: "YouTube Views", value: 0, color: "#ff4444" },
        { name: "Email Signups", value: 0, color: "#f59e0b" },
        { name: "Leads", value: leadsNew, color: "#0088ff" },
        { name: "Consultations", value: 0, color: "#00d4aa" },
        { name: "Clients CITURBAREA", value: approved, color: "#34d399" },
      ],
    };
  }
}
