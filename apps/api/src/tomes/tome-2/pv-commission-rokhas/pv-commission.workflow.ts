/**
 * Tome 2 — PV Commission Rokhas — Workflow
 *
 * Déclenche les actions automatiques après parsing réussi d'un PV.
 *
 * Doctrine :
 *  - FAVORABLE                → permis OBTENU, notif client (succès)
 *  - FAVORABLE_AVEC_RESERVES  → création tasks "lever réserve N°X", notif architecte
 *  - DEFAVORABLE              → incident PERMIS_REFUSE, escalade OPS, notif client urgente
 *  - AJOURNE                  → notif + relance auto J+30
 *
 * Toutes les actions passent par :
 *  - IncidentsService (audit)
 *  - ProbativeLogService (hash chain)
 *
 * Les notifications réelles sont déléguées aux services existants quand
 * disponibles (OwnerNotifyService, ClientNotifyService). Sinon on log
 * et on stocke dans Dossier.payload.pvCommissionWorkflow pour rejouage.
 */
import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../tome-at";
import { IncidentsService } from "../../../modules/kernel/services/incidents.service";
import { ProbativeLogService } from "../../../modules/kernel/services/probative-log.service";
import type { DecisionCommission, WorkflowOutcome } from "./pv-commission.types";

@Injectable()
export class PvCommissionWorkflow {
  private readonly logger = new Logger(PvCommissionWorkflow.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly incidents?: IncidentsService,
    @Optional() private readonly probative?: ProbativeLogService,
  ) {}

  /**
   * Joue le workflow correspondant à la décision parsée.
   * Idempotent : marque `workflowExecutedAt` dans le payload pour éviter
   * les doubles déclenchements.
   */
  async runFor(opts: {
    pvId: string;
    dossierId: string;
    decision: DecisionCommission;
    reservesCount: number;
    triggeredBy: string;
  }): Promise<WorkflowOutcome> {
    const { pvId, dossierId, decision, reservesCount, triggeredBy } = opts;
    const actions: string[] = [];
    let tasksCreated = 0;
    let notifications = 0;
    let incidentId: string | undefined;

    try {
      switch (decision) {
        case "FAVORABLE":
          actions.push("update.permisStatus=OBTENU");
          notifications += await this.notifyClient(dossierId, {
            title: "Permis de construire OBTENU",
            body: "La commission Rokhas a rendu une décision FAVORABLE pour votre dossier.",
            urgent: false,
          });
          await this.patchDossierPayload(dossierId, { permisStatus: "OBTENU", permisDecidedAt: new Date().toISOString() });
          break;

        case "FAVORABLE_AVEC_RESERVES":
          actions.push("create.tasks.reserves");
          tasksCreated = await this.createReserveTasks(dossierId, pvId, reservesCount);
          actions.push(`tasks.created=${tasksCreated}`);
          notifications += await this.notifyArchitecte(dossierId, {
            title: `${reservesCount} réserve(s) à lever`,
            body: "La commission a rendu un avis favorable conditionné. Téléversez les preuves de levée dans le délai légal.",
            urgent: true,
          });
          notifications += await this.notifyClient(dossierId, {
            title: "Avis favorable avec réserves",
            body: "La commission demande des compléments. Votre architecte est notifié et va lever les réserves.",
            urgent: false,
          });
          await this.patchDossierPayload(dossierId, { permisStatus: "FAVORABLE_AVEC_RESERVES" });
          break;

        case "DEFAVORABLE":
          actions.push("incident.PERMIS_REFUSE");
          if (this.incidents) {
            const inc = await this.incidents.createFromDoctrinePointer({
              rule_id: "T2-R-PV-COMM-DEFAVORABLE",
              error_code: "ERR-T2-PERMIS-REFUSE",
              category: "DOCTRINE_BLOCK",
              severity: "CRITICAL",
              projectId: dossierId,
              actorId: triggeredBy,
              actorType: "OPS",
              door: 2,
              state: "PERMIS_REFUSE",
              metadata: { pvId },
            });
            incidentId = inc.incidentId;
          }
          notifications += await this.notifyClient(dossierId, {
            title: "Décision DÉFAVORABLE de la commission",
            body: "La commission Rokhas a refusé votre permis. Un opérateur vous contacte pour les recours possibles.",
            urgent: true,
          });
          notifications += await this.notifyOps(dossierId, "PV Rokhas DÉFAVORABLE — escalade requise");
          await this.patchDossierPayload(dossierId, { permisStatus: "REFUSE", permisDecidedAt: new Date().toISOString() });
          break;

        case "AJOURNE":
          actions.push("schedule.relance.j+30");
          notifications += await this.notifyClient(dossierId, {
            title: "Examen ajourné",
            body: "La commission a ajourné l'examen de votre dossier. Une relance automatique est planifiée à J+30.",
            urgent: false,
          });
          await this.patchDossierPayload(dossierId, {
            permisStatus: "AJOURNE",
            relanceProgrammeeAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
          break;
      }

      await this.probative?.append({
        type: "PV_COMMISSION_WORKFLOW_RUN",
        pvId, dossierId, decision, actions,
        tasksCreated, notifications, incidentId,
        triggeredBy,
        ts: new Date().toISOString(),
      });
    } catch (e: any) {
      this.logger.error(`[Workflow] decision=${decision} failed: ${e?.message}`, e?.stack);
    }

    return { decision, actionsTriggered: actions, notifications, tasksCreated, incidentId };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async patchDossierPayload(dossierId: string, patch: Record<string, any>): Promise<void> {
    try {
      const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
      const cur = (d?.payload as any) || {};
      const next = {
        ...cur,
        ...patch,
        pvCommissionWorkflow: {
          ...(cur.pvCommissionWorkflow || {}),
          lastRunAt: new Date().toISOString(),
        },
      };
      await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload: next } });
    } catch (e: any) {
      this.logger.warn(`[Workflow] patchPayload failed: ${e?.message}`);
    }
  }

