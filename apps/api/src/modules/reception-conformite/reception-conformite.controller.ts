import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import * as fs from "fs/promises";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { ReceptionConformiteService } from "./reception-conformite.service";
import {
  CertificatInput,
  DefinitiveInput,
  DemandePhInput,
  LeveeReserveInput,
  ProvisoireInput,
  SignatureInput,
  SinistreInput,
  VisiteConformiteInput,
} from "./types";

type AuthedRequest = Request & {
  user?: { userId?: string; sub?: string; role?: string };
};

/**
 * Tome 3 — Réception + Certificat de Conformité + Permis d'Habiter.
 *
 * Endpoints :
 *   GET    /api/reception/dossier/:dossierId
 *   GET    /api/reception/dossier/:dossierId/garanties
 *
 *   POST   /api/reception/dossier/:dossierId/provisoire          (JWT)
 *   POST   /api/reception/dossier/:dossierId/provisoire/sign     (JWT)
 *   POST   /api/reception/dossier/:dossierId/provisoire/finalize (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/leveereserves       (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/definitive          (JWT)
 *   POST   /api/reception/dossier/:dossierId/definitive/sign     (JWT)
 *   POST   /api/reception/dossier/:dossierId/definitive/finalize (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/demande-permis-habiter (JWT)
 *   POST   /api/reception/dossier/:dossierId/visite-conformite      (JWT)
 *   POST   /api/reception/dossier/:dossierId/certificat-conformite  (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/sinistre               (JWT)
 *
 *   POST   /api/reception/dossier/:dossierId/photos                 (JWT)
 *
 *   GET    /api/reception/dossier/:dossierId/pdf/provisoire
 *   GET    /api/reception/dossier/:dossierId/pdf/definitive
 *   GET    /api/reception/dossier/:dossierId/pdf/levee/:reserveId
 *   GET    /api/reception/dossier/:dossierId/pdf/certificat
 */
@Tome("tome3")
@Controller("api/reception")
export class ReceptionConformiteController {
  constructor(private readonly service: ReceptionConformiteService) {}

  // ───────── Lecture

  @Get("dossier/:dossierId")
  async getState(@Param("dossierId") dossierId: string) {
    return this.service.getState(dossierId);
  }

  @Get("dossier/:dossierId/garanties")
  async getGaranties(@Param("dossierId") dossierId: string) {
    return this.service.getGaranties(dossierId);
  }

  // ───────── Réception provisoire

  @Post("dossier/:dossierId/provisoire")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async upsertProvisoire(
    @Param("dossierId") dossierId: string,
    @Body() body: ProvisoireInput,
  ) {
    return this.service.createOrUpdateProvisoire(dossierId, body ?? {});
  }

  @Post("dossier/:dossierId/provisoire/sign")
  @UseGuards(JwtAuthGuard)
  async signProvisoire(
    @Param("dossierId") dossierId: string,
    @Body() body: Omit<SignatureInput, "cible">,
  ) {
    return this.service.addSignature(dossierId, { ...body, cible: "PROVISOIRE" });
  }

  @Post("dossier/:dossierId/provisoire/finalize")
  @UseGuards(JwtAuthGuard)
  async finalizeProvisoire(@Param("dossierId") dossierId: string) {
    return this.service.finalizeProvisoire(dossierId);
  }

  // ───────── Levée de réserves

  @Post("dossier/:dossierId/leveereserves")
  @UseGuards(JwtAuthGuard)
  async leveeReserve(
    @Param("dossierId") dossierId: string,
    @Body() body: LeveeReserveInput,
  ) {
    return this.service.leveeReserve(dossierId, body);
  }

  // ───────── Réception définitive

  @Post("dossier/:dossierId/definitive")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async upsertDefinitive(
    @Param("dossierId") dossierId: string,
    @Body() body: DefinitiveInput,
  ) {
    return this.service.createOrUpdateDefinitive(dossierId, body ?? {});
  }

  @Post("dossier/:dossierId/definitive/sign")
  @UseGuards(JwtAuthGuard)
  async signDefinitive(
    @Param("dossierId") dossierId: string,
    @Body() body: Omit<SignatureInput, "cible">,
  ) {
    return this.service.addSignature(dossierId, { ...body, cible: "DEFINITIVE" });
  }

  @Post("dossier/:dossierId/definitive/finalize")
  @UseGuards(JwtAuthGuard)
  async finalizeDefinitive(@Param("dossierId") dossierId: string) {
    return this.service.finalizeDefinitive(dossierId);
  }

