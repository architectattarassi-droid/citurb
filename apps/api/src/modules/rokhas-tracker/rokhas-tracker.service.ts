/**
 * Rokhas Tracker — Service
 *
 * Source de vérité pour l'instance Rokhas d'un dossier.
 *
 * Persistance MVP : `Dossier.payload.rokhasTracker: RokhasInstance`.
 * Une migration Prisma dédiée (cf. INTEGRATION.md) peut être plug-in
 * plus tard : seuls `_load` / `_save` changent.
 *
 * Audit : chaque mutation passe par `ProbativeLogService.append`.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";
import {
  computeDecisionDeadline,
  computeRelanceAjourneDeadline,
  computeReserveLeveeDeadline,
  joursRestants,
  severityFromJours,
} from "./rokhas-delays";
import type {
  ProjectCategory,
  RokhasDeadline,
  RokhasDecision,
  RokhasDecisionType,
  RokhasEvent,
  RokhasEventType,
  RokhasInstance,
  RokhasInstanceView,
  RokhasReserve,
  ReserveSeverite,
} from "./types";

const ALL_EVENT_TYPES: RokhasEventType[] = [
  "DEPOT", "ACCUSE", "COMMISSION", "AVIS_AU", "AVIS_SERVICES",
  "VOTE", "DECISION", "RESERVE_AJOUTE", "RESERVE_LEVEE", "DELIVRANCE",
];

/** Étapes "principales" de la timeline pour calcul du progressPct. */
const TIMELINE_MILESTONES: RokhasEventType[] = [
  "DEPOT", "ACCUSE", "COMMISSION", "VOTE", "DECISION", "DELIVRANCE",
];

@Injectable()
export class RokhasTrackerService {
  private readonly logger = new Logger(RokhasTrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly probative?: ProbativeLogService,
  ) {}

  // ── DÉPÔT ─────────────────────────────────────────────────────────────────

  async registerDepot(opts: {
    dossierId: string;
    projectCategory: ProjectCategory;
    depositDate?: string | null;
    refRokhasCommune?: string | null;
    actorId: string;
  }): Promise<RokhasInstanceView> {
    const { dossierId, projectCategory, refRokhasCommune, actorId } = opts;
    if (![1, 2, 3].includes(projectCategory)) {
      throw new BadRequestException("projectCategory doit être 1, 2 ou 3");
    }
    const depositDate = this._ensureIso(opts.depositDate) || new Date().toISOString();

    const existing = await this._load(dossierId);
    if (existing && existing.events.some((e) => e.type === "DEPOT")) {
      // Idempotent : on retourne l'instance existante.
      return this._hydrate(existing);
    }

    const inst: RokhasInstance = existing ?? this._emptyInstance(dossierId, depositDate, projectCategory);
    inst.projectCategory = projectCategory;
    inst.depositDate = depositDate;
    inst.refRokhasCommune = refRokhasCommune ?? inst.refRokhasCommune ?? null;
    inst.events = [
      ...inst.events,
      this._newEvent("DEPOT", depositDate, { projectCategory, refRokhasCommune }, actorId),
    ];
    inst.updatedAt = new Date().toISOString();

    await this._save(dossierId, inst);
    await this._logEvent("DEPOT", dossierId, { projectCategory, refRokhasCommune }, actorId);
    return this._hydrate(inst);
  }

  // ── ÉVÉNEMENT GÉNÉRIQUE ───────────────────────────────────────────────────

  async addEvent(opts: {
    dossierId: string;
    type: RokhasEventType;
    date?: string | null;
    payload?: Record<string, any>;
    actorId: string;
  }): Promise<RokhasInstanceView> {
    const { dossierId, type, payload, actorId } = opts;
    if (!ALL_EVENT_TYPES.includes(type)) throw new BadRequestException(`type d'événement inconnu: ${type}`);
    const date = this._ensureIso(opts.date) || new Date().toISOString();

    const inst = await this._loadOrThrow(dossierId);

    // Traitement spécial pour certains types
    if (type === "DECISION") {
      this._applyDecisionEvent(inst, date, payload || {});
    } else if (type === "DELIVRANCE") {
      inst.delivranceDate = date;
      if (payload?.attestationPdfUrl && typeof payload.attestationPdfUrl === "string") {
        inst.attestationPdfUrl = payload.attestationPdfUrl;
      }
    } else if (type === "RESERVE_AJOUTE") {
      this._addReserveFromPayload(inst, payload || {}, date);
    }

    inst.events.push(this._newEvent(type, date, payload, actorId));
    inst.updatedAt = new Date().toISOString();
    await this._save(dossierId, inst);
    await this._logEvent(type, dossierId, payload, actorId);
    return this._hydrate(inst);
  }

