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
var CpsDossierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CpsDossierService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
const cps_generator_service_1 = require("./cps-generator.service");
/**
 * CpsDossierService — CPS lié à un dossier, payant, protégé et signé.
 *
 * Garde-fous (doctrine) :
 *   - réservé aux portes P1/P2/P3 (les seules produisant un CPS) ;
 *   - propriété du dossier (owner) ou rôle ADMIN/OWNER/OPS ;
 *   - paywall : visible seulement si packValidation.status === "ACTIVATED" (sinon 402) ;
 *   - filigrane nominatif incrusté (réf. dossier · utilisateur · date) ;
 *   - signatures obligatoires entreprises/prestataires, scellées SHA-256 + ProbativeLog,
 *     adaptateur Barid eSign (qualifiée) activable via BARID_ESIGN_ENABLED.
 *
 * Persistance : état CPS dans `Dossier.payload.cps`.
 */
const CPS_PORTES = new Set(["P1", "P2", "P3"]);
const CPS_KEY = "cps";
let CpsDossierService = CpsDossierService_1 = class CpsDossierService {
    prisma;
    generator;
    probative;
    log = new common_1.Logger(CpsDossierService_1.name);
    constructor(prisma, generator, probative) {
        this.prisma = prisma;
        this.generator = generator;
        this.probative = probative;
    }
    // ── Génération gardée ──────────────────────────────────────────
    async generate(dossierId, actor, input) {
        const d = await this.loadDossier(dossierId);
        this.assertAccess(d, actor);
        this.assertPorte(d);
        this.assertPaid(d);
        const payload = d.payload && typeof d.payload === "object" ? d.payload : {};
        const cps = payload[CPS_KEY] && typeof payload[CPS_KEY] === "object" ? payload[CPS_KEY] : {};
        const signatures = Array.isArray(cps.signatures) && cps.signatures.length ? cps.signatures : this.defaultSigners(payload);
        const doc = await this.generator.generate({
            ...input,
            projectName: input.projectName || d.title || d.clientNom || d.raisonSociale || "Projet",
            commune: input.commune || d.commune || undefined,
            watermark: this.watermark(d, actor),
            signatures: signatures.map((s) => ({
                partie: s.partie,
                role: s.role,
                signataire: s.signataire,
                signedAt: s.signedAt,
                status: s.status,
            })),
        });
        const documentHash = (0, crypto_1.createHash)("sha256").update(doc.html).digest("hex");
        return { ...doc, dossierId, porteType: d.porteType, documentHash };
    }
    // ── Signatures ─────────────────────────────────────────────────
    async getSignatures(dossierId, actor) {
        const d = await this.loadDossier(dossierId);
        this.assertAccess(d, actor);
        this.assertPorte(d);
        const payload = d.payload && typeof d.payload === "object" ? d.payload : {};
        const cps = payload[CPS_KEY] ?? {};
        const signatures = Array.isArray(cps.signatures) && cps.signatures.length ? cps.signatures : this.defaultSigners(payload);
        const total = signatures.length;
        const signed = signatures.filter((s) => s.status === "SIGNE").length;
        return {
            dossierId,
            porteType: d.porteType,
            signatures,
            total,
            signed,
            fullySigned: total > 0 && signed === total,
            baridEnabled: process.env.BARID_ESIGN_ENABLED === "true",
        };
    }
    async addSignature(dossierId, actor, input) {
        const d = await this.loadDossier(dossierId);
        this.assertAccess(d, actor);
        this.assertPorte(d);
        this.assertPaid(d);
        if (!input?.partie || !input?.signerName)
            throw new common_1.HttpException("partie et signerName requis", 400);
        if (!input?.dataUrl || !/^data:image\/(png|jpeg);base64,/i.test(input.dataUrl)) {
            throw new common_1.HttpException("Signature (dataUrl PNG/JPEG) requise", 400);
        }
        const payload = d.payload && typeof d.payload === "object" ? { ...d.payload } : {};
        const cps = payload[CPS_KEY] && typeof payload[CPS_KEY] === "object" ? { ...payload[CPS_KEY] } : {};
        const signatures = Array.isArray(cps.signatures) && cps.signatures.length ? [...cps.signatures] : this.defaultSigners(payload);
        const now = new Date().toISOString();
        const docHash = input.documentHash || cps.lastDocHash || "";
        const signatureHash = (0, crypto_1.createHash)("sha256").update(`${docHash}|${input.dataUrl}|${now}`).digest("hex");
        const baridEnabled = process.env.BARID_ESIGN_ENABLED === "true";
        const method = baridEnabled ? "BARID_ESIGN" : "LOCAL_CANVAS_SEALED";
        const idx = signatures.findIndex((s) => s.partie === input.partie);
        const rec = {
            partie: input.partie,
            role: input.signerRole || (idx >= 0 ? signatures[idx].role : "Entreprise"),
            signataire: input.signerName,
            signedAt: now,
            status: "SIGNE",
            signatureHash,
            method,
        };
        if (idx >= 0)
            signatures[idx] = { ...signatures[idx], ...rec };
        else
            signatures.push(rec);
        cps.signatures = signatures;
        if (docHash)
            cps.lastDocHash = docHash;
        payload[CPS_KEY] = cps;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        try {
            await this.probative.append({
                kind: "CPS_SIGNATURE_APPOSEE",
                tome: "tome2",
                rule_id: "T2-R-CPS-SIGN-001",
                dossierId,
                partie: input.partie,
                signataire: input.signerName,
                signatureHash,
                method,
                signedAt: now,
            });
        }
        catch (e) {
            this.log.warn(`[CPS] probative append failed: ${e?.message}`);
        }
        const total = signatures.length;
        const signed = signatures.filter((s) => s.status === "SIGNE").length;
        return {
            ok: true,
            signatures,
            total,
            signed,
            fullySigned: total > 0 && signed === total,
            method,
            baridPending: baridEnabled,
        };
    }
    // ── Garde-fous ─────────────────────────────────────────────────
    async loadDossier(id) {
        const d = await this.prisma.dossier.findUnique({
            where: { id },
            select: {
                id: true,
                ownerId: true,
                porteType: true,
                title: true,
                commune: true,
                refInterne: true,
                clientNom: true,
                raisonSociale: true,
                payload: true,
            },
        });
        if (!d)
            throw new common_1.NotFoundException("Dossier introuvable");
        return d;
    }
    assertAccess(d, actor) {
        const isOwner = d.ownerId === actor.userId;
        const role = (actor.role || "").toUpperCase();
        const priv = ["ADMIN", "SUPER_ADMIN", "OWNER", "OPS"].includes(role);
        if (!isOwner && !priv)
            throw new common_1.ForbiddenException("Accès refusé sur ce dossier");
    }
    assertPorte(d) {
        if (!CPS_PORTES.has(d.porteType)) {
            throw new common_1.HttpException(`Le CPS n'est disponible que pour les portes P1, P2 et P3 (dossier en porte ${d.porteType}).`, 422);
        }
    }
    assertPaid(d) {
        const status = d.payload?.packValidation?.status;
        if (status !== "ACTIVATED") {
            throw new common_1.HttpException("CPS verrouillé : disponible uniquement après activation du pack (paiement validé).", 402);
        }
    }
    watermark(d, actor) {
        const who = d.clientNom || d.raisonSociale || (actor.userId ? actor.userId.slice(0, 8) : "client");
        const ref = d.refInterne || String(d.id).slice(0, 8);
        const now = new Date();
        return `CITURBAREA · ${ref} · ${who} · ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    defaultSigners(payload) {
        const out = [];
        const sts = Array.isArray(payload.sousTraitants) ? payload.sousTraitants : [];
        for (const st of sts) {
            if (st?.status !== "TERMINATED") {
                out.push({
                    partie: st.supplierCabinet || st.lotIntitule || "Sous-traitant",
                    role: "Entreprise / Sous-traitant",
                    signataire: "",
                    signedAt: null,
                    status: "EN ATTENTE",
                });
            }
        }
        if (payload.architectName || payload.assignedArchitect) {
            out.push({
                partie: payload.architectName || payload.assignedArchitect?.name || "Architecte",
                role: "Architecte (visa)",
                signataire: "",
                signedAt: null,
                status: "EN ATTENTE",
            });
        }
        if (!out.length) {
            out.push({ partie: "Entreprise titulaire", role: "Entreprise", signataire: "", signedAt: null, status: "EN ATTENTE" });
        }
        return out;
    }
};
exports.CpsDossierService = CpsDossierService;
exports.CpsDossierService = CpsDossierService = CpsDossierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cps_generator_service_1.CpsGeneratorService,
        probative_log_service_1.ProbativeLogService])
], CpsDossierService);
