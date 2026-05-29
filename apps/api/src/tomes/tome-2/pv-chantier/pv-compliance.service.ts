import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "../../../modules/kernel/services/probative-log.service";
import { NotificationsHubService } from "../../../modules/notifications-hub/notifications-hub.service";
import { PV_PAYLOAD_KEY, PvChantier } from "./pv-chantier.types";

/**
 * PvComplianceService — doctrine T2-R-PV-CADENCE-001.
 *
 * Règle métier (exigée par la direction) :
 *   Tout chantier suivi sur CITURBAREA doit être documenté par au moins
 *   un procès-verbal de visite **tous les 15 jours**. Passé ce délai sans
 *   nouveau PV finalisé, le chantier est **bloqué** sur la plateforme
 *   (commandes matériaux + affectation sous-traitants suspendues) et le
 *   maître d'ouvrage ainsi que les prestataires sont alertés.
 *
 * Cinématique :
 *   - Cron quotidien 07:00 Africa/Casablanca : scanne les chantiers actifs,
 *     calcule l'ancienneté du dernier PV, applique l'état et notifie sur
 *     transition (rappel J-3, blocage J-15).
 *   - `onPvFinalized()` : appelé par PvChantierService.finalize — recalcule,
 *     débloque le chantier et notifie la reprise.
 *   - `assertNotBlocked()` : utilisé par les modules chantier pour refuser
 *     les mutations quand le dossier est bloqué.
 *
 * État persisté dans `Dossier.payload.pvCompliance`.
 */

export const PV_COMPLIANCE_KEY = "pvCompliance" as const;
const INTERVAL_DAYS = 15;
const WARNING_LEAD_DAYS = 3; // rappel à J-12 (3 jours avant le blocage)
const DAY_MS = 86_400_000;
const SCAN_LIMIT = 1000;

export type PvComplianceStatus = "OK" | "WARNING" | "BLOCKED";

export type PvComplianceState = {
  active: boolean;
  status: PvComplianceStatus;
  blocked: boolean;
  intervalDays: number;
  chantierStartAt: string;
  lastPvDate: string | null;
  lastPvId: string | null;
  nextPvDueDate: string;
  daysSinceLastPv: number;
  daysUntilDue: number;
  blockedSince: string | null;
  lastEvaluatedAt: string;
  lastNotifiedStatus: PvComplianceStatus | null;
  lastNotifiedAt: string | null;
};

type DossierBundle = {
  id: string;
  ownerId: string;
  refInterne: string | null;
  title: string | null;
  payload: any;
  rokhas: { statut: string | null; dateArrete: Date | null; dateDepot: Date | null } | null;
};

@Injectable()
export class PvComplianceService {
  private readonly log = new Logger(PvComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
    private readonly hub: NotificationsHubService,
  ) {}

  // ── Cron quotidien ──────────────────────────────────────────────

  @Cron("0 7 * * *", { timeZone: "Africa/Casablanca" })
  async dailyScan(): Promise<{ scanned: number; active: number; blocked: number }> {
    const dossiers = (await this.prisma.dossier.findMany({
      orderBy: { updatedAt: "desc" },
      take: SCAN_LIMIT,
      select: {
        id: true,
        ownerId: true,
        refInterne: true,
        title: true,
        payload: true,
        rokhas: { select: { statut: true, dateArrete: true, dateDepot: true } },
      },
    })) as DossierBundle[];

    let active = 0;
    let blocked = 0;
    for (const d of dossiers) {
      try {
        const state = await this.refreshAndNotify(d);
        if (state.active) active += 1;
        if (state.blocked) blocked += 1;
      } catch (e: any) {
        this.log.warn(`[PvCompliance] dossier=${d.id} eval failed: ${e?.message}`);
      }
    }
    this.log.log(`[PvCompliance] scan: ${dossiers.length} dossiers, ${active} chantiers actifs, ${blocked} bloqués`);
    return { scanned: dossiers.length, active, blocked };
  }

  /** Déclenchement manuel (admin). */
  async runScanNow() {
    return this.dailyScan();
  }

  // ── Lecture (UI / overview) ─────────────────────────────────────

  async getStatus(dossierId: string): Promise<PvComplianceState> {
    const d = await this.loadBundle(dossierId);
    const state = this.compute(d);
    await this.persist(d.id, d.payload, state); // refresh silencieux (pas de notif)
    return state;
  }

  // ── Hook : appelé après finalisation d'un PV ────────────────────

  async onPvFinalized(dossierId: string): Promise<void> {
    try {
      const d = await this.loadBundle(dossierId);
      await this.refreshAndNotify(d);
    } catch (e: any) {
      this.log.warn(`[PvCompliance] onPvFinalized ${dossierId} failed: ${e?.message}`);
    }
  }

