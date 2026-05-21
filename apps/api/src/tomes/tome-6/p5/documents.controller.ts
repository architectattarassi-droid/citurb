import { Body, Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Tome } from "../../tome-at";
import { join as joinPath } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";

/**
 * P5 Documents Controller — upload des documents officiels (extrait Mohafadati,
 * titre foncier, plan parcellaire) en amont de la création du dossier.
 *
 * Doctrine : endpoint PUBLIC (pas d'auth) pour permettre l'upload avant signup,
 * mais avec garde-fous stricts :
 *   - Taille max 10 Mo
 *   - Mimetype PDF / JPG / PNG / WEBP / HEIC uniquement
 *   - Nom de fichier généré aléatoirement (impossible à deviner)
 *   - Stocké dans /uploads/p5-documents/
 *
 * L'URL retournée est ensuite passée dans brief.mohafadatiDocument lors de
 * l'intake. Le fichier est rattaché au dossier par l'admin si nécessaire.
 */

const UPLOAD_BASE = process.env.UPLOADS_DIR || joinPath(process.cwd(), "uploads");
const P5_DOC_DIR = joinPath(UPLOAD_BASE, "p5-documents");
try { mkdirSync(P5_DOC_DIR, { recursive: true }); } catch {}

const ALLOWED = /^(application\/pdf|image\/(jpeg|png|webp|heic))$/i;
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

@Tome("tome6")
@Controller("p5/documents")
export class P5DocumentsController {
  @Post("upload")
  @UseInterceptors(FileInterceptor("file", {
    limits: { fileSize: MAX_BYTES },
  }))
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException("Aucun fichier reçu");
    if (!ALLOWED.test(file.mimetype)) {
      throw new BadRequestException(`Type ${file.mimetype} non autorisé`);
    }
    // Nom aléatoire pour éviter toute fuite (URL non devinable)
    const ext = (file.originalname.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const slug = randomBytes(12).toString("hex");
    const stored = `${slug}.${ext}`;
    const full = joinPath(P5_DOC_DIR, stored);
    writeFileSync(full, file.buffer);

    // Le nom UTF-8 d'origine (réencodé depuis latin1 fourni par multer)
    const originalUtf8 = Buffer.from(file.originalname, "latin1").toString("utf8");

    return {
      ok: true,
      url: `/uploads/p5-documents/${stored}`,
      filename: originalUtf8,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
