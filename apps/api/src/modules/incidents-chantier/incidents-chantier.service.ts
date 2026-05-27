/**
 * incidents-chantier.service.ts — Service principal Incidents Chantier.
 *
 * Tome 3 (state machine & verrous chantier). Persistance V1 :
 *  - Map en mémoire `incidents`
 *  - Dump JSON dans `<cwd>/data/incidents-chantier-store.json`
 *  - Hydrate au boot
 *
 * Migration future : table Prisma `IncidentChantier` quand le schéma sera
 * appliqué (le service abstrait suffisamment l'accès pour qu'on remplace
 * uniquement les méthodes `loadAll`/`saveAll`).
 */

import { Injectable, Logger } from "@nestjs/common";
import { promises as fsp } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

import { ProbativeLogService } from "../kernel/services/probative-log.service";
import { IncidentsService } from "../kernel/services/incidents.service";
import type {
  EmergencyContact,
  IncidentAction,
  IncidentActionType,
  IncidentChantier,
  IncidentDeclaration,
  IncidentSeverite,
  IncidentStatus,
  IncidentTypeDef,
  NotifiedParty,
} from "./types";

const STORE_DIR = join(process.cwd(), "data", "incidents-chantier");
const STORE_FILE = join(STORE_DIR, "incidents-chantier-store.json");
const TYPES_FILE = join(STORE_DIR, "types-incidents.json");
const CONTACTS_FILE = join(STORE_DIR, "emergency-contacts.json");

@Injectable()
export class IncidentsChantierService {
  private readonly log = new Logger("IncidentsChantierService");
  private readonly incidents = new Map<string, IncidentChantier>();
  private typesCache: IncidentTypeDef[] | null = null;
  private contactsCache: EmergencyContact[] | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private dirty = false;

  constructor(
    private readonly probative: ProbativeLogService,
    private readonly incidentsKernel: IncidentsService,
  ) {
    this.hydrate().catch((e) =>
      this.log.warn(`[IncidentsChantier] hydrate failed: ${e?.message}`),
    );
  }

  // ── Hydratation / persistance ───────────────────────────────────

