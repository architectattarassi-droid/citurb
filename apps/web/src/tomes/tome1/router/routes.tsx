import React from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts";

import P1Home from "../../tome3/portals/p1/P1Home";
import P1Packs from "../../tome3/portals/p1/P1Packs";
import P1Dossier from "../../tome3/portals/p1/P1Dossier";
import P1ClientPhases from "../../tome3/portals/p1/P1ClientPhases";
import P1MyDossiers from "../../tome3/portals/p1/P1MyDossiers";
import P2Home from "../../tome3/portals/p2/P2Home";
import P3Home from "../../tome3/portals/p3/P3Home";
import P4Home from "../../tome3/portals/p4/P4Home";
import P5Home from "../../tome3/portals/p5/P5Home";
import P6Home from "../../tome3/portals/p6/P6Home";
import P6Dashboard from "../../tome3/portals/p6/P6Dashboard";
import { PaymentSuccessPage, PaymentCancelPage, PaymentStartPage } from "../../tome3/portals/payment/PaymentPages";
import DocsPage from "../../../ui/docs/DocsPage";

import Login from "../../tome5/pages/Login";
import VerifyPhone from "../../tome5/pages/VerifyPhone";

import LandingPage from "../../../ui/landing/LandingPage";
import { useAuth } from "../../tome5/AuthProvider";
import DevRoutesPage from "../../../ui/dev/DevRoutesPage";
import SimulatorPage from "../../../ui/simulateur/SimulatorPage";

import { CANON, REDIRECTS } from "../../../application/routeRegistry";
import CommandCenterApp from '../../../command-center/CommandCenterApp';
import { PorteLanding, VilleLanding } from '../../../ui/seo';

// Cercles — réseau pro BTP (Sprints C0-C3 + D1-D3 + E1-E3 chat)
import FeedHomePage     from "../../../features/cercles/FeedHomePage";
import CerclesHomePage  from "../../../features/cercles/CerclesHomePage";
import CercleDetailPage from "../../../features/cercles/CercleDetailPage";
import NewCerclePage    from "../../../features/cercles/NewCerclePage";
import PostDetailPage   from "../../../features/cercles/PostDetailPage";
import LiveRoomPage     from "../../../features/cercles/LiveRoomPage";
import AnnuairePage     from "../../../features/cercles/AnnuairePage";
import ProfilePage      from "../../../features/cercles/ProfilePage";
import CercleChatPage   from "../../../features/cercles/CercleChatPage";
import InscriptionPage  from "../../../features/cercles/InscriptionPage";
import EditProfilePage  from "../../../features/cercles/EditProfilePage";

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

  // Cercles — réseau pro BTP marocain (auth requis côté API JWT)
  { path: '/inscription',                          element: <InscriptionPage /> },
  { path: '/cercles',                              element: <FeedHomePage /> },
  { path: '/cercles/bienvenue',                    element: <CerclesHomePage /> },
  { path: '/cercles/annuaire',                     element: <AnnuairePage /> },
  { path: '/cercles/me/edit',                      element: <EditProfilePage /> },
  { path: '/cercles/profile/:userIdOrId',          element: <ProfilePage /> },
  { path: '/cercles/nouveau',                      element: <NewCerclePage /> },
  { path: '/cercles/:slug',                        element: <CercleDetailPage /> },
  { path: '/cercles/:slug/chat',                   element: <CercleChatPage /> },
  { path: '/cercles/:slug/posts/:postId',          element: <PostDetailPage /> },
  { path: '/cercles/:slug/rooms/:roomSlug/live',   element: <LiveRoomPage /> },
  { path: '/cercles/:slug/rooms/:roomSlug',        element: <LiveRoomPage /> },

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
      { path: '/p1/dossier/phases', element: <P1ClientPhases /> },
      { path: '/portal', element: <P1MyDossiers /> },
      { path: '/mon-espace', element: <P1MyDossiers /> },
      { path: '/p2', element: <P2Home /> },
      { path: '/p2/form', element: <P2Home /> },
      { path: '/p2/result', element: <P2Home /> },
      { path: '/p3', element: <P3Home /> },
      { path: '/p4', element: <P4Home /> },
      { path: '/p5', element: <P5Home /> },
      { path: '/p6', element: <P6Home /> },
      { path: '/p6/dashboard', element: <P6Dashboard /> },
      { path: '/payment/start', element: <PaymentStartPage /> },
      { path: '/docs', element: <DocsPage /> },
      { path: '/payment/success', element: <PaymentSuccessPage /> },
      { path: '/payment/cancel', element: <PaymentCancelPage /> },
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
