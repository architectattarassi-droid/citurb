/**
 * Tome 2 — Permis de Construire controller.
 *
 * Préfixe : /api/permis-construire
 *
 * Endpoints :
 *  POST   /dossier/:dossierId/init               crée brouillon (auth)
 *  GET    /dossier/:dossierId                    état brouillon + checklist
 *  PATCH  /dossier/:dossierId/step/:stepId       update step data (auth)
 *  POST   /dossier/:dossierId/upload-piece       upload pièce base64 (auth)
 *  POST   /dossier/:dossierId/generate-formulaires  génère HTML pré-rempli (auth)
 *  GET    /dossier/:dossierId/formulaire/:code   HTML imprimable d'un formulaire
 *  POST   /dossier/:dossierId/compile-master     compile master HTML (auth)
 *  GET    /dossier/:dossierId/master.pdf         HTML master imprimable (Print → PDF)
 *  GET    /dossier/:dossierId/attestation        HTML attestation
 *  POST   /dossier/:dossierId/submit             soumission finale (auth)
 *
 * Toutes les mutations passent l'allow-list MutationGateGuard via /api/permis-construire.
 */

import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { PermisConstruireService } from "./service";
import type {
  PcInitInput,
  PcStepPatch,
  PcUploadPieceInput,
  StepId,
  SubmissionMethod,
} from "./types";

@Tome("tome2")
@Controller("api/permis-construire")
export class PermisConstruireController {
  constructor(private readonly service: PermisConstruireService) {}

  // ─── Init brouillon
  @Post("dossier/:dossierId/init")
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async init(
    @Param("dossierId") dossierId: string,
    @Body() body: PcInitInput,
  ) {
    return this.service.init(dossierId, body ?? ({} as PcInitInput));
  }

  // ─── Lecture brouillon
  @Get("dossier/:dossierId")
  async get(@Param("dossierId") dossierId: string) {
    return this.service.get(dossierId);
  }

  // ─── Patch step
  @Patch("dossier/:dossierId/step/:stepId")
  @UseGuards(JwtAuthGuard)
  async patchStep(
    @Param("dossierId") dossierId: string,
    @Param("stepId") stepId: StepId,
    @Body() body: PcStepPatch,
  ) {
    return this.service.patchStep(dossierId, stepId, body ?? {});
  }

  // ─── Upload pièce
  @Post("dossier/:dossierId/upload-piece")
  @UseGuards(JwtAuthGuard)
  async uploadPiece(
    @Param("dossierId") dossierId: string,
    @Body() body: PcUploadPieceInput,
  ) {
    return this.service.uploadPiece(dossierId, body);
  }

  // ─── Génération formulaires
  @Post("dossier/:dossierId/generate-formulaires")
  @UseGuards(JwtAuthGuard)
  async generateFormulaires(@Param("dossierId") dossierId: string) {
    return this.service.generateFormulaires(dossierId);
  }

  // ─── Formulaire HTML (public read)
  @Get("dossier/:dossierId/formulaire/:code")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getFormulaire(
    @Param("dossierId") dossierId: string,
    @Param("code") code: string,
    @Res() res: Response,
  ) {
    const html = await this.service.readFormulaireHtml(dossierId, code);
    res.send(html);
  }

  // ─── Compile master
  @Post("dossier/:dossierId/compile-master")
  @UseGuards(JwtAuthGuard)
  async compileMaster(@Param("dossierId") dossierId: string) {
    return this.service.compileMaster(dossierId);
  }

  // ─── Download master (HTML imprimable)
  @Get("dossier/:dossierId/master.pdf")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getMaster(@Param("dossierId") dossierId: string, @Res() res: Response) {
    const html = await this.service.readMasterHtml(dossierId);
    res.send(html);
  }

  // ─── Attestation
  @Get("dossier/:dossierId/attestation")
  @Header("Content-Type", "text/html; charset=utf-8")
  async getAttestation(
    @Param("dossierId") dossierId: string,
    @Res() res: Response,
  ) {
    const html = await this.service.readAttestationHtml(dossierId);
    res.send(html);
  }

  // ─── Soumission finale
  @Post("dossier/:dossierId/submit")
  @UseGuards(JwtAuthGuard)
  async submit(
    @Param("dossierId") dossierId: string,
    @Body() body: { method: SubmissionMethod },
  ) {
    return this.service.submit(dossierId, body?.method ?? "self");
  }
}
