import {
  Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { DirectMessagesService } from "./direct-messages.service";
import { DirectMessagesStreamService } from "./direct-messages-stream.service";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * DirectMessagesController — Sprint L
 *
 * Endpoints :
 *   GET    /api/dm/threads                       liste threads du user
 *   POST   /api/dm/threads                       crée/retrouve thread avec un peer
 *   GET    /api/dm/threads/:id/messages          historique paginé
 *   POST   /api/dm/threads/:id/messages          envoie message
 *   POST   /api/dm/threads/:id/read              marque thread comme lu
 *   POST   /api/dm/threads/:id/pin               toggle pin
 *   DELETE /api/dm/threads/:id                   quitter thread (soft)
 *   DELETE /api/dm/threads/:id/messages/:msgId   supprimer message (auteur only)
 *   GET    /api/dm/unread                        total unread (badge sidebar)
 *   GET    /api/dm/events                        SSE temps réel (tous threads du user)
 */

@Tome("tome8")
@Controller("api/dm")
export class DirectMessagesController {
  constructor(
    private readonly dm: DirectMessagesService,
    private readonly stream: DirectMessagesStreamService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  @Get("threads")
  @UseGuards(JwtAuthGuard)
  async listThreads(@Req() req: any) {
    return { ok: true, data: await this.dm.listThreads(this.uid(req)) };
  }

  @Post("threads")
  @UseGuards(JwtAuthGuard)
  async createThread(@Req() req: any, @Body() body: { peerUserId: string; firstMessage?: string }) {
    const thread = await this.dm.getOrCreateThread(this.uid(req), body.peerUserId);
    if (body.firstMessage?.trim()) {
      const msg = await this.dm.sendMessage(thread.id, this.uid(req), body.firstMessage);
      // Notif SSE aux 2 participants
      this.stream.publishToUsers([this.uid(req), body.peerUserId], {
        type: "dm:new",
        payload: { threadId: thread.id, message: msg },
      });
    }
    return { ok: true, data: { threadId: thread.id } };
  }

  @Get("threads/:id/messages")
  @UseGuards(JwtAuthGuard)
  async messages(@Req() req: any, @Param("id") threadId: string, @Query("before") before?: string, @Query("take") take?: string) {
    const msgs = await this.dm.listMessages(threadId, this.uid(req), {
      before,
      take: take ? Number(take) : undefined,
    });
    return { ok: true, data: msgs };
  }

  @Post("threads/:id/messages")
  @UseGuards(JwtAuthGuard)
  async send(@Req() req: any, @Param("id") threadId: string, @Body() body: { body: string; attachments?: any }) {
    const senderId = this.uid(req);
    const msg = await this.dm.sendMessage(threadId, senderId, body.body, body.attachments);
    // Notif SSE aux 2 participants
    const participants = await this.prisma.directThreadParticipant.findMany({
      where: { threadId, leftAt: null },
      select: { userId: true },
    });
    this.stream.publishToUsers(participants.map((p) => p.userId), {
      type: "dm:new",
      payload: { threadId, message: msg },
    });
    return { ok: true, data: msg };
  }

  @Post("threads/:id/read")
  @UseGuards(JwtAuthGuard)
  async read(@Req() req: any, @Param("id") threadId: string) {
    const result = await this.dm.markRead(threadId, this.uid(req));
    // Notif au peer qu'on a lu
    const participants = await this.prisma.directThreadParticipant.findMany({
      where: { threadId, leftAt: null },
      select: { userId: true },
    });
    this.stream.publishToUsers(participants.filter(p => p.userId !== this.uid(req)).map(p => p.userId), {
      type: "dm:read",
      payload: { threadId, readerId: this.uid(req), at: Date.now() },
    });
    return result;
  }

  @Post("threads/:id/pin")
  @UseGuards(JwtAuthGuard)
  async pin(@Req() req: any, @Param("id") threadId: string) {
    const updated = await this.dm.pinToggle(threadId, this.uid(req));
    return { ok: true, data: { pinned: updated.pinned } };
  }

  @Delete("threads/:id")
  @UseGuards(JwtAuthGuard)
  async leave(@Req() req: any, @Param("id") threadId: string) {
    return { ok: true, data: await this.dm.leaveThread(threadId, this.uid(req)) };
  }

  @Delete("threads/:id/messages/:msgId")
  @UseGuards(JwtAuthGuard)
  async deleteMsg(@Req() req: any, @Param("id") threadId: string, @Param("msgId") msgId: string) {
    const deleted = await this.dm.deleteMessage(threadId, msgId, this.uid(req));
    const participants = await this.prisma.directThreadParticipant.findMany({
      where: { threadId, leftAt: null },
      select: { userId: true },
    });
    this.stream.publishToUsers(participants.map(p => p.userId), {
      type: "dm:delete",
      payload: { threadId, messageId: msgId },
    });
    return { ok: true, data: deleted };
  }

  @Get("unread")
  @UseGuards(JwtAuthGuard)
  async unread(@Req() req: any) {
    return { ok: true, data: { count: await this.dm.totalUnread(this.uid(req)) } };
  }

  // SSE — EventSource ne supporte pas Authorization header, on accepte access_token query string
  @Get("events")
  async events(
    @Req() req: Request & { query: { access_token?: string } },
    @Res() res: Response,
  ) {
    const token = (req.query?.access_token as string) || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) { res.status(401).json({ ok: false, error: "Token requis" }); return; }
    let userId: string;
    try {
      const payload: any = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      userId = payload.userId || payload.sub;
      if (!userId) throw new Error("payload invalide");
    } catch {
      res.status(401).json({ ok: false, error: "Token invalide" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`event: hello\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);

    const unsub = this.stream.subscribe(userId, res);
    req.on("close", () => { unsub(); try { res.end(); } catch {} });
  }
}
