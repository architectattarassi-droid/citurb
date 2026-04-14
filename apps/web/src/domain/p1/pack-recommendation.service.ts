/**
 * Domain P1 - Pack Recommendation Service
 * Calcul recommandation + prix selon profil projet
 */

import type { P1Case } from './types';

export interface Pack {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  benefits: string[];
  suitable: 'plan_type' | 'plan_perso' | 'all';
}

export const PACKS: Pack[] = [
  {
    id: 'pack_plan_type',
    name: 'Pack Plan Type',
    description: 'Solution standardisée, délai rapide',
    basePrice: 19999,
    benefits: [
      'Plans d\'architecte complets',
      'Dossier administratif',
      'Estimation des coûts',
      'Assistance technique',
    ],
    suitable: 'plan_type',
  },
  {
    id: 'pack_signature',
    name: 'Pack Signature',
    description: 'Conception sur-mesure avec votre architecte',
    basePrice: 39999,
    benefits: [
      'Conception personnalisée',
      'Plans d\'exécution détaillés',
      'Suivi de chantier',
      'Garantie décennale',
    ],
    suitable: 'plan_perso',
  },
  {
    id: 'pack_design_plus',
    name: 'Pack Design+',
    description: 'Architecture signature avec designer',
    basePrice: 59999,
    benefits: [
      'Architecture signature',
      'Design intérieur inclus',
      'Matériaux premium',
      'Suivi VIP',
    ],
    suitable: 'plan_perso',
  },
];

export function getRecommendedPack(caseData: P1Case): Pack {
  // Plan Type → Pack Plan Type
  if (caseData.planMode === 'type') {
    return PACKS[0];
  }
  
  // Plan Perso → selon budget
  if (caseData.planMode === 'perso') {
    const budget = (caseData.projectDetails as any).budget || 0;
    
    // Budget < 1M → Signature
    // Budget >= 1M → Design+
    return budget >= 1000000 ? PACKS[2] : PACKS[1];
  }
  
  // Fallback
  return PACKS[0];
}

export function calculatePrice(pack: Pack, caseData: P1Case): number {
  const projectDetails = caseData.projectDetails as any;
  const area = projectDetails.area || 0;
  
  let price = pack.basePrice;
  
  // Multiplicateur surface
  if (area > 300) {
    price *= 1.2;
  } else if (area > 200) {
    price *= 1.1;
  }
  
  // Multiplicateur type projet
  if (caseData.projectType === 'immeuble') {
    price *= 1.3;
  }
  
  // Arrondir
  return Math.round(price);
}
