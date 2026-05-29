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

import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  messages: ChatMessage[];
  system?: string;
  model?: string;
  max_tokens?: number;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
}

@Controller("api/llm")
export class LlmController {
  @Post("chat")
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: ChatBody): Promise<{ text: string }> {
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new BadRequestException("messages array required");
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException("ANTHROPIC_API_KEY non configurée côté serveur");
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
      throw new InternalServerErrorException(`Anthropic ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const block = data.content.find((c: AnthropicContentBlock) => c.type === "text");
    const text = block && block.text ? block.text : "Réponse vide.";

    return { text };
  }
}
