import { ForbiddenException, HttpException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";
import { CpsGenerateInput, CpsGeneratorService } from "./cps-generator.service";

/**
 * CpsDossierService — CPS lié à un dossier, payant, protégé et signé.
 *
 * Garde-fous (doctrine) :
 *   - réservé aux portes P1/P2/P3 (les seules produisant un CPS) ;
 *   - propriété du dossier (owner) ou rôle ADMIN/OWNER/OPS ;
 *   - paywall : visible seulement si packValidation.status === "ACTIVATED" (sinon 402) ;
 *   - filigrane nominatif incrusté (réf. dossier · utilisateur · date) ;
 *   - signatures obligatoires entreprises/prestataires, scellées SHA-256 + ProbativeLog,
 *     adaptateur Barid eSign (qualifiée) activable via BARID_ESIGN_ENABLED.
 *
 * Persistance : état CPS dans `Dossier.payload.cps`.
 */

const CPS_PORTES = new Set(["P1", "P2", "P3"]);
const CPS_KEY = "cps";

type Actor = { userId?: string; role?: string };

@Injectable()
export class CpsDossierService {
  private readonly log = new Logger(CpsDossierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: CpsGeneratorService,
    private readonly probative: ProbativeLogService,
  ) {}

  // ── Génération gardée ──────────────────────────────────────────

  async generate(dossierId: string, actor: Actor, input: CpsGenerateInput) {
    const d = await this.loadDossier(dossierId);
    this.assertAccess(d, actor);
    this.assertPorte(d);
    this.assertPaid(d);

    const payload: any = d.payload && typeof d.payload === "object" ? d.payload : {};
    const cps = payload[CPS_KEY] && typeof payload[CPS_KEY] === "object" ? payload[CPS_KEY] : {};
    const signatures =
      Array.isArray(cps.signatures) && cps.signatures.length ? cps.signatures : this.defaultSigners(payload);

    const doc = await this.generator.generate({
      ...input,
      projectName: input.projectName || d.title || d.clientNom || d.raisonSociale || "Projet",
      commune: input.commune || d.commune || undefined,
      watermark: this.watermark(d, actor),
      signatures: signatures.map((s: any) => ({
        partie: s.partie,
        role: s.role,
        signataire: s.signataire,
        signedAt: s.signedAt,
        status: s.status,
      })),
    });

    const documentHash = createHash("sha256").update(doc.html).digest("hex");
    return { ...doc, dossierId, porteType: d.porteType, documentHash };
  }

  // ── Signatures ─────────────────────────────────────────────────

  async getSignatures(dossierId: string, actor: Actor) {
    const d = await this.loadDossier(dossierId);
    this.assertAccess(d, actor);
    this.assertPorte(d);
    const payload: any = d.payload && typeof d.payload === "object" ? d.payload : {};
    const cps = payload[CPS_KEY] ?? {};
    const signatures =
      Array.isArray(cps.signatures) && cps.signatures.length ? cps.signatures : this.defaultSigners(payload);
    const total = signatures.length;
    const signed = signatures.filter((s: any) => s.status === "SIGNE").length;
    return {
      dossierId,
      porteType: d.porteType,
      signatures,
      total,
      signed,
      fullySigned: total > 0 && signed === total,
      baridEnabled: process.env.BARID_ESIGN_ENABLED === "true",
    };
  }

  async addSignature(
    dossierId: string,
    actor: Actor,
    input: { partie: string; signerRole?: string; signerName: string; dataUrl: string; documentHash?: string },
  ) {
    const d = await this.loadDossier(dossierId);
    this.assertAccess(d, actor);
    this.assertPorte(d);
    this.assertPaid(d);
    if (!input?.partie || !input?.signerName) throw new HttpException("partie et signerName requis", 400);
    if (!input?.dataUrl || !/^data:image\/(png|jpeg);base64,/i.test(input.dataUrl)) {
      throw new HttpException("Signature (dataUrl PNG/JPEG) requise", 400);
    }

    const payload: any = d.payload && typeof d.payload === "object" ? { ...d.payload } : {};
    const cps = payload[CPS_KEY] && typeof payload[CPS_KEY] === "object" ? { ...payload[CPS_KEY] } : {};
    const signatures: any[] =
      Array.isArray(cps.signatures) && cps.signatures.length ? [...cps.signatures] : this.defaultSigners(payload);

    const now = new Date().toISOString();
    const docHash = input.documentHash || cps.lastDocHash || "";
    const signatureHash = createHash("sha256").update(`${docHash}|${input.dataUrl}|${now}`).digest("hex");
    const baridEnabled = process.env.BARID_ESIGN_ENABLED === "true";
    const method = baridEnabled ? "BARID_ESIGN" : "LOCAL_CANVAS_SEALED";

    const idx = signatures.findIndex((s) => s.partie === input.partie);
    const rec = {
      partie: input.partie,
      role: input.signerRole || (idx >= 0 ? signatures[idx].role : "Entreprise"),
      signataire: input.signerName,
      signedAt: now,
      status: "SIGNE",
      signatureHash,
      method,
    };
    if (idx >= 0) signatures[idx] = { ...signatures[idx], ...rec };
    else signatures.push(rec);

    cps.signatures = signatures;
    if (docHash) cps.lastDocHash = docHash;
    payload[CPS_KEY] = cps;
    await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });

    try {
      await this.probative.append({
        kind: "CPS_SIGNATURE_APPOSEE",
        tome: "tome2",
        rule_id: "T2-R-CPS-SIGN-001",
        dossierId,
        partie: input.partie,
        signataire: input.signerName,
        signatureHash,
        method,
        signedAt: now,
      });
    } catch (e: any) {
      this.log.warn(`[CPS] probative append failed: ${e?.message}`);
    }

    const total = signatures.length;
    const signed = signatures.filter((s) => s.status === "SIGNE").length;
    return {
      ok: true,
      signatures,
      total,
      signed,
      fullySigned: total > 0 && signed === total,
      method,
      baridPending: baridEnabled,
    };
  }

  // ── Garde-fous ─────────────────────────────────────────────────

  private async loadDossier(id: string) {
    const d = await this.prisma.dossier.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        porteType: true,
        title: true,
        commune: true,
        refInterne: true,
        clientNom: true,
        raisonSociale: true,
        payload: true,
      },
    });
    if (!d) throw new NotFoundException("Dossier introuvable");
    return d as any;
  }

  private assertAccess(d: any, actor: Actor) {
    const isOwner = d.ownerId === actor.userId;
    const role = (actor.role || "").toUpperCase();
    const priv = ["ADMIN", "SUPER_ADMIN", "OWNER", "OPS"].includes(role);
    if (!isOwner && !priv) throw new ForbiddenException("Accès refusé sur ce dossier");
  }

  private assertPorte(d: any) {
    if (!CPS_PORTES.has(d.porteType)) {
      throw new HttpException(
        `Le CPS n'est disponible que pour les portes P1, P2 et P3 (dossier en porte ${d.porteType}).`,
        422,
      );
    }
  }

  private assertPaid(d: any) {
    const status = (d.payload as any)?.packValidation?.status;
    if (status !== "ACTIVATED") {
      throw new HttpException(
        "CPS verrouillé : disponible uniquement après activation du pack (paiement validé).",
        402,
      );
    }
  }

  private watermark(d: any, actor: Actor): string {
    const who = d.clientNom || d.raisonSociale || (actor.userId ? actor.userId.slice(0, 8) : "client");
    const ref = d.refInterne || String(d.id).slice(0, 8);
    const now = new Date();
    return `CITURBAREA · ${ref} · ${who} · ${now.toLocaleDateString("fr-FR")} ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  private defaultSigners(payload: any): any[] {
    const out: any[] = [];
    const sts: any[] = Array.isArray(payload.sousTraitants) ? payload.sousTraitants : [];
    for (const st of sts) {
      if (st?.status !== "TERMINATED") {
        out.push({
          partie: st.supplierCabinet || st.lotIntitule || "Sous-traitant",
          role: "Entreprise / Sous-traitant",
          signataire: "",
          signedAt: null,
          status: "EN ATTENTE",
        });
      }
    }
    if (payload.architectName || payload.assignedArchitect) {
      out.push({
        partie: payload.architectName || payload.assignedArchitect?.name || "Architecte",
        role: "Architecte (visa)",
        signataire: "",
        signedAt: null,
        status: "EN ATTENTE",
      });
    }
    if (!out.length) {
      out.push({ partie: "Entreprise titulaire", role: "Entreprise", signataire: "", signedAt: null, status: "EN ATTENTE" });
    }
    return out;
  }
}
