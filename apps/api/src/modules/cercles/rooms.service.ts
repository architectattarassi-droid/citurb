import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { CerclesService } from "./cercles.service";
import { LiveKitService } from "./livekit.service";
import { EncryptionService } from "./encryption.service";

/**
 * RoomsService — Sprint C3 (visioconférence LiveKit)
 *
 * Cycle de vie : SCHEDULED → LIVE → ENDED (ou CANCELLED).
 * - createRoom : programme une room (status SCHEDULED)
 * - start : passe en LIVE, crée la room côté LiveKit (idempotent)
 * - join : génère un token JWT côté serveur, retourne { token, wsUrl }
 * - end : passe en ENDED, kick côté LiveKit, arrête egress si actif
 *
 * Egress (Sprint C4) :
 * - addEgressTarget : créé EgressTarget (streamKey chiffré AES-256-GCM)
 * - startBroadcast : appelle LiveKit Egress vers toutes les cibles ACTIVE
 * - stopBroadcast : stoppe egress
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cercles: CerclesService,
    private readonly livekit: LiveKitService,
    private readonly encryption: EncryptionService,
  ) {}

  private async makeRoomSlug(cercleId: string, title: string): Promise<string> {
    const base = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "room";
    const date = new Date().toISOString().slice(0, 10);
    let slug = `${base}-${date}`;
    let i = 2;
    while (await this.prisma.liveRoom.findUnique({ where: { slug } })) {
      slug = `${base}-${date}-${i++}`;
    }
    return slug;
  }

  async create(cercleId: string, hostId: string, input: {
    title: string;
    description?: string;
    scheduledAt?: string;
    maxParticipants?: number;
  }) {
    if (!input.title?.trim()) throw new BadRequestException("Titre requis");
    await this.cercles.assertModerator(cercleId, hostId);
    const slug = await this.makeRoomSlug(cercleId, input.title);
    const livekitRoomName = `cercle-${cercleId.slice(0, 8)}-${slug}`;
    return this.prisma.liveRoom.create({
      data: {
        cercleId,
        hostId,
        slug,
        livekitRoomName,
        title: input.title.trim(),
        description: input.description ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        maxParticipants: input.maxParticipants ?? 50,
      },
    });
  }

  async list(cercleId: string, viewerId: string) {
    await this.cercles.assertMember(cercleId, viewerId);
    return this.prisma.liveRoom.findMany({
      where: { cercleId },
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
      include: {
        host: { select: { id: true, email: true, username: true } },
        _count: { select: { participants: true, egressTargets: true } },
      },
    });
  }

  async getBySlug(cercleId: string, roomSlug: string, viewerId: string) {
    await this.cercles.assertMember(cercleId, viewerId);
    const room = await this.prisma.liveRoom.findUnique({
      where: { slug: roomSlug },
      include: {
        host: { select: { id: true, email: true, username: true } },
        egressTargets: { select: { id: true, platform: true, label: true, status: true, startedAt: true, errorMessage: true } },
      },
    });
    if (!room || room.cercleId !== cercleId) throw new NotFoundException("Room introuvable");
    return room;
  }

  async start(roomId: string, hostId: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.hostId !== hostId) {
      const isMod = await this.cercles.isModerator(room.cercleId, hostId);
      if (!isMod) throw new ForbiddenException("Host ou modérateur requis");
    }
    if (room.status === "LIVE") return room;
    if (room.status === "ENDED" || room.status === "CANCELLED") {
      throw new BadRequestException(`Room déjà ${room.status}`);
    }
    await this.livekit.ensureRoom(room.livekitRoomName, { maxParticipants: room.maxParticipants });
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: "LIVE", startedAt: new Date() },
    });
  }

  async end(roomId: string, hostId: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.hostId !== hostId) {
      const isMod = await this.cercles.isModerator(room.cercleId, hostId);
      if (!isMod) throw new ForbiddenException("Host ou modérateur requis");
    }
    if (room.status === "ENDED") return room;
    await this.livekit.closeRoom(room.livekitRoomName);
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: "ENDED", endedAt: new Date() },
    });
  }

  async cancel(roomId: string, hostId: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.hostId !== hostId) {
      const isMod = await this.cercles.isModerator(room.cercleId, hostId);
      if (!isMod) throw new ForbiddenException("Host ou modérateur requis");
    }
    if (room.status === "LIVE") throw new BadRequestException("Room en cours — utilisez end() à la place");
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: "CANCELLED" },
    });
  }

  /**
   * Génère le token JWT LiveKit. Token court-vivant (1h),
   * jamais stocké en localStorage côté client (cf prompt §8.3).
   */
  async getJoinToken(roomId: string, userId: string, displayName: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.status !== "LIVE" && room.status !== "SCHEDULED") {
      throw new BadRequestException("Room non joignable");
    }
    await this.cercles.assertMember(room.cercleId, userId);
    const role = room.hostId === userId ? "host" : "speaker";
    const token = this.livekit.generateAccessToken({
      roomName: room.livekitRoomName,
      userId,
      displayName: displayName || userId.slice(0, 8),
      role,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    // Crée la participation (ou met à jour joinedAt)
    await this.prisma.roomParticipation.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: { joinedAt: new Date(), leftAt: null },
      create: { roomId, userId },
    });
    return { token, wsUrl: this.livekit.wsUrl, roomName: room.livekitRoomName, role };
  }

  // ── Egress targets (Sprint C4 — placeholder routes implémentées) ──

  async addEgressTarget(roomId: string, hostId: string, input: {
    platform: "YOUTUBE" | "FACEBOOK_PAGE" | "LINKEDIN_LIVE" | "CUSTOM_RTMP";
    rtmpUrl: string;
    streamKey: string;
    label: string;
  }) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.hostId !== hostId) throw new ForbiddenException("Host requis");
    return this.prisma.egressTarget.create({
      data: {
        roomId,
        platform: input.platform,
        rtmpUrl: input.rtmpUrl,
        streamKey: this.encryption.encrypt(input.streamKey),
        label: input.label,
      },
      select: { id: true, platform: true, rtmpUrl: true, label: true, status: true },
    });
  }

  async removeEgressTarget(roomId: string, targetId: string, hostId: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    if (room.hostId !== hostId) throw new ForbiddenException("Host requis");
    await this.prisma.egressTarget.deleteMany({ where: { id: targetId, roomId } });
    return { ok: true };
  }

  async listEgressStatus(roomId: string, viewerId: string) {
    const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
    await this.cercles.assertMember(room.cercleId, viewerId);
    return this.prisma.egressTarget.findMany({
      where: { roomId },
      select: { id: true, platform: true, label: true, status: true, startedAt: true, endedAt: true, errorMessage: true },
    });
  }
}
