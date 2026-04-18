import React from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts";

import P1Home from "../../tome3/portals/p1/P1Home";
import P1Packs from "../../tome3/portals/p1/P1Packs";
import P1Dossier from "../../tome3/portals/p1/P1Dossier";
import P2Home from "../../tome3/portals/p2/P2Home";

import Login from "../../tome5/pages/Login";
import VerifyPhone from "../../tome5/pages/VerifyPhone";

import LandingPage from "../../../ui/landing/LandingPage";
import { useAuth } from "../../tome5/AuthProvider";
import DevRoutesPage from "../../../ui/dev/DevRoutesPage";
import SimulatorPage from "../../../ui/simulateur/SimulatorPage";

import { CANON, REDIRECTS } from "../../../application/routeRegistry";
import CommandCenterApp from '../../../command-center/CommandCenterApp';

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
      { path: CANON.DEV_ROUTES, element: <DevRoutesPage /> },
      { path: '/simulateur', element: <SimulatorPage /> },

      // Redirect aliases (legacy)
      ...REDIRECTS.map(r => ({
        path: r.path,
        element: <Redirect to={r.redirectTo || CANON.HOME} />,
      })),

      // Catch-all → landing
      { path: "*", element: <Redirect to={CANON.HOME} /> },
    ],
  },
]);
