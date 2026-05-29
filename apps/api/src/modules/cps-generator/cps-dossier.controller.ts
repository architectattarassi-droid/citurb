import { Body, Controller, Get, Header, HttpCode, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { Tome } from "../../tomes/tome-at";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { CpsGenerateInput } from "./cps-generator.service";
import { CpsDossierService } from "./cps-dossier.service";

type AuthedRequest = Request & { user?: { userId?: string; sub?: string; role?: string } };
const actorOf = (req: AuthedRequest) => ({ userId: req.user?.userId ?? req.user?.sub, role: req.user?.role });

/**
 * Tome 2 — CPS lié au dossier (payant, filigrané, signé).
 *  - POST /api/cps/dossier/:id/generate        CPS gardé (porte P1/P2/P3 + paywall + propriété)
 *  - POST /api/cps/dossier/:id/generate/html   HTML filigrané (aperçu/impression)
 *  - GET  /api/cps/dossier/:id/signatures      signataires requis + état
 *  - POST /api/cps/dossier/:id/sign            apposer une signature scellée
 */
@Tome("tome2")
@Controller("api/cps/dossier")
@UseGuards(JwtAuthGuard)
export class CpsDossierController {
  constructor(private readonly service: CpsDossierService) {}

  @Post(":dossierId/generate")
  @HttpCode(200)
  async generate(@Param("dossierId") dossierId: string, @Body() body: CpsGenerateInput, @Req() req: AuthedRequest) {
    return this.service.generate(dossierId, actorOf(req), body ?? ({} as CpsGenerateInput));
  }

  @Post(":dossierId/generate/html")
  @HttpCode(200)
  @Header("Content-Type", "text/html; charset=utf-8")
  async generateHtml(
    @Param("dossierId") dossierId: string,
    @Body() body: CpsGenerateInput,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    const doc = await this.service.generate(dossierId, actorOf(req), body ?? ({} as CpsGenerateInput));
    res.send(doc.html);
  }

  @Get(":dossierId/signatures")
  async signatures(@Param("dossierId") dossierId: string, @Req() req: AuthedRequest) {
    return this.service.getSignatures(dossierId, actorOf(req));
  }

  @Post(":dossierId/sign")
  @HttpCode(200)
  async sign(
    @Param("dossierId") dossierId: string,
    @Body() body: { partie: string; signerRole?: string; signerName: string; dataUrl: string; documentHash?: string },
    @Req() req: AuthedRequest,
  ) {
    return this.service.addSignature(dossierId, actorOf(req), body);
  }
}
