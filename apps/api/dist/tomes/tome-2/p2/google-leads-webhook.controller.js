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
exports.GoogleLeadsWebhookController = void 0;
const common_1 = require("@nestjs/common");
const tome_at_1 = require("../../tome-at");
const prisma_service_1 = require("../../tome-at/kernel/prisma/prisma.service");
const auth_service_1 = require("../../tome-5/auth/auth.service");
const dossier_service_1 = require("./dossier.service");
const owner_notify_service_1 = require("../../../modules/owner-notify/owner-notify.service");
/**
 * GoogleLeadsWebhookController — réception temps réel des leads Google Ads.
 *
 * Google (formulaire de lead) POST vers  POST /webhooks/google-leads  à chaque
 * envoi. On vérifie la clé (`google_key` == GOOGLE_LEADS_WEBHOOK_KEY), on parse
 * les champs, on mappe la réponse « Quel est votre projet ? » vers la bonne porte,
 * puis on crée un Dossier (via DossierService, comme /p2/intake) → le lead
 * apparaît directement dans /cc/leads et /cc/dossiers, avec notif owner.
 *
 * Endpoint PUBLIC (Google n'envoie pas de JWT) — l'authentification est la clé.
 * Doit répondre HTTP 200 pour que Google valide le webhook (bouton « test »).
 */
let GoogleLeadsWebhookController = class GoogleLeadsWebhookController {
    prisma;
    auth;
    dossiers;
    ownerNotify;
    constructor(prisma, auth, dossiers, ownerNotify) {
        this.prisma = prisma;
        this.auth = auth;
        this.dossiers = dossiers;
        this.ownerNotify = ownerNotify;
    }
    async googleLeads(body) {
        // 1. Vérification de la clé secrète (partagée avec le formulaire Google)
        const expected = process.env.GOOGLE_LEADS_WEBHOOK_KEY || "";
        if (!expected || body?.google_key !== expected) {
            throw new common_1.UnauthorizedException("invalid_google_key");
        }
        // 2. Extraction des champs (Google envoie user_column_data[])
        const cols = Array.isArray(body?.user_column_data) ? body.user_column_data : [];
        const byId = (id) => cols.find((c) => c?.column_id === id)?.string_value || "";
        const byName = (re) => cols.find((c) => re.test(String(c?.column_name || "")))?.string_value || "";
        const fullName = byId("FULL_NAME") || [byId("FIRST_NAME"), byId("LAST_NAME")].filter(Boolean).join(" ").trim();
        const phone = byId("PHONE_NUMBER") || byId("WORK_PHONE");
        const email = byId("EMAIL") || byId("WORK_EMAIL");
        const city = byId("CITY");
        const projet = byName(/projet/i); // question personnalisée « Quel est votre projet ? »
        // 3. Mapping projet → porte
        const p = projet.toLowerCase();
        let porteType = "P1";
        if (/immeuble|promotion|promoteur/.test(p))
            porteType = "P2";
        else if (/r[eé]novation/.test(p))
            porteType = "P3";
        else if (/foncier|expertise/.test(p))
            porteType = "P4";
        // 4. Bouton « Envoyer les données de test » → 200 sans créer de dossier
        if (body?.is_test) {
            return { ok: true, test: true, parsed: { fullName, phone, email, city, projet, porteType } };
        }
        // 5. Pas de moyen de recontact → on accuse quand même réception (200)
        if (!email && !phone) {
            return { ok: true, skipped: "no_contact" };
        }
        // 6. Find / create user CLIENT + Dossier (même logique que /p2/intake)
        const mail = (email || `google-lead-${Date.now()}@citurbarea.unknown`).toLowerCase().trim();
        let user = await this.prisma.user.findUnique({ where: { email: mail } });
        if (!user) {
            const tempPassword = `Citurb-${Math.random().toString(36).slice(2, 10)}!`;
            const reg = await this.auth.register(mail, tempPassword, fullName || undefined);
            user = await this.prisma.user.findUnique({ where: { id: reg.user.id } });
        }
        if (!user)
            return { ok: true };
        const title = `${porteType} — Google Ads${city ? " · " + city : ""}`;
        const dossier = await this.dossiers.create(user.id, {
            title,
            commune: city || undefined,
            porteType,
            gestionMode: "AUTONOME",
            clientNom: fullName || undefined,
            clientTel: phone || undefined,
            clientEmail: mail,
            payload: {
                source: "GOOGLE_ADS",
                lang: "fr",
                brief: projet ? `Projet déclaré : ${projet}` : undefined,
                googleLead: {
                    lead_id: body?.lead_id,
                    form_id: body?.form_id,
                    campaign_id: body?.campaign_id,
                    gcl_id: body?.gcl_id,
                    receivedAt: new Date().toISOString(),
                },
            },
        });
        this.ownerNotify
            .notify("DOSSIER_CREATED", {
            title,
            commune: city,
            packSelected: `${porteType} — Lead Google Ads`,
            dossierId: dossier.id,
        })
            .catch(() => { });
        return { ok: true, dossierId: dossier.id };
    }
};
exports.GoogleLeadsWebhookController = GoogleLeadsWebhookController;
__decorate([
    (0, common_1.Post)("google-leads"),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GoogleLeadsWebhookController.prototype, "googleLeads", null);
exports.GoogleLeadsWebhookController = GoogleLeadsWebhookController = __decorate([
    (0, tome_at_1.Tome)("tome2"),
    (0, common_1.Controller)("webhooks"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auth_service_1.AuthService,
        dossier_service_1.DossierService,
        owner_notify_service_1.OwnerNotifyService])
], GoogleLeadsWebhookController);
