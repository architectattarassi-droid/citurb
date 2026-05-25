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
var PvChantierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PvChantierService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../../../modules/kernel/services/probative-log.service");
const pv_chantier_types_1 = require("./pv-chantier.types");
/**
 * PvChantierService — orchestration des PV de chantier (Tome 2).
 *
 * Persistance : tant que les tables Prisma `PvChantier` ne sont pas migrées,
 * les PV sont stockés en JSON dans `Dossier.payload.pvChantier[]`.
 * Le contrat externe (API + types) reste identique après migration —
 * il suffira de remplacer les helpers `readBag`/`writeBag` par des appels Prisma.
 */
let PvChantierService = PvChantierService_1 = class PvChantierService {
    prisma;
    probative;
    logger = new common_1.Logger(PvChantierService_1.name);
    storageRoot;
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
        // Cohérence avec les autres modules (apps/api/storage/...)
        this.storageRoot = process.env.PV_STORAGE_ROOT
            ?? path.resolve(process.cwd(), "apps/api/storage/pv-chantier");
    }
    // ───────────────────────────────────────────────────────── List / Get
    async list(dossierId) {
        const dossier = await this.loadDossier(dossierId);
        const bag = this.readBag(dossier);
        return bag
            .slice()
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((pv) => this.toListItem(pv));
    }
    async get(pvId) {
        const found = await this.findPvAnywhere(pvId);
        if (!found)
            throw new common_1.NotFoundException("PV introuvable");
        return found.pv;
    }
    // ───────────────────────────────────────────────────────── Create / Patch
    async create(dossierId, authorId, input) {
        const dossier = await this.loadDossier(dossierId);
        const bag = this.readBag(dossier);
        const typeVisite = input.typeVisite ?? "AVANCEMENT";
        if (!pv_chantier_types_1.PV_TYPES_VISITE.includes(typeVisite)) {
            throw new common_1.BadRequestException("typeVisite invalide");
        }
        const now = new Date().toISOString();
        const pv = {
            id: (0, crypto_1.randomUUID)(),
            dossierId,
            numero: this.nextNumero(bag),
            date: input.date ?? now.slice(0, 10),
            typeVisite,
            meteo: input.meteo ?? null,
            temperatureC: typeof input.temperatureC === "number" ? input.temperatureC : null,
            vent: input.vent ?? null,
            presents: this.sanitizePresents(input.presents),
            absents: this.sanitizeAbsents(input.absents),
            observations: this.sanitizeObservations(input.observations),
            decisions: (input.decisions ?? []).map((d) => ({
                id: d.id || (0, crypto_1.randomUUID)(),
                description: String(d.description ?? "").slice(0, 1000),
                responsable: d.responsable ?? null,
                deadline: d.deadline ?? null,
            })),
            prochaineVisite: input.prochaineVisite ?? null,
            signatures: [],
            status: "DRAFT",
            hashSha256: null,
            pdfUrl: null,
            authorId: authorId ?? null,
            createdAt: now,
            updatedAt: now,
            finalizedAt: null,
        };
        bag.push(pv);
        await this.writeBag(dossier, bag);
        return pv;
    }
    async patch(pvId, authorId, patch) {
        const found = await this.findPvAnywhere(pvId);
        if (!found)
            throw new common_1.NotFoundException("PV introuvable");
        if (found.pv.status !== "DRAFT") {
            throw new common_1.ForbiddenException("PV non modifiable (status != DRAFT)");
        }
        const next = {
            ...found.pv,
            date: patch.date ?? found.pv.date,
            typeVisite: patch.typeVisite ?? found.pv.typeVisite,
            meteo: patch.meteo !== undefined ? patch.meteo : found.pv.meteo,
            temperatureC: patch.temperatureC !== undefined
                ? typeof patch.temperatureC === "number"
                    ? patch.temperatureC
                    : null
                : found.pv.temperatureC,
            vent: patch.vent !== undefined ? patch.vent : found.pv.vent,
            presents: patch.presents
                ? this.sanitizePresents(patch.presents)
                : found.pv.presents,
            absents: patch.absents
                ? this.sanitizeAbsents(patch.absents)
                : found.pv.absents,
            observations: patch.observations
                ? this.sanitizeObservations(patch.observations)
                : found.pv.observations,
            decisions: patch.decisions ?? found.pv.decisions,
            prochaineVisite: patch.prochaineVisite !== undefined
                ? patch.prochaineVisite
                : found.pv.prochaineVisite,
            updatedAt: new Date().toISOString(),
            authorId: authorId ?? found.pv.authorId,
        };
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((p) => p.id === pvId);
        if (idx >= 0)
            bag[idx] = next;
        await this.writeBag(found.dossier, bag);
        return next;
    }
    // ───────────────────────────────────────────────────────── Sign / Finalize
    async addSignature(pvId, input) {
        if (!input?.partie || !input?.dataUrl) {
            throw new common_1.BadRequestException("partie et dataUrl requis");
        }
        if (!/^data:image\/(png|jpeg);base64,/i.test(input.dataUrl)) {
            throw new common_1.BadRequestException("dataUrl invalide (PNG/JPEG attendu)");
        }
        const found = await this.findPvAnywhere(pvId);
        if (!found)
            throw new common_1.NotFoundException("PV introuvable");
        if (found.pv.status === "FINAL") {
            throw new common_1.ForbiddenException("PV finalisé — signatures verrouillées");
        }
        const pv = { ...found.pv };
        pv.signatures = [
            ...pv.signatures,
            {
                partie: input.partie.slice(0, 120),
                dataUrl: input.dataUrl,
                signedAt: new Date().toISOString(),
            },
        ];
        pv.status = pv.status === "DRAFT" ? "SIGNED_PARTIEL" : pv.status;
        pv.updatedAt = new Date().toISOString();
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((p) => p.id === pvId);
        if (idx >= 0)
            bag[idx] = pv;
        await this.writeBag(found.dossier, bag);
        return pv;
    }
    async finalize(pvId, htmlSnapshot) {
        const found = await this.findPvAnywhere(pvId);
        if (!found)
            throw new common_1.NotFoundException("PV introuvable");
        if (found.pv.status === "FINAL")
            return found.pv;
        if ((found.pv.signatures?.length ?? 0) < 1) {
            throw new common_1.BadRequestException("Au moins une signature requise avant finalisation");
        }
        const pv = { ...found.pv };
        const canonical = this.canonicalForHash(pv);
        const hash = (0, crypto_1.createHash)("sha256").update(canonical).digest("hex");
        pv.hashSha256 = hash;
        // Persiste l'HTML imprimable (sert de "PDF source") dans le storage
        const pdfRelUrl = await this.persistHtmlSnapshot(pv.dossierId, pv.id, htmlSnapshot);
        pv.pdfUrl = pdfRelUrl;
        pv.status = "FINAL";
        const finalizedAt = new Date().toISOString();
        pv.finalizedAt = finalizedAt;
        pv.updatedAt = finalizedAt;
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((p) => p.id === pvId);
        if (idx >= 0)
            bag[idx] = pv;
        await this.writeBag(found.dossier, bag);
        // Probative log (chaîne hash SHA-256 doctrine T@-R-TRACE-001)
        try {
            await this.probative.append({
                kind: "PV_CHANTIER_FINALIZED",
                tome: "tome2",
                rule_id: "T2-R-PV-001",
                dossierId: pv.dossierId,
                pvId: pv.id,
                numero: pv.numero,
                hash,
                finalizedAt,
            });
        }
        catch (e) {
            this.logger.warn(`probative append failed: ${e?.message}`);
        }
        return pv;
    }
    // ───────────────────────────────────────────────────────── Storage helpers
    async resolveSnapshotPath(pvId) {
        const found = await this.findPvAnywhere(pvId);
        if (!found)
            throw new common_1.NotFoundException("PV introuvable");
        if (found.pv.status !== "FINAL" || !found.pv.pdfUrl) {
            throw new common_1.BadRequestException("PV non finalisé");
        }
        const rel = found.pv.pdfUrl.replace(/^\/+/, "");
        const abs = path.join(this.storageRoot, "..", rel);
        return abs;
    }
    /**
     * Upload d'une photo géolocalisée pour une observation.
     * Retourne l'URL publique servie via /storage/pv-chantier/...
     */
    async savePhoto(opts) {
        const dir = path.join(this.storageRoot, opts.dossierId, opts.pvId, "photos");
        await fs.mkdir(dir, { recursive: true });
        const ext = this.extFromMime(opts.mimeType);
        const safeHint = (opts.filenameHint || "photo")
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .slice(0, 40);
        const name = `${Date.now()}_${safeHint}.${ext}`;
        const abs = path.join(dir, name);
        await fs.writeFile(abs, Buffer.from(opts.contentBase64, "base64"));
        return {
            url: `/storage/pv-chantier/${opts.dossierId}/${opts.pvId}/photos/${name}`,
        };
    }
    // ───────────────────────────────────────────────────────── Internals
    async loadDossier(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { id: true, ownerId: true, refInterne: true, payload: true },
        });
        if (!d)
            throw new common_1.NotFoundException("Dossier introuvable");
        return d;
    }
    async findPvAnywhere(pvId) {
        // Première passe : tente une jointure SQL — sinon scanne les dossiers récents.
        // Pour MVP : scanne via Prisma payload (limité aux 500 dossiers les plus récents).
        const dossiers = await this.prisma.dossier.findMany({
            orderBy: { updatedAt: "desc" },
            take: 500,
            select: { id: true, ownerId: true, refInterne: true, payload: true },
        });
        for (const d of dossiers) {
            const bag = this.readBag(d);
            const pv = bag.find((p) => p.id === pvId);
            if (pv)
                return { pv, dossier: d };
        }
        return null;
    }
    readBag(dossier) {
        const payload = dossier.payload && typeof dossier.payload === "object"
            ? dossier.payload
            : {};
        const raw = payload[pv_chantier_types_1.PV_PAYLOAD_KEY];
        return Array.isArray(raw) ? raw : [];
    }
    async writeBag(dossier, bag) {
        const payload = dossier.payload && typeof dossier.payload === "object"
            ? { ...dossier.payload }
            : {};
        payload[pv_chantier_types_1.PV_PAYLOAD_KEY] = bag;
        await this.prisma.dossier.update({
            where: { id: dossier.id },
            data: { payload: payload },
        });
    }
    nextNumero(existing) {
        const year = new Date().getFullYear();
        const prefix = `${year}-`;
        const counts = existing
            .filter((p) => p.numero?.startsWith(prefix))
            .map((p) => Number(p.numero.split("-")[1] || 0))
            .filter((n) => Number.isFinite(n));
        const next = (counts.length ? Math.max(...counts) : 0) + 1;
        return `${prefix}${String(next).padStart(3, "0")}`;
    }
    sanitizePresents(arr) {
        return (arr ?? []).slice(0, 50).map((p) => ({
            nom: String(p.nom ?? "").slice(0, 120),
            role: String(p.role ?? "").slice(0, 80),
            organisme: p.organisme ?? null,
        }));
    }
    sanitizeAbsents(arr) {
        return (arr ?? []).slice(0, 50).map((p) => ({
            nom: String(p.nom ?? "").slice(0, 120),
            role: String(p.role ?? "").slice(0, 80),
            motif: p.motif ?? null,
        }));
    }
    sanitizeObservations(arr) {
        return (arr ?? []).slice(0, 200).map((o) => ({
            id: o.id || (0, crypto_1.randomUUID)(),
            lot: o.lot ?? null,
            severite: this.coerceSeverite(o.severite),
            titre: String(o.titre ?? "").slice(0, 200),
            description: o.description ?? null,
            photoUrls: Array.isArray(o.photoUrls)
                ? o.photoUrls.filter((u) => typeof u === "string").slice(0, 20)
                : [],
            geoloc: o.geoloc ?? null,
            deadline: o.deadline ?? null,
        }));
    }
    coerceSeverite(s) {
        return pv_chantier_types_1.PV_SEVERITE_ORDER[s] !== undefined
            ? s
            : "INFO";
    }
    toListItem(pv) {
        let severiteMax = null;
        for (const o of pv.observations) {
            if (severiteMax == null ||
                pv_chantier_types_1.PV_SEVERITE_ORDER[o.severite] > pv_chantier_types_1.PV_SEVERITE_ORDER[severiteMax]) {
                severiteMax = o.severite;
            }
        }
        return {
            id: pv.id,
            numero: pv.numero,
            date: pv.date,
            typeVisite: pv.typeVisite,
            status: pv.status,
            createdAt: pv.createdAt,
            finalizedAt: pv.finalizedAt ?? null,
            observationsCount: pv.observations.length,
            severiteMax,
        };
    }
    canonicalForHash(pv) {
        const copy = {
            ...pv,
            hashSha256: null,
            pdfUrl: null,
        };
        return JSON.stringify(copy, Object.keys(copy).sort());
    }
    async persistHtmlSnapshot(dossierId, pvId, html) {
        const dir = path.join(this.storageRoot, dossierId, pvId);
        await fs.mkdir(dir, { recursive: true });
        const abs = path.join(dir, "pv.html");
        await fs.writeFile(abs, html, "utf8");
        return `/storage/pv-chantier/${dossierId}/${pvId}/pv.html`;
    }
    extFromMime(mime) {
        const m = (mime || "").toLowerCase();
        if (m.includes("png"))
            return "png";
        if (m.includes("jpeg") || m.includes("jpg"))
            return "jpg";
        if (m.includes("webp"))
            return "webp";
        return "bin";
    }
    // Public helper used by controller — re-expose enums
    STATUS = pv_chantier_types_1.PV_STATUS;
};
exports.PvChantierService = PvChantierService;
exports.PvChantierService = PvChantierService = PvChantierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], PvChantierService);
