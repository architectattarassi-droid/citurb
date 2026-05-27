import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";
import { ProbativeLogService } from "../kernel/services/probative-log.service";
import { EvaluationService } from "./evaluation.service";
import {
  AssignInput,
  EvaluationInput,
  LOTS_TPHI,
  Loi32_99AuditResult,
  LotCode,
  ST_PAYLOAD_KEY,
  SituationDeclareInput,
  SituationTravaux,
  SousTraitantAssignment,
} from "./types";

type DossierLite = {
  id: string;
  ownerId: string;
  refInterne: string | null;
  payload: any;
};

/**
 * SousTraitantsService — orchestration des sous-traitants P3 (Tome 3).
 *
 * Persistance MVP : JSON in Dossier.payload[ST_PAYLOAD_KEY][].
 *   (cf. INTEGRATION.md — migration Prisma future, modèle proposé).
 *
 * Conformité loi 32-99 :
 *   - tout sous-traitant doit être déclaré (loi32_99_declared = true)
 *   - contrat écrit obligatoire (généré par this.generateContrat)
 *   - paiement direct possible si MO ne paie pas l'entrepreneur dans
 *     les 30 jours (art. 7) — non modélisé MVP (escrow gère ce cas)
 *
 * Probative log : sur contrat signé, situation validée, paiement effectué.
 */
@Injectable()
export class SousTraitantsService {
  private readonly logger = new Logger(SousTraitantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly probative: ProbativeLogService,
    private readonly evaluation: EvaluationService,
  ) {}

  // ─────────────────────────────────────────────────────────── List / Get

  async listByDossier(dossierId: string): Promise<SousTraitantAssignment[]> {
    const dossier = await this.loadDossier(dossierId);
    return this.readBag(dossier).sort((a, b) => a.lotNumero - b.lotNumero);
  }

  async getOne(assignmentId: string): Promise<{ assignment: SousTraitantAssignment; dossier: DossierLite }> {
    const found = await this.findAssignmentAnywhere(assignmentId);
    if (!found) throw new NotFoundException("Sous-traitant introuvable");
    return found;
  }

  // ─────────────────────────────────────────────────────────── Assign

  async assign(dossierId: string, input: AssignInput, actorId?: string): Promise<SousTraitantAssignment> {
    if (!input?.lotCode) throw new BadRequestException("lotCode requis");
    if (!input?.supplierCabinet) throw new BadRequestException("supplierCabinet requis");
    if (!Number.isFinite(input?.montantHt) || input.montantHt <= 0) {
      throw new BadRequestException("montantHt invalide");
    }
    if (!input?.conditions?.delaiJours || input.conditions.delaiJours <= 0) {
      throw new BadRequestException("conditions.delaiJours requis");
    }

    const lot = LOTS_TPHI.find((l) => l.code === input.lotCode);
    if (!lot) throw new BadRequestException(`Lot inconnu: ${input.lotCode}`);

    // Vérification agrément si le lot l'impose
    if (lot.agrementRequis && !(input.supplierAgrements?.length)) {
      this.logger.warn(
        `[loi 32-99] Assignment lot ${lot.code} sans agrément déclaré (cabinet=${input.supplierCabinet})`,
      );
    }

    const dossier = await this.loadDossier(dossierId);
    const bag = this.readBag(dossier);

    // Anti-doublon : un seul sous-traitant actif par lot
    const exists = bag.find(
      (a) => a.lotCode === input.lotCode && a.status !== "TERMINATED",
    );
    if (exists) {
      throw new BadRequestException(
        `Lot ${lot.code} déjà assigné (cabinet=${exists.supplierCabinet}). Résiliez d'abord l'assignation existante.`,
      );
    }

    const tva = typeof input.tva === "number" ? input.tva : 20;
    const montantTtc = Math.round(input.montantHt * (1 + tva / 100) * 100) / 100;
    const now = new Date().toISOString();

    const assignment: SousTraitantAssignment = {
      id: randomUUID(),
      dossierId,
      lotCode: input.lotCode,
      lotIntitule: lot.intitule,
      lotNumero: lot.numero,
      supplierUserId: input.supplierUserId ?? null,
      supplierCabinet: String(input.supplierCabinet).slice(0, 200),
      supplierEmail: input.supplierEmail ?? null,
      supplierPhone: input.supplierPhone ?? null,
      supplierClasse: input.supplierClasse ?? null,
      supplierAgrements: (input.supplierAgrements ?? []).slice(0, 20),
      montantHt: Math.round(input.montantHt * 100) / 100,
      tva,
      montantTtc,
      devise: "MAD",
      conditions: {
        delaiJours: input.conditions.delaiJours,
        garantie: input.conditions.garantie,
        penaliteJours: input.conditions.penaliteJours,
        retenueGarantie: input.conditions.retenueGarantie,
      },
      contratPdfUrl: null,
      contratHash: null,
      contratSignedAt: null,
      contratSignedBy: null,
      situations: [],
      status: "PROPOSED",
      loi32_99_declared: input.loi32_99_declared !== false,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId ?? null,
    };

    bag.push(assignment);
    await this.writeBag(dossier, bag);

    await this.safeAppendLog({
      kind: "ST_ASSIGNED",
      tome: "tome3",
      rule_id: "T3-R-ST-ASSIGN-001",
      dossierId,
      assignmentId: assignment.id,
      lotCode: assignment.lotCode,
      supplierCabinet: assignment.supplierCabinet,
      montantHt: assignment.montantHt,
      loi32_99_declared: assignment.loi32_99_declared,
    });

    return assignment;
  }

