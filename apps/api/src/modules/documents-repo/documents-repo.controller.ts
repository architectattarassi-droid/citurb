import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import * as fs from "fs";
import { JwtAuthGuard } from "../../tomes/tome-5/auth/jwt-auth.guard";
import { Tome } from "../../tomes/tome-at";
import { DocumentsRepoService } from "./documents-repo.service";
import {
  MAX_UPLOAD_BYTES,
  RequestSignatureInput,
  SignDocumentInput,
  UploadDocumentInput,
} from "./types";

type AuthedRequest = Request & {
  user?: { userId?: string; sub?: string; email?: string; role?: string };
  ip?: string;
};

/**
 * Tome 7 — Documents Repository (contrats / plans / PV / e-signature).
 *
 * Endpoints :
 *  - POST   /api/documents-repo/dossier/:dossierId/upload      (auth, multipart 25 MB)
 *  - GET    /api/documents-repo/dossier/:dossierId             liste
 *  - GET    /api/documents-repo/:docId                          détail + signedUrl 1h
 *  - DELETE /api/documents-repo/:docId                          soft-delete (owner/OPS)
 *  - POST   /api/documents-repo/:docId/sign                     (auth)
 *  - POST   /api/documents-repo/:docId/request-signature        (auth)
 *  - GET    /api/documents-repo/:docId/verify                   public (page QR)
 *  - GET    /api/documents-repo/:docId/file?exp=&t=             download (URL signée)
 */
@Tome("tome7")
@Controller("api/documents-repo")
export class DocumentsRepoController {
  constructor(private readonly svc: DocumentsRepoService) {}

  // ────────────────────────── Read

  @Get("dossier/:dossierId")
  async list(@Param("dossierId") dossierId: string) {
    const items = await this.svc.list(dossierId);
    return { items, total: items.length };
  }

  @Get(":docId/verify")
  async verify(@Param("docId") docId: string, @Query("hash") hash?: string) {
    return this.svc.verifyPublic(docId, hash);
  }

  @Get(":docId/file")
  async download(
    @Param("docId") docId: string,
    @Query("exp") exp: string,
    @Query("t") token: string,
    @Res() res: Response,
  ) {
    const expNum = Number(exp);
    if (!this.svc.verifySignedToken(docId, expNum, token)) {
      res.status(403).json({ message: "Lien expiré ou invalide" });
      return;
    }
    const { abs, doc } = await this.svc.resolveFilePath(docId);
    if (!fs.existsSync(abs)) {
      res.status(404).json({ message: "Fichier introuvable" });
      return;
    }
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.filename)}"`,
    );
    fs.createReadStream(abs).pipe(res);
  }

  @Get(":docId")
  @UseGuards(JwtAuthGuard)
  async detail(@Param("docId") docId: string) {
    return this.svc.get(docId);
  }

  // ────────────────────────── Mutations (auth)

  @Post("dossier/:dossierId/upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async upload(
    @Param("dossierId") dossierId: string,
    @UploadedFile() file: any,
    @Body() body: UploadDocumentInput,
    @Req() req: AuthedRequest,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier reçu");
    const userId = req.user?.userId ?? req.user?.sub;
    const doc = await this.svc.upload({
      dossierId,
      uploadedBy: userId,
      file: {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      meta: body ?? {},
    });
    return { ok: true, document: doc };
  }

  @Delete(":docId")
  @UseGuards(JwtAuthGuard)
  async remove(@Param("docId") docId: string, @Req() req: AuthedRequest) {
    return this.svc.softDelete(docId, {
      userId: req.user?.userId ?? req.user?.sub,
      role: req.user?.role,
    });
  }

  @Post(":docId/sign")
  @UseGuards(JwtAuthGuard)
  async sign(
    @Param("docId") docId: string,
    @Body() body: SignDocumentInput,
    @Req() req: AuthedRequest,
  ) {
    return this.svc.sign(
      docId,
      {
        userId: req.user?.userId ?? req.user?.sub,
        email: req.user?.email,
        ip:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip,
      },
      body,
    );
  }

  @Post(":docId/request-signature")
  @UseGuards(JwtAuthGuard)
  async requestSignature(
    @Param("docId") docId: string,
    @Body() body: RequestSignatureInput,
    @Req() req: AuthedRequest,
  ) {
    return this.svc.requestSignatures(docId, body, {
      userId: req.user?.userId ?? req.user?.sub,
    });
  }
}
