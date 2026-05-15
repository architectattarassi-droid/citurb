/**
 * DirectMessagesPage — Sprint L
 *
 * Messagerie directe 1-to-1 entre pros (style LinkedIn/Messenger).
 *
 * URL : /cercles/messages           → liste threads + zone vide
 *       /cercles/messages/:tid      → liste threads + conversation active
 *       /cercles/messages/new/:peerId → ouvre/crée thread avec peerId
 */

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { CC_THEME, ensureFonts } from "./theme";
import { dmApi, DMThreadListItem, DMMessage } from "./api";
import { apiBase } from "../../tomes/tome4/apiClient";

function resolveAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/")) return `${apiBase()}${url}`;
  return url;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });
}

export default function DirectMessagesPage() {
  useEffect(() => { ensureFonts(); }, []);
  const navigate = useNavigate();
  const { threadId: routeTid, peerId } = useParams<{ threadId?: string; peerId?: string }>();
  const [threads, setThreads] = useState<DMThreadListItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeTid, setActiveTid] = useState<string | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  // Récupère le user courant (id) depuis JWT
  useEffect(() => {
    try {
      const t = localStorage.getItem("citurbarea.token");
      if (t) {
        const payload = JSON.parse(atob(t.split(".")[1]));
        setMeId(payload.userId || payload.sub);
      }
    } catch {}
  }, []);

  // Liste threads
  const reloadThreads = async () => {
    setLoadingThreads(true);
    try {
      const r = await dmApi.listThreads();
      if (r.ok) setThreads(r.data);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement");
    } finally {
      setLoadingThreads(false);
    }
  };
  useEffect(() => { reloadThreads(); }, []);

  // Si /messages/new/:peerId → crée/retrouve thread puis navigue vers /messages/:tid
  useEffect(() => {
    if (!peerId) return;
    (async () => {
      try {
        const r = await dmApi.createThread(peerId);
        if (r.ok) {
          await reloadThreads();
          navigate(`/cercles/messages/${r.data.threadId}`, { replace: true });
        }
      } catch (e: any) {
        setErr(e?.message || "Impossible de créer la conversation");
        navigate("/cercles/messages", { replace: true });
      }
    })();
  }, [peerId, navigate]);

  // Thread actif
  useEffect(() => {
    setActiveTid(routeTid || null);
  }, [routeTid]);

  // Charger messages du thread actif
  useEffect(() => {
    if (!activeTid) { setMessages([]); return; }
    let cancelled = false;
    setLoadingMsgs(true);
    dmApi.listMessages(activeTid, { take: 50 })
      .then(r => { if (r.ok && !cancelled) setMessages(r.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingMsgs(false); });
    // Marque comme lu
    dmApi.markRead(activeTid).catch(() => {});
    return () => { cancelled = true; };
  }, [activeTid]);

  // Scroll bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // SSE temps réel
  useEffect(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    const es = dmApi.events();
    esRef.current = es;
    es.addEventListener("dm:new", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        const { threadId, message } = data;
        if (threadId === activeTid) {
          setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
          // Auto-mark read si la conversation est ouverte
          dmApi.markRead(threadId).catch(() => {});
        }
        reloadThreads();
      } catch {}
    });
    es.addEventListener("dm:delete", (ev: MessageEvent) => {
      try {
        const { threadId, messageId } = JSON.parse(ev.data);
        if (threadId === activeTid) {
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), body: "" } : m));
        }
      } catch {}
    });
    return () => { es.close(); esRef.current = null; };
  }, [activeTid]);

  const send = async () => {
    if (!activeTid || !draft.trim() || sending) return;
    setSending(true); setErr(null);
    const tempBody = draft;
    setDraft("");
    try {
      const r = await dmApi.sendMessage(activeTid, tempBody);
      if (r.ok) {
        // Le SSE va déjà push le message à tous les participants (dont moi)
        // mais on l'ajoute optimistement pour latence zéro
        setMessages(prev => prev.some(m => m.id === r.data.id) ? prev : [...prev, r.data]);
        reloadThreads();
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur envoi");
      setDraft(tempBody); // restore
    } finally { setSending(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const activeThread = threads.find(t => t.threadId === activeTid);

  return (
    <div style={S.root}>
      {/* Sidebar: liste threads */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <Link to="/cercles" style={S.back}>← Cercles</Link>
          <h1 style={S.title}>Messagerie</h1>
          <p style={S.subtitle}>Conversations privées entre pros</p>
        </div>

        <div style={S.threadList}>
          {loadingThreads && <div style={S.empty}>Chargement…</div>}
          {!loadingThreads && threads.length === 0 && (
            <div style={S.empty}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontSize: 14, color: CC_THEME.inkMid }}>
                Aucune conversation pour l'instant.
              </div>
              <div style={{ fontSize: 12, color: CC_THEME.inkMuted, marginTop: 8, fontStyle: "italic" }}>
                Visite un profil pro et clique sur "Message" pour démarrer.
              </div>
              <Link to="/cercles/annuaire" style={{ ...S.btnGhost, marginTop: 14, display: "inline-block" }}>
                Parcourir l'annuaire →
              </Link>
            </div>
          )}
          {threads.map(t => {
            const isActive = t.threadId === activeTid;
            return (
              <Link
                key={t.threadId}
                to={`/cercles/messages/${t.threadId}`}
                style={{ ...S.threadRow, ...(isActive ? S.threadRowActive : {}) }}
              >
                <div style={{
                  ...S.avatar,
                  backgroundImage: t.peer?.avatarUrl ? `url(${resolveAvatarUrl(t.peer.avatarUrl)})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}>
                  {!t.peer?.avatarUrl && (t.peer?.displayName?.[0] || "?").toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.threadTopLine}>
                    <span style={S.threadName}>{t.peer?.displayName || "Inconnu"}</span>
                    <span style={S.threadTime}>{timeAgo(t.lastMessageAt)}</span>
                  </div>
                  <div style={S.threadPreview}>
                    {t.lastMessageBody || (t.peer?.title || "Nouvelle conversation")}
                  </div>
                </div>
                {t.unreadCount > 0 && <span style={S.unreadBadge}>{t.unreadCount}</span>}
                {t.pinned && <span style={S.pinBadge}>📌</span>}
              </Link>
            );
          })}
        </div>
      </aside>

      {/* Main: conversation */}
      <main style={S.main}>
        {!activeTid && (
          <div style={S.placeholder}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
            <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, marginBottom: 8 }}>
              Sélectionne une conversation
            </div>
            <div style={{ fontSize: 14, color: CC_THEME.inkMid, fontStyle: "italic", maxWidth: 400, textAlign: "center" }}>
              Tes messages restent strictement confidentiels — seuls toi et ton interlocuteur les voyez.
            </div>
          </div>
        )}

        {activeTid && activeThread && (
          <>
            <header style={S.convHeader}>
              <Link to={`/cercles/profile/${activeThread.peer?.userId}`} style={S.convPeer}>
                <div style={{
                  ...S.convAvatar,
                  backgroundImage: activeThread.peer?.avatarUrl ? `url(${resolveAvatarUrl(activeThread.peer.avatarUrl)})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}>
                  {!activeThread.peer?.avatarUrl && (activeThread.peer?.displayName?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div style={S.convName}>{activeThread.peer?.displayName}</div>
                  <div style={S.convMeta}>
                    {activeThread.peer?.title || activeThread.peer?.metier || ""}
                    {activeThread.peer?.villePrincipale ? ` · ${activeThread.peer.villePrincipale}` : ""}
                  </div>
                </div>
              </Link>
              <div style={{ flex: 1 }} />
              <button
                onClick={async () => { await dmApi.pinToggle(activeTid); reloadThreads(); }}
                style={S.iconBtn}
                title={activeThread.pinned ? "Désépingler" : "Épingler"}
              >
                {activeThread.pinned ? "📌" : "📍"}
              </button>
            </header>

            <div style={S.msgList}>
              {loadingMsgs && <div style={S.empty}>Chargement des messages…</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div style={S.empty}>
                  Aucun message. Envoie le premier ! 👋
                </div>
              )}
              {messages.map(m => {
                const mine = m.senderId === meId;
                if (m.deletedAt) {
                  return (
                    <div key={m.id} style={{ ...S.msgRow, justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ ...S.msgBubble, background: CC_THEME.bgSoft, fontStyle: "italic", color: CC_THEME.inkMuted }}>
                        Message supprimé
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} style={{ ...S.msgRow, justifyContent: mine ? "flex-end" : "flex-start" }}>
                    <div style={{
                      ...S.msgBubble,
                      background: mine ? CC_THEME.navy : CC_THEME.bgRaised,
                      color: mine ? CC_THEME.bg : CC_THEME.ink,
                      border: mine ? "none" : `1px solid ${CC_THEME.border}`,
                    }}>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                      <div style={{ ...S.msgTime, color: mine ? "rgba(250,247,242,0.65)" : CC_THEME.inkMuted }}>
                        {fmtTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <footer style={S.composer}>
              {err && <div style={S.err}>⚠ {err}</div>}
              <div style={S.composerInputRow}>
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Écris un message…"
                  style={S.composerInput}
                  rows={2}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  style={{ ...S.sendBtn, opacity: (sending || !draft.trim()) ? 0.5 : 1 }}
                >
                  {sending ? "…" : "Envoyer"}
                </button>
              </div>
              <div style={S.composerHint}>
                Entrée pour envoyer · Maj+Entrée pour saut de ligne · Discussions confidentielles entre toi et ton interlocuteur
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", height: "100vh", background: CC_THEME.bg, fontFamily: CC_THEME.fontBody, color: CC_THEME.ink, overflow: "hidden" },

  // Sidebar threads
  sidebar: { width: 340, flexShrink: 0, background: CC_THEME.bgRaised, borderRight: `1px solid ${CC_THEME.border}`, display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarHeader: { padding: "20px 22px", borderBottom: `1px solid ${CC_THEME.border}` },
  back: { color: CC_THEME.inkMid, textDecoration: "none", fontSize: 12, display: "inline-block", marginBottom: 8 },
  title: { margin: 0, fontFamily: CC_THEME.fontDisplay, fontSize: 22, color: CC_THEME.navy, fontWeight: 600 },
  subtitle: { fontSize: 11, color: CC_THEME.inkMuted, fontStyle: "italic", margin: "2px 0 0" },

  threadList: { flex: 1, overflowY: "auto", padding: "8px 0" },
  empty: { padding: 24, textAlign: "center", color: CC_THEME.inkMuted, fontSize: 13, fontStyle: "italic" },
  threadRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", textDecoration: "none", color: CC_THEME.ink, borderLeft: `3px solid transparent`, transition: `all 0.15s ${CC_THEME.ease}`, cursor: "pointer" },
  threadRowActive: { background: CC_THEME.bgSoft, borderLeftColor: CC_THEME.or },

  avatar: { width: 42, height: 42, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 17, fontWeight: 700, flexShrink: 0 },
  threadTopLine: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  threadName: { fontSize: 13.5, fontWeight: 600, color: CC_THEME.navy, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  threadTime: { fontSize: 10, color: CC_THEME.inkMuted, fontStyle: "italic", flexShrink: 0 },
  threadPreview: { fontSize: 12, color: CC_THEME.inkMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 },
  unreadBadge: { background: CC_THEME.or, color: CC_THEME.bgDeep, fontSize: 10.5, fontWeight: 700, minWidth: 18, height: 18, padding: "0 6px", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pinBadge: { fontSize: 10, opacity: 0.6 },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "8px 14px", borderRadius: 6, fontSize: 12, textDecoration: "none" },

  // Main conversation
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  placeholder: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: CC_THEME.inkMid, padding: 40 },

  convHeader: { display: "flex", alignItems: "center", gap: 12, padding: "16px 24px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised },
  convPeer: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: CC_THEME.ink },
  convAvatar: { width: 44, height: 44, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 700, flexShrink: 0, border: `2px solid ${CC_THEME.or}` },
  convName: { fontSize: 15, fontWeight: 600, color: CC_THEME.navy },
  convMeta: { fontSize: 11.5, color: CC_THEME.inkMuted, marginTop: 2 },
  iconBtn: { background: "transparent", border: 0, fontSize: 18, cursor: "pointer", padding: 6, borderRadius: 4 },

  msgList: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 },
  msgRow: { display: "flex" },
  msgBubble: { maxWidth: "70%", padding: "10px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.45 },
  msgTime: { fontSize: 10, marginTop: 4, textAlign: "right" as const },

  composer: { padding: "12px 18px 16px", borderTop: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised },
  composerInputRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  composerInput: { flex: 1, padding: "10px 14px", border: `1px solid ${CC_THEME.border}`, borderRadius: 8, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none" as const, background: CC_THEME.bg },
  sendBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "10px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em" },
  composerHint: { fontSize: 10, color: CC_THEME.inkMuted, fontStyle: "italic", marginTop: 6, textAlign: "center" as const },
  err: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "6px 12px", borderRadius: 4, fontSize: 12, marginBottom: 8 },
};
