import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, createBrowserRouter } from "react-router-dom";
import { PublicLayout } from "./layouts";
import PageTracker from "../../../lib/PageTracker";
import RouteMeta from "../../../lib/RouteMeta";
import NotFound from "../../../ui/NotFound";
import RouteError from "../../../ui/RouteError";
import { VILLES_SEO } from "../../../ui/seo/portes.data";

/**
 * RootTracker — layout racine qui englobe TOUTES les routes (home, cercles,
 * créer-compte, portes…) pour que le suivi des visites se déclenche partout.
 * (PublicLayout ne wrappait qu'une partie des routes.) Le tracker s'exclut
 * lui-même de /cc et /admin.
 */
function RootTracker() {
  // Les pages sont chargées à la demande (React.lazy) : seul l'accueil est
  // dans le bundle initial. Suspense couvre toutes les routes enfants.
  return (
    <>
      <PageTracker />
      <RouteMeta />
      <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-busy="true" />}>
        <Outlet />
      </Suspense>
    </>
  );
}

const P1Home = lazy(() => import("../../tome3/portals/p1/P1Home"));
const P1Packs = lazy(() => import("../../tome3/portals/p1/P1Packs"));
const P1Dossier = lazy(() => import("../../tome3/portals/p1/P1Dossier"));
const P1ClientPhases = lazy(() => import("../../tome3/portals/p1/P1ClientPhases"));
const P1MyDossiers = lazy(() => import("../../tome3/portals/p1/P1MyDossiers"));
const P2Home = lazy(() => import("../../tome3/portals/p2/P2Home"));
const P2Finalize = lazy(() => import("../../tome3/portals/p2/P2Finalize"));
const P3Home = lazy(() => import("../../tome3/portals/p3/P3Home"));
const P4Home = lazy(() => import("../../tome3/portals/p4/P4Home"));
const P5Home = lazy(() => import("../../tome3/portals/p5/P5Home"));
const P5Finalize = lazy(() => import("../../tome3/portals/p5/P5Finalize"));
const SigExplorer = lazy(() => import("../../../features/geo/SigExplorer"));
const P6Dashboard = lazy(() => import("../../tome3/portals/p6/P6Dashboard"));

// ── Nouveaux modules (Phase 3 push 7-agents v3) ──
const MaterialsCatalogPage = lazy(() => import("../../../features/materials/MaterialsCatalogPage"));
const MaterialDetail = lazy(() => import("../../../features/materials/MaterialDetail"));
const PrestataireTarifsList = lazy(() => import("../../../features/prestataire-tarifs/PrestataireTarifsList"));
const PrestataireTarifsEditor = lazy(() => import("../../../features/prestataire-tarifs/PrestataireTarifsEditor"));
const TarifContractPublic = lazy(() => import("../../../features/prestataire-tarifs/TarifContractPublic"));
const ProjectCalendarPage = lazy(() => import("../../../features/project-calendar/ProjectCalendarPage"));
const LivraisonsPage = lazy(() => import("../../../features/livraisons-materiaux/LivraisonsPage"));

