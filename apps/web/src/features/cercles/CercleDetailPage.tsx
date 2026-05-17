import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, invitationsApi, CercleDetail, CerclePost, LiveRoom, InviteResultItem } from "./api";
import MediaEmbed, { extractUrls, isEmbeddable } from "./MediaEmbed";
import InlineComments from "./InlineComments";

type Tab = "discussions" | "rooms" | "members";

export default function CercleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [cercle, setCercle] = useState<CercleDetail | null>(null);
  const [tab, setTab] = useState<Tab>("discussions");
  const [posts, setPosts] = useState<CerclePost[]>([]);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [composing, setComposing] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [composeTitle, setComposeTitle] = useState("");
  const [composeFiles, setComposeFiles] = useState<File[]>([]);
  const [composeUploadPct, setComposeUploadPct] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!slug) return;
    setErr(null);
    try {
      const r = await cerclesApi.detail(slug);
      setCercle(r.data);
      const [p, rr] = await Promise.all([
        cerclesApi.listPosts(r.data.id).catch(() => ({ data: [] as CerclePost[] })),
        cerclesApi.listRooms(r.data.id).catch(() => ({ data: [] as LiveRoom[] })),
      ]);
      setPosts(p.data);
      setRooms(rr.data);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement cercle");
    }
  }, [slug]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const submitPost = async () => {
    if (!cercle) return;
    if (!composeBody.trim() && composeFiles.length === 0) {
      alert("Ajoute du texte ou une pièce jointe."); return;
    }
    setPosting(true);
    try {
      let attachments: any[] = [];
      if (composeFiles.length > 0) {
        setComposeUploadPct(0);
        const up = await cerclesApi.uploadPostMedia(cercle.id, composeFiles);
        attachments = up.map(u => ({ fileKey: u.fileKey, filename: u.filename, mimeType: u.mimeType, sizeBytes: u.sizeBytes }));
        setComposeUploadPct(100);
      }
      await cerclesApi.createPost(cercle.id, {
        title: composeTitle.trim() || undefined,
        body: composeBody,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setComposeBody("");
      setComposeTitle("");
      setComposeFiles([]);
      setComposeUploadPct(null);
      setComposing(false);
      await loadAll();
    } catch (e: any) {
      alert("Erreur publication : " + (e?.message || "inconnue"));
    } finally {
      setPosting(false);
    }
  };

  const upvote = async (postId: string) => {
    if (!cercle) return;
    // Optimistic update : flip liked + ajuste upvotes immédiatement
    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      liked: !p.liked,
      upvotes: p.liked ? Math.max(0, p.upvotes - 1) : p.upvotes + 1,
    } : p));
    try {
      const r = await cerclesApi.upvote(cercle.id, postId);
      // Re-sync avec valeur réelle serveur
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p, liked: r.data.liked, upvotes: r.data.upvotes,
      } : p));
    } catch (e: any) {
      // Rollback si erreur
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p, liked: !p.liked, upvotes: p.liked ? p.upvotes + 1 : Math.max(0, p.upvotes - 1),
      } : p));
      alert("Erreur like : " + (e?.message || ""));
    }
  };

  const join = async () => {
    if (!cercle) return;
    await cerclesApi.join(cercle.id);
    await loadAll();
  };

  if (!slug) return null;

  return (
    <CerclesShell>
      {err && <div style={{ padding: 24, color: CC_THEME.danger }}>{err}</div>}
      {!cercle && !err && <div style={{ padding: 24, color: CC_THEME.inkMid, fontStyle: "italic" }}>Chargement…</div>}
      {cercle && (
        <div>
          <header style={S.header}>
            <div>
              <div style={S.eyebrow}>{visLabel(cercle.visibility)} · {cercle.region || "National"}</div>
              <h1 style={S.title}>{cercle.name}</h1>
              {cercle.description && <p style={S.desc}>{cercle.description}</p>}
              {cercle.themes && cercle.themes.length > 0 && (
                <div style={S.themes}>
                  {cercle.themes.map(t => <span key={t} style={S.theme}>#{t}</span>)}
                </div>
              )}
            </div>
            <div style={S.headerRight}>
              <Stat label="Membres" value={cercle._count.members} />
              <Stat label="Posts"   value={cercle._count.posts} accent={CC_THEME.or} />
              <Stat label="Salles"  value={cercle._count.rooms} accent={CC_THEME.success} />
              {cercle.members && cercle.members.length > 0 && cercle.members[0]?.status === "ACTIVE" && (
                <button onClick={() => navigate(`/cercles/${slug}/chat`)} style={S.chatBtn}>
                  💬 Chat en direct
                </button>
              )}
              {(cercle.members?.[0]?.role === "OWNER" || cercle.members?.[0]?.role === "MODERATOR") && cercle.membershipFlow === "ASSOCIATION" && (
                <button onClick={() => navigate(`/cercles/${slug}/applications`)} style={S.chatBtn}>
                  📋 Gérer adhésions
                </button>
              )}
              {(!cercle.members || cercle.members.length === 0 || (cercle.members[0]?.status !== "ACTIVE" && cercle.members[0]?.status !== "PENDING_APPLICATION")) && (
                cercle.membershipFlow === "ASSOCIATION" ? (
                  <button onClick={() => navigate(`/cercles/${slug}/rejoindre`)} style={S.joinBtn}>
                    📋 Adhérer
                  </button>
                ) : (
                  <button onClick={join} style={S.joinBtn}>Rejoindre</button>
                )
              )}
              {cercle.members?.[0]?.status === "PENDING_APPLICATION" && (
                <button onClick={() => navigate(`/cercles/${slug}/rejoindre`)} style={{ ...S.joinBtn, background: CC_THEME.info }}>
                  ⏳ Voir ma demande
                </button>
              )}
            </div>
          </header>

          <nav style={S.tabs}>
            <TabBtn active={tab === "discussions"} onClick={() => setTab("discussions")}>💬 Discussions ({cercle._count?.posts ?? 0})</TabBtn>
            <TabBtn active={tab === "rooms"}       onClick={() => setTab("rooms")}>🎥 Salles vidéo ({cercle._count?.rooms ?? 0})</TabBtn>
            <TabBtn active={tab === "members"}     onClick={() => setTab("members")}>👥 Membres ({cercle._count?.members ?? 0})</TabBtn>
          </nav>

          <div style={S.body}>
            {tab === "discussions" && (
              <>
                {!composing ? (
                  <button onClick={() => setComposing(true)} style={S.openComposeBtn}>
                    + Nouveau post
                  </button>
                ) : (
                  <div style={S.composer}>
                    <input
                      style={S.composerTitle}
                      placeholder="Titre (optionnel)"
                      value={composeTitle}
                      onChange={e => setComposeTitle(e.target.value)}
                    />
                    <textarea
                      style={S.composerBody}
                      placeholder="Partage avec le cercle… Tu peux coller des liens YouTube / Facebook (s'afficheront en vidéo) ou attacher des photos/vidéos."
                      value={composeBody}
                      onChange={e => setComposeBody(e.target.value)}
                      rows={5}
                    />
                    {composeFiles.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, padding: 10, background: CC_THEME.bgSoft, borderRadius: 6 }}>
                        {composeFiles.map((f, i) => {
                          const isImg = f.type.startsWith("image/");
                          const isVid = f.type.startsWith("video/");
                          return (
                            <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, background: CC_THEME.bgRaised, padding: "6px 10px", borderRadius: 4, border: `1px solid ${CC_THEME.border}` }}>
                              {isImg ? <img src={URL.createObjectURL(f)} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 3 }} /> :
                               isVid ? <span style={{ fontSize: 22 }}>🎬</span> : <span style={{ fontSize: 18 }}>📎</span>}
                              <div style={{ fontSize: 11, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                              <button onClick={() => setComposeFiles(composeFiles.filter((_, idx) => idx !== i))} style={{ background: CC_THEME.danger, color: "white", border: 0, borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                            </div>
                          );
                        })}
                        {composeUploadPct !== null && (
                          <div style={{ width: "100%", height: 3, background: CC_THEME.bgSoft, borderRadius: 2 }}>
                            <div style={{ width: `${composeUploadPct}%`, height: "100%", background: CC_THEME.or }} />
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 12, alignItems: "center" }}>
                      <label style={{ cursor: "pointer", padding: "8px 14px", background: CC_THEME.bgSoft, borderRadius: 4, fontSize: 12, color: CC_THEME.inkMid, border: `1px solid ${CC_THEME.border}` }}>
                        📎 Joindre photo/vidéo
                        <input type="file" multiple accept="image/*,video/*,audio/*" onChange={(e) => {
                          if (e.target.files) setComposeFiles([...composeFiles, ...Array.from(e.target.files)].slice(0, 6));
                        }} style={{ display: "none" }} />
                      </label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => { setComposing(false); setComposeBody(""); setComposeTitle(""); setComposeFiles([]); }} style={S.btnGhost}>Annuler</button>
                        <button onClick={submitPost} disabled={posting || (!composeBody.trim() && composeFiles.length === 0)} style={S.btnPrimary}>
                          {posting ? (composeUploadPct !== null && composeUploadPct < 100 ? `Upload ${composeUploadPct}%` : "Publication…") : "Publier"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {posts.length === 0 && (
                  <div style={S.emptyBox}>
                    <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, marginBottom: 6 }}>Pas encore de discussion</div>
                    <div style={{ fontSize: 13, color: CC_THEME.inkMid, fontStyle: "italic" }}>Lance le premier post.</div>
                  </div>
                )}

                {posts.map(p => (
                  <PostCard key={p.id} post={p} cercleSlug={slug!} cercleName={cercle.name} onUpvote={() => upvote(p.id)} onOpen={() => navigate(`/cercles/${slug}/posts/${p.id}`)} />
                ))}
              </>
            )}

            {tab === "rooms" && (
              <RoomsTab cercle={cercle} rooms={rooms} onChange={loadAll} />
            )}

            {tab === "members" && (
              <MembersTab cercleId={cercle.id} isMod={cercle.members?.[0]?.role === "OWNER" || cercle.members?.[0]?.role === "MODERATOR"} />
            )}
          </div>
        </div>
      )}
    </CerclesShell>
  );
}

