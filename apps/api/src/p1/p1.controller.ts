/**
 * CITURBAREA V150 — P1 Events Controller
 * 
 * Doctrine: Backend as source of truth
 * - Apply events via state machine
 * - Append-only event log
 * - Hash chain for probative logs
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { P1Service } from './p1.service';
import { JwtAuthGuard } from '../tomes/tome-at';
import { P1Event } from './p1.types';
import { Tome } from '../tomes/tome-at';

@Tome('tome_at')
@Controller('p1/dossiers')
@UseGuards(JwtAuthGuard)
export class P1Controller {
  constructor(private readonly p1Service: P1Service) {}

  /**
   * Apply event to dossier (state machine transition)
   * 
   * POST /p1/dossiers/:id/events
   * Body: { type: "EVT_START", payload?: {...} }
   */
  @Post(':id/events')
  async applyEvent(
    @Param('id') dossierId: string,
    @Body() event: P1Event,
    @Request() req: any,
  ) {
    try {
      const result = await this.p1Service.applyEvent(
        dossierId,
        event,
        req.user.id,
        req.ip,
        req.headers['user-agent'],
      );

      return {
        success: true,
        dossier: result.dossier,
        event: result.event,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: (error as any).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get dossier with current state
   * 
   * GET /p1/dossiers/:id
   */
  @Get(':id')
  async getDossier(@Param('id') dossierId: string, @Request() req: any) {
    const dossier = await this.p1Service.getDossier(dossierId, req.user.id);

    if (!dossier) {
      throw new HttpException('Dossier not found', HttpStatus.NOT_FOUND);
    }

    return {
      dossier,
      allowedActions: await this.p1Service.getAllowedActions(dossier.state),
    };
  }

  /**
   * Get event history (audit trail)
   * 
   * GET /p1/dossiers/:id/events
   */
  @Get(':id/events')
  async getEventHistory(
    @Param('id') dossierId: string,
    @Request() req: any,
  ) {
    const events = await this.p1Service.getEventHistory(
      dossierId,
      req.user.id,
    );

    return {
      events,
      verified: this.p1Service.verifyHashChain(events),
    };
  }

  /**
   * Create new dossier
   * 
   * POST /p1/dossiers
   */
  @Post()
  async createDossier(@Request() req: any, @Body() data?: any) {
    const dossier = await this.p1Service.createDossier(req.user.id, data);

    return {
      success: true,
      dossier,
    };
  }

  /**
   * List user's dossiers
   * 
   * GET /p1/dossiers
   */
  @Get()
  async listDossiers(@Request() req: any) {
    const dossiers = await this.p1Service.listDossiers(req.user.id);

    return {
      dossiers,
      total: dossiers.length,
    };
  }
}
