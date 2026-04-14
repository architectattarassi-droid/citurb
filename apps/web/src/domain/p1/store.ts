/**
 * Domain P1 - Store unifié (Zustand + persist)
 * Source unique de vérité pour l'état P1
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../../infrastructure/storage/keys';
import type { ProjectType, PlanMode, ContactData, ProjectDetails, P1Draft } from './types';

interface P1Store extends P1Draft {
  // Post-creation
  caseId: string | null;
  selectedPack: string | null;
  
  // Computed
  isQualificationComplete: boolean;
  canAnalyze: boolean;
  canCreateCase: boolean;
  
  // Actions
  setProjectType: (type: ProjectType) => void;
  setPlanMode: (mode: PlanMode) => void;
  setContactData: (data: ContactData) => void;
  setProjectDetails: (data: ProjectDetails) => void;
  
  createCase: () => Promise<string>;
  selectPack: (packId: string) => void;
  
  reset: () => void;
}

const initialState: P1Draft = {
  projectType: null,
  planMode: null,
  contactData: null,
  projectDetails: null,
};

export const useP1Store = create<P1Store>()(
  persist(
    (set, get) => ({
      ...initialState,
      caseId: null,
      selectedPack: null,
      isQualificationComplete: false,
      canAnalyze: false,
      canCreateCase: false,
      
      setProjectType: (type) => set({ projectType: type }),
      
      setPlanMode: (mode) => set({ planMode: mode }),
      
      setContactData: (data) => {
        set({ contactData: data });
        const state = get();
        if (state.projectType && state.planMode && state.projectDetails) {
          set({ canAnalyze: true });
        }
      },
      
      setProjectDetails: (data) => {
        set({ projectDetails: data });
        const state = get();
        if (state.projectType && state.planMode && state.contactData) {
          set({ 
            isQualificationComplete: true,
            canAnalyze: true,
            canCreateCase: true
          });
        }
      },
      
      createCase: async () => {
        const state = get();
        
        if (!state.isQualificationComplete) {
          throw new Error('Qualification incomplète');
        }
        
        const caseId = `case-${Date.now()}`;
        
        // Stockage du case
        const cases = JSON.parse(
          localStorage.getItem('citurbarea:cases') || '[]'
        );
        
        const caseData = {
          id: caseId,
          projectType: state.projectType!,
          planMode: state.planMode!,
          contactData: state.contactData!,
          projectDetails: state.projectDetails!,
          selectedPack: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: 'pending_otp' as const,
        };
        
        cases.push(caseData);
        localStorage.setItem('citurbarea:cases', JSON.stringify(cases));
        
        set({ 
          caseId,
          canCreateCase: false 
        });
        
        return caseId;
      },
      
      selectPack: (packId) => set({ selectedPack: packId }),
      
      reset: () => set({
        ...initialState,
        caseId: null,
        selectedPack: null,
        isQualificationComplete: false,
        canAnalyze: false,
        canCreateCase: false,
      }),
    }),
    {
      name: STORAGE_KEYS.P1_DRAFT,
    }
  )
);