// ─── Sub-components ──

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={S.stat}>
      <div style={{ ...S.statValue, color: accent || CC_THEME.navy }}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: "transparent",
      border: 0,
      padding: "12px 18px",
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      color: active ? CC_THEME.navy : CC_THEME.inkMid,
      borderBottom: `2px solid ${active ? CC_THEME.or : "transparent"}`,
      cursor: "pointer",
      fontFamily: "inherit",
      letterSpacing: "0.02em",
    }}>
      {children}
    </button>
  );
}

function PostCard({ post, cercleSlug, cercleName, onUpvote, onOpen }: { post: CerclePost; cercleSlug: string; cercleName: string; onUpvote: () => void; onOpen: () => void }) {
  const [shareToast, setShareToast] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(post.replyCount ?? 0);
  const sharePost = async () => {
    const url = `${window.location.origin}/cercles/${cercleSlug}/posts/${post.id}`;
    const title = post.title || `Post de ${post.author.username || post.author.email}`;
    const text = `${title} — ${cercleName} sur CITURBAREA Cercles`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch { /* user cancelled */ return; }
    try {
      await navigator.clipboard.writeText(url);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    } catch {
      window.prompt("Copiez le lien ci-dessous :", url);
    }
  };

  return (
    <article style={S.postCard}>
      <div style={S.postHead}>
        <Link to={`/cercles/profile/${post.author.id || post.authorId}`} style={{ ...S.postAvatar, textDecoration: "none", cursor: "pointer" }} title={`Voir le profil de ${post.author.username || post.author.email}`}>
          {(post.author.username || post.author.email || "?").slice(0, 1).toUpperCase()}
        </Link>
        <div>
          <Link to={`/cercles/profile/${post.author.id || post.authorId}`} style={{ ...S.postAuthor, textDecoration: "none", cursor: "pointer" }}>
            {post.author.username || post.author.email}
          </Link>
          <div style={S.postDate}>{new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        {post.isPinned && <span style={S.pinBadge}>📌 Épinglé</span>}
        {post.isResolved && <span style={S.resolveBadge}>✓ Résolu</span>}
      </div>
      {post.title && <h3 style={S.postTitle} onClick={onOpen}>{post.title}</h3>}
      <div style={S.postBody}>{truncate(post.body, 320)}</div>
      {extractUrls(post.body).filter(isEmbeddable).slice(0, 2).map((u, i) => (
        <MediaEmbed key={i} url={u} maxWidth={500} />
      ))}
      {post.attachments && post.attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {post.attachments.slice(0, 6).map((a) => {
            const isImg = /^image\//.test(a.mimeType);
            const isVid = /^video\//.test(a.mimeType);
            const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
            const url = `${apiUrl}/uploads/${a.fileKey}`;
            if (isImg) return <a key={a.id} href={url} target="_blank" rel="noreferrer"><img src={url} alt={a.filename} style={{ maxWidth: 200, maxHeight: 140, objectFit: "cover", borderRadius: 6, border: `1px solid ${CC_THEME.border}` }} /></a>;
            if (isVid) return <video key={a.id} src={url} controls style={{ maxWidth: 320, borderRadius: 6, background: "#000" }} />;
            return <a key={a.id} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "8px 14px", background: CC_THEME.bgSoft, borderRadius: 4, color: CC_THEME.inkMid, textDecoration: "none" }}>📎 {a.filename} ({Math.round(a.sizeBytes/1024)} Ko)</a>;
          })}
        </div>
      )}
      <div style={S.postFooter}>
        <button
          onClick={onUpvote}
          style={{
            ...S.action,
            background: post.liked ? CC_THEME.or : "transparent",
            color: post.liked ? "white" : CC_THEME.inkMid,
            fontWeight: post.liked ? 700 : 500,
            border: post.liked ? `1px solid ${CC_THEME.or}` : `1px solid transparent`,
            transition: "all 0.15s",
          }}
          title={post.liked ? "Tu as aimé — clique pour retirer" : "Aimer ce post"}
        >
          {post.liked ? "👍" : "🤍"} {post.upvotes} {post.liked ? "Tu aimes" : "J'aime"}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{ ...S.action, color: showComments ? CC_THEME.or : CC_THEME.inkMid, fontWeight: showComments ? 700 : 500 }}
          title="Commenter sans quitter la page"
        >
          💬 {commentCount} Commenter {showComments ? "▲" : "▼"}
        </button>
        <button onClick={sharePost} style={{ ...S.action, background: shareToast ? CC_THEME.successBg : "transparent", color: shareToast ? CC_THEME.success : CC_THEME.inkMid, fontWeight: shareToast ? 700 : 500 }} title="Partager le lien du post (photos/vidéos incluses)">
          🔗 {shareToast ? "Lien copié ✓" : "Partager"}
        </button>
        <button onClick={onOpen} style={{ ...S.action, marginLeft: "auto", color: CC_THEME.or, fontWeight: 600 }}>Voir le post →</button>
      </div>
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

