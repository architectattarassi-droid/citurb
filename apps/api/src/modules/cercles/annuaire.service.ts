import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

/**
 * AnnuaireService — Sprint D1
 *
 * Annuaire pro BTP marocain : profils enrichis avec métier, classe BTP,
 * agréments, régions, spécialités. Recherche multi-facette + suggestions.
 */

export type AnnuaireSearchInput = {
  q?: string;
  metier?: string;
  classeBTP?: string;
  region?: string;
  specialite?: string;
  isVerified?: boolean;
  page?: number;
  pageSize?: number;
};

export type FormationEntry = { ecole: string; diplome: string; annee?: number; ville?: string };
export type ExperiencePhare = {
  titre: string;
  description?: string;
  anneeLivraison?: number;
  surface?: string; // ex "1200 m²"
  lieu?: string;
  role?: string; // ex "Architecte mandataire"
  imageUrls?: string[];
};

export type ProProfileInput = {
  displayName: string;
  title?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  metier:
    | "ARCHITECTE" | "BET_STRUCTURE" | "BET_FLUIDES" | "BET_VRD"
    | "TOPOGRAPHE" | "GEOMETRE" | "CONTROLE_TECHNIQUE" | "LABORATOIRE"
    | "ENTREPRISE_GO" | "ENTREPRISE_SECOND_OEUVRE" | "FOURNISSEUR_MATERIAUX"
    | "PROMOTEUR" | "MOA_PUBLIQUE" | "MOA_PRIVEE" | "ARTISAN_QUALIFIE";
  classeBTP?: "CL1" | "CL2" | "CL3" | "CL4" | "CL5" | "HC";
  agrements?: string[];
  specialites?: string[];
  cnoaNumero?: string;
  // Cabinet
  cabinetName?: string;
  cabinetSize?: number;
  cabinetStatus?: string;
  yearsExperience?: number;
  // Formations & certifs
  formations?: FormationEntry[];
  certifications?: string[];
  prix?: string[];
  langues?: string[];
  experiencesPhares?: ExperiencePhare[];
  // Localisation
  regions?: string[];
  villePrincipale?: string;
  // Tarifs/dispo
  tarifsRange?: string;
  disponibilite?: "DISPONIBLE" | "OCCUPE" | "INDISPONIBLE";
  disponibleAPartir?: string;
  // Réseaux
  websiteUrl?: string;
  linkedinUrl?: string;
  behanceUrl?: string;
  instagramUrl?: string;
  pinterestUrl?: string;
  phonePublic?: string;
  emailPublic?: string;
};

@Injectable()
export class AnnuaireService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMyProfile(userId: string, input: ProProfileInput) {
    if (!input.displayName?.trim()) throw new BadRequestException("displayName requis");
    if (!input.metier) throw new BadRequestException("metier requis");

    const payload: any = {
      displayName: input.displayName.trim(),
      title: input.title ?? null,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
      coverUrl: input.coverUrl ?? null,
      metier: input.metier as any,
      classeBTP: (input.classeBTP as any) ?? null,
      agrements: input.agrements ?? [],
      specialites: input.specialites ?? [],
      cnoaNumero: input.cnoaNumero ?? null,
      cabinetName: input.cabinetName ?? null,
      cabinetSize: input.cabinetSize ?? null,
      cabinetStatus: input.cabinetStatus ?? null,
      yearsExperience: input.yearsExperience ?? null,
      formations: input.formations ? (input.formations as any) : null,
      certifications: input.certifications ?? [],
      prix: input.prix ?? [],
      langues: input.langues ?? [],
      experiencesPhares: input.experiencesPhares ? (input.experiencesPhares as any) : null,
      regions: input.regions ?? [],
      villePrincipale: input.villePrincipale ?? null,
      tarifsRange: input.tarifsRange ?? null,
      disponibilite: input.disponibilite ?? "DISPONIBLE",
      disponibleAPartir: input.disponibleAPartir ? new Date(input.disponibleAPartir) : null,
      websiteUrl: input.websiteUrl ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      behanceUrl: input.behanceUrl ?? null,
      instagramUrl: input.instagramUrl ?? null,
      pinterestUrl: input.pinterestUrl ?? null,
      phonePublic: input.phonePublic ?? null,
      emailPublic: input.emailPublic ?? null,
    };

