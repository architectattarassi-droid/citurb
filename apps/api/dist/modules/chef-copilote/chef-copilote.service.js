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
var ChefCopiloteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChefCopiloteService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../kernel/prisma/prisma.service");
/**
 * ChefCopiloteService — copilote IA chef de chantier (darija/français).
 *
 * Persona Brahim : "un assistant IA qui CONNAÎT MES chantiers, en darija vocal".
 * Modèle Haiku 4.5 via l'API Anthropic en fetch direct (zéro dépendance npm).
 * Contexte injecté depuis les dossiers actifs (sous-traitants, livraisons, incidents, tâches).
 */
let ChefCopiloteService = ChefCopiloteService_1 = class ChefCopiloteService {
    prisma;
    logger = new common_1.Logger(ChefCopiloteService_1.name);
    apiKey = process.env.ANTHROPIC_API_KEY || "";
    constructor(prisma) {
        this.prisma = prisma;
    }
    /** Construit le contexte chantier d'un dossier pour le LLM. */
    async buildContext(dossierId) {
        try {
            const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
            if (!d)
                return "Aucun dossier trouvé.";
            const pl = d.payload || {};
            const lines = [];
            lines.push(`Dossier: ${d.title || d.id} (statut ${d.status})`);
            const st = pl.sousTraitants || [];
            if (st.length)
                lines.push(`Sous-traitants: ${st.length} assignés. ` +
                    st.slice(0, 5).map((s) => `${s.lotIntitule}=${s.status}`).join(", "));
            const liv = pl.livraisons || [];
            const pending = liv.filter((l) => ["REQUEST", "CONFIRMED", "EN_ROUTE"].includes(l.status));
            if (pending.length)
                lines.push(`Livraisons en attente: ${pending.length}`);
            const inc = pl.incidents || [];
            const openInc = inc.filter((i) => i.status !== "RESOLVED");
            if (openInc.length)
                lines.push(`Incidents ouverts: ${openInc.length} (${openInc.map((i) => i.type).join(", ")})`);
            const cal = pl.projectCalendar?.tasks || [];
            const inProgress = cal.filter((t) => t.status === "IN_PROGRESS");
            if (inProgress.length)
                lines.push(`Tâches en cours: ${inProgress.map((t) => t.titre).slice(0, 5).join(", ")}`);
            const rokhas = pl.rokhasTracker;
            if (rokhas?.reserves?.length) {
                const open = rokhas.reserves.filter((r) => r.status === "OUVERTE");
                if (open.length)
                    lines.push(`Réserves Rokhas à lever: ${open.length}`);
            }
            return lines.join("\n");
        }
        catch (e) {
            this.logger.warn(`buildContext: ${e?.message}`);
            return "Contexte indisponible.";
        }
    }
    /** Répond à une question du chef (darija/français) avec contexte. */
    async ask(dossierId, query, queryLang = "darija") {
        const context = await this.buildContext(dossierId);
        if (!this.apiKey) {
            return { reply: "Le copilote IA n'est pas configuré (ANTHROPIC_API_KEY manquante). Contexte chantier :\n" + context, model: "none" };
        }
        const model = "claude-haiku-4-5-20251001";
        const system = `Tu es le copilote de chantier de CITURBAREA pour un chef de chantier marocain.
Réponds de façon TRÈS concise et pratique, en darija marocaine (lettres latines) si la question est en darija, sinon en français.
Tu connais SON chantier via le contexte fourni. Donne des actions concrètes, pas de blabla.
Si on te demande quoi faire aujourd'hui, liste 2-4 actions priorisées.
Contexte du chantier:
${context}`;
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({ model, max_tokens: 600, system, messages: [{ role: "user", content: query }] }),
            });
            if (!res.ok)
                throw new Error(`Anthropic HTTP ${res.status}`);
            const data = await res.json();
            const reply = (data?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n") || "…";
            return { reply, model };
        }
        catch (e) {
            this.logger.warn(`LLM ask failed: ${e?.message}`);
            return { reply: "Khouya, le copilote est temporairement indisponible. Réessaye dans un moment.", model };
        }
    }
    /** Suggestions d'actions du jour (sans LLM, heuristique sur le contexte). */
    async suggestions(dossierId) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } }).catch(() => null);
        if (!d)
            return [];
        const pl = d.payload || {};
        const out = [];
        const liv = (pl.livraisons || []).filter((l) => l.status === "EN_ROUTE");
        if (liv.length)
            out.push(`📦 ${liv.length} livraison(s) en route — prépare la réception sur chantier.`);
        const sit = (pl.sousTraitants || []).flatMap((s) => (s.situations || []).filter((x) => !x.validatedAt));
        if (sit.length)
            out.push(`✅ ${sit.length} situation(s) sous-traitant à valider.`);
        const openInc = (pl.incidents || []).filter((i) => i.status !== "RESOLVED");
        if (openInc.length)
            out.push(`⚠️ ${openInc.length} incident(s) ouvert(s) à traiter.`);
        const reserves = (pl.rokhasTracker?.reserves || []).filter((r) => r.status === "OUVERTE");
        if (reserves.length)
            out.push(`📋 ${reserves.length} réserve(s) Rokhas à lever avant délai légal.`);
        if (!out.length)
            out.push("✅ Aucune action urgente aujourd'hui. Bon chantier khouya !");
        return out;
    }
};
exports.ChefCopiloteService = ChefCopiloteService;
exports.ChefCopiloteService = ChefCopiloteService = ChefCopiloteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChefCopiloteService);
