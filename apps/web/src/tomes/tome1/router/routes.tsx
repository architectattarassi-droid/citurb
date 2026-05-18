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
import ForgotPassword from "../../tome5/pages/ForgotPassword";

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
import AssociationApplyPage  from "../../../features/cercles/AssociationApplyPage";
import AssociationManagePage from "../../../features/cercles/AssociationManagePage";
import CerclesLanding       from "../../../features/cercles/CerclesLanding";
import PublicPostPage       from "../../../features/cercles/PublicPostPage";
import MarketplacePage        from "../../../features/cercles/marketplace/MarketplacePage";
import ProductDetailPage      from "../../../features/cercles/marketplace/ProductDetailPage";
import MyStorefrontPage       from "../../../features/cercles/marketplace/MyStorefrontPage";
import SupplierStorefrontPage from "../../../features/cercles/marketplace/SupplierStorefrontPage";
import DirectMessagesPage   from "../../../features/cercles/DirectMessagesPage";

// Admin Vault (Sprint H — app admin ultra-sécurisée)
import AdminLoginPage           from "../../../features/admin/AdminLoginPage";
import AdminDashboard           from "../../../features/admin/AdminDashboard";
import AdminRegisterPasskeyPage from "../../../features/admin/AdminRegisterPasskeyPage";

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

const HOST_CERCLES = "cercles.citurbarea.com";
const HOST_ADMIN   = "admin.citurbarea.com";

const currentHost = (): string =>
  (typeof window !== "undefined" ? window.location.hostname : "");

const LandingRoute = () => {
  const auth = useAuth();
  if (auth.loading) return <div style={{ padding: 24 }}>Chargement…</div>;
  const h = currentHost();
  if (h === HOST_CERCLES) return <CerclesLanding />;
  if (h === HOST_ADMIN)   return <Navigate to="/admin/login" replace />;
  return <LandingPage />;
};

const Redirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

/**
 * CerclesHostBlock — bloque l'accès à certaines routes depuis cercles.citurbarea.com.
 * Le sous-domaine cercles.citurbarea.com est le portail public des pros BTP.
 * Le backoffice (/cc/*) et le vault admin (/admin/*) doivent rester invisibles depuis ce sous-domaine.
 */
