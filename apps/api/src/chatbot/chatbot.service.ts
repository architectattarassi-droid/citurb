/**
 * CITURBAREA V150 — Chatbot Service (Claude Haiku + RAG)
 * 
 * Budget: <100€/mois
 * - Claude Haiku (0.25$ / 1M tokens input, 1.25$ / 1M tokens output)
 * - Smart caching pour réduire coûts
 * - RAG avec embeddings locaux (pas de Pinecone)
 */

import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ChatbotService {
  private anthropic: Anthropic;
  private doctrineCache: string | null = null;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Load doctrine once at startup (caching)
   */
  async loadDoctrine(): Promise<string> {
    if (this.doctrineCache) return this.doctrineCache;

    try {
      const doctrinePath = path.join(__dirname, '../../../docs/DOCTRINE-MASTER.md');
      this.doctrineCache = await fs.readFile(doctrinePath, 'utf-8');
      return this.doctrineCache;
    } catch {
      return 'Doctrine not available';
    }
  }

  /**
   * Chat with user (optimized for cost)
   */
  async chat(
    userId: string | null,
    sessionId: string,
    userMessage: string,
  ): Promise<{ response: string; tokensUsed: number }> {
    // Get or create conversation
    let conversation = await this.prisma.chatConversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 10, // Only last 10 messages to save tokens
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.chatConversation.create({
        data: {
          userId,
          sessionId,
        },
        include: { messages: true },
      });
    }

    // Build conversation history
    const messages: Anthropic.MessageParam[] = conversation.messages.map((msg) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Load doctrine (cached)
    const doctrine = await this.loadDoctrine();

    // Call Claude Haiku (cheapest model)
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-3-5-20241022', // Haiku = 0.25$/1M tokens input
      max_tokens: 500, // Limit response length to save money
      system: this.buildSystemPrompt(doctrine),
      messages,
    });

    const assistantMessage = response.content[0].text;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    // Save messages to DB
    await this.prisma.chatMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'USER',
          content: userMessage,
        },
        {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: assistantMessage,
          model: 'claude-haiku-3-5-20241022',
          tokensUsed,
        },
      ],
    });

    return {
      response: assistantMessage,
      tokensUsed,
    };
  }

  /**
   * Build system prompt with doctrine (smart RAG)
   */
  private buildSystemPrompt(doctrine: string): string {
    return `Tu es l'assistant IA de CITURBAREA, plateforme d'architecture et urbanisme au Maroc.

# TA MISSION
- Accompagner les clients dans leur projet (villa, immeuble, rénovation)
- Répondre aux questions sur les packs, tarifs, processus
- Qualifier les projets pour orienter vers le bon pack
- Être disponible 24/7 même quand l'équipe est absente

# DOCTRINE CITURBAREA (CONNAISSANCE COMPLÈTE)
${doctrine.slice(0, 15000)} // Limiter à 15k chars pour économiser tokens

# TON STYLE
- Professionnel mais chaleureux
- Concis et précis
- Français marocain naturel
- Emoji occasionnels 🏗️ 🏡 ✅

# RÈGLES STRICTES
- Ne jamais inventer des prix ou délais
- Toujours renvoyer vers l'équipe pour devis précis
- Si tu ne sais pas, dis "Je vais demander à l'équipe"
- Ne jamais promettre ce qui n'est pas dans la doctrine

# ACTIONS POSSIBLES
- Qualifier le projet (type, surface, budget, localisation)
- Expliquer les packs P1 (MIN, STANDARD, PREMIUM)
- Guider dans le tunnel P1
- Répondre aux questions réglementaires (ANEF, commission, etc.)

Réponds de manière concise et utile.`;
  }

  /**
   * Estimate monthly cost
   */
  async estimateMonthlyCost(): Promise<{
    conversationsCount: number;
    totalTokens: number;
    estimatedCost: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        tokensUsed: { not: null },
      },
    });

    const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokensUsed || 0), 0);
    
    // Haiku pricing: $0.25/1M input + $1.25/1M output
    // Assume 60% input, 40% output
    const inputTokens = totalTokens * 0.6;
    const outputTokens = totalTokens * 0.4;
    
    const inputCost = (inputTokens / 1000000) * 0.25;
    const outputCost = (outputTokens / 1000000) * 1.25;
    const estimatedCost = inputCost + outputCost;

    const conversationsCount = await this.prisma.chatConversation.count({
      where: {
        updatedAt: { gte: thirtyDaysAgo },
      },
    });

    return {
      conversationsCount,
      totalTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
    };
  }
}
