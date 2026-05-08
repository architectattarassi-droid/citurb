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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDossierController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const auth_service_1 = require("../../tome-5/auth/auth.service");
const jwt_auth_guard_1 = require("../../tome-5/auth/jwt-auth.guard");
const roles_guard_1 = require("../../tome-5/auth/roles.guard");
const roles_decorator_1 = require("../../tome-5/auth/roles.decorator");
const dossier_service_1 = require("./dossier.service");
const owner_notify_service_1 = require("../../../modules/owner-notify/owner-notify.service");
const client_notify_service_1 = require("../../../modules/client-notify/client-notify.service");
let AdminDossierController = class AdminDossierController {
    prisma;
    auth;
    dossiers;
    ownerNotify;
    clientNotify;
    constructor(prisma, auth, dossiers, ownerNotify, clientNotify) {
        this.prisma = prisma;
        this.auth = auth;
        this.dossiers = dossiers;
        this.ownerNotify = ownerNotify;
        this.clientNotify = clientNotify;
    }
    async adminCreate(body) {
        if (!body.porteType)
            throw new Error("porteType requis (P1..P6)");
        if (!body.clientNom && !body.raisonSociale && !body.clientEmail && !body.clientTel) {
            throw new Error("Au moins un identifiant client requis (nom, raison sociale, email ou tél)");
        }
        const porteType = body.porteType;
        const email = (body.clientEmail || `client-${Date.now()}@citurbarea.local`).toLowerCase().trim();
        const lang = body.lang === "en" || body.lang === "ar" ? body.lang : "fr";
        // 1. Find / create user CLIENT
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
            const reg = await this.auth.register(email, tempPassword, body.clientNom || body.raisonSociale || undefined);
            user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
        }
        if (!user)
            throw new Error("Échec création/récupération du compte client");
        // 2. Crée le dossier (DossierService gère phase BRIEF auto)
        const title = body.title || `${porteType} — ${body.commune || body.sousType || body.sousTypeP2 || body.clientNom || "Demande"}`;
        const dossier = await this.dossiers.create(user.id, {
            title,
            commune: body.commune,
            porteType,
            gestionMode: body.gestionMode || "AUTONOME",
            sousTypeP2: body.sousTypeP2 || body.sousType,
            natureProjet: body.natureProjet,
            surfaceTerrain: body.surfaceTerrain,
            surfacePlancher: body.surfacePlancher,
            nbNiveaux: body.nbNiveaux,
            raisonSociale: body.raisonSociale,
            rc: body.rc,
            ice: body.ice,
            representant: body.representant,
            clientNom: body.clientNom,
            clientTel: body.clientTel,
            clientEmail: email,
            packSelected: body.packSelected,
            packPriceMAD: body.packPriceMAD,
            payload: {
                brief: body.brief,
                source: "ADMIN_CREATE",
                lang,
                adminCreatedAt: new Date().toISOString(),
            },
        });
        // 3. Notif owner — dossier créé manuellement par admin
        this.ownerNotify.notify("DOSSIER_CREATED", {
            title, commune: body.commune,
            packSelected: body.packSelected || `${porteType} ${body.gestionMode || "AUTONOME"} (admin)`,
            dossierId: dossier.id,
        }).catch(() => { });
        // 4. Optionnellement invite le client (magic-login + email)
        let inviteResult = { invited: false };
        if (body.inviteClient && body.clientEmail && !body.clientEmail.endsWith(".local")) {
            try {
                const tokenRes = await this.auth.issueTokenForUser(user.id);
                const webUrl = process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
                const magicLoginUrl = `${webUrl}/portal?magicToken=${encodeURIComponent(tokenRes.access_token)}`;
                // Email "demande reçue" suffit — il contient déjà les liens vers /portal
                this.clientNotify.demandeRecue({
                    to: email,
                    porteType,
                    dossierId: dossier.id,
                    clientNom: body.clientNom || body.raisonSociale,
                    title,
                    lang,
                }).catch(() => { });
                inviteResult = { invited: true, magicLoginUrl, tokenIssued: true };
            }
            catch (e) {
                inviteResult = { invited: false };
            }
        }
        return {
            ok: true,
            dossierId: dossier.id,
            userId: user.id,
            title,
            porteType,
            ...inviteResult,
        };
    }
    /**
     * Invite (ou réinvite) le client à reprendre la main sur un dossier existant.
     * Émet un nouveau token magic-login et le délivre par email.
     */
    async inviteExisting(dossierId, body) {
        const dossier = await this.prisma.dossier.findUniqueOrThrow({
            where: { id: dossierId },
            select: { id: true, ownerId: true, porteType: true, title: true, clientNom: true, clientEmail: true, payload: true },
        });
        if (!dossier.clientEmail || dossier.clientEmail.endsWith(".local") || dossier.clientEmail.endsWith(".unknown")) {
            return { ok: false, error: "Aucun email client valide sur ce dossier — éditez d'abord les coordonnées." };
        }
        const langRaw = body?.lang || dossier.payload?.lang;
        const lang = langRaw === "en" || langRaw === "ar" ? langRaw : "fr";
        const tokenRes = await this.auth.issueTokenForUser(dossier.ownerId);
        const webUrl = process.env.PUBLIC_WEB_URL || "https://citurb-web-production.up.railway.app";
        const magicLoginUrl = `${webUrl}/portal?magicToken=${encodeURIComponent(tokenRes.access_token)}`;
        // Reuse demandeRecue email (CTAs vers /portal et /payment/start)
        await this.clientNotify.demandeRecue({
            to: dossier.clientEmail,
            porteType: dossier.porteType ?? "P2",
            dossierId: dossier.id,
            clientNom: dossier.clientNom ?? undefined,
            title: dossier.title ?? undefined,
            lang,
        });
        return { ok: true, magicLoginUrl, sent: dossier.clientEmail };
    }
};
exports.AdminDossierController = AdminDossierController;
__decorate([
    (0, common_1.Post)("admin-create"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminDossierController.prototype, "adminCreate", null);
__decorate([
    (0, common_1.Post)(":id/invite"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminDossierController.prototype, "inviteExisting", null);
exports.AdminDossierController = AdminDossierController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("api/cc/dossiers"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)("ADMIN", "OWNER", "OPS"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        dossier_service_1.DossierService,
        owner_notify_service_1.OwnerNotifyService,
        client_notify_service_1.ClientNotifyService])
], AdminDossierController);
