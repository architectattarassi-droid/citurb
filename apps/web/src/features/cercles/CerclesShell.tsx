/**
 * CerclesShell — chrome de l'app Cercles (header + sidebar + content slot)
 *
 * Style WhatsApp Desktop pour pros : sidebar gauche (liste cercles),
 * panneau central (timeline / posts / room), header haut atelier ivoire/navy/or.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { cerclesApi, CercleListItem, ProProfile, dmApi } from "./api";
import { apiBase } from "../../tomes/tome4/apiClient";

function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${apiBase()}${url}`;
  return url;
}

export default function CerclesShell({ children }: { children: React.ReactNode }) {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const { slug: activeSlug } = useParams<{ slug?: string }>();
  const [cercles, setCercles] = useState<CercleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<ProProfile | null>(null);

  const reload = () => {
    setLoading(true);
    cerclesApi.list()
      .then(r => setCercles(r.data))
      .catch((e: any) => setErr(e?.message || "Erreur chargement cercles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    cerclesApi.myProfile().then(r => setMyProfile(r.data)).catch(() => {});
  }, []);

  // Badge unread DM (refresh toutes les 30s)
  const [dmUnread, setDmUnread] = useState(0);
  useEffect(() => {
    const fetchUnread = () => dmApi.unreadCount().then(r => setDmUnread(r.data.count || 0)).catch(() => {});
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => clearInterval(id);
  }, []);

  const logout = () => {
    try { localStorage.removeItem("citurbarea.token"); } catch {}
    navigate("/login", { replace: true });
  };

  return (
    <div style={S.root}>
      <aside style={S.sidebar}>
        <Link to="/" style={{ ...S.brand, textDecoration: "none", color: "inherit", cursor: "pointer" }} title="Accueil — landing CITURBAREA Cercles">
          <div style={S.brandSeal}>C</div>
          <div>
            <div style={S.brandName}>CERCLES</div>
            <div style={S.brandSub}>Les pros se parlent ici</div>
          </div>
        </Link>

        {/* Mon profil */}
        {myProfile && (
          <Link to={`/cercles/profile/${myProfile.userId}`} style={S.myProfileBox}>
            <div style={{
              ...S.myAvatar,
              backgroundImage: myProfile.avatarUrl ? `url(${resolveAvatarUrl(myProfile.avatarUrl)})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}>
              {!myProfile.avatarUrl && (myProfile.displayName || "?").slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.myName}>{myProfile.displayName}</div>
              <div style={S.myMeta}>{myProfile.title || "Voir mon profil →"}</div>
            </div>
          </Link>
        )}

        <div style={S.searchBar}>
          <input style={S.search} placeholder="Rechercher un cercle…" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 18px 14px" }}>
          <button onClick={() => navigate("/cercles/nouveau")} style={{ ...S.newBtn, margin: 0 }}>
            + Nouveau cercle
          </button>
          <button onClick={() => navigate("/cercles/messages")} style={{ position: "relative", background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "9px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            💬 Messages
            {dmUnread > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, background: CC_THEME.or, color: CC_THEME.bgDeep, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {dmUnread > 99 ? "99+" : dmUnread}
              </span>
            )}
          </button>
          <button onClick={() => navigate("/cercles/annuaire")} style={{ background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "9px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            📇 Annuaire pro
          </button>
          <button onClick={() => navigate("/cercles/marketplace")} style={{ background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "9px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>
            🛒 Marketplace BTP
          </button>
          <button onClick={logout} style={{ background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.danger, padding: "9px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} title="Se déconnecter">
            <span>⎋</span> Se déconnecter
          </button>
        </div>

        <div style={S.list}>
          {loading && <div style={S.empty}>Chargement…</div>}
          {err && <div style={{ ...S.empty, color: CC_THEME.danger }}>{err}</div>}
          {!loading && cercles.length === 0 && (
            <div style={S.empty}>
              <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, marginBottom: 6 }}>Aucun cercle</div>
              <div style={{ fontStyle: "italic", color: CC_THEME.inkMuted }}>Créez le premier ou attendez une invitation.</div>
            </div>
          )}
          {cercles.map(c => {
            const isActive = c.slug === activeSlug;
            return (
              <Link
                key={c.id}
                to={`/cercles/${c.slug}`}
                style={{ ...S.cercleRow, ...(isActive ? S.cercleRowActive : {}) }}
              >
                <div style={S.cercleAvatar}>{c.name.slice(0, 1).toUpperCase()}</div>
                <div style={S.cercleBody}>
                  <div style={S.cercleName}>{c.name}</div>
                  <div style={S.cercleMeta}>
                    {c._count.members} membre(s) · {c._count.posts} post(s)
                  </div>
                </div>
                <span style={{ ...S.visBadge, color: visColor(c.visibility) }}>
                  {visIcon(c.visibility)}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>

      <main style={S.main}>{children}</main>
    </div>
  );
}

function visIcon(v: string): string {
  return v === "PUBLIC" ? "🌐" : v === "MEMBERS_ONLY" ? "👥" : "🔒";
}
function visColor(v: string): string {
  return v === "PUBLIC" ? CC_THEME.success : v === "MEMBERS_ONLY" ? CC_THEME.info : CC_THEME.warn;
}

const S: Record<string, React.CSSProperties> = {
  // zoom 1.3 = +30% taille (accessibilité lecture) ; height compensée pour rester = 100vh visuel
  root: { display: "flex", height: "calc(100vh / 1.3)", zoom: 1.3, overflow: "hidden", background: CC_THEME.bg, fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },

  sidebar: { width: 320, flexShrink: 0, background: CC_THEME.bgRaised, borderRight: `1px solid ${CC_THEME.border}`, display: "flex", flexDirection: "column", overflow: "hidden" },
  brand: { display: "flex", alignItems: "center", gap: 14, padding: "20px 22px", borderBottom: `1px solid ${CC_THEME.border}` },
  brandSeal: { width: 42, height: 42, borderRadius: 8, background: CC_THEME.bgDeep, color: CC_THEME.or, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 24, fontWeight: 700, flexShrink: 0 },
  brandName: { fontSize: 13, fontWeight: 700, letterSpacing: "0.20em", color: CC_THEME.ink },
  brandSub: { fontSize: 10, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },

  searchBar: { padding: "14px 18px 8px" },
  search: { width: "100%", padding: "9px 12px", fontSize: 12.5, fontFamily: CC_THEME.fontBody, background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", boxSizing: "border-box" as const },

  newBtn: { margin: "0 18px 14px", padding: "10px 14px", background: CC_THEME.navy, color: CC_THEME.bg, border: 0, borderRadius: 6, fontFamily: CC_THEME.fontBody, fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer" },

  list: { flex: 1, overflowY: "auto", padding: "0 8px 12px" },
  empty: { padding: "22px 14px", color: CC_THEME.inkMuted, fontSize: 13, textAlign: "center" },

  cercleRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 6, textDecoration: "none", color: CC_THEME.ink, marginBottom: 2, transition: `background 0.15s ${CC_THEME.ease}` },
  cercleRowActive: { background: CC_THEME.bgSoft, boxShadow: `inset 2px 0 0 ${CC_THEME.or}` },
  cercleAvatar: { width: 38, height: 38, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 16, fontWeight: 700, flexShrink: 0 },
  cercleBody: { flex: 1, minWidth: 0 },
  cercleName: { fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cercleMeta: { fontSize: 11, color: CC_THEME.inkMuted, marginTop: 2 },
  visBadge: { fontSize: 12 },

  myProfileBox: { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", margin: "0 0 6px", textDecoration: "none", color: CC_THEME.ink, borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgSoft, cursor: "pointer", transition: `background 0.15s ${CC_THEME.ease}` },
  myAvatar: { width: 42, height: 42, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 700, flexShrink: 0, border: `2px solid ${CC_THEME.or}` },
  myName: { fontSize: 13.5, fontWeight: 600, color: CC_THEME.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  myMeta: { fontSize: 11, color: CC_THEME.or, marginTop: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  main: { flex: 1, overflowY: "auto", background: CC_THEME.bg },
};