  // ── Enforcement : refus de mutation si chantier bloqué ──────────

  /**
   * Lève une ForbiddenException si le dossier est bloqué faute de PV.
   * Lecture du flag persisté (rafraîchi par le cron + onPvFinalized).
   */
  static assertPayloadNotBlocked(payload: any): void {
    const st = payload?.[PV_COMPLIANCE_KEY];
    if (st && st.blocked === true) {
      throw new ForbiddenException(
        "Chantier bloqué : aucun PV de visite depuis plus de 15 jours. " +
          "Déposez un nouveau PV de chantier pour reprendre les opérations.",
      );
    }
  }

  async assertNotBlocked(dossierId: string): Promise<void> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { payload: true },
    });
    PvComplianceService.assertPayloadNotBlocked(d?.payload);
  }

  // ── Cœur : compute / persist / notify ───────────────────────────

  private async refreshAndNotify(d: DossierBundle): Promise<PvComplianceState> {
    const prev: PvComplianceState | null =
      (d.payload?.[PV_COMPLIANCE_KEY] as PvComplianceState) ?? null;
    const state = this.compute(d);
    await this.persist(d.id, d.payload, state);

    if (!state.active) return state;

    // Notifier uniquement sur transition d'état (anti-spam).
    const prevStatus = prev?.status ?? "OK";
    if (state.status === prevStatus) return state;

    if (state.status === "WARNING") {
      await this.notify(d, "PV_CADENCE_RAPPEL", state);
    } else if (state.status === "BLOCKED") {
      await this.notify(d, "CHANTIER_BLOQUE_PV", state);
      await this.appendLog(d, "CHANTIER_BLOQUE_PV", state);
    } else if (state.status === "OK" && prevStatus === "BLOCKED") {
      await this.notify(d, "CHANTIER_DEBLOQUE_PV", state);
      await this.appendLog(d, "CHANTIER_DEBLOQUE_PV", state);
    }

    // Mémorise la dernière notif envoyée.
    state.lastNotifiedStatus = state.status;
    state.lastNotifiedAt = new Date().toISOString();
    await this.persist(d.id, d.payload, state);
    return state;
  }

  private compute(d: DossierBundle): PvComplianceState {
    const payload = d.payload && typeof d.payload === "object" ? d.payload : {};
    const prev: PvComplianceState | null = payload[PV_COMPLIANCE_KEY] ?? null;
    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const active = this.isActiveChantier(d, payload);

    // Ancre du compteur : début de chantier (stable d'une exécution à l'autre).
    const rokhasArrete = d.rokhas?.dateArrete
      ? new Date(d.rokhas.dateArrete).toISOString()
      : null;
    const chantierStartAt =
      payload.chantierDemarrageAt ||
      payload.chantierStartAt ||
      rokhasArrete ||
      prev?.chantierStartAt ||
      nowIso;

    // Dernier PV finalisé (un brouillon ne compte pas comme documentation).
    const pvBag: PvChantier[] = Array.isArray(payload[PV_PAYLOAD_KEY])
      ? (payload[PV_PAYLOAD_KEY] as PvChantier[])
      : [];
    const finalized = pvBag
      .filter((p) => p.status === "FINAL")
      .map((p) => ({ id: p.id, when: p.finalizedAt || p.date || p.createdAt || "" }))
      .filter((p) => !!p.when)
      .sort((a, b) => b.when.localeCompare(a.when));
    const lastPv = finalized[0] ?? null;
    const lastPvDate = lastPv?.when ?? null;
    const lastPvId = lastPv?.id ?? null;

    const referenceMs = new Date(lastPvDate || chantierStartAt).getTime();
    const daysSinceLastPv = Math.max(0, Math.floor((now - referenceMs) / DAY_MS));
    const dueMs = referenceMs + INTERVAL_DAYS * DAY_MS;
    const nextPvDueDate = new Date(dueMs).toISOString();
    const daysUntilDue = Math.ceil((dueMs - now) / DAY_MS);

    let status: PvComplianceStatus = "OK";
    if (active) {
      if (daysSinceLastPv >= INTERVAL_DAYS) status = "BLOCKED";
      else if (daysUntilDue <= WARNING_LEAD_DAYS) status = "WARNING";
    }
    const blocked = active && status === "BLOCKED";

    return {
      active,
      status,
      blocked,
      intervalDays: INTERVAL_DAYS,
      chantierStartAt,
      lastPvDate,
      lastPvId,
      nextPvDueDate,
      daysSinceLastPv,
      daysUntilDue,
      blockedSince: blocked ? prev?.blockedSince || nowIso : null,
      lastEvaluatedAt: nowIso,
      lastNotifiedStatus: prev?.lastNotifiedStatus ?? null,
      lastNotifiedAt: prev?.lastNotifiedAt ?? null,
    };
  }

  /**
   * Un dossier est un "chantier actif" pour la cadence PV s'il a démarré
   * (permis obtenu / démarrage déclaré / au moins un PV ou sous-traitant)
   * et n'est pas encore réceptionné.
   */
  private isActiveChantier(d: DossierBundle, payload: any): boolean {
    const rokhasStatut = d.rokhas?.statut ?? null;
    const permitDone =
      rokhasStatut === "FAVORABLE" ||
      rokhasStatut === "PERMIS_DELIVRE" ||
      Boolean(d.rokhas?.dateArrete);

    const hasStartSignal =
      Boolean(payload.chantierDemarrageAt) ||
      Boolean(payload.chantierStartAt) ||
      permitDone ||
      (Array.isArray(payload[PV_PAYLOAD_KEY]) && payload[PV_PAYLOAD_KEY].length > 0) ||
      (Array.isArray(payload.sousTraitants) && payload.sousTraitants.length > 0);

    const receptionDone =
      Boolean(payload.receptionProvisoireAt) ||
      Boolean(payload.receptionDefinitiveAt) ||
      Boolean(payload.permisHabiter?.deliveredAt);

    return hasStartSignal && !receptionDone;
  }

  private async persist(dossierId: string, currentPayload: any, state: PvComplianceState): Promise<void> {
    const payload =
      currentPayload && typeof currentPayload === "object" ? { ...currentPayload } : {};
    payload[PV_COMPLIANCE_KEY] = state;
    // garde le payload en mémoire à jour pour les appels chaînés
    (currentPayload as any)[PV_COMPLIANCE_KEY] = state;
    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { payload: payload as any },
    });
  }

  // ── Notifications owner + prestataires ──────────────────────────

  private async notify(
    d: DossierBundle,
    eventType: "PV_CADENCE_RAPPEL" | "CHANTIER_BLOQUE_PV" | "CHANTIER_DEBLOQUE_PV",
    state: PvComplianceState,
  ): Promise<void> {
    const ref = d.refInterne || d.title || d.id.slice(0, 8);
    const payloadCtx = {
      dossierId: d.id,
      ref,
      daysLeft: Math.max(0, state.daysUntilDue),
      dueDate: this.fmt(state.nextPvDueDate),
      lastPvDate: state.lastPvDate ? this.fmt(state.lastPvDate) : "—",
    };
    const urgency = eventType === "CHANTIER_BLOQUE_PV" ? "URGENT" : "HIGH";

    const recipients = new Set<string>();
    if (d.ownerId) recipients.add(d.ownerId);
    for (const uid of this.prestataireUserIds(d.payload)) recipients.add(uid);

    for (const userId of recipients) {
      try {
        await this.hub.dispatch({ eventType, userId, payload: payloadCtx, urgency: urgency as any });
      } catch (e: any) {
        this.log.warn(`[PvCompliance] notify ${eventType}→${userId} failed: ${e?.message}`);
      }
    }
  }

  private prestataireUserIds(payload: any): string[] {
    const out = new Set<string>();
    const sts: any[] = Array.isArray(payload?.sousTraitants) ? payload.sousTraitants : [];
    for (const st of sts) {
      if (st?.status !== "TERMINATED" && typeof st?.supplierUserId === "string" && st.supplierUserId) {
        out.add(st.supplierUserId);
      }
    }
    return Array.from(out);
  }

  private async appendLog(
    d: DossierBundle,
    kind: "CHANTIER_BLOQUE_PV" | "CHANTIER_DEBLOQUE_PV",
    state: PvComplianceState,
  ): Promise<void> {
    try {
      await this.probative.append({
        kind,
        tome: "tome2",
        rule_id: "T2-R-PV-CADENCE-001",
        dossierId: d.id,
        lastPvDate: state.lastPvDate,
        daysSinceLastPv: state.daysSinceLastPv,
        at: new Date().toISOString(),
      });
    } catch (e: any) {
      this.log.warn(`[PvCompliance] probative append failed: ${e?.message}`);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private async loadBundle(dossierId: string): Promise<DossierBundle> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        id: true,
        ownerId: true,
        refInterne: true,
        title: true,
        payload: true,
        rokhas: { select: { statut: true, dateArrete: true, dateDepot: true } },
      },
    });
    if (!d) throw new ForbiddenException("Dossier introuvable");
    return d as DossierBundle;
  }

  private fmt(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }
}
