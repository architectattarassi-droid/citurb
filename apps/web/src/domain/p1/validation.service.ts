/**
 * Domain P1 - Validation Service
 * Validation stricte des données avec regex
 */

import type { ProjectType } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateContactData(data: any): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Prénom
  if (!data.firstname?.trim()) {
    errors.push({ field: 'firstname', message: 'Prénom requis' });
  }
  
  // Nom
  if (!data.lastname?.trim()) {
    errors.push({ field: 'lastname', message: 'Nom requis' });
  }
  
  // Email avec regex strict
  if (!data.email) {
    errors.push({ field: 'email', message: 'Email requis' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Email invalide' });
  }
  
  // Téléphone avec regex strict (format marocain)
  if (!data.phone) {
    errors.push({ field: 'phone', message: 'Téléphone requis' });
  } else {
    const cleanPhone = data.phone.replace(/\s/g, '');
    if (!/^0[67][0-9]{8}$/.test(cleanPhone)) {
      errors.push({ 
        field: 'phone', 
        message: 'Téléphone invalide (format: 06XXXXXXXX ou 07XXXXXXXX)' 
      });
    }
  }
  
  return errors;
}

export function validateProjectDetails(
  projectType: ProjectType,
  data: any
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Validation commune - Localisation
  if (!data.region?.trim()) {
    errors.push({ field: 'region', message: 'Région requise' });
  }
  
  if (!data.province?.trim()) {
    errors.push({ field: 'province', message: 'Province requise' });
  }
  
  if (!data.commune?.trim()) {
    errors.push({ field: 'commune', message: 'Commune requise' });
  }
  
  if (!data.timeline) {
    errors.push({ field: 'timeline', message: 'Délai requis' });
  }
  
  // Validation spécifique par type
  if (projectType === 'villa') {
    if (!data.villaType) {
      errors.push({ field: 'villaType', message: 'Type villa requis' });
    }
    
    if (!data.area || data.area < 50) {
      errors.push({ 
        field: 'area', 
        message: 'Surface minimale: 50m²' 
      });
    }
    
    if (!data.budget || data.budget < 200000) {
      errors.push({ 
        field: 'budget', 
        message: 'Budget minimal: 200,000 MAD' 
      });
    }
  }
  
  if (projectType === 'immeuble') {
    if (!data.niveau) {
      errors.push({ field: 'niveau', message: 'Niveau requis' });
    }
    
    if (!data.typeLot) {
      errors.push({ field: 'typeLot', message: 'Type lot requis' });
    }
    
    if (!data.area || data.area < 50) {
      errors.push({ 
        field: 'area', 
        message: 'Surface minimale: 50m²' 
      });
    }
    
    if (!data.budget || data.budget < 300000) {
      errors.push({ 
        field: 'budget', 
        message: 'Budget minimal: 300,000 MAD' 
      });
    }
  }
  
  if (projectType === 'renovation') {
    if (!data.description?.trim()) {
      errors.push({ field: 'description', message: 'Description requise' });
    }
    
    if (!data.budget || data.budget < 100000) {
      errors.push({ 
        field: 'budget', 
        message: 'Budget minimal: 100,000 MAD' 
      });
    }
  }
  
  return errors;
}

export function validateAll(
  projectType: ProjectType,
  contactData: any,
  projectDetails: any
): ValidationError[] {
  const contactErrors = validateContactData(contactData);
  const detailsErrors = validateProjectDetails(projectType, projectDetails);
  
  return [...contactErrors, ...detailsErrors];
}
