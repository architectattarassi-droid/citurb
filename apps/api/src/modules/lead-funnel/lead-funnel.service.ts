/**
 * lead-funnel.service.ts
 *
 * Capture, scoring, journalisation et stats des leads.
 *
 * Persistance :
 *  - DATABASE_URL défini → table Prisma `Lead` = source de vérité. La `Map`
 *    mémoire n'est qu'un cache ; `syncFromDb()` la recharge avant chaque
 *    lecture exposée, car d'autres écrivains (ex. Pages Function Cloudflare)
 *    peuvent alimenter la même table.
 *  - Sans DATABASE_URL (dev hors base) : Map + dump JSON best-effort dans
 *    `<cwd>/data/leads.json`, rechargé au démarrage.
 */

import { Injectable, Logger, Optional } from "@nestjs/common";
import { Prisma, type Lead as LeadRow } from "@prisma/client";
import { join } from "path";
import { promises as fsp } from "fs";
import { EmailService } from "../email/email.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { computeLeadScore, rescoreLead, isValidMaPhone } from "./lead-scoring";
import type {
  FunnelStats,
  Lead,
  LeadCaptureInput,
  LeadCaptureResult,
  LeadEvent,
  LeadSource,
  LeadStage,
} from "./lead-funnel.types";

const STORE_DIR = join(process.cwd(), "data");
const STORE_FILE = join(STORE_DIR, "leads.json");

/** Nombre max de leads rechargés depuis la base (les plus récents). */
const DB_SYNC_LIMIT = 2000;

@Injectable()
export class LeadFunnelService {
  private readonly log = new Logger(LeadFunnelService.name);
  private readonly leads = new Map<string, Lead>();
  /** Leads modifiés en mémoire, pas encore écrits (base ou JSON). */
  private readonly dirtyIds = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly useDb: boolean;
  private readonly ready: Promise<void>;

  constructor(
    private readonly email: EmailService,
    @Optional() private readonly probative?: ProbativeLogService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.useDb = !!this.prisma && !!process.env.DATABASE_URL;
    // Hydratation initiale (best-effort, ne bloque pas le boot)
    this.ready = this.hydrate().catch((e) =>
      this.log.warn(`[LeadFunnel] hydrate failed: ${e?.message}`),
    );
  }

  // ── Persistence ───────────────────────────────────────────────────

  private async hydrate(): Promise<void> {
    if (this.useDb) {
      await this.syncFromDb();
      this.log.log(`[LeadFunnel] hydrated ${this.leads.size} leads (db)`);
      return;
    }
    try {
      const raw = await fsp.readFile(STORE_FILE, "utf8");
      const arr = JSON.parse(raw) as Lead[];
      for (const l of arr) this.leads.set(l.id, l);
      this.log.log(`[LeadFunnel] hydrated ${this.leads.size} leads (json)`);
    } catch {
      // fichier absent au premier boot : OK
    }
  }