// ── Phase 5 (parcours complet lead → manage → permit → site → delivery) ──
const MonParcoursPage = lazy(() => import("../../../features/mon-parcours/MonParcoursPage"));
// ── Sprint Articles 2026-06 : page article + middleware OG backend pour vignettes par article ──
const ArticleDetailPage = lazy(() => import("../../../features/media/ArticleDetailPage"));
// Vague 3 (migration v7) — page générique des phases DAG en lecture seule.
// Additif strict : aucune route legacy modifiée.
const DossierPhasesPage = lazy(() => import("../../../features/dossier-phases/DossierPhasesPage"));
const DossierPhaseDetailPage = lazy(() => import("../../../features/dossier-phases/DossierPhaseDetailPage"));
const DocumentsRepoPage = lazy(() => import("../../../features/documents-repo/DocumentsRepoPage"));
const PcWizardPage = lazy(() => import("../../../features/permis-construire/PcWizardPage"));
const RokhasTrackerPage = lazy(() => import("../../../features/rokhas-tracker/RokhasTrackerPage"));
const SousTraitantsPage = lazy(() => import("../../../features/sous-traitants/SousTraitantsPage"));
const ReceptionPage = lazy(() => import("../../../features/reception-conformite/ReceptionPage"));
const IncidentsChantierPage = lazy(() => import("../../../features/incidents-chantier/IncidentsChantierPage"));
const EstimationPage = lazy(() => import("../../../features/zillow-ma/EstimationPage"));
const RoiCalculator = lazy(() => import("../../../features/lead-funnel/RoiCalculator"));
const ChiffragePage = lazy(() => import("../../../features/chiffrage/ChiffragePage"));
const NotificationsCenterPage = lazy(() => import("../../../features/notifications/NotificationsCenterPage"));
const MreDiasporaLanding = lazy(() => import("../../../features/mre-diaspora/MreDiasporaLanding"));
const MetricsDashboardPage = lazy(() => import("../../../features/analytics/MetricsDashboardPage"));
const CopiloteChantierPage = lazy(() => import("../../../features/chef-copilote/CopiloteChantierPage"));
const ChantierPvPage = lazy(() => import("../../../features/pv-chantier/ChantierPvPage"));
const CpsGeneratorPage = lazy(() => import("../../../features/cps-generator/CpsGeneratorPage"));
const DossierCpsPage = lazy(() => import("../../../features/cps-generator/DossierCpsPage"));
const PvChantierEditor = lazy(() => import("../../../features/pv-chantier/PvChantierEditor"));
const PvChantierViewer = lazy(() => import("../../../features/pv-chantier/PvChantierViewer"));
const MandataireSearchPage = lazy(() => import("../../../features/mandataires-registry/MandataireSearchPage"));
const OpciOfferingsPage = lazy(() => import("../../../features/opci-tokenise/OpciOfferingsPage"));
const DiasporaHubPage = lazy(() => import("../../../features/cercles-diaspora/DiasporaHubPage"));
import { PaymentSuccessPage, PaymentCancelPage, PaymentStartPage } from "../../tome3/portals/payment/PaymentPages";
const DocsPage = lazy(() => import("../../../ui/docs/DocsPage"));

const Login = lazy(() => import("../../tome5/pages/Login"));
const VerifyPhone = lazy(() => import("../../tome5/pages/VerifyPhone"));
const ConfirmEmail = lazy(() => import("../../tome5/pages/ConfirmEmail"));
const ForgotPassword = lazy(() => import("../../tome5/pages/ForgotPassword"));
const AccountTypeChooser = lazy(() => import("../../tome5/pages/AccountTypeChooser"));
const ClientSignup = lazy(() => import("../../tome5/pages/ClientSignup"));
const LeadCapturePage = lazy(() => import("../../../features/lead-funnel/LeadCapturePage"));
import { SIGNUP_MODE } from "../../../features/lead-funnel/signupMode";

import LandingPage from "../../../ui/landing/LandingPage";
import { useAuth } from "../../tome5/AuthProvider";
const DevRoutesPage = lazy(() => import("../../../ui/dev/DevRoutesPage"));
const SimulatorPage = lazy(() => import("../../../ui/simulateur/SimulatorPage"));
const TerriScanLab = lazy(() => import("../../../features/terriscan/TerriScanLab"));

import { CANON, REDIRECTS } from "../../../application/routeRegistry";
const CommandCenterApp = lazy(() => import("../../../command-center/CommandCenterApp"));
import { PorteLanding, VilleLanding } from '../../../ui/seo';

