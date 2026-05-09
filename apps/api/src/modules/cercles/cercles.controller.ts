import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { CerclesService, CreateCercleInput, UpdateCercleInput } from "./cercles.service";
import { MembershipsService } from "./memberships.service";
import { PostsService } from "./posts.service";
import { RoomsService } from "./rooms.service";

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
  ) {}

  private uid(req: any): string {
    return req?.user?.userId || req?.user?.sub;
  }

  private displayName(req: any): string {
    return req?.user?.username || req?.user?.email || "Membre";
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
  async createPost(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: { title?: string; body: string }) {
    return { ok: true, data: await this.posts.createRoot(cercleId, this.uid(req), body) };
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
    return { ok: true, data: await this.posts.softDelete(postId, this.uid(req)) };
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
  async createRoom(@Req() req: any, @Param("cercleId") cercleId: string, @Body() body: { title: string; description?: string; scheduledAt?: string; maxParticipants?: number }) {
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
    return { ok: true, data: await this.rooms.getJoinToken(roomId, userId, this.displayName(req)) };
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
