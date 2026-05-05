import { Injectable } from "@nestjs/common";
import {
  ClasseBTP, CategorieAgrement, P6Type, P6ValidationStatus,
  DOCUMENTS_REQUIS_PRESTATAIRE, DOCUMENTS_REQUIS_FOURNISSEUR,
} from "./registry";

/**
 * P6 Scoring Service — Calcul du score interne CITURBAREA L7
 *
 * Doctrine: ce score override les classifications externes.
 * Il sert à :
 *  - Filtrer/ranker les prestataires lors d'une consultation
 *  - Restreindre l'accès aux dossiers selon la classe minimale requise
 *  - Détecter les profils non-conformes (alertes admin)
 *
 * Échelle: 0-100 (calculs proportionnels, additifs avec plafonds)
 *
 * Composantes:
 *  - Classe BTP officielle             (max 30 points: classe 1=30 / classe 7=4)
 *  - Catégorie d'agrément valide       (max 15 points)
 *  - Documents administratifs complets (max 25 points)
 *  - Décennale + RC pro valides        (max 15 points)
 *  - Références chantiers + photos     (max 10 points)
 *  - Bonus ancienneté (>5 ans)         (max 5 points)
 */

const CLASSE_POINTS: Record<ClasseBTP, number> = {
  "1": 30, "2": 26, "3": 22, "4": 18, "5": 14, "6": 10, "7": 6,
};

export type P6FicheInput = {
  type: P6Type;
  // Identité
  raisonSociale: string;
  rc?: string;
  ice?: string;
  patente?: string;
  // Classification BTP (si PRESTATAIRE_SERVICE)
  classeBTP?: ClasseBTP;
  categoriesAgrement?: CategorieAgrement[];
  agrementMetleNumero?: string;
  agrementMetleValidite?: string; // ISO date
  ordreInscription?: string; // ex: "CNOA #1234"
  // Documents (présence true/false)
  documents?: Record<string, boolean>;
  // Métriques
  decennaleValide?: boolean;
  rcProValide?: boolean;
  nbReferences?: number;
  nbPhotosChantiers?: number;
  ancienneteAnnees?: number;
  // Catalogue (FOURNISSEUR_MATERIAUX)
  nbMateriauxCatalogue?: number;
  zonesFourniture?: string[];
};

export type P6ScoreResult = {
  score: number;        // 0-100
  tier: "GOLD" | "SILVER" | "BRONZE" | "INSUFFICIENT";
  status: P6ValidationStatus;
  breakdown: {
    classe: number;
    agrement: number;
    documents: number;
    assurances: number;
    references: number;
    anciennete: number;
  };
  missingDocuments: string[];
  warnings: string[];
  recommendations: string[];
};

@Injectable()
export class P6ScoringService {
  computeScore(input: P6FicheInput): P6ScoreResult {
    const breakdown = {
      classe: this.scoreClasse(input),
      agrement: this.scoreAgrement(input),
      documents: this.scoreDocuments(input),
      assurances: this.scoreAssurances(input),
      references: this.scoreReferences(input),
      anciennete: this.scoreAnciennete(input),
    };
    const score = Math.round(
      breakdown.classe + breakdown.agrement + breakdown.documents +
      breakdown.assurances + breakdown.references + breakdown.anciennete
    );

    const tier =
      score >= 80 ? "GOLD" :
      score >= 60 ? "SILVER" :
      score >= 40 ? "BRONZE" :
      "INSUFFICIENT";

    const missingDocuments = this.checkMissingDocuments(input);
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (input.type === "PRESTATAIRE_SERVICE") {
      if (!input.classeBTP) warnings.push("Aucune classe BTP renseignée — l'éligibilité aux marchés publics est limitée.");
      if (!input.decennaleValide) warnings.push("Police décennale non valide ou non renseignée — bloquant pour la majorité des dossiers.");
      if (!input.rcProValide) warnings.push("RC professionnelle manquante.");
      if (!input.ancienneteAnnees || input.ancienneteAnnees < 2) warnings.push("Ancienneté inférieure à 2 ans — accès restreint aux gros chantiers.");
      if ((input.nbReferences ?? 0) < 3) recommendations.push("Ajouter au moins 3 références chantiers pour améliorer le score.");
      if ((input.nbPhotosChantiers ?? 0) < 5) recommendations.push("Joindre 5+ photos de chantiers terminés (bonus de visibilité).");
    } else {
      if ((input.nbMateriauxCatalogue ?? 0) === 0) warnings.push("Aucun matériau dans le catalogue — la fiche n'est pas visible côté client.");
      if (!input.zonesFourniture?.length) warnings.push("Aucune zone de fourniture déclarée.");
    }

    if (missingDocuments.length > 0) recommendations.push(`Documents à fournir : ${missingDocuments.join(", ")}`);

    let status: P6ValidationStatus = "DRAFT";
    if (missingDocuments.length === 0 && tier !== "INSUFFICIENT") {
      status = "PENDING_REVIEW"; // prêt pour review admin
    } else if (missingDocuments.length > 0) {
      status = "NEEDS_DOCS";
    }

    return { score, tier, status, breakdown, missingDocuments, warnings, recommendations };
  }

