/**
 * FeedHomePage — page d'accueil Cercles, style timeline LinkedIn pro BTP.
 *
 * Sections :
 * - Bandeau "rooms LIVE" en haut (rouge pulsant)
 * - Composer rapide
 * - Timeline des posts récents (cercles rejoints + cercles publics)
 * - Sidebar droite : suggestions de cercles à découvrir + suggestions pros
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, FeedResponse, ProProfile, CercleListItem } from "./api";
import MediaEmbed, { extractUrls, isEmbeddable } from "./MediaEmbed";
import InlineComments from "./InlineComments";
import { SharePost } from "./SharePost";
import { PostAttachments } from "./PostAttachments";

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte", BET_STRUCTURE: "BET Structure", BET_FLUIDES: "BET Fluides", BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe", GEOMETRE: "Géomètre", CONTROLE_TECHNIQUE: "Contrôle technique", LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO", ENTREPRISE_SECOND_OEUVRE: "Second œuvre", FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur", MOA_PUBLIQUE: "MOA publique", MOA_PRIVEE: "MOA privée", ARTISAN_QUALIFIE: "Artisan",
};

export default function FeedHomePage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [generalPosts, setGeneralPosts] = useState<any[]>([]);
  const [discovery, setDiscovery] = useState<CercleListItem[]>([]);
  const [suggestions, setSuggestions] = useState<ProProfile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<Array<{ fileKey: string; filename: string; mimeType: string; sizeBytes: number; url: string }>>([]);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadGeneral = () =>
    cerclesApi.generalFeed().then(r => setGeneralPosts(r.data)).catch(() => setGeneralPosts([]));

  useEffect(() => {
    Promise.all([
      cerclesApi.feed().then(r => setFeed(r.data)).catch(() => setFeed({ posts: [], liveRooms: [], myCercleIds: [] })),
      loadGeneral(),
      cerclesApi.discovery().then(r => setDiscovery(r.data)).catch(() => setDiscovery([])),
      cerclesApi.annuaireSuggestions().then(r => setSuggestions(r.data)).catch(() => setSuggestions([])),
    ]).catch(e => setErr(e?.message || "Erreur"));
  }, []);

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      // Le dossier d'upload est calé sur le « cercleId » de l'URL ; pour le fil
      // général, on utilise "_misc" — le backend l'accepte sans validation.
      const uploaded = await cerclesApi.uploadPostMedia("_misc", files);
      setComposerAttachments(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      setErr(err?.message || "Échec du téléversement");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (fileKey: string) =>
    setComposerAttachments(prev => prev.filter(a => a.fileKey !== fileKey));

  const submitGeneralPost = async () => {
    if (!composerBody.trim() || posting) return;
    setPosting(true);
    setErr(null);
    try {
      await cerclesApi.createGeneralPost({
        title: composerTitle.trim() || undefined,
        body: composerBody.trim(),
        attachments: composerAttachments.length > 0
          ? composerAttachments.map(a => ({ fileKey: a.fileKey, filename: a.filename, mimeType: a.mimeType, sizeBytes: a.sizeBytes }))
          : undefined,
      });
      setComposerTitle("");
      setComposerBody("");
      setComposerAttachments([]);
      await loadGeneral();
    } catch (e: any) {
      setErr(e?.message || "Échec de la publication");
    } finally {
      setPosting(false);
    }
  };

  // Fil = posts généraux (🌐 public) + posts de mes cercles (🔒), triés récents d'abord
  const mergedPosts = React.useMemo(() => {
    const gen = generalPosts.map(p => ({ ...p, _general: true }));
    const cer = (feed?.posts || []).map(p => ({ ...p, _general: false }));
    return [...gen, ...cer].sort((a, b) => {
      if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [generalPosts, feed]);

  return (
    <CerclesShell>
      {err && <div style={{ padding: 24, color: CC_THEME.danger }}>{err}</div>}

      <div style={S.layout}>
        <main style={S.main}>
          <header style={S.header}>
            <div style={S.eyebrow}>Atelier · Réseau pro BTP</div>
            <h1 style={S.title}>Fil d'actualité</h1>
            <p style={S.lead}>L'activité des cercles que tu suis et des pros que tu connectes.</p>
          </header>

          {feed && feed.liveRooms.length > 0 && (
            <section style={S.liveBar}>
              <div style={S.liveDot} />
              <span style={S.liveLabel}>EN DIRECT</span>
              {feed.liveRooms.slice(0, 3).map(r => (
                <button key={r.id} onClick={() => navigate(`/cercles/${(r as any).cercle?.slug}/rooms/${r.slug}/live`)} style={S.liveRoomChip}>
                  📹 {r.title}
                </button>
              ))}
            </section>
          )}

          {/* Composer — publie un post GÉNÉRAL (public, visible/partageable par tous) */}
          <div style={S.composer}>
            <input
              value={composerTitle}
              onChange={e => setComposerTitle(e.target.value)}
              placeholder="Titre (optionnel)"
              style={S.composerTitle}
            />
            <textarea
              value={composerBody}
              onChange={e => setComposerBody(e.target.value)}
              placeholder="Partage une actualité avec toute la communauté BTP… (lien YouTube / image / vidéo détecté automatiquement)"
              style={S.composerBody}
            />
            <div style={S.composerFoot}>
              <span style={S.composerHint}>🌐 Post public — visible et partageable par tous</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,image/*,video/*,audio/*"
                  onChange={onPickFiles}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || posting}
                  style={S.composerAttachBtn}
                  title="Joindre un PDF, une image, une vidéo ou un audio"
                >
                  {uploading ? "Envoi…" : "📎 Joindre"}
                </button>
                <button
                  onClick={submitGeneralPost}
                  disabled={posting || !composerBody.trim()}
                  style={{ ...S.composerBtn, opacity: posting || !composerBody.trim() ? 0.5 : 1 }}
                >
                  {posting ? "Publication…" : "Publier"}
                </button>
              </div>
            </div>
            {composerAttachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {composerAttachments.map(a => (
                  <span key={a.fileKey} style={S.composerAttachChip}>
                    {a.mimeType === "application/pdf" ? "📄" : a.mimeType.startsWith("image/") ? "🖼️" : a.mimeType.startsWith("video/") ? "🎬" : "🎵"}{" "}
                    {a.filename}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.fileKey)}
                      style={S.composerAttachRm}
                      title="Retirer"
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {mergedPosts.length === 0 && (
            <div style={S.emptyHero}>
              <h2 style={S.emptyTitle}>Pas encore de fil</h2>
              <p style={S.emptyBody}>
                Publie le premier post public ci-dessus, ou rejoins un cercle.
                Explore l'<Link to="/cercles/annuaire" style={{ color: CC_THEME.or, fontWeight: 600 }}>annuaire pro</Link>.
              </p>
            </div>
          )}

          {mergedPosts.map(p => (
            <FeedPostCard key={p.id} post={p} onUpvote={async () => {
              if (p._general) { await cerclesApi.generalUpvote(p.id); await loadGeneral(); }
              else { await cerclesApi.upvote(p.cercleId, p.id); const r = await cerclesApi.feed(); setFeed(r.data); }
            }} onOpen={() => {
              if (p._general) navigate(`/post/${p.id}`);
              else navigate(`/cercles/${p.cercle.slug}/posts/${p.id}`);
            }} />
          ))}
        </main>

        <aside style={S.sidebar}>
          <div style={S.card}>
            <div style={S.cardEyebrow}>À découvrir</div>
            <div style={S.cardTitle}>Cercles publics</div>
            <div style={S.discoveryList}>
              {discovery.slice(0, 5).map(c => (
                <Link key={c.id} to={`/cercles/${c.slug}`} style={S.discoveryRow}>
                  <div style={S.cAvatar}>{c.name.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.cName}>{c.name}</div>
                    <div style={S.cMeta}>{c._count?.members || 0} membres · {c._count?.posts || 0} posts</div>
                  </div>
                </Link>
              ))}
              {discovery.length === 0 && <div style={S.cMeta}>Aucun cercle public à suggérer.</div>}
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardEyebrow}>Pros recommandés</div>
            <div style={S.cardTitle}>À connecter</div>
            <div style={S.discoveryList}>
              {suggestions.slice(0, 5).map(p => (
                <Link key={p.id} to={`/cercles/profile/${p.userId}`} style={S.discoveryRow}>
                  <div style={{ ...S.cAvatar, background: p.isVerified ? CC_THEME.successBg : CC_THEME.orSoft }}>
                    {(p.displayName || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.cName}>{p.displayName} {p.isVerified && <span style={{ color: CC_THEME.success }}>✓</span>}</div>
                    <div style={S.cMeta}>{METIER_LABELS[p.metier] || p.metier}{p.classeBTP ? ` · ${p.classeBTP}` : ""}</div>
                  </div>
                </Link>
              ))}
              {suggestions.length === 0 && <div style={S.cMeta}>Aucune suggestion pour l'instant.</div>}
            </div>
            <Link to="/cercles/annuaire" style={S.annuaireLink}>Voir tout l'annuaire →</Link>
          </div>
        </aside>
      </div>
    </CerclesShell>
  );
}

function FeedPostCard({ post, onUpvote, onOpen }: { post: any; onUpvote: () => void; onOpen: () => void }) {
  const author = post.author;
  const proProfile = author?.proProfile;
  const displayName = proProfile?.displayName || author?.username || author?.email || "Membre";
  const avatar = (displayName).slice(0, 1).toUpperCase();
  const [showComments, setShowComments] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const [commentCount, setCommentCount] = React.useState<number>(post._count?.replies ?? post.replyCount ?? 0);
  // Post public (général) → l'URL est partageable hors plateforme.
  const isPublic = !post.cercleId;
  const publicUrl = isPublic && typeof window !== "undefined"
    ? `${window.location.origin}/post/${post.id}`
    : "";
  return (
    <article style={S.postCard}>
      <header style={S.postHead}>
        <div style={{ ...S.postAvatar, background: proProfile?.isVerified ? CC_THEME.successBg : CC_THEME.orSoft }}>
          {avatar}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.postAuthor}>{displayName}</span>
            {proProfile?.isVerified && <span title="Vérifié" style={{ color: CC_THEME.success, fontSize: 12 }}>✓</span>}
            {proProfile?.metier && <span style={S.metierTag}>{METIER_LABELS[proProfile.metier] || proProfile.metier}</span>}
          </div>
          <div style={S.postSub}>
            {post.cercle ? (
              <Link to={`/cercles/${post.cercle.slug}`} style={{ color: CC_THEME.warn, textDecoration: "none", fontWeight: 600 }}>
                🔒 {post.cercle.name}
              </Link>
            ) : (
              <span style={{ color: CC_THEME.success, fontWeight: 600 }}>🌐 Public</span>
            )}
            <span> · {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
            {post.isPinned && <span style={S.pin}>📌</span>}
          </div>
        </div>
      </header>
      {post.title && <h3 style={S.postTitle} onClick={onOpen}>{post.title}</h3>}
      <div style={S.postBody}>{truncate(post.body, 280)}</div>
      {/* Médias embarqués : YouTube/Facebook/Instagram/Vimeo/image/vidéo détectés dans le corps */}
      {extractUrls(post.body || "").filter(isEmbeddable).slice(0, 2).map((u, i) => (
        <MediaEmbed key={i} url={u} maxWidth={520} />
      ))}
      {/* Pièces jointes téléversées : photos / vidéos / PDF / audio */}
      <PostAttachments attachments={post.attachments || []} compact />

      <footer style={S.postFooter}>
        <button onClick={onUpvote} style={S.action}>👍 {post.upvotes}</button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{ ...S.action, ...(showComments ? { color: CC_THEME.or, fontWeight: 600 } : {}) }}
        >
          💬 {commentCount} {showComments ? "▲" : "▼"}
        </button>
        {isPublic && (
          <button
            onClick={() => setShowShare(v => !v)}
            style={{ ...S.action, ...(showShare ? { color: CC_THEME.or, fontWeight: 600 } : {}) }}
            title="Partager hors plateforme (WhatsApp, Facebook…)"
          >
            🔗 Partager {showShare ? "▲" : "▼"}
          </button>
        )}
        <button onClick={onOpen}  style={{ ...S.action, marginLeft: "auto", color: CC_THEME.or }}>Voir le post →</button>
      </footer>
      {showShare && isPublic && publicUrl && (
        <div style={{ marginTop: 10, padding: 12, background: CC_THEME.bgSoft, borderRadius: 8 }}>
          <SharePost url={publicUrl} title={post.title} compact />
        </div>
      )}
      {showComments && (
        <InlineComments
          cercleId={post.cercleId}
          postId={post.id}
          onCountChange={setCommentCount}
        />
      )}
    </article>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

