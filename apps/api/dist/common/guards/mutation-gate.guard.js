"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutationGateGuard = void 0;
const common_1 = require("@nestjs/common");
const raise_doctrine_1 = require("../../modules/kernel/raise-doctrine");
const contracts_1 = require("@citurbarea/contracts");
/**
 * Tome @ enforcement:
 * - Toute mutation (POST/PUT/PATCH/DELETE) doit passer par le pipeline Tome @ (Orchestrator).
 * - Exceptions: webhooks Stripe, auth, health, docs.
 *
 * Objectif: empêcher toute dérive "controller direct" qui court-circuite les tomes.
 */
let MutationGateGuard = class MutationGateGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const method = (req.method || "").toUpperCase();
        const url = req.originalUrl || req.url || "";
        const path = req.path || url.split("?")[0] || "";
        const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
        if (!isMutation)
            return true;
        // Allow-list (mutations autorisées hors orchestrator)
        const allow = [
            "/webhooks", // Stripe webhook (public, signature-verified)
            "/tomes/tome-at/stripe/webhook", // Stripe (legacy path)
            "/auth", // login/refresh
            "/health", // health checks
            "/docs", // swagger (si exposé)
            "/tomes/tome-at/orchestrator", // pipeline canonique
            "/api/cc", // backoffice CC (admin mutations: leads, pack-validation, etc.)
            "/api/cercles", // réseau pro CITURBAREA (chat, votes, pétitions, visios)
            "/api/dm", // messagerie directe 1-to-1 entre pros (Sprint L)
            "/api/feed", // fil général public — posts généraux (Sprint M)
            "/api/marketplace", // marketplace BTP — vitrine fournisseurs (Sprint M+)
            "/admin", // app admin ultra-sécurisée Sprint H (silos étanche, garde dédié)
            "/api/admin", // bridge vault ↔ User JWT + endpoints admin sous /api/*
            "/api/payment", // Stripe checkout session creation (auth user)
            "/api/pv-chantier", // PV de chantier (Tome 2) — mutations JWT-gated
            "/api/pv-commission", // PV commission Rokhas (Tome 2) — upload + workflow réserves
            "/api/materials", // Catalogue matériaux (POST observation anonyme)
            "/api/livraisons", // Livraisons matériaux (commandes, réception chantier)
            "/api/prestataire-tarifs", // Tarifs contractuels P6 (CRUD + signature contrat)
            "/api/project-calendar", // Calendrier projet (Tome 6) — tâches + CPM replan
            "/api/dossier", // Dossier interactions timeline (Tome 6)
            "/api/me", // Mentions read + marquage lu
            "/api/telemetry", // Web Vitals + client error reporter (silent fail)
            "/api/notifications-hub", // Notifications hub centralisé (Tome 0) — dispatch + prefs + push subs
            "/api/lead-funnel", // Lead capture + scoring + nurture (Phase 5)
            "/api/documents-repo", // Documents repository + e-signature multi-parties
            "/api/permis-construire", // PC wizard 5 étapes + génération formulaires
            "/api/rokhas-tracker", // Tracker visuel instruction permis
            "/api/sous-traitants", // Sous-traitants management loi 32-99
            "/api/reception", // PV réception + permis habiter + garanties
            "/api/incidents-chantier", // Incidents + SOS + weather replan
            "/api/zillow-ma", // Estimation foncière publique (Visa du foncier)
            "/api/dossier-overview", // Dashboard client unifié Mon Parcours
            "/api/mre-diaspora", // Parcours MRE — procuration eIDAS + escrow (Pivot Visa foncier)
            "/api/analytics-hub", // Instrumentation events 6 portes (POST event public)
            "/api/chef-copilote", // Copilote IA chef chantier darija (Brahim)
            "/api/avance-tresorerie", // Avance trésorerie sur situation (Brahim)
            "/api/mandataires", // Annuaire mandataires agréés (missions MRE)
            "/api/opci-tokenise", // OPCI tokenisé AMMC (souscription parts MRE)
            "/api/cps", // Générateur CPS (Tome 2) — génération document lecture seule
            "/uploads", // Upload présigné (R2 prod / local dev) — médias fiche cabinet
            "/api/pro", // Fiche cabinet d'architecte (CRUD projets + médias, ancrée sur ProProfile)
            "/p1",
            "/p2",
            "/p3",
            "/p4",
            "/p5",
            "/p6",
        ];
        const allowed = allow.some((p) => path === p || path.startsWith(p + "/"));
        if (allowed)
            return true;
        // Blocage doctrinal: mutation hors pipeline
        (0, raise_doctrine_1.raiseDoctrine)({
            messagePublic: "Action impossible.",
            httpStatus: 403,
            rule_id: contracts_1.RULES.MUTATION_GATE ?? contracts_1.RULES.TRACE_REDACTION,
            error_code: "ERR-T@-MUTATION-GATE",
            category: "DOCTRINE_BLOCK",
            severity: "CRITICAL",
            public_code: "CIT-403-0010",
            sources: [contracts_1.RULES.MUTATION_GATE ?? contracts_1.RULES.TRACE_REDACTION],
        });
        return false;
    }
};
exports.MutationGateGuard = MutationGateGuard;
exports.MutationGateGuard = MutationGateGuard = __decorate([
    (0, common_1.Injectable)()
], MutationGateGuard);