// Cercles — réseau pro BTP (Sprints C0-C3 + D1-D3 + E1-E3 chat)
const FeedHomePage = lazy(() => import("../../../features/cercles/FeedHomePage"));
const CerclesHomePage = lazy(() => import("../../../features/cercles/CerclesHomePage"));
const CercleDetailPage = lazy(() => import("../../../features/cercles/CercleDetailPage"));
const NewCerclePage = lazy(() => import("../../../features/cercles/NewCerclePage"));
const PostDetailPage = lazy(() => import("../../../features/cercles/PostDetailPage"));
const LiveRoomPage = lazy(() => import("../../../features/cercles/LiveRoomPage"));
const AnnuairePage = lazy(() => import("../../../features/cercles/AnnuairePage"));
const ProfilePage = lazy(() => import("../../../features/cercles/ProfilePage"));
const CercleChatPage = lazy(() => import("../../../features/cercles/CercleChatPage"));
const InscriptionPage = lazy(() => import("../../../features/cercles/InscriptionPage"));
const EditProfilePage = lazy(() => import("../../../features/cercles/EditProfilePage"));
const AssociationApplyPage = lazy(() => import("../../../features/cercles/AssociationApplyPage"));
const AssociationManagePage = lazy(() => import("../../../features/cercles/AssociationManagePage"));
const CerclesLanding = lazy(() => import("../../../features/cercles/CerclesLanding"));
const PublicPostPage = lazy(() => import("../../../features/cercles/PublicPostPage"));
const MarketplacePage = lazy(() => import("../../../features/cercles/marketplace/MarketplacePage"));
const ProductDetailPage = lazy(() => import("../../../features/cercles/marketplace/ProductDetailPage"));
const MyOffersPage = lazy(() => import("../../../features/cercles/marketplace/MyOffersPage"));
const MarketplacePhotosPage = lazy(() => import("../../../features/cercles/marketplace/MarketplacePhotosPage"));
const DirectMessagesPage = lazy(() => import("../../../features/cercles/DirectMessagesPage"));
// Cercles fournisseurs (Pages Functions + Neon) : inscription pro, espace fiches de prix
const InscriptionProPage = lazy(() => import("../../../features/fournisseurs/InscriptionProPage"));
const EspaceFournisseurPage = lazy(() => import("../../../features/fournisseurs/EspaceFournisseurPage"));

// Fiche cabinet d'architecte (ancrée sur ProProfile, cf. memory citurb-cabinet-portfolio-anchor)
const CabinetPublicPage = lazy(() => import("../../../features/cabinet/CabinetPublicPage"));
const CabinetProjectPage = lazy(() => import("../../../features/cabinet/CabinetProjectPage"));
const CabinetManagePage = lazy(() => import("../../../features/cabinet/CabinetManagePage"));

// Admin Vault (Sprint H — app admin ultra-sécurisée)
const AdminLoginPage = lazy(() => import("../../../features/admin/AdminLoginPage"));
const AdminDashboard = lazy(() => import("../../../features/admin/AdminDashboard"));
const AdminRegisterPasskeyPage = lazy(() => import("../../../features/admin/AdminRegisterPasskeyPage"));

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
const HOST_SIG     = "sig.citurbarea.com";

const currentHost = (): string =>
  (typeof window !== "undefined" ? window.location.hostname : "");

const LandingRoute = () => {
  const auth = useAuth();
  if (auth.loading) return <div style={{ padding: 24 }}>Chargement…</div>;
  const h = currentHost();
  if (h === HOST_CERCLES) return <CerclesLanding />;
  // admin.citurbarea.com → backoffice CC. Le bridge vault↔User JWT (cf.
  // CCLayout useEffect) prend le relais si l'utilisateur est connecté en
  // vault SUPER_ADMIN mais pas encore en User JWT classique : il appelle
  // /api/admin/bridge/to-user → User JWT 7j → débloque /cc/*.
  // L'utilisateur peut toujours accéder explicitement à /admin/login s'il
  // veut entrer par le vault MFA.
  // Tant que l'API n'est pas hébergée, seuls les leads (Pages Functions + Neon)
  // ont des données : on y atterrit plutôt que sur un tableau de bord vide.
  if (h === HOST_ADMIN) return <Navigate to="/cc/leads" replace />;
  // sig.citurbarea.com → explorateur SIG (gated par auth + au moins 1 dossier).
  // Si pas connecté → /login. Si connecté sans dossier → /portal pour en créer un.
  // Si connecté avec dossier → /sig directement.
  if (h === HOST_SIG) {
    if (!auth.isAuthed) return <Navigate to={`/login?next=/sig`} replace />;
    return <Navigate to="/sig" replace />;
  }
  return <LandingPage />;
};

