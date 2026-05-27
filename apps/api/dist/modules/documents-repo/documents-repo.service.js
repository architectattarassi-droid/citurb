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
var DocumentsRepoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsRepoService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
const email_service_1 = require("../email/email.service");
const e_signature_service_1 = require("./e-signature.service");
const types_1 = require("./types");
/**
 * DocumentsRepoService — orchestration du dépôt documentaire (Tome 7).
 *
 * Persistance : tant que les tables Prisma `Document`/`DocumentSignature` ne
 * sont pas migrées, les documents sont stockés en JSON dans
 * `Dossier.payload.documentsRepo[]`. Le contrat externe reste identique après
 * migration — il suffira de remplacer `readBag`/`writeBag` par du Prisma natif.
 */
let DocumentsRepoService = DocumentsRepoService_1 = class DocumentsRepoService {
    prisma;
    probative;
    email;
    esign;
    logger = new common_1.Logger(DocumentsRepoService_1.name);
    storageRoot;
    constructor(prisma, probative, email, esign) {
        this.prisma = prisma;
        this.probative = probative;
        this.email = email;
        this.esign = esign;
        this.storageRoot =
            process.env.DOCUMENTS_STORAGE_ROOT ??
                path.resolve(process.cwd(), "apps/api/storage/documents");
    }
    // ─────────────────────────────────────────────────────────── List / Get
    /** Liste les documents d'un dossier (légère, sans `dataUrl` signatures). */
    async list(dossierId) {
        const dossier = await this.loadDossier(dossierId);
        return this.readBag(dossier)
            .slice()
            .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""))
            .map((d) => this.toListItem(d));
    }
    /** Détail d'un document (avec signatures + URL signée 1h pour téléchargement). */
    async get(docId) {
        const found = await this.findDocAnywhere(docId);
        if (!found)
            throw new common_1.NotFoundException("Document introuvable");
        const signedUrl = this.buildSignedUrl(found.doc);
        return { ...found.doc, signedUrl };
    }
    // ─────────────────────────────────────────────────────────── Upload
    /**
     * Upload un nouveau document : écrit le binaire sur disque, calcule le
     * hash SHA-256, persiste les métadonnées dans `Dossier.payload`.
     */
    async upload(opts) {
        const { dossierId, uploadedBy, file, meta } = opts;
        if (!file?.buffer?.length)
            throw new common_1.BadRequestException("Fichier vide");
        if (file.size > types_1.MAX_UPLOAD_BYTES) {
            throw new common_1.BadRequestException(`Fichier trop volumineux (max ${types_1.MAX_UPLOAD_BYTES / 1024 / 1024} Mo)`);
        }
        if (!types_1.ALLOWED_MIME_RX.test(file.mimetype)) {
            throw new common_1.BadRequestException(`Type ${file.mimetype} non autorisé`);
        }
        const dossier = await this.loadDossier(dossierId);
        const bag = this.readBag(dossier);
        // Décode le nom UTF-8 d'origine (multer le sert en latin1).
        const originalUtf8 = Buffer.from(file.originalname, "latin1").toString("utf8");
        const ext = this.extFromName(originalUtf8) || this.extFromMime(file.mimetype);
        const docId = (0, crypto_1.randomUUID)();
        const storedName = `${docId}.${ext}`;
        const relPath = `documents/${dossierId}/${storedName}`;
        const absDir = path.join(this.storageRoot, dossierId);
        await fs.mkdir(absDir, { recursive: true });
        await fs.writeFile(path.join(absDir, storedName), file.buffer);
        const hash = (0, crypto_1.createHash)("sha256").update(file.buffer).digest("hex");
        const now = new Date().toISOString();
        const category = this.coerceCategory(meta?.category);
        const title = (meta?.title && meta.title.trim()) || originalUtf8.replace(/\.[^.]+$/, "");
        const doc = {
            id: docId,
            dossierId,
            title: title.slice(0, 200),
            description: meta?.description ?? null,
            category,
            status: "DRAFT",
            filename: originalUtf8.slice(0, 200),
            storagePath: relPath,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            ext,
            hashSha256: hash,
            signatureRequests: [],
            signatures: [],
            uploadedBy: uploadedBy ?? null,
            uploadedAt: now,
            updatedAt: now,
            signedAt: null,
            archivedAt: null,
            archivedBy: null,
            probativeHash: null,
        };
        bag.push(doc);
        await this.writeBag(dossier, bag);
        return doc;
    }
    // ─────────────────────────────────────────────────────────── Delete (soft)
    /** Soft-delete (réservé owner du dossier + rôle OPS/ADMIN). */
    async softDelete(docId, actor) {
        const found = await this.findDocAnywhere(docId);
        if (!found)
            throw new common_1.NotFoundException("Document introuvable");
        const isOwner = actor.userId && actor.userId === found.dossier.ownerId;
        const isStaff = ["OPS", "ADMIN", "SUPER_ADMIN", "OWNER"].includes(String(actor.role ?? ""));
        if (!isOwner && !isStaff) {
            throw new common_1.ForbiddenException("Suppression réservée au propriétaire ou OPS");
        }
        if (found.doc.status === "SIGNED") {
            throw new common_1.ForbiddenException("Document signé — archivage uniquement (jamais de suppression dure)");
        }
        const updated = {
            ...found.doc,
            status: "ARCHIVED",
            archivedAt: new Date().toISOString(),
            archivedBy: actor.userId ?? null,
            updatedAt: new Date().toISOString(),
        };
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((d) => d.id === docId);
        if (idx >= 0)
            bag[idx] = updated;
        await this.writeBag(found.dossier, bag);
        return { ok: true };
    }
    // ─────────────────────────────────────────────────────────── Signature
    /**
     * Appose une signature sur le document. Déclenche la transition d'état :
     *  - première signature → `PARTIALLY_SIGNED` (ou `SIGNED` si pas de workflow multi)
     *  - dernière signature requise atteinte → `SIGNED` + hash probatoire
     */
    async sign(docId, actor, input) {
        this.esign.validateDataUrl(input.dataUrl);
        if (!input.signerRole?.trim()) {
            throw new common_1.BadRequestException("signerRole requis");
        }
        const found = await this.findDocAnywhere(docId);
        if (!found)
            throw new common_1.NotFoundException("Document introuvable");
        if (found.doc.status === "SIGNED" || found.doc.status === "ARCHIVED") {
            throw new common_1.ForbiddenException(`Document ${found.doc.status} — signature verrouillée`);
        }
        const now = new Date().toISOString();
        const requestMatch = found.doc.signatureRequests.find((r) => r.status === "PENDING" &&
            (r.signerId === actor.userId ||
                (input.signerEmail && r.signerEmail === input.signerEmail) ||
                r.signerRole === input.signerRole));
        const order = requestMatch?.order ??
            (found.doc.signatures.length
                ? Math.max(...found.doc.signatures.map((s) => s.order)) + 1
                : 1);
        const sig = {
            id: (0, crypto_1.randomUUID)(),
            signerId: actor.userId ?? null,
            signerName: input.signerName?.slice(0, 120) ??
                requestMatch?.signerName ??
                actor.email ??
                "Signataire",
            signerRole: input.signerRole.slice(0, 80),
            signerEmail: input.signerEmail ?? actor.email ?? null,
            dataUrl: input.dataUrl,
            method: input.method ?? "LOCAL_CANVAS",
            signedAt: now,
            ipAddress: actor.ip ?? null,
            geoLat: typeof input.geoLat === "number" ? input.geoLat : null,
            geoLng: typeof input.geoLng === "number" ? input.geoLng : null,
            order,
        };
        const updatedRequests = found.doc.signatureRequests.map((r) => r === requestMatch
            ? { ...r, status: "SIGNED", notifiedAt: r.notifiedAt ?? now }
            : r);
        const allSigned = updatedRequests.length > 0 &&
            updatedRequests.every((r) => r.status === "SIGNED");
        const noRequests = updatedRequests.length === 0;
        const nextStatus = allSigned
            ? "SIGNED"
            : noRequests
                ? "SIGNED" // signature unique sans workflow
                : "PARTIALLY_SIGNED";
        const next = {
            ...found.doc,
            signatures: [...found.doc.signatures, sig],
            signatureRequests: updatedRequests,
            status: nextStatus,
            updatedAt: now,
            signedAt: nextStatus === "SIGNED" ? now : found.doc.signedAt,
        };
        if (nextStatus === "SIGNED") {
            next.probativeHash = await this.anchorProbative(next);
        }
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((d) => d.id === docId);
        if (idx >= 0)
            bag[idx] = next;
        await this.writeBag(found.dossier, bag);
        // Notifie le prochain signataire (séquentiel)
        if (nextStatus === "PARTIALLY_SIGNED") {
            void this.notifyNextSigner(next).catch((e) => this.logger.warn(`notifyNext failed: ${e?.message}`));
        }
        return next;
    }
    /** Crée la liste des signataires + envoie les notifications email. */
    async requestSignatures(docId, input, actor) {
        if (!input?.signers?.length) {
            throw new common_1.BadRequestException("Au moins un signataire requis");
        }
        const found = await this.findDocAnywhere(docId);
        if (!found)
            throw new common_1.NotFoundException("Document introuvable");
        if (found.doc.status === "SIGNED" || found.doc.status === "ARCHIVED") {
            throw new common_1.ForbiddenException("Document verrouillé");
        }
        const now = new Date().toISOString();
        const requests = input.signers.slice(0, 20).map((s, i) => ({
            signerId: s.signerId ?? null,
            signerName: String(s.signerName ?? "Signataire").slice(0, 120),
            signerRole: String(s.signerRole ?? "PARTIE").slice(0, 80),
            signerEmail: s.signerEmail ?? null,
            order: i + 1,
            status: "PENDING",
            requestedAt: now,
            notifiedAt: null,
        }));
        const next = {
            ...found.doc,
            signatureRequests: requests,
            status: "PENDING_SIGNATURE",
            updatedAt: now,
        };
        const bag = this.readBag(found.dossier);
        const idx = bag.findIndex((d) => d.id === docId);
        if (idx >= 0)
            bag[idx] = next;
        await this.writeBag(found.dossier, bag);
        void this.notifyNextSigner(next).catch((e) => this.logger.warn(`notifyNextSigner failed: ${e?.message}`));
        void this.probative
            .append({
            kind: "DOC_SIGNATURE_REQUESTED",
            tome: "tome7",
            rule_id: "T7-R-DOC-001",
            dossierId: next.dossierId,
            docId: next.id,
            signers: requests.map((r) => ({ name: r.signerName, role: r.signerRole })),
            requestedBy: actor.userId ?? null,
            at: now,
        })
            .catch(() => undefined);
        return next;
    }
    // ─────────────────────────────────────────────────────────── Verify (public)
    /** Page publique de vérification (QR code) — pas d'auth. */
    async verifyPublic(docId, expectedHash) {
        const found = await this.findDocAnywhere(docId);
        if (!found) {
            return {
                ok: false,
                docId,
                title: "",
                category: "AUTRE",
                status: "ARCHIVED",
                hashSha256: "",
                uploadedAt: "",
                signaturesCount: 0,
                signers: [],
                probativeHash: null,
                message: "Document introuvable",
            };
        }
        const doc = found.doc;
        const hashMatches = !expectedHash || expectedHash === doc.hashSha256;
        return {
            ok: hashMatches && doc.status === "SIGNED",
            docId: doc.id,
            title: doc.title,
            category: doc.category,
            status: doc.status,
            hashSha256: doc.hashSha256,
            uploadedAt: doc.uploadedAt,
            signaturesCount: doc.signatures.length,
            signers: doc.signatures.map((s) => ({
                name: s.signerName,
                role: s.signerRole,
                signedAt: s.signedAt,
            })),
            probativeHash: doc.probativeHash,
            message: hashMatches
                ? doc.status === "SIGNED"
                    ? "Document authentique et entièrement signé."
                    : `Document trouvé — statut ${doc.status}.`
                : "Hash fourni invalide — document potentiellement falsifié.",
        };
    }
    // ─────────────────────────────────────────────────────────── Storage helpers
    /** Résout le chemin absolu d'un fichier (pour servir en téléchargement). */
    async resolveFilePath(docId) {
        const found = await this.findDocAnywhere(docId);
        if (!found)
            throw new common_1.NotFoundException("Document introuvable");
        const rel = found.doc.storagePath.replace(/^\/+/, "").replace(/^documents\//, "");
        const abs = path.join(this.storageRoot, rel);
        return { abs, doc: found.doc };
    }
    // ─────────────────────────────────────────────────────────── Internals
    async loadDossier(dossierId) {
        const d = await this.prisma.dossier.findUnique({
            where: { id: dossierId },
            select: { id: true, ownerId: true, refInterne: true, payload: true },
        });
        if (!d)
            throw new common_1.NotFoundException("Dossier introuvable");
        return d;
    }
    async findDocAnywhere(docId) {
        const dossiers = await this.prisma.dossier.findMany({
            orderBy: { updatedAt: "desc" },
            take: 1000,
            select: { id: true, ownerId: true, refInterne: true, payload: true },
        });
        for (const d of dossiers) {
            const bag = this.readBag(d);
            const doc = bag.find((x) => x.id === docId);
            if (doc)
                return { doc, dossier: d };
        }
        return null;
    }
    readBag(dossier) {
        const payload = dossier.payload && typeof dossier.payload === "object"
            ? dossier.payload
            : {};
        const raw = payload[types_1.DOC_PAYLOAD_KEY];
        return Array.isArray(raw) ? raw : [];
    }
    async writeBag(dossier, bag) {
        const payload = dossier.payload && typeof dossier.payload === "object"
            ? { ...dossier.payload }
            : {};
        payload[types_1.DOC_PAYLOAD_KEY] = bag;
        await this.prisma.dossier.update({
            where: { id: dossier.id },
            data: { payload: payload },
        });
    }
    toListItem(d) {
        return {
            id: d.id,
            title: d.title,
            category: d.category,
            status: d.status,
            filename: d.filename,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            uploadedAt: d.uploadedAt,
            signedAt: d.signedAt,
            signaturesCount: d.signatures.length,
            pendingSignaturesCount: d.signatureRequests.filter((r) => r.status === "PENDING").length,
        };
    }
    /**
     * URL "signée" expirant à 1h (token HMAC simple sur docId+exp).
     * Le controller la valide à la lecture du fichier.
     */
    buildSignedUrl(d) {
        const exp = Date.now() + 3600 * 1000;
        const secret = process.env.JWT_SECRET || "dev-secret-change-me";
        const token = (0, crypto_1.createHash)("sha256")
            .update(`${d.id}|${exp}|${secret}`)
            .digest("hex")
            .slice(0, 32);
        return `/api/documents-repo/${d.id}/file?exp=${exp}&t=${token}`;
    }
    /** Vérifie un token de téléchargement signé. */
    verifySignedToken(docId, exp, token) {
        if (!exp || Date.now() > exp)
            return false;
        const secret = process.env.JWT_SECRET || "dev-secret-change-me";
        const expected = (0, crypto_1.createHash)("sha256")
            .update(`${docId}|${exp}|${secret}`)
            .digest("hex")
            .slice(0, 32);
        return expected === token;
    }
    async anchorProbative(doc) {
        try {
            const canonical = JSON.stringify({
                docId: doc.id,
                dossierId: doc.dossierId,
                hash: doc.hashSha256,
                signatures: doc.signatures.map((s) => ({
                    signerRole: s.signerRole,
                    signerName: s.signerName,
                    signedAt: s.signedAt,
                    order: s.order,
                })),
                signedAt: doc.signedAt,
            }, Object.keys({}).sort());
            const finalHash = (0, crypto_1.createHash)("sha256").update(canonical).digest("hex");
            await this.probative.append({
                kind: "DOC_SIGNED",
                tome: "tome7",
                rule_id: "T7-R-DOC-001",
                dossierId: doc.dossierId,
                docId: doc.id,
                documentHash: doc.hashSha256,
                finalHash,
                signaturesCount: doc.signatures.length,
                signedAt: doc.signedAt,
            });
            return finalHash;
        }
        catch (e) {
            this.logger.warn(`probative anchor failed: ${e?.message}`);
            return null;
        }
    }
    /** Notifie par email le prochain signataire en attente. */
    async notifyNextSigner(doc) {
        const next = doc.signatureRequests
            .filter((r) => r.status === "PENDING")
            .sort((a, b) => a.order - b.order)[0];
        if (!next?.signerEmail)
            return;
        if (!this.email.isConfigured()) {
            this.logger.warn(`[dev] Email non configuré — signataire ${next.signerEmail} non notifié`);
            return;
        }
        const baseUrl = process.env.PUBLIC_WEB_URL || "https://citurbarea.com";
        const link = `${baseUrl}/dossier/${doc.dossierId}/documents?sign=${doc.id}`;
        const subject = `CITURBAREA · Signature requise : ${doc.title}`;
        const html = `
      <h2>Signature requise</h2>
      <p>Bonjour ${this.escape(next.signerName)},</p>
      <p>Votre signature est requise sur le document <strong>${this.escape(doc.title)}</strong>.</p>
      <p><a href="${link}" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Ouvrir et signer</a></p>
      <p style="color:#64748b;font-size:12px">Lien direct : ${link}</p>
    `;
        await this.email.send({
            to: next.signerEmail,
            subject,
            html,
            text: `Signature requise : ${doc.title}\n${link}`,
        });
        // Marque notifié (re-charge le dossier pour éviter une écriture concurrente)
        const dossier = await this.loadDossier(doc.dossierId);
        const bag = this.readBag(dossier);
        const target = bag.find((x) => x.id === doc.id);
        if (target) {
            target.signatureRequests = target.signatureRequests.map((r) => r.signerEmail === next.signerEmail && r.status === "PENDING"
                ? { ...r, notifiedAt: new Date().toISOString() }
                : r);
            await this.writeBag(dossier, bag);
        }
    }
    coerceCategory(c) {
        return types_1.DOC_CATEGORIES.includes(c ?? "")
            ? c
            : "AUTRE";
    }
    extFromName(name) {
        const m = /\.([a-z0-9]{1,8})$/i.exec(name || "");
        return m ? m[1].toLowerCase() : "";
    }
    extFromMime(mime) {
        const m = (mime || "").toLowerCase();
        if (m.includes("pdf"))
            return "pdf";
        if (m.includes("png"))
            return "png";
        if (m.includes("jpeg") || m.includes("jpg"))
            return "jpg";
        if (m.includes("webp"))
            return "webp";
        if (m.includes("heic"))
            return "heic";
        if (m.includes("wordprocessingml"))
            return "docx";
        if (m.includes("spreadsheetml"))
            return "xlsx";
        if (m.includes("msword"))
            return "doc";
        if (m.includes("ms-excel"))
            return "xls";
        if (m.includes("csv"))
            return "csv";
        if (m.includes("plain"))
            return "txt";
        return "bin";
    }
    escape(s) {
        return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    }
};
exports.DocumentsRepoService = DocumentsRepoService;
exports.DocumentsRepoService = DocumentsRepoService = DocumentsRepoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService,
        email_service_1.EmailService,
        e_signature_service_1.ESignatureService])
], DocumentsRepoService);
