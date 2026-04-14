import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentFirmSlug, apiBase } from '../tomes/tome4/apiClient';

interface FirmCtx {
  slug: string | null;
  name: string | null;
  firmId: string | null;
  isMaster: boolean;
}

const FirmContext = createContext<FirmCtx>({
  slug: null, name: null, firmId: null, isMaster: true,
});

export function FirmProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<FirmCtx>({
    slug: null, name: null, firmId: null, isMaster: true,
  });

  useEffect(() => {
    const slug = getCurrentFirmSlug();
    if (!slug) return; // master — pas de firm résolue
    fetch(`${apiBase()}/firms/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then((firm: any) => {
        if (firm?.id) {
          setCtx({ slug: firm.slug, name: firm.name, firmId: firm.id, isMaster: false });
        }
      })
      .catch(() => {});
  }, []);

  return <FirmContext.Provider value={ctx}>{children}</FirmContext.Provider>;
}

export const useFirm = () => useContext(FirmContext);
