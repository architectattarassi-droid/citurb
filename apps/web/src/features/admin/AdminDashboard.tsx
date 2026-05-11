/**
 * AdminDashboard — vue principale après login.
 *  - KPI globaux (users, cercles, posts, paiements, incidents)
 *  - Liste audit log récent
 *  - Alertes non lues
 *  - Sessions actives
 *  - Liens vers : Users (suspend/impersonate), Sub-admins, IP allowlist, WebAuthn register
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ADMIN_THEME, ensureAdminFonts } from "./AdminTheme";
import { adminAuthApi, adminDashboardApi, getAdminJwt, setAdminJwt } from "./adminApi";

export default function AdminDashboard() {
  useEffect(() => { ensureAdminFonts(); }, []);
  const navigate = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [auditRecent, setAuditRecent] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [chainCheck, setChainCheck] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getAdminJwt()) { navigate("/admin/login", { replace: true }); return; }
    Promise.all([
      adminAuthApi.me(),
      adminDashboardApi.kpi(),
      adminDashboardApi.audit(20),
      adminDashboardApi.alerts(true),
      adminDashboardApi.sessions(),
      adminDashboardApi.verifyAudit(),
    ])
      .then(([m, k, a, al, s, v]) => {
        setMe(m.data); setKpi(k); setAuditRecent(a.data || []);
        setAlerts(al.data || []); setSessions(s.data || []); setChainCheck(v.data);
      })
      .catch((e: any) => {
        if (String(e?.message).match(/expired|invalide|session/i)) {
          setAdminJwt(null);
          navigate("/admin/login", { replace: true });
        } else {
          setErr(e?.message || "Erreur chargement");
        }
      });
  }, [navigate]);

  const logout = async () => {
    try { await adminAuthApi.logout(); } catch {}
    setAdminJwt(null);
    navigate("/admin/login", { replace: true });
  };

  if (err) return <div style={{ ...S.root, padding: 40, color: ADMIN_THEME.danger }}>⚠ {err}</div>;
  if (!me) return <div style={{ ...S.root, padding: 40, color: ADMIN_THEME.inkMid, fontStyle: "italic" }}>Chargement…</div>;

  return (
    <div style={S.root}>
      <header style={S.header}>
        <div style={S.brand}>
          <div style={S.brandSeal}>🛡</div>
          <div>
            <div style={S.brandLabel}>CITURBAREA ADMIN VAULT</div>
            <div style={S.brandSub}>{me.displayName} · <span style={{ color: ADMIN_THEME.accent }}>{me.role}</span></div>
          </div>
        </div>
        <nav style={S.headerNav}>
          <Link to="/admin/users" style={S.navLink}>Utilisateurs</Link>
          <Link to="/admin/cercles" style={S.navLink}>Cercles</Link>
          <Link to="/admin/audit" style={S.navLink}>Audit Log</Link>
          {me.role === "SUPER_ADMIN" && <Link to="/admin/admins" style={S.navLink}>Sous-admins</Link>}
          <Link to="/admin/security" style={S.navLink}>Sécurité</Link>
          <button onClick={logout} style={S.btnLogout}>Déconnexion</button>
        </nav>
      </header>

      <main style={S.main}>
        {/* KPI Grid */}
        <section>
          <SectionEyebrow>Vue d'ensemble — temps réel</SectionEyebrow>
          <div style={S.kpiGrid}>
            <KpiCard label="Utilisateurs" value={kpi?.users?.total} sub={`${kpi?.users?.active} actifs · ${kpi?.users?.last24h} en 24h`} />
            <KpiCard label="Cercles" value={kpi?.cercles?.active} sub={`sur ${kpi?.cercles?.total} total`} accent={ADMIN_THEME.accent} />
            <KpiCard label="Posts" value={kpi?.posts?.total} sub={`${kpi?.posts?.last24h} nouveaux 24h`} />
            <KpiCard label="Messages chat" value={kpi?.messages?.total} sub={`${kpi?.messages?.last24h} en 24h`} accent={ADMIN_THEME.info} />
            <KpiCard label="Dossiers" value={kpi?.dossiers?.total} sub={`${kpi?.dossiers?.active} actifs`} />
            <KpiCard label="Paiements" value={kpi?.payments?.total} sub="cumul" accent={ADMIN_THEME.success} />
            <KpiCard label="Incidents 24h" value={kpi?.incidents?.critical24h} sub={`${kpi?.incidents?.total} total`} accent={kpi?.incidents?.critical24h > 0 ? ADMIN_THEME.danger : ADMIN_THEME.success} />
            <KpiCard label="Audit 7j" value={kpi?.adminAuditLast7d} sub="actions admin" />
            <KpiCard label="Alertes non lues" value={kpi?.adminAlertsUnread} sub="à traiter" accent={kpi?.adminAlertsUnread > 0 ? ADMIN_THEME.warn : ADMIN_THEME.success} />
          </div>
        </section>

        {/* Chain integrity */}
        <section style={{ marginTop: 20 }}>
          <div style={{ ...S.chainBar, background: chainCheck?.ok ? ADMIN_THEME.successBg : ADMIN_THEME.dangerBg, borderColor: chainCheck?.ok ? ADMIN_THEME.success : ADMIN_THEME.danger }}>
            <div style={{ fontSize: 13 }}>
              {chainCheck?.ok ? "✓" : "⚠"} Intégrité chaîne audit log :{" "}
              <strong style={{ color: chainCheck?.ok ? ADMIN_THEME.success : ADMIN_THEME.danger }}>
                {chainCheck?.ok ? `OK (${chainCheck?.count} entrées)` : `CORROMPU au #${chainCheck?.index}`}
              </strong>
            </div>
          </div>
        </section>

        <div style={S.row}>
          {/* Audit Log Recent */}
          <section style={S.card}>
            <SectionEyebrow>20 derniers événements admin</SectionEyebrow>
            {auditRecent.length === 0 && <div style={S.empty}>Aucun événement.</div>}
            {auditRecent.map((a) => (
              <div key={a.id} style={S.auditRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ ...S.severityBadge, ...severityStyle(a.severity) }}>{a.severity}</span>
                    <span style={S.action}>{a.action}</span>
                  </div>
                  <div style={{ fontSize: 11, color: ADMIN_THEME.inkMuted }}>
                    {a.adminUser?.email || "système"} ·{" "}
                    {a.targetType ? `${a.targetType}:${(a.targetId || "").slice(0, 8)}` : ""}{" "}
                    · IP {a.ipAddress || "?"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: ADMIN_THEME.inkMuted, whiteSpace: "nowrap" as const }}>
                  {new Date(a.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            ))}
            <Link to="/admin/audit" style={S.viewAll}>Voir tout l'audit log →</Link>
          </section>

          {/* Alertes + Sessions */}
          <section style={S.card}>
            <SectionEyebrow>Alertes non lues</SectionEyebrow>
            {alerts.length === 0 && <div style={S.empty}>Aucune alerte non lue.</div>}
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} style={S.alertRow}>
                <span style={{ ...S.severityBadge, ...severityStyle(a.severity) }}>{a.severity}</span>
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: ADMIN_THEME.inkMuted, marginTop: 2 }}>
                    {new Date(a.createdAt).toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <SectionEyebrow>Sessions admin actives</SectionEyebrow>
              {sessions.length === 0 && <div style={S.empty}>Aucune autre session active.</div>}
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} style={S.sessionRow}>
                  <div style={{ fontSize: 12, color: ADMIN_THEME.ink, fontWeight: 600 }}>
                    {s.adminUser?.email}
                  </div>
                  <div style={{ fontSize: 10, color: ADMIN_THEME.inkMuted, marginTop: 2, fontFamily: ADMIN_THEME.fontMono }}>
                    IP {s.ipAddress} · expire {new Date(s.jwtExpiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Quick actions */}
        <section style={{ marginTop: 24 }}>
          <SectionEyebrow>Actions rapides</SectionEyebrow>
          <div style={S.quickGrid}>
            <Link to="/admin/users" style={S.quickAction}>
              <div style={S.quickIcon}>👥</div>
              <div>Gérer utilisateurs</div>
            </Link>
            <Link to="/admin/security/webauthn" style={S.quickAction}>
              <div style={S.quickIcon}>🔑</div>
              <div>Ajouter passkey / YubiKey</div>
            </Link>
            <Link to="/admin/security/ips" style={S.quickAction}>
              <div style={S.quickIcon}>🌐</div>
              <div>IP allowlist</div>
            </Link>
            {me.role === "SUPER_ADMIN" && (
              <Link to="/admin/admins/new" style={S.quickAction}>
                <div style={S.quickIcon}>➕</div>
                <div>Créer un sous-admin</div>
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: any; sub?: string; accent?: string }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color: accent || ADMIN_THEME.ink }}>{value ?? "—"}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <div style={S.sectionEyebrow}>{children}</div>;
}