/**
 * CerclesHome — route /cercles, point d'entrée du réseau pro Cercles.
 * Visiteur non connecté → landing publique (CerclesLanding).
 * Pro connecté → fil d'actualité (FeedHomePage).
 * Depuis la fusion des domaines, cercles.citurbarea.com redirige vers /cercles :
 * cette route doit donc présenter la landing aux visiteurs (logique LinkedIn).
 */
const CerclesHome = () => {
  const isLoggedIn = typeof window !== "undefined" && !!localStorage.getItem("citurbarea.token");
  return isLoggedIn ? <FeedHomePage /> : <CerclesLanding />;
};

const Redirect = ({ to }: { to: string }) => <Navigate to={to} replace />;

/**
 * Hôtes publics : citurbarea.com, www.citurbarea.com et cercles.citurbarea.com.
 * PublicHostBlock bloque l'accès au backoffice (/cc/*) et au vault admin (/admin/*)
 * depuis ces hôtes publics — ces espaces restent accessibles via l'URL Railway interne.
 */
const PUBLIC_HOSTS = ["citurbarea.com", "www.citurbarea.com", HOST_CERCLES];
const isPublicHost = (): boolean => PUBLIC_HOSTS.includes(currentHost());

const PublicHostBlock = ({ children }: { children: React.ReactNode }) => {
  if (isPublicHost()) return <Navigate to="/" replace />;
  return <>{children}</>;
};

/**
 * AdminHostBlock — bloque l'accès aux routes publiques depuis admin.citurbarea.com.
 * Le sous-domaine admin.citurbarea.com est strictement réservé au backoffice et au
 * vault admin. Toute tentative d'accès à une route publique (/inscription, /cercles,
 * /p1..p6, etc.) est redirigée vers /admin/login.
 */
const AdminHostBlock = ({ children }: { children: React.ReactNode }) => {
  // Sur admin.citurbarea.com, on bloque les routes publiques (portes P1..P6, Cercles…)
  // et on renvoie vers le backoffice CC (les routes /cc/* et /admin/* restent accessibles).
  if (currentHost() === HOST_ADMIN) return <Navigate to="/cc/dashboard" replace />;
  // Sur sig.citurbarea.com, on bloque tout sauf /sig + /login + /portal (pour créer dossier)
  // → cf SigHostGate ci-dessous
  if (currentHost() === HOST_SIG) return <Navigate to="/sig" replace />;
  return <>{children}</>;
};

/**
 * SigHostGate — restreint sig.citurbarea.com aux SEULES routes utiles :
 *  - / → redirect /sig (déjà géré par LandingRoute)
 *  - /sig → explorateur (gated par auth + dossier dans SigExplorer)
 *  - /login → connexion (pour accéder au /sig)
 *  - /portal → mes dossiers (pour en créer un)
 *  - /creer-compte → signup (pour créer compte qui accède à /sig)
 * Toutes les autres routes redirigent vers /sig.
 */
const SigHostBlock = ({ children }: { children: React.ReactNode }) => {
  if (currentHost() === HOST_SIG) return <Navigate to="/sig" replace />;
  return <>{children}</>;
};

