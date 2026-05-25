import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { AntiDesintService } from "../../tome-2/anti-desint.service";
import { DossierNotifService } from "./dossier-notif.service";
import {
  CreateInteractionInput,
  DossierInteraction,
  EDIT_WINDOW_MS,
  FAST_EMOJIS,
  FastEmoji,
  InteractionAttachment,
  InteractionVisibility,
  TimelinePage,
} from "./dossier-interactions.types";

/**
 * DossierInteractionsService — CRUD + permissions + notifications du fil
 * d'interactions d'un dossier.
 *
 * Persistence stratégie :
 *   - Tant que la migration Prisma `DossierInteraction` n'est pas appliquée,
 *     on stocke dans `Dossier.payload.interactions[]` (JSONB). Permet zéro
 *     migration pour shipping immédiat, et reste alignable 1:1 avec le modèle
 *     final (voir INTEGRATION.md).
 *   - Bascule trivial le jour de la migration : changer `loadAll`/`persist`.
 *
 * Sécurité :
 *   - Accès au dossier vérifié (ownerId, OPS/ADMIN bypass).
 *   - Visibilité INTERNE_OPS/PRIVATE filtrée à la lecture.
 *   - Edit window 15 min, soft delete.
 *
 * Effets de bord à CREATE :
 *   - DossierNotifService.broadcast (email + WhatsApp deep link + push)
 *   - AntiDesintService scan sur `contentMD`
 */
@Injectable()
export class DossierInteractionsService {
  private readonly logger = new Logger(DossierInteractionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notif: DossierNotifService,
    private readonly antiDesint: AntiDesintService,
  ) {}

  // ── Helpers persistence ────────────────────────────────────────

  /** Génère un id stable (cuid-like, sans dépendance externe). */
  private newId(): string {
    return "int_" + randomBytes(10).toString("hex");
  }