  // ─────────────────────────────────────────────────────────── Contrat

  async generateContrat(assignmentId: string, actorId?: string): Promise<{ assignment: SousTraitantAssignment; html: string }> {
    const { assignment, dossier } = await this.getOne(assignmentId);
    if (assignment.contratSignedAt) {
      throw new BadRequestException("Contrat déjà signé — ne peut être régénéré");
    }

    const html = this.renderContratHtmlLoi32_99(assignment);
    const hash = createHash("sha256").update(html).digest("hex");

    // URL "virtuelle" — au MVP le PDF est généré côté front à la demande.
    // Le hash sert d'empreinte probatoire stable.
    const pdfUrl = `/api/sous-traitants/${assignment.id}/contrat/pdf`;

    const updated: SousTraitantAssignment = {
      ...assignment,
      contratPdfUrl: pdfUrl,
      contratHash: hash,
      updatedAt: new Date().toISOString(),
    };
    await this.replaceAssignment(dossier, updated);

    return { assignment: updated, html };
  }

  async signContrat(assignmentId: string, dataUrl: string, actorId?: string): Promise<SousTraitantAssignment> {
    if (!dataUrl || !/^data:image\/(png|jpeg);base64,/i.test(dataUrl)) {
      throw new BadRequestException("dataUrl signature invalide");
    }
    const { assignment, dossier } = await this.getOne(assignmentId);
    if (assignment.contratSignedAt) {
      throw new ForbiddenException("Contrat déjà signé");
    }
    if (!assignment.contratPdfUrl) {
      throw new BadRequestException("Générer le contrat avant signature");
    }

    const now = new Date().toISOString();
    const updated: SousTraitantAssignment = {
      ...assignment,
      contratSignedAt: now,
      contratSignedBy: actorId ?? "unknown",
      status: "CONTRACTED",
      updatedAt: now,
    };
    await this.replaceAssignment(dossier, updated);

    await this.safeAppendLog({
      kind: "ST_CONTRAT_SIGNED",
      tome: "tome3",
      rule_id: "T3-R-ST-CONTRAT-001",
      dossierId: dossier.id,
      assignmentId: updated.id,
      hash: updated.contratHash,
      signedAt: now,
      signedBy: actorId,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────── Situations

  async declareSituation(
    assignmentId: string,
    input: SituationDeclareInput,
    declaredBy?: string,
  ): Promise<SituationTravaux> {
    if (!Number.isFinite(input?.pctAvancement)) {
      throw new BadRequestException("pctAvancement requis");
    }
    if (input.pctAvancement < 0 || input.pctAvancement > 100) {
      throw new BadRequestException("pctAvancement hors plage (0..100)");
    }

    const { assignment, dossier } = await this.getOne(assignmentId);
    if (assignment.status === "TERMINATED") {
      throw new ForbiddenException("Sous-traitant résilié");
    }
    if (!assignment.contratSignedAt) {
      throw new ForbiddenException("Contrat non signé — situation impossible");
    }

    const previousCumul = assignment.situations.reduce(
      (max, s) => (s.validatedAt && s.pctAvancement > max ? s.pctAvancement : max),
      0,
    );
    if (input.pctAvancement < previousCumul) {
      throw new BadRequestException(
        `pctAvancement (${input.pctAvancement}) < cumul validé précédent (${previousCumul})`,
      );
    }

    const pctIncrement = Math.max(0, input.pctAvancement - previousCumul);
    const montantPaiement = Math.round(
      (pctIncrement / 100) * assignment.montantHt * (1 + assignment.tva / 100) * 100,
    ) / 100;

    const situation: SituationTravaux = {
      id: randomUUID(),
      declaredAt: new Date().toISOString(),
      declaredBy: declaredBy ?? "unknown",
      pctAvancement: input.pctAvancement,
      pctIncrement,
      montantPaiement,
      photos: (input.photos ?? []).slice(0, 30),
      commentaire: input.commentaire?.slice(0, 2000),
    };

    const updated: SousTraitantAssignment = {
      ...assignment,
      situations: [...assignment.situations, situation],
      status: assignment.status === "CONTRACTED" ? "IN_PROGRESS" : assignment.status,
      updatedAt: new Date().toISOString(),
    };
    await this.replaceAssignment(dossier, updated);

    return situation;
  }

  async validateSituation(
    assignmentId: string,
    sitId: string,
    validatedBy?: string,
  ): Promise<{ assignment: SousTraitantAssignment; situation: SituationTravaux }> {
    const { assignment, dossier } = await this.getOne(assignmentId);
    const sit = assignment.situations.find((s) => s.id === sitId);
    if (!sit) throw new NotFoundException("Situation introuvable");
    if (sit.validatedAt) throw new BadRequestException("Situation déjà validée");

    const now = new Date().toISOString();
    sit.validatedAt = now;
    sit.validatedBy = validatedBy ?? "unknown";

    // Déclencheur paiement échelonné (intégration Stripe/escrow).
    // MVP : on simule via marquage paidAt + paymentRef. Hook réel = appel
    // StripeCheckoutController.releaseEscrow(...) qui n'existe pas encore.
    const paymentRef = `ESCROW-${assignment.id.slice(0, 8)}-${Date.now()}`;
    sit.paidAt = now;
    sit.paymentRef = paymentRef;

    // Si cumul atteint 100 %, marque COMPLETED
    const cumul = assignment.situations
      .filter((s) => s.validatedAt)
      .reduce((max, s) => (s.pctAvancement > max ? s.pctAvancement : max), 0);

    const updated: SousTraitantAssignment = {
      ...assignment,
      situations: [...assignment.situations],
      status: cumul >= 100 ? "COMPLETED" : assignment.status,
      updatedAt: now,
    };
    await this.replaceAssignment(dossier, updated);

    await this.safeAppendLog({
      kind: "ST_SITUATION_VALIDATED",
      tome: "tome3",
      rule_id: "T3-R-ST-SITUATION-001",
      dossierId: dossier.id,
      assignmentId: updated.id,
      situationId: sit.id,
      pctAvancement: sit.pctAvancement,
      pctIncrement: sit.pctIncrement,
      montantPaiement: sit.montantPaiement,
      paymentRef,
      validatedAt: now,
      validatedBy,
    });

    return { assignment: updated, situation: sit };
  }

  async rejectSituation(
    assignmentId: string,
    sitId: string,
    motif: string,
    actorId?: string,
  ): Promise<SousTraitantAssignment> {
    const { assignment, dossier } = await this.getOne(assignmentId);
    const sit = assignment.situations.find((s) => s.id === sitId);
    if (!sit) throw new NotFoundException("Situation introuvable");
    if (sit.validatedAt) throw new BadRequestException("Situation déjà validée");
    sit.rejetMotif = String(motif ?? "").slice(0, 1000) || "Sans motif";
    const updated: SousTraitantAssignment = {
      ...assignment,
      situations: [...assignment.situations],
      updatedAt: new Date().toISOString(),
    };
    await this.replaceAssignment(dossier, updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────── Évaluation

  async evaluate(assignmentId: string, input: EvaluationInput, evaluatedBy: string): Promise<SousTraitantAssignment> {
    const { assignment, dossier } = await this.getOne(assignmentId);
    if (assignment.evaluation) {
      throw new BadRequestException("Évaluation déjà enregistrée");
    }
    if (assignment.status !== "COMPLETED" && assignment.status !== "TERMINATED") {
      throw new ForbiddenException(
        `Évaluation possible uniquement après mission (status=${assignment.status})`,
      );
    }

    const evaluation = this.evaluation.buildEvaluation(input, evaluatedBy);
    const updated: SousTraitantAssignment = {
      ...assignment,
      evaluation,
      updatedAt: new Date().toISOString(),
    };
    await this.replaceAssignment(dossier, updated);

    await this.safeAppendLog({
      kind: "ST_EVALUATED",
      tome: "tome3",
      rule_id: "T3-R-ST-EVAL-001",
      dossierId: dossier.id,
      assignmentId: updated.id,
      supplierUserId: updated.supplierUserId,
      scoreMoyen: evaluation.scoreMoyen,
      l7Bonus: this.evaluation.toL7Bonus(evaluation.scoreMoyen),
      evaluatedAt: evaluation.evaluatedAt,
      evaluatedBy,
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────── Historique

  async historique(assignmentId: string): Promise<{
    assignment: SousTraitantAssignment;
    timeline: Array<{ at: string; type: string; payload: any }>;
  }> {
    const { assignment } = await this.getOne(assignmentId);
    const timeline: Array<{ at: string; type: string; payload: any }> = [];

    timeline.push({
      at: assignment.createdAt,
      type: "ASSIGNED",
      payload: { lotCode: assignment.lotCode, supplierCabinet: assignment.supplierCabinet, montantHt: assignment.montantHt },
    });

    if (assignment.contratSignedAt) {
      timeline.push({
        at: assignment.contratSignedAt,
        type: "CONTRAT_SIGNED",
        payload: { hash: assignment.contratHash, signedBy: assignment.contratSignedBy },
      });
    }

    for (const s of assignment.situations) {
      timeline.push({
        at: s.declaredAt,
        type: "SITUATION_DECLARED",
        payload: { id: s.id, pctAvancement: s.pctAvancement, pctIncrement: s.pctIncrement, montantPaiement: s.montantPaiement },
      });
      if (s.validatedAt) {
        timeline.push({
          at: s.validatedAt,
          type: "SITUATION_VALIDATED",
          payload: { id: s.id, validatedBy: s.validatedBy, paymentRef: s.paymentRef },
        });
      }
      if (s.paidAt) {
        timeline.push({
          at: s.paidAt,
          type: "PAIEMENT",
          payload: { id: s.id, montant: s.montantPaiement, ref: s.paymentRef },
        });
      }
    }

    if (assignment.evaluation) {
      timeline.push({
        at: assignment.evaluation.evaluatedAt,
        type: "EVALUATED",
        payload: { scoreMoyen: assignment.evaluation.scoreMoyen, by: assignment.evaluation.evaluatedBy },
      });
    }

    timeline.sort((a, b) => a.at.localeCompare(b.at));
    return { assignment, timeline };
  }

  // ─────────────────────────────────────────────────────────── Audit loi 32-99

  async auditLoi32_99(dossierId: string): Promise<Loi32_99AuditResult> {
    const assignments = await this.listByDossier(dossierId);
    const anomalies: Loi32_99AuditResult["anomalies"] = [];

    // Détection : montants > 250 000 MAD HT requièrent contrat écrit ET déclaration
    // (loi 32-99 art. 4 + jurisprudence FNBTP)
    const SEUIL_DECLARATION_MAD = 250_000;
    // Seuil "montant hors norme" pour déclencher revue : 30 % du marché lot
    // moyen — heuristique. Affinable plus tard.
    const SEUIL_MONTANT_ANORMAL = 5_000_000;

    let declared = 0;
    let undeclared = 0;
    let missingAgrement = 0;

    for (const a of assignments) {
      if (a.loi32_99_declared) declared++;
      else undeclared++;

      // Non déclaration alors que montant > seuil
      if (!a.loi32_99_declared && a.montantHt >= SEUIL_DECLARATION_MAD) {
        anomalies.push({
          assignmentId: a.id,
          lotCode: a.lotCode,
          supplierCabinet: a.supplierCabinet,
          severity: "CRITICAL",
          code: "ST_UNDECLARED",
          message: `Sous-traitant non déclaré pour montant ${a.montantHt} MAD ≥ seuil ${SEUIL_DECLARATION_MAD} (loi 32-99 art. 4).`,
        });
      }

      // Agrément manquant sur lot qui l'exige
      const lot = LOTS_TPHI.find((l) => l.code === a.lotCode);
      if (lot?.agrementRequis && !a.supplierAgrements.length) {
        missingAgrement++;
        anomalies.push({
          assignmentId: a.id,
          lotCode: a.lotCode,
          supplierCabinet: a.supplierCabinet,
          severity: "CRITICAL",
          code: "AGREMENT_MISSING",
          message: `Lot ${lot.intitule} requiert un agrément qualification — aucun agrément déclaré.`,
        });
      }

      // Contrat non signé alors qu'IN_PROGRESS
      if (a.status === "IN_PROGRESS" && !a.contratSignedAt) {
        anomalies.push({
          assignmentId: a.id,
          lotCode: a.lotCode,
          supplierCabinet: a.supplierCabinet,
          severity: "CRITICAL",
          code: "CONTRAT_NON_SIGNE",
          message: "Travaux engagés sans contrat écrit signé (loi 32-99 art. 3).",
        });
      }

      // Montant anormal
      if (a.montantHt >= SEUIL_MONTANT_ANORMAL) {
        anomalies.push({
          assignmentId: a.id,
          lotCode: a.lotCode,
          supplierCabinet: a.supplierCabinet,
          severity: "WARN",
          code: "MONTANT_HORS_NORME",
          message: `Montant ${a.montantHt} MAD ≥ seuil revue ${SEUIL_MONTANT_ANORMAL}.`,
        });
      }

      // Paiement direct non tracé : situation validée + paidAt mais paymentRef vide
      for (const s of a.situations) {
        if (s.paidAt && !s.paymentRef) {
          anomalies.push({
            assignmentId: a.id,
            lotCode: a.lotCode,
            supplierCabinet: a.supplierCabinet,
            severity: "WARN",
            code: "PAIEMENT_DIRECT_NON_TRACE",
            message: `Situation ${s.id} payée sans référence escrow/banque (loi 32-99 art. 7).`,
          });
        }
      }
    }

    const conformite: Loi32_99AuditResult["conformite"] =
      anomalies.some((x) => x.severity === "CRITICAL")
        ? "NON_CONFORME"
        : anomalies.length
          ? "ANOMALIES"
          : "CONFORME";

    return {
      dossierId,
      totalAssignments: assignments.length,
      declared,
      undeclared,
      missingAgrement,
      anomalies,
      conformite,
      auditedAt: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────── Internals

  private async loadDossier(dossierId: string): Promise<DossierLite> {
    const d = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { id: true, ownerId: true, refInterne: true, payload: true },
    });
    if (!d) throw new NotFoundException("Dossier introuvable");
    return d as DossierLite;
  }

  private async findAssignmentAnywhere(
    assignmentId: string,
  ): Promise<{ assignment: SousTraitantAssignment; dossier: DossierLite } | null> {
    const dossiers = (await this.prisma.dossier.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: { id: true, ownerId: true, refInterne: true, payload: true },
    })) as DossierLite[];
    for (const d of dossiers) {
      const bag = this.readBag(d);
      const a = bag.find((x) => x.id === assignmentId);
      if (a) return { assignment: a, dossier: d };
    }
    return null;
  }

  private readBag(dossier: DossierLite): SousTraitantAssignment[] {
    const payload =
      dossier.payload && typeof dossier.payload === "object"
        ? (dossier.payload as Record<string, unknown>)
        : {};
    const raw = (payload as any)[ST_PAYLOAD_KEY];
    return Array.isArray(raw) ? (raw as SousTraitantAssignment[]) : [];
  }

  private async writeBag(dossier: DossierLite, bag: SousTraitantAssignment[]): Promise<void> {
    const payload =
      dossier.payload && typeof dossier.payload === "object"
        ? { ...(dossier.payload as Record<string, unknown>) }
        : {};
    (payload as any)[ST_PAYLOAD_KEY] = bag;
    await this.prisma.dossier.update({
      where: { id: dossier.id },
      data: { payload: payload as any },
    });
  }

  private async replaceAssignment(dossier: DossierLite, next: SousTraitantAssignment): Promise<void> {
    const bag = this.readBag(dossier);
    const idx = bag.findIndex((a) => a.id === next.id);
    if (idx >= 0) bag[idx] = next;
    else bag.push(next);
    await this.writeBag(dossier, bag);
  }

  private async safeAppendLog(payload: Record<string, any>): Promise<void> {
    try {
      await this.probative.append(payload);
    } catch (e: any) {
      this.logger.warn(`probative append failed: ${e?.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────── Contrat loi 32-99

  /**
   * Génère le HTML d'un contrat de sous-traitance conforme à la loi 32-99
   * (art. 2-13). Le PDF est rendu côté front via window.print() au MVP.
   */
  private renderContratHtmlLoi32_99(a: SousTraitantAssignment): string {
    const dt = (s: string) => new Date(s).toLocaleDateString("fr-FR");
    const fmt = (n: number) =>
      new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(n);

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Contrat de sous-traitance ${a.lotCode} — ${a.supplierCabinet}</title>
<style>
  body{font-family:Arial,sans-serif;color:#0f172a;max-width:780px;margin:24px auto;padding:0 24px;line-height:1.5}
  h1{font-size:20px;text-align:center;border-bottom:2px solid #0f172a;padding-bottom:8px}
  h2{font-size:14px;color:#1e40af;margin-top:24px;border-left:4px solid #1e40af;padding-left:8px}
  .meta{background:#f1f5f9;padding:12px;border-radius:6px;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
  td,th{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
  th{background:#e2e8f0}
  .article{font-size:13px;margin:8px 0}
  .article strong{color:#1e40af}
  .signature{margin-top:48px;display:flex;justify-content:space-between;gap:32px}
  .signature div{flex:1;border-top:1px solid #0f172a;padding-top:8px;font-size:12px;text-align:center}
  .legal{margin-top:24px;font-size:11px;color:#64748b;font-style:italic}
</style></head>
<body>
<h1>CONTRAT DE SOUS-TRAITANCE</h1>
<p style="text-align:center;font-size:12px;color:#64748b">Conforme à la loi marocaine n° 32-99 relative à la sous-traitance dans le BTP</p>

<h2>Identification des parties</h2>
<div class="meta">
  <p><strong>Maître d'œuvre (entrepreneur principal)</strong> : CITURBAREA (MOD délégué pour le dossier <code>${a.dossierId}</code>)</p>
  <p><strong>Sous-traitant</strong> : ${a.supplierCabinet}${a.supplierClasse ? ` — ${a.supplierClasse}` : ""}</p>
  ${a.supplierEmail ? `<p><strong>Contact</strong> : ${a.supplierEmail}${a.supplierPhone ? ` · ${a.supplierPhone}` : ""}</p>` : ""}
  ${a.supplierAgrements.length ? `<p><strong>Agréments détenus</strong> : ${a.supplierAgrements.join(", ")}</p>` : "<p><strong>Agréments</strong> : non déclarés</p>"}
</div>

<h2>Article 1 — Objet</h2>
<p class="article">Le sous-traitant s'engage à réaliser, sous sa propre responsabilité, les travaux du
<strong>${a.lotIntitule}</strong> (référence ${a.lotCode}) du chantier objet du dossier ${a.dossierId},
conformément aux pièces écrites du marché principal, aux règles de l'art et aux normes en vigueur.</p>

<h2>Article 2 — Prix et modalités de paiement (loi 32-99 art. 6 & 7)</h2>
<table>
  <tr><th>Montant HT</th><td>${fmt(a.montantHt)}</td></tr>
  <tr><th>TVA</th><td>${a.tva} %</td></tr>
  <tr><th>Montant TTC</th><td>${fmt(a.montantTtc)}</td></tr>
  <tr><th>Devise</th><td>${a.devise}</td></tr>
  <tr><th>Retenue de garantie</th><td>${a.conditions.retenueGarantie ?? 0} %</td></tr>
</table>
<p class="article">Le paiement est effectué par <strong>situations échelonnées</strong> sur attestation
d'avancement validée par le chef de chantier. Conformément à l'article 7 de la loi 32-99, le maître d'ouvrage
peut être appelé à régler directement le sous-traitant en cas de défaillance du maître d'œuvre dans un délai
de 30 jours.</p>

<h2>Article 3 — Délai d'exécution</h2>
<p class="article"><strong>Délai contractuel</strong> : ${a.conditions.delaiJours} jours calendaires à compter de l'ordre de service.</p>
${
  a.conditions.penaliteJours
    ? `<p class="article"><strong>Pénalités de retard</strong> : ${a.conditions.penaliteJours} ‰ du montant HT par jour calendaire de retard.</p>`
    : ""
}

<h2>Article 4 — Garanties</h2>
<p class="article">${a.conditions.garantie ?? "Garantie de parfait achèvement (1 an) et garantie décennale conformément aux articles 769 et 779 du DOC marocain."}</p>

<h2>Article 5 — Obligations légales (loi 32-99 art. 3 & 4)</h2>
<p class="article">Le sous-traitant déclare disposer des qualifications, classifications et agréments requis.
Il s'engage à <strong>déclarer cette sous-traitance au maître d'ouvrage</strong> via la plateforme CITURBAREA
(${a.loi32_99_declared ? "déclaration enregistrée" : "DÉCLARATION MANQUANTE — À RÉGULARISER"}).</p>

<h2>Article 6 — Responsabilités et assurances</h2>
<p class="article">Le sous-traitant souscrit les polices d'assurances chantier, responsabilité civile professionnelle
et décennale. Une attestation valide doit être jointe au présent contrat.</p>

<h2>Article 7 — Réception et évaluation</h2>
<p class="article">À l'achèvement, une réception est prononcée par le chef de chantier. Une évaluation finale
(qualité, délai, communication, relation) est consignée sur la plateforme CITURBAREA et alimente le score
de qualification professionnelle du sous-traitant.</p>

<h2>Article 8 — Loi applicable et juridiction</h2>
<p class="article">Le présent contrat est régi par la loi marocaine. Tout litige sera porté devant le tribunal
de commerce du lieu d'exécution des travaux, après tentative de conciliation amiable.</p>

<div class="signature">
  <div>Pour le maître d'œuvre<br><br>Date / Signature</div>
  <div>Pour le sous-traitant<br><br>Date / Signature</div>
</div>

<p class="legal">Document généré le ${dt(new Date().toISOString())} via CITURBAREA — empreinte probatoire chaînée.</p>
</body></html>`;
  }
}
