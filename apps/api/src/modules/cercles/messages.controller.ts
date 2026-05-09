import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
import { join, extname } from "path";
import { mkdirSync, existsSync, statSync } from "fs";
import type { Request, Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { MessagesService, SendMessageInput } from "./messages.service";
import { MessagesStreamService } from "./messages-stream.service";
import { CerclesService } from "./cercles.service";
import { JwtService } from "@nestjs/jwt";

const UPLOAD_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const CHAT_UPLOAD_DIR = join(UPLOAD_BASE, "cercles-chat");
try {
  mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
} catch {}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"]);
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav"]);
const ALLOWED_FILE_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
]);

function classify(mime: string): "IMAGE" | "VIDEO" | "AUDIO" | "FILE" | null {
  if (IMAGE_MIMES.has(mime)) return "IMAGE";
  if (VIDEO_MIMES.has(mime)) return "VIDEO";
  if (AUDIO_MIMES.has(mime)) return "AUDIO";
  if (ALLOWED_FILE_MIMES.has(mime)) return "FILE";
  return null;
}

function sizeLimitFor(kind: "IMAGE" | "VIDEO" | "AUDIO" | "FILE"): number {
  if (kind === "IMAGE") return MAX_IMAGE_BYTES;
  if (kind === "VIDEO") return MAX_VIDEO_BYTES;
  if (kind === "AUDIO") return MAX_VIDEO_BYTES;
  return MAX_FILE_BYTES;
}

@Tome("tome8")
@Controller("api/cercles/:cercleId/messages")
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly stream: MessagesStreamService,
    private readonly cercles: CerclesService,
    private readonly jwt: JwtService,
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  private displayName(req: any): string {
    return req?.user?.username || req?.user?.email || "Membre";
  }

  // ── List (cursor) ──────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Query("beforeId") beforeId?: string,
    @Query("take") take?: string,
  ) {
    return {
      ok: true,
      ...(await this.messages.list(cercleId, this.uid(req), {
        beforeId: beforeId || undefined,
        take: take ? Number(take) : undefined,
      })),
    };
  }

  // ── Send ───────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  async send(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Body() body: SendMessageInput,
  ) {
    return { ok: true, ...(await this.messages.send(cercleId, this.uid(req), body)) };
  }

  // ── Edit ───────────────────────────────────────────────────────

  @Patch(":messageId")
  @UseGuards(JwtAuthGuard)
  async edit(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Param("messageId") messageId: string,
    @Body() body: { body: string },
  ) {
    return { ok: true, data: await this.messages.edit(cercleId, messageId, this.uid(req), body.body) };
  }

  // ── Delete ─────────────────────────────────────────────────────

  @Delete(":messageId")
  @UseGuards(JwtAuthGuard)
  async deleteOne(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Param("messageId") messageId: string,
  ) {
    return { ok: true, data: await this.messages.softDelete(cercleId, messageId, this.uid(req)) };
  }

  // ── Reactions ──────────────────────────────────────────────────

  @Post(":messageId/reactions")
  @UseGuards(JwtAuthGuard)
  async react(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Param("messageId") messageId: string,
    @Body() body: { emoji: string },
  ) {
    return {
      ok: true,
      data: await this.messages.toggleReaction(cercleId, messageId, this.uid(req), body.emoji),
    };
  }

  // ── Read receipts ──────────────────────────────────────────────

  @Post("read")
  @UseGuards(JwtAuthGuard)
  async markRead(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Body() body: { upToMessageId: string },
  ) {
    return {
      ok: true,
      data: await this.messages.markRead(cercleId, this.uid(req), body.upToMessageId),
    };
  }

  // ── Search ─────────────────────────────────────────────────────

  @Get("search")
  @UseGuards(JwtAuthGuard)
  async search(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Query("q") q: string,
    @Query("take") take?: string,
  ) {
    return {
      ok: true,
      ...(await this.messages.search(cercleId, this.uid(req), q || "", take ? Number(take) : 30)),
    };
  }

  // ── Typing ─────────────────────────────────────────────────────

  @Post("typing")
  @UseGuards(JwtAuthGuard)
  async typing(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @Body() body: { isTyping: boolean },
  ) {
    await this.cercles.assertMember(cercleId, this.uid(req));
    this.stream.typing(cercleId, this.uid(req), this.displayName(req), !!body.isTyping);
    return { ok: true };
  }

  // ── Upload (multipart) ─────────────────────────────────────────

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const cercleId = req.params?.cercleId;
          const dir = join(CHAT_UPLOAD_DIR, cercleId || "_misc");
          try {
            mkdirSync(dir, { recursive: true });
          } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
          const stamp = Date.now().toString(36);
          const rand = Math.random().toString(36).slice(2, 8);
          cb(null, `${stamp}-${rand}-${safe}`);
        },
      }),
      limits: { fileSize: MAX_VIDEO_BYTES },
    }),
  )
  async upload(
    @Req() req: any,
    @Param("cercleId") cercleId: string,
    @UploadedFiles() files: Array<any>,
  ) {
    await this.cercles.assertMember(cercleId, this.uid(req));
    if (!files || files.length === 0) throw new BadRequestException("Aucun fichier");

    const out = files.map((f) => {
      const kind = classify(f.mimetype);
      if (!kind) throw new BadRequestException(`Type non autorisé: ${f.mimetype}`);
      if (f.size > sizeLimitFor(kind)) {
        throw new BadRequestException(`Fichier trop volumineux: ${f.originalname}`);
      }
      // fileKey relatif sous uploads/ pour servir via /uploads/...
      const relative = `cercles-chat/${cercleId}/${f.filename}`;
      return {
        type: kind,
        fileKey: relative,
        url: `/uploads/${relative}`,
        filename: f.originalname,
        mimeType: f.mimetype,
        sizeBytes: f.size,
      };
    });
    return { ok: true, data: out };
  }

  // ── SSE stream ─────────────────────────────────────────────────
  // EventSource ne peut pas envoyer de header Authorization → on accepte
  // un access_token en query string (court-vivant, vérifié JWT serveur).

  @Get("stream")
  async stream_(
    @Req() req: Request & { query: { access_token?: string } },
    @Res() res: Response,
    @Param("cercleId") cercleId: string,
  ) {
    const token = (req.query?.access_token as string) || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) {
      res.status(401).json({ ok: false, error: "Token requis" });
      return;
    }
    let userId: string;
    try {
      const payload: any = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      userId = payload.userId || payload.sub;
      if (!userId) throw new Error("payload invalide");
    } catch {
      res.status(401).json({ ok: false, error: "Token invalide" });
      return;
    }
    if (!(await this.cercles.isMember(cercleId, userId))) {
      res.status(403).json({ ok: false, error: "Membre requis" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    res.write(`event: hello\ndata: ${JSON.stringify({ cercleId, at: Date.now() })}\n\n`);

    const unsubscribe = this.stream.subscribe(cercleId, userId, res);
    req.on("close", () => {
      unsubscribe();
      try {
        res.end();
      } catch {}
    });
  }
}
