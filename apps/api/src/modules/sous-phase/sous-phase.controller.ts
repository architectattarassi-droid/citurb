import { Controller, Get, Post, Patch, Param, Body, Req, Res, UseGuards, UseInterceptors, UploadedFile, Query, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { diskStorage } = require('multer');
import { join } from 'path';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../tomes/tome-at/security/jwt-auth.guard';
import { Tome } from '../../tomes/tome-at';
import { RolesGuard } from '../../tomes/tome-5/auth/roles.guard';
import { Roles } from '../../tomes/tome-5/auth/roles.decorator';
import { SousPhaseService } from './sous-phase.service';

const SOUSPHASE_UPLOAD_DIR = join(process.cwd(), 'uploads', 'sous-phases');

@Tome('tome2')
@Controller('p2/dossier/:id')
@UseGuards(JwtAuthGuard)
export class SousPhaseController {
  constructor(private readonly svc: SousPhaseService) {}

  @Get('complet')
  complet(@Param('id') id: string) { return this.svc.getDossierComplet(id); }

  @Get('phase/:ref/snapshot')
  snapshot(@Param('id') id: string, @Param('ref') ref: string) { return this.svc.getSnapshot(id, ref); }

  @Get('sous-phases')
  listSP(@Param('id') id: string, @Query('phaseRef') pr?: string) {
    return this.svc.db.dossierSousPhase.findMany({ where: { dossierId: id, ...(pr ? { phaseRef: pr } : {}) }, orderBy: { numero: 'asc' }, include: { documents: true } });
  }

  @Post('sous-phases')
  createSP(@Param('id') id: string, @Body() b: any, @Req() r: any) { return this.svc.createSousPhase(id, b.phaseRef, b.titre, b.notePrestataire, r.user?.userId); }

  @Patch('sous-phases/:sid')
  updateSP(@Param('sid') sid: string, @Body() b: any, @Req() r: any) { return this.svc.updateSousPhase(sid, { ...b, acteurId: r.user?.userId }); }

  @Post('sous-phases/:sid/soumettre')
  soumettre(@Param('sid') sid: string, @Req() r: any) { return this.svc.updateSousPhase(sid, { statut: 'SOUMISE', acteurId: r.user?.userId }); }

  @Post('sous-phases/:sid/valider')
  valider(@Param('sid') sid: string, @Body() b: any, @Req() r: any) { return this.svc.updateSousPhase(sid, { statut: 'VALIDEE', acteurId: r.user?.userId, remarques: b.note }); }

  @Post('sous-phases/:sid/rejeter')
  rejeter(@Param('sid') sid: string, @Body() b: any, @Req() r: any) { return this.svc.updateSousPhase(sid, { statut: 'REJETEE', acteurId: r.user?.userId, noteClient: b.note }); }

  @Get('phase/:ref/chat')
  getChats(@Param('id') id: string, @Param('ref') ref: string) { return this.svc.getChats(id, ref); }

  @Post('phase/:ref/chat')
  sendChat(@Param('id') id: string, @Param('ref') ref: string, @Body() b: any, @Req() r: any) {
    return this.svc.chat(id, ref, r.user?.userId, r.user?.role, b.contenu, { sousPhaseId: b.sousPhaseId, type: b.type, filePath: b.filePath, fileName: b.fileName });
  }

  @Post('phase/:ref/chat/read')
  markRead(@Param('id') id: string, @Param('ref') ref: string, @Req() r: any) { return this.svc.markRead(id, ref, r.user?.userId); }

  @Get('reunions')
  listReu(@Param('id') id: string, @Query('phaseRef') pr?: string) { return this.svc.listReunions(id, pr); }

  @Post('reunions')
  createReu(@Param('id') id: string, @Body() b: any, @Req() r: any) { return this.svc.createReunion(id, b.phaseRef, b, r.user?.userId); }

  @Patch('reunions/:rid')
  updateReu(@Param('rid') rid: string, @Body() b: any) { return this.svc.updateReunion(rid, b); }

  @Get('devis')
  listDev(@Param('id') id: string, @Query('phaseRef') pr?: string) { return this.svc.listDevis(id, pr); }

  @Post('devis')
  createDev(@Param('id') id: string, @Body() b: any, @Req() r: any) { return this.svc.createDevis(id, b.phaseRef, r.user?.userId, b.titre, b.lignes, b); }

  @Patch('devis/:did/statut')
  updateDevStatut(@Param('did') did: string, @Body() b: any) { return this.svc.updateDevisStatut(did, b.statut, b.note); }

  @Get('factures')
  listFac(@Param('id') id: string, @Query('phaseRef') pr?: string) { return this.svc.listFactures(id, pr); }

  @Post('factures')
  createFac(@Param('id') id: string, @Body() b: any, @Req() r: any) { return this.svc.createFacture(id, b.phaseRef, r.user?.userId, b.titre, b.lignes, b); }

  @Post('factures/:fid/paiement')
  paiement(@Param('fid') fid: string, @Body() b: any) { return this.svc.paiement(fid, b.montantPaye, b.modePaiement, b.reference); }

  @Get('historique')
  hist(@Param('id') id: string, @Query('phaseRef') pr?: string) { return this.svc.getHistorique(id, pr); }

  // ─── Documents par sous-phase ──────────────────────────────────────────────
  @Post('sous-phases/:sid/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: SOUSPHASE_UPLOAD_DIR,
      filename: (_req: any, file: any, cb: any) => {
        const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB pour fichiers IFC/DWG
  }))
  uploadDoc(
    @Param('sid') sid: string,
    @UploadedFile() file: any,
    @Body() body: { nom?: string; visibleClient?: string },
    @Req() req: any,
  ) {
    return this.svc.addDocumentToSousPhase(sid, file, {
      uploadedBy: req.user?.userId,
      uploadedByRole: req.user?.role,
      visibleClient: body?.visibleClient !== 'false',
      nom: body?.nom,
    });
  }

  @Get('sous-phases/:sid/documents/:did/download')
  async downloadDoc(
    @Param('did') did: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const doc = await this.svc.getDocumentForDownload(did, req.user?.userId, req.user?.role);
    const filePath = join(SOUSPHASE_UPLOAD_DIR, doc.filePath);
    res.set({
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${(doc.nom || doc.filePath).replace(/"/g, '')}"`,
    });
    return new StreamableFile(createReadStream(filePath));
  }

  // ─── Actions client (validation/rejet) ────────────────────────────────────
  @Post('sous-phases/:sid/client-validate')
  clientValidate(@Param('sid') sid: string, @Req() req: any) {
    return this.svc.clientValidateSousPhase(sid, req.user?.userId);
  }

  @Post('sous-phases/:sid/client-reject')
  clientReject(@Param('sid') sid: string, @Body() body: { note: string }, @Req() req: any) {
    return this.svc.clientRejectSousPhase(sid, req.user?.userId, body?.note || '');
  }

  @Get('client/sous-phases')
  listClientSP(@Param('id') id: string, @Req() req: any) {
    return this.svc.listClientSousPhases(id, req.user?.userId);
  }

  // ─── ADMIN: Shadow view + déblocage ────────────────────────────────────────
  // Ces routes sont protégées par RolesGuard (ADMIN/OWNER uniquement).
  // Permettent à l'admin d'agir sur le dossier d'un autre utilisateur depuis
  // la page shadow-view du Command Center.

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Post('admin/unblock')
  adminUnblock(@Param('id') id: string, @Body() b: { newStatus?: string; clearOpsNote?: boolean; opsNote?: string }, @Req() r: any) {
    return this.svc.adminUnblock(id, {
      newStatus: b?.newStatus,
      clearOpsNote: b?.clearOpsNote,
      opsNote: b?.opsNote,
      actorId: r.user?.userId,
    });
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @Patch('admin/patch')
  adminPatch(@Param('id') id: string, @Body() b: { opsNote?: string | null; status?: string }, @Req() r: any) {
    return this.svc.adminPatch(id, b, r.user?.userId);
  }
}
