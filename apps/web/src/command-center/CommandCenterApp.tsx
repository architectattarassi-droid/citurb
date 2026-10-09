/**
 * CommandCenterApp.tsx
 * CITURBAREA COMMAND CENTER — Shell principal
 *
 * Route: /cc (protégée ADMIN/OWNER)
 * Intégration: ajouter dans apps/web/src/tomes/tome1/router/routes.tsx
 *
 * { path: '/cc/*', element: <ProtectedRoute roles={['ADMIN','OWNER']}><CommandCenterApp /></ProtectedRoute> }
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CCLayout from './layout/CCLayout';
import CCDashboard from './modules/dashboard/CCDashboard';
import MediaModule from './modules/media/MediaModule';
import LeadsModule from './modules/leads/LeadsModule';
import VisitorsModule from './modules/visitors/VisitorsModule';
import AdsModule from './modules/ads/AdsModule';
import SeoModule from './modules/seo/SeoModule';
import InscritsModule from './modules/inscrits/InscritsModule';
import FournisseursModule from './modules/fournisseurs/FournisseursModule';
import ProjectsModule from './modules/projects/ProjectsModule';
import TerritorialModule from './modules/territorial/TerritorialModule';
import BusinessModule from './modules/business/BusinessModule';
import DossiersModule from './modules/dossiers/DossiersModule';
import DossierDetail from './modules/dossiers/DossierDetail';
import PhaseWorkspace from './modules/dossiers/PhaseWorkspace';
import DossierShadowView from './modules/dossiers/DossierShadowView';
import DevisEditor from './modules/dossiers/DevisEditor';
import DevisLibre from './modules/dossiers/DevisLibre';
import ValidationsModule from './modules/validations/ValidationsModule';
import ArchiveModule from './modules/archive/ArchiveModule';
import ArchiveDossierView from './modules/archive/ArchiveDossierView';
import OwnerLive from './pages/OwnerLive';
import FirmsModule from './modules/firms/FirmsModule';
import CCLogin from './pages/CCLogin';
import SigExplorer from '../features/geo/SigExplorer';
import CCSimulateur from './modules/dossiers/CCSimulateur';
import { apiBase, getToken } from '../tomes/tome4/apiClient';

export type CCModule =
  | 'dashboard'
  | 'media'
  | 'leads'
  | 'projects'
  | 'territorial'
  | 'business'
  | 'dossiers';

/**
 * Sans JWT de l'API, on demande à la Pages Function /api/cc/session si la
 * requête est passée par Cloudflare Access (admin.citurbarea.com) : c'est
 * l'accès au back-office tant que l'API NestJS n'est pas hébergée.
 */
function CCGuard({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = useState<'verif' | 'ok' | 'refuse'>(getToken() ? 'ok' : 'verif');
  useEffect(() => {
    if (etat !== 'verif') return;
    fetch(`${apiBase()}/api/cc/session`, { credentials: 'include' })
      .then(r => setEtat(r.ok ? 'ok' : 'refuse'))
      .catch(() => setEtat('refuse'));
  }, [etat]);
  if (etat === 'verif') return <div style={{ padding: 24 }}>Vérification de l'accès…</div>;
  if (etat === 'refuse') return <Navigate to="/cc/login" replace />;
  return <>{children}</>;
}

export default function CommandCenterApp() {
  return (
    <Routes>
      <Route path="login" element={<CCLogin />} />
      <Route path="*" element={
        <CCGuard>
          <CCLayout>
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CCDashboard />} />
              <Route path="media/*" element={<MediaModule />} />
              <Route path="leads/*" element={<LeadsModule />} />
              <Route path="visites" element={<VisitorsModule />} />
              <Route path="publicite" element={<AdsModule />} />
              <Route path="seo" element={<SeoModule />} />
              <Route path="inscrits" element={<InscritsModule />} />
              <Route path="fournisseurs" element={<FournisseursModule />} />
              <Route path="projects/*" element={<ProjectsModule />} />
              <Route path="territorial/*" element={<TerritorialModule />} />
              <Route path="business/*" element={<BusinessModule />} />
              <Route path="dossiers" element={<DossiersModule />} />
              <Route path="devis" element={<DevisLibre />} />
              <Route path="simulateur" element={<CCSimulateur />} />
              <Route path="dossiers/:id" element={<PhaseWorkspace />} />
              <Route path="dossiers/:id/shadow" element={<DossierShadowView />} />
              <Route path="dossiers/:id/devis" element={<DevisEditor />} />
              <Route path="validations" element={<ValidationsModule />} />
              <Route path="archive" element={<ArchiveModule />} />
              <Route path="archive/:id" element={<ArchiveDossierView />} />
              <Route path="live" element={<OwnerLive />} />
              <Route path="firms/*" element={<FirmsModule />} />
              <Route path="sig" element={<SigExplorer mode="admin" />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </CCLayout>
        </CCGuard>
      } />
    </Routes>
  );
}