  /**
   * Recharge le cache depuis la base. À appeler avant toute lecture exposée
   * (/cc/leads, /api/lead-funnel/list…). No-op hors mode base.
   */
  async syncFromDb(): Promise<void> {
    if (!this.useDb || !this.prisma) return;
    const rows = await this.prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: DB_SYNC_LIMIT,
    });
    for (const row of rows) {
      // Une modification locale pas encore écrite prime sur la ligne en base.
      if (this.dirtyIds.has(row.id)) continue;
      this.leads.set(row.id, fromDb(row));
    }
  }

  private async persistToDb(lead: Lead): Promise<void> {
    if (!this.prisma) return;
    const data = toDb(lead);
    await this.prisma.lead.upsert({ where: { id: lead.id }, create: data, update: data });
  }

  private scheduleFlush(id: string): void {
    this.dirtyIds.add(id);
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch((e) =>
        this.log.warn(`[LeadFunnel] flush failed: ${e?.message}`),
      );
    }, this.useDb ? 200 : 2000);
  }

  private async flush(): Promise<void> {
    const batch = Array.from(this.dirtyIds)
      .map((id) => this.leads.get(id))
      .filter((l): l is Lead => !!l);
    this.dirtyIds.clear();

    if (this.useDb) {
      const failed: string[] = [];
      for (const lead of batch) {
        try {
          await this.persistToDb(lead);
        } catch (e: any) {
          failed.push(lead.id);
          this.dirtyIds.add(lead.id); // réessayé au prochain flush
          this.log.warn(`[LeadFunnel] db write failed leadId=${lead.id}: ${e?.message}`);
        }
      }
      if (failed.length) throw new Error(`${failed.length} lead(s) non écrits en base`);
      return;
    }

    await fsp.mkdir(STORE_DIR, { recursive: true });
    const arr = Array.from(this.leads.values());
    await fsp.writeFile(STORE_FILE, JSON.stringify(arr, null, 2), "utf8");
  }

  // ── Capture publique ──────────────────────────────────────────────

  async capture(input: LeadCaptureInput): Promise<LeadCaptureResult> {
    await this.ready;

    const nom = clip(input.nom, 120);
    const telephone = clip(input.telephone, 30);
    if (!nom || nom.length < 2) {
      throw new Error("nom_invalid");
    }
    if (!isValidMaPhone(telephone)) {
      throw new Error("phone_invalid");
    }
    // Rejeu d'une soumission déjà reçue (même clé) : on renvoie le lead
    // existant, sans second enregistrement ni seconde notification.
    const cle = typeof input.meta?.idempotencyKey === "string" ? input.meta.idempotencyKey : "";
    if (cle) {
      const deja = Array.from(this.leads.values()).find(
        (l) => (l.meta as { idempotencyKey?: unknown } | undefined)?.idempotencyKey === cle,
      );
      if (deja) return resultatCapture(deja);
    }

    const email = clip(input.email, 200) || undefined;
    const budget = toNum(input.budget);
    const surface = toNum(input.surface);
    const delaiMois = toNum(input.delaiMois);
    const ville = clip(input.ville, 120) || undefined;

    // Détecte return visitor sur (téléphone OU email) déjà connu
    const returnVisitor = this.detectReturn(telephone, email);

    const { score, breakdown } = computeLeadScore({
      budget,
      email,
      telephone,
      delaiMois,
      ville,
      returnVisitor,
      wizardStep: 0,
    });

    const now = new Date().toISOString();
    const id = `lead_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const lead: Lead = {
      id,
      createdAt: now,
      updatedAt: now,
      nom,
      telephone,
      email,
      projetType: clip(input.projetType, 40) || undefined,
      budget,
      ville,
      surface,
      delaiMois,
      source: (clip(input.source, 40) || "DIRECT") as LeadSource,
      lang: input.lang === "ar" || input.lang === "en" ? input.lang : "fr",
      pageContext: clip(input.pageContext, 300) || undefined,
      utm: input.utm,
      score,
      scoreBreakdown: breakdown,
      stage: "NEW",
      wizardStep: 0,
      returnVisitor,
      nurtureLog: {},
      convertedDossierId: null,
      events: [
        {
          id: `evt_${Date.now().toString(36)}`,
          at: now,
          kind: "CREATED",
          payload: { source: input.source, pageContext: input.pageContext },
        },
        {
          id: `evt_${Date.now().toString(36)}_s`,
          at: now,
          kind: "SCORED",
          payload: { score, breakdown },
        },
      ],
      meta: input.meta,
    };

    this.leads.set(id, lead);
    if (this.useDb) {
      // Écriture awaitée : on ne confirme (201) qu'un lead réellement en base.
      try {
        await this.persistToDb(lead);
      } catch (e: any) {
        this.leads.delete(id);
        this.log.error(`[LeadFunnel] persist failed leadId=${id}: ${e?.message}`);
        throw new Error("storage_unavailable");
      }
    } else {
      this.scheduleFlush(id);
    }

    // Notification équipe (fire & forget)
    this.notifyTeamNewLead(lead).catch((e) =>
      this.log.warn(`[LeadFunnel] notify team failed: ${e?.message}`),
    );

    // Accusé réception lead (fire & forget)
    if (lead.email) {
      this.sendCaptureAck(lead).catch((e) =>
        this.log.warn(`[LeadFunnel] ack email failed: ${e?.message}`),
      );
    }

    return resultatCapture(lead);
  }

  private detectReturn(phone: string, email?: string): boolean {
    for (const l of this.leads.values()) {
      if (l.telephone === phone) return true;
      if (email && l.email && l.email.toLowerCase() === email.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  // ── Lecture ───────────────────────────────────────────────────────

  get(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  list(opts?: {
    stage?: LeadStage;
    minScore?: number;
    limit?: number;
  }): Lead[] {
    const arr = Array.from(this.leads.values());
    const filtered = arr.filter((l) => {
      if (opts?.stage && l.stage !== opts.stage) return false;
      if (typeof opts?.minScore === "number" && l.score < opts.minScore) return false;
      return true;
    });
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return typeof opts?.limit === "number" ? filtered.slice(0, opts.limit) : filtered;
  }

  // ── Mutations ─────────────────────────────────────────────────────

  rescore(id: string): Lead | undefined {
    const l = this.leads.get(id);
    if (!l) return undefined;
    const { score, breakdown } = rescoreLead(l);
    l.score = score;
    l.scoreBreakdown = breakdown;
    l.updatedAt = new Date().toISOString();
    l.events.push({
      id: `evt_${Date.now().toString(36)}`,
      at: l.updatedAt,
      kind: "SCORED",
      payload: { score, breakdown },
    });
    this.scheduleFlush(id);
    return l;
  }

  setStage(id: string, stage: LeadStage): Lead | undefined {
    const l = this.leads.get(id);
    if (!l) return undefined;
    const prev = l.stage;
    l.stage = stage;
    l.updatedAt = new Date().toISOString();
    l.events.push({
      id: `evt_${Date.now().toString(36)}`,
      at: l.updatedAt,
      kind: "STAGE_CHANGE",
      payload: { from: prev, to: stage },
    });
    this.scheduleFlush(id);
    return l;
  }

  attachEvent(id: string, event: Omit<LeadEvent, "id" | "at">): Lead | undefined {
    const l = this.leads.get(id);
    if (!l) return undefined;
    const evt: LeadEvent = {
      id: `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      at: new Date().toISOString(),
      ...event,
    };
    l.events.push(evt);
    l.updatedAt = evt.at;
    this.scheduleFlush(id);
    return l;
  }

  /**
   * Marque un lead comme converti vers un dossier P1–P6.
   * Appelé depuis l'endpoint /p2/intake (cf. INTEGRATION.md hook).
   */
  markConverted(id: string, dossierId: string): Lead | undefined {
    const l = this.leads.get(id);
    if (!l) return undefined;
    l.convertedDossierId = dossierId;
    l.stage = "DOSSIER_OPENED";
    l.updatedAt = new Date().toISOString();
    l.events.push({
      id: `evt_${Date.now().toString(36)}`,
      at: l.updatedAt,
      kind: "DOSSIER_CONVERTED",
      payload: { dossierId },
    });
    this.scheduleFlush(id);
    return l;
  }

  // ── Stats funnel (CC dashboard) ───────────────────────────────────

  funnelStats(): FunnelStats {
    const all = Array.from(this.leads.values());
    const byStage = {} as Record<LeadStage, number>;
    const byPorte: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let scoreSum = 0;
    const now = Date.now();
    let last7 = 0;
    let last30 = 0;
    let paid = 0;

    for (const l of all) {
      byStage[l.stage] = (byStage[l.stage] || 0) + 1;
      const pt = String(l.projetType || "AUTRE");
      byPorte[pt] = (byPorte[pt] || 0) + 1;
      bySource[l.source] = (bySource[l.source] || 0) + 1;
      scoreSum += l.score;
      const age = now - new Date(l.createdAt).getTime();
      if (age <= 7 * 86400_000) last7++;
      if (age <= 30 * 86400_000) last30++;
      if (l.stage === "PAID") paid++;
    }

    const total = all.length;
    return {
      total,
      byStage,
      byPorte,
      bySource,
      conversionRate: total > 0 ? paid / total : 0,
      avgScore: total > 0 ? scoreSum / total : 0,
      last7d: last7,
      last30d: last30,
    };
  }

  // ── Notifications (équipe + lead) ─────────────────────────────────

  /**
   * Notifie l'équipe interne d'un nouveau lead capturé.
   *
   * Stratégie de livraison :
   *   1. Lit destinataires depuis `LEAD_NOTIFY_TO` (csv) → fallback `OWNER_EMAIL`
   *      → fallback `architectattarassi@gmail.com`.
   *   2. Envoie un email à CHAQUE destinataire via `EmailService.send()`
   *      (cascade interne Resend → SMTP → log dev).
   *   3. Journalise chaque tentative dans `ProbativeLog` (delivered/failed)
   *      pour audit traçable des notifications leads.
   *   4. Logue WARN si aucun provider n'est configuré (aide debug Railway).
   */
  private async notifyTeamNewLead(lead: Lead): Promise<void> {
    const rawTo =
      process.env.LEAD_NOTIFY_TO ||
      process.env.OWNER_EMAIL ||
      "architectattarassi@gmail.com";
    const recipients = rawTo
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("@"));

    if (recipients.length === 0) {
      this.log.warn(`[LeadFunnel] notifyTeamNewLead: aucun destinataire valide (LEAD_NOTIFY_TO="${rawTo}")`);
      return;
    }

    if (!this.email.isConfigured()) {
      this.log.warn(
        `[LeadFunnel] notifyTeamNewLead: AUCUN PROVIDER EMAIL CONFIGURÉ ` +
          `(ni RESEND_API_KEY ni SMTP_HOST/USER/PASS). ` +
          `Lead ${lead.id} ne sera pas notifié — vérifier env vars Railway.`,
      );
      await this.appendProbative({
        kind: "LEAD_NOTIFY_TEAM",
        status: "FAILED",
        reason: "no_provider_configured",
        leadId: lead.id,
        recipients,
      });
      return;
    }

    const subject = `[Lead ${lead.score}/100] ${lead.nom} — ${lead.projetType || "porte ?"}`;
    const html = this.buildOwnerNotifHtml(lead);
    const text = this.buildOwnerNotifText(lead);

    for (const to of recipients) {
      try {
        const r = await this.email.send({ to, subject, html, text });
        if (r.ok) {
          this.log.log(`[LeadFunnel] team notif OK to=${to} via=${r.provider} leadId=${lead.id}`);
          await this.appendProbative({
            kind: "LEAD_NOTIFY_TEAM",
            status: "DELIVERED",
            provider: r.provider,
            messageId: r.messageId,
            leadId: lead.id,
            to,
            score: lead.score,
            projetType: lead.projetType,
          });
        } else {
          this.log.error(
            `[LeadFunnel] team notif FAILED to=${to} err=${r.error} leadId=${lead.id}`,
          );
          await this.appendProbative({
            kind: "LEAD_NOTIFY_TEAM",
            status: "FAILED",
            provider: r.provider,
            error: r.error,
            leadId: lead.id,
            to,
          });
        }
      } catch (e: any) {
        this.log.error(
          `[LeadFunnel] team notif EXCEPTION to=${to} err=${e?.message} leadId=${lead.id}`,
        );
        await this.appendProbative({
          kind: "LEAD_NOTIFY_TEAM",
          status: "FAILED",
          error: e?.message || "exception",
          leadId: lead.id,
          to,
        });
      }
    }
  }

  private buildOwnerNotifHtml(lead: Lead): string {
    return `
      <h2 style="font-family:sans-serif;">Nouveau lead capturé</h2>
      <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
        <tr><td><b>Nom</b></td><td>${escapeHtml(lead.nom)}</td></tr>
        <tr><td><b>Téléphone</b></td><td>${escapeHtml(lead.telephone)}</td></tr>
        <tr><td><b>Email</b></td><td>${escapeHtml(lead.email || "—")}</td></tr>
        <tr><td><b>Porte</b></td><td>${escapeHtml(String(lead.projetType || "—"))}</td></tr>
        <tr><td><b>Ville</b></td><td>${escapeHtml(lead.ville || "—")}</td></tr>
        <tr><td><b>Budget</b></td><td>${
          lead.budget ? lead.budget.toLocaleString("fr-MA") + " MAD" : "—"
        }</td></tr>
        <tr><td><b>Délai</b></td><td>${lead.delaiMois ?? "—"} mois</td></tr>
        <tr><td><b>Source</b></td><td>${escapeHtml(lead.source)}</td></tr>
        <tr><td><b>Page</b></td><td>${escapeHtml(lead.pageContext || "—")}</td></tr>
        <tr><td><b>Score</b></td><td><b>${lead.score}/100</b></td></tr>
      </table>
      <p style="font-family:sans-serif;font-size:12px;color:#6b7280;">Lead id: <code>${lead.id}</code></p>
    `;
  }

  private buildOwnerNotifText(lead: Lead): string {
    const lines = [
      `Nouveau lead CITURBAREA — score ${lead.score}/100`,
      `Nom: ${lead.nom}`,
      `Téléphone: ${lead.telephone}`,
      `Email: ${lead.email || "—"}`,
      `Porte: ${lead.projetType || "—"}`,
      `Ville: ${lead.ville || "—"}`,
      `Budget: ${lead.budget ? lead.budget.toLocaleString("fr-MA") + " MAD" : "—"}`,
      `Délai: ${lead.delaiMois ?? "—"} mois`,
      `Source: ${lead.source}`,
      `Page: ${lead.pageContext || "—"}`,
      `Lead id: ${lead.id}`,
    ];
    return lines.join("\n");
  }

  /** Append best-effort dans ProbativeLog (si le service est dispo). */
  private async appendProbative(payload: Record<string, any>): Promise<void> {
    if (!this.probative) return;
    try {
      await this.probative.append({
        scope: "lead-funnel",
        at: new Date().toISOString(),
        ...payload,
      });
    } catch {
      /* best-effort, ne jamais bloquer */
    }
  }

  private async sendCaptureAck(lead: Lead): Promise<void> {
    if (!lead.email) return;
    const lang = lead.lang;
    const subject =
      lang === "ar"
        ? "تم استلام طلبك — CITURBAREA"
        : lang === "en"
          ? "We received your request — CITURBAREA"
          : "Nous avons bien reçu votre demande — CITURBAREA";
    const body =
      lang === "ar"
        ? `<p>مرحبًا ${escapeHtml(lead.nom)},</p><p>تم استلام طلبك بنجاح. سيعود إليك فريق CITURBAREA خلال 24 ساعة بتقدير مفصل.</p>`
        : lang === "en"
          ? `<p>Hello ${escapeHtml(lead.nom)},</p><p>We received your request. Our CITURBAREA team will get back to you within 24h with a detailed estimate.</p>`
          : `<p>Bonjour ${escapeHtml(lead.nom)},</p><p>Nous avons bien reçu votre demande. L'équipe CITURBAREA vous recontacte sous 24h avec une estimation détaillée.</p>`;
    const html = wrapEmail(body, lang);
    await this.email.send({ to: lead.email, subject, html });

    this.attachEvent(lead.id, {
      kind: "EMAIL_SENT",
      channel: "EMAIL",
      payload: { template: "capture_ack" },
    });
  }

  // ── Nurture hook — exposé au cron service ─────────────────────────

  /**
   * Sélectionne les leads éligibles à une relance (utilisé par
   * LeadNurtureService).
   */
  pickNurtureCandidates(opts: { ageDays: number; tolerance?: number }): Lead[] {
    const tol = opts.tolerance ?? 0.5;
    const now = Date.now();
    const minMs = (opts.ageDays - tol) * 86400_000;
    const maxMs = (opts.ageDays + tol) * 86400_000;
    return Array.from(this.leads.values()).filter((l) => {
      if (l.stage === "PAID" || l.stage === "LOST" || l.stage === "ARCHIVED") {
        return false;
      }
      const age = now - new Date(l.createdAt).getTime();
      return age >= minMs && age <= maxMs;
    });
  }

  markNurtureSent(leadId: string, template: string): void {
    const l = this.leads.get(leadId);
    if (!l) return;
    l.nurtureLog = l.nurtureLog || {};
    l.nurtureLog[template] = new Date().toISOString();
    l.events.push({
      id: `evt_${Date.now().toString(36)}`,
      at: l.nurtureLog[template],
      kind: "EMAIL_SENT",
      channel: "EMAIL",
      payload: { template },
    });
    this.scheduleFlush(leadId);
  }
}

