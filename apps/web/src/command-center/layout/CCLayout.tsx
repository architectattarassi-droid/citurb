/**
 * CCLayout.tsx — Studio architecte premium
 *
 * Layout principal du Command Center : ivoire chaud, navy profond, accents or.
 * Sidebar + en-tête + KPI bar + contenu, avec typographie Playfair (display)
 * et Inter (body).
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CCKpiBar from "./CCKpiBar";
import { CC } from "../theme/tokens";

// ─── Types ───────────────────────────────────────────────────

type NavGroup = { id: string; title: string; items: NavItem[] };
type NavItem = { id: string; label: string; path: string; mark: string };

// ─── Navigation, regroupée par intention métier ─────────────

const NAV_GROUPS: NavGroup[] = [
  {
    id: "atelier",
    title: "Atelier",
    items: [
      { id: "dashboard",   label: "Tableau de bord", path: "/cc/dashboard",   mark: "I"   },
      { id: "leads",       label: "Leads",           path: "/cc/leads",       mark: "II"  },
      { id: "inscrits",    label: "Inscrits Cercles",path: "/cc/inscrits",    mark: "III" },
      { id: "validations", label: "Validations",     path: "/cc/validations", mark: "IV"  },
    ],
  },
  {
    id: "production",
    title: "Production",
    items: [
      { id: "dossiers", label: "Dossiers",  path: "/cc/dossiers", mark: "V"  },
      { id: "projects", label: "Projets",   path: "/cc/projects", mark: "VI" },
      { id: "archive",  label: "Archive",   path: "/cc/archive",  mark: "VII"},
      { id: "sig",      label: "SIG · PA",  path: "/cc/sig",      mark: "VIIb"},
    ],
  },
  {
    id: "rayonnement",
    title: "Rayonnement",
    items: [
      { id: "media",       label: "Médias",                 path: "/cc/media",       mark: "VIII" },
      { id: "territorial", label: "Intelligence territoire", path: "/cc/territorial", mark: "IX"   },
      { id: "business",    label: "Business",                path: "/cc/business",    mark: "X"    },
      { id: "firms",       label: "Cabinets",                path: "/cc/firms",       mark: "XI"   },
      { id: "live",        label: "Live",                    path: "/cc/live",        mark: "XII"  },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ─── Composant ───────────────────────────────────────────────

export default function CCLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Charge les fontes Google une seule fois (Playfair + Inter)
  useEffect(() => {
    const id = "cc-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const active = ALL_ITEMS.find(n => location.pathname.startsWith(n.path)) ?? ALL_ITEMS[0];
  const activeGroup = NAV_GROUPS.find(g => g.items.some(i => i.id === active.id));

  const today = new Date().toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={S.root}>
      {/* ── Sidebar ── */}
      <aside style={{ ...S.sidebar, width: collapsed ? 72 : 240 }}>
        <div style={S.brand}>
          <div style={S.brandSeal}>C</div>
          {!collapsed && (
            <div style={S.brandText}>
              <span style={S.brandName}>CITURBAREA</span>
              <span style={S.brandSub}>Atelier · Command Center</span>
            </div>
          )}
        </div>

        <nav style={S.nav}>
          {NAV_GROUPS.map(group => (
            <div key={group.id} style={S.navGroup}>
              {!collapsed && <div style={S.navGroupTitle}>{group.title}</div>}
              {group.items.map(item => {
                const isActive = item.id === active.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                    style={{
                      ...S.navItem,
                      ...(isActive ? S.navItemActive : {}),
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px 0" : "9px 14px",
                    }}
                  >
                    <span style={{ ...S.navMark, color: isActive ? CC.color.or : CC.color.inkMuted }}>
                      {item.mark}
                    </span>
                    {!collapsed && <span style={S.navLabel}>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={S.sidebarFooter}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={S.collapseBtn}
            title={collapsed ? "Étendre" : "Réduire"}
          >
            {collapsed ? "›" : "‹  Réduire"}
          </button>
          {!collapsed && <div style={S.versionTag}>V166 · Atelier</div>}
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={S.main}>
        <header style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.crumbGroup}>{activeGroup?.title ?? ""}</div>
            <h1 style={S.crumbTitle}>{active.label}</h1>
          </div>
          <div style={S.headerRight}>
            <span style={S.dateChip}>{today}</span>
            <div style={S.userChip}>
              <span style={S.userAvatar}>Y</span>
              <div style={S.userMeta}>
                <span style={S.userName}>Yassine</span>
                <span style={S.userRole}>Architecte fondateur</span>
              </div>
            </div>
          </div>
        </header>

        <CCKpiBar />

        <main style={S.content}>{children}</main>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: CC.color.bg,
    fontFamily: CC.font.body,
    color: CC.color.ink,
  },

  // ── Sidebar ──
  sidebar: {
    display: "flex",
    flexDirection: "column",
    background: CC.color.bgRaised,
    borderRight: `1px solid ${CC.color.border}`,
    flexShrink: 0,
    transition: `width 0.3s ${CC.ease}`,
    overflow: "hidden",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "22px 18px 20px",
    borderBottom: `1px solid ${CC.color.border}`,
    minHeight: 76,
  },
  brandSeal: {
    width: 38,
    height: 38,
    borderRadius: 6,
    background: CC.color.bgDeep,
    color: CC.color.or,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: CC.font.display,
    fontWeight: 700,
    fontSize: 22,
    flexShrink: 0,
    letterSpacing: "-0.02em",
  },
  brandText: { display: "flex", flexDirection: "column", overflow: "hidden" },
  brandName: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: CC.color.ink,
    whiteSpace: "nowrap",
    fontFamily: CC.font.body,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: 400,
    letterSpacing: "0.10em",
    color: CC.color.inkMuted,
    whiteSpace: "nowrap",
    fontStyle: "italic",
    marginTop: 2,
  },

  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    padding: "20px 12px",
    overflowY: "auto",
  },
  navGroup: { display: "flex", flexDirection: "column", gap: 2 },
  navGroupTitle: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.20em",
    color: CC.color.or,
    textTransform: "uppercase",
    padding: "0 14px 8px",
    borderBottom: `1px dotted ${CC.color.border}`,
    marginBottom: 6,
    fontFamily: CC.font.body,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "none",
    background: "transparent",
    color: CC.color.inkMid,
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13.5,
    fontFamily: CC.font.body,
    fontWeight: 500,
    transition: `all 0.18s ${CC.ease}`,
    width: "100%",
    textAlign: "left",
  },
  navItemActive: {
    background: CC.color.bgSoft,
    color: CC.color.navy,
    fontWeight: 600,
    boxShadow: `inset 2px 0 0 ${CC.color.or}`,
  },
  navMark: {
    fontFamily: CC.font.display,
    fontStyle: "italic",
    fontSize: 12,
    fontWeight: 600,
    width: 28,
    textAlign: "center",
    letterSpacing: "0.05em",
    flexShrink: 0,
  },
  navLabel: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    letterSpacing: "0.01em",
  },

  sidebarFooter: {
    padding: "14px 14px 18px",
    borderTop: `1px solid ${CC.color.border}`,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  collapseBtn: {
    padding: "7px 10px",
    border: `1px solid ${CC.color.border}`,
    borderRadius: 5,
    background: "transparent",
    color: CC.color.inkMid,
    cursor: "pointer",
    fontFamily: CC.font.body,
    fontSize: 11,
    letterSpacing: "0.04em",
    transition: `all 0.15s ${CC.ease}`,
  },
  versionTag: {
    fontSize: 9,
    color: CC.color.inkMuted,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    textAlign: "center",
    fontStyle: "italic",
  },

  // ── Main ──
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 32px 16px",
    background: CC.color.bgRaised,
    borderBottom: `1px solid ${CC.color.border}`,
    flexShrink: 0,
    minHeight: 80,
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: 2 },
  crumbGroup: {
    fontSize: 10,
    color: CC.color.or,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    fontWeight: 600,
  },
  crumbTitle: {
    margin: 0,
    fontFamily: CC.font.display,
    fontSize: 26,
    fontWeight: 600,
    color: CC.color.navy,
    letterSpacing: "-0.01em",
    lineHeight: 1.1,
  },
  headerRight: { display: "flex", alignItems: "center", gap: 16 },
  dateChip: {
    fontSize: 11,
    color: CC.color.inkMid,
    fontStyle: "italic",
    letterSpacing: "0.02em",
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 14px 6px 6px",
    background: CC.color.bgSoft,
    border: `1px solid ${CC.color.border}`,
    borderRadius: 24,
    cursor: "pointer",
    transition: `all 0.15s ${CC.ease}`,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: CC.color.bgDeep,
    color: CC.color.or,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: CC.font.display,
  },
  userMeta: { display: "flex", flexDirection: "column", lineHeight: 1.15 },
  userName: { fontSize: 13, color: CC.color.ink, fontWeight: 600, letterSpacing: "0.01em" },
  userRole: { fontSize: 10, color: CC.color.inkMuted, fontStyle: "italic", letterSpacing: "0.04em" },

  content: {
    flex: 1,
    overflowY: "auto",
    padding: "28px 32px 40px",
    background: CC.color.bg,
  },
};