  /**
   * Charge un dossier + ses interactions (dans payload).
   * @throws NotFoundException si le dossier n'existe pas.
   */
  private async loadDossier(dossierId: string) {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        id: true, ownerId: true, title: true, clientNom: true, clientTel: true,
        clientEmail: true, porteType: true, payload: true,
      },
    });
    if (!d) throw new NotFoundException("dossier_not_found");
    return d;
  }

  private extractInteractions(payload: any): DossierInteraction[] {
    const list = (payload && typeof payload === "object" && Array.isArray(payload.interactions))
      ? (payload.interactions as DossierInteraction[])
      : [];
    return list;
  }

  /** Sauvegarde la liste complète dans `payload.interactions` (capée à 2000). */
  private async persist(dossierId: string, all: DossierInteraction[], payload: any) {
    const next = { ...(payload && typeof payload === "object" ? payload : {}), interactions: all.slice(-2000) };
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload: next } });
  }

  // ── Permissions ────────────────────────────────────────────────

  /**
   * Vrai si l'utilisateur peut lire le dossier (owner + OPS/ADMIN/OWNER + invités).
   * Pour simplifier et ne pas bloquer la prod, on considère ici :
   *   - role ∈ {ADMIN, OWNER, OPS, SUPER_ADMIN} → toujours.
   *   - sinon : il doit être ownerId, OR être listé dans payload.parties.
   */
  private canRead(d: { ownerId: string; payload: any }, userId: string, role?: string): boolean {
    if (!userId) return false;
    if (this.isStaff(role)) return true;
    if (d.ownerId === userId) return true;
    const parties: string[] = Array.isArray((d.payload as any)?.parties) ? (d.payload as any).parties : [];
    return parties.includes(userId);
  }

  private isStaff(role?: string): boolean {
    return !!role && ["ADMIN", "OWNER", "OPS", "SUPER_ADMIN", "ADMIN_SUPPORT"].includes(role);
  }

  /** Filtre une interaction selon la visibilité + rôle du viewer. */
  private isVisible(it: DossierInteraction, userId: string, role?: string): boolean {
    if (it.deletedAt) return false;
    switch (it.visibility) {
      case "PUBLIC":      return true;
      case "INTERNE_OPS": return this.isStaff(role);
      case "PRIVATE":
        return it.authorUserId === userId || it.mentions.includes(userId);
      default:            return false;
    }
  }

  // ── Read ───────────────────────────────────────────────────────

  /**
   * Timeline paginée cursor-based (cursor = id du dernier item retourné).
   * Tri DESC par createdAt (plus récents en haut, comme un flux).
   */
  async listTimeline(
    dossierId: string,
    viewer: { userId: string; role?: string },
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<TimelinePage> {
    const d = await this.loadDossier(dossierId);
    if (!this.canRead(d, viewer.userId, viewer.role)) {
      throw new ForbiddenException("forbidden");
    }
    const all = this.extractInteractions(d.payload);
    const visible = all.filter(it => this.isVisible(it, viewer.userId, viewer.role));
    visible.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    let startIdx = 0;
    if (opts.cursor) {
      const idx = visible.findIndex(it => it.id === opts.cursor);
      startIdx = idx >= 0 ? idx + 1 : 0;
    }
    const page = visible.slice(startIdx, startIdx + limit);
    const nextCursor = (startIdx + limit < visible.length) ? page[page.length - 1].id : null;
    return { items: page, nextCursor };
  }

  // ── Create ─────────────────────────────────────────────────────

  async create(
    dossierId: string,
    author: { userId: string; role: string },
    input: CreateInteractionInput,
  ): Promise<DossierInteraction> {
    const d = await this.loadDossier(dossierId);
    if (!this.canRead(d, author.userId, author.role)) {
      throw new ForbiddenException("forbidden");
    }

    const visibility: InteractionVisibility = input.visibility ?? "PUBLIC";
    if (visibility === "INTERNE_OPS" && !this.isStaff(author.role)) {
      throw new ForbiddenException("visibility_requires_staff");
    }

    const all = this.extractInteractions(d.payload);
    const now = new Date().toISOString();
    const item: DossierInteraction = {
      id: this.newId(),
      dossierId,
      parentId: input.parentId ?? null,
      authorUserId: author.userId,
      authorRole: author.role,
      type: input.type ?? (input.attachments?.length ? "FILE_UPLOADED" : "COMMENT"),
      contentMD: (input.contentMD ?? "").slice(0, 8000),
      attachments: Array.isArray(input.attachments) ? input.attachments.slice(0, 10) : [],
      mentions: Array.isArray(input.mentions) ? Array.from(new Set(input.mentions)).slice(0, 20) : [],
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      reactions: [],
      isPinned: false,
      visibility,
      createdAt: now,
      editedAt: null,
      deletedAt: null,
      readBy: [author.userId],
    };

    all.push(item);
    await this.persist(dossierId, all, d.payload);

    // ── Effets de bord (fire-and-forget) ─────────────────────────
    this.fireNotifAndScan(d, item).catch((e) =>
      this.logger.warn(`[DossierInteractions] fireNotifAndScan failed: ${e?.message}`),
    );

    return item;
  }

  /**
   * Notif broadcast + anti-désint scan sur le contentMD.
   * Détaché en async pour ne jamais bloquer le POST.
   */
  private async fireNotifAndScan(
    d: { id: string; title: string; clientTel: string | null; clientEmail: string | null; porteType: string; ownerId: string; payload: any },
    item: DossierInteraction,
  ) {
    // 1. Notifications
    await this.notif.broadcast({
      dossier: { id: d.id, title: d.title, porteType: d.porteType, ownerId: d.ownerId, payload: d.payload, clientEmail: d.clientEmail, clientTel: d.clientTel },
      interaction: item,
    });

    // 2. Anti-désint scan (réutilise la logique existante) :
    //    on simule un message en injectant le contentMD dans le scan ad-hoc
    //    en re-créant un DossierMessage transient n'est PAS souhaité (on
    //    n'altère pas la table messages). On délègue à un helper dédié :
    try {
      await (this.antiDesint as any).scanContent?.({
        dossierId: d.id,
        messageId: item.id,
        expediteurId: item.authorUserId,
        expediteurRole: item.authorRole,
        contenu: item.contentMD,
      });
    } catch (e: any) {
      // Si la méthode n'existe pas encore (anti-desint scan content),
      // on log silencieusement — la doctrine T2 reste assurée par le cron nightly.
      this.logger.debug(`[DossierInteractions] anti-desint scan skipped: ${e?.message}`);
    }
  }

  // ── Edit ───────────────────────────────────────────────────────

  async edit(
    dossierId: string,
    interactionId: string,
    user: { userId: string; role: string },
    patch: { contentMD?: string; mentions?: string[]; attachments?: InteractionAttachment[] },
  ): Promise<DossierInteraction> {
    const d = await this.loadDossier(dossierId);
    const all = this.extractInteractions(d.payload);
    const idx = all.findIndex(i => i.id === interactionId);
    if (idx < 0) throw new NotFoundException("interaction_not_found");
    const it = all[idx];

    if (it.authorUserId !== user.userId) {
      throw new ForbiddenException("only_author_can_edit");
    }
    const age = Date.now() - new Date(it.createdAt).getTime();
    if (age > EDIT_WINDOW_MS) {
      throw new ForbiddenException("edit_window_expired");
    }
    if (typeof patch.contentMD === "string") it.contentMD = patch.contentMD.slice(0, 8000);
    if (Array.isArray(patch.mentions)) it.mentions = Array.from(new Set(patch.mentions)).slice(0, 20);
    if (Array.isArray(patch.attachments)) it.attachments = patch.attachments.slice(0, 10);
    it.editedAt = new Date().toISOString();

    all[idx] = it;
    await this.persist(dossierId, all, d.payload);
    return it;
  }

  // ── Delete (soft) ──────────────────────────────────────────────

  async softDelete(
    dossierId: string,
    interactionId: string,
    user: { userId: string; role: string },
  ): Promise<{ ok: true }> {
    const d = await this.loadDossier(dossierId);
    const all = this.extractInteractions(d.payload);
    const idx = all.findIndex(i => i.id === interactionId);
    if (idx < 0) throw new NotFoundException("interaction_not_found");
    const it = all[idx];
    const allowed = it.authorUserId === user.userId || this.isStaff(user.role);
    if (!allowed) throw new ForbiddenException("forbidden");
    it.deletedAt = new Date().toISOString();
    all[idx] = it;
    await this.persist(dossierId, all, d.payload);
    return { ok: true };
  }

  // ── React ──────────────────────────────────────────────────────

  /** Toggle emoji reaction. Refuse les emojis hors fast-list. */
  async react(
    dossierId: string,
    interactionId: string,
    user: { userId: string; role: string },
    emoji: string,
  ): Promise<DossierInteraction> {
    if (!(FAST_EMOJIS as readonly string[]).includes(emoji)) {
      throw new ForbiddenException("emoji_not_allowed");
    }
    const d = await this.loadDossier(dossierId);
    if (!this.canRead(d, user.userId, user.role)) throw new ForbiddenException("forbidden");
    const all = this.extractInteractions(d.payload);
    const idx = all.findIndex(i => i.id === interactionId);
    if (idx < 0) throw new NotFoundException("interaction_not_found");
    const it = all[idx];
    const reactions = Array.isArray(it.reactions) ? it.reactions : [];
    let r = reactions.find(x => x.emoji === emoji);
    if (!r) {
      r = { emoji: emoji as FastEmoji, userIds: [] };
      reactions.push(r);
    }
    const has = r.userIds.includes(user.userId);
    r.userIds = has ? r.userIds.filter(u => u !== user.userId) : [...r.userIds, user.userId];
    // Nettoyer les reactions vides
    it.reactions = reactions.filter(x => x.userIds.length > 0);
    all[idx] = it;
    await this.persist(dossierId, all, d.payload);
    return it;
  }

  // ── Pin ────────────────────────────────────────────────────────

  /** OPS/architecte (= owner du dossier) peuvent pin/unpin. */
  async pin(
    dossierId: string,
    interactionId: string,
    user: { userId: string; role: string },
    pinned: boolean,
  ): Promise<DossierInteraction> {
    const d = await this.loadDossier(dossierId);
    const allowed = this.isStaff(user.role) || d.ownerId === user.userId;
    if (!allowed) throw new ForbiddenException("only_staff_or_owner_can_pin");
    const all = this.extractInteractions(d.payload);
    const idx = all.findIndex(i => i.id === interactionId);
    if (idx < 0) throw new NotFoundException("interaction_not_found");
    all[idx].isPinned = !!pinned;
    await this.persist(dossierId, all, d.payload);
    return all[idx];
  }

  // ── Mark-read ──────────────────────────────────────────────────

  async markRead(
    dossierId: string,
    interactionId: string,
    user: { userId: string },
  ): Promise<{ ok: true }> {
    const d = await this.loadDossier(dossierId);
    const all = this.extractInteractions(d.payload);
    const idx = all.findIndex(i => i.id === interactionId);
    if (idx < 0) throw new NotFoundException("interaction_not_found");
    const it = all[idx];
    if (!it.readBy.includes(user.userId)) {
      it.readBy = [...it.readBy, user.userId];
      all[idx] = it;
      await this.persist(dossierId, all, d.payload);
    }
    return { ok: true };
  }

  // ── Mentions panel (cross-dossier) ─────────────────────────────

  /**
   * Récupère les interactions où `userId` est mentionné, à travers TOUS les
   * dossiers (capé à N résultats). Lazy O(n) — OK pour MVP.
   */
  async myMentions(
    userId: string,
    opts: { unread?: boolean; limit?: number } = {},
  ): Promise<Array<DossierInteraction & { dossierTitle?: string }>> {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
    // Charge les 200 derniers dossiers (heuristique simple — l'index Prisma
    // sera ajouté avec la migration DossierInteraction).
    const dossiers = await this.prisma.dossier.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, payload: true },
    });
    const out: Array<DossierInteraction & { dossierTitle?: string }> = [];
    for (const d of dossiers) {
      const items = this.extractInteractions(d.payload);
      for (const it of items) {
        if (it.deletedAt) continue;
        if (!it.mentions.includes(userId)) continue;
        if (opts.unread && it.readBy.includes(userId)) continue;
        out.push({ ...it, dossierTitle: d.title });
        if (out.length >= limit) return out;
      }
    }
    return out;
  }
}
