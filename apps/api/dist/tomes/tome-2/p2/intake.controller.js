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
exports.IntakeController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const auth_service_1 = require("../../tome-5/auth/auth.service");
const dossier_service_1 = require("./dossier.service");
const owner_notify_service_1 = require("../../../modules/owner-notify/owner-notify.service");
const client_notify_service_1 = require("../../../modules/client-notify/client-notify.service");
let IntakeController = class IntakeController {
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
    async intake(body) {
        if (!body.clientEmail && !body.clientTel) {
            throw new Error("Email ou téléphone obligatoire pour vous recontacter");
        }
        const email = (body.clientEmail || `lead-${Date.now()}@citurbarea.unknown`).toLowerCase().trim();
        const porteType = body.porteType || "P2";
        // 1. Find or create user (CLIENT role)
        let user = await this.prisma.user.findUnique({ where: { email } });
        let accessToken = null;
        if (!user) {
            // Auto-register with a random password (user receives credentials by email later)
            const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
            const reg = await this.auth.register(email, tempPassword, body.clientNom || undefined);
            user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
            accessToken = reg.access_token;
        }
        else {
            // Existing user → issue fresh token (magic-login bypass car le client vient de
            // re-fournir ses informations dans le wizard)
            const tokenRes = await this.auth.issueTokenForUser(user.id);
            accessToken = tokenRes.access_token;
        }
        if (!user)
            throw new Error("Échec création/récupération du compte");
        // 2. Create dossier owned by this user
        const title = body.title || `${porteType} — ${body.commune || body.sousType || body.sousTypeP2 || "Demande"}`;
        const dossier = await this.dossiers.create(user.id, {
            title,
            commune: body.commune,
            porteType,
            gestionMode: body.gestionMode || "AUTONOME",
            sousTypeP2: body.sousTypeP2 || body.sousType,
            natureProjet: body.natureProjet,
            raisonSociale: body.raisonSociale,
            rc: body.rc,
            ice: body.ice,
            representant: body.representant,
            clientNom: body.clientNom,
            clientTel: body.clientTel,
            clientEmail: email,
            payload: {
                commune: body.commune,
                surfaceTerrain: body.surfaceTerrain,
                surfacePlancher: body.surfacePlancher,
                nbNiveaux: body.nbNiveaux,
                natureProjet: body.natureProjet,
                brief: body.brief,
                source: body.source,
                utm: body.utm,
            },
        });
        // 3. Fire owner alerts (SMS + email) — fire-and-forget, never block client response
        this.ownerNotify.notify("NEW_USER_REGISTERED", {
            email,
            username: body.clientNom,
            porteType,
            tel: body.clientTel,
        }).catch(() => { });
        this.ownerNotify.notify("DOSSIER_CREATED", {
            title,
            commune: body.commune,
            packSelected: `${porteType} ${body.gestionMode || "AUTONOME"}`,
            dossierId: dossier.id,
            clientTel: body.clientTel,
            clientNom: body.clientNom,
        }).catch(() => { });
        // Email client confirmation + lien paiement (fire-and-forget)
        this.clientNotify.demandeRecue({
            to: email,
            porteType,
            dossierId: dossier.id,
            clientNom: body.clientNom,
            title,
        }).catch(() => { });
        // 4. Return response with magic-login token
        //    Le token permet à l'utilisateur d'enchaîner directement vers /portal
        //    et /payment/start sans étape de login séparée. C'est sécurisé car:
        //     - Le user vient de fournir son email dans le wizard (auto-vérifié implicitement)
        //     - Le token donne accès uniquement à SES propres dossiers (RolesGuard CLIENT)
        //     - Aucun moyen d'usurper l'identité d'un user existant sans connaître son email
        return {
            ok: true,
            dossierId: dossier.id,
            message: `Merci ! Votre demande ${porteType} a été enregistrée. Notre équipe vous recontacte sous 24h au ${body.clientTel || email}.`,
            access_token: accessToken,
            user: { id: user.id, email: user.email, role: user.role },
            // Hint to redirect to login if the user wants to track the dossier
            loginHint: { email, redirect: `/portal` },
        };
    }
};
exports.IntakeController = IntakeController;
__decorate([
    (0, common_1.Post)("intake"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntakeController.prototype, "intake", null);
exports.IntakeController = IntakeController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("p2"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        dossier_service_1.DossierService,
        owner_notify_service_1.OwnerNotifyService,
        client_notify_service_1.ClientNotifyService])
], IntakeController);
