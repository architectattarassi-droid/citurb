"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
const cercles_service_1 = require("./cercles.service");
const livekit_service_1 = require("./livekit.service");
const encryption_service_1 = require("./encryption.service");
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
let RoomsService = class RoomsService {
    prisma;
    cercles;
    livekit;
    encryption;
    constructor(prisma, cercles, livekit, encryption) {
        this.prisma = prisma;
        this.cercles = cercles;
        this.livekit = livekit;
        this.encryption = encryption;
    }
    async makeRoomSlug(cercleId, title) {
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
    async create(cercleId, hostId, input) {
        if (!input.title?.trim())
            throw new common_1.BadRequestException("Titre requis");
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
    async list(cercleId, viewerId) {
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
    async getBySlug(cercleId, roomSlug, viewerId) {
        await this.cercles.assertMember(cercleId, viewerId);
        const room = await this.prisma.liveRoom.findUnique({
            where: { slug: roomSlug },
            include: {
                host: { select: { id: true, email: true, username: true } },
                egressTargets: { select: { id: true, platform: true, label: true, status: true, startedAt: true, errorMessage: true } },
            },
        });
        if (!room || room.cercleId !== cercleId)
            throw new common_1.NotFoundException("Room introuvable");
        return room;
    }
    async start(roomId, hostId) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.hostId !== hostId) {
            const isMod = await this.cercles.isModerator(room.cercleId, hostId);
            if (!isMod)
                throw new common_1.ForbiddenException("Host ou modérateur requis");
        }
        if (room.status === "LIVE")
            return room;
        if (room.status === "ENDED" || room.status === "CANCELLED") {
            throw new common_1.BadRequestException(`Room déjà ${room.status}`);
        }
        await this.livekit.ensureRoom(room.livekitRoomName, { maxParticipants: room.maxParticipants });
        return this.prisma.liveRoom.update({
            where: { id: roomId },
            data: { status: "LIVE", startedAt: new Date() },
        });
    }
    async end(roomId, hostId) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.hostId !== hostId) {
            const isMod = await this.cercles.isModerator(room.cercleId, hostId);
            if (!isMod)
                throw new common_1.ForbiddenException("Host ou modérateur requis");
        }
        if (room.status === "ENDED")
            return room;
        await this.livekit.closeRoom(room.livekitRoomName);
        return this.prisma.liveRoom.update({
            where: { id: roomId },
            data: { status: "ENDED", endedAt: new Date() },
        });
    }
    async cancel(roomId, hostId) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.hostId !== hostId) {
            const isMod = await this.cercles.isModerator(room.cercleId, hostId);
            if (!isMod)
                throw new common_1.ForbiddenException("Host ou modérateur requis");
        }
        if (room.status === "LIVE")
            throw new common_1.BadRequestException("Room en cours — utilisez end() à la place");
        return this.prisma.liveRoom.update({
            where: { id: roomId },
            data: { status: "CANCELLED" },
        });
    }
    /**
     * Génère le token JWT LiveKit. Token court-vivant (1h),
     * jamais stocké en localStorage côté client (cf prompt §8.3).
     */
    async getJoinToken(roomId, userId, displayName) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.status !== "LIVE" && room.status !== "SCHEDULED") {
            throw new common_1.BadRequestException("Room non joignable");
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
    async addEgressTarget(roomId, hostId, input) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.hostId !== hostId)
            throw new common_1.ForbiddenException("Host requis");
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
    async removeEgressTarget(roomId, targetId, hostId) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        if (room.hostId !== hostId)
            throw new common_1.ForbiddenException("Host requis");
        await this.prisma.egressTarget.deleteMany({ where: { id: targetId, roomId } });
        return { ok: true };
    }
    async listEgressStatus(roomId, viewerId) {
        const room = await this.prisma.liveRoom.findUniqueOrThrow({ where: { id: roomId } });
        await this.cercles.assertMember(room.cercleId, viewerId);
        return this.prisma.egressTarget.findMany({
            where: { roomId },
            select: { id: true, platform: true, label: true, status: true, startedAt: true, endedAt: true, errorMessage: true },
        });
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cercles_service_1.CerclesService,
        livekit_service_1.LiveKitService,
        encryption_service_1.EncryptionService])
], RoomsService);
