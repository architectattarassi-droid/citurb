import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../tome5/AuthProvider";
import { NAV_ROUTES } from "../../../application/routeRegistry";
import { useT } from "../../../i18n/i18n";
import LangSwitcher from "../../../i18n/LangSwitcher";

/* ── PublicLayout ─────────────────────────────────────────────────────────── */
export function PublicLayout() {
  const loc = useLocation();
  const auth = useAuth();
  const t = useT();
  const path = loc.pathname;
  // La home `/` utilise LandingV4 qui a son propre header complet.
  const isHome = path === "/";
  // Pages "full-width" : tous les wizards et explorateurs métiers ont besoin
  // de la largeur écran (carte SIG + formulaires multi-colonnes). Le layout
  // 560 px d'origine était fait pour les formulaires simples type Login,
  // pas pour les pages P1-P6 ni l'explorateur SIG (qui se retrouvaient
  // visuellement compressés en colonne mobile sur desktop).
  const FULL_WIDTH_PREFIXES = [
    "/p1", "/p2", "/p3", "/p4", "/p5", "/p6",
    "/sig", "/portal", "/mon-espace", "/docs", "/simulateur",
    "/payment", "/fr/porte-", "/en/door-", "/ar/bab-", "/architecte-",
  ];
  const isFullWidth = FULL_WIDTH_PREFIXES.some(p => path.startsWith(p));
  // Pages "narrow" résiduelles : login, signup, OTP, mot-de-passe-oublié.
  // Tout ce qui n'est ni home ni full-width tombe en narrow par défaut.

  const mainStyle: React.CSSProperties = isHome
    ? { maxWidth: "none", margin: 0, padding: 0 }
    : isFullWidth
      ? { maxWidth: "none", margin: 0, padding: 0, width: "100%" }
      : { maxWidth: 560, margin: "80px auto", padding: "0 24px" };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-body)", background: "var(--c-bg)" }}>
      {!isHome && (
        <header style={{ background: "var(--c-card)", borderBottom: "1px solid var(--c-line)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, gap: 8, flexWrap: "wrap" }}>
            <Link to="/" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--c-blue)", whiteSpace: "nowrap" }}>
              CITU<span style={{ color: "var(--c-gold)" }}>RBAREA</span>
            </Link>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <LangSwitcher variant="default" style={{ order: 1 }} />
              <Link to="/" style={{ order: 2, fontSize: 12.5, color: "var(--c-muted)", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--c-line)", whiteSpace: "nowrap" }}>{t("nav.home")}</Link>
              {auth.isAuthed ? (
                <Link to="/portal" style={{ order: 3, fontSize: 12.5, fontWeight: 600, color: "#fff", padding: "6px 14px", borderRadius: 8, background: "var(--c-blue)", whiteSpace: "nowrap" }}>{t("nav.my_space")}</Link>
              ) : (
                <Link to="/login" style={{ order: 3, fontSize: 12.5, fontWeight: 600, color: "#fff", padding: "6px 14px", borderRadius: 8, background: "var(--c-blue)", whiteSpace: "nowrap" }}>{t("nav.login")}</Link>
              )}
            </div>
          </div>
        </header>
      )}
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  );
}

/* ── PortalLayout — sidebar + feed plein écran ───────────────────────────── */
export function PortalLayout() {
  const auth = useAuth();
  const loc  = useLocation();
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isMedia = loc.pathname === "/media";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-body)", background: "#f8fafc" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: sidebarOpen ? 220 : 0,
        minWidth: sidebarOpen ? 220 : 0,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        transition: "width .2s, min-width .2s",
        padding: sidebarOpen ? "20px 12px" : 0,
        boxSizing: "border-box",
      }}>
        {sidebarOpen && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Link to="/" style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "#1e3a8a" }}>
                CITU<span style={{ color: "#c9a227" }}>RBAREA</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} title="Masquer" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#94a3b8", padding: 4, lineHeight: 1 }}>‹</button>
            </div>

            {NAV_ROUTES.map(n => {
              const active  = loc.pathname.startsWith(n.path);
              const enabled = n.visibility === "public" || auth.isAuthed;
              return (
                <div key={n.path}>
                  {enabled
                    ? <Link to={n.path} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 12px", borderRadius: 10, fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color:      active ? "#1e3a8a" : "#334155",
                        background: active ? "#eff6ff" : "transparent",
                        border:     active ? "1px solid rgba(30,58,138,.12)" : "1px solid transparent",
                      }}>
                        {n.label}
                        {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1e3a8a" }} />}
                      </Link>
                    : <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 12px", borderRadius: 10, fontSize: 13, color: "#94a3b8", opacity: .7,
                      }}>
                        {n.label}
                        <span style={{ fontSize: 10, padding: "2px 8px", background: "#ede9fe", color: "#7c3aed", borderRadius: 99, fontWeight: 700 }}>⏳</span>
                      </div>
                  }
                </div>
              );
            })}

            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                {auth.isAuthed ? (auth.email || auth.username || t("common.connected")) : t("common.not_connected")} · {auth.role || "—"}
              </div>
              <button onClick={() => auth.logout()} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "transparent", fontSize: 13, color: "#64748b", cursor: "pointer" }}>
                {t("nav.logout")}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar with toggle */}
        <div style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 20px",
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b", padding: "4px 8px", borderRadius: 6, lineHeight: 1 }}
            title={sidebarOpen ? "Masquer le menu" : "Afficher le menu"}
          >
            {sidebarOpen ? "☰" : "☰"}
          </button>

          {!sidebarOpen && (
            <Link to="/" style={{ fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 15, color: "#1e3a8a", letterSpacing: "-.01em" }}>
              CITU<span style={{ color: "#c9a227" }}>RBAREA</span>
            </Link>
          )}

          {/* Breadcrumb */}
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
            {isMedia ? t("nav.media") : loc.pathname.replace("/", "").toUpperCase()}
          </span>

          {/* Lang switcher à droite — dark variant pour topbar claire */}
          <div style={{ marginLeft: "auto" }}>
            <LangSwitcher variant="default" />
          </div>
        </div>

        {/* Page content — pleine largeur disponible */}
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