function resultatCapture(lead: Lead): LeadCaptureResult {
  return {
    leadId: lead.id,
    scoreInitial: lead.score,
    stage: lead.stage,
    message:
      lead.lang === "ar"
        ? "تم استلام طلبك. سيتواصل معك فريقنا خلال 24 ساعة."
        : lead.lang === "en"
          ? "Request received. Our team will reach out within 24h."
          : "Demande reçue. Notre équipe vous recontacte sous 24h.",
  };
}

// ── Conversions Lead (domaine) ⇄ ligne Prisma ───────────────────────

function toDb(l: Lead): Prisma.LeadUncheckedCreateInput {
  return {
    id: l.id,
    createdAt: new Date(l.createdAt),
    updatedAt: new Date(l.updatedAt),
    nom: l.nom,
    telephone: l.telephone,
    email: l.email ?? null,
    projetType: l.projetType != null ? String(l.projetType) : null,
    budget: toNum(l.budget) ?? null,
    ville: l.ville ?? null,
    surface: toNum(l.surface) ?? null,
    delaiMois: toNum(l.delaiMois) ?? null,
    source: l.source,
    lang: l.lang,
    pageContext: l.pageContext ?? null,
    utm: jsonOrDbNull(l.utm),
    score: Math.round(l.score),
    scoreBreakdown: jsonOrDbNull(l.scoreBreakdown),
    stage: l.stage,
    wizardStep: l.wizardStep ?? null,
    returnVisitor: !!l.returnVisitor,
    nurtureLog: jsonOrDbNull(l.nurtureLog),
    convertedDossierId: l.convertedDossierId ?? null,
    events: jsonPropre(l.events ?? []) as unknown as Prisma.InputJsonValue,
    meta: jsonOrDbNull(l.meta),
  };
}

