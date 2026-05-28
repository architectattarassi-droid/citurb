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
var MreDiasporaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MreDiasporaService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
/**
 * MreDiasporaService — orchestration du parcours MRE.
 *
 * Persistance MVP : tout dans `Dossier.payload.mre*` (même pattern que
 * PackValidationService / PvChantier). Migration Prisma dédiée prévue Q1-2027.
 * Hash SHA-256 + ProbativeLog sur signature procuration + libération escrow.
 */
let MreDiasporaService = MreDiasporaService_1 = class MreDiasporaService {
    prisma;
    probative;
    logger = new common_1.Logger(MreDiasporaService_1.name);
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
    }
    /** Lit le payload JSON d'un dossier (typé loose). */
    async readPayload(dossierId) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
        if (!d)
            throw new Error(`Dossier introuvable: ${dossierId}`);
        return { dossier: d, payload: d.payload || {} };
    }
    async writePayload(dossierId, payload) {
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
    }
    /** Upgrade un utilisateur en profil MRE certifié. */
    async upgradeProfile(userId, input) {
        const profile = {
            userId,
            countryResidence: input.countryResidence,
            city: input.city,
            passportMaNumber: input.passportMaNumber,
            consulateAttestationDocId: input.consulateAttestationDocId,
            cinMaNumber: input.cinMaNumber,
            preferredLang: input.preferredLang || "fr",
            certifiedAt: new Date().toISOString(),
        };
        // On stocke le flag isMre + profil sur le User payload (table User a un champ JSON ? sinon Dossier)
        // MVP : on stocke dans une table légère via Prisma user si dispo, sinon en mémoire process.
        this.profileCache.set(userId, profile);
        return profile;
    }
    // Cache mémoire MVP (les profils MRE — migration Prisma User.mreProfile prévue)
    profileCache = new Map();
    getProfile(userId) {
        return this.profileCache.get(userId) || null;
    }
    /** Crée une procuration eIDAS pour une mission. */
    async createProcuration(input) {
        const { payload } = await this.readPayload(input.dossierId);
        const procs = payload.mreProcurations || [];
        const proc = {
            id: (0, crypto_1.randomUUID)(),
            dossierId: input.dossierId,
            mreUserId: input.mreUserId,
            mandataireId: input.mandataireId,
            mandataireNom: input.mandataireNom,
            missionType: input.missionType,
            scopes: input.scopes,
            dureeJours: input.dureeJours,
            status: "PENDING_SIGNATURE",
            htmlContent: this.renderProcurationHtml(input),
            createdAt: new Date().toISOString(),
        };
        procs.push(proc);
        payload.mreProcurations = procs;
        await this.writePayload(input.dossierId, payload);
        return proc;
    }
    /** Signature de la procuration par le MRE depuis l'étranger. */
    async signProcuration(dossierId, procId, signatureDataUrl, country) {
        const { payload } = await this.readPayload(dossierId);
        const procs = payload.mreProcurations || [];
        const proc = procs.find((p) => p.id === procId);
        if (!proc)
            throw new Error(`Procuration introuvable: ${procId}`);
        if (proc.status !== "PENDING_SIGNATURE")
            throw new Error(`Procuration non signable (statut ${proc.status})`);
        proc.signatureDataUrl = signatureDataUrl;
        proc.signedFromCountry = country;
        proc.signedAt = new Date().toISOString();
        proc.hashSha256 = (0, crypto_1.createHash)("sha256")
            .update(JSON.stringify({ id: proc.id, content: proc.htmlContent, sig: signatureDataUrl, at: proc.signedAt }))
            .digest("hex");
        proc.status = "SIGNED";
        payload.mreProcurations = procs;
        await this.writePayload(dossierId, payload);
        await this.probative.append({
            kind: "MRE_PROCURATION_SIGNED",
            rule_id: "T2-R-MRE-PROC-001",
            projectId: dossierId,
            actorId: proc.mreUserId,
            metadata: { procId: proc.id, hash: proc.hashSha256, fromCountry: country },
        }).catch((e) => this.logger.warn(`ProbativeLog MRE sign: ${e?.message}`));
        return proc;
    }
    /** Demande Apostille de La Haye (workflow placeholder). */
    async requestApostille(dossierId, procId) {
        const { payload } = await this.readPayload(dossierId);
        const procs = payload.mreProcurations || [];
        const proc = procs.find((p) => p.id === procId);
        if (!proc)
            throw new Error(`Procuration introuvable: ${procId}`);
        if (proc.status !== "SIGNED")
            throw new Error(`Procuration doit être signée avant Apostille`);
        proc.status = "APOSTILLE_REQUESTED";
        proc.apostilleRef = `APO-${Date.now()}`;
        payload.mreProcurations = procs;
        await this.writePayload(dossierId, payload);
        return proc;
    }
    /** Compte escrow d'un dossier MRE. */
    async getEscrow(dossierId) {
        const { payload } = await this.readPayload(dossierId);
        return payload.mreEscrow || null;
    }
    /** Crée/initialise un compte escrow avec jalons. */
    async initEscrow(dossierId, mreUserId, milestones) {
        const { payload } = await this.readPayload(dossierId);
        const ms = milestones.map((m) => ({
            id: (0, crypto_1.randomUUID)(), label: m.label, amountMad: m.amountMad,
            status: "PENDING", conditionDescription: m.conditionDescription,
        }));
        const escrow = {
            dossierId, mreUserId,
            totalMad: ms.reduce((s, m) => s + m.amountMad, 0),
            fundedMad: 0, releasedMad: 0, milestones: ms,
            bankPartner: "Bank Al-Maghrib (séquestre)",
            createdAt: new Date().toISOString(),
        };
        payload.mreEscrow = escrow;
        await this.writePayload(dossierId, payload);
        return escrow;
    }
    /** Libère un jalon escrow (après validation MRE de la preuve mandataire). */
    async releaseMilestone(dossierId, milestoneId, preuveDocIds) {
        const { payload } = await this.readPayload(dossierId);
        const escrow = payload.mreEscrow;
        if (!escrow)
            throw new Error(`Pas de compte escrow pour ce dossier`);
        const m = escrow.milestones.find((x) => x.id === milestoneId);
        if (!m)
            throw new Error(`Jalon introuvable: ${milestoneId}`);
        if (m.status === "RELEASED")
            throw new Error(`Jalon déjà libéré`);
        m.status = "RELEASED";
        m.releasedAt = new Date().toISOString();
        m.preuveDocIds = preuveDocIds;
        escrow.releasedMad += m.amountMad;
        payload.mreEscrow = escrow;
        await this.writePayload(dossierId, payload);
        await this.probative.append({
            kind: "MRE_ESCROW_RELEASED",
            rule_id: "T2-R-MRE-ESCROW-001",
            projectId: dossierId,
            actorId: escrow.mreUserId,
            metadata: { milestoneId, amountMad: m.amountMad, preuveDocIds },
        }).catch((e) => this.logger.warn(`ProbativeLog MRE escrow: ${e?.message}`));
        return escrow;
    }
    /** Dashboard agrégé MRE. */
    async getDashboard(userId) {
        const profile = this.getProfile(userId);
        // On scanne les dossiers où ce MRE est propriétaire
        const dossiers = await this.prisma.dossier.findMany({
            where: { ownerId: userId },
            take: 50,
        }).catch(() => []);
        const procurations = [];
        const escrowAccounts = [];
        const activeDossiers = [];
        for (const d of dossiers) {
            const pl = d.payload || {};
            if (Array.isArray(pl.mreProcurations))
                procurations.push(...pl.mreProcurations);
            if (pl.mreEscrow)
                escrowAccounts.push(pl.mreEscrow);
            activeDossiers.push({
                dossierId: d.id,
                title: pl.projectTitle || d.title || d.projectType || "Projet",
                phase: pl.currentPhase || d.status || "—",
            });
        }
        return {
            profile,
            procurations,
            escrowAccounts,
            activeDossiers,
            stats: {
                procurationsActives: procurations.filter((p) => ["SIGNED", "APOSTILLE_DONE", "APOSTILLE_REQUESTED"].includes(p.status)).length,
                escrowTotalMad: escrowAccounts.reduce((s, e) => s + e.totalMad, 0),
                escrowReleasedMad: escrowAccounts.reduce((s, e) => s + e.releasedMad, 0),
                missionsEnCours: procurations.filter((p) => p.status !== "EXECUTED" && p.status !== "REVOKED").length,
            },
        };
    }
    /** Génère le HTML imprimable de la procuration adoulaire. */
    renderProcurationHtml(input) {
        const scopesList = input.scopes.map((s) => `<li>${s}</li>`).join("");
        return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.7;color:#1a1a1a}
h1{text-align:center;color:#0B1B3A;border-bottom:2px solid #C9A227;padding-bottom:12px}
.meta{color:#666;font-size:13px}.scopes{background:#f8f8f5;padding:16px;border-radius:6px}
.sign{margin-top:48px;display:flex;justify-content:space-between}</style></head><body>
<h1>PROCURATION SPÉCIALE</h1>
<p class="meta">Document généré par CITURBAREA — Pivot Visa du foncier. Valeur probante via signature
électronique horodatée + Apostille de La Haye (Maroc signataire depuis 2016).</p>
<p>Je soussigné(e), Marocain(e) Résident(e) à l'Étranger (MRE), donne par les présentes
procuration spéciale à <strong>${input.mandataireNom || "[mandataire local agréé CITURBAREA]"}</strong>
pour la mission de type <strong>${input.missionType}</strong>, à l'effet de :</p>
<ul class="scopes">${scopesList}</ul>
<p>La présente procuration est consentie pour une durée de <strong>${input.dureeJours} jours</strong>
à compter de sa signature, conformément aux articles 879 et suivants du Dahir formant Code des
Obligations et Contrats (DOC) relatifs au mandat.</p>
<p>Le mandataire rendra compte de l'exécution de sa mission via la plateforme CITURBAREA,
chaque jalon étant validé par le mandant avant libération des fonds séquestrés (escrow Bank Al-Maghrib).</p>
<div class="sign"><div>Le Mandant (MRE)<br/>Signature électronique horodatée</div>
<div>Le Mandataire agréé<br/>N° Ordre / Adoul</div></div>
</body></html>`;
    }
};
exports.MreDiasporaService = MreDiasporaService;
exports.MreDiasporaService = MreDiasporaService = MreDiasporaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], MreDiasporaService);