    return this.prisma.proProfile.upsert({
      where: { userId },
      update: payload,
      create: { userId, ...payload },
    });
  }

  // ── Données dérivées : posts/cercles/rooms de l'user ─────────

  async getUserCercles(userIdOrId: string, viewerId?: string) {
    const target = await this.resolveUserId(userIdOrId);
    return this.prisma.cercleMembership.findMany({
      where: { userId: target, status: "ACTIVE" },
      orderBy: { joinedAt: "desc" },
      take: 50,
      include: {
        cercle: {
          select: {
            id: true, slug: true, name: true, description: true, visibility: true,
            region: true, themes: true,
            _count: { select: { members: true, posts: true, rooms: true } },
          },
        },
      },
    });
  }

  async getUserPosts(userIdOrId: string) {
    const target = await this.resolveUserId(userIdOrId);
    return this.prisma.cerclePost.findMany({
      where: { authorId: target, deletedAt: null, parentId: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        cercle: { select: { id: true, slug: true, name: true } },
        _count: { select: { replies: true } },
      },
    });
  }

  async getUserRooms(userIdOrId: string) {
    const target = await this.resolveUserId(userIdOrId);
    return this.prisma.liveRoom.findMany({
      where: { hostId: target },
      orderBy: [{ status: "asc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        cercle: { select: { id: true, slug: true, name: true } },
      },
    });
  }

  private async resolveUserId(userIdOrProfileId: string): Promise<string> {
    // Si c'est un userId direct
    const u = await this.prisma.user.findUnique({ where: { id: userIdOrProfileId }, select: { id: true } });
    if (u) return u.id;
    // Sinon c'est peut-être un ProProfile.id
    const p = await this.prisma.proProfile.findUnique({ where: { id: userIdOrProfileId }, select: { userId: true } });
    if (p) return p.userId;
    throw new NotFoundException("Utilisateur introuvable");
  }

  async getMyProfile(userId: string) {
    return this.prisma.proProfile.findUnique({ where: { userId } });
  }

  async getProfile(userIdOrId: string) {
    // Accepte userId OU id de ProProfile
    const profile = await this.prisma.proProfile.findFirst({
      where: { OR: [{ userId: userIdOrId }, { id: userIdOrId }] },
      include: { user: { select: { id: true, email: true, username: true, role: true } } },
    });
    if (!profile) throw new NotFoundException("Profil pro introuvable");
    return profile;
  }

  /** Facets pour la sidebar de recherche (compteurs par dimension). */
  async facets() {
    const [byMetier, byClasseBTP, byVerified] = await Promise.all([
      this.prisma.proProfile.groupBy({ by: ["metier"], _count: { _all: true } }),
      this.prisma.proProfile.groupBy({ by: ["classeBTP"], _count: { _all: true }, where: { classeBTP: { not: null } } }),
      this.prisma.proProfile.groupBy({ by: ["isVerified"], _count: { _all: true } }),
    ]);
    const total = await this.prisma.proProfile.count();
    return {
      total,
      metiers: byMetier.map(g => ({ name: g.metier, count: g._count._all })),
      classesBTP: byClasseBTP.map(g => ({ name: g.classeBTP, count: g._count._all })),
      verified: byVerified.map(g => ({ name: g.isVerified ? "verified" : "unverified", count: g._count._all })),
    };
  }

  async search(input: AnnuaireSearchInput) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    const where: any = {};

    if (input.metier) where.metier = input.metier;
    if (input.classeBTP) where.classeBTP = input.classeBTP;
    if (input.isVerified !== undefined) where.isVerified = input.isVerified;
    if (input.region) where.regions = { has: input.region };
    if (input.specialite) where.specialites = { has: input.specialite };
    if (input.q?.trim()) {
      const q = input.q.trim();
      where.OR = [
        { displayName: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
        { villePrincipale: { contains: q, mode: "insensitive" } },
        { specialites: { has: q } },
        { agrements: { has: q } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proProfile.findMany({
        where,
        orderBy: [{ isVerified: "desc" }, { connectionsCount: "desc" }, { displayName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, email: true, username: true } } },
      }),
      this.prisma.proProfile.count({ where }),
    ]);
    return { data, meta: { page, pageSize, total } };
  }

  /**
   * Suggestions : pros du même métier, des mêmes régions, ou avec spécialités
   * en commun. Limité aux non-connectés.
   */
  async suggestions(userId: string, take = 6) {
    const me = await this.prisma.proProfile.findUnique({ where: { userId } });
    if (!me) {
      // Si user n'a pas encore de profil, on retourne quelques pros vérifiés
      return this.prisma.proProfile.findMany({
        where: { userId: { not: userId }, isVerified: true },
        take,
        orderBy: { connectionsCount: "desc" },
      });
    }
    return this.prisma.proProfile.findMany({
      where: {
        userId: { not: userId },
        OR: [
          { metier: me.metier },
          { regions: { hasSome: me.regions } },
          { specialites: { hasSome: me.specialites } },
        ],
      },
      take,
      orderBy: [{ isVerified: "desc" }, { connectionsCount: "desc" }],
    });
  }

  // ── Connections ──────────────────────────────────────────────

  async sendConnection(fromUserId: string, toUserId: string, message?: string) {
    if (fromUserId === toUserId) throw new BadRequestException("Impossible de se connecter à soi-même");
    return this.prisma.connection.upsert({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      update: {},
      create: { fromUserId, toUserId, message: message ?? null, status: "PENDING" },
    });
  }

  async respondConnection(toUserId: string, fromUserId: string, accept: boolean) {
    const conn = await this.prisma.connection.findUnique({ where: { fromUserId_toUserId: { fromUserId, toUserId } } });
    if (!conn || conn.status !== "PENDING") throw new BadRequestException("Aucune demande à traiter");
    const updated = await this.prisma.connection.update({
      where: { fromUserId_toUserId: { fromUserId, toUserId } },
      data: { status: accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date() },
    });
    if (accept) {
      // Incrémente connectionsCount des deux côtés
      await this.prisma.$transaction([
        this.prisma.proProfile.updateMany({ where: { userId: fromUserId }, data: { connectionsCount: { increment: 1 } } }),
        this.prisma.proProfile.updateMany({ where: { userId: toUserId }, data: { connectionsCount: { increment: 1 } } }),
      ]);
    }
    return updated;
  }

  async listConnections(userId: string) {
    return this.prisma.connection.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        status: "ACCEPTED",
      },
      include: {
        fromUser: { include: { proProfile: true } },
        toUser:   { include: { proProfile: true } },
      },
      orderBy: { respondedAt: "desc" },
    });
  }

  async listPendingRequests(userId: string) {
    return this.prisma.connection.findMany({
      where: { toUserId: userId, status: "PENDING" },
      include: { fromUser: { include: { proProfile: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
