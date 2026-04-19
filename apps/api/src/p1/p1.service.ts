/**
 * CITURBAREA V150 — P1 Service (State Machine Backend)
 * 
 * Doctrine:
 * - Append-only events
 * - Hash chain for probative logs
 * - Backend validates all transitions
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../tomes/tome-at';
import { DossierState, Prisma } from '@prisma/client';
import { P1Event, P1State } from './p1.types';
import * as crypto from 'crypto';

@Injectable()
export class P1Service {
  constructor(private prisma: PrismaService) {}

  /**
   * State machine transition logic (same as frontend)
   */
  private transition(state: P1State, event: P1Event): P1State {
    // Global freeze
    if (event.type === 'EVT_FREEZE') {
      return 'EC_GEL';
    }

    switch (state) {
      case 'E1_LANDING':
        if (event.type === 'EVT_START') return 'E2_QUALIFICATION';
        break;

      case 'E2_QUALIFICATION':
        if (event.type === 'EVT_QUAL_SUBMIT') return 'E3_DOCUMENTS';
        break;

      case 'E3_DOCUMENTS':
        if (event.type === 'EVT_DOCS_OK') return 'E4_PACK';
        break;

      case 'E4_PACK':
        if (event.type === 'EVT_PACK_SELECTED') return 'E5_DISCLAIMER';
        break;

      case 'E5_DISCLAIMER':
        if (event.type === 'EVT_DISCLAIMER_ACCEPT') return 'E6_PAYMENT';
        break;

      case 'E6_PAYMENT':
        if (event.type === 'EVT_PAYMENT_CONFIRMED') return 'E7_ACTIVE';
        break;

      case 'E7_ACTIVE':
        if (event.type === 'EVT_START_PRODUCTION') return 'E8_PRODUCTION';
        break;

      case 'E8_PRODUCTION':
        if (event.type === 'EVT_PRODUCTION_PHASE') return 'E8_PRODUCTION';
        if (event.type === 'EVT_AUTH_SUBMITTED') return 'E9_AUTORISATION';
        break;

      case 'E9_AUTORISATION':
        if (event.type === 'EVT_AUTH_SIGNED') return 'E10_CHANTIER';
        break;

      case 'E10_CHANTIER':
        if (event.type === 'EVT_SITE_DONE') return 'E11_VALIDATION';
        break;

      case 'E11_VALIDATION':
        if (event.type === 'EVT_VALIDATED') return 'E12_CLOTURE';
        break;

      case 'E12_CLOTURE':
        if (event.type === 'EVT_ARCHIVED') return 'E12_CLOTURE';
        break;

      case 'EC_GEL':
        throw new Error('Dossier frozen (EC_GEL). No transitions permitted.');
    }

    throw new Error(
      `Invalid transition from "${state}" via "${event.type}". ` +
      `Doctrine violation: transitions must be explicit and validated.`
    );
  }

  /**
   * Apply event to dossier (with hash chain)
   */
  async applyEvent(
    dossierId: string,
    event: P1Event,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Get current dossier
      const dossier = await tx.dossier.findUnique({
        where: { id: dossierId },
      });

      if (!dossier) {
        throw new BadRequestException('Dossier not found');
      }

      if (dossier.userId !== userId) {
        throw new BadRequestException('Unauthorized');
      }

      // Compute next state
      const fromState = dossier.state as P1State;
      const toState = this.transition(fromState, event);

      // Get previous event hash
      const prevEvent = await tx.dossierEvent.findFirst({
        where: { dossierId },
        orderBy: { createdAt: 'desc' },
      });

      // Compute hash chain
      const timestamp = new Date().toISOString();
      const hashInput = `${prevEvent?.hash || 'GENESIS'}|${event.type}|${toState}|${timestamp}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

      // Create event
      const newEvent = await tx.dossierEvent.create({
        data: {
          dossierId,
          userId,
          eventType: event.type,
          fromState: fromState as DossierState,
          toState: toState as DossierState,
          payload: event.payload as Prisma.JsonObject,
          hash,
          prevHash: prevEvent?.hash || null,
          ipAddress,
          userAgent,
        },
      });

      // Update dossier state
      const updatedDossier = await tx.dossier.update({
        where: { id: dossierId },
        data: {
          state: toState as DossierState,
          previousState: fromState as DossierState,
          updatedAt: new Date(),
          // Update metadata based on event
          ...(event.type === 'EVT_PACK_SELECTED' && event.payload?.packId
            ? { packId: event.payload.packId }
            : {}),
          ...(event.type === 'EVT_PAYMENT_CONFIRMED' && event.payload?.stripeSessionId
            ? { stripeSessionId: event.payload.stripeSessionId, paymentStatus: 'PAID' }
            : {}),
          ...(event.type === 'EVT_FREEZE'
            ? { frozenAt: new Date(), frozenReason: event.payload?.reason || 'Manual freeze' }
            : {}),
        },
      });

      return {
        dossier: updatedDossier,
        event: newEvent,
      };
    });
  }

  /**
   * Get dossier
   */
  async getDossier(dossierId: string, userId: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
          take: 10,
        },
        documents: true,
      },
    });

    if (dossier?.userId !== userId) {
      return null;
    }

    return dossier;
  }

  /**
   * Get event history
   */
  async getEventHistory(dossierId: string, userId: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
    });

    if (!dossier || dossier.userId !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    return await this.prisma.dossierEvent.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Verify hash chain integrity
   */
  verifyHashChain(events: any[]): boolean {
    if (events.length === 0) return true;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const prevHash = i === 0 ? 'GENESIS' : events[i - 1].hash;

      const expectedHashInput = `${prevHash}|${event.eventType}|${event.toState}|${event.createdAt.toISOString()}`;
      const expectedHash = crypto
        .createHash('sha256')
        .update(expectedHashInput)
        .digest('hex');

      if (event.hash !== expectedHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create dossier
   */
  async createDossier(userId: string, data?: any) {
    return await this.prisma.dossier.create({
      data: {
        userId,
        state: 'E1_LANDING',
        projectType: data?.projectType,
        region: data?.region,
        province: data?.province,
        commune: data?.commune,
      },
    });
  }

  /**
   * List dossiers
   */
  async listDossiers(userId: string) {
    return await this.prisma.dossier.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        events: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get allowed actions for current state
   */
  async getAllowedActions(state: P1State): Promise<string[]> {
    const actions: Record<P1State, string[]> = {
      E1_LANDING: ['EVT_START', 'EVT_FREEZE'],
      E2_QUALIFICATION: ['EVT_QUAL_SUBMIT', 'EVT_FREEZE'],
      E3_DOCUMENTS: ['EVT_DOCS_OK', 'EVT_FREEZE'],
      E4_PACK: ['EVT_PACK_SELECTED', 'EVT_FREEZE'],
      E5_DISCLAIMER: ['EVT_DISCLAIMER_ACCEPT', 'EVT_FREEZE'],
      E6_PAYMENT: ['EVT_PAYMENT_CONFIRMED', 'EVT_FREEZE'],
      E7_ACTIVE: ['EVT_START_PRODUCTION', 'EVT_FREEZE'],
      E8_PRODUCTION: ['EVT_PRODUCTION_PHASE', 'EVT_AUTH_SUBMITTED', 'EVT_FREEZE'],
      E9_AUTORISATION: ['EVT_AUTH_SIGNED', 'EVT_FREEZE'],
      E10_CHANTIER: ['EVT_SITE_DONE', 'EVT_FREEZE'],
      E11_VALIDATION: ['EVT_VALIDATED', 'EVT_FREEZE'],
      E12_CLOTURE: ['EVT_ARCHIVED'],
      EC_GEL: [],
    };

    return actions[state] || [];
  }
}
