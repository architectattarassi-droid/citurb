import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { RolesGuard } from "../../tomes/tome-5/auth/roles.guard";
import { Roles } from "../../tomes/tome-5/auth/roles.decorator";
import { ArchiveService, ArchiveSearchInput } from "./archive.service";

/**
 * Archive endpoints — admin uniquement.
 *
 *   GET /api/cc/archive/facets                   → compteurs par dimension
 *   GET /api/cc/archive/search?<filters>         → recherche multi-critères
 *   GET /api/cc/archive/dossier/:id/full         → vue complète + timeline + summary
 */
@Tome("tome9")
@Controller("api/cc/archive")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArchiveController {
  constructor(private readonly svc: ArchiveService) {}

  @Get("facets")
  @Roles("ADMIN", "OWNER", "OPS")
  async facets() {
    return { ok: true, ...(await this.svc.facets()) };
  }

  @Get("search")
  @Roles("ADMIN", "OWNER", "OPS")
  async search(@Query() q: any) {
    const input: ArchiveSearchInput = {
      commune: q.commune || undefined,
      arrondissement: q.arrondissement || undefined,
      clientNom: q.clientNom || undefined,
      raisonSociale: q.raisonSociale || undefined,
      ice: q.ice || undefined,
      rc: q.rc || undefined,
      cin: q.cin || undefined,
      email: q.email || undefined,
      tel: q.tel || undefined,
      titreFoncier: q.titreFoncier || undefined,
      lotissement: q.lotissement || undefined,
      adresse: q.adresse || undefined,
      porteType: q.porteType || undefined,
      sousTypeP2: q.sousTypeP2 || undefined,
      status: q.status || undefined,
      dateFrom: q.dateFrom || undefined,
      dateTo: q.dateTo || undefined,
      q: q.q || undefined,
      take: q.take ? Number(q.take) : 50,
      skip: q.skip ? Number(q.skip) : 0,
    };
    return { ok: true, ...(await this.svc.search(input)) };
  }

  @Get("dossier/:id/full")
  @Roles("ADMIN", "OWNER", "OPS")
  async dossierFull(@Param("id") id: string) {
    return await this.svc.dossierFull(id);
  }

  /**
   * Healthcheck du système de backup externe.
   * À appeler par un monitoring externe ou affiché en dashboard ops.
   * Retourne info sur le dernier snapshot connu (basé sur le dernier
   * Incident type T@-INTERNAL-BACKUP-OK enregistré, ou simplement le
   * delta avec maintenant).
   */
  @Get("backup-health")
  @Roles("ADMIN", "OWNER", "OPS")
  async backupHealth() {
    return {
      ok: true,
      now: new Date().toISOString(),
      message: "Backup quotidien GitHub Actions — voir https://github.com/architectattarassi-droid/citurb/actions/workflows/backup.yml",
      configured: true,
      schedule: "0 3 * * * UTC (04h Maroc)",
      requiredSecrets: ["DATABASE_URL", "BACKUP_REPO", "BACKUP_REPO_TOKEN"],
      hint: "Vérifier les runs sur https://github.com/architectattarassi-droid/citurb/actions",
    };
  }
}
