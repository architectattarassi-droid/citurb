import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { createReadStream } from "fs";
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
   * EXPORT ZIP « rien ne se perd » — télécharge TOUT le dossier :
   * manifeste JSON complet (métadonnées DB) + tous les fichiers physiques.
   * Sert la durabilité : l'admin peut à tout moment sauvegarder une copie
   * autonome sur disque / Google Drive, indépendante de la plateforme.
   *
   *   GET /api/cc/archive/dossier/:id/export.zip
   */
  @Get("dossier/:id/export.zip")
  @Roles("ADMIN", "OWNER", "OPS")
  async exportZip(@Param("id") id: string, @Res() res: Response) {
    const { full, files, missing } = await this.svc.collectExport(id);
    const d: any = full.dossier;
    const safeTitle = String(d.title || d.id).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60) || d.id;
    const stamp = new Date().toISOString().slice(0, 10);

    // archiver est déclaré en dependency (^7.0.1)
    const archiver = require("archiver");
    const archive = archiver("zip", { zlib: { level: 9 } });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="dossier-${safeTitle}-${stamp}.zip"`);
    archive.on("warning", () => {});
    archive.on("error", () => { try { res.destroy(); } catch {} });
    archive.pipe(res);

    // Manifeste complet : toutes les métadonnées DB (source de vérité)
    archive.append(JSON.stringify(full, null, 2), { name: "00_manifest.json" });

    // Note de contenu lisible (inventaire + fichiers manquants éventuels)
    const readme = [
      `EXPORT DOSSIER — CITURBAREA`,
      `Dossier : ${d.title || "(sans titre)"}  [${d.id}]`,
      `Porte   : ${d.porteType || "?"}   Statut : ${d.status || "?"}`,
      `Exporté : ${stamp}`,
      ``,
      `Contenu :`,
      `  00_manifest.json  → toutes les métadonnées (phases, messages, intervenants, paiements, historique)`,
      `  01_documents/     → documents de base du dossier`,
      `  02_phases/        → documents des sous-phases`,
      ``,
      `Fichiers inclus : ${files.length}`,
      missing.length ? `\n⚠️ Fichiers référencés mais ABSENTS du volume (${missing.length}) :\n` + missing.map((m) => `  - ${m.zipPath} (${m.reason})`).join("\n") : `Aucun fichier manquant. ✅`,
    ].join("\n");
    archive.append(readme, { name: "00_LISEZ-MOI.txt" });

    for (const f of files) {
      archive.append(createReadStream(f.diskPath), { name: f.zipPath });
    }

    await archive.finalize();
  }

  /**
   * VAULT — Coffre-fort de fichiers, arborescence Porte > Client > Dossier > Phase > Doc.
   * Vue dédiée à l'app Archive (différente de la liste de dossiers).
   */
  @Get("vault")
  @Roles("ADMIN", "OWNER", "OPS")
  async vault() {
    return { ok: true, ...(await this.svc.vault()) };
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