const CerclesHostBlock = ({ children }: { children: React.ReactNode }) => {
  if (currentHost() === HOST_CERCLES) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/**
 * AdminHostBlock — bloque l'accès aux routes publiques depuis admin.citurbarea.com.
 * Le sous-domaine admin.citurbarea.com est strictement réservé au backoffice et au
 * vault admin. Toute tentative d'accès à une route publique (/inscription, /cercles,
 * /p1..p6, etc.) est redirigée vers /admin/login.
 */
const AdminHostBlock = ({ children }: { children: React.ReactNode }) => {
  if (currentHost() === HOST_ADMIN) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
  // Landing publique
  { path: CANON.HOME, element: <LandingRoute /> },

  // Command Center interne — bloqué sur cercles.citurbarea.com
  { path: '/cc/*', element: <CerclesHostBlock><CommandCenterApp /></CerclesHostBlock> },

  // Admin Vault (Sprint H — app admin ultra-sécurisée) — bloqué sur cercles.citurbarea.com
  { path: '/admin',                            element: <CerclesHostBlock><Navigate to="/admin/login" replace /></CerclesHostBlock> },
  { path: '/admin/login',                      element: <CerclesHostBlock><AdminLoginPage /></CerclesHostBlock> },
  { path: '/admin/dashboard',                  element: <CerclesHostBlock><AdminDashboard /></CerclesHostBlock> },
  { path: '/admin/security/webauthn',          element: <CerclesHostBlock><AdminRegisterPasskeyPage /></CerclesHostBlock> },

  // Cercles — réseau pro BTP marocain (auth requis côté API JWT)
  // Toutes ces routes sont bloquées sur admin.citurbarea.com (redirect vers /admin/login)
  { path: '/inscription',                          element: <AdminHostBlock><InscriptionPage /></AdminHostBlock> },
  { path: '/post/:id',                             element: <PublicPostPage /> },
  { path: '/cercles',                              element: <AdminHostBlock><FeedHomePage /></AdminHostBlock> },
  { path: '/cercles/bienvenue',                    element: <AdminHostBlock><CerclesHomePage /></AdminHostBlock> },
  { path: '/cercles/annuaire',                     element: <AdminHostBlock><AnnuairePage /></AdminHostBlock> },
  { path: '/cercles/me/edit',                      element: <AdminHostBlock><EditProfilePage /></AdminHostBlock> },
  { path: '/cercles/profile/:userIdOrId',          element: <AdminHostBlock><ProfilePage /></AdminHostBlock> },
  { path: '/cercles/messages',                     element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/messages/new/:peerId',         element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/messages/:threadId',           element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/nouveau',                      element: <AdminHostBlock><NewCerclePage /></AdminHostBlock> },
  { path: '/cercles/marketplace',                  element: <AdminHostBlock><MarketplacePage /></AdminHostBlock> },
  { path: '/cercles/marketplace/produit/:id',      element: <AdminHostBlock><ProductDetailPage /></AdminHostBlock> },
  { path: '/cercles/ma-vitrine',                   element: <AdminHostBlock><MyStorefrontPage /></AdminHostBlock> },
  { path: '/cercles/storefront/:supplierId',       element: <AdminHostBlock><SupplierStorefrontPage /></AdminHostBlock> },
  { path: '/cercles/:slug',                        element: <AdminHostBlock><CercleDetailPage /></AdminHostBlock> },
  { path: '/cercles/:slug/chat',                   element: <AdminHostBlock><CercleChatPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rejoindre',              element: <AdminHostBlock><AssociationApplyPage /></AdminHostBlock> },
  { path: '/cercles/:slug/applications',           element: <AdminHostBlock><AssociationManagePage /></AdminHostBlock> },
  { path: '/cercles/:slug/posts/:postId',          element: <AdminHostBlock><PostDetailPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rooms/:roomSlug/live',   element: <AdminHostBlock><LiveRoomPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rooms/:roomSlug',        element: <AdminHostBlock><LiveRoomPage /></AdminHostBlock> },

  // Public routes
  {
    element: <PublicLayout />,
    children: [
      // Canon — login reste accessible partout (admin login passe par /admin/login)
      { path: CANON.LOGIN, element: <Login /> },
      { path: "/verify-phone", element: <VerifyPhone /> },
      { path: "/mot-de-passe-oublie", element: <ForgotPassword /> },
      // Portails publics P1-P6 → bloqués sur admin.citurbarea.com
      { path: CANON.P1, element: <AdminHostBlock><P1Home /></AdminHostBlock> },
      { path: CANON.P1_PACKS, element: <AdminHostBlock><P1Packs /></AdminHostBlock> },
      { path: CANON.P1_DOSSIER, element: <AdminHostBlock><P1Dossier /></AdminHostBlock> },
      { path: '/p1/dossier/phases', element: <AdminHostBlock><P1ClientPhases /></AdminHostBlock> },
      { path: '/portal', element: <AdminHostBlock><P1MyDossiers /></AdminHostBlock> },
      { path: '/mon-espace', element: <AdminHostBlock><P1MyDossiers /></AdminHostBlock> },
      { path: '/p2', element: <AdminHostBlock><P2Home /></AdminHostBlock> },
      { path: '/p2/form', element: <AdminHostBlock><P2Home /></AdminHostBlock> },
      { path: '/p2/result', element: <AdminHostBlock><P2Home /></AdminHostBlock> },
      { path: '/p3', element: <AdminHostBlock><P3Home /></AdminHostBlock> },
      { path: '/p4', element: <AdminHostBlock><P4Home /></AdminHostBlock> },
      { path: '/p5', element: <AdminHostBlock><P5Home /></AdminHostBlock> },
      { path: '/p6', element: <AdminHostBlock><P6Home /></AdminHostBlock> },
      { path: '/p6/dashboard', element: <AdminHostBlock><P6Dashboard /></AdminHostBlock> },
      { path: '/payment/start', element: <AdminHostBlock><PaymentStartPage /></AdminHostBlock> },
      { path: '/docs', element: <AdminHostBlock><DocsPage /></AdminHostBlock> },
      { path: '/payment/success', element: <AdminHostBlock><PaymentSuccessPage /></AdminHostBlock> },
      { path: '/payment/cancel', element: <AdminHostBlock><PaymentCancelPage /></AdminHostBlock> },
      { path: CANON.DEV_ROUTES, element: <DevRoutesPage /> },
      { path: '/simulateur', element: <AdminHostBlock><SimulatorPage /></AdminHostBlock> },

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
