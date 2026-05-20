/**
 * PublicPostPage — page publique d'un post général (route /post/:id).
 *
 * Accessible SANS authentification → c'est la page qu'on partage hors
 * plateforme (réseaux sociaux, email…). Indexable par Google = SEO.
 * Affiche le post complet + un bandeau CTA "Rejoindre CITURBAREA Cercles".
 *
 * Si le post appartient à un cercle (privé), l'API renvoie 403 → on
 * affiche un mur "contenu réservé aux membres".
 */

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { cerclesApi, CerclePost } from "./api";
import { apiBase } from "../../tomes/tome4/apiClient";
import MediaEmbed, { extractUrls, isEmbeddable } from "./MediaEmbed";
import { SharePost } from "./SharePost";

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

export default function PublicPostPage() {
  useEffect(() => { ensureFonts(); }, []);
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<CerclePost | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    cerclesApi.publicPost(id)
      .then(r => setPost(r.data))
      .catch((e: any) => setErr(e?.message || "Post introuvable"))
      .finally(() => setLoading(false));
  }, [id]);

  const author: any = post?.author;
  const proProfile = author?.proProfile;
  const displayName = proProfile?.displayName || author?.username || author?.email || "Membre";

  return (
    <div style={S.root}>
      <header style={S.header}>
        <Link to="/" style={S.brand}>
          <div style={S.brandSeal}>C</div>
          <div>
            <div style={S.brandName}>CITURBAREA · CERCLES</div>
            <div style={S.brandSub}>Le réseau des professionnels du BTP au Maroc</div>
          </div>
        </Link>
        <nav style={S.nav}>
          <Link to="/login" style={S.navLink}>Se connecter</Link>
          <Link to="/inscription" style={S.navCta}>Créer un compte</Link>
        </nav>
      </header>

      <main style={S.main}>
        {loading && <div style={S.muted}>Chargement…</div>}

        {err && (
          <div style={S.errBox}>
            <h1 style={S.errTitle}>Contenu non disponible</h1>
            <p style={S.errBody}>
              Ce post est peut-être réservé aux membres d'un cercle privé, ou n'existe plus.
            </p>
            <Link to="/inscription" style={S.btnPrimary}>Rejoindre CITURBAREA Cercles</Link>
          </div>
        )}

        {post && (
          <>
            <article style={S.postCard}>
              <div style={S.postHead}>
                <div style={S.avatar}>{displayName.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div style={S.authorName}>
                    {displayName}
                    {proProfile?.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, marginLeft: 5 }}>✓</span>}
                  </div>
                  <div style={S.authorMeta}>
                    {proProfile?.metier ? (METIER_LABELS[proProfile.metier] || proProfile.metier) : "Professionnel BTP"}
                    {" · "}
                    {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <span style={S.publicBadge}>🌐 Post public</span>
              </div>

              {post.title && <h1 style={S.postTitle}>{post.title}</h1>}
              <div style={S.postBody}>{post.body}</div>

              {extractUrls(post.body || "").filter(isEmbeddable).slice(0, 3).map((u, i) => (
                <MediaEmbed key={i} url={u} maxWidth={620} />
              ))}

              {post.attachments && post.attachments.length > 0 && (
                <div style={S.attachments}>
                  {post.attachments.map((a) => {
                    const url = `${apiBase()}/uploads/${a.fileKey}`;
                    if (/^image\//.test(a.mimeType)) {
                      return <a key={a.id} href={url} target="_blank" rel="noreferrer"><img src={url} alt={a.filename} style={S.attachImg} /></a>;
                    }
                    if (/^video\//.test(a.mimeType)) {
                      return <video key={a.id} src={url} controls style={S.attachVid} />;
                    }
                    return <a key={a.id} href={url} target="_blank" rel="noreferrer" style={S.attachFile}>📎 {a.filename}</a>;
                  })}
                </div>
              )}

              <div style={S.postStats}>
                👍 {post.upvotes} · 💬 {(post as any)._count?.replies ?? post.replyCount ?? 0} commentaire(s)
              </div>

              <div style={S.shareBlock}>
                <div style={S.shareLabel}>Partager ce post</div>
                <SharePost
                  url={typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : ""}
                  title={post.title || "Post CITURBAREA Cercles"}
                />
              </div>
            </article>

            {/* Commentaires (lecture seule pour les visiteurs non connectés) */}
            {post.replies && post.replies.length > 0 && (
              <section style={S.commentsSection}>
                <div style={S.commentsTitle}>Commentaires</div>
                {post.replies.map((c: any) => {
                  const cn = c.author?.proProfile?.displayName || c.author?.username || c.author?.email || "Membre";
                  return (
                    <div key={c.id} style={S.comment}>
                      <div style={S.cAvatar}>{cn.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div style={S.cName}>{cn}</div>
                        <div style={S.cBody}>{c.body}</div>
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {/* Bandeau CTA inscription */}
            <section style={S.ctaBanner}>
              <h2 style={S.ctaTitle}>Rejoignez la conversation</h2>
              <p style={S.ctaText}>
                CITURBAREA Cercles est le réseau privé des professionnels du BTP marocain —
                architectes, BET, laboratoires, topographes, entreprises. Discussions,
                visios, annuaire pro, messagerie directe.
              </p>
              <div style={S.ctaBtns}>
                <Link to="/inscription" style={S.btnPrimary}>Créer mon compte pro</Link>
                <Link to="/login" style={S.btnGhost}>J'ai déjà un compte</Link>
              </div>
            </section>
          </>
        )}
      </main>

      <footer style={S.footer}>
        CITURBAREA · Cercles · Maroc · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { background: CC_THEME.bg, minHeight: "100vh", fontFamily: CC_THEME.fontBody, color: CC_THEME.ink },
  header: { borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", flexWrap: "wrap", gap: 12 },
  brand: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" },
  brandSeal: { width: 38, height: 38, borderRadius: 8, background: CC_THEME.bgDeep, color: CC_THEME.or, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 22, fontWeight: 700 },
  brandName: { fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", color: CC_THEME.ink },
  brandSub: { fontSize: 10, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 2 },
  nav: { display: "flex", alignItems: "center", gap: 12 },
  navLink: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 13, fontWeight: 500 },
  navCta: { background: CC_THEME.navy, color: CC_THEME.bg, padding: "8px 16px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 },

  main: { maxWidth: 720, margin: "0 auto", padding: "32px 20px 60px" },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", textAlign: "center", padding: 40 },

  errBox: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 40, textAlign: "center" },
  errTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 24, color: CC_THEME.navy, margin: "0 0 10px" },
  errBody: { color: CC_THEME.inkMid, fontSize: 14, marginBottom: 22, lineHeight: 1.6 },

  postCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 28, boxShadow: CC_THEME.shadowSoft },
  postHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  avatar: { width: 46, height: 46, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 700, flexShrink: 0 },
  authorName: { fontSize: 15, fontWeight: 600, color: CC_THEME.navy },
  authorMeta: { fontSize: 12, color: CC_THEME.inkMuted, marginTop: 2 },
  publicBadge: { marginLeft: "auto", fontSize: 11, color: CC_THEME.success, fontWeight: 600, background: CC_THEME.successBg, padding: "4px 10px", borderRadius: 5 },
  postTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, margin: "8px 0 14px", lineHeight: 1.2 },
  postBody: { fontSize: 15, color: CC_THEME.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" },
  attachments: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 },
  attachImg: { maxWidth: 280, maxHeight: 200, objectFit: "cover", borderRadius: 8, border: `1px solid ${CC_THEME.border}` },
  attachVid: { maxWidth: 400, borderRadius: 8, background: "#000" },
  attachFile: { fontSize: 12.5, padding: "9px 14px", background: CC_THEME.bgSoft, borderRadius: 6, color: CC_THEME.inkMid, textDecoration: "none" },
  postStats: { marginTop: 18, paddingTop: 14, borderTop: `1px solid ${CC_THEME.borderSoft}`, fontSize: 13, color: CC_THEME.inkMid },
  shareBlock: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  shareLabel: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 },

  commentsSection: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 22, marginTop: 16 },
  commentsTitle: { fontSize: 11, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 },
  comment: { display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" },
  cAvatar: { width: 32, height: 32, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 13, fontWeight: 700, flexShrink: 0 },
  cName: { fontSize: 13, fontWeight: 600, color: CC_THEME.ink },
  cBody: { fontSize: 13.5, color: CC_THEME.inkMid, lineHeight: 1.55, marginTop: 2, whiteSpace: "pre-wrap" },

  ctaBanner: { background: CC_THEME.bgDeep, color: CC_THEME.inkOnDark, borderRadius: 12, padding: "32px 28px", marginTop: 20, textAlign: "center" },
  ctaTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 24, fontWeight: 600, color: CC_THEME.inkOnDark, margin: "0 0 10px" },
  ctaText: { fontSize: 14, color: "#D4CFC2", lineHeight: 1.6, maxWidth: 520, margin: "0 auto 22px" },
  ctaBtns: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: { background: CC_THEME.or, color: CC_THEME.bgDeep, padding: "12px 24px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block" },
  btnGhost: { background: "transparent", color: CC_THEME.inkOnDark, padding: "11px 24px", borderRadius: 6, textDecoration: "none", fontSize: 14, fontWeight: 500, border: `1px solid rgba(250,247,242,0.3)`, display: "inline-block" },

  footer: { textAlign: "center", padding: "24px", fontSize: 12, color: CC_THEME.inkMuted, borderTop: `1px solid ${CC_THEME.border}`, letterSpacing: "0.08em" },
};