function severityStyle(sev: string): React.CSSProperties {
  if (sev === "CRITICAL") return { color: ADMIN_THEME.danger, background: ADMIN_THEME.dangerBg };
  if (sev === "WARN") return { color: ADMIN_THEME.warn, background: ADMIN_THEME.warnBg };
  return { color: ADMIN_THEME.info, background: ADMIN_THEME.infoBg };
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: ADMIN_THEME.bg, fontFamily: ADMIN_THEME.fontBody, color: ADMIN_THEME.ink },

  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 32px", borderBottom: `1px solid ${ADMIN_THEME.border}`,
    background: ADMIN_THEME.bgPanel,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandSeal: { width: 36, height: 36, borderRadius: 6, background: ADMIN_THEME.bg, color: ADMIN_THEME.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, border: `1px solid ${ADMIN_THEME.border}` },
  brandLabel: { fontSize: 10, letterSpacing: "0.22em", color: ADMIN_THEME.accent, fontWeight: 600 },
  brandSub: { fontSize: 14, color: ADMIN_THEME.ink, fontWeight: 500, marginTop: 2 },

  headerNav: { display: "flex", alignItems: "center", gap: 4 },
  navLink: { color: ADMIN_THEME.inkMid, textDecoration: "none", padding: "8px 14px", fontSize: 13, borderRadius: 4 },
  btnLogout: { background: "transparent", border: `1px solid ${ADMIN_THEME.danger}40`, color: ADMIN_THEME.danger, padding: "7px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginLeft: 12 },

  main: { padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" },

  sectionEyebrow: { fontSize: 10, color: ADMIN_THEME.accent, letterSpacing: "0.22em", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 12 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  kpiCard: { background: ADMIN_THEME.bgPanel, border: `1px solid ${ADMIN_THEME.border}`, borderRadius: 8, padding: "16px 18px" },
  kpiLabel: { fontSize: 10.5, color: ADMIN_THEME.inkMid, letterSpacing: "0.10em", textTransform: "uppercase" as const, fontWeight: 600 },
  kpiValue: { fontFamily: ADMIN_THEME.fontDisplay, fontSize: 32, fontWeight: 700, margin: "6px 0 2px" },
  kpiSub: { fontSize: 11, color: ADMIN_THEME.inkMuted },

  chainBar: { padding: "10px 14px", borderRadius: 6, border: `1px solid`, fontFamily: ADMIN_THEME.fontMono },

  row: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, marginTop: 24 },
  card: { background: ADMIN_THEME.bgPanel, border: `1px solid ${ADMIN_THEME.border}`, borderRadius: 8, padding: "18px 22px" },

  auditRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px dotted ${ADMIN_THEME.borderSoft}`, gap: 12 },
  severityBadge: { fontSize: 9.5, padding: "2px 7px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.05em" },
  action: { fontSize: 12.5, fontFamily: ADMIN_THEME.fontMono, color: ADMIN_THEME.ink },

  alertRow: { display: "flex", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px dotted ${ADMIN_THEME.borderSoft}` },
  sessionRow: { padding: "8px 0", borderBottom: `1px dotted ${ADMIN_THEME.borderSoft}` },

  viewAll: { display: "block", marginTop: 14, fontSize: 12, color: ADMIN_THEME.accent, textDecoration: "none", letterSpacing: "0.04em" },
  empty: { color: ADMIN_THEME.inkMuted, fontStyle: "italic" as const, fontSize: 12, padding: "12px 0" },

  quickGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  quickAction: { background: ADMIN_THEME.bgPanel, border: `1px solid ${ADMIN_THEME.border}`, borderRadius: 8, padding: 18, textDecoration: "none", color: ADMIN_THEME.ink, display: "flex", alignItems: "center", gap: 14, fontSize: 13, fontWeight: 500 },
  quickIcon: { fontSize: 26 },
};
