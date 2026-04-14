/**
 * CommandCenterApp.tsx
 * CITURBAREA COMMAND CENTER — Shell principal
 *
 * Route: /cc (protégée ADMIN/OWNER)
 * Intégration: ajouter dans apps/web/src/tomes/tome1/router/routes.tsx
 *
 * { path: '/cc/*', element: <ProtectedRoute roles={['ADMIN','OWNER']}><CommandCenterApp /></ProtectedRoute> }
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CCLayout from './layout/CCLayout';
import CCDashboard from './modules/dashboard/CCDashboard';
import MediaModule from './modules/media/MediaModule';
import LeadsModule from './modules/leads/LeadsModule';
import ProjectsModule from './modules/projects/ProjectsModule';
import TerritorialModule from './modules/territorial/TerritorialModule';
import BusinessModule from './modules/business/BusinessModule';
import DossiersModule from './modules/dossiers/DossiersModule';
import DossierDetail from './modules/dossiers/DossierDetail';
import PhaseWorkspace from './modules/dossiers/PhaseWorkspace';
import OwnerLive from './pages/OwnerLive';
import FirmsModule from './modules/firms/FirmsModule';
import CCLogin from './pages/CCLogin';
import { getToken } from '../tomes/tome4/apiClient';

export type CCModule =
  | 'dashboard'
  | 'media'
  | 'leads'
  | 'projects'
  | 'territorial'
  | 'business'
  | 'dossiers';

function CCGuard({ children }: { children: React.ReactNode }) {
  if (!getToken()) return <Navigate to="/cc/login" replace />;
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
              <Route path="projects/*" element={<ProjectsModule />} />
              <Route path="territorial/*" element={<TerritorialModule />} />
              <Route path="business/*" element={<BusinessModule />} />
              <Route path="dossiers" element={<DossiersModule />} />
              <Route path="dossiers/:id" element={<PhaseWorkspace />} />
              <Route path="live" element={<OwnerLive />} />
              <Route path="firms/*" element={<FirmsModule />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </CCLayout>
        </CCGuard>
      } />
    </Routes>
  );
}
