/**
 * Tome 2 — Permis de Construire service.
 *
 * Orchestration du wizard PC :
 *  - init/get/patch brouillon (stocké JSON dans `Dossier.payload.permisConstruire`)
 *  - upload de pièces (base64 → storage disque)
 *  - génération formulaires HTML
 *  - compilation PDF master + attestation
 *  - soumission finale
 *
 * Persistance : pattern bag JSON identique à PvChantierService — migration
 * Prisma future ne changera pas le contrat externe.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import {
  buildChecklist,
  estimateZoneSismique,
  loadReferential,
} from "./pc-checklist";
import {
  formulairesRequis,
  prefillFormulaire,
  renderFormulaire,
} from "./pc-formulaire-generator";
import { renderAttestation, renderMaster } from "./pc-pdf-renderer";
import {
  PC_PAYLOAD_KEY,
  PROJECT_TYPES,
  STEP_IDS,
  type PcDraft,
  type PcDraftResponse,
  type PcInitInput,
  type PcStepPatch,
  type PcUploadPieceInput,
  type PieceDefinition,
  type PieceState,
  type StepId,
  type SubmissionMethod,
} from "./types";

@Injectable()
export class PermisConstruireService {
  private readonly logger = new Logger(PermisConstruireService.name);
  private readonly storageRoot: string;

  constructor(private readonly prisma: PrismaService) {
    this.storageRoot =
      process.env.PC_STORAGE_ROOT ??
      path.resolve(process.cwd(), "apps/api/storage/permis-construire");
  }

  // ───────────────────────────────────────────────────────── lifecycle

  /** Crée un brouillon vierge ou renvoie celui existant. */
  async init(dossierId: string, input: PcInitInput): Promise<PcDraftResponse> {
    if (!PROJECT_TYPES.includes(input.projectType)) {
      throw new BadRequestException("projectType invalide");
    }
    if (!input.commune || !input.commune.trim()) {
      throw new BadRequestException("commune requise");
    }

    const dossier = await this.loadDossier(dossierId);
    const existing = this.readDraft(dossier);

    const now = new Date().toISOString();
    const draft: PcDraft =
      existing ?? {
        schemaVersion: 1,
        dossierId,
        step: "identification",
        identification: {
          projectType: input.projectType,
          commune: input.commune,
          prefecture: input.prefecture ?? null,
          surfaceTerrainM2: input.surfaceTerrainM2 ?? null,
          surfacePlancherM2: input.surfacePlancherM2 ?? null,
          niveaux: input.niveaux ?? null,
          zoneSismique: estimateZoneSismique(input.commune),
          architecteSlug: input.architecteSlug ?? null,
          architecteCnoa: input.architecteCnoa ?? null,
          visaCroa: input.visaCroa ?? null,
        },
        pieces: [],
        formulaires: [],
        createdAt: now,
        updatedAt: now,
      };

    if (existing) {
      draft.identification = {
        ...draft.identification,
        ...input,
        zoneSismique:
          draft.identification.zoneSismique ?? estimateZoneSismique(input.commune),
      };
      draft.updatedAt = now;
    }

    await this.writeDraft(dossier, draft);
    return this.buildResponse(draft);
  }

  /** Récupère le brouillon + checklist enrichie. */
  async get(dossierId: string): Promise<PcDraftResponse> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) {
      // brouillon vide implicite — réponse "neuve"
      const blank: PcDraft = {
        schemaVersion: 1,
        dossierId,
        step: "identification",
        identification: {
          projectType: null,
          commune: null,
          prefecture: null,
          surfaceTerrainM2: null,
          surfacePlancherM2: null,
          niveaux: null,
          zoneSismique: null,
          architecteSlug: null,
          architecteCnoa: null,
          visaCroa: null,
        },
        pieces: [],
        formulaires: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return this.buildResponse(blank);
    }
    return this.buildResponse(draft);
  }

  /** Met à jour les données d'une étape (sauvegarde automatique). */
  async patchStep(
    dossierId: string,
    stepId: StepId,
    patch: PcStepPatch,
  ): Promise<PcDraftResponse> {
    if (!STEP_IDS.includes(stepId)) {
      throw new BadRequestException("stepId invalide");
    }
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable — appeler /init");

    if (patch.identification) {
      draft.identification = { ...draft.identification, ...patch.identification };
      // Recalcule zone sismique si commune change
      if (patch.identification.commune) {
        draft.identification.zoneSismique = estimateZoneSismique(
          patch.identification.commune,
        );
      }
    }

    if (patch.formulaireOverrides) {
      for (const [code, data] of Object.entries(patch.formulaireOverrides)) {
        const f = draft.formulaires.find((x) => x.code === (code as any));
        if (f) f.data = { ...(f.data ?? {}), ...data };
      }
    }

    draft.step = stepId;
    draft.updatedAt = new Date().toISOString();
    await this.writeDraft(dossier, draft);
    return this.buildResponse(draft);
  }

  // ───────────────────────────────────────────────────────── pièces

  async uploadPiece(
    dossierId: string,
    input: PcUploadPieceInput,
  ): Promise<PcDraftResponse> {
    if (!input.pieceCode) throw new BadRequestException("pieceCode requis");
    if (!input.contentBase64) throw new BadRequestException("contentBase64 requis");

    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable");

    // Validation : pièce doit exister dans la checklist
    const checklist = buildChecklist({
      projectType: draft.identification.projectType,
      commune: draft.identification.commune,
    });
    const def = checklist.find((p) => p.code === input.pieceCode);
    if (!def) {
      throw new BadRequestException(
        `Pièce "${input.pieceCode}" non requise pour ce projet`,
      );
    }

    const buf = Buffer.from(input.contentBase64, "base64");
    const maxBytes = (def.maxSizeMb ?? 25) * 1024 * 1024;
    if (buf.byteLength > maxBytes) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${def.maxSizeMb ?? 25} MB)`,
      );
    }

    // Sauvegarde disque
    const dir = path.join(this.storageRoot, dossierId, "pieces");
    await fs.mkdir(dir, { recursive: true });
    const safeName = input.fileName.replace(/[^\w.\-]/g, "_").slice(0, 80);
    const fileName = `${input.pieceCode}_${Date.now()}_${safeName}`;
    const abs = path.join(dir, fileName);
    await fs.writeFile(abs, buf);

    // MAJ état pièce
    const filePath = path.relative(this.storageRoot, abs).replace(/\\/g, "/");
    const state: PieceState = {
      code: input.pieceCode,
      status: "UPLOADED",
      fileName: input.fileName,
      fileSize: buf.byteLength,
      uploadedAt: new Date().toISOString(),
      filePath,
    };
    const idx = draft.pieces.findIndex((p) => p.code === input.pieceCode);
    if (idx >= 0) draft.pieces[idx] = state;
    else draft.pieces.push(state);

    draft.updatedAt = new Date().toISOString();
    await this.writeDraft(dossier, draft);
    return this.buildResponse(draft);
  }

  // ───────────────────────────────────────────────────────── formulaires

  /** Génère tous les formulaires requis pour le brouillon. */
  async generateFormulaires(dossierId: string): Promise<PcDraftResponse> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable");
    if (!draft.identification.projectType) {
      throw new BadRequestException("Type projet manquant — compléter étape 1");
    }

    const codes = formulairesRequis(draft);
    const dir = path.join(this.storageRoot, dossierId, "formulaires");
    await fs.mkdir(dir, { recursive: true });

    draft.formulaires = [];
    for (const code of codes) {
      const data = prefillFormulaire(code, draft);
      const { html, label } = renderFormulaire(code, draft, data);
      const fileName = `${code}.html`;
      const abs = path.join(dir, fileName);
      await fs.writeFile(abs, html, "utf8");
      draft.formulaires.push({
        code,
        label,
        generatedAt: new Date().toISOString(),
        htmlPath: path.relative(this.storageRoot, abs).replace(/\\/g, "/"),
        data,
      });
    }

    draft.updatedAt = new Date().toISOString();
    await this.writeDraft(dossier, draft);
    return this.buildResponse(draft);
  }

  /** Renvoie le HTML d'un formulaire (à imprimer). */
  async readFormulaireHtml(dossierId: string, code: string): Promise<string> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable");
    const f = draft.formulaires.find((x) => x.code === (code as any));
    if (!f?.htmlPath) {
      // Régénération à la volée si absent
      const { html } = renderFormulaire(code as any, draft);
      return html;
    }
    const abs = path.join(this.storageRoot, f.htmlPath);
    try {
      return await fs.readFile(abs, "utf8");
    } catch {
      const { html } = renderFormulaire(code as any, draft);
      return html;
    }
  }

  // ───────────────────────────────────────────────────────── master PDF

  /** Compile le PDF master HTML (+ attestation + hash). */
  async compileMaster(dossierId: string): Promise<PcDraftResponse> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable");

    const checklist = this.enrichChecklist(draft);
    if (draft.formulaires.length === 0) {
      await this.generateFormulaires(dossierId);
      // recharge
      const reloaded = await this.loadDossier(dossierId);
      const reDraft = this.readDraft(reloaded);
      if (reDraft) draft.formulaires = reDraft.formulaires;
    }

    // Charge formulaires HTML
    const formulairesHtml: Array<{ code: string; label: string; html: string }> = [];
    for (const f of draft.formulaires) {
      const html = await this.readFormulaireHtml(dossierId, f.code);
      formulairesHtml.push({ code: f.code, label: f.label, html });
    }

    // Embeds images (PDF non embedded — référencé seulement)
    const embeds: Record<string, { mimeType: string; base64: string }> = {};
    for (const piece of draft.pieces) {
      if (!piece.filePath || !piece.fileName) continue;
      const ext = piece.fileName.toLowerCase().split(".").pop() ?? "";
      if (!["jpg", "jpeg", "png"].includes(ext)) continue;
      try {
        const abs = path.join(this.storageRoot, piece.filePath);
        const buf = await fs.readFile(abs);
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        embeds[piece.filePath] = { mimeType: mime, base64: buf.toString("base64") };
      } catch {
        // ignore
      }
    }

    const result = renderMaster({
      draft,
      checklist,
      formulairesHtml,
      embeds,
    });

    // Persiste master HTML + attestation
    const masterDir = path.join(this.storageRoot, dossierId, "master");
    await fs.mkdir(masterDir, { recursive: true });
    const masterAbs = path.join(masterDir, "master.html");
    await fs.writeFile(masterAbs, result.html, "utf8");

    const attestationHtml = renderAttestation({
      draft,
      hash: result.hash,
      qrPayload: result.qrPayload,
    });
    const attestationAbs = path.join(masterDir, "attestation.html");
    await fs.writeFile(attestationAbs, attestationHtml, "utf8");

    draft.masterPdfPath = path
      .relative(this.storageRoot, masterAbs)
      .replace(/\\/g, "/");
    draft.masterCompiledAt = new Date().toISOString();
    draft.masterHash = result.hash;
    draft.updatedAt = draft.masterCompiledAt;
    await this.writeDraft(dossier, draft);

    return this.buildResponse(draft);
  }

  /** Renvoie le HTML master (pour /master.pdf endpoint). */
  async readMasterHtml(dossierId: string): Promise<string> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft?.masterPdfPath) {
      throw new NotFoundException("Master PDF non compilé — appeler /compile-master");
    }
    const abs = path.join(this.storageRoot, draft.masterPdfPath);
    try {
      return await fs.readFile(abs, "utf8");
    } catch {
      throw new NotFoundException("Master PDF introuvable sur disque");
    }
  }

  /** Renvoie le HTML attestation. */
  async readAttestationHtml(dossierId: string): Promise<string> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft?.soumission?.attestationPath) {
      // fallback : regénère à la volée si hash dispo
      if (draft?.masterHash) {
        return renderAttestation({
          draft,
          hash: draft.masterHash,
          qrPayload: `https://citurbarea.com/verify/pc/${draft.dossierId}?h=${draft.masterHash.slice(0, 16)}`,
        });
      }
      throw new NotFoundException("Attestation non disponible");
    }
    const abs = path.join(this.storageRoot, draft.soumission.attestationPath);
    return fs.readFile(abs, "utf8");
  }

  // ───────────────────────────────────────────────────────── soumission

  async submit(
    dossierId: string,
    method: SubmissionMethod,
  ): Promise<PcDraftResponse> {
    const dossier = await this.loadDossier(dossierId);
    const draft = this.readDraft(dossier);
    if (!draft) throw new NotFoundException("Brouillon PC introuvable");
    if (!draft.masterPdfPath) {
      throw new BadRequestException("Master PDF non compilé — étape 4 requise");
    }

    const reference = `PC-${draft.dossierId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const submittedAt = new Date().toISOString();

    // Attestation finale signée
    const attestationHtml = renderAttestation({
      draft,
      hash: draft.masterHash ?? createHash("sha256").update(reference).digest("hex"),
      qrPayload: `https://citurbarea.com/verify/pc/${draft.dossierId}?ref=${reference}`,
    });
    const attestationDir = path.join(this.storageRoot, dossierId, "attestation");
    await fs.mkdir(attestationDir, { recursive: true });
    const abs = path.join(attestationDir, `attestation_${reference}.html`);
    await fs.writeFile(abs, attestationHtml, "utf8");

    draft.soumission = {
      method,
      submittedAt,
      reference,
      rokhasReference: method === "rokhas" ? `RKH-PENDING-${reference}` : undefined,
      attestationPath: path.relative(this.storageRoot, abs).replace(/\\/g, "/"),
      attestationHash: draft.masterHash,
      attestationQrPayload: `https://citurbarea.com/verify/pc/${draft.dossierId}?ref=${reference}`,
    };
    draft.step = "soumission";
    draft.updatedAt = submittedAt;
    await this.writeDraft(dossier, draft);

    this.logger.log(
      `[permis-construire] Dossier ${dossierId} soumis (method=${method}, ref=${reference})`,
    );

    return this.buildResponse(draft);
  }

  // ───────────────────────────────────────────────────────── helpers

  private async loadDossier(dossierId: string): Promise<{ id: string; payload: any }> {
    const d = await (this.prisma as any).dossier.findUnique({
      where: { id: dossierId },
      select: { id: true, payload: true },
    });
    if (!d) throw new NotFoundException("Dossier introuvable");
    return d;
  }

  private readDraft(dossier: { payload: any }): PcDraft | null {
    const p = dossier.payload ?? {};
    return (p[PC_PAYLOAD_KEY] as PcDraft | undefined) ?? null;
  }

  private async writeDraft(
    dossier: { id: string; payload: any },
    draft: PcDraft,
  ): Promise<void> {
    const payload = { ...(dossier.payload ?? {}), [PC_PAYLOAD_KEY]: draft };
    await (this.prisma as any).dossier.update({
      where: { id: dossier.id },
      data: { payload },
    });
  }

  private enrichChecklist(
    draft: PcDraft,
  ): Array<PieceDefinition & { state: PieceState }> {
    const defs = buildChecklist({
      projectType: draft.identification.projectType,
      commune: draft.identification.commune,
    });
    const byCode = new Map(draft.pieces.map((p) => [p.code, p]));
    return defs.map((d) => ({
      ...d,
      state:
        byCode.get(d.code) ??
        ({
          code: d.code,
          status: "MISSING",
        } satisfies PieceState),
    }));
  }

  private buildResponse(draft: PcDraft): PcDraftResponse {
    const checklist = this.enrichChecklist(draft);
    const uploadedPieces = checklist.filter(
      (p) => p.state.status === "UPLOADED" || p.state.status === "VALIDATED",
    ).length;
    const validatedPieces = checklist.filter(
      (p) => p.state.status === "VALIDATED",
    ).length;
    const requiredMissing = checklist.filter(
      (p) => p.required && p.state.status === "MISSING",
    ).length;
    return {
      draft,
      checklist,
      progress: {
        totalPieces: checklist.length,
        uploadedPieces,
        validatedPieces,
        requiredMissing,
        canCompile: requiredMissing === 0 && draft.identification.projectType !== null,
        canSubmit: !!draft.masterPdfPath && requiredMissing === 0,
      },
    };
  }
}

/** Touch pour suppress unused — `loadReferential` exposé pour tests. */
export const __internal = { loadReferential };
