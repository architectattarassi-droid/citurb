/**
 * CCLayout.tsx
 * Layout principal du Command Center
 * Sidebar gauche + header haut + KPI bar + contenu
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CCKpiBar from './CCKpiBar';

// ─── Types ───────────────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

// ─── Navigation config ───────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',            icon: '◈',  path: '/cc/dashboard' },
  { id: 'media',        label: 'Media · Cities Talk',  icon: '▶',  path: '/cc/media' },
  { id: 'leads',        label: 'Leads',                icon: '◉',  path: '/cc/leads' },
  { id: 'projects',     label: 'Projets',              icon: '⬡',  path: '/cc/projects' },
  { id: 'territorial',  label: 'Intelligence Territo.', icon: '◎', path: '/cc/territorial' },
  { id: 'business',     label: 'Business',             icon: '◆',  path: '/cc/business' },
  { id: 'dossiers',    label: 'Dossiers',             icon: '▣',  path: '/cc/dossiers' },
  { id: 'live',        label: 'Live 📡',              icon: '📡', path: '/cc/live' },
  { id: 'firms',       label: '🏢 Cabinets',          icon: '🏢', path: '/cc/firms' },
];

// ─── Composant ───────────────────────────────────────────────

export default function CCLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const activeId = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.id ?? 'dashboard';
  const activeLabel = NAV_ITEMS.find(n => n.id === activeId)?.label ?? 'Dashboard';

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 220 }}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoMark}>C</div>
          {!collapsed && (
            <div style={styles.logoText}>
              <span style={styles.logoMain}>CITURBAREA</span>
              <span style={styles.logoSub}>Command Center</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '10px 16px',
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
                {!collapsed && item.badge != null && item.badge > 0 && (
                  <span style={styles.badge}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={styles.collapseBtn}
          title={collapsed ? 'Étendre' : 'Réduire'}
        >
          {collapsed ? '→' : '←'}
        </button>

        {/* Footer sidebar */}
        {!collapsed && (
          <div style={styles.sidebarFooter}>
            <span style={styles.versionTag}>V166 · CC</span>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.breadcrumb}>
              <span style={styles.breadcrumbRoot}>CC</span>
              <span style={styles.breadcrumbSep}>/</span>
              <span style={styles.breadcrumbCurrent}>{activeLabel}</span>
            </span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.clockBadge}>{new Date().toLocaleDateString('fr-MA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <div style={styles.userChip}>
              <span style={styles.userAvatar}>Y</span>
              <span style={styles.userName}>Yassine</span>
            </div>
          </div>
        </header>

        {/* KPI Bar */}
        <CCKpiBar />

        {/* Content */}
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    background: '#0a0c10',
    fontFamily: "'DM Mono', 'IBM Plex Mono', 'Fira Code', monospace",
    color: '#e8eaf0',
  },

  // Sidebar
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1017',
    borderRight: '1px solid #1e2330',
    flexShrink: 0,
    transition: 'width 0.25s ease',
    overflow: 'hidden',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
    borderBottom: '1px solid #1e2330',
    minHeight: 64,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #00d4aa, #0088ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    fontSize: 16,
    color: '#0a0c10',
    flexShrink: 0,
    letterSpacing: '-0.05em',
  },
  logoText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  logoMain: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#e8eaf0',
    whiteSpace: 'nowrap',
  },
  logoSub: {
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: '0.08em',
    color: '#4a5568',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
  },

  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '12px 8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: 'none',
    background: 'transparent',
    color: '#4a5568',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.15s ease',
    width: '100%',
    textAlign: 'left',
    letterSpacing: '0.02em',
  },
  navItemActive: {
    background: 'rgba(0, 212, 170, 0.08)',
    color: '#00d4aa',
    borderLeft: '2px solid #00d4aa',
  },
  navIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  navLabel: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  badge: {
    background: '#00d4aa',
    color: '#0a0c10',
    borderRadius: 10,
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  collapseBtn: {
    margin: '8px',
    padding: '8px',
    border: '1px solid #1e2330',
    borderRadius: 6,
    background: 'transparent',
    color: '#4a5568',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    transition: 'all 0.15s',
  },
  sidebarFooter: {
    padding: '8px 16px 16px',
    borderTop: '1px solid #1e2330',
  },
  versionTag: {
    fontSize: 9,
    color: '#2d3748',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },

  // Main area
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 52,
    background: '#0d1017',
    borderBottom: '1px solid #1e2330',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
  },
  breadcrumbRoot: {
    color: '#4a5568',
    letterSpacing: '0.1em',
  },
  breadcrumbSep: {
    color: '#2d3748',
  },
  breadcrumbCurrent: {
    color: '#00d4aa',
    fontWeight: 600,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  clockBadge: {
    fontSize: 11,
    color: '#4a5568',
    padding: '3px 8px',
    border: '1px solid #1e2330',
    borderRadius: 4,
    letterSpacing: '0.05em',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    background: '#131820',
    border: '1px solid #1e2330',
    borderRadius: 20,
    cursor: 'pointer',
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00d4aa, #0088ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    color: '#0a0c10',
  },
  userName: {
    fontSize: 11,
    color: '#8892a4',
    fontWeight: 500,
  },

  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
};