function RoomsTab({ cercle, rooms, onChange }: { cercle: CercleDetail; rooms: LiveRoom[]; onChange: () => void }) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [provider, setProvider] = useState<"LIVEKIT" | "JITSI">("JITSI");
  const [busy, setBusy] = useState(false);

  const isMod = cercle.members?.[0]?.role === "OWNER" || cercle.members?.[0]?.role === "MODERATOR";

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await cerclesApi.createRoom(cercle.id, { title, scheduledAt: scheduledAt || undefined, provider });
      setCreating(false);
      setTitle("");
      setScheduledAt("");
      onChange();
    } finally { setBusy(false); }
  };

  const start = async (room: LiveRoom) => {
    await cerclesApi.startRoom(cercle.id, room.id);
    onChange();
  };

  return (
    <div>
      {isMod && !creating && (
        <button onClick={() => setCreating(true)} style={S.openComposeBtn}>+ Programmer une salle</button>
      )}
      {creating && (
        <div style={S.composer}>
          <input style={S.composerTitle} placeholder="Titre de la salle" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="datetime-local" style={{ ...S.composerTitle, marginTop: 8 }} value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
            <strong style={{ color: CC_THEME.inkMid }}>Plateforme :</strong>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="provider" checked={provider === "JITSI"} onChange={() => setProvider("JITSI")} />
              Jitsi <span style={{ color: CC_THEME.inkMuted }}>(public, marche immédiatement)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="radio" name="provider" checked={provider === "LIVEKIT"} onChange={() => setProvider("LIVEKIT")} />
              LiveKit <span style={{ color: CC_THEME.inkMuted }}>(interne, à provisionner)</span>
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button onClick={() => setCreating(false)} style={S.btnGhost}>Annuler</button>
            <button onClick={create} disabled={busy || !title.trim()} style={S.btnPrimary}>{busy ? "Création…" : "Programmer"}</button>
          </div>
        </div>
      )}

      {rooms.length === 0 && (
        <div style={S.emptyBox}>
          <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, marginBottom: 6 }}>Aucune salle</div>
          <div style={{ fontSize: 13, color: CC_THEME.inkMid, fontStyle: "italic" }}>Programme une visioconférence pour le cercle.</div>
        </div>
      )}

      {rooms.map(r => {
        const statusColor = r.status === "LIVE" ? CC_THEME.danger : r.status === "ENDED" ? CC_THEME.inkMuted : CC_THEME.info;
        return (
          <div key={r.id} style={S.roomCard}>
            <div style={S.roomHead}>
              <h3 style={S.roomTitle}>{r.title}</h3>
              <span style={{ ...S.roomStatus, color: statusColor, borderColor: statusColor + "40" }}>
                {r.status === "LIVE" ? "● EN DIRECT" : r.status}
              </span>
            </div>
            <div style={S.roomMeta}>
              {r.scheduledAt && <span>{new Date(r.scheduledAt).toLocaleString("fr-FR")}</span>}
              <span>· hôte {r.host.username || r.host.email}</span>
              <span>· max {r.maxParticipants} pers.</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {r.status === "SCHEDULED" && isMod && <button onClick={() => start(r)} style={S.btnPrimary}>▶ Démarrer</button>}
              {r.status === "LIVE" && <button onClick={() => navigate(`/cercles/${cercle.slug}/rooms/${r.slug}/live`)} style={S.btnPrimary}>📹 Rejoindre</button>}
              <button onClick={() => navigate(`/cercles/${cercle.slug}/rooms/${r.slug}`)} style={S.btnGhost}>Détails</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MembersTab({ cercleId, isMod }: { cercleId: string; isMod: boolean }) {
  const [members, setMembers] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [emailsInput, setEmailsInput] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<InviteResultItem[] | null>(null);

  useEffect(() => {
    cerclesApi.members(cercleId)
      .then((r: any) => setMembers(r.data))
      .catch(e => setErr(e?.message || "Erreur"));
  }, [cercleId]);

  const sendInvites = async () => {
    const emails = emailsInput
      .split(/[\s,;\n]+/)
      .map(e => e.trim())
      .filter(e => e.includes("@"));
    if (emails.length === 0) return;
    setBusy(true);
    try {
      const r = await invitationsApi.inviteByEmail(cercleId, emails, inviteMessage.trim() || undefined);
      setResults(r.data.results);
      setEmailsInput("");
      setInviteMessage("");
    } catch (e: any) {
      alert("Erreur invitations : " + (e?.message || "inconnue"));
    } finally {
      setBusy(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(
      () => { /* toast passé pour brièveté */ },
      () => window.prompt("Copiez le lien :", link),
    );
  };

  if (err) return <div style={{ color: CC_THEME.danger, padding: 12 }}>{err}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 14px", borderBottom: `1px solid ${CC_THEME.borderSoft}`, marginBottom: 14 }}>
        <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 17, color: CC_THEME.navy, fontWeight: 600 }}>
          👥 {members.length} membre{members.length > 1 ? "s" : ""} dans ce cercle
        </div>
        <div style={{ fontSize: 12, color: CC_THEME.inkMid, fontStyle: "italic" }}>
          Clique sur un membre pour voir son profil complet
        </div>
      </div>
      {isMod && !showInvite && (
        <button onClick={() => setShowInvite(true)} style={S.openComposeBtn}>
          ✉ Inviter par email
        </button>
      )}

      {showInvite && (
        <div style={S.composer}>
          <textarea
            style={{ ...S.composerBody, minHeight: 80 }}
            placeholder="Emails séparés par virgule, espace ou nouvelle ligne&#10;ex: archi1@cabinet.ma, archi2@cabinet.ma"
            value={emailsInput}
            onChange={e => setEmailsInput(e.target.value)}
          />
          <textarea
            style={{ ...S.composerBody, marginTop: 8, minHeight: 60 }}
            placeholder="Mot d'accompagnement (optionnel)"
            value={inviteMessage}
            onChange={e => setInviteMessage(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button onClick={() => { setShowInvite(false); setResults(null); }} style={S.btnGhost}>Fermer</button>
            <button onClick={sendInvites} disabled={busy || !emailsInput.trim()} style={S.btnPrimary}>
              {busy ? "Envoi…" : "Envoyer les invitations"}
            </button>
          </div>

          {results && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${CC_THEME.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: CC_THEME.inkMid, marginBottom: 8, fontWeight: 600 }}>
                {results.filter(r => r.status === "sent").length} envoyé(s) ·{" "}
                {results.filter(r => r.status === "link").length} lien(s) à copier ·{" "}
                {results.filter(r => r.status === "already-member").length} déjà membre(s) ·{" "}
                {results.filter(r => r.status === "failed").length} échec(s)
              </div>
              {results.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${CC_THEME.borderSoft}` }}>
                  <span style={{ fontSize: 11, color: statusColor(r.status), fontWeight: 600, minWidth: 80 }}>
                    {statusLabel(r.status)}
                  </span>
                  <span style={{ flex: 1, fontSize: 13 }}>{r.email}</span>
                  {r.link && r.status === "link" && (
                    <button onClick={() => copyLink(r.link)} style={{ ...S.btnGhost, fontSize: 11, padding: "4px 10px" }}>
                      Copier le lien
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {members.map((m, i) => {
        const pp = m.user?.proProfile;
        const displayName = pp?.displayName || m.user?.username || m.user?.email || "Membre";
        const apiUrl = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";
        const avatarUrl = pp?.avatarUrl
          ? (pp.avatarUrl.startsWith("http") ? pp.avatarUrl : `${apiUrl}${pp.avatarUrl}`)
          : null;
        return (
          <Link key={m.id || i} to={`/cercles/profile/${m.user.id || m.userId}`} style={{ ...S.memberRow, textDecoration: "none", color: "inherit", cursor: "pointer" }}>
            <div style={{
              ...S.postAvatar,
              backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
            }}>
              {!avatarUrl && displayName.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.postAuthor, display: "flex", alignItems: "center", gap: 8 }}>
                {displayName}
                {m.role === "OWNER" && <span style={{ fontSize: 10, color: CC_THEME.or, background: CC_THEME.orSoft, padding: "1px 6px", borderRadius: 8, fontWeight: 600, letterSpacing: "0.04em" }}>OWNER</span>}
                {m.role === "MODERATOR" && <span style={{ fontSize: 10, color: CC_THEME.info, background: CC_THEME.infoBg, padding: "1px 6px", borderRadius: 8, fontWeight: 600 }}>MODO</span>}
              </div>
              {pp?.title && <div style={{ fontSize: 12, color: CC_THEME.inkMid, fontStyle: "italic", marginTop: 2 }}>{pp.title}</div>}
              <div style={S.roomMeta}>
                {pp?.metier && <span style={{ color: CC_THEME.or, fontWeight: 500 }}>{pp.metier}</span>}
                {pp?.villePrincipale && <> · 📍 {pp.villePrincipale}</>}
                {" · "}membre depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <span style={{ color: CC_THEME.or, fontSize: 18 }}>→</span>
          </Link>
        );
      })}
    </div>
  );
}

function statusLabel(s: string): string {
  return s === "sent" ? "✓ envoyé" : s === "link" ? "🔗 lien" : s === "already-member" ? "membre" : "✗ échec";
}
function statusColor(s: string): string {
  return s === "sent" ? CC_THEME.success : s === "link" ? CC_THEME.or : s === "already-member" ? CC_THEME.inkMid : CC_THEME.danger;
}

function visLabel(v: string): string {
  return v === "PUBLIC" ? "Public" : v === "MEMBERS_ONLY" ? "Membres seuls" : "Privé";
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

const S: Record<string, React.CSSProperties> = {
  header: { padding: "32px 36px 20px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24 },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 8px", fontFamily: CC_THEME.fontDisplay, fontSize: 30, fontWeight: 600, color: CC_THEME.navy, letterSpacing: "-0.01em" },
  desc: { margin: 0, color: CC_THEME.inkMid, fontSize: 14, fontStyle: "italic", maxWidth: 560, lineHeight: 1.55 },
  themes: { marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 },
  theme: { fontSize: 11, color: CC_THEME.or, background: CC_THEME.orSoft + "60", padding: "3px 8px", borderRadius: 4, letterSpacing: "0.04em" },

  headerRight: { display: "flex", gap: 12, alignItems: "center" },
  stat: { textAlign: "right", padding: "8px 14px", background: CC_THEME.bgSoft, borderRadius: 8 },
  statValue: { fontFamily: CC_THEME.fontDisplay, fontSize: 22, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontSize: 9.5, color: CC_THEME.inkMuted, letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 4 },
  joinBtn: { background: CC_THEME.or, color: CC_THEME.bg, border: 0, padding: "10px 18px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  chatBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 18px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  tabs: { display: "flex", gap: 4, padding: "0 36px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised },
  body: { padding: "24px 36px 60px", maxWidth: 920 },

  openComposeBtn: { width: "100%", padding: "14px 18px", background: CC_THEME.bgRaised, border: `2px dashed ${CC_THEME.border}`, borderRadius: 8, color: CC_THEME.inkMid, fontFamily: "inherit", fontSize: 13, cursor: "pointer", marginBottom: 18, transition: `all 0.15s ${CC_THEME.ease}` },
  composer: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 18, marginBottom: 18, boxShadow: CC_THEME.shadowSoft },
  composerTitle: { width: "100%", padding: "9px 12px", fontSize: 14, fontFamily: CC_THEME.fontDisplay, fontWeight: 600, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", boxSizing: "border-box" },
  composerBody: { width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: CC_THEME.fontBody, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", marginTop: 8, resize: "vertical", boxSizing: "border-box" },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "8px 16px", borderRadius: 5, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { background: "transparent", color: CC_THEME.inkMid, border: `1px solid ${CC_THEME.border}`, padding: "8px 14px", borderRadius: 5, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" },

  postCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 20, marginBottom: 14, boxShadow: CC_THEME.shadowSoft },
  postHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 },
  postAvatar: { width: 36, height: 36, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 14, fontWeight: 700 },
  postAuthor: { fontSize: 13, fontWeight: 600, color: CC_THEME.ink },
  postDate: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 1 },
  pinBadge: { marginLeft: "auto", fontSize: 10, color: CC_THEME.warn, background: CC_THEME.warnBg, padding: "3px 8px", borderRadius: 3, fontWeight: 600 },
  resolveBadge: { fontSize: 10, color: CC_THEME.success, background: CC_THEME.successBg, padding: "3px 8px", borderRadius: 3, fontWeight: 600 },
  postTitle: { margin: "4px 0 8px", fontFamily: CC_THEME.fontDisplay, fontSize: 17, color: CC_THEME.navy, fontWeight: 600, cursor: "pointer" },
  postBody: { fontSize: 13.5, color: CC_THEME.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" },
  postFooter: { display: "flex", gap: 12, alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${CC_THEME.borderSoft}` },
  action: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: "8px 14px", borderRadius: 18, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 500 },

  roomCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 18, marginBottom: 12, boxShadow: CC_THEME.shadowSoft },
  roomHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  roomTitle: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600 },
  roomStatus: { fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 3, letterSpacing: "0.10em", border: "1px solid" },
  roomMeta: { fontSize: 12, color: CC_THEME.inkMid, display: "flex", gap: 6, flexWrap: "wrap" },

  emptyBox: { padding: 36, textAlign: "center", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10 },

  memberRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, marginBottom: 8, transition: `all 0.15s ${CC_THEME.ease}` },
};