const S: Record<string, React.CSSProperties> = {
  layout: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, padding: "28px 32px 60px", maxWidth: 1100, margin: "0 auto", alignItems: "start" },
  main: { minWidth: 0 },
  sidebar: { display: "flex", flexDirection: "column", gap: 16, position: "sticky" as const, top: 16 },

  header: { marginBottom: 18 },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic" },

  composer: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 16, marginBottom: 18, boxShadow: CC_THEME.shadowSoft },
  composerTitle: { width: "100%", padding: "8px 11px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none", background: CC_THEME.bg, boxSizing: "border-box" as const, marginBottom: 8 },
  composerBody: { width: "100%", padding: "9px 11px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 13.5, fontFamily: "inherit", outline: "none", background: CC_THEME.bg, boxSizing: "border-box" as const, minHeight: 70, resize: "vertical" as const },
  composerFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8, flexWrap: "wrap" as const },
  composerHint: { fontSize: 11.5, color: CC_THEME.success, fontWeight: 500 },
  composerBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "9px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" },
  composerAttachBtn: { background: "transparent", color: CC_THEME.inkMid, border: `1px solid ${CC_THEME.border}`, padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  composerAttachChip: { display: "inline-flex", alignItems: "center", gap: 6, background: CC_THEME.bg, border: `1px solid ${CC_THEME.border}`, borderRadius: 14, padding: "5px 10px", fontSize: 12, color: CC_THEME.inkMid },
  composerAttachRm: { background: "none", border: 0, color: CC_THEME.inkMuted, cursor: "pointer", fontSize: 15, padding: "0 0 0 6px", fontFamily: "inherit", lineHeight: 1 },

  liveBar: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: CC_THEME.dangerBg, border: `1px solid ${CC_THEME.danger}40`, borderRadius: 10, marginBottom: 18, flexWrap: "wrap" as const },
  liveDot: { width: 10, height: 10, borderRadius: "50%", background: CC_THEME.danger, animation: "pulse 1.5s infinite" },
  liveLabel: { fontSize: 10, fontWeight: 700, color: CC_THEME.danger, letterSpacing: "0.20em" },
  liveRoomChip: { background: "transparent", border: `1px solid ${CC_THEME.danger}40`, color: CC_THEME.ink, padding: "5px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  emptyHero: { padding: 40, textAlign: "center", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, marginBottom: 18 },
  emptyTitle: { margin: "0 0 8px", fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },
  emptyBody: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic", lineHeight: 1.6 },

  postCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 20, marginBottom: 14, boxShadow: CC_THEME.shadowSoft },
  postHead: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: "50%", color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 16, fontWeight: 700, flexShrink: 0 },
  postAuthor: { fontSize: 13.5, fontWeight: 600, color: CC_THEME.ink },
  metierTag: { fontSize: 10, color: CC_THEME.or, background: CC_THEME.orSoft + "60", padding: "2px 7px", borderRadius: 3, letterSpacing: "0.04em", fontWeight: 500 },
  postSub: { fontSize: 11.5, color: CC_THEME.inkMuted, marginTop: 2 },
  pin: { marginLeft: 6, fontSize: 11 },
  postTitle: { margin: "4px 0 8px", fontFamily: CC_THEME.fontDisplay, fontSize: 17, color: CC_THEME.navy, fontWeight: 600, cursor: "pointer" },
  postBody: { fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" as const },
  postFooter: { display: "flex", gap: 12, alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  action: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  card: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 16, boxShadow: CC_THEME.shadowSoft },
  cardEyebrow: { fontSize: 9.5, color: CC_THEME.or, letterSpacing: "0.20em", textTransform: "uppercase", fontWeight: 600 },
  cardTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600, marginTop: 4, marginBottom: 12, paddingBottom: 8, borderBottom: `1px dotted ${CC_THEME.border}` },

  discoveryList: { display: "flex", flexDirection: "column", gap: 4 },
  discoveryRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 4px", borderRadius: 5, textDecoration: "none", color: CC_THEME.ink, transition: `background 0.15s ${CC_THEME.ease}` },
  cAvatar: { width: 32, height: 32, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 13, fontWeight: 700, flexShrink: 0 },
  cName: { fontSize: 12.5, fontWeight: 600, color: CC_THEME.ink, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  cMeta: { fontSize: 10.5, color: CC_THEME.inkMuted, marginTop: 1 },

  annuaireLink: { display: "block", marginTop: 10, fontSize: 12, color: CC_THEME.or, textDecoration: "none", fontWeight: 600, textAlign: "right" as const },
};