export const router = createBrowserRouter([
 {
  element: <RootTracker />,
  // Chunk lazy introuvable après redéploiement → un rechargement complet.
  errorElement: <RouteError />,
  children: [
  // Landing publique
  { path: CANON.HOME, element: <LandingRoute /> },

  // Command Center interne — accessible depuis tous les hôtes (CCGuard fait l'auth
  // JWT en interne). On a levé le PublicHostBlock car admin.citurbarea.com n'est
  // pas configuré en DNS (Cloudflare) ; le backoffice serait sinon inaccessible.
  // La défense en profondeur reste assurée par CCGuard + RolesGuard côté API.
  // SigHostBlock : sur sig.citurbarea.com, /cc/* → redirect /sig
  { path: '/cc/*', element: <SigHostBlock><CommandCenterApp /></SigHostBlock> },

  // Admin Vault (Sprint H — app admin ultra-sécurisée) — bloqué sur les hôtes publics
  { path: '/admin',                            element: <PublicHostBlock><Navigate to="/admin/login" replace /></PublicHostBlock> },
  { path: '/admin/login',                      element: <PublicHostBlock><AdminLoginPage /></PublicHostBlock> },
  { path: '/admin/dashboard',                  element: <PublicHostBlock><AdminDashboard /></PublicHostBlock> },
  { path: '/admin/security/webauthn',          element: <PublicHostBlock><AdminRegisterPasskeyPage /></PublicHostBlock> },

  // Cercles — réseau pro BTP marocain (auth requis côté API JWT)
  // Toutes ces routes sont bloquées sur admin.citurbarea.com (redirect vers /admin/login)
  // L'ancien formulaire (InscriptionPage) dépend de l'API NestJS éteinte : /inscription mène à l'inscription pro.
  { path: '/inscription',                          element: <AdminHostBlock><InscriptionProPage /></AdminHostBlock> },
  { path: '/inscription/architecte',               element: <AdminHostBlock><InscriptionPage /></AdminHostBlock> },
  // Phase récolte (VITE_SIGNUP_MODE=lead, défaut) : « Créer un compte » et les
  // renvois des portes P2/P5 mènent au formulaire de capture, sans OTP.
  // AccountTypeChooser / ClientSignup reprennent la main en mode "full".
  { path: '/creer-compte',                          element: <AdminHostBlock>{SIGNUP_MODE === 'lead' ? <LeadCapturePage /> : <AccountTypeChooser />}</AdminHostBlock> },
  { path: '/creer-compte/client',                   element: <AdminHostBlock>{SIGNUP_MODE === 'lead' ? <LeadCapturePage /> : <ClientSignup />}</AdminHostBlock> },
  { path: '/post/:id',                             element: <PublicPostPage /> },
  { path: '/cercles',                              element: <AdminHostBlock><CerclesHome /></AdminHostBlock> },
  { path: '/cercles/bienvenue',                    element: <AdminHostBlock><CerclesHomePage /></AdminHostBlock> },
  { path: '/cercles/annuaire',                     element: <AdminHostBlock><AnnuairePage /></AdminHostBlock> },
  { path: '/cercles/inscription',                  element: <AdminHostBlock><InscriptionProPage /></AdminHostBlock> },
  { path: '/cercles/espace',                       element: <AdminHostBlock><EspaceFournisseurPage /></AdminHostBlock> },
  { path: '/cercles/me/edit',                      element: <AdminHostBlock><EditProfilePage /></AdminHostBlock> },
  { path: '/cercles/profile/:userIdOrId',          element: <AdminHostBlock><ProfilePage /></AdminHostBlock> },
  { path: '/cercles/messages',                     element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/messages/new/:peerId',         element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/messages/:threadId',           element: <AdminHostBlock><DirectMessagesPage /></AdminHostBlock> },
  { path: '/cercles/nouveau',                      element: <AdminHostBlock><NewCerclePage /></AdminHostBlock> },
  { path: '/cercles/marketplace',                  element: <AdminHostBlock><MarketplacePage /></AdminHostBlock> },
  { path: '/cercles/marketplace/produit/:id',      element: <AdminHostBlock><ProductDetailPage /></AdminHostBlock> },
  { path: '/cercles/mes-offres',                   element: <AdminHostBlock><MyOffersPage /></AdminHostBlock> },
  { path: '/cercles/marketplace/photos',           element: <AdminHostBlock><MarketplacePhotosPage /></AdminHostBlock> },
  { path: '/cercles/:slug',                        element: <AdminHostBlock><CercleDetailPage /></AdminHostBlock> },
  { path: '/cercles/:slug/chat',                   element: <AdminHostBlock><CercleChatPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rejoindre',              element: <AdminHostBlock><AssociationApplyPage /></AdminHostBlock> },
  { path: '/cercles/:slug/applications',           element: <AdminHostBlock><AssociationManagePage /></AdminHostBlock> },
  { path: '/cercles/:slug/posts/:postId',          element: <AdminHostBlock><PostDetailPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rooms/:roomSlug/live',   element: <AdminHostBlock><LiveRoomPage /></AdminHostBlock> },
  { path: '/cercles/:slug/rooms/:roomSlug',        element: <AdminHostBlock><LiveRoomPage /></AdminHostBlock> },

  // Fiche cabinet publique (architecte)
  { path: '/cabinet/me/manage',                    element: <AdminHostBlock><CabinetManagePage /></AdminHostBlock> },
  { path: '/cabinet/:slug',                        element: <AdminHostBlock><CabinetPublicPage /></AdminHostBlock> },
  { path: '/cabinet/:slug/projet/:projectSlug',    element: <AdminHostBlock><CabinetProjectPage /></AdminHostBlock> },

  // Public routes
  {
    element: <PublicLayout />,
    children: [
      // Canon — login reste accessible partout (admin login passe par /admin/login)
      { path: CANON.LOGIN, element: <Login /> },
      { path: "/verify-phone", element: <VerifyPhone /> },
      { path: "/confirmer-email", element: <ConfirmEmail /> },
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
      { path: '/p2/finalize', element: <AdminHostBlock><P2Finalize /></AdminHostBlock> },
      { path: '/p3', element: <AdminHostBlock><P3Home /></AdminHostBlock> },
      { path: '/p4', element: <AdminHostBlock><P4Home /></AdminHostBlock> },
      { path: '/p5', element: <AdminHostBlock><P5Home /></AdminHostBlock> },
      { path: '/p5/finalize', element: <AdminHostBlock><P5Finalize /></AdminHostBlock> },

      // Module SIG (post-login client) — explorateur des Plans d'Aménagement
      { path: '/sig', element: <AdminHostBlock><SigExplorer mode="client" /></AdminHostBlock> },

      // Article public — vignette Open Graph dynamique servie par le middleware backend pour les bots sociaux (FB/WhatsApp/LinkedIn/Twitter)
      { path: '/media/article/:slug', element: <AdminHostBlock><ArticleDetailPage /></AdminHostBlock> },
      // Porte 6 = réseau pro Cercles : /p6 redirige vers l'espace Cercles
      // P6 volontairement fermée (arbitrage du propriétaire) : /p6 renvoie vers
      // Cercles. P6Home reste branché sur leadBridge, dormant — pas un oubli.
      { path: '/p6', element: <Redirect to="/cercles" /> },
      { path: '/p6/dashboard', element: <AdminHostBlock><P6Dashboard /></AdminHostBlock> },
      // ── Catalogue Matériaux BTP Maroc (Phase 3) ──
      { path: '/materiaux', element: <AdminHostBlock><MaterialsCatalogPage /></AdminHostBlock> },
      { path: '/materiaux/:code', element: <AdminHostBlock><MaterialDetail /></AdminHostBlock> },

      // ── Tarifs Contractuels Prestataires P6 (Phase 3) ──
      { path: '/prestataires/tarifs', element: <AdminHostBlock><PrestataireTarifsList /></AdminHostBlock> },
      { path: '/prestataires/tarifs/editor', element: <AdminHostBlock><PrestataireTarifsEditor /></AdminHostBlock> },
      { path: '/prestataires/tarifs/:tarifId', element: <AdminHostBlock><TarifContractPublic /></AdminHostBlock> },

      // ── Calendrier Projet (Gantt + CPM + Kanban) ──
      { path: '/projet/:dossierId/calendrier', element: <AdminHostBlock><ProjectCalendarPage /></AdminHostBlock> },
      // Alias plus court (cohérent avec /dossier/:dossierId/{documents,rokhas,reception,cps})
      { path: '/dossier/:dossierId/calendrier', element: <AdminHostBlock><ProjectCalendarPage /></AdminHostBlock> },

      // ── Générateur CPS (Cahier des Prescriptions Spéciales) ──
      { path: '/cps', element: <AdminHostBlock><CpsGeneratorPage /></AdminHostBlock> },

      // ── Phase 5 — parcours complet lead → manage → permit → site → delivery ──
      { path: '/mon-parcours/:dossierId', element: <AdminHostBlock><MonParcoursPage /></AdminHostBlock> },
      { path: '/dossier/:dossierId/documents', element: <AdminHostBlock><DocumentsRepoPage /></AdminHostBlock> },
      { path: '/dossier/:dossierId/rokhas', element: <AdminHostBlock><RokhasTrackerPage /></AdminHostBlock> },
      // Vague 3 — page générique des phases v7. Pluriel `/dossiers/:id` selon spec migration.
      // Routes additives : ne remplacent ni /dossier/:dossierId/* ni /cc/dossiers/:id/phases (PhaseWorkspace).
      { path: '/dossiers/:id/phases', element: <AdminHostBlock><DossierPhasesPage /></AdminHostBlock> },
      { path: '/dossiers/:id/phases/:phaseSlug', element: <AdminHostBlock><DossierPhaseDetailPage /></AdminHostBlock> },
      { path: '/dossier/:dossierId/reception', element: <AdminHostBlock><ReceptionPage /></AdminHostBlock> },
      { path: '/dossier/:dossierId/cps', element: <AdminHostBlock><DossierCpsPage /></AdminHostBlock> },
      { path: '/permis-construire/:dossierId', element: <AdminHostBlock><PcWizardPage /></AdminHostBlock> },
      { path: '/chantier/:dossierId/sous-traitants', element: <AdminHostBlock><SousTraitantsPage /></AdminHostBlock> },
      { path: '/chantier/:dossierId/incidents', element: <AdminHostBlock><IncidentsChantierPage /></AdminHostBlock> },
      { path: '/chantier/:dossierId/copilote', element: <AdminHostBlock><CopiloteChantierPage /></AdminHostBlock> },

      // ── PV de chantier (Tome 2 — cadence obligatoire 1 PV / 15 jours) ──
      { path: '/chantier/:dossierId/pv', element: <AdminHostBlock><ChantierPvPage /></AdminHostBlock> },
      { path: '/pv-chantier/dossier/:dossierId/new', element: <AdminHostBlock><PvChantierEditor mode="new" /></AdminHostBlock> },
      { path: '/pv-chantier/:pvId/edit', element: <AdminHostBlock><PvChantierEditor mode="edit" /></AdminHostBlock> },
      { path: '/pv-chantier/:pvId', element: <AdminHostBlock><PvChantierViewer /></AdminHostBlock> },
      { path: '/foncier/estimation', element: <EstimationPage /> },
      { path: '/mre', element: <MreDiasporaLanding /> },
      { path: '/mandataires', element: <MandataireSearchPage /> },
      { path: '/opci', element: <OpciOfferingsPage /> },
      { path: '/cercles/diaspora', element: <DiasporaHubPage /> },
      { path: '/metrics', element: <AdminHostBlock><MetricsDashboardPage /></AdminHostBlock> },
      { path: '/calculateur', element: <RoiCalculator /> },
      { path: '/chiffrage', element: <ChiffragePage /> },
      { path: '/notifications', element: <AdminHostBlock><NotificationsCenterPage /></AdminHostBlock> },

      // ── Livraisons Matériaux (Tome 5 — chef chantier + fournisseur) ──
      { path: '/chantier/:dossierId/livraisons', element: <AdminHostBlock><LivraisonsPage /></AdminHostBlock> },

      { path: '/payment/start', element: <AdminHostBlock><PaymentStartPage /></AdminHostBlock> },
      { path: '/docs', element: <AdminHostBlock><DocsPage /></AdminHostBlock> },
      { path: '/payment/success', element: <AdminHostBlock><PaymentSuccessPage /></AdminHostBlock> },
      { path: '/payment/cancel', element: <AdminHostBlock><PaymentCancelPage /></AdminHostBlock> },
      { path: CANON.DEV_ROUTES, element: <DevRoutesPage /> },
      { path: '/simulateur', element: <AdminHostBlock><SimulatorPage /></AdminHostBlock> },

      // ── TerriScan Lab — laboratoire doctoral RA-CUE-ULV (thèse Y. AT-TARASSI) ──
      { path: '/terriscan', element: <AdminHostBlock><TerriScanLab /></AdminHostBlock> },

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
      // React Router 6 n'accepte pas un paramètre partiel (« /architecte-:ville ») :
      // une route explicite par ville connue.
      ...VILLES_SEO.map(v => ({ path: `/architecte-${v.slug}`, element: <VilleLanding ville={v.slug} /> })),

      // Route inconnue : vraie page 404 (noindex) avec appel à l'action,
      // au lieu d'une redirection silencieuse vers l'accueil.
      { path: "*", element: <NotFound /> },
    ],
  },
  ],
 },
]);