  // ───────── Permis d'habiter

  @Post("dossier/:dossierId/demande-permis-habiter")
  @UseGuards(JwtAuthGuard)
  async demandePh(
    @Param("dossierId") dossierId: string,
    @Body() body: DemandePhInput,
  ) {
    return this.service.demandePermisHabiter(dossierId, body);
  }

  @Post("dossier/:dossierId/visite-conformite")
  @UseGuards(JwtAuthGuard)
  async visiteConformite(
    @Param("dossierId") dossierId: string,
    @Body() body: VisiteConformiteInput,
  ) {
    return this.service.visiteConformite(dossierId, body);
  }

  @Post("dossier/:dossierId/certificat-conformite")
  @UseGuards(JwtAuthGuard)
  async certificatConformite(
    @Param("dossierId") dossierId: string,
    @Body() body: CertificatInput,
  ) {
    return this.service.certificatConformite(dossierId, body);
  }

  // ───────── Sinistres

  @Post("dossier/:dossierId/sinistre")
  @UseGuards(JwtAuthGuard)
  async declareSinistre(
    @Param("dossierId") dossierId: string,
    @Body() body: SinistreInput,
    @Req() req: AuthedRequest,
  ) {
    const declarantId = req.user?.userId ?? req.user?.sub ?? null;
    return this.service.declareSinistre(dossierId, body, declarantId);
  }

  // ───────── Photos

  @Post("dossier/:dossierId/photos")
  @UseGuards(JwtAuthGuard)
  async uploadPhoto(
    @Param("dossierId") dossierId: string,
    @Body()
    body: {
      contentBase64: string;
      mimeType: string;
      filenameHint?: string;
      bucket?: string; // ex: "provisoire", "definitive", "levee/{reserveId}", "sinistre"
    },
  ) {
    return this.service.savePhoto({
      dossierId,
      bucket: body?.bucket || "general",
      contentBase64: body?.contentBase64 ?? "",
      mimeType: body?.mimeType ?? "image/jpeg",
      filenameHint: body?.filenameHint,
    });
  }

  // ───────── HTML imprimables (sert de "PDF source")

  @Get("dossier/:dossierId/pdf/provisoire")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdfProvisoire(
    @Param("dossierId") dossierId: string,
    @Res() res: Response,
  ) {
    const state = await this.service.getState(dossierId);
    if (state.provisoire?.pvUrl) {
      try {
        const abs = await this.service.resolveSnapshot(
          dossierId,
          "provisoire/provisoire.html",
        );
        const html = await fs.readFile(abs, "utf8");
        res.send(html);
        return;
      } catch {
        /* fallthrough */
      }
    }
    if (!state.provisoire) {
      res.status(404).send("<p>Aucune réception provisoire</p>");
      return;
    }
    const html = await this.service["pvRenderer"].renderProvisoire(state.provisoire);
    res.send(html);
  }

  @Get("dossier/:dossierId/pdf/definitive")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdfDefinitive(
    @Param("dossierId") dossierId: string,
    @Res() res: Response,
  ) {
    const state = await this.service.getState(dossierId);
    if (state.definitive?.pvUrl) {
      try {
        const abs = await this.service.resolveSnapshot(
          dossierId,
          "definitive/definitive.html",
        );
        const html = await fs.readFile(abs, "utf8");
        res.send(html);
        return;
      } catch {
        /* fallthrough */
      }
    }
    if (!state.definitive) {
      res.status(404).send("<p>Aucune réception définitive</p>");
      return;
    }
    const html = await this.service["pvRenderer"].renderDefinitive(
      state.definitive,
      state.provisoire ?? null,
    );
    res.send(html);
  }

  @Get("dossier/:dossierId/pdf/levee/:reserveId")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdfLevee(
    @Param("dossierId") dossierId: string,
    @Param("reserveId") reserveId: string,
    @Res() res: Response,
  ) {
    const html = await this.service.renderLeveeHtml(dossierId, reserveId);
    res.send(html);
  }

  @Get("dossier/:dossierId/pdf/certificat")
  @Header("Content-Type", "text/html; charset=utf-8")
  async pdfCertificat(
    @Param("dossierId") dossierId: string,
    @Res() res: Response,
  ) {
    const html = await this.service.renderCertificatHtml(dossierId);
    res.send(html);
  }
}
