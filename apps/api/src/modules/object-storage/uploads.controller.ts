/**
 * UploadsController — points d'entrée upload présigné.
 *   POST /uploads/presign       → renvoie {uploadUrl, publicUrl, key, ...}
 *   PUT  /uploads/objects/*     → DEV/LOCAL uniquement : reçoit le binaire après vérif du jeton signé
 *
 * En production avec R2, le client PUT directement à R2 ; ce contrôleur n'expose
 * alors que `/uploads/presign`.
 */
import { BadRequestException, Body, Controller, HttpCode, Post, Put, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { join } from "node:path";
import { JwtAuthGuard, Tome } from "../../tomes/tome-at";
import { ObjectStorageService } from "./object-storage.service";
import type { ObjectKind } from "./object-storage.types";
import { verifyLocalToken, writeLocalObject } from "./drivers/local.driver";

interface PresignBody {
  mime?: string;
  size?: number;
  kind?: ObjectKind;
}

@Tome("tome2")
@Controller("uploads")
export class UploadsController {
  constructor(private readonly storage: ObjectStorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post("presign")
  async presign(@Req() req: any, @Body() body: PresignBody) {
    if (!body?.mime || !body?.size || !body?.kind) {
      throw new BadRequestException("mime, size, kind requis");
    }
    const ownerKey = String(req.user?.userId ?? req.user?.id ?? "anonymous")
      .replace(/[^A-Za-z0-9_\-:.]/g, "_")
      .slice(0, 32);
    try {
      const out = await this.storage.presign({
        mime: body.mime,
        size: Number(body.size),
        kind: body.kind,
        ownerKey,
      });
      return { ok: true, data: out };
    } catch (e: any) {
      throw new BadRequestException(e?.message || "presign refusé");
    }
  }

  // DEV/LOCAL UNIQUEMENT — réception PUT d'un objet via jeton signé.
  // En production avec R2, ce point n'est jamais appelé (le PUT va à R2).
  @Put("objects/*")
  @HttpCode(200)
  async putLocalObject(@Req() req: Request) {
    const key = (req.params as any)[0] || "";
    const q = req.query || {};
    const sig = String((q as any).sig || "");
    const exp = String((q as any).exp || "");
    const mime = String((q as any).mime || "");
    const size = String((q as any).size || "");
    if (!sig || !verifyLocalToken(key, exp, mime, size, sig)) {
      throw new BadRequestException("token invalide ou expiré");
    }
    const max = Number(size);
    if (!Number.isFinite(max) || max <= 0) throw new BadRequestException("size invalide");

    const body: Buffer = await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let total = 0;
      req.on("data", (c: Buffer) => {
        total += c.length;
        if (total > max) {
          req.destroy();
          reject(new BadRequestException("Taille excédée"));
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });
    if (body.length !== max) throw new BadRequestException("Taille inattendue");

    const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
    await writeLocalObject(uploadsDir, key, body);
    return { ok: true, key };
  }
}