function fromDb(r: LeadRow): Lead {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    nom: r.nom,
    telephone: r.telephone,
    email: r.email ?? undefined,
    projetType: r.projetType ?? undefined,
    budget: r.budget ?? undefined,
    ville: r.ville ?? undefined,
    surface: r.surface ?? undefined,
    delaiMois: r.delaiMois ?? undefined,
    source: r.source as LeadSource,
    lang: r.lang === "ar" || r.lang === "en" ? r.lang : "fr",
    pageContext: r.pageContext ?? undefined,
    utm: (r.utm as Lead["utm"] | null) ?? undefined,
    score: r.score,
    scoreBreakdown: (r.scoreBreakdown as Record<string, number> | null) ?? undefined,
    stage: r.stage as LeadStage,
    wizardStep: r.wizardStep ?? undefined,
    returnVisitor: r.returnVisitor,
    nurtureLog: (r.nurtureLog as Record<string, string> | null) ?? undefined,
    convertedDossierId: r.convertedDossierId,
    events: Array.isArray(r.events) ? (r.events as unknown as LeadEvent[]) : [],
    meta: (r.meta as Record<string, unknown> | null) ?? undefined,
  };
}

function jsonOrDbNull(
  v: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return v === undefined || v === null ? Prisma.DbNull : (jsonPropre(v) as Prisma.InputJsonValue);
}

