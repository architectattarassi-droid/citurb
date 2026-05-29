/**
 * CabinetService — fiche cabinet d'architecte (ancrée sur ProProfile existant).
 * Doctrine : aucune logique métier au front. Slug, alt, keywords, méta-description,
 * JSON-LD et sitemap sont générés ici, côté serveur.
 *
 * Modèles Prisma utilisés : ProProfile (slug ajouté), ProProfileProject,
 * ProProfileMedia (cf. commit feat(prisma) ProProfile portfolio).
 */
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

const PUBLIC_BASE = process.env.PUBLIC_WEB_URL || "https://citurbarea.com";

function slugify(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function trunc(s: string, n = 155): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export interface ProjectInput {
  title: string;
  type: string;
  location: string;
  surface?: number | null;
  year?: number | null;
  status?: "ETUDE" | "EN_COURS" | "LIVRE";
  missions?: string[];
  programme?: string | null;
  description: string;
  materials?: string | null;
  keywords?: string[];
  published?: boolean;
}

export interface MediaInput {
  kind: "PHOTO" | "VIDEO_FILE" | "VIDEO_URL";
  url: string;
  thumbnailUrl?: string | null;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  position?: number;
}

@Injectable()
export class CabinetService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers propriété / lookup ─────────────────────────────────────────

  async requireMyProfile(userId: string) {
    if (!userId) throw new ForbiddenException("Auth requise");
    const p = await this.prisma.proProfile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException("Profil professionnel introuvable — créer d'abord son profil pro");
    return p;
  }

  private async generateUniqueCabinetSlug(seed: string): Promise<string> {
    const base = slugify(seed) || "cabinet";
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const exists = await this.prisma.proProfile.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!exists) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  private async generateUniqueProjectSlug(proProfileId: string, title: string, location: string): Promise<string> {
    const base = slugify(`${title}-${location}`) || "projet";
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const exists = await this.prisma.proProfileProject.findUnique({
        where: { proProfileId_slug: { proProfileId, slug: candidate } },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  // ── Slug cabinet (assure qu'un slug public existe) ────────────────────

  async ensureCabinetSlug(userId: string): Promise<{ slug: string }> {
    const p = await this.requireMyProfile(userId);
    if (p.slug) return { slug: p.slug };
    const seed = p.cabinetName || p.displayName || `pro-${p.id.slice(0, 8)}`;
    const slug = await this.generateUniqueCabinetSlug(seed);
    await this.prisma.proProfile.update({ where: { id: p.id }, data: { slug } });
    return { slug };
  }

  // ── Génération (alt, keywords, meta) ──────────────────────────────────

  private buildAltForMedia(project: { title: string; type: string; location: string }, architect: string, indexOfPhoto: number): string {
    const base = `${project.type} — ${project.title}, ${project.location} (${architect})`;
    return indexOfPhoto > 0 ? `${base} — vue ${indexOfPhoto + 1}` : base;
  }

  private mergeKeywords(provided: string[] | undefined, ctx: { type: string; location: string; city?: string | null }): string[] {
    const base = (provided || []).map((k) => k.trim()).filter(Boolean);
    const ctxKw = [ctx.type, ctx.location, "architecte", ctx.city || ""].filter(Boolean) as string[];
    return uniq([...base, ...ctxKw]).slice(0, 24);
  }

  // ── CRUD Projet ───────────────────────────────────────────────────────

  async listMyProjects(userId: string) {
    const p = await this.requireMyProfile(userId);
    return this.prisma.proProfileProject.findMany({
      where: { proProfileId: p.id },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      include: { media: { orderBy: { position: "asc" } } },
    });
  }

  async createMyProject(userId: string, input: ProjectInput) {
    const p = await this.requireMyProfile(userId);
    if (!input?.title || !input?.type || !input?.location || !input?.description) {
      throw new ForbiddenException("title, type, location, description requis");
    }
    const slug = await this.generateUniqueProjectSlug(p.id, input.title, input.location);
    const keywords = this.mergeKeywords(input.keywords, {
      type: input.type,
      location: input.location,
      city: p.villePrincipale,
    });
    return this.prisma.proProfileProject.create({
      data: {
        proProfileId: p.id,
        slug,
        title: input.title,
        type: input.type,
        location: input.location,
        surface: input.surface ?? null,
        year: input.year ?? null,
        status: input.status || "ETUDE",
        missions: input.missions || [],
        programme: input.programme || null,
        description: input.description,
        materials: input.materials || null,
        keywords,
        published: !!input.published,
      },
      include: { media: true },
    });
  }

  async updateMyProject(userId: string, projectId: string, input: Partial<ProjectInput>) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({ where: { id: projectId } });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    const data: any = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.type !== undefined) data.type = input.type;
    if (input.location !== undefined) data.location = input.location;
    if (input.surface !== undefined) data.surface = input.surface;
    if (input.year !== undefined) data.year = input.year;
    if (input.status !== undefined) data.status = input.status;
    if (input.missions !== undefined) data.missions = input.missions;
    if (input.programme !== undefined) data.programme = input.programme;
    if (input.description !== undefined) data.description = input.description;
    if (input.materials !== undefined) data.materials = input.materials;
    if (input.published !== undefined) data.published = input.published;
    if (input.keywords !== undefined || input.type !== undefined || input.location !== undefined) {
      data.keywords = this.mergeKeywords(input.keywords ?? proj.keywords, {
        type: input.type ?? proj.type,
        location: input.location ?? proj.location,
        city: p.villePrincipale,
      });
    }
    return this.prisma.proProfileProject.update({ where: { id: projectId }, data, include: { media: true } });
  }

  async deleteMyProject(userId: string, projectId: string) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({ where: { id: projectId } });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    await this.prisma.proProfileProject.delete({ where: { id: projectId } });
    return { ok: true };
  }

  async setPublished(userId: string, projectId: string, published: boolean) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({ where: { id: projectId } });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    // Si on publie pour la 1re fois, s'assurer qu'un slug cabinet existe (URL publique navigable).
    if (published && !p.slug) await this.ensureCabinetSlug(userId);
    return this.prisma.proProfileProject.update({ where: { id: projectId }, data: { published }, include: { media: true } });
  }

  // ── CRUD Media ───────────────────────────────────────────────────────

  async addMyProjectMedia(userId: string, projectId: string, input: MediaInput) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({
      where: { id: projectId },
      include: { media: { orderBy: { position: "asc" } } },
    });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    if (!input?.url || !input?.kind) throw new ForbiddenException("url et kind requis");
    if ((input.kind === "VIDEO_FILE" || input.kind === "VIDEO_URL") && !input.thumbnailUrl) {
      throw new ForbiddenException("thumbnailUrl requis pour une vidéo (VideoObject schema.org)");
    }
    const photoCount = proj.media.filter((m) => m.kind === "PHOTO").length;
    const alt =
      input.alt ||
      this.buildAltForMedia(proj, p.displayName, input.kind === "PHOTO" ? photoCount : 0);
    const position = input.position ?? proj.media.length;
    return this.prisma.proProfileMedia.create({
      data: {
        projectId,
        kind: input.kind,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl || null,
        alt,
        caption: input.caption || null,
        width: input.width ?? null,
        height: input.height ?? null,
        durationSec: input.durationSec ?? null,
        position,
      },
    });
  }

  async deleteMyMedia(userId: string, projectId: string, mediaId: string) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({ where: { id: projectId } });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    const m = await this.prisma.proProfileMedia.findUnique({ where: { id: mediaId } });
    if (!m || m.projectId !== projectId) throw new ForbiddenException("Média introuvable");
    await this.prisma.proProfileMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  async reorderMyMedia(userId: string, projectId: string, order: Array<{ id: string; position: number }>) {
    const p = await this.requireMyProfile(userId);
    const proj = await this.prisma.proProfileProject.findUnique({ where: { id: projectId }, include: { media: true } });
    if (!proj || proj.proProfileId !== p.id) throw new ForbiddenException("Projet introuvable ou non possédé");
    const owned = new Set(proj.media.map((m) => m.id));
    const updates = order.filter((o) => owned.has(o.id));
    await this.prisma.$transaction(updates.map((o) => this.prisma.proProfileMedia.update({ where: { id: o.id }, data: { position: o.position } })));
    return { ok: true, count: updates.length };
  }

  // ── Vue publique ─────────────────────────────────────────────────────

  async getPublicCabinet(slug: string) {
    const profile = await this.prisma.proProfile.findUnique({
      where: { slug },
      include: {
        portfolioProjects: {
          where: { published: true },
          orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
          include: { media: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!profile) throw new NotFoundException("Cabinet introuvable");
    return profile;
  }

  async getPublicProject(cabinetSlug: string, projectSlug: string) {
    const profile = await this.prisma.proProfile.findUnique({ where: { slug: cabinetSlug }, select: { id: true } });
    if (!profile) throw new NotFoundException("Cabinet introuvable");
    const project = await this.prisma.proProfileProject.findUnique({
      where: { proProfileId_slug: { proProfileId: profile.id, slug: projectSlug } },
      include: { media: { orderBy: { position: "asc" } }, proProfile: true },
    });
    if (!project || !project.published) throw new NotFoundException("Projet introuvable");
    return project;
  }

  // ── JSON-LD (ProfessionalService + CreativeWork + Image/VideoObject) ──

  async getSchemaJsonForCabinet(slug: string): Promise<any[]> {
    const profile = await this.getPublicCabinet(slug);
    const baseCabinetUrl = `${PUBLIC_BASE}/cabinet/${profile.slug}`;
    const out: any[] = [];

    out.push({
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      "@id": `${baseCabinetUrl}#cabinet`,
      name: profile.cabinetName || profile.displayName,
      url: baseCabinetUrl,
      description: trunc(profile.bio || "", 280),
      image: profile.coverUrl || profile.avatarUrl || undefined,
      telephone: profile.phonePublic || undefined,
      email: profile.emailPublic || undefined,
      areaServed: (profile.regions || []).map((r) => ({ "@type": "AdministrativeArea", name: r })),
      founder: { "@type": "Person", name: profile.displayName, jobTitle: profile.title || undefined },
      sameAs: [profile.websiteUrl, profile.linkedinUrl, profile.behanceUrl, profile.instagramUrl, profile.pinterestUrl].filter(Boolean),
    });

    for (const project of profile.portfolioProjects) {
      const projectUrl = `${baseCabinetUrl}/projet/${project.slug}`;
      const images = project.media.filter((m) => m.kind === "PHOTO").map((m) => ({
        "@type": "ImageObject",
        url: m.url,
        caption: m.alt || undefined,
        width: m.width || undefined,
        height: m.height || undefined,
      }));

      out.push({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": `${projectUrl}#work`,
        name: project.title,
        about: project.type,
        locationCreated: { "@type": "Place", name: project.location },
        creator: { "@type": "Person", name: profile.displayName },
        description: trunc(project.description, 400),
        keywords: (project.keywords || []).join(", ") || undefined,
        dateCreated: project.year ? `${project.year}-01-01` : undefined,
        image: images.length ? images : undefined,
        url: projectUrl,
      });

      for (const m of project.media) {
        if (m.kind === "PHOTO") continue;
        // Garde-fou doctrinal : un VideoObject n'est émis QUE si thumbnailUrl ET uploadDate sont présents.
        if (!m.thumbnailUrl || !m.uploadDate) continue;
        const isUrlEmbed = m.kind === "VIDEO_URL";
        out.push({
          "@context": "https://schema.org",
          "@type": "VideoObject",
          "@id": `${projectUrl}#video-${m.id}`,
          name: m.caption || project.title,
          description: trunc(project.description, 280),
          thumbnailUrl: m.thumbnailUrl,
          uploadDate: m.uploadDate.toISOString(),
          duration: m.durationSec ? `PT${m.durationSec}S` : undefined,
          ...(isUrlEmbed ? { embedUrl: m.url } : { contentUrl: m.url }),
        });
      }
    }

    return out;
  }

  // ── Sitemap cabinets + projets publiés ───────────────────────────────

  async getSitemapXml(): Promise<string> {
    const cabinets = await this.prisma.proProfile.findMany({
      where: { slug: { not: null }, portfolioProjects: { some: { published: true } } },
      select: {
        slug: true,
        updatedAt: true,
        portfolioProjects: {
          where: { published: true },
          select: { slug: true, updatedAt: true },
        },
      },
    });
    const today = new Date().toISOString().slice(0, 10);
    const urls: string[] = [];
    for (const c of cabinets) {
      const cabinetUrl = `${PUBLIC_BASE}/cabinet/${c.slug}`;
      urls.push(`  <url><loc>${cabinetUrl}</loc><lastmod>${c.updatedAt.toISOString().slice(0, 10) || today}</lastmod><priority>0.8</priority></url>`);
      for (const proj of c.portfolioProjects) {
        urls.push(
          `  <url><loc>${cabinetUrl}/projet/${proj.slug}</loc><lastmod>${proj.updatedAt.toISOString().slice(0, 10) || today}</lastmod><priority>0.7</priority></url>`,
        );
      }
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  }
}
