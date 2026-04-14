/**
 * Domain P1 - Catalog Service
 * Catégories dynamiques selon type projet et mode plan
 */

import type { ProjectType, PlanMode } from './types';

export interface CategoryField {
  id: string;
  label: string;
  type: 'select' | 'number' | 'radio' | 'text' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
  autoSet?: (value: any) => Record<string, any>;
}

export interface ProjectCategory {
  id: string;
  label: string;
  fields: CategoryField[];
}

export function getCategories(
  projectType: ProjectType,
  planMode: PlanMode
): ProjectCategory[] {
  
  if (projectType === 'villa') {
    return [
      {
        id: 'villa_type',
        label: 'Type de villa',
        fields: [
          {
            id: 'villaType',
            label: 'Configuration',
            type: 'radio',
            options: ['bande', 'jumelee', 'isolee'],
            required: true,
            autoSet: (value: string) => {
              // Auto-set facades selon type
              const facadesMap: Record<string, number> = {
                'bande': 2,
                'jumelee': 3,
                'isolee': 4,
              };
              return { facades: facadesMap[value] || 2 };
            },
          },
        ],
      },
      {
        id: 'villa_specs',
        label: 'Spécifications',
        fields: [
          {
            id: 'area',
            label: 'Surface construite (m²)',
            type: 'number',
            required: true,
            placeholder: 'Ex: 250',
          },
          {
            id: 'budget',
            label: 'Budget estimé (MAD)',
            type: 'number',
            required: true,
            placeholder: 'Ex: 800000',
          },
          {
            id: 'timeline',
            label: 'Délai souhaité',
            type: 'select',
            options: ['3 mois', '6 mois', '12 mois', '+12 mois'],
            required: true,
          },
        ],
      },
      {
        id: 'location',
        label: 'Localisation',
        fields: [
          {
            id: 'region',
            label: 'Région',
            type: 'select',
            options: [
              'Tanger-Tétouan-Al Hoceïma',
              'Oriental',
              'Fès-Meknès',
              'Rabat-Salé-Kénitra',
              'Béni Mellal-Khénifra',
              'Casablanca-Settat',
              'Marrakech-Safi',
              'Drâa-Tafilalet',
              'Souss-Massa',
              'Guelmim-Oued Noun',
              'Laâyoune-Sakia El Hamra',
              'Dakhla-Oued Ed-Dahab',
            ],
            required: true,
          },
          {
            id: 'province',
            label: 'Province',
            type: 'text',
            required: true,
            placeholder: 'Ex: Tanger-Assilah',
          },
          {
            id: 'commune',
            label: 'Commune',
            type: 'text',
            required: true,
            placeholder: 'Ex: Tanger',
          },
        ],
      },
    ];
  }
  
  if (projectType === 'immeuble') {
    return [
      {
        id: 'immeuble_specs',
        label: 'Spécifications immeuble',
        fields: [
          {
            id: 'niveau',
            label: 'Niveau',
            type: 'select',
            options: ['R+1', 'R+2', 'R+3', 'R+4'],
            required: true,
          },
          {
            id: 'typeLot',
            label: 'Type de lot',
            type: 'select',
            options: ['Appartement', 'Duplex', 'Local commercial', 'Bureau'],
            required: true,
          },
          {
            id: 'area',
            label: 'Surface (m²)',
            type: 'number',
            required: true,
            placeholder: 'Ex: 120',
          },
          {
            id: 'budget',
            label: 'Budget (MAD)',
            type: 'number',
            required: true,
            placeholder: 'Ex: 1500000',
          },
          {
            id: 'timeline',
            label: 'Délai souhaité',
            type: 'select',
            options: ['6 mois', '12 mois', '+12 mois'],
            required: true,
          },
        ],
      },
      {
        id: 'location',
        label: 'Localisation',
        fields: [
          {
            id: 'region',
            label: 'Région',
            type: 'select',
            options: [
              'Tanger-Tétouan-Al Hoceïma',
              'Rabat-Salé-Kénitra',
              'Casablanca-Settat',
              'Marrakech-Safi',
            ],
            required: true,
          },
          {
            id: 'province',
            label: 'Province',
            type: 'text',
            required: true,
          },
          {
            id: 'commune',
            label: 'Commune',
            type: 'text',
            required: true,
          },
        ],
      },
    ];
  }
  
  if (projectType === 'renovation') {
    return [
      {
        id: 'renovation_details',
        label: 'Détails rénovation',
        fields: [
          {
            id: 'description',
            label: 'Description du projet',
            type: 'textarea',
            required: true,
            placeholder: 'Décrivez votre projet de rénovation...',
          },
          {
            id: 'area',
            label: 'Surface (m²) - optionnel',
            type: 'number',
            required: false,
            placeholder: 'Ex: 150',
          },
          {
            id: 'budget',
            label: 'Budget estimé (MAD)',
            type: 'number',
            required: true,
            placeholder: 'Ex: 500000',
          },
          {
            id: 'timeline',
            label: 'Délai souhaité',
            type: 'select',
            options: ['1 mois', '3 mois', '6 mois', '+6 mois'],
            required: true,
          },
        ],
      },
      {
        id: 'location',
        label: 'Localisation',
        fields: [
          {
            id: 'region',
            label: 'Région',
            type: 'select',
            options: [
              'Tanger-Tétouan-Al Hoceïma',
              'Rabat-Salé-Kénitra',
              'Casablanca-Settat',
              'Marrakech-Safi',
            ],
            required: true,
          },
          {
            id: 'province',
            label: 'Province',
            type: 'text',
            required: true,
          },
          {
            id: 'commune',
            label: 'Commune',
            type: 'text',
            required: true,
          },
        ],
      },
    ];
  }
  
  return [];
}
