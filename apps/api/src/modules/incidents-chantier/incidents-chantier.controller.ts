/**
 * incidents-chantier.controller.ts — Endpoints REST du module Incidents
 * Chantier + bouton SOS (Tome 3).
 *
 * À ajouter à l'allow-list MutationGate : `/api/incidents-chantier`
 * (cf. INTEGRATION.md).
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-at/security/jwt-auth.guard";

import { IncidentsChantierService } from "./incidents-chantier.service";
import { SosService, type SosDossierContacts } from "./sos.service";
import { WeatherReplanService } from "./weather-replan.service";
import type {
  IncidentActionType,
  IncidentDeclaration,
  IncidentGeoloc,
  WeatherSensitiveTask,
} from "./types";

@Tome("tome3")
@Controller("api/incidents-chantier")
export class IncidentsChantierController {
  constructor(
    private readonly svc: IncidentsChantierService,
    private readonly sos: SosService,
    private readonly weather: WeatherReplanService,
  ) {}

  // ── Métadonnées (types + contacts) ────────────────────────────

  @Get("meta/types")
  async getTypes() {
    const types = await this.svc.getTypes();
    return { ok: true, types };
  }

  @Get("meta/emergency-contacts")
  async getContacts() {
    const contacts = await this.svc.getEmergencyContacts();
    return { ok: true, contacts };
  }

  // ── CRUD incidents ────────────────────────────────────────────

  @Get("dossier/:dossierId")
  @UseGuards(JwtAuthGuard)
  async listByDossier(@Param("dossierId") dossierId: string) {
    const incidents = this.svc.listByDossier(dossierId);
    return { ok: true, incidents, total: incidents.length };
  }

  @Get(":incidentId")
  @UseGuards(JwtAuthGuard)
  async getOne(@Param("incidentId") incidentId: string) {
    const incident = this.svc.get(incidentId);
    if (!incident) throw new NotFoundException("incident_not_found");
    return { ok: true, incident };
  }

  @Post("dossier/:dossierId/declarer")
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async declare(
    @Param("dossierId") dossierId: string,
    @Body() body: IncidentDeclaration,
    @Req() req: any,
  ) {
    if (!body?.type) throw new BadRequestException("type_required");
    if (!body?.description || body.description.trim().length < 3) {
      throw new BadRequestException("description_required");
    }
    const actor = {
      userId: req?.user?.userId || req?.user?.sub,
      role: req?.user?.role,
    };
    const incident = await this.svc.declare(dossierId, body, actor);

    // Auto-register dossier dans weather watch si geoloc présente
    if (incident.geoloc) {
      this.weather.registerDossier({
        dossierId,
        geoloc: incident.geoloc,
      });
    }
    return { ok: true, incident };
  }

  @Post(":incidentId/action")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async addAction(
    @Param("incidentId") incidentId: string,
    @Body() body: { type: IncidentActionType; payload?: Record<string, any> },
    @Req() req: any,
  ) {
    if (!body?.type) throw new BadRequestException("action_type_required");
    const actor = {
      userId: req?.user?.userId || req?.user?.sub,
      role: req?.user?.role,
    };
    const updated = await this.svc.addAction(incidentId, body, actor);
    if (!updated) throw new NotFoundException("incident_not_found");
    return { ok: true, incident: updated };
  }

  @Post(":incidentId/resolve")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async resolve(
    @Param("incidentId") incidentId: string,
    @Body()
    body: {
      dateResolution?: string;
      montantIndemniseMad?: number;
      leconApprise?: string;
    },
    @Req() req: any,
  ) {
    const actor = {
      userId: req?.user?.userId || req?.user?.sub,
      role: req?.user?.role,
    };
    const updated = await this.svc.resolve(incidentId, body || {}, actor);
    if (!updated) throw new NotFoundException("incident_not_found");
    return { ok: true, incident: updated };
  }

  // ── SOS ───────────────────────────────────────────────────────

  @Post(":incidentId/sos")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async triggerSos(
    @Param("incidentId") incidentId: string,
    @Body() body: { contacts?: SosDossierContacts },
    @Req() req: any,
  ) {
    const actor = {
      userId: req?.user?.userId || req?.user?.sub,
      role: req?.user?.role,
    };
    const result = await this.sos.trigger(incidentId, body?.contacts || {}, actor);
    if (!result.incident) {
      throw new NotFoundException("incident_not_found");
    }
    return {
      ok: result.ok,
      incident: result.incident,
      notifiedCount: result.notifiedParties.length,
      emergencyCodesUsed: result.emergencyCodesUsed,
      errors: result.errors,
    };
  }

  // ── Weather replan ────────────────────────────────────────────

  @Get("dossier/:dossierId/weather-alerts")
  @UseGuards(JwtAuthGuard)
  async weatherAlerts(
    @Param("dossierId") dossierId: string,
    @Req() req: any,
  ) {
    // Optionnel : lat/lng en query si pas encore registered
    const lat = Number(req?.query?.lat);
    const lng = Number(req?.query?.lng);
    const geoloc: IncidentGeoloc | null =
      isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
    const tasks = Array.isArray(req?.query?.tasks)
      ? (req.query.tasks as string[]).map((c) => ({
          code: c,
          sensitiveCategory: c as WeatherSensitiveTask,
        }))
      : undefined;
    const suggestion = await this.weather.getSuggestion(
      dossierId,
      geoloc,
      tasks,
    );
    return { ok: true, suggestion };
  }

  @Post("dossier/:dossierId/weather-replan/accept")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async acceptReplan(@Param("dossierId") dossierId: string) {
    const r = this.weather.acceptReplan(dossierId);
    return { ok: r.ok, replanCount: r.replanCount, alerts: r.alerts };
  }
}
