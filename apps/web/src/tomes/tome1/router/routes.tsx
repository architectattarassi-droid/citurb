import React from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts";

import P1Home from "../../tome3/portals/p1/P1Home";
import P1Packs from "../../tome3/portals/p1/P1Packs";
import P1Dossier from "../../tome3/portals/p1/P1Dossier";
import P2Home from "../../tome3/portals/p2/P2Home";
import P3Home from "../../tome3/portals/p3/P3Home";

import Login from "../../tome5/pages/Login";
import VerifyPhone from "../../tome5/pages/VerifyPhone";

import LandingPage from "../../../ui/landing/LandingPage";
import { useAuth } from "../../tome5/AuthProvider";
import DevRoutesPage from "../../../ui/dev/DevRoutesPage";
import SimulatorPage from "../../../ui/simulateur/SimulatorPage";

import { CANON, REDIRECTS } from "../../../application/routeRegistry";
import CommandCenterApp from '../../../command-center/CommandCenterApp';
import { PorteLanding, VilleLanding } from '../../../ui/seo';

/**
 * V152-B1 — Canonisation Routes (memo)
 * Canon targets ONLY:
 * - / (landing)
 * - /login (login unique)
 * - /p1 (landing P1)
 * - /p1/packs (recap+packs)
 * - /p1/dossier (espace dossier)
 * - /_dev/routes (audit)
 *
 * Everything else: redirect internal to canon (no orphan, no unknown).
 */

const LandingRoute = () => {
  const auth = useAuth();
  // Invariant: landing générale reste atteignable même connecté.
  if (auth.loading) return <div style={{ padding: 24 }}>Chargement…</div>;
  return <LandingPage />;
};

const Redirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

export const router = createBrowserRouter([
  // Landing publique
  { path: CANON.HOME, element: <LandingRoute /> },

  // Command Center interne
  { path: '/cc/*', element: <CommandCenterApp /> },

  // Public routes
  {
    element: <PublicLayout />,
    children: [
      // Canon
      { path: CANON.LOGIN, element: <Login /> },
      { path: "/verify-phone", element: <VerifyPhone /> },
      { path: CANON.P1, element: <P1Home /> },
      { path: CANON.P1_PACKS, element: <P1Packs /> },
      { path: CANON.P1_DOSSIER, element: <P1Dossier /> },
      { path: '/p2', element: <P2Home /> },
      { path: '/p2/form', element: <P2Home /> },
      { path: '/p2/result', element: <P2Home /> },
      { path: '/p3', element: <P3Home /> },
      { path: CANON.DEV_ROUTES, element: <DevRoutesPage /> },
      { path: '/simulateur', element: <SimulatorPage /> },

      // Redirect aliases (legacy)
      ...REDIRECTS.map(r => ({
        path: r.path,
        element: <Redirect to={r.redirectTo || CANON.HOME} />,
      })),

      // ── Pages SEO Portes FR ──
      { path: '/fr/porte-01-projet-personnel', element: <PorteLanding num="01" lang="fr" /> },
      { path: '/fr/porte-02-projet-immobilier-equipements', element: <PorteLanding num="02" lang="fr" /> },
      { path: '/fr/porte-03-realisation-cle-en-main', element: <PorteLanding num="03" lang="fr" /> },
      { path: '/fr/porte-04-investisseur-foncier', element: <PorteLanding num="04" lang="fr" /> },
      { path: '/fr/porte-05-rapports-expertises', element: <PorteLanding num="05" lang="fr" /> },
      { path: '/fr/porte-06-entreprises-partenaires', element: <PorteLanding num="06" lang="fr" /> },

      // ── Pages SEO Portes EN ──
      { path: '/en/door-01-personal-family-project', element: <PorteLanding num="01" lang="en" /> },
      { path: '/en/door-02-real-estate-development-facilities', element: <PorteLanding num="02" lang="en" /> },
      { path: '/en/door-03-turnkey-delivery', element: <PorteLanding num="03" lang="en" /> },
      { path: '/en/door-04-land-investor', element: <PorteLanding num="04" lang="en" /> },
      { path: '/en/door-05-reports-expert-opinions', element: <PorteLanding num="05" lang="en" /> },
      { path: '/en/door-06-companies-partners', element: <PorteLanding num="06" lang="en" /> },

      // ── Pages SEO Portes AR ──
      { path: '/ar/bab-01-mashrou-shakhsi-wa-usari', element: <PorteLanding num="01" lang="ar" /> },
      { path: '/ar/bab-02-mashrou-aqari-wa-tajhizat', element: <PorteLanding num="02" lang="ar" /> },
      { path: '/ar/bab-03-injaz-miftah-fi-yad', element: <PorteLanding num="03" lang="ar" /> },
      { path: '/ar/bab-04-mostathmir-aqari-wa-aard', element: <PorteLanding num="04" lang="ar" /> },
      { path: '/ar/bab-05-taqarir-wa-khibra', element: <PorteLanding num="05" lang="ar" /> },
      { path: '/ar/bab-06-sharikat-wa-shoraka', element: <PorteLanding num="06" lang="ar" /> },

      // ── Pages SEO Villes ──
      { path: '/architecte-:ville', element: <VilleLanding /> },

      // Catch-all → landing
      { path: "*", element: <Redirect to={CANON.HOME} /> },
    ],
  },
]);
