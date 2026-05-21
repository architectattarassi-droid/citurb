import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage: _ds } = require("multer");
import { join as _joinPath } from "path";
import { mkdirSync as _mk } from "fs";
const _POST_UPLOAD_DIR = _joinPath(process.env.UPLOADS_DIR || _joinPath(process.cwd(), "uploads"), "cercles-posts");
try { _mk(_POST_UPLOAD_DIR, { recursive: true }); } catch {}
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { CerclesService, CreateCercleInput, UpdateCercleInput } from "./cercles.service";
import { MembershipsService } from "./memberships.service";
import { PostsService } from "./posts.service";
import { RoomsService } from "./rooms.service";
import { AnnuaireService, ProProfileInput, AnnuaireSearchInput } from "./annuaire.service";
import { FeedService } from "./feed.service";

/**
 * CerclesController — Sprint C0–C3
 *
 * Toutes les routes préfixées /api/cercles, protégées JWT.
 * Format réponse standard CITURBAREA : { data, meta? } sous wrapper { ok }.
 *
 * Spec : CERCLES-prompt-claude-code.md §2.2
 */
@Tome("tome8")
@Controller("api/cercles")
@UseGuards(JwtAuthGuard)
export class CerclesController {
  constructor(
    private readonly cercles: CerclesService,
    private readonly memberships: MembershipsService,
    private readonly posts: PostsService,
    private readonly rooms: RoomsService,
    private readonly annuaire: AnnuaireService,
    private readonly feed: FeedService,
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  private displayName(req: any): string {
    return req?.user?.username || req?.user?.email || "Membre";
  }

  // ── Feed (Sprint D2) ──────────────────────────────────────────

  @Get("feed")
  async homeFeed(@Req() req: any) {
    return { ok: true, data: await this.feed.homeFeed(this.uid(req)) };
  }

  @Get("discovery")
  async discoveryCercles(@Req() req: any) {
    return { ok: true, data: await this.feed.discoveryCercles(this.uid(req)) };
  }

  // ── Annuaire pro (Sprint D1) ──────────────────────────────────

  @Get("annuaire/facets")
  async annuaireFacets() {
    return { ok: true, data: await this.annuaire.facets() };
  }

  @Get("annuaire/search")
  async annuaireSearch(@Query() q: any) {
    const input: AnnuaireSearchInput = {
      q: q.q || undefined,
      metier: q.metier || undefined,
      classeBTP: q.classeBTP || undefined,
      region: q.region || undefined,
      specialite: q.specialite || undefined,
      isVerified: q.verified === "true" ? true : q.verified === "false" ? false : undefined,
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    };
    return { ok: true, ...(await this.annuaire.search(input)) };
  }

  @Get("annuaire/suggestions")
  async annuaireSuggestions(@Req() req: any, @Query("take") take?: string) {
    return { ok: true, data: await this.annuaire.suggestions(this.uid(req), take ? Number(take) : 6) };
  }

  @Get("me/profile")
  async myProfile(@Req() req: any) {
    return { ok: true, data: await this.annuaire.getMyProfile(this.uid(req)) };
  }

  @Post("me/profile")
  async upsertMyProfile(@Req() req: any, @Body() body: ProProfileInput) {
    return { ok: true, data: await this.annuaire.upsertMyProfile(this.uid(req), body) };
  }

  @Get("profile/:userIdOrId")
  async publicProfile(@Param("userIdOrId") userIdOrId: string) {
    return { ok: true, data: await this.annuaire.getProfile(userIdOrId) };
  }

  @Get("profile/:userIdOrId/cercles")
  async profileCercles(@Param("userIdOrId") userIdOrId: string) {
    return { ok: true, data: await this.annuaire.getUserCercles(userIdOrId) };
  }

  @Get("profile/:userIdOrId/posts")
  async profilePosts(@Param("userIdOrId") userIdOrId: string) {
    return { ok: true, data: await this.annuaire.getUserPosts(userIdOrId) };
  }

  @Get("profile/:userIdOrId/rooms")
  async profileRooms(@Param("userIdOrId") userIdOrId: string) {
    return { ok: true, data: await this.annuaire.getUserRooms(userIdOrId) };
  }

  @Post("connections/:toUserId")
  async sendConnection(@Req() req: any, @Param("toUserId") toUserId: string, @Body() body: { message?: string }) {
    return { ok: true, data: await this.annuaire.sendConnection(this.uid(req), toUserId, body?.message) };
  }

  @Post("connections/:fromUserId/accept")
  async acceptConnection(@Req() req: any, @Param("fromUserId") fromUserId: string) {
    return { ok: true, data: await this.annuaire.respondConnection(this.uid(req), fromUserId, true) };
  }

  @Post("connections/:fromUserId/reject")
  async rejectConnection(@Req() req: any, @Param("fromUserId") fromUserId: string) {
    return { ok: true, data: await this.annuaire.respondConnection(this.uid(req), fromUserId, false) };
  }

  @Get("connections")
  async connections(@Req() req: any) {
    return { ok: true, data: await this.annuaire.listConnections(this.uid(req)) };
  }

  @Get("connections/pending")
  async pendingConnections(@Req() req: any) {
    return { ok: true, data: await this.annuaire.listPendingRequests(this.uid(req)) };
  }

  // ── Cercles ──────────────────────────────────────────────────

  @Get()
  async list(@Req() req: any, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return { ok: true, ...(await this.cercles.list(this.uid(req), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })) };
  }

