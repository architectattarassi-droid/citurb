import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useT } from "../../i18n/i18n";

/**
 * BottomNav — barre de navigation mobile inspirée des apps natives
 * (Instagram, LinkedIn, WhatsApp).
 *
 * 5 tabs : Accueil / Dossiers / +Nouveau / Cercles / Profil
 *
 * - Respecte safe-area-inset-bottom (encoche iPhone, gesture bar Android)
 * - Visible UNIQUEMENT sur <= 768px (mobile/tablette portrait)
 * - Le bouton central "+" est mis en valeur (FAB visuel)
 * - Indication active basée sur startsWith(path)
 * - ARIA: nav + role + aria-current="page"
 *
 * Intégration : à monter une seule fois dans le layout racine
 * (App.tsx ou PublicLayout) — il se masque tout seul en desktop.
 */

interface Tab {
  to: string;
  /** Clé i18n (nav.bottom.*) — traduite au rendu. */
  labelKey: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
  highlight?: boolean;
}

const ICON_SIZE = 22;

const Icon = {
  Home: (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
    </svg>
  ),
  Folder: (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  Plus: (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Network: (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M7.8 7.4 11 15.6M16.2 7.4 13 15.6M8.5 6h7" />
    </svg>
  ),
  User: (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  ),
};

const TABS: Tab[] = [
  {
    to: "/",
    labelKey: "nav.bottom.home",
    match: (p) => p === "/",
    icon: Icon.Home,
  },
  {
    to: "/portal",
    labelKey: "nav.bottom.dossiers",
    match: (p) => p.startsWith("/portal") || p.startsWith("/mon-espace"),
    icon: Icon.Folder,
  },
  {
    to: "/creer-compte",
    labelKey: "nav.bottom.new",
    match: (p) => p === "/creer-compte",
    icon: Icon.Plus,
    highlight: true,
  },
  {
    to: "/cercles",
    labelKey: "nav.bottom.cercles",
    match: (p) => p.startsWith("/cercles"),
    icon: Icon.Network,
  },
  {
    to: "/cercles/me/edit",
    labelKey: "nav.bottom.profile",
    match: (p) =>
      p.startsWith("/cercles/me") ||
      p.startsWith("/cercles/profile") ||
      p === "/login",
    icon: Icon.User,
  },
];

// Routes où on cache la nav (full-screen workflows : SIG, admin, login, etc.)
// On masque aussi les pages qui ont leur propre barre d'action sticky en bas
// (sinon double barre + conflit de tap sur mobile — cf. audit parité mobile).
const HIDE_ON_PREFIXES = [
  "/cc",
  "/admin",
  "/sig",
  "/login",
  "/verify-phone",
  "/mot-de-passe-oublie",
  "/payment",
  "/mon-parcours",
  "/permis-construire",
  "/chantier",
  "/pv-chantier",
  "/projet",
  "/foncier",
  "/metrics",
  "/notifications",
];

const STYLE_ID = "cit-bottomnav-style";
function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
.cit-bottomnav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: none;
  background: rgba(255,255,255,.96);
  backdrop-filter: saturate(180%) blur(16px);
  -webkit-backdrop-filter: saturate(180%) blur(16px);
  border-top: 1px solid #e2e6ec;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
@media (max-width: 768px) {
  .cit-bottomnav { display: flex; }
  /* Réserver l'espace en bas pour éviter que la nav cache le contenu. */
  body.cit-bottomnav-spacer { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0)); }
}
.cit-bottomnav__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  height: 64px;
  font-size: 10.5px;
  font-weight: 600;
  color: #566474;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: color .15s;
}
.cit-bottomnav__tab[aria-current="page"] { color: #0d3566; }
.cit-bottomnav__tab--fab {
  position: relative;
  color: #fff;
}
.cit-bottomnav__tab--fab > .cit-bottomnav__icon {
  background: #0d3566;
  color: #fff;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -14px;
  box-shadow: 0 6px 16px rgba(13,53,102,.35);
}
.cit-bottomnav__tab--fab[aria-current="page"] > .cit-bottomnav__icon {
  background: #c48b1f;
}
.cit-bottomnav__tab--fab .cit-bottomnav__label { color: #566474; }
.cit-bottomnav__icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
  document.head.appendChild(el);
}

export interface BottomNavProps {
  /** Si fourni, prend la main sur la détection automatique. */
  hidden?: boolean;
}

export function BottomNav({ hidden }: BottomNavProps = {}) {
  ensureStyle();
  const loc = useLocation();
  const t = useT();

  // Réserve l'espace bas du body pour éviter le contenu caché derrière la nav.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("cit-bottomnav-spacer");
    return () => {
      document.body.classList.remove("cit-bottomnav-spacer");
    };
  }, []);

  const shouldHide =
    hidden ||
    HIDE_ON_PREFIXES.some(
      (p) => loc.pathname === p || loc.pathname.startsWith(`${p}/`),
    );

  if (shouldHide) return null;

  return (
    <nav
      className="cit-bottomnav"
      role="navigation"
      aria-label="Navigation principale mobile"
    >
      {TABS.map((tab) => {
        const active = tab.match(loc.pathname);
        const cls = `cit-bottomnav__tab${tab.highlight ? " cit-bottomnav__tab--fab" : ""}`;
        const label = t(tab.labelKey);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cls}
            aria-current={active ? "page" : undefined}
            aria-label={label}
          >
            <span className="cit-bottomnav__icon">{tab.icon}</span>
            <span className="cit-bottomnav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
