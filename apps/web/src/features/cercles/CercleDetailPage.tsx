import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import { cerclesApi, invitationsApi, CercleDetail, CerclePost, LiveRoom, InviteResultItem } from "./api";

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
    if (!cercle || !composeBody.trim()) return;
    setPosting(true);
    try {
      await cerclesApi.createPost(cercle.id, { title: composeTitle.trim() || undefined, body: composeBody });
      setComposeBody("");
      setComposeTitle("");
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
    await cerclesApi.upvote(cercle.id, postId);
    await loadAll();
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
            <TabBtn active={tab === "discussions"} onClick={() => setTab("discussions")}>Discussions</TabBtn>
            <TabBtn active={tab === "rooms"}       onClick={() => setTab("rooms")}>Salles vidéo</TabBtn>
            <TabBtn active={tab === "members"}     onClick={() => setTab("members")}>Membres</TabBtn>
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
                      placeholder="Partagez avec le cercle… (markdown supporté)"
                      value={composeBody}
                      onChange={e => setComposeBody(e.target.value)}
                      rows={5}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button onClick={() => { setComposing(false); setComposeBody(""); setComposeTitle(""); }} style={S.btnGhost}>Annuler</button>
                      <button onClick={submitPost} disabled={posting || !composeBody.trim()} style={S.btnPrimary}>
                        {posting ? "Publication…" : "Publier"}
                      </button>
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
        <div style={S.postAvatar}>{(post.author.username || post.author.email || "?").slice(0, 1).toUpperCase()}</div>
        <div>
          <div style={S.postAuthor}>{post.author.username || post.author.email}</div>
          <div style={S.postDate}>{new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        {post.isPinned && <span style={S.pinBadge}>📌 Épinglé</span>}
        {post.isResolved && <span style={S.resolveBadge}>✓ Résolu</span>}
      </div>
      {post.title && <h3 style={S.postTitle} onClick={onOpen}>{post.title}</h3>}
      <div style={S.postBody}>{truncate(post.body, 320)}</div>
      <div style={S.postFooter}>
        <button onClick={onUpvote} style={S.action}>👍 {post.upvotes}</button>
        <button onClick={onOpen}   style={S.action}>💬 {post.replyCount}</button>
        <button onClick={sharePost} style={S.action} title="Partager le lien du post">
          🔗 {shareToast ? "Lien copié ✓" : "Partager"}
        </button>
        <button onClick={onOpen}   style={{ ...S.action, marginLeft: "auto", color: CC_THEME.or }}>Lire la suite →</button>
      </div>
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

      {members.map((m, i) => (
        <div key={m.id || i} style={S.memberRow}>
          <div style={S.postAvatar}>{(m.user.username || m.user.email).slice(0, 1).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={S.postAuthor}>{m.user.username || m.user.email}</div>
            <div style={S.roomMeta}>{m.role} · membre depuis {new Date(m.joinedAt).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
      ))}
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
  action: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  roomCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10, padding: 18, marginBottom: 12, boxShadow: CC_THEME.shadowSoft },
  roomHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  roomTitle: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 16, color: CC_THEME.navy, fontWeight: 600 },
  roomStatus: { fontSize: 10.5, fontWeight: 600, padding: "4px 10px", borderRadius: 3, letterSpacing: "0.10em", border: "1px solid" },
  roomMeta: { fontSize: 12, color: CC_THEME.inkMid, display: "flex", gap: 6, flexWrap: "wrap" },

  emptyBox: { padding: 36, textAlign: "center", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 10 },

  memberRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, marginBottom: 6 },
};
