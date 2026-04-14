import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../tomes/tome-at/security/jwt-auth.guard';
import { SousPhaseService } from './sous-phase.service';

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
}