// Postgres rejette le caractère nul (text : 22021) et, en jsonb, les demi-paires
// UTF-16 (22P05). Une capture ne doit jamais échouer pour un caractère.
const SURROGATE_ISOLE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function textePropre(s: string): string {
  return s.replace(/\u0000/g, "").replace(SURROGATE_ISOLE, "�");
}

function jsonPropre<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "string" ? textePropre(x) : x)));
}

function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Chaîne nettoyée et tronquée ("" si la valeur n'est pas une chaîne/nombre). */
function clip(v: unknown, max: number): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  return Array.from(textePropre(String(v)).trim()).slice(0, max).join("");
}

// ── Helpers locaux ──────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c] || c),
  );
}

function wrapEmail(bodyHtml: string, lang: "fr" | "ar" | "en"): string {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);color:#fff;padding:24px 32px;">
      <div style="font-size:22px;font-weight:800;">CITURBAREA</div>
      <div style="font-size:11px;color:#bfdbfe;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;">
        ${lang === "ar" ? "منصة معمارية" : lang === "en" ? "Architectural platform" : "Plateforme architecturale"}
      </div>
    </div>
    <div style="padding:28px 32px;line-height:1.6;font-size:15px;">${bodyHtml}</div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;color:#9ca3af;font-size:11px;text-align:center;">
      © CITURBAREA — citurbarea.com
    </div>
  </div>
</body>
</html>`;
}
