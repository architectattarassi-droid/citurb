import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";
import { PvReceptionRenderer } from "./pv-reception-renderer";
import { CertificatConformiteRenderer } from "./certificat-conformite-renderer";
import {
  CertificatInput,
  DefinitiveInput,
  DemandePhInput,
  GARANTIE_DUREE_JOURS,
  GarantieActive,
  GarantieType,
  LeveeReserveInput,
  PermisHabiterState,
  ProvisoireInput,
  RECEPTION_PAYLOAD_KEY,
  ReceptionConformiteState,
  ReceptionDefinitive,
  ReceptionPresent,
  ReceptionProvisoire,
  ReceptionSignature,
  Reserve,
  SignatureInput,
  SinistreInput,
  VisiteConformiteInput,
} from "./types";

type DossierLite = {
  id: string;
  ownerId: string;
  refInterne: string | null;
  title: string | null;
  commune: string | null;
  payload: any;
};

/**
 * ReceptionConformiteService — orchestration de la réception (provisoire +
 * définitive), levée des réserves, demande de permis d'habiter, suivi des
 * garanties légales et déclaration de sinistres (Tome 3).
 *
 * Persistance MVP : JSON sous `Dossier.payload.receptionConformite`.
 * Migration cible : voir INTEGRATION.md.
 */