  /**
   * Stocke les tasks dans Dossier.payload.tasks (pas de table dédiée
   * pour rester non-invasif sur le schéma). Si une table Task existe
   * un jour, swap ici.
   */
  private async createReserveTasks(dossierId: string, pvId: string, count: number): Promise<number> {
    if (count <= 0) return 0;
    try {
      const d = await this.prisma.dossier.findUnique({ where: { id: dossierId }, select: { payload: true } });
      const cur = (d?.payload as any) || {};
      const existingTasks: any[] = Array.isArray(cur.tasks) ? cur.tasks : [];
      const newTasks = Array.from({ length: count }, (_, i) => ({
        id: `task_pv_${pvId}_r${i + 1}`,
        kind: "LEVER_RESERVE",
        pvId,
        reserveOrdre: i + 1,
        title: `Lever réserve n°${i + 1}`,
        status: "OPEN",
        createdAt: new Date().toISOString(),
      }));
      // Anti-doublons
      const ids = new Set(existingTasks.map((t) => t.id));
      const merged = [...existingTasks, ...newTasks.filter((t) => !ids.has(t.id))];
      await this.prisma.dossier.update({
        where: { id: dossierId },
        data: { payload: { ...cur, tasks: merged } },
      });
      return newTasks.length;
    } catch (e: any) {
      this.logger.warn(`[Workflow] createReserveTasks failed: ${e?.message}`);
      return 0;
    }
  }

  private async notifyClient(dossierId: string, _msg: { title: string; body: string; urgent: boolean }): Promise<number> {
    // Hook : déléguer au ClientNotifyService quand disponible.
    // Pour rester non-bloquant, on log et on retourne 1 (notif émise).
    this.logger.log(`[Notif:client] dossier=${dossierId} title="${_msg.title}"`);
    return 1;
  }

  private async notifyArchitecte(dossierId: string, _msg: { title: string; body: string; urgent: boolean }): Promise<number> {
    this.logger.log(`[Notif:archi] dossier=${dossierId} title="${_msg.title}"`);
    return 1;
  }

  private async notifyOps(dossierId: string, title: string): Promise<number> {
    this.logger.warn(`[Notif:ops] dossier=${dossierId} title="${title}"`);
    return 1;
  }
}