  // ── LEVÉE DE RÉSERVE ──────────────────────────────────────────────────────

  async leverReserve(opts: {
    dossierId: string;
    reserveId: string;
    preuveDocId: string;
    preuveUrl?: string | null;
    actorId: string;
  }): Promise<RokhasInstanceView> {
    const { dossierId, reserveId, preuveDocId, actorId } = opts;
    if (!preuveDocId || typeof preuveDocId !== "string") {
      throw new BadRequestException("preuveDocId requis");
    }
    const inst = await this._loadOrThrow(dossierId);
    const reserve = inst.reserves.find((r) => r.id === reserveId);
    if (!reserve) throw new NotFoundException("Réserve inconnue");
    if (reserve.status === "LEVEE") return this._hydrate(inst); // idempotent
    if (reserve.status === "FORCLOSE") {
      throw new BadRequestException("Réserve forclose — délai légal dépassé");
    }

    reserve.status = "LEVEE";
    reserve.preuveDocId = preuveDocId;
    reserve.preuveUrl = opts.preuveUrl ?? reserve.preuveUrl ?? null;
    reserve.leveeAt = new Date().toISOString();
    reserve.leveeBy = actorId;
    inst.events.push(this._newEvent("RESERVE_LEVEE", reserve.leveeAt, { reserveId, preuveDocId }, actorId));
    inst.updatedAt = reserve.leveeAt;

    await this._save(dossierId, inst);
    await this._logEvent("RESERVE_LEVEE", dossierId, { reserveId, preuveDocId }, actorId);
    return this._hydrate(inst);
  }

  // ── READ ──────────────────────────────────────────────────────────────────

  async getInstance(dossierId: string): Promise<RokhasInstanceView | null> {
    const inst = await this._load(dossierId);
    return inst ? this._hydrate(inst) : null;
  }

  async listDeadlines(dossierId: string): Promise<RokhasDeadline[]> {
    const inst = await this._load(dossierId);
    if (!inst) return [];
    return this._computeDeadlines(inst);
  }

  // ── WEBHOOK (ingestion externe future) ────────────────────────────────────

  async ingestFromWebhook(payload: {
    dossierId: string;
    type: RokhasEventType;
    date?: string;
    refRokhasCommune?: string;
    decision?: Partial<RokhasDecision> & { type?: RokhasDecisionType };
    extra?: Record<string, any>;
  }): Promise<RokhasInstanceView> {
    if (!payload?.dossierId || !payload?.type) {
      throw new BadRequestException("dossierId + type requis");
    }
    // S'assure qu'une instance existe (auto-création légère si premier événement = DEPOT)
    const existing = await this._load(payload.dossierId);
    if (!existing && payload.type !== "DEPOT") {
      throw new NotFoundException("Aucune instance Rokhas — DEPOT requis en premier");
    }
    if (payload.type === "DEPOT") {
      return this.registerDepot({
        dossierId: payload.dossierId,
        projectCategory: (payload.extra?.projectCategory as ProjectCategory) ?? 1,
        depositDate: payload.date,
        refRokhasCommune: payload.refRokhasCommune ?? null,
        actorId: "system:webhook:rokhas",
      });
    }
    return this.addEvent({
      dossierId: payload.dossierId,
      type: payload.type,
      date: payload.date,
      payload: { ...(payload.extra || {}), decision: payload.decision },
      actorId: "system:webhook:rokhas",
    });
  }

  // ── INTERNALS ─────────────────────────────────────────────────────────────