@Injectable()
export class ReceptionConformiteService {
  private readonly logger = new Logger(ReceptionConformiteService.name);
  private readonly storageRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
    private readonly pvRenderer: PvReceptionRenderer,
    private readonly certRenderer: CertificatConformiteRenderer,
  ) {
    this.storageRoot =
      process.env.RECEPTION_STORAGE_ROOT ??
      path.resolve(process.cwd(), "apps/api/storage/reception-conformite");
  }

  // ───────────────────────────────────────────────── Lecture

  async getState(dossierId: string): Promise<ReceptionConformiteState> {
    const dossier = await this.loadDossier(dossierId);
    return this.readState(dossier);
  }

  async getGaranties(dossierId: string): Promise<{
    garanties: GarantieActive[];
    debut: string | null;
  }> {
    const state = await this.getState(dossierId);
    const debut = state.garantieDateDebut ?? null;
    if (!debut) return { garanties: [], debut: null };
    const now = Date.now();
    const debutMs = new Date(debut).getTime();
    const types: GarantieType[] = ["PARFAIT_ACHEVEMENT", "BIENNALE", "DECENNALE"];
    const garanties = types.map<GarantieActive>((t) => {
      const dureeMs = GARANTIE_DUREE_JOURS[t] * 24 * 60 * 60 * 1000;
      const finMs = debutMs + dureeMs;
      const fin = new Date(finMs).toISOString();
      const expireDansJours = Math.round((finMs - now) / (24 * 60 * 60 * 1000));
      const expiree = finMs < now;
      const alerte30j = !expiree && expireDansJours <= 30;
      return {
        type: t,
        dateDebut: debut,
        dateFin: fin,
        expireDansJours,
        expiree,
        alerte30j,
      };
    });
    return { garanties, debut };
  }

  // ─────────────────────────────────── Réception provisoire

  async createOrUpdateProvisoire(
    dossierId: string,
    input: ProvisoireInput,
  ): Promise<ReceptionProvisoire> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const now = new Date().toISOString();

    if (state.provisoire?.status === "FINAL") {
      throw new ForbiddenException("Réception provisoire déjà finalisée");
    }

    const existing = state.provisoire;
    const reserves: Reserve[] = (input.reserves ?? existing?.reserves ?? []).map(
      (r) => ({
        id: (r as any).id || randomUUID(),
        description: String(r.description ?? "").slice(0, 2000),
        severite: (r.severite as Reserve["severite"]) || "MINEURE",
        piece: r.piece ?? null,
        photoUrls: Array.isArray(r.photoUrls) ? r.photoUrls.slice(0, 20) : [],
        responsableLevee: r.responsableLevee ?? null,
        deadline: r.deadline ?? null,
        // conserver état levée si existait déjà
        leveeAt: existing?.reserves.find((x) => x.id === (r as any).id)?.leveeAt ?? null,
        leveeDescription:
          existing?.reserves.find((x) => x.id === (r as any).id)?.leveeDescription ?? null,
        leveePhotoUrls:
          existing?.reserves.find((x) => x.id === (r as any).id)?.leveePhotoUrls ?? [],
        leveeSignature:
          existing?.reserves.find((x) => x.id === (r as any).id)?.leveeSignature ?? null,
      }),
    );

    const provisoire: ReceptionProvisoire = {
      id: existing?.id ?? randomUUID(),
      dateReception: input.dateReception ?? existing?.dateReception ?? now.slice(0, 10),
      presents: this.sanitizePresents(input.presents ?? existing?.presents ?? []),
      ouvrageDescription: input.ouvrageDescription ?? existing?.ouvrageDescription ?? null,
      montantTravauxMAD:
        typeof input.montantTravauxMAD === "number"
          ? input.montantTravauxMAD
          : existing?.montantTravauxMAD ?? null,
      checklist: (input.checklist ?? existing?.checklist ?? []).map((c) => ({
        id: c.id || randomUUID(),
        libelle: String(c.libelle ?? "").slice(0, 240),
        conforme: !!c.conforme,
        observation: c.observation ?? null,
      })),
      reserves,
      observations: input.observations ?? input.reservesObs ?? existing?.observations ?? null,
      photos: (input.photos ?? existing?.photos ?? []).slice(0, 200).map((p) => ({
        url: String(p.url ?? ""),
        legende: p.legende ?? null,
        piece: p.piece ?? null,
        capturedAt: p.capturedAt ?? null,
      })),
      signatures: existing?.signatures ?? [],
      status: "DRAFT",
      hashSha256: null,
      pvUrl: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      finalizedAt: null,
    };

    state.provisoire = provisoire;
    state.status = "PROVISOIRE_DRAFT";
    await this.writeState(dossier, state);
    return provisoire;
  }

  async addSignature(
    dossierId: string,
    input: SignatureInput,
  ): Promise<ReceptionConformiteState> {
    if (!input?.partie || !input?.dataUrl) {
      throw new BadRequestException("partie et dataUrl requis");
    }
    if (!/^data:image\/(png|jpeg);base64,/i.test(input.dataUrl)) {
      throw new BadRequestException("dataUrl invalide (PNG/JPEG attendu)");
    }
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const sig: ReceptionSignature = {
      partie: input.partie.slice(0, 120),
      dataUrl: input.dataUrl,
      signedAt: new Date().toISOString(),
    };
    if (input.cible === "PROVISOIRE") {
      if (!state.provisoire) throw new NotFoundException("Provisoire absente");
      if (state.provisoire.status === "FINAL") {
        throw new ForbiddenException("Provisoire finalisée — signatures verrouillées");
      }
      state.provisoire.signatures = [...state.provisoire.signatures, sig];
      state.provisoire.updatedAt = sig.signedAt;
      state.status = "PROVISOIRE_DRAFT";
    } else {
      if (!state.definitive) throw new NotFoundException("Définitive absente");
      if (state.definitive.status === "FINAL") {
        throw new ForbiddenException("Définitive finalisée — signatures verrouillées");
      }
      state.definitive.signatures = [...state.definitive.signatures, sig];
      state.definitive.updatedAt = sig.signedAt;
    }
    await this.writeState(dossier, state);
    return state;
  }

  async finalizeProvisoire(dossierId: string): Promise<ReceptionProvisoire> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const pv = state.provisoire;
    if (!pv) throw new NotFoundException("Provisoire absente");
    if (pv.status === "FINAL") return pv;
    if ((pv.signatures?.length ?? 0) < 1) {
      throw new BadRequestException(
        "Au moins une signature requise avant finalisation",
      );
    }
    const canonical = this.canonicalForHash(pv);
    const hash = createHash("sha256").update(canonical).digest("hex");
    pv.hashSha256 = hash;
    pv.status = "FINAL";
    const finalizedAt = new Date().toISOString();
    pv.finalizedAt = finalizedAt;
    pv.updatedAt = finalizedAt;

    const html = this.pvRenderer.renderProvisoire(pv, {
      dossierTitle: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      dossierRef: dossier.refInterne ?? undefined,
    });
    pv.pvUrl = await this.persistHtmlSnapshot(dossier.id, pv.id, "provisoire.html", html);

    // Bascule status global + garanties actives
    state.status = pv.reserves.some((r) => !r.leveeAt)
      ? "RESERVES_EN_COURS"
      : "RESERVES_LEVEES";
    state.garantieDateDebut = pv.dateReception;

    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "RECEPTION_PROVISOIRE_FINALIZED",
      tome: "tome3",
      rule_id: "T3-R-RECEPT-001",
      dossierId: dossier.id,
      provisoireId: pv.id,
      hash,
      finalizedAt,
    });
    return pv;
  }

  // ─────────────────────────────────── Levée de réserves

  async leveeReserve(
    dossierId: string,
    input: LeveeReserveInput,
  ): Promise<Reserve> {
    if (!input?.reserveId) throw new BadRequestException("reserveId requis");
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const pv = state.provisoire;
    if (!pv) throw new NotFoundException("Provisoire absente");
    const reserve = pv.reserves.find((r) => r.id === input.reserveId);
    if (!reserve) throw new NotFoundException("Réserve introuvable");
    if (reserve.leveeAt) {
      throw new ForbiddenException("Réserve déjà levée");
    }
    const now = new Date().toISOString();
    reserve.leveeAt = input.dateLevee ?? now;
    reserve.leveeDescription = String(input.descriptionLevee ?? "").slice(0, 2000);
    reserve.leveePhotoUrls = Array.isArray(input.preuvePhotos)
      ? input.preuvePhotos.slice(0, 20)
      : [];
    reserve.leveeSignature = input.signature ?? null;

    pv.updatedAt = now;

    // Recalcule status global
    const allLevees = pv.reserves.every((r) => !!r.leveeAt);
    if (allLevees) state.status = "RESERVES_LEVEES";

    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "RESERVE_LEVEE",
      tome: "tome3",
      rule_id: "T3-R-RECEPT-002",
      dossierId: dossier.id,
      reserveId: reserve.id,
      leveeAt: reserve.leveeAt,
    });
    return reserve;
  }

  async renderLeveeHtml(dossierId: string, reserveId: string): Promise<string> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const pv = state.provisoire;
    if (!pv) throw new NotFoundException("Provisoire absente");
    const reserve = pv.reserves.find((r) => r.id === reserveId);
    if (!reserve) throw new NotFoundException("Réserve introuvable");
    return this.pvRenderer.renderLeveeReserve(reserve, pv, {
      dossierTitle: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      dossierRef: dossier.refInterne ?? undefined,
    });
  }

  // ─────────────────────────────────── Réception définitive

  async createOrUpdateDefinitive(
    dossierId: string,
    input: DefinitiveInput,
  ): Promise<ReceptionDefinitive> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    if (!state.provisoire || state.provisoire.status !== "FINAL") {
      throw new ForbiddenException(
        "Réception provisoire requise et finalisée avant définitive",
      );
    }
    if (state.definitive?.status === "FINAL") {
      throw new ForbiddenException("Réception définitive déjà finalisée");
    }
    const allLevees = state.provisoire.reserves.every((r) => !!r.leveeAt);
    const validation = input.validation !== undefined ? !!input.validation : allLevees;
    if (!validation) {
      throw new BadRequestException(
        "Validation refusée : toutes les réserves doivent être levées",
      );
    }
    const now = new Date().toISOString();
    const existing = state.definitive;
    const definitive: ReceptionDefinitive = {
      id: existing?.id ?? randomUUID(),
      dateReception: input.dateReception ?? existing?.dateReception ?? now.slice(0, 10),
      presents: this.sanitizePresents(input.presents ?? existing?.presents ?? []),
      validationToutesReservesLevees: true,
      observations: input.observations ?? existing?.observations ?? null,
      libereRetenueGarantie: true,
      montantRetenueLibereeMAD:
        typeof input.montantRetenueLibereeMAD === "number"
          ? input.montantRetenueLibereeMAD
          : existing?.montantRetenueLibereeMAD ?? null,
      signatures: existing?.signatures ?? [],
      status: "DRAFT",
      hashSha256: null,
      pvUrl: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      finalizedAt: null,
    };
    state.definitive = definitive;
    await this.writeState(dossier, state);
    return definitive;
  }

  async finalizeDefinitive(dossierId: string): Promise<ReceptionDefinitive> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const pv = state.definitive;
    if (!pv) throw new NotFoundException("Définitive absente");
    if (pv.status === "FINAL") return pv;
    if ((pv.signatures?.length ?? 0) < 1) {
      throw new BadRequestException("Au moins une signature requise avant finalisation");
    }
    const canonical = this.canonicalForHash(pv);
    const hash = createHash("sha256").update(canonical).digest("hex");
    pv.hashSha256 = hash;
    pv.status = "FINAL";
    const finalizedAt = new Date().toISOString();
    pv.finalizedAt = finalizedAt;
    pv.updatedAt = finalizedAt;

    const html = this.pvRenderer.renderDefinitive(pv, state.provisoire ?? null, {
      dossierTitle: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      dossierRef: dossier.refInterne ?? undefined,
    });
    pv.pvUrl = await this.persistHtmlSnapshot(dossier.id, pv.id, "definitive.html", html);

    state.status = "DEFINITIVE_SIGNED";
    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "RECEPTION_DEFINITIVE_FINALIZED",
      tome: "tome3",
      rule_id: "T3-R-RECEPT-003",
      dossierId: dossier.id,
      definitiveId: pv.id,
      hash,
      finalizedAt,
    });
    return pv;
  }

  // ─────────────────────────────────── Permis d'habiter

  async demandePermisHabiter(
    dossierId: string,
    input: DemandePhInput,
  ): Promise<PermisHabiterState> {
    if (!input?.commune) throw new BadRequestException("commune requise");
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    if (!state.provisoire || state.provisoire.status !== "FINAL") {
      throw new ForbiddenException(
        "Réception provisoire requise avant demande PH",
      );
    }
    const now = new Date().toISOString();
    state.permisHabiter = {
      ...state.permisHabiter,
      status: "DEMANDE_DEPOSEE",
      demande: {
        commune: String(input.commune).slice(0, 200),
        dossierComplet: Array.isArray(input.dossierComplet)
          ? input.dossierComplet.slice(0, 100)
          : [],
        dateDepot: now,
      },
    };
    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "PH_DEMANDE_DEPOSEE",
      tome: "tome3",
      rule_id: "T3-R-PH-001",
      dossierId: dossier.id,
      commune: input.commune,
    });
    return state.permisHabiter;
  }

  async visiteConformite(
    dossierId: string,
    input: VisiteConformiteInput,
  ): Promise<PermisHabiterState> {
    if (!input?.dateVisite || !input?.agentName) {
      throw new BadRequestException("dateVisite et agentName requis");
    }
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    state.permisHabiter.visites = state.permisHabiter.visites ?? [];
    state.permisHabiter.visites.push({
      id: randomUUID(),
      dateVisite: input.dateVisite,
      agentName: String(input.agentName).slice(0, 200),
      agentMatricule: input.agentMatricule ?? null,
      ralerie: input.ralerie ?? null,
      observations: input.observations ?? null,
      resultat: input.resultat ?? "EN_ATTENTE",
    });
    if (state.permisHabiter.status === "DEMANDE_DEPOSEE") {
      state.permisHabiter.status = "VISITE_EFFECTUEE";
    }
    await this.writeState(dossier, state);
    return state.permisHabiter;
  }

  async certificatConformite(
    dossierId: string,
    input: CertificatInput,
  ): Promise<PermisHabiterState> {
    if (!input?.refOfficial || !input?.dateDelivrance) {
      throw new BadRequestException("refOfficial et dateDelivrance requis");
    }
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const finalizedAt = new Date().toISOString();
    const certCore = {
      refOfficial: String(input.refOfficial).slice(0, 200),
      dateDelivrance: input.dateDelivrance,
      urlOfficial: input.urlOfficial ?? null,
    };
    const canonical = JSON.stringify({
      refOfficial: certCore.refOfficial,
      dateDelivrance: certCore.dateDelivrance,
      urlOfficial: certCore.urlOfficial,
      dossierId: dossier.id,
    });
    const hash = createHash("sha256").update(canonical).digest("hex");

    state.permisHabiter.certificat = {
      ...certCore,
      hashSha256: hash,
      finalizedAt,
      certificatCiturbarealUrl: null,
    };
    state.permisHabiter.status = "DELIVRE";

    // Render & persist attestation CITURBAREA
    const html = this.certRenderer.renderCertificat(
      state.permisHabiter.certificat!,
      state.permisHabiter,
      {
        dossierTitle: dossier.title ?? undefined,
        commune: dossier.commune ?? undefined,
        dossierRef: dossier.refInterne ?? undefined,
      },
    );
    const url = await this.persistHtmlSnapshot(dossier.id, "certificat", "certificat.html", html);
    state.permisHabiter.certificat!.certificatCiturbarealUrl = url;

    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "PH_DELIVRE",
      tome: "tome3",
      rule_id: "T3-R-PH-002",
      dossierId: dossier.id,
      refOfficial: certCore.refOfficial,
      hash,
      finalizedAt,
    });
    return state.permisHabiter;
  }

  async renderCertificatHtml(dossierId: string): Promise<string> {
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    const cert = state.permisHabiter.certificat;
    if (!cert) throw new NotFoundException("Certificat absent");
    return this.certRenderer.renderCertificat(cert, state.permisHabiter, {
      dossierTitle: dossier.title ?? undefined,
      commune: dossier.commune ?? undefined,
      dossierRef: dossier.refInterne ?? undefined,
    });
  }

  // ─────────────────────────────────── Sinistres garanties

  async declareSinistre(
    dossierId: string,
    input: SinistreInput,
    declarantId?: string | null,
  ) {
    if (!input?.garantieType || !input?.description || !input?.dateConstatation) {
      throw new BadRequestException("garantieType, description, dateConstatation requis");
    }
    const dossier = await this.loadDossier(dossierId);
    const state = this.readState(dossier);
    if (!state.garantieDateDebut) {
      throw new ForbiddenException(
        "Aucune garantie active (réception provisoire non finalisée)",
      );
    }
    const { garanties } = await this.getGaranties(dossierId);
    const g = garanties.find((x) => x.type === input.garantieType);
    if (!g || g.expiree) {
      throw new ForbiddenException(
        `Garantie ${input.garantieType} expirée ou inexistante`,
      );
    }
    const now = new Date().toISOString();
    const sin = {
      id: randomUUID(),
      garantieType: input.garantieType,
      description: String(input.description).slice(0, 2000),
      photoUrls: Array.isArray(input.photos) ? input.photos.slice(0, 20) : [],
      dateConstatation: input.dateConstatation,
      dateDeclaration: now,
      status: "DECLARE" as const,
      declarantId: declarantId ?? null,
      reponseAssureur: null,
    };
    state.sinistres = state.sinistres ?? [];
    state.sinistres.push(sin);
    await this.writeState(dossier, state);
    await this.probativeAppend({
      kind: "SINISTRE_DECLARE",
      tome: "tome3",
      rule_id: "T3-R-GAR-001",
      dossierId: dossier.id,
      sinistreId: sin.id,
      garantieType: sin.garantieType,
    });
    return sin;
  }

  // ─────────────────────────────────── Storage / snapshot

  async resolveSnapshot(dossierId: string, relPath: string): Promise<string> {
    const safe = relPath.replace(/\.\./g, "").replace(/^\/+/, "");
    const abs = path.join(this.storageRoot, dossierId, safe);
    return abs;
  }

  async savePhoto(opts: {
    dossierId: string;
    bucket: string;
    contentBase64: string;
    mimeType: string;
    filenameHint?: string;
  }): Promise<{ url: string }> {
    const dir = path.join(this.storageRoot, opts.dossierId, opts.bucket, "photos");
    await fs.mkdir(dir, { recursive: true });
    const ext = this.extFromMime(opts.mimeType);
    const safeHint = (opts.filenameHint || "photo")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const name = `${Date.now()}_${safeHint}.${ext}`;
    const abs = path.join(dir, name);
    await fs.writeFile(abs, Buffer.from(opts.contentBase64, "base64"));
    return {
      url: `/storage/reception-conformite/${opts.dossierId}/${opts.bucket}/photos/${name}`,
    };
  }

  // ─────────────────────────────────── Cron alerte garanties J-30

  /**
   * Retourne les dossiers dont au moins une garantie expire dans <= 30 jours.
   * Appelé par un cron quotidien (cf. INTEGRATION.md).
   */
  async findGarantiesExpirantSous30j(): Promise<
    Array<{ dossierId: string; ownerId: string; garanties: GarantieActive[] }>
  > {
    const dossiers = await this.prisma.dossier.findMany({
      orderBy: { updatedAt: "desc" },
      take: 2000,
      select: { id: true, ownerId: true, refInterne: true, title: true, commune: true, payload: true },
    });
    const out: Array<{ dossierId: string; ownerId: string; garanties: GarantieActive[] }> = [];
    for (const d of dossiers as DossierLite[]) {
      const state = this.readState(d);
      if (!state.garantieDateDebut) continue;
      const { garanties } = await this.getGaranties(d.id);
      const alertes = garanties.filter((g) => g.alerte30j);
      if (alertes.length > 0) {
        out.push({ dossierId: d.id, ownerId: d.ownerId, garanties: alertes });
      }
    }
    return out;
  }

  // ─────────────────────────────────── Internals

  private async loadDossier(dossierId: string): Promise<DossierLite> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        id: true,
        ownerId: true,
        refInterne: true,
        title: true,
        commune: true,
        payload: true,
      },
    });
    if (!d) throw new NotFoundException("Dossier introuvable");
    return d as DossierLite;
  }

  private readState(dossier: DossierLite): ReceptionConformiteState {
    const payload =
      dossier.payload && typeof dossier.payload === "object"
        ? (dossier.payload as Record<string, unknown>)
        : {};
    const raw = (payload as any)[RECEPTION_PAYLOAD_KEY];
    if (raw && typeof raw === "object") {
      return {
        status: raw.status ?? "NONE",
        provisoire: raw.provisoire ?? null,
        definitive: raw.definitive ?? null,
        permisHabiter:
          raw.permisHabiter ?? { status: "NON_DEMANDE", visites: [], certificat: null },
        sinistres: Array.isArray(raw.sinistres) ? raw.sinistres : [],
        garantieDateDebut: raw.garantieDateDebut ?? null,
      };
    }
    return {
      status: "NONE",
      provisoire: null,
      definitive: null,
      permisHabiter: { status: "NON_DEMANDE", visites: [], certificat: null },
      sinistres: [],
      garantieDateDebut: null,
    };
  }

  private async writeState(
    dossier: DossierLite,
    state: ReceptionConformiteState,
  ): Promise<void> {
    const payload =
      dossier.payload && typeof dossier.payload === "object"
        ? { ...(dossier.payload as Record<string, unknown>) }
        : {};
    (payload as any)[RECEPTION_PAYLOAD_KEY] = state;
    await this.prisma.dossier.update({
      where: { id: dossier.id },
      data: { payload: payload as any },
    });
  }

  private sanitizePresents(arr: ReceptionPresent[]): ReceptionPresent[] {
    return (arr ?? []).slice(0, 50).map((p) => ({
      nom: String(p.nom ?? "").slice(0, 120),
      role: String(p.role ?? "").slice(0, 80),
      organisme: p.organisme ?? null,
    }));
  }

  private canonicalForHash(obj: any): string {
    const copy = { ...obj, hashSha256: null, pvUrl: null };
    return JSON.stringify(copy, Object.keys(copy).sort());
  }

  private async persistHtmlSnapshot(
    dossierId: string,
    bucket: string,
    filename: string,
    html: string,
  ): Promise<string> {
    const dir = path.join(this.storageRoot, dossierId, bucket);
    await fs.mkdir(dir, { recursive: true });
    const abs = path.join(dir, filename);
    await fs.writeFile(abs, html, "utf8");
    return `/storage/reception-conformite/${dossierId}/${bucket}/${filename}`;
  }

  private extFromMime(mime: string): string {
    const m = (mime || "").toLowerCase();
    if (m.includes("png")) return "png";
    if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
    if (m.includes("webp")) return "webp";
    return "bin";
  }

  private async probativeAppend(payload: Record<string, any>): Promise<void> {
    try {
      await this.probative.append(payload);
    } catch (e: any) {
      this.logger.warn(`probative append failed: ${e?.message}`);
    }
  }
}
