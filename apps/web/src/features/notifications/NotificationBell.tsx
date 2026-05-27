import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notificationsHubApi, type InboxItem } from "./notifications-hub.api";

/**
 * NotificationBell — icône cloche compacte à coller dans le header.
 *
 *   <NotificationBell />
 *
 * - Polling léger 30 s pour le badge unread.
 * - Click → dropdown 10 dernières (lazy load à l'ouverture).
 * - Click item → markRead + navigate(actionUrl).
 * - Lien "Tout voir" → /notifications.
 *
 * Mobile : le dropdown reste à droite, max-width 360 / w-screen min(360, 92vw).
 * RTL : flip côté avec `start/end` Tailwind (peut être amélioré selon dir).
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Polling badge
  const refreshBadge = useCallback(async () => {
    try {
      const r = await notificationsHubApi.inbox({ unread: false, limit: 10 });
      setUnread(r.unreadCount);
      setItems(r.items);
    } catch {
      // silent — peut-être non authentifié
    }
  }, []);

  useEffect(() => {
    refreshBadge();
    const id = window.setInterval(refreshBadge, 30_000);
    return () => window.clearInterval(id);
  }, [refreshBadge]);

  // Fermer en cliquant dehors
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const r = await notificationsHubApi.inbox({ limit: 10 });
        setItems(r.items);
        setUnread(r.unreadCount);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  const onItemClick = async (item: InboxItem) => {
    setOpen(false);
    if (!item.readAt) {
      try { await notificationsHubApi.markRead(item.id); } catch { /* silent */ }
      setUnread(u => Math.max(0, u - 1));
    }
    if (item.actionUrl) navigate(item.actionUrl);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-100 transition"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(360px,92vw)] bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-slate-900 text-sm">Notifications</div>
            {unread > 0 && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await notificationsHubApi.markAllRead();
                    setUnread(0);
                    setItems(it => it.map(i => ({ ...i, readAt: i.readAt || new Date().toISOString() })));
                  } catch { /* silent */ }
                }}
                className="text-xs text-blue-700 hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">Chargement…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">Aucune notification</div>
            )}
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${item.readAt ? "" : "bg-blue-50/40"}`}
              >
                <div className="flex items-start gap-2">
                  {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{item.title}</div>
                    {item.body && (
                      <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.body}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">
                      {formatRelative(item.createdAt)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-slate-50 border-t border-slate-100"
          >
            Tout voir
          </Link>
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-MA");
}
