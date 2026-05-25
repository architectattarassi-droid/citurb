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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require("multer");
import { join, extname } from "path";
import { mkdirSync } from "fs";
import { Tome } from "../../tome-at";
import { JwtAuthGuard } from "../../tome-5/auth/jwt-auth.guard";
import { DossierInteractionsService } from "./dossier-interactions.service";
import {
  CreateInteractionInput,
  InteractionAttachment,
} from "./dossier-interactions.types";

const UPLOAD_BASE = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const INTERACTIONS_UPLOAD_DIR = join(UPLOAD_BASE, "dossier-interactions");
try { mkdirSync(INTERACTIONS_UPLOAD_DIR, { recursive: true }); } catch {}

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB images/docs
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10MB audio note (~60s m4a/webm)
const AUDIO_MIMES = new Set(["audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/x-m4a"]);

/**
 * DossierInteractionsController — fil d'interactions d'un dossier P1–P6.
 *
 * Endpoints :
 *   GET    /api/dossier/:dossierId/timeline?cursor=&limit=
 *   POST   /api/dossier/:dossierId/timeline                 (multipart si fichier)
 *   PATCH  /api/dossier/:dossierId/timeline/:id
 *   DELETE /api/dossier/:dossierId/timeline/:id             (soft delete)
 *   POST   /api/dossier/:dossierId/timeline/:id/react       (emoji)
 *   POST   /api/dossier/:dossierId/timeline/:id/pin         (OPS / owner)
 *   POST   /api/dossier/:dossierId/timeline/:id/mark-read
 *   GET    /api/me/mentions?unread=true
 *
 * Auth : JWT obligatoire. Permissions fine-grained dans le service.
 * Tome : tome6 (logé sous /api/dossier qui doit être whitelisté MutationGate).
 */
@Tome("tome6")
@Controller()
@UseGuards(JwtAuthGuard)
export class DossierInteractionsController {
  constructor(private readonly svc: DossierInteractionsService) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub || "";
  }
  private role(req: any): string {
    return req?.user?.role || "CLIENT";
  }

  // ── Timeline (list) ──────────────────────────────────────────

  @Get("api/dossier/:dossierId/timeline")
  async list(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const page = await this.svc.listTimeline(
      dossierId,
      { userId: this.uid(req), role: this.role(req) },
      { cursor: cursor || undefined, limit: limit ? Number(limit) : undefined },
    );
    return { ok: true, ...page };
  }

  // ── Create (JSON ou multipart) ───────────────────────────────

  @Post("api/dossier/:dossierId/timeline")
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: diskStorage({
        destination: INTERACTIONS_UPLOAD_DIR,
        filename: (_req: any, file: any, cb: any) => {
          const safe = (file.originalname || "file").replace(/[^a-zA-Z0-9_.-]/g, "_");
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          cb(null, `${id}_${safe}`);
        },
      }),
      limits: { fileSize: MAX_FILE_BYTES },
    }),
  )
  async create(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Body() body: any,
    @UploadedFiles() files: any[],
  ) {
    let mentions: string[] = [];
    if (typeof body?.mentions === "string") {
      try { mentions = JSON.parse(body.mentions); } catch { mentions = []; }
    } else if (Array.isArray(body?.mentions)) {
      mentions = body.mentions;
    }
    let metadata: Record<string, unknown> = {};
    if (typeof body?.metadata === "string") {
      try { metadata = JSON.parse(body.metadata); } catch { metadata = {}; }
    } else if (body?.metadata && typeof body.metadata === "object") {
      metadata = body.metadata;
    }

    const attachments: InteractionAttachment[] = (files || []).map((f) => {
      const isAudio = AUDIO_MIMES.has(f.mimetype);
      if (isAudio && f.size > MAX_AUDIO_BYTES) {
        throw new BadRequestException("audio_note_too_large");
      }
      return {
        url: `/uploads/dossier-interactions/${f.filename}`,
        mime: f.mimetype || "application/octet-stream",
        size: f.size || 0,
        filename: f.originalname || f.filename,
      };
    });

    const inferredType = body?.type
      ? (body.type as CreateInteractionInput["type"])
      : (attachments.some(a => AUDIO_MIMES.has(a.mime)) ? "AUDIO_NOTE" :
         attachments.length > 0 ? "FILE_UPLOADED" : "COMMENT");

    const input: CreateInteractionInput = {
      type: inferredType,
      contentMD: String(body?.contentMD ?? ""),
      parentId: body?.parentId || null,
      mentions,
      attachments,
      visibility: (body?.visibility as any) || "PUBLIC",
      metadata,
    };

    const item = await this.svc.create(
      dossierId,
      { userId: this.uid(req), role: this.role(req) },
      input,
    );
    return { ok: true, item };
  }

  // ── Edit ─────────────────────────────────────────────────────

  @Patch("api/dossier/:dossierId/timeline/:id")
  async edit(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
    @Body() body: { contentMD?: string; mentions?: string[]; attachments?: InteractionAttachment[] },
  ) {
    const item = await this.svc.edit(
      dossierId,
      id,
      { userId: this.uid(req), role: this.role(req) },
      body,
    );
    return { ok: true, item };
  }

  // ── Delete (soft) ────────────────────────────────────────────

  @Delete("api/dossier/:dossierId/timeline/:id")
  async remove(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
  ) {
    return this.svc.softDelete(
      dossierId, id,
      { userId: this.uid(req), role: this.role(req) },
    );
  }

  // ── React ────────────────────────────────────────────────────

  @Post("api/dossier/:dossierId/timeline/:id/react")
  async react(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
    @Body() body: { emoji: string },
  ) {
    if (!body?.emoji) throw new BadRequestException("emoji_required");
    const item = await this.svc.react(
      dossierId, id,
      { userId: this.uid(req), role: this.role(req) },
      body.emoji,
    );
    return { ok: true, item };
  }

  // ── Pin ──────────────────────────────────────────────────────

  @Post("api/dossier/:dossierId/timeline/:id/pin")
  async pin(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
    @Body() body: { pinned?: boolean },
  ) {
    const item = await this.svc.pin(
      dossierId, id,
      { userId: this.uid(req), role: this.role(req) },
      body?.pinned !== false,
    );
    return { ok: true, item };
  }

  // ── Mark-read ────────────────────────────────────────────────

  @Post("api/dossier/:dossierId/timeline/:id/mark-read")
  async markRead(
    @Req() req: any,
    @Param("dossierId") dossierId: string,
    @Param("id") id: string,
  ) {
    return this.svc.markRead(dossierId, id, { userId: this.uid(req) });
  }

  // ── My mentions (cross-dossier) ──────────────────────────────

  @Get("api/me/mentions")
  async myMentions(
    @Req() req: any,
    @Query("unread") unread?: string,
    @Query("limit") limit?: string,
  ) {
    const items = await this.svc.myMentions(this.uid(req), {
      unread: unread === "true" || unread === "1",
      limit: limit ? Number(limit) : undefined,
    });
    return { ok: true, items, count: items.length };
  }
}