  private scoreClasse(input: P6FicheInput): number {
    if (input.type !== "PRESTATAIRE_SERVICE") return 0;
    if (!input.classeBTP) return 0;
    return CLASSE_POINTS[input.classeBTP] ?? 0;
  }

  private scoreAgrement(input: P6FicheInput): number {
    if (input.type !== "PRESTATAIRE_SERVICE") return 0;
    let pts = 0;
    if (input.categoriesAgrement?.length) pts += 8;
    if (input.agrementMetleNumero && input.agrementMetleValidite) {
      const valid = new Date(input.agrementMetleValidite).getTime() > Date.now();
      if (valid) pts += 5;
    }
    if (input.ordreInscription) pts += 2;
    return Math.min(15, pts);
  }

  private scoreDocuments(input: P6FicheInput): number {
    const required = input.type === "PRESTATAIRE_SERVICE"
      ? DOCUMENTS_REQUIS_PRESTATAIRE.filter(d => d.obligatoire)
      : DOCUMENTS_REQUIS_FOURNISSEUR.filter(d => d.obligatoire);
    if (required.length === 0) return 25;
    const provided = required.filter(d => input.documents?.[d.slug] === true).length;
    const ratio = provided / required.length;
    return Math.round(25 * ratio);
  }

  private scoreAssurances(input: P6FicheInput): number {
    if (input.type !== "PRESTATAIRE_SERVICE") return 15; // N/A pour fournisseurs (non bloquant)
    let pts = 0;
    if (input.decennaleValide) pts += 10;
    if (input.rcProValide) pts += 5;
    return pts;
  }

  private scoreReferences(input: P6FicheInput): number {
    if (input.type === "FOURNISSEUR_MATERIAUX") {
      // Pour fournisseurs: score basé sur catalogue
      const nbMat = input.nbMateriauxCatalogue ?? 0;
      if (nbMat >= 50) return 10;
      if (nbMat >= 20) return 7;
      if (nbMat >= 5) return 4;
      return 0;
    }
    let pts = 0;
    const refs = input.nbReferences ?? 0;
    if (refs >= 10) pts += 6;
    else if (refs >= 5) pts += 4;
    else if (refs >= 3) pts += 2;
    const photos = input.nbPhotosChantiers ?? 0;
    if (photos >= 10) pts += 4;
    else if (photos >= 5) pts += 2;
    return Math.min(10, pts);
  }

  private scoreAnciennete(input: P6FicheInput): number {
    const ans = input.ancienneteAnnees ?? 0;
    if (ans >= 15) return 5;
    if (ans >= 10) return 4;
    if (ans >= 5) return 3;
    if (ans >= 3) return 2;
    if (ans >= 1) return 1;
    return 0;
  }

  private checkMissingDocuments(input: P6FicheInput): string[] {
    const required = input.type === "PRESTATAIRE_SERVICE"
      ? DOCUMENTS_REQUIS_PRESTATAIRE.filter(d => d.obligatoire)
      : DOCUMENTS_REQUIS_FOURNISSEUR.filter(d => d.obligatoire);
    return required
      .filter(d => input.documents?.[d.slug] !== true)
      .map(d => d.label);
  }
}
