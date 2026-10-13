import React, { createContext, useContext } from 'react';

interface FirmCtx {
  slug: string | null;
  name: string | null;
  firmId: string | null;
  isMaster: boolean;
}

const MASTER: FirmCtx = { slug: null, name: null, firmId: null, isMaster: true };

const FirmContext = createContext<FirmCtx>(MASTER);

/**
 * Cabinets en marque blanche (sous-domaine → /firms/:slug) : servis par l'API
 * NestJS, éteinte. Sans route équivalente dans functions/, tout le monde est
 * « master » (module firms en sommeil, docs/architecture/plan-rebranchement.md).
 */
export function FirmProvider({ children }: { children: React.ReactNode }) {
  return <FirmContext.Provider value={MASTER}>{children}</FirmContext.Provider>;
}

export const useFirm = () => useContext(FirmContext);
