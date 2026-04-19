import { Controller, Get, Post, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../tome-at';
import { RokhasService, PHASES_ARCHITECTE_ONLY } from './rokhas.service';

@Controller('p2')
@UseGuards(JwtAuthGuard)
export class RokhasController {
  constructor(private readonly rokhas: RokhasService) {}

  // COCKPIT ARCHITECTE — vue complète
  @Get('dossier/:id/rokhas')
  async get(@Param('id') id: string) {
    return this.rokhas.getOrCreate(id);
  }

  @Get('dossier/:id/rokhas/phases')
  async phases(@Param('id') id: string) {
    return this.rokhas.getPhaseTimeline(id);
  }

  // FRONT CLIENT — vue filtrée (visibleClient=true uniquement)
  @Get('dossier/:id/rokhas/client-view')
  async clientView(@Param('id') id: string) {
    return this.rokhas.getClientView(id);
  }

  @Post('dossier/:id/rokhas/sync')
  async sync(@Param('id') id: string, @Body() body: any) {
    return this.rokhas.syncFromRokhas(id, body);
  }

  @Post('dossier/:id/rokhas/advance')
  async advance(
    @Param('id') id: string,
    @Body() body: { toPhase: number; remarques?: string },
    @Req() req: any,
  ) {
    if (PHASES_ARCHITECTE_ONLY.includes(body.toPhase)) {
      const role = req.user?.role;
      if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
        throw new ForbiddenException('Cette phase nécessite une validation architecte');
      }
    }
    return this.rokhas.advancePhase(id, body.toPhase, req.user.userId, body.remarques);
  }

  @Post('dossier/:id/rokhas/documents')
  async addDoc(
    @Param('id') id: string,
    @Body() body: { phase: number; nom: string; type: string; urlRokhas?: string; origine?: string },
    @Req() req: any,
  ) {
    return this.rokhas.addDocument(id, { ...body, uploadePar: req.user.userId });
  }

  // ARCHITECTE ONLY — valide avant envoi
  @Post('dossier/:id/rokhas/documents/:docId/validate')
  async validateDoc(@Param('docId') docId: string, @Req() req: any) {
    const role = req.user?.role;
    if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
      throw new ForbiddenException("Validation réservée à l'architecte");
    }
    return this.rokhas.validateDocument(docId, req.user.userId);
  }

  // ARCHITECTE ONLY — décide d'envoyer au client
  @Post('dossier/:id/rokhas/documents/:docId/send')
  async sendDoc(@Param('docId') docId: string, @Req() req: any) {
    const role = req.user?.role;
    if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
      throw new ForbiddenException("Envoi réservé à l'architecte");
    }
    return this.rokhas.sendDocumentToClient(docId);
  }

  // ── PORTAIL CLIENT ────────────────────────────────────────────────────────

  // Phases 1 & 2 — saisie des données (client ou architecte), bloqué si phase >= 4
  @Post('dossier/:id/rokhas/saisie')
  async saisie(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.rokhas.saveSaisieData(id, body, req.user.userId);
  }

  // Phase 3 — e-Signature Barid (architecte uniquement)
  @Post('dossier/:id/rokhas/esign')
  async esign(@Param('id') id: string, @Req() req: any) {
    const role = req.user?.role;
    if (!['OWNER', 'PARTNER_SENIOR', 'PARTNER_JUNIOR', 'AGENT'].includes(role)) {
      throw new ForbiddenException('La signature e-Barid est réservée à l\'architecte');
    }
    return this.rokhas.signEsign(id, req.user.userId);
  }

  // Client soumet ses données pour une phase déléguée (7, 9, permis habiter)
  @Post('dossier/:id/rokhas/client-submit')
  async clientSubmit(
    @Param('id') id: string,
    @Body() body: { phase: number; fields: Record<string, any> },
    @Req() req: any,
  ) {
    return this.rokhas.submitClientData(id, {
      phase: body.phase,
      fields: body.fields,
      triggeredBy: req.user.userId,
    });
  }

  // Client récupère ses données + état complet du dossier Rokhas
  @Get('dossier/:id/rokhas/client-data')
  async clientData(@Param('id') id: string) {
    return this.rokhas.getClientData(id);
  }

  // OPS/ADMIN — liste dossiers avec sync Puppeteer en attente
  @Get('rokhas/pending-sync')
  async pendingSync(@Req() req: any) {
    if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès OPS requis');
    }
    return this.rokhas.getPendingSyncDossiers();
  }

  // Puppeteer callback — marque sync terminé
  @Post('rokhas/:rokhasId/sync-complete')
  async syncComplete(@Param('rokhasId') rokhasId: string, @Req() req: any) {
    if (!['OWNER', 'ADMIN', 'OPS'].includes(req.user?.role)) {
      throw new ForbiddenException('Accès OPS requis');
    }
    await this.rokhas.markSyncComplete(rokhasId);
    return { ok: true };
  }
}