  @Get(":slug")
  async detail(@Req() req: any, @Param("slug") slug: string) {
    return { ok: true, data: await this.cercles.getBySlug(slug, this.uid(req)) };
  }

  @Post()
  async create(@Req() req: any, @Body() body: CreateCercleInput) {
    return { ok: true, data: await this.cercles.create(this.uid(req), body) };
  }

  @Patch(":id")
  async update(@Req() req: any, @Param("id") id: string, @Body() body: UpdateCercleInput) {
    return { ok: true, data: await this.cercles.update(id, this.uid(req), body) };
  }

  @Delete(":id")
  async softDelete(@Req() req: any, @Param("id") id: string) {
    return { ok: true, data: await this.cercles.softDelete(id, this.uid(req)) };
  }

  // ── Memberships ──────────────────────────────────────────────

  @Post(":cercleId/join")
  async join(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.memberships.join(cercleId, this.uid(req)) };
  }

  @Post(":cercleId/leave")
  async leave(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.memberships.leave(cercleId, this.uid(req)) };
  }

  @Post(":cercleId/invitations")
  async invite(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: { userId: string; role?: "MEMBER" | "CONTRIBUTOR" | "MODERATOR" }) {
    return { ok: true, data: await this.memberships.invite(cercleId, this.uid(req), body.userId, body.role) };
  }

  @Post(":cercleId/invitations/:userId/accept")
  async acceptInvite(@Req() req: any, @Param("cercleId") cercleId: string, @Param("userId") userId: string) {
    if (userId !== this.uid(req)) {
      // Sécurité : seul le destinataire de l'invitation peut accepter
      return { ok: false, error: "Invitation destinée à un autre user" };
    }
    return { ok: true, data: await this.memberships.acceptInvitation(cercleId, userId) };
  }

  @Get(":cercleId/members")
  async members(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.memberships.listMembers(cercleId, this.uid(req)) };
  }

  @Post(":cercleId/moderators/:userId")
  async promote(@Req() req: any, @Param("cercleId") cercleId: string, @Param("userId") userId: string) {
    return { ok: true, data: await this.memberships.promote(cercleId, this.uid(req), userId) };
  }

  @Delete(":cercleId/members/:userId")
  async ban(@Req() req: any, @Param("cercleId") cercleId: string, @Param("userId") userId: string) {
    return { ok: true, data: await this.memberships.ban(cercleId, this.uid(req), userId) };
  }

  // ── Posts ────────────────────────────────────────────────────

  @Get(":cercleId/posts")
  async listPosts(@Req() req: any, @Param("cercleId") cercleId: string, @Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return { ok: true, ...(await this.posts.list(cercleId, this.uid(req), {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })) };
  }

  @Get(":cercleId/posts/:postId")
  async postDetail(@Req() req: any, @Param("postId") postId: string) {
    return { ok: true, data: await this.posts.detail(postId, this.uid(req)) };
  }

  @Post(":cercleId/posts")
  async createPost(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: {
    title?: string;
    body: string;
    attachments?: Array<{ fileKey: string; filename: string; mimeType: string; sizeBytes: number }>;
  }) {
    return { ok: true, data: await this.posts.createRoot(cercleId, this.uid(req), body) };
  }

  @Post(":cercleId/posts/upload")
  @UseInterceptors(
    FilesInterceptor("files", 6, {
      storage: _ds({
        destination: (req: any, _file: any, cb: any) => {
          const cId = req.params?.cercleId;
          const dir = _joinPath(_POST_UPLOAD_DIR, cId || "_misc");
          try { _mk(dir, { recursive: true }); } catch {}
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
          cb(null, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
        },
      }),
      limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB pour vidéos
    }),
  )
  async uploadPostMedia(@Req() req: any, @Param("cercleId") cercleId: string, @UploadedFiles() files: Array<any>) {
    if (!files || files.length === 0) throw new BadRequestException("Aucun fichier");
    // Autorise image / vidéo / audio + PDF (documents partagés sur le fil).
    const allowed = /^(image|video|audio)\/|^application\/pdf$/;
    const out = files.map((f) => {
      if (!allowed.test(f.mimetype)) throw new BadRequestException(`Type ${f.mimetype} non autorisé`);
      const fileKey = `cercles-posts/${cercleId}/${f.filename}`;
      return {
        fileKey, filename: f.originalname, mimeType: f.mimetype, sizeBytes: f.size,
        url: `/uploads/${fileKey}`,
      };
    });
    return { ok: true, data: out };
  }

  @Post(":cercleId/posts/:postId/replies")
  async reply(@Req() req: any, @Param("postId") postId: string, @Body() body: { body: string }) {
    return { ok: true, data: await this.posts.reply(postId, this.uid(req), body.body) };
  }

  @Patch(":cercleId/posts/:postId")
  async editPost(@Req() req: any, @Param("postId") postId: string, @Body() body: { title?: string; body?: string }) {
    return { ok: true, data: await this.posts.edit(postId, this.uid(req), body) };
  }

  @Delete(":cercleId/posts/:postId")
  async deletePost(@Req() req: any, @Param("postId") postId: string) {
    return { ok: true, data: await this.posts.softDelete(postId, this.uid(req), req?.user?.role) };
  }

  @Post(":cercleId/posts/:postId/upvote")
  async upvote(@Req() req: any, @Param("postId") postId: string) {
    return { ok: true, data: await this.posts.upvote(postId, this.uid(req)) };
  }

  @Post(":cercleId/posts/:postId/pin")
  async pin(@Req() req: any, @Param("postId") postId: string, @Body() body: { pinned?: boolean }) {
    return { ok: true, data: await this.posts.pin(postId, this.uid(req), body.pinned ?? true) };
  }

  @Post(":cercleId/posts/:postId/resolve")
  async resolve(@Req() req: any, @Param("postId") postId: string, @Body() body: { resolved?: boolean }) {
    return { ok: true, data: await this.posts.resolve(postId, this.uid(req), body.resolved ?? true) };
  }

  // ── LiveRooms ────────────────────────────────────────────────

  @Get(":cercleId/rooms")
  async listRooms(@Req() req: any, @Param("cercleId") cercleId: string) {
    return { ok: true, data: await this.rooms.list(cercleId, this.uid(req)) };
  }

  @Post(":cercleId/rooms")
  async createRoom(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: { title: string; description?: string; scheduledAt?: string; maxParticipants?: number; provider?: "LIVEKIT" | "JITSI" }) {
    return { ok: true, data: await this.rooms.create(cercleId, this.uid(req), body) };
  }

  @Get(":cercleId/rooms/:roomSlug")
  async roomDetail(@Req() req: any, @Param("cercleId") cercleId: string, @Param("roomSlug") roomSlug: string) {
    return { ok: true, data: await this.rooms.getBySlug(cercleId, roomSlug, this.uid(req)) };
  }

  @Post(":cercleId/rooms/:roomId/start")
  async startRoom(@Req() req: any, @Param("roomId") roomId: string) {
    return { ok: true, data: await this.rooms.start(roomId, this.uid(req)) };
  }

  @Post(":cercleId/rooms/:roomId/end")
  async endRoom(@Req() req: any, @Param("roomId") roomId: string) {
    return { ok: true, data: await this.rooms.end(roomId, this.uid(req)) };
  }

  @Post(":cercleId/rooms/:roomId/join")
  async joinRoom(@Req() req: any, @Param("roomId") roomId: string) {
    const userId = this.uid(req);
    const email = req?.user?.email || "";
    return { ok: true, data: await this.rooms.getJoinToken(roomId, userId, this.displayName(req), email) };
  }

  @Delete(":cercleId/rooms/:roomId")
  async cancelRoom(@Req() req: any, @Param("roomId") roomId: string) {
    return { ok: true, data: await this.rooms.cancel(roomId, this.uid(req)) };
  }

  // ── Egress (placeholder routes Sprint C4) ────────────────────

  @Post(":cercleId/rooms/:roomId/broadcast/targets")
  async addEgressTarget(@Req() req: any, @Param("roomId") roomId: string, @Body() body: { platform: "YOUTUBE" | "FACEBOOK_PAGE" | "LINKEDIN_LIVE" | "CUSTOM_RTMP"; rtmpUrl: string; streamKey: string; label: string }) {
    return { ok: true, data: await this.rooms.addEgressTarget(roomId, this.uid(req), body) };
  }

  @Delete(":cercleId/rooms/:roomId/broadcast/targets/:targetId")
  async removeEgressTarget(@Req() req: any, @Param("roomId") roomId: string, @Param("targetId") targetId: string) {
    return { ok: true, data: await this.rooms.removeEgressTarget(roomId, targetId, this.uid(req)) };
  }

  @Get(":cercleId/rooms/:roomId/broadcast/status")
  async egressStatus(@Req() req: any, @Param("roomId") roomId: string) {
    return { ok: true, data: await this.rooms.listEgressStatus(roomId, this.uid(req)) };
  }
}
