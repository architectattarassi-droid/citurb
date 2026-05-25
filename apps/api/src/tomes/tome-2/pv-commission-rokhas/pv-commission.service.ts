/**
 * Tome 2 — PV Commission Rokhas — Service
 *
 * Service principal :
 *  - upload PDF (stockage disque + métadonnées)
 *  - déclenche parsing → workflow
 *  - lecture/listing
 *  - levée de réserve (avec preuve)
 *
 * Persistance :
 *  - Tant que les modèles Prisma `PvCommissionRokhas` / `PvCommissionReserve`
 *    ne sont pas migrés (cf. INTEGRATION.md), on stocke les PVs dans
 *    `Dossier.payload.pvsCommission: PvCommissionRokhasView[]`.
 *    L'API est conçue pour qu'au moment de la migration, seuls 2-3 helpers
 *    `loadPv()` / `savePv()` changent — le reste reste inchangé.
 *
 *  - Quand les modèles Prisma seront disponibles, swap les helpers privés
 *    `_load*` / `_save*` pour utiliser `this.prisma.pvCommissionRokhas.*`.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tome-at";
import { createHash, randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join as joinPath } from "path";
import { PvCommissionParser } from "./pv-commission.parser";
import { PvCommissionWorkflow } from "./pv-commission.workflow";
import type {
  PvCommissionReserveView,
  PvCommissionRokhasView,
  PvStatus,
  ReserveStatus,
  WorkflowOutcome,
} from "./pv-commission.types";

const STORAGE_ROOT = process.env.UPLOADS_DIR
  ? joinPath(process.env.UPLOADS_DIR, "..", "storage", "pv-commission")
  : joinPath(process.cwd(), "apps", "api", "storage", "pv-commission");

@Injectable()
export class PvCommissionService {
  private readonly logger = new Logger(PvCommissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: PvCommissionParser,
    private readonly workflow: PvCommissionWorkflow,
  ) {}

  // ── UPLOAD ────────────────────────────────────────────────────────────────

  /**
   * Stocke un PDF sur disque + crée la fiche PV (status=UPLOADED).
   */
  async uploadPv(opts: {
    dossierId: string;
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    uploadedBy: string;
  }): Promise<PvCommissionRokhasView> {
    const { dossierId, file, uploadedBy } = opts;
    if (!file?.buffer || !file.buffer.length) throw new BadRequestException("Fichier vide");
    if (file.mimetype !== "application/pdf") throw new BadRequestException("Seul le PDF est accepté");
    if (file.size > 15 * 1024 * 1024) throw new BadRequestException("Fichier trop volumineux (>15 Mo)");

    // Vérifie l'existence du dossier (FK soft)
    const dossier = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { id: true } });
    if (!dossier) throw new NotFoundException("Dossier inconnu");

    const dossierDir = joinPath(STORAGE_ROOT, dossierId);
    await fs.mkdir(dossierDir, { recursive: true });

    const id = `pv_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const filename = `${id}.pdf`;
    const fullPath = joinPath(dossierDir, filename);
    await fs.writeFile(fullPath, file.buffer);

    const hash = createHash("sha256").update(file.buffer).digest("hex");
    const view: PvCommissionRokhasView = {
      id,
      dossierId,
      rokhasReference: null,
      uploadedFileUrl: `/api/pv-commission/${id}/pdf`,
      uploadedAt: new Date().toISOString(),
      parsedAt: null,
      parsedBy: null,
      dateCommission: null,
      communeName: null,
      presents: [],
      decision: null,
      motifsRefus: [],
      reserves: [],
      delaiLegalReponseDays: 60,
      status: "UPLOADED",
      hashSha256: hash,
      parserVersion: null,
      parsingConfidence: null,
    };

    await this._savePv(dossierId, view, { storagePath: fullPath, uploadedBy });
    return view;
  }

  // ── PARSE ─────────────────────────────────────────────────────────────────

  /**
   * Déclenche le parsing du PDF + workflow associé.
   * Idempotent : si déjà parsé, retourne l'état courant.
   */
  async parsePv(pvId: string, actorId: string): Promise<{ pv: PvCommissionRokhasView; workflow: WorkflowOutcome | null }> {
    const ctx = await this._loadPvCtx(pvId);
    if (!ctx) throw new NotFoundException("PV inconnu");

    if (ctx.view.status === "PARSED" || ctx.view.status === "VALIDATED") {
      return { pv: ctx.view, workflow: null };
    }

    // Marque PARSING (idempotence-safe)
    ctx.view.status = "PARSING";
    await this._savePv(ctx.view.dossierId, ctx.view, { storagePath: ctx.storagePath });

    const parsed = await this.parser.parseFile(ctx.storagePath);

    const reserves: PvCommissionReserveView[] = parsed.reserves.map((r) => ({
      id: `res_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      ordre: r.ordre,
      titre: r.titre,
      description: r.description,
      articleLoi: r.articleLoi ?? null,
      severite: r.severite ?? "MINEURE",
      deadlineLevee: this._computeDeadline(parsed.dateCommission, parsed.delaiLegalReponseDays),
      status: "OUVERTE" as ReserveStatus,
      preuveUrl: null,
      leveeAt: null,
      leveeBy: null,
      joursRestants: null,
    }));

    const updated: PvCommissionRokhasView = {
      ...ctx.view,
      rokhasReference: parsed.rokhasReference ?? ctx.view.rokhasReference ?? null,
      dateCommission: parsed.dateCommission ?? null,
      communeName: parsed.communeName ?? null,
      presents: parsed.presents ?? [],
      decision: parsed.decision,
      motifsRefus: parsed.motifsRefus,
      reserves,
      delaiLegalReponseDays: parsed.delaiLegalReponseDays,
      parsedAt: new Date().toISOString(),
      parsedBy: actorId,
      status: "PARSED",
      parserVersion: parsed.parserVersion,
      parsingConfidence: parsed.parsingConfidence,
    };
    // Recalcule joursRestants après save (cohérent avec deadline)
    updated.reserves = updated.reserves.map((r) => ({ ...r, joursRestants: this._joursRestants(r.deadlineLevee) }));

    await this._savePv(updated.dossierId, updated, { storagePath: ctx.storagePath });

    // Déclenche workflow (fire & log, non bloquant pour réponse)
    const workflow = await this.workflow.runFor({
      pvId: updated.id,
      dossierId: updated.dossierId,
      decision: updated.decision!,
      reservesCount: updated.reserves.length,
      triggeredBy: actorId,
    });

    return { pv: updated, workflow };
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  async listByDossier(dossierId: string): Promise<PvCommissionRokhasView[]> {
    const all = await this._loadAllForDossier(dossierId);
    return all.map((v) => this._hydrate(v));
  }

  async getById(pvId: string): Promise<PvCommissionRokhasView> {
    const ctx = await this._loadPvCtx(pvId);
    if (!ctx) throw new NotFoundException("PV inconnu");
    return this._hydrate(ctx.view);
  }

  async getPdfPath(pvId: string): Promise<string> {
    const ctx = await this._loadPvCtx(pvId);
    if (!ctx) throw new NotFoundException("PV inconnu");
    return ctx.storagePath;
  }

  // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────

  async leverReserve(opts: {
    pvId: string;
    reserveId: string;
    preuveUrl: string;
    note?: string;
    leveeBy: string;
  }): Promise<PvCommissionRokhasView> {
    const { pvId, reserveId, preuveUrl, leveeBy } = opts;
    if (!preuveUrl || !preuveUrl.startsWith("/uploads/")) {
      throw new BadRequestException("URL de preuve invalide (doit être un upload interne)");
    }
    const ctx = await this._loadPvCtx(pvId);
    if (!ctx) throw new NotFoundException("PV inconnu");

    const res = ctx.view.reserves.find((r) => r.id === reserveId);
    if (!res) throw new NotFoundException("Réserve inconnue");
    if (res.status === "LEVEE") return this._hydrate(ctx.view); // idempotent
    if (res.status === "FORCLOSE") throw new BadRequestException("Réserve forclose — délai dépassé");

    res.status = "LEVEE";
    res.preuveUrl = preuveUrl;
    res.leveeAt = new Date().toISOString();
    res.leveeBy = leveeBy;

    await this._savePv(ctx.view.dossierId, ctx.view, { storagePath: ctx.storagePath });

    // Si toutes les réserves sont levées → patch payload (état dérivé)
    const allLevees = ctx.view.reserves.every((r) => r.status === "LEVEE");
    if (allLevees) {
      try {
        const d = await this.prisma.dossier.findUnique({ where: { id: ctx.view.dossierId }, select: { payload: true } });
        const cur = (d?.payload as any) || {};
        await this.prisma.dossier.update({
          where: { id: ctx.view.dossierId },
          data: { payload: { ...cur, allReservesLeveesAt: new Date().toISOString() } },
        });
      } catch (e: any) {
        this.logger.warn(`[Reserve] patch dossier failed: ${e?.message}`);
      }
    }

    return this._hydrate(ctx.view);
  }

  // ── WEBHOOK ROKHAS (entrée externe) ───────────────────────────────────────

  /**
   * Reçoit un PV depuis le webhook rokhas.ma (signature HMAC vérifiée
   * en amont par le controller). Format attendu : `{ dossierId, pdfBase64 }`.
   */
  async ingestFromWebhook(payload: { dossierId: string; pdfBase64: string; rokhasReference?: string }): Promise<PvCommissionRokhasView> {
    const buffer = Buffer.from(payload.pdfBase64, "base64");
    const v = await this.uploadPv({
      dossierId: payload.dossierId,
      file: { buffer, originalname: "rokhas-webhook.pdf", mimetype: "application/pdf", size: buffer.length },
      uploadedBy: "system:webhook:rokhas",
    });
    if (payload.rokhasReference) {
      v.rokhasReference = payload.rokhasReference;
      await this._savePv(v.dossierId, v);
    }
    // Auto-parse + workflow
    const r = await this.parsePv(v.id, "system:webhook:rokhas");
    return r.pv;
  }

  // ── INTERNALS (storage abstraction) ───────────────────────────────────────

  /**
   * Stocke un PV dans `Dossier.payload.pvsCommission`.
   * À swap par `prisma.pvCommissionRokhas.upsert(...)` après migration.
   */
  private async _savePv(
    dossierId: string,
    view: PvCommissionRokhasView,
    extras?: { storagePath?: string; uploadedBy?: string },
  ): Promise<void> {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
    if (!d) throw new NotFoundException("Dossier inconnu");
    const cur = (d.payload as any) || {};
    const list: any[] = Array.isArray(cur.pvsCommission) ? cur.pvsCommission : [];
    const idx = list.findIndex((p) => p.id === view.id);
    const record = {
      ...view,
      _storagePath: extras?.storagePath ?? list[idx]?._storagePath,
      _uploadedBy: extras?.uploadedBy ?? list[idx]?._uploadedBy,
    };
    if (idx >= 0) list[idx] = record;
    else list.push(record);
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload: { ...cur, pvsCommission: list } } });
  }

  private async _loadPvCtx(pvId: string): Promise<{ view: PvCommissionRokhasView; storagePath: string } | null> {
    // Scan : on cherche dans tous les dossiers le PV avec cet id.
    // Pour scaler : ajouter un index Dossier.payload.pvIds plus tard.
    const candidates = await this.prisma.dossier.findMany({
      where: { payload: { path: ["pvsCommission"], not: undefined } as any },
      select: { id: true, payload: true },
      take: 500,
    });
    for (const d of candidates) {
      const list: any[] = ((d.payload as any)?.pvsCommission) || [];
      const found = list.find((p) => p.id === pvId);
      if (found) {
        const { _storagePath, ...view } = found;
        return { view: view as PvCommissionRokhasView, storagePath: _storagePath || joinPath(STORAGE_ROOT, d.id, `${pvId}.pdf`) };
      }
    }
    return null;
  }

  private async _loadAllForDossier(dossierId: string): Promise<PvCommissionRokhasView[]> {
    const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
    if (!d) return [];
    const list: any[] = ((d.payload as any)?.pvsCommission) || [];
    return list.map((p) => {
      const { _storagePath, _uploadedBy, ...view } = p;
      return view as PvCommissionRokhasView;
    });
  }

  private _hydrate(v: PvCommissionRokhasView): PvCommissionRokhasView {
    // Recalcule joursRestants et bascule FORCLOSE si délai dépassé
    return {
      ...v,
      reserves: v.reserves.map((r) => {
        const jr = this._joursRestants(r.deadlineLevee);
        const status: ReserveStatus =
          r.status === "LEVEE" ? "LEVEE" :
          r.status === "FORCLOSE" ? "FORCLOSE" :
          (jr !== null && jr < 0) ? "FORCLOSE" :
          r.status;
        return { ...r, joursRestants: jr, status };
      }),
    };
  }

  private _computeDeadline(dateCommission: string | null | undefined, delaiJours: number): string | null {
    if (!dateCommission) return null;
    const d = new Date(dateCommission);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + delaiJours);
    return d.toISOString();
  }

  private _joursRestants(deadlineISO: string | null): number | null {
    if (!deadlineISO) return null;
    const d = new Date(deadlineISO);
    if (Number.isNaN(d.getTime())) return null;
    const diffMs = d.getTime() - Date.now();
    return Math.ceil(diffMs / 86400000);
  }

  // Silence unused vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _silencePvStatus(_: PvStatus) {}
}
