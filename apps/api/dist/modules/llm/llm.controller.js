"use strict";
/**
 * LLM Controller — proxy Anthropic pour TerriScan Lab (frontend)
 *
 * Endpoint: POST /api/llm/chat
 *
 * Pourquoi un proxy ?
 *   En production, la clé Anthropic ne doit JAMAIS résider côté navigateur.
 *   Le front (TerriScan Lab) appelle ce proxy authentifié JWT au lieu de
 *   api.anthropic.com directement (cf. AGENT GAMMA pour la solution dev).
 *
 * Le SYSTEM_PROMPT est passé par le client (déjà construit dans TerriScanLab.tsx)
 * pour éviter de dupliquer la doctrine doctorale côté serveur.
 *
 * Implémentation: fetch natif (Node 20.x supporte fetch global) — pas de
 * dépendance @anthropic-ai/sdk pour limiter le footprint.
 */
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
exports.LlmController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../tomes/tome-5/auth/jwt-auth.guard");
let LlmController = class LlmController {
    async chat(body) {
        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            throw new common_1.BadRequestException("messages array required");
        }
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new common_1.InternalServerErrorException("ANTHROPIC_API_KEY non configurée côté serveur");
        }
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: body.model ?? "claude-sonnet-4-20250514",
                max_tokens: body.max_tokens ?? 1000,
                system: body.system ?? "",
                messages: body.messages.map(m => ({ role: m.role, content: m.content })),
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new common_1.InternalServerErrorException(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
        }
        const data = (await res.json());
        const block = data.content.find((c) => c.type === "text");
        const text = block && block.text ? block.text : "Réponse vide.";
        return { text };
    }
};
exports.LlmController = LlmController;
__decorate([
    (0, common_1.Post)("chat"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LlmController.prototype, "chat", null);
exports.LlmController = LlmController = __decorate([
    (0, common_1.Controller)("api/llm")
], LlmController);
