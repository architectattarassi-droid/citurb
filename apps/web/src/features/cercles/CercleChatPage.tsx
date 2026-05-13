/**
 * CercleChatPage — Sprint E1-E3
 *
 * Chat temps réel par cercle (style WhatsApp/Messenger groupe).
 *  - flux ASC chronologique avec auto-scroll bottom sur nouveaux messages
 *  - SSE EventSource pour push temps réel (message:new/edit/delete/reaction/read/typing)
 *  - composer : textarea + attach images/vidéos/fichiers, envoi sur Enter (Shift+Enter = newline)
 *  - bulles différenciées émetteur (bgDeep/or) vs autres (bgRaised/ink)
 *  - réactions emoji whitelist 6, replies 1 niveau, édit/suppression auteur, ✓✓ lectures
 *  - image lightbox au clic, <video controls> inline
 *  - typing indicator + read receipts en temps réel
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, Link } from "react-router-dom";
import MediaEmbed, { extractUrls, isEmbeddable } from "./MediaEmbed";

function extractEmbeddableUrls(text: string): string[] {
  return extractUrls(text).filter(isEmbeddable);
}
import CerclesShell from "./CerclesShell";
import { CC_THEME } from "./theme";
import {
  cerclesApi,
  messagesApi,
  CercleDetail,
  ChatMessage,
  MessageAttachment,
} from "./api";

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const TYPING_DEBOUNCE_MS = 1500;

type TypingPing = { userId: string; displayName: string; at: number };

export default function CercleChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const [cercle, setCercle] = useState<CercleDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestId, setOldestId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [composing, setComposing] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [editBody, setEditBody] = useState("");
  const [lightbox, setLightbox] = useState<MessageAttachment | null>(null);
  const [typers, setTypers] = useState<TypingPing[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[] | null>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef<number>(0);
  const esRef = useRef<EventSource | null>(null);

  // ── Bootstrap : me + cercle ─────────────────────────────────────

  useEffect(() => {
    fetch(`${(import.meta as any).env?.VITE_API_URL || "http://localhost:4000"}/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("citurbarea.token") || ""}` },
    })
      .then((r) => r.json())
      .then((j) => setMeId(j?.user?.userId || j?.user?.id || null))
      .catch(() => {});
  }, []);

  const loadCercle = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await cerclesApi.detail(slug);
      setCercle(r.data);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement cercle");
    }
  }, [slug]);

  const loadInitial = useCallback(async (cercleId: string) => {
    setLoading(true);
    try {
      const r = await messagesApi.list(cercleId, { take: 40 });
      setMessages(r.data);
      setHasMore(r.meta.hasMore);
      setOldestId(r.meta.oldestId);
      setTimeout(() => scrollToBottom(), 0);
      // Mark all read
      if (r.data.length > 0) {
        const last = r.data[r.data.length - 1];
        messagesApi.markRead(cercleId, last.id).catch(() => {});
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCercle();
  }, [loadCercle]);

  useEffect(() => {
    if (cercle) loadInitial(cercle.id);
  }, [cercle, loadInitial]);

  // ── SSE temps réel ──────────────────────────────────────────────

  useEffect(() => {
    if (!cercle) return;
    const url = messagesApi.streamUrl(cercle.id);
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("message:new", (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data) as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom(), 30);
        if (meId && msg.authorId !== meId) {
          messagesApi.markRead(cercle.id, msg.id).catch(() => {});
        }
      } catch {}
    });

    es.addEventListener("message:edit", (ev: MessageEvent) => {
      try {
        const updated = JSON.parse(ev.data) as ChatMessage;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, body: updated.body, editedAt: updated.editedAt, attachments: updated.attachments ?? m.attachments } : m)));
      } catch {}
    });

    es.addEventListener("message:delete", (ev: MessageEvent) => {
      try {
        const { id } = JSON.parse(ev.data);
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deletedAt: new Date().toISOString(), body: "" } : m)));
      } catch {}
    });

    es.addEventListener("message:reaction", (ev: MessageEvent) => {
      try {
        const { messageId, reactions } = JSON.parse(ev.data);
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
      } catch {}
    });

    es.addEventListener("message:read", (ev: MessageEvent) => {
      try {
        const { userId, messageIds, readAt } = JSON.parse(ev.data);
        setMessages((prev) =>
          prev.map((m) => {
            if (!messageIds.includes(m.id)) return m;
            if (m.reads.some((r) => r.userId === userId)) return m;
            return { ...m, reads: [...m.reads, { userId, readAt }] };
          }),
        );
      } catch {}
    });

    es.addEventListener("typing", (ev: MessageEvent) => {
      try {
        const { userId, displayName, isTyping, at } = JSON.parse(ev.data);
        if (meId && userId === meId) return;
        setTypers((prev) => {
          const others = prev.filter((p) => p.userId !== userId);
          if (isTyping) return [...others, { userId, displayName, at }];
          return others;
        });
      } catch {}
    });

    es.onerror = () => {
      // EventSource auto-reconnects par défaut
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [cercle, meId]);

  // ── Cleanup typers (>4s sans signal) ───────────────────────────

  useEffect(() => {
    const t = setInterval(() => {
      const cutoff = Date.now() - 4000;
      setTypers((prev) => prev.filter((p) => p.at >= cutoff));
    }, 1500);
    return () => clearInterval(t);
  }, []);

  // ── Scroll & pagination ─────────────────────────────────────────

  function scrollToBottom() {
    const el = flowRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  const loadOlder = async () => {
    if (!cercle || !hasMore || !oldestId || loading) return;
    setLoading(true);
    try {
      const r = await messagesApi.list(cercle.id, { beforeId: oldestId, take: 40 });
      const el = flowRef.current;
      const prevH = el?.scrollHeight ?? 0;
      const prevTop = el?.scrollTop ?? 0;
      setMessages((prev) => [...r.data, ...prev]);
      setHasMore(r.meta.hasMore);
      setOldestId(r.meta.oldestId);
      // Maintain scroll position
      requestAnimationFrame(() => {
        if (!el) return;
        const newH = el.scrollHeight;
        el.scrollTop = prevTop + (newH - prevH);
      });
    } finally {
      setLoading(false);
    }
  };

  const onScroll = () => {
    const el = flowRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loading) loadOlder();
  };

  // ── Composer actions ────────────────────────────────────────────

  const handleTyping = (val: string) => {
    setComposing(val);
    if (!cercle) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > TYPING_DEBOUNCE_MS) {
      lastTypingSentRef.current = now;
      messagesApi.typing(cercle.id, true).catch(() => {});
    }
  };

  const sendMessage = async () => {
    if (!cercle) return;
    const body = composing.trim();
    if (!body && pendingFiles.length === 0) return;
    setSending(true);
    try {
      let attachments: any[] = [];
      if (pendingFiles.length > 0) {
        setUploadPct(0);
        const uploaded = await messagesApi.upload(cercle.id, pendingFiles, (p) => setUploadPct(p));
        attachments = uploaded.map((u) => ({
          type: u.type,
          fileKey: u.fileKey,
          filename: u.filename,
          mimeType: u.mimeType,
          sizeBytes: u.sizeBytes,
        }));
      }
      await messagesApi.send(cercle.id, {
        body,
        replyToId: replyTo?.id,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setComposing("");
      setPendingFiles([]);
      setReplyTo(null);
      setUploadPct(null);
      messagesApi.typing(cercle.id, false).catch(() => {});
    } catch (e: any) {
      alert("Erreur envoi : " + (e?.message || "inconnue"));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startEdit = (m: ChatMessage) => {
    setEditing(m);
    setEditBody(m.body);
  };

  const saveEdit = async () => {
    if (!cercle || !editing) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    try {
      await messagesApi.edit(cercle.id, editing.id, trimmed);
      setEditing(null);
      setEditBody("");
    } catch (e: any) {
      alert("Erreur édition : " + (e?.message || "inconnue"));
    }
  };

  const deleteMsg = async (m: ChatMessage) => {
    if (!cercle) return;
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await messagesApi.remove(cercle.id, m.id);
    } catch (e: any) {
      alert("Erreur suppression : " + (e?.message || "inconnue"));
    }
  };

  const toggleReaction = async (m: ChatMessage, emoji: string) => {
    if (!cercle) return;
    try {
      await messagesApi.react(cercle.id, m.id, emoji);
    } catch {}
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 10);
    setPendingFiles((prev) => [...prev, ...arr].slice(0, 10));
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const runSearch = async () => {
    if (!cercle) return;
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const r = await messagesApi.search(cercle.id, q);
    setSearchResults(r.data);
  };

  // ── Render ──────────────────────────────────────────────────────

  const groupedDays = useMemo(() => groupByDay(messages), [messages]);

  return (
    <CerclesShell>
      {!cercle && err && <div style={{ padding: 24, color: CC_THEME.danger }}>{err}</div>}
      {!cercle && !err && <div style={S.loading}>Chargement…</div>}
      {cercle && (
        <div style={S.root}>
          <header style={S.header}>
            <Link to={`/cercles/${cercle.slug}`} style={S.backLink}>← Retour</Link>
            <div style={{ flex: 1 }}>
              <div style={S.headerTitle}>{cercle.name}</div>
              <div style={S.headerSub}>
                {cercle._count.members} membre(s)
                {typers.length > 0 && (
                  <span style={S.typing}>
                    {" · "}
                    {typers.map((t) => t.displayName).join(", ")} {typers.length === 1 ? "écrit" : "écrivent"}…
                  </span>
                )}
              </div>
            </div>
            <input
              style={S.searchInput}
              placeholder="Rechercher dans la discussion…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
            {searchResults && (
              <button onClick={() => { setSearch(""); setSearchResults(null); }} style={S.clearSearchBtn}>×</button>
            )}
          </header>

          {searchResults ? (
            <div style={S.flow}>
              <div style={S.searchHeader}>
                {searchResults.length} résultat(s) pour « {search} »
              </div>
              {searchResults.map((m) => (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMine={meId === m.authorId}
                  meId={meId}
                  onReact={() => {}}
                  onReply={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onOpenAttachment={(a) => setLightbox(a)}
                  compact
                />
              ))}
            </div>
          ) : (
            <div ref={flowRef} style={S.flow} onScroll={onScroll}>
              {hasMore && (
                <div style={S.loadOlder}>
                  <button onClick={loadOlder} disabled={loading} style={S.loadOlderBtn}>
                    {loading ? "Chargement…" : "↑ Charger les messages plus anciens"}
                  </button>
                </div>
              )}

              {messages.length === 0 && !loading && (
                <div style={S.emptyBox}>
                  <div style={{ fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, marginBottom: 6 }}>
                    Aucun message
                  </div>
                  <div style={{ fontSize: 13, color: CC_THEME.inkMid, fontStyle: "italic" }}>
                    Lance la conversation 👋
                  </div>
                </div>
              )}

              {groupedDays.map(({ day, items }) => (
                <React.Fragment key={day}>
                  <div style={S.daySep}><span style={S.dayChip}>{formatDay(day)}</span></div>
                  {items.map((m) => (
                    <MessageBubble
                      key={m.id}
                      msg={m}
                      isMine={meId === m.authorId}
                      meId={meId}
                      onReact={(emoji) => toggleReaction(m, emoji)}
                      onReply={() => setReplyTo(m)}
                      onEdit={() => startEdit(m)}
                      onDelete={() => deleteMsg(m)}
                      onOpenAttachment={(a) => setLightbox(a)}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Composer */}
          <div style={S.composerWrap}>
            {replyTo && (
              <div style={S.replyChip}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.replyTitle}>Réponse à {replyTo.author.username || replyTo.author.email}</div>
                  <div style={S.replyBody}>{replyTo.body.slice(0, 120) || "(pièce jointe)"}</div>
                </div>
                <button onClick={() => setReplyTo(null)} style={S.replyClose}>×</button>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div style={S.attachStrip}>
                {pendingFiles.map((f, i) => (
                  <div key={i} style={S.attachThumb}>
                    {f.type.startsWith("image/") ? (
                      <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4 }} />
                    ) : f.type.startsWith("video/") ? (
                      <div style={S.fileIcon}>🎬</div>
                    ) : f.type.startsWith("audio/") ? (
                      <div style={S.fileIcon}>🎵</div>
                    ) : (
                      <div style={S.fileIcon}>📄</div>
                    )}
                    <div style={S.attachName}>{f.name}</div>
                    <button onClick={() => removePending(i)} style={S.attachRemove}>×</button>
                  </div>
                ))}
                {uploadPct !== null && (
                  <div style={S.uploadBar}>
                    <div style={{ ...S.uploadFill, width: `${uploadPct}%` }} />
                  </div>
                )}
              </div>
            )}

            <div style={S.composer}>
              <label style={S.attachBtn} title="Joindre des fichiers">
                📎
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={(e) => onPickFiles(e.target.files)}
                  style={{ display: "none" }}
                />
              </label>
              <textarea
                style={S.textarea}
                placeholder="Écrire un message…   (Entrée = envoyer · Maj+Entrée = saut de ligne)"
                value={composing}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={sending || (!composing.trim() && pendingFiles.length === 0)}
                style={S.sendBtn}
              >
                {sending ? "…" : "Envoyer"}
              </button>
            </div>
          </div>

          {/* Edit modal */}
          {editing && (
            <div style={S.modalOverlay} onClick={() => setEditing(null)}>
              <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.modalTitle}>Modifier le message</div>
                <textarea
                  style={S.editArea}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button onClick={() => setEditing(null)} style={S.btnGhost}>Annuler</button>
                  <button onClick={saveEdit} style={S.btnPrimary} disabled={!editBody.trim()}>Enregistrer</button>
                </div>
              </div>
            </div>
          )}

          {/* Lightbox */}
          {lightbox && (
            <div style={S.lightbox} onClick={() => setLightbox(null)}>
              <button style={S.lightboxClose} onClick={() => setLightbox(null)}>×</button>
              {lightbox.type === "IMAGE" ? (
                <img src={messagesApi.fileUrl(lightbox.fileKey)} alt={lightbox.filename} style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain" }} />
              ) : lightbox.type === "VIDEO" ? (
                <video src={messagesApi.fileUrl(lightbox.fileKey)} controls autoPlay style={{ maxWidth: "92vw", maxHeight: "92vh" }} />
              ) : (
                <div style={S.fileBoxBig}>
                  <div style={{ fontSize: 48 }}>📄</div>
                  <div style={{ marginTop: 12 }}>{lightbox.filename}</div>
                  <a href={messagesApi.fileUrl(lightbox.fileKey)} target="_blank" rel="noreferrer" style={S.btnPrimary}>Télécharger</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </CerclesShell>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
  meId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onOpenAttachment,
  compact = false,
}: {
  msg: ChatMessage;
  isMine: boolean;
  meId: string | null;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenAttachment: (a: MessageAttachment) => void;
  compact?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const isDeleted = !!msg.deletedAt;
  const author = msg.author?.username || msg.author?.email || "Membre";
  const reactionGroups = useMemo(() => groupReactions(msg.reactions), [msg.reactions]);
  const readByOthers = useMemo(
    () => msg.reads.filter((r) => r.userId !== meId && r.userId !== msg.authorId),
    [msg.reads, meId, msg.authorId],
  );

  return (
    <div
      style={{
        ...S.bubbleRow,
        justifyContent: isMine ? "flex-end" : "flex-start",
      }}
      onMouseEnter={() => !compact && setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {!isMine && (
        <Link to={`/cercles/profile/${msg.author?.id || msg.authorId}`} style={{ ...S.avatar, textDecoration: "none", cursor: "pointer" }} title={`Voir le profil de ${author}`}>
          {author.slice(0, 1).toUpperCase()}
        </Link>
      )}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "min(560px, 70%)" }}>
        {!isMine && (
          <Link to={`/cercles/profile/${msg.author?.id || msg.authorId}`} style={{ ...S.bubbleAuthor, textDecoration: "none", cursor: "pointer", color: CC_THEME.or }}>
            {author}
          </Link>
        )}

        {msg.replyTo && !msg.replyTo.deletedAt && (
          <div style={{ ...S.replyQuote, ...(isMine ? { marginLeft: "auto" } : {}) }}>
            <div style={S.replyQuoteAuthor}>↪ {msg.replyTo.author?.username || msg.replyTo.author?.email}</div>
            <div style={S.replyQuoteBody}>{msg.replyTo.body.slice(0, 160) || "(pièce jointe)"}</div>
          </div>
        )}

        <div
          style={{
            ...S.bubble,
            ...(isMine ? S.bubbleMine : S.bubbleOther),
            ...(isDeleted ? S.bubbleDeleted : {}),
          }}
        >
          {isDeleted ? (
            <em style={{ color: isMine ? CC_THEME.bgSoft : CC_THEME.inkMuted }}>Message supprimé</em>
          ) : (
            <>
              {msg.attachments.length > 0 && (
                <div style={S.attachGrid}>
                  {msg.attachments.map((a) => (
                    <AttachmentView key={a.id} a={a} onOpen={() => onOpenAttachment(a)} isMine={isMine} />
                  ))}
                </div>
              )}
              {msg.body && (
                <>
                  <div style={S.bubbleBody}>{linkify(msg.body)}</div>
                  {extractEmbeddableUrls(msg.body).map((u, i) => (
                    <MediaEmbed key={i} url={u} maxWidth={420} />
                  ))}
                </>
              )}
              <div style={{ ...S.bubbleMeta, color: isMine ? "rgba(255,255,255,0.65)" : CC_THEME.inkMuted }}>
                {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                {msg.editedAt && <span style={{ marginLeft: 6, fontStyle: "italic" }}>· modifié</span>}
                {isMine && (
                  <span style={{ marginLeft: 6 }} title={readByOthers.length > 0 ? `Lu par ${readByOthers.length} personne(s)` : "Envoyé"}>
                    {readByOthers.length > 0 ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {Object.keys(reactionGroups).length > 0 && !isDeleted && (
          <div style={{ ...S.reactionStrip, ...(isMine ? { justifyContent: "flex-end" } : {}) }}>
            {Object.entries(reactionGroups).map(([emoji, info]) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                style={{ ...S.reactionChip, ...(info.mine ? S.reactionChipMine : {}) }}
              >
                {emoji} {info.count}
              </button>
            ))}
          </div>
        )}

        {showActions && !isDeleted && !compact && (
          <div style={{ ...S.bubbleActions, ...(isMine ? { justifyContent: "flex-end" } : {}) }}>
            <button onMouseEnter={() => setShowReactions(true)} style={S.actionBtn}>😀</button>
            {showReactions && (
              <div style={S.reactionPicker} onMouseLeave={() => setShowReactions(false)}>
                {REACTIONS.map((e) => (
                  <button key={e} onClick={() => { onReact(e); setShowReactions(false); }} style={S.reactionPick}>{e}</button>
                ))}
              </div>
            )}
            <button onClick={onReply} style={S.actionBtn} title="Répondre">↩</button>
            {isMine && (
              <>
                <button onClick={onEdit} style={S.actionBtn} title="Modifier">✏️</button>
                <button onClick={onDelete} style={S.actionBtn} title="Supprimer">🗑️</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attachment renderer ──────────────────────────────────────────

function AttachmentView({ a, onOpen, isMine }: { a: MessageAttachment; onOpen: () => void; isMine: boolean }) {
  const url = messagesApi.fileUrl(a.fileKey);
  if (a.type === "IMAGE") {
    return (
      <button onClick={onOpen} style={S.imgBtn}>
        <img src={url} alt={a.filename} style={S.imgThumb} />
      </button>
    );
  }
  if (a.type === "VIDEO") {
    return (
      <video
        src={url}
        controls
        style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 4, background: "#000" }}
        onClick={onOpen}
      />
    );
  }
  if (a.type === "AUDIO") {
    return <audio src={url} controls style={{ width: "100%" }} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ ...S.fileBox, color: isMine ? CC_THEME.bgSoft : CC_THEME.ink }}>
      <span style={{ fontSize: 24 }}>📄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.filename}</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>{formatBytes(a.sizeBytes)}</div>
      </div>
    </a>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function groupByDay(messages: ChatMessage[]) {
  const map = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const day = m.createdAt.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  const y = today.toDateString() === d.toDateString();
  if (y) return "Aujourd'hui";
  const yest = new Date(today.getTime() - 24 * 3600 * 1000);
  if (yest.toDateString() === d.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

function groupReactions(reactions: ChatMessage["reactions"]): Record<string, { count: number; mine: boolean }> {
  const me = (() => {
    try {
      const tok = localStorage.getItem("citurbarea.token");
      if (!tok) return null;
      const payload = JSON.parse(atob(tok.split(".")[1]));
      return payload.userId || payload.sub;
    } catch {
      return null;
    }
  })();
  const out: Record<string, { count: number; mine: boolean }> = {};
  for (const r of reactions) {
    if (!out[r.emoji]) out[r.emoji] = { count: 0, mine: false };
    out[r.emoji].count += 1;
    if (r.userId === me) out[r.emoji].mine = true;
  }
  return out;
}

function linkify(text: string): React.ReactNode {
  const re = /(https?:\/\/[^\s]+)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={`l${key++}`} href={m[0]} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? <>{parts}</> : text;
}

// ─── Styles ───────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  loading: { padding: 40, color: CC_THEME.inkMid, fontStyle: "italic", textAlign: "center" },
  root: { display: "flex", flexDirection: "column", height: "100vh", background: CC_THEME.bg },

  header: { display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, flexShrink: 0 },
  backLink: { color: CC_THEME.inkMid, fontSize: 13, textDecoration: "none" },
  headerTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, fontWeight: 600, color: CC_THEME.navy },
  headerSub: { fontSize: 12, color: CC_THEME.inkMuted, marginTop: 2 },
  typing: { color: CC_THEME.success, fontStyle: "italic" },
  searchInput: { padding: "7px 12px", fontSize: 12.5, fontFamily: CC_THEME.fontBody, background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, borderRadius: 6, color: CC_THEME.ink, outline: "none", width: 260 },
  clearSearchBtn: { background: "transparent", border: 0, fontSize: 18, color: CC_THEME.inkMid, cursor: "pointer", padding: "0 6px" },

  flow: { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 },
  loadOlder: { display: "flex", justifyContent: "center", padding: "8px 0" },
  loadOlderBtn: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 16, padding: "6px 14px", fontSize: 12, color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit" },

  emptyBox: { padding: "60px 30px", textAlign: "center" },

  daySep: { display: "flex", justifyContent: "center", margin: "12px 0 6px" },
  dayChip: { background: CC_THEME.bgSoft, color: CC_THEME.inkMid, fontSize: 11, padding: "4px 12px", borderRadius: 12, letterSpacing: "0.04em", textTransform: "capitalize" as const },

  searchHeader: { padding: "12px 16px", background: CC_THEME.bgSoft, borderBottom: `1px solid ${CC_THEME.border}`, fontSize: 13, color: CC_THEME.inkMid, fontStyle: "italic" },

  bubbleRow: { display: "flex", alignItems: "flex-end", gap: 8, position: "relative" },
  avatar: { width: 32, height: 32, borderRadius: "50%", background: CC_THEME.orSoft, color: CC_THEME.bgDeep, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, flexShrink: 0, fontFamily: CC_THEME.fontDisplay },
  bubbleAuthor: { fontSize: 11, color: CC_THEME.inkMuted, marginBottom: 2, marginLeft: 14 },

  bubble: { padding: "8px 12px", borderRadius: 14, fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const, position: "relative" },
  bubbleMine: { background: CC_THEME.bgDeep, color: CC_THEME.bgSoft, borderBottomRightRadius: 4 },
  bubbleOther: { background: CC_THEME.bgRaised, color: CC_THEME.ink, borderBottomLeftRadius: 4, border: `1px solid ${CC_THEME.borderSoft}` },
  bubbleDeleted: { opacity: 0.6 },
  bubbleBody: { fontSize: 14 },
  bubbleMeta: { fontSize: 10.5, marginTop: 4, textAlign: "right" as const },

  attachGrid: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 },
  imgBtn: { background: "transparent", border: 0, padding: 0, cursor: "pointer" },
  imgThumb: { maxWidth: "100%", maxHeight: 320, borderRadius: 8, display: "block" },
  fileBox: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "rgba(0,0,0,0.06)", borderRadius: 8, textDecoration: "none", marginBottom: 4 },

  replyQuote: { borderLeft: `3px solid ${CC_THEME.or}`, paddingLeft: 8, marginBottom: 4, background: CC_THEME.bgSoft, padding: "5px 8px", borderRadius: 4, maxWidth: "100%" },
  replyQuoteAuthor: { fontSize: 11, fontWeight: 600, color: CC_THEME.or },
  replyQuoteBody: { fontSize: 12, color: CC_THEME.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },

  reactionStrip: { display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const },
  reactionChip: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: "2px 8px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  reactionChipMine: { background: CC_THEME.orSoft, borderColor: CC_THEME.or },

  bubbleActions: { display: "flex", gap: 4, marginTop: 4, position: "relative" },
  actionBtn: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, width: 28, height: 28, fontSize: 14, cursor: "pointer", fontFamily: "inherit", padding: 0 },
  reactionPicker: { position: "absolute", bottom: "100%", marginBottom: 4, display: "flex", gap: 4, background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 16, padding: 4, boxShadow: CC_THEME.shadowRaise, zIndex: 5 },
  reactionPick: { background: "transparent", border: 0, fontSize: 18, padding: "4px 6px", cursor: "pointer", borderRadius: 12 },

  composerWrap: { padding: "12px 22px 16px", borderTop: `1px solid ${CC_THEME.border}`, background: CC_THEME.bgRaised, flexShrink: 0 },
  replyChip: { display: "flex", alignItems: "center", padding: "6px 10px", marginBottom: 8, background: CC_THEME.bgSoft, borderLeft: `3px solid ${CC_THEME.or}`, borderRadius: 4, gap: 8 },
  replyTitle: { fontSize: 11, fontWeight: 600, color: CC_THEME.or },
  replyBody: { fontSize: 12, color: CC_THEME.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  replyClose: { background: "transparent", border: 0, fontSize: 18, color: CC_THEME.inkMid, cursor: "pointer" },

  attachStrip: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 8, position: "relative" },
  attachThumb: { display: "flex", alignItems: "center", gap: 8, padding: 8, background: CC_THEME.bgSoft, borderRadius: 6, fontSize: 11, position: "relative", maxWidth: 220 },
  fileIcon: { width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", background: CC_THEME.bgRaised, borderRadius: 4, fontSize: 22 },
  attachName: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  attachRemove: { background: CC_THEME.danger, color: "white", border: 0, borderRadius: "50%", width: 18, height: 18, fontSize: 12, cursor: "pointer", lineHeight: 1, padding: 0, position: "absolute", top: -4, right: -4 },
  uploadBar: { position: "absolute", bottom: -6, left: 0, right: 0, height: 3, background: CC_THEME.bgSoft, borderRadius: 2, overflow: "hidden" },
  uploadFill: { height: "100%", background: CC_THEME.or, transition: "width 0.2s" },

  composer: { display: "flex", alignItems: "flex-end", gap: 10 },
  attachBtn: { width: 38, height: 38, borderRadius: "50%", background: CC_THEME.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, flexShrink: 0 },
  textarea: { flex: 1, padding: "10px 14px", border: `1px solid ${CC_THEME.border}`, borderRadius: 18, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none" as const, maxHeight: 140, lineHeight: 1.4 },
  sendBtn: { padding: "10px 20px", background: CC_THEME.navy, color: CC_THEME.bg, border: 0, borderRadius: 18, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, height: 38 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(15, 42, 74, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: CC_THEME.bgRaised, borderRadius: 8, padding: 24, width: "min(560px, 92vw)", boxShadow: CC_THEME.shadowRaise },
  modalTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, marginBottom: 12 },
  editArea: { width: "100%", padding: "10px 14px", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const },
  btnGhost: { background: "transparent", border: `1px solid ${CC_THEME.border}`, borderRadius: 6, padding: "8px 16px", color: CC_THEME.inkMid, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
  btnPrimary: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, borderRadius: 6, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, textDecoration: "none", display: "inline-block" },

  lightbox: { position: "fixed", inset: 0, background: "rgba(15, 42, 74, 0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, cursor: "zoom-out" },
  lightboxClose: { position: "absolute", top: 18, right: 24, background: "transparent", color: "white", border: 0, fontSize: 36, cursor: "pointer", lineHeight: 1 },
  fileBoxBig: { display: "flex", flexDirection: "column" as const, alignItems: "center", color: "white", gap: 12 },
};