  private async hydrate(): Promise<void> {
    try {
      await fsp.mkdir(STORE_DIR, { recursive: true });
      const raw = await fsp.readFile(STORE_FILE, "utf8");
      const arr = JSON.parse(raw) as IncidentChantier[];
      for (const i of arr) this.incidents.set(i.id, i);
      this.log.log(`[IncidentsChantier] hydrated ${this.incidents.size} incidents`);
    } catch {
      /* no-op : fichier absent au premier boot */
    }
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (!this.dirty) return;
      this.dirty = false;
      this.flush().catch((e) =>
        this.log.warn(`[IncidentsChantier] flush failed: ${e?.message}`),
      );
    }, 1500);
  }

  private async flush(): Promise<void> {
    try {
      await fsp.mkdir(STORE_DIR, { recursive: true });
      const arr = Array.from(this.incidents.values());
      await fsp.writeFile(STORE_FILE, JSON.stringify(arr, null, 2), "utf8");
    } catch (e: any) {
      this.log.error(`[IncidentsChantier] flush write failed: ${e?.message}`);
    }
  }

  // ── Types / contacts seed ───────────────────────────────────────

  async getTypes(): Promise<IncidentTypeDef[]> {
    if (this.typesCache) return this.typesCache;
    try {
      const raw = await fsp.readFile(TYPES_FILE, "utf8");
      const data = JSON.parse(raw);
      this.typesCache = data.types as IncidentTypeDef[];
      return this.typesCache;
    } catch {
      this.typesCache = [];
      return this.typesCache;
    }
  }

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    if (this.contactsCache) return this.contactsCache;
    try {
      const raw = await fsp.readFile(CONTACTS_FILE, "utf8");
      const data = JSON.parse(raw);
      this.contactsCache = data.contacts as EmergencyContact[];
      return this.contactsCache;
    } catch {
      this.contactsCache = [];
      return this.contactsCache;
    }
  }

  async findContactsForType(typeCode: string): Promise<EmergencyContact[]> {
    const all = await this.getEmergencyContacts();
    return all.filter(
      (c) => c.trigger.includes("*") || c.trigger.includes(typeCode),
    );
  }

  async findTypeDef(code: string): Promise<IncidentTypeDef | null> {
    const all = await this.getTypes();
    return all.find((t) => t.code === code) || null;
  }

  // ── CRUD incidents ─────────────────────────────────────────────

  listByDossier(dossierId: string): IncidentChantier[] {
    return Array.from(this.incidents.values())
      .filter((i) => i.dossierId === dossierId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(incidentId: string): IncidentChantier | null {
    return this.incidents.get(incidentId) || null;
  }

  async declare(
    dossierId: string,
    input: IncidentDeclaration,
    actor: { userId?: string; role?: string } = {},
  ): Promise<IncidentChantier> {
    const typeDef = await this.findTypeDef(input.type);
    const severite: IncidentSeverite =
      input.severite || typeDef?.severityDefault || "INFO";
    const id = `inc_${randomUUID()}`;
    const now = new Date().toISOString();
    const numero = this.nextNumero(now);

    const declaredAction: IncidentAction = {
      id: randomUUID(),
      ts: now,
      type: "DECLARED",
      actorId: actor.userId || null,
      actorRole: actor.role || null,
      payload: { type: input.type, severite },
    };

    const incident: IncidentChantier = {
      id,
      dossierId,
      numero,
      type: input.type,
      description: String(input.description || "").slice(0, 4000),
      severite,
      status: severite === "CRITICAL" ? "IN_PROGRESS" : "OPEN",
      photos: Array.isArray(input.photos) ? input.photos : [],
      geoloc: input.geoloc || null,
      dateConstatation: input.dateConstatation || now,
      blessesNb: input.blessesNb ?? null,
      montantDommageEstimeMad: input.montantDommageEstimeMad ?? null,
      dateResolution: null,
      montantIndemniseMad: null,
      leconApprise: null,
      actions: [declaredAction],
      sosTriggered: false,
      sosTriggeredAt: null,
      notifiedParties: [],
      partiesEmergency: [],
      reporterId: actor.userId || null,
      reporterRole: actor.role || null,
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(id, incident);
    this.scheduleFlush();

    // ProbativeLog systématique pour les incidents WARN+
    if (severite !== "INFO") {
      await this.probative.append({
        type: "INCIDENT_CHANTIER_DECLARED",
        incidentId: id,
        dossierId,
        incidentType: input.type,
        severite,
        ts: now,
        actorId: actor.userId,
        actorRole: actor.role,
      });
    }

    // Si CRITICAL ou type auto-suspend → suspendre chantier dans payload
    if (severite === "CRITICAL" && typeDef?.autoSuspendChantier) {
      this.addActionInternal(incident, {
        type: "CHANTIER_SUSPENDED",
        actorRole: "SYSTEM",
        payload: { reason: `auto_suspend_${input.type}` },
      });
    }

    this.log.warn(
      `[IncidentsChantier] declared ${numero} type=${input.type} sev=${severite} dossier=${dossierId}`,
    );
    return incident;
  }

  async addAction(
    incidentId: string,
    action: { type: IncidentActionType; payload?: Record<string, any> },
    actor: { userId?: string; role?: string } = {},
  ): Promise<IncidentChantier | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    this.addActionInternal(incident, {
      type: action.type,
      payload: action.payload,
      actorId: actor.userId,
      actorRole: actor.role,
    });

    this.scheduleFlush();
    return incident;
  }

  async resolve(
    incidentId: string,
    input: {
      dateResolution?: string;
      montantIndemniseMad?: number;
      leconApprise?: string;
    },
    actor: { userId?: string; role?: string } = {},
  ): Promise<IncidentChantier | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const now = new Date().toISOString();
    incident.status = "RESOLVED";
    incident.dateResolution = input.dateResolution || now;
    if (typeof input.montantIndemniseMad === "number") {
      incident.montantIndemniseMad = input.montantIndemniseMad;
    }
    if (input.leconApprise) {
      incident.leconApprise = String(input.leconApprise).slice(0, 4000);
    }
    incident.updatedAt = now;

    this.addActionInternal(incident, {
      type: "RESOLVED",
      actorId: actor.userId,
      actorRole: actor.role,
      payload: {
        montantIndemniseMad: incident.montantIndemniseMad,
        leconApprise: incident.leconApprise,
      },
    });

    await this.probative.append({
      type: "INCIDENT_CHANTIER_RESOLVED",
      incidentId,
      dossierId: incident.dossierId,
      montantIndemniseMad: incident.montantIndemniseMad,
      ts: now,
      actorId: actor.userId,
      actorRole: actor.role,
    });

    this.scheduleFlush();
    return incident;
  }

  /**
   * Marque l'incident comme SOS_TRIGGERED. Appelé par SosService.
   * Garde toute la cinématique de notification dans `sos.service.ts`.
   */
  async markSosTriggered(
    incidentId: string,
    notifiedParties: NotifiedParty[],
    partiesEmergency: string[],
  ): Promise<IncidentChantier | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const now = new Date().toISOString();
    incident.sosTriggered = true;
    incident.sosTriggeredAt = now;
    incident.status = "SOS_TRIGGERED";
    incident.notifiedParties = [
      ...(incident.notifiedParties || []),
      ...notifiedParties,
    ];
    incident.partiesEmergency = [
      ...new Set([...(incident.partiesEmergency || []), ...partiesEmergency]),
    ];
    incident.updatedAt = now;

    this.addActionInternal(incident, {
      type: "SOS_TRIGGERED",
      actorRole: "SYSTEM",
      payload: {
        notifiedCount: notifiedParties.length,
        emergencyCodes: partiesEmergency,
      },
    });

    // Lien vers IncidentsKernel pour table Incident (audit)
    await this.incidentsKernel.createFromDoctrinePointer({
      rule_id: "T3-R-INC-SOS-001",
      error_code: "SOS_TRIGGERED",
      category: "BYPASS_RISK",
      severity: "CRITICAL",
      projectId: incident.dossierId,
      actorId: incident.reporterId || undefined,
      actorType: "OPERATOR",
      metadata: {
        incidentChantierId: incidentId,
        type: incident.type,
        numero: incident.numero,
      },
    });

    await this.probative.append({
      type: "SOS_TRIGGERED",
      incidentId,
      dossierId: incident.dossierId,
      incidentType: incident.type,
      severite: incident.severite,
      notifiedCount: notifiedParties.length,
      emergencyCodes: partiesEmergency,
      ts: now,
      geoloc: incident.geoloc,
    });

    this.scheduleFlush();
    this.log.error(
      `[IncidentsChantier] SOS TRIGGERED incident=${incident.numero} dossier=${incident.dossierId} parties=${notifiedParties.length}`,
    );
    return incident;
  }

  // ── Internal helpers ───────────────────────────────────────────

  private addActionInternal(
    incident: IncidentChantier,
    a: {
      type: IncidentActionType;
      payload?: Record<string, any>;
      actorId?: string | null;
      actorRole?: string | null;
    },
  ): void {
    const now = new Date().toISOString();
    const action: IncidentAction = {
      id: randomUUID(),
      ts: now,
      type: a.type,
      actorId: a.actorId || null,
      actorRole: a.actorRole || null,
      payload: a.payload || {},
    };
    incident.actions.push(action);
    incident.updatedAt = now;
  }

  private nextNumero(nowIso: string): string {
    const d = new Date(nowIso);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const prefix = `INC-${yyyy}${mm}${dd}`;
    const countToday = Array.from(this.incidents.values()).filter((i) =>
      i.numero.startsWith(prefix),
    ).length;
    return `${prefix}-${String(countToday + 1).padStart(3, "0")}`;
  }
}