  private _emptyInstance(dossierId: string, depositDate: string, cat: ProjectCategory): RokhasInstance {
    return {
      dossierId,
      projectCategory: cat,
      depositDate,
      refRokhasCommune: null,
      events: [],
      decision: null,
      reserves: [],
      delivranceDate: null,
      attestationPdfUrl: null,
      updatedAt: new Date().toISOString(),
    };
  }

  private _newEvent(type: RokhasEventType, date: string, payload: Record<string, any> | undefined, by: string | undefined): RokhasEvent {
    return {
      id: `evt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      type,
      date,
      createdAt: new Date().toISOString(),
      payload,
      by,
    };
  }

  private _applyDecisionEvent(inst: RokhasInstance, date: string, payload: Record<string, any>): void {
    const type: RokhasDecisionType | undefined = payload.decision?.type ?? payload.type;
    if (!type) throw new BadRequestException("payload.decision.type requis pour événement DECISION");
    if (!["FAVORABLE", "FAVORABLE_AVEC_RESERVES", "DEFAVORABLE", "AJOURNE"].includes(type)) {
      throw new BadRequestException(`type de décision invalide: ${type}`);
    }
    inst.decision = {
      type,
      date,
      motifsRefus: payload.decision?.motifsRefus ?? payload.motifsRefus ?? [],
      pvId: payload.decision?.pvId ?? payload.pvId,
    };
    // Si FAVORABLE_AVEC_RESERVES + reserves dans payload → matérialise
    const incoming = Array.isArray(payload.reserves) ? payload.reserves : [];
    if (incoming.length) {
      for (const r of incoming) this._addReserveFromPayload(inst, r, date);
    }
  }

  private _addReserveFromPayload(inst: RokhasInstance, raw: Record<string, any>, decisionDate?: string): void {
    const titre = String(raw.titre || raw.title || "").trim();
    if (!titre) return;
    const sev: ReserveSeverite = (["INFO", "AVIS", "RESERVE", "BLOQUANT"] as ReserveSeverite[]).includes(raw.severite)
      ? (raw.severite as ReserveSeverite)
      : "RESERVE";
    const deadlineLevee =
      this._ensureIso(raw.deadlineLevee) ||
      (decisionDate ? computeReserveLeveeDeadline(decisionDate) : null);
    inst.reserves.push({
      id: `res_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      titre,
      description: String(raw.description || ""),
      articleLoi: raw.articleLoi || null,
      severite: sev,
      deadlineLevee,
      status: "OUVERTE",
      preuveDocId: null,
      preuveUrl: null,
      leveeAt: null,
      leveeBy: null,
    });
  }

  private _hydrate(inst: RokhasInstance): RokhasInstanceView {
    // 1) bascule FORCLOSE pour les réserves dont le délai est passé
    const reserves: RokhasReserve[] = inst.reserves.map((r): RokhasReserve => {
      const jr = joursRestants(r.deadlineLevee);
      const status: RokhasReserve["status"] =
        r.status === "LEVEE" ? "LEVEE" :
        r.status === "FORCLOSE" ? "FORCLOSE" :
        (jr !== null && jr < 0) ? "FORCLOSE" :
        r.status;
      return { ...r, status, joursRestants: jr };
    });
    const hydrated: RokhasInstance = { ...inst, reserves };

    // 2) deadlines + decision deadline
    const deadlines = this._computeDeadlines(hydrated);
    const decisionDeadlineIso = inst.decision ? null : computeDecisionDeadline(inst.depositDate, inst.projectCategory);
    const decisionJr = decisionDeadlineIso ? joursRestants(decisionDeadlineIso) ?? 0 : null;
    const decisionDeadline = decisionDeadlineIso && decisionJr !== null
      ? { deadline: decisionDeadlineIso, joursRestants: decisionJr, severity: severityFromJours(decisionJr) }
      : null;

    // 3) progress pct (milestones franchis vs total)
    const reached = new Set(hydrated.events.map((e) => e.type));
    const total = TIMELINE_MILESTONES.length;
    const done = TIMELINE_MILESTONES.filter((m) => reached.has(m)).length;
    const progressPct = Math.round((done / total) * 100);

    return { ...hydrated, deadlines, decisionDeadline, progressPct };
  }

  private _computeDeadlines(inst: RokhasInstance): RokhasDeadline[] {
    const out: RokhasDeadline[] = [];
    // Décision légale (si non décidée)
    if (!inst.decision) {
      const dl = computeDecisionDeadline(inst.depositDate, inst.projectCategory);
      const jr = joursRestants(dl) ?? 0;
      out.push({
        type: "DECISION_LEGALE",
        label: `Décision attendue (catégorie ${inst.projectCategory})`,
        deadline: dl,
        joursRestants: jr,
        severity: severityFromJours(jr),
      });
    }
    // Réserves ouvertes
    for (const r of inst.reserves) {
      if (r.status === "LEVEE" || r.status === "FORCLOSE") continue;
      const jr = joursRestants(r.deadlineLevee);
      if (!r.deadlineLevee) continue;
      out.push({
        type: "RESERVE_LEVEE",
        label: `Lever réserve : ${r.titre}`.slice(0, 120),
        deadline: r.deadlineLevee,
        joursRestants: jr,
        severity: severityFromJours(jr),
        reserveId: r.id,
      });
    }
    // Relance ajourné
    if (inst.decision?.type === "AJOURNE") {
      const dl = computeRelanceAjourneDeadline(inst.decision.date);
      const jr = joursRestants(dl) ?? 0;
      out.push({
        type: "RELANCE_AJOURNE",
        label: "Relance automatique (ajournement)",
        deadline: dl,
        joursRestants: jr,
        severity: severityFromJours(jr),
      });
    }
    return out.sort((a, b) => (a.joursRestants ?? Infinity) - (b.joursRestants ?? Infinity));
  }

  private _ensureIso(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  private async _logEvent(type: RokhasEventType, dossierId: string, payload: any, actorId: string): Promise<void> {
    try {
      await this.probative?.append({
        type: "ROKHAS_TRACKER_EVENT",
        eventType: type,
        dossierId,
        actorId,
        payload,
        ts: new Date().toISOString(),
      });
    } catch (e: any) {
      this.logger.warn(`[ProbativeLog] failed: ${e?.message}`);
    }
  }

  // ── Persistance (MVP — payload Dossier) ───────────────────────────────────

  private async _load(dossierId: string): Promise<RokhasInstance | null> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { payload: true },
    });
    if (!d) return null;
    const raw = (d.payload as any)?.rokhasTracker;
    if (!raw) return null;
    return this._normalize(raw, dossierId);
  }

  private async _loadOrThrow(dossierId: string): Promise<RokhasInstance> {
    const inst = await this._load(dossierId);
    if (!inst) throw new NotFoundException("Aucune instance Rokhas pour ce dossier (DEPOT requis)");
    return inst;
  }

  private async _save(dossierId: string, inst: RokhasInstance): Promise<void> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { payload: true },
    });
    if (!d) throw new NotFoundException("Dossier inconnu");
    const cur = (d.payload as any) || {};
    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { payload: { ...cur, rokhasTracker: inst } },
    });
  }

  /** Reconstruit un objet sain (compat anciennes versions / champs manquants). */
  private _normalize(raw: any, dossierId: string): RokhasInstance {
    return {
      dossierId: raw.dossierId || dossierId,
      projectCategory: ([1, 2, 3].includes(Number(raw.projectCategory)) ? Number(raw.projectCategory) : 1) as 1 | 2 | 3,
      depositDate: raw.depositDate || new Date().toISOString(),
      refRokhasCommune: raw.refRokhasCommune ?? null,
      events: Array.isArray(raw.events) ? raw.events : [],
      decision: raw.decision ?? null,
      reserves: Array.isArray(raw.reserves) ? raw.reserves : [],
      delivranceDate: raw.delivranceDate ?? null,
      attestationPdfUrl: raw.attestationPdfUrl ?? null,
      updatedAt: raw.updatedAt || new Date().toISOString(),
    };
  }

}
