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
import TerrainsModule from "./modules/terrains/TerrainsModule";
import RendezVousModule from "./modules/rendezvous/RendezVousModule";
import AppelsModule from "./modules/appels/AppelsModule";
import MessagesModule from "./modules/messages/MessagesModule";
import DocumentsModule from "./modules/documents/DocumentsModule";
import ProjetsModule from "./modules/projets/ProjetsModule";
import { Routes, Route, Navigate } from 'react-router-dom';
import CCLayout from './layout/CCLayout';
import LeadsModule from './modules/leads/LeadsModule';
import FournisseursModule from './modules/fournisseurs/FournisseursModule';
import MateriauxModule from './modules/materiaux/MateriauxModule';
import CCLogin from './pages/CCLogin';
import CCSimulateur from './modules/dossiers/CCSimulateur';
import DossiersListe from './modules/dossiers/DossiersListe';
import FicheDossier from './modules/dossiers/FicheDossier';
import NouveauDossierAdmin from './modules/dossiers/creation/NouveauDossierAdmin';
import EnSommeil from '../ui/EnSommeil';
import TableauDeBordGestion from './modules/gestion/TableauDeBordGestion';

/**
 * Accès au back-office : la Pages Function /api/cc/session dit si la requête
 * est passée par Cloudflare Access (admin.citurbarea.com) ou porte le cookie
 * de session posé par /api/cc/login. (Les jetons de l'API NestJS éteinte ne
 * sont plus acceptés.)
 */
function CCGuard({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = useState<'verif' | 'ok' | 'refuse'>('verif');
  useEffect(() => {
    if (etat !== 'verif') return;
    fetch('/api/cc/session', { credentials: 'include' })
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
              <Route index element={<Navigate to="leads" replace />} />
              {/* Tableau de bord de gestion de projet (GP4) : échéances et rappels J−90 / J−30 / J−7. */}
              <Route path="dashboard" element={<TableauDeBordGestion />} />
              <Route path="leads/*" element={<LeadsModule />} />
              <Route path="rendez-vous" element={<RendezVousModule />} />
              <Route path="appels" element={<AppelsModule />} />
              <Route path="messages" element={<MessagesModule />} />
              <Route path="documents" element={<DocumentsModule />} />
              <Route path="fournisseurs" element={<FournisseursModule />} />
              <Route path="inscrits" element={<Navigate to="/cc/fournisseurs" replace />} />
              <Route path="validations" element={<Navigate to="/cc/fournisseurs" replace />} />
              <Route path="dossiers" element={<DossiersListe />} />
              <Route path="dossiers/nouveau" element={<NouveauDossierAdmin />} />
              {/* Fiche dossier (lot 3c) : parcours A → Z, déblocage, lien client, vue client. */}
              <Route path="dossiers/:id" element={<FicheDossier />} />
              <Route path="dossiers/:id/shadow" element={<FicheDossier vueClientInitiale />} />
              <Route path="terrains" element={<TerrainsModule />} />
              <Route path="materiaux" element={<MateriauxModule />} />
              <Route path="projets/*" element={<ProjetsModule />} />
              <Route path="simulateur" element={<CCSimulateur />} />
              {/* En sommeil : modules de l'API NestJS éteinte (docs/architecture/plan-rebranchement.md). */}
              <Route path="visites" element={<EnSommeil variante="admin" module="Visites" alternative={{ to: "/cc/leads", libelle: "Formulaires abandonnés (onglet des leads)" }} />} />
              <Route path="seo" element={<EnSommeil variante="admin" module="SEO / GEO" />} />
              <Route path="media/*" element={<EnSommeil variante="admin" module="Médias" />} />
              <Route path="publicite" element={<EnSommeil variante="admin" module="Régie publicitaire" />} />
              <Route path="projects/*" element={<EnSommeil variante="admin" module="Projets" alternative={{ to: "/cc/dossiers", libelle: "Dossiers" }} />} />
              <Route path="territorial/*" element={<EnSommeil variante="admin" module="Intelligence territoire" />} />
              <Route path="business/*" element={<EnSommeil variante="admin" module="Business" />} />
              <Route path="devis" element={<EnSommeil variante="admin" module="Devis libre" alternative={{ to: "/cc/simulateur", libelle: "Simulateur (honoraires et chiffrage)" }} />} />
              <Route path="dossiers/:id/devis" element={<EnSommeil variante="admin" module="Devis du dossier" alternative={{ to: "/cc/simulateur", libelle: "Simulateur" }} />} />
              <Route path="archive" element={<EnSommeil variante="admin" module="Archive" />} />
              <Route path="archive/:id" element={<EnSommeil variante="admin" module="Archive" />} />
              <Route path="live" element={<EnSommeil variante="admin" module="Live" />} />
              <Route path="firms/*" element={<EnSommeil variante="admin" module="Cabinets" />} />
              <Route path="sig" element={<EnSommeil variante="admin" module="SIG · PA" />} />
              <Route path="*" element={<Navigate to="leads" replace />} />
            </Routes>
          </CCLayout>
        </CCGuard>
      } />
    </Routes>
  );
}
