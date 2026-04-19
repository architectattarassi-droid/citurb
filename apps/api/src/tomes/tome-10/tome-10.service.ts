import { Injectable } from "@nestjs/common";

/**
 * Implémentation intentionnellement "safe":
 * - pas de dépendance DB ici (les repos Prisma seront branchés plus tard)
 * - retourne un contrat stable pour le front et pour les agents IA.
 */
@Injectable()
export class Tome10FinancingService {
  /**
   * Eligibilité doctrinale (P1): après au moins un plan payé.
   * En V1, on simplifie: on laisse le contrôleur renvoyer une règle lisible.
   */
  async getEligibility(projectId: string) {
    return {
      projectId,
      eligible: true,
      rule: "P1: financement accessible après paiement d'un plan (type ou personnalisé).",
      required: [
        "Plan payé (Order=PAID + Entitlement actif)",
        "Consentement client pour usage des données (PII)",
      ],
      next: ["prequal", "build_dossier"],
    };
  }

  /**
   * Pré-qualification: collecte guidée (profil + capacité).
   * Ici on stockera en DB plus tard (T0 DataLakeEntry + T10 FinancingProfile).
   */
  async createOrUpdatePrequal(projectId: string, payload: any) {
    return {
      projectId,
      status: "PREQUAL_SAVED",
      payload_redacted: {
        hasHousehold: !!payload?.household,
        hasBudgetHint: typeof payload?.projectBudgetHint === "number",
        cityHint: payload?.cityHint ?? null,
      },
      note:
        "Préqualification enregistrée (stub). La version DB sera branchée via Prisma + Orchestrator.",
    };
  }

  /**
   * Dossier bancaire prêt à déposer: document pack + checklists.
   * En V1, renvoie un plan de dossier; l'export final ira dans storage (T4).
   */
  async buildBankDossier(projectId: string, args: { bankPartnerId?: string; consent?: boolean }) {
    return {
      projectId,
      status: "DOSSIER_BUILT_STUB",
      bankPartnerId: args.bankPartnerId ?? "BANK_PARTNER_DEFAULT",
      consent: !!args.consent,
      dossier: {
        sections: [
          "1) Identité & Situation familiale",
          "2) Revenus & charges",
          "3) Projet (plan, surface, localisation, estimation)",
          "4) Devis & lots (si disponibles)",
          "5) Garanties & apports",
          "6) Checklist pièces + déclarations",
        ],
        outputs: [
          "PDF Dossier bancaire (redacted public)",
          "Pack pièces (private storage)",
          "Résumé scoring (DataProduct vendable)",
        ],
      },
      economics: {
        rule: "CITURBAREA prend une marge sur l'intermédiation si le financement est obtenu via partenaire.",
        trigger: "Après plan payé (pas besoin d'attendre autorisation)",
      },
    };
  }
}
