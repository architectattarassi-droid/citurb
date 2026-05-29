/**
 * LandingCommunityFeed — section landing qui remonte les publications
 * PUBLIQUES de Cercles (fil général, /api/feed/public) directement sur la
 * page d'accueil. Chaque carte pointe vers /post/:id (page publique partageable).
 * Se masque si aucune publication.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cerclesApi, CerclePost } from "../../features/cercles/api";

function excerpt(body: string, n = 220): string {
  const t = (body || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
}
function timeAgo(iso: string): string {
  try {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 3600) return `il y a ${Math.max(1, Math.floor(d / 60))} min`;
    if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
    return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export default function LandingCommunityFeed() {
  const [posts, setPosts] = useState<CerclePost[]>([]);
  useEffect(() => {
    cerclesApi
      .publicFeed(1)
      .then((r) => setPosts((r.data || []).slice(0, 6)))
      .catch(() => setPosts([]));
  }, []);

  if (!posts.length) return null;

  return (
    <section id="communaute" style={{ scrollMarginTop: 140, padding: "12px 0 48px" }}>
      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "var(--blue2,#0B1B3A)" }}>
              La communauté Cercles
            </h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
              Dernières publications publiques des professionnels du BTP au Maroc.
            </p>
          </div>
          <a href="/cercles" style={{ padding: "9px 16px", borderRadius: 12, background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none", flexShrink: 0 }}>
            Rejoindre Cercles
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {posts.map((p) => {
            const name = p.author?.username || p.author?.email?.split("@")[0] || "Membre";
            return (
              <Link key={p.id} to={`/post/${p.id}`} style={{
                display: "block", textDecoration: "none", background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 16, padding: 18, color: "#0B1B3A", boxShadow: "0 4px 12px rgba(11,27,58,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0B1B3A,#1a2f5f)", color: "#E8C66A", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: "#0B1B3A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{timeAgo(p.createdAt)}</div>
                  </div>
                </div>
                {p.title && <div style={{ fontWeight: 800, fontSize: 15, color: "#0B1B3A", marginBottom: 4 }}>{p.title}</div>}
                <div style={{ fontSize: 13.5, color: "rgba(11,27,58,0.72)", lineHeight: 1.5 }}>{excerpt(p.body)}</div>
                <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                  <span>▲ {p.upvotes ?? 0}</span>
                  <span>💬 {p.replyCount ?? 0}</span>
                  <span style={{ marginLeft: "auto", color: "#C9A227" }}>Lire →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
