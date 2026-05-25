"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PvCommissionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvCommissionService = void 0;
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
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const pv_commission_parser_1 = require("./pv-commission.parser");
const pv_commission_workflow_1 = require("./pv-commission.workflow");
const STORAGE_ROOT = process.env.UPLOADS_DIR
    ? (0, path_1.join)(process.env.UPLOADS_DIR, "..", "storage", "pv-commission")
    : (0, path_1.join)(process.cwd(), "apps", "api", "storage", "pv-commission");
let PvCommissionService = PvCommissionService_1 = class PvCommissionService {
    prisma;
    parser;
    workflow;
    logger = new common_1.Logger(PvCommissionService_1.name);
    constructor(prisma, parser, workflow) {
        this.prisma = prisma;
        this.parser = parser;
        this.workflow = workflow;
    }
    // ── UPLOAD ────────────────────────────────────────────────────────────────
    /**
     * Stocke un PDF sur disque + crée la fiche PV (status=UPLOADED).
     */
    async uploadPv(opts) {
        const { dossierId, file, uploadedBy } = opts;
        if (!file?.buffer || !file.buffer.length)
            throw new common_1.BadRequestException("Fichier vide");
        if (file.mimetype !== "application/pdf")
            throw new common_1.BadRequestException("Seul le PDF est accepté");
        if (file.size > 15 * 1024 * 1024)
            throw new common_1.BadRequestException("Fichier trop volumineux (>15 Mo)");
        // Vérifie l'existence du dossier (FK soft)
        const dossier = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { id: true } });
        if (!dossier)
            throw new common_1.NotFoundException("Dossier inconnu");
        const dossierDir = (0, path_1.join)(STORAGE_ROOT, dossierId);
        await fs_1.promises.mkdir(dossierDir, { recursive: true });
        const id = `pv_${(0, crypto_1.randomUUID)().replace(/-/g, "").slice(0, 16)}`;
        const filename = `${id}.pdf`;
        const fullPath = (0, path_1.join)(dossierDir, filename);
        await fs_1.promises.writeFile(fullPath, file.buffer);
        const hash = (0, crypto_1.createHash)("sha256").update(file.buffer).digest("hex");
        const view = {
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
    async parsePv(pvId, actorId) {
        const ctx = await this._loadPvCtx(pvId);
        if (!ctx)
            throw new common_1.NotFoundException("PV inconnu");
        if (ctx.view.status === "PARSED" || ctx.view.status === "VALIDATED") {
            return { pv: ctx.view, workflow: null };
        }
        // Marque PARSING (idempotence-safe)
        ctx.view.status = "PARSING";
        await this._savePv(ctx.view.dossierId, ctx.view, { storagePath: ctx.storagePath });
        const parsed = await this.parser.parseFile(ctx.storagePath);
        const reserves = parsed.reserves.map((r) => ({
            id: `res_${(0, crypto_1.randomUUID)().replace(/-/g, "").slice(0, 12)}`,
            ordre: r.ordre,
            titre: r.titre,
            description: r.description,
            articleLoi: r.articleLoi ?? null,
            severite: r.severite ?? "MINEURE",
            deadlineLevee: this._computeDeadline(parsed.dateCommission, parsed.delaiLegalReponseDays),
            status: "OUVERTE",
            preuveUrl: null,
            leveeAt: null,
            leveeBy: null,
            joursRestants: null,
        }));
        const updated = {
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
            decision: updated.decision,
            reservesCount: updated.reserves.length,
            triggeredBy: actorId,
        });
        return { pv: updated, workflow };
    }
    // ── READ ──────────────────────────────────────────────────────────────────
    async listByDossier(dossierId) {
        const all = await this._loadAllForDossier(dossierId);
        return all.map((v) => this._hydrate(v));
    }
    async getById(pvId) {
        const ctx = await this._loadPvCtx(pvId);
        if (!ctx)
            throw new common_1.NotFoundException("PV inconnu");
        return this._hydrate(ctx.view);
    }
    async getPdfPath(pvId) {
        const ctx = await this._loadPvCtx(pvId);
        if (!ctx)
            throw new common_1.NotFoundException("PV inconnu");
        return ctx.storagePath;
    }
    // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────
    async leverReserve(opts) {
        const { pvId, reserveId, preuveUrl, leveeBy } = opts;
        if (!preuveUrl || !preuveUrl.startsWith("/uploads/")) {
            throw new common_1.BadRequestException("URL de preuve invalide (doit être un upload interne)");
        }
        const ctx = await this._loadPvCtx(pvId);
        if (!ctx)
            throw new common_1.NotFoundException("PV inconnu");
        const res = ctx.view.reserves.find((r) => r.id === reserveId);
        if (!res)
            throw new common_1.NotFoundException("Réserve inconnue");
        if (res.status === "LEVEE")
            return this._hydrate(ctx.view); // idempotent
        if (res.status === "FORCLOSE")
            throw new common_1.BadRequestException("Réserve forclose — délai dépassé");
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
                const cur = d?.payload || {};
                await this.prisma.dossier.update({
                    where: { id: ctx.view.dossierId },
                    data: { payload: { ...cur, allReservesLeveesAt: new Date().toISOString() } },
                });
            }
            catch (e) {
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
    async ingestFromWebhook(payload) {
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
    async _savePv(dossierId, view, extras) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
        if (!d)
            throw new common_1.NotFoundException("Dossier inconnu");
        const cur = d.payload || {};
        const list = Array.isArray(cur.pvsCommission) ? cur.pvsCommission : [];
        const idx = list.findIndex((p) => p.id === view.id);
        const record = {
            ...view,
            _storagePath: extras?.storagePath ?? list[idx]?._storagePath,
            _uploadedBy: extras?.uploadedBy ?? list[idx]?._uploadedBy,
        };
        if (idx >= 0)
            list[idx] = record;
        else
            list.push(record);
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload: { ...cur, pvsCommission: list } } });
    }
    async _loadPvCtx(pvId) {
        // Scan : on cherche dans tous les dossiers le PV avec cet id.
        // Pour scaler : ajouter un index Dossier.payload.pvIds plus tard.
        const candidates = await this.prisma.dossier.findMany({
            where: { payload: { path: ["pvsCommission"], not: undefined } },
            select: { id: true, payload: true },
            take: 500,
        });
        for (const d of candidates) {
            const list = (d.payload?.pvsCommission) || [];
            const found = list.find((p) => p.id === pvId);
            if (found) {
                const { _storagePath, ...view } = found;
                return { view: view, storagePath: _storagePath || (0, path_1.join)(STORAGE_ROOT, d.id, `${pvId}.pdf`) };
            }
        }
        return null;
    }
    async _loadAllForDossier(dossierId) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
        if (!d)
            return [];
        const list = (d.payload?.pvsCommission) || [];
        return list.map((p) => {
            const { _storagePath, _uploadedBy, ...view } = p;
            return view;
        });
    }
    _hydrate(v) {
        // Recalcule joursRestants et bascule FORCLOSE si délai dépassé
        return {
            ...v,
            reserves: v.reserves.map((r) => {
                const jr = this._joursRestants(r.deadlineLevee);
                const status = r.status === "LEVEE" ? "LEVEE" :
                    r.status === "FORCLOSE" ? "FORCLOSE" :
                        (jr !== null && jr < 0) ? "FORCLOSE" :
                            r.status;
                return { ...r, joursRestants: jr, status };
            }),
        };
    }
    _computeDeadline(dateCommission, delaiJours) {
        if (!dateCommission)
            return null;
        const d = new Date(dateCommission);
        if (Number.isNaN(d.getTime()))
            return null;
        d.setDate(d.getDate() + delaiJours);
        return d.toISOString();
    }
    _joursRestants(deadlineISO) {
        if (!deadlineISO)
            return null;
        const d = new Date(deadlineISO);
        if (Number.isNaN(d.getTime()))
            return null;
        const diffMs = d.getTime() - Date.now();
        return Math.ceil(diffMs / 86400000);
    }
    // Silence unused vars
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _silencePvStatus(_) { }
};
exports.PvCommissionService = PvCommissionService;
exports.PvCommissionService = PvCommissionService = PvCommissionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tome_at_1.PrismaService,
        pv_commission_parser_1.PvCommissionParser,
        pv_commission_workflow_1.PvCommissionWorkflow])
], PvCommissionService);
