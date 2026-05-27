import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ensurePushSubscription, notificationsHubApi, type InboxItem } from "./notifications-hub.api";

/**
 * NotificationsCenterPage — page `/notifications`.
 *
 * - Filtres : Tous / Non lus / Cette semaine / Important
 * - Groupage par jour (Aujourd'hui, Hier, dd/mm)
 * - Pull-to-refresh (mobile, touchstart/touchend)
 * - Swipe-to-archive (mark-read sur swipe gauche > 80px)
 * - Bandeau push : si Notification.permission === "default" → CTA activer
 * - Mobile-first : full-width, paddings réduits sur sm
 */

type Filter = "all" | "unread" | "week" | "important";

export default function NotificationsCenterPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pushState, setPushState] = useState<NotificationPermission | "unknown">("unknown");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await notificationsHubApi.inbox({ limit: 200 });
      setItems(r.items);
      setUnread(r.unreadCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushState(Notification.permission);
    }
  }, [load]);

  const onActivatePush = async () => {
    const ok = await ensurePushSubscription();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushState(Notification.permission);
    }
    if (!ok && typeof window !== "undefined" && Notification.permission === "denied") {
      alert("Les notifications push sont bloquées dans votre navigateur. Activez-les depuis les paramètres du site.");
    }
  };

  // ── Pull-to-refresh (mobile) ────────────────────────────────
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 80 && !refreshing) {
      setRefreshing(true);
      load().finally(() => setRefreshing(false));
      touchStartY.current = null;
    }
  };
  const onTouchEnd = () => { touchStartY.current = null; };

  // ── Filtrage + groupage ────────────────────────────────────
  const filtered = useMemo(() => {
    let out = items;
    if (filter === "unread") out = out.filter(i => !i.readAt);
    if (filter === "week") {
      const cutoff = Date.now() - 7 * 86400 * 1000;
      out = out.filter(i => new Date(i.createdAt).getTime() > cutoff);
    }
    if (filter === "important") {
      out = out.filter(i =>
        i.refType?.includes("PERMIS_DECISION") ||
        i.refType?.includes("BLOCAGE") ||
        i.refType?.includes("RETARD") ||
        i.refType?.includes("PAIEMENT"),
      );
    }
    return out;
  }, [items, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const onItemClick = async (item: InboxItem) => {
    if (!item.readAt) {
      try { await notificationsHubApi.markRead(item.id); } catch { /* silent */ }
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, readAt: new Date().toISOString() } : p));
      setUnread(u => Math.max(0, u - 1));
    }
    if (item.actionUrl) navigate(item.actionUrl);
  };

  const onSwipeArchive = async (item: InboxItem) => {
    if (item.readAt) return;
    try { await notificationsHubApi.markRead(item.id); } catch { /* silent */ }
    setItems(prev => prev.map(p => p.id === item.id ? { ...p, readAt: new Date().toISOString() } : p));
    setUnread(u => Math.max(0, u - 1));
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-h-screen bg-slate-50 pb-12"
    >
      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <header className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Notifications</h1>
            <Link to="/parametres/notifications" className="text-sm text-blue-700 hover:underline">
              Préférences
            </Link>
          </div>
          {unread > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              {unread} non {unread > 1 ? "lues" : "lue"}
              <button
                type="button"
                className="ml-3 text-blue-700 hover:underline"
                onClick={async () => {
                  await notificationsHubApi.markAllRead().catch(() => undefined);
                  setUnread(0);
                  setItems(prev => prev.map(p => ({ ...p, readAt: p.readAt || new Date().toISOString() })));
                }}
              >
                Tout marquer lu
              </button>
            </p>
          )}
        </header>

        {pushState === "default" && (
          <div className="mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <div className="text-blue-700 text-xl">🔔</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">Activer les notifications push</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Recevez instantanément les décisions de commission, PV de chantier et messages importants.
              </p>
            </div>
            <button
              type="button"
              onClick={onActivatePush}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-700 text-white rounded hover:bg-blue-800 whitespace-nowrap"
            >
              Activer
            </button>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          {(["all", "unread", "week", "important"] as Filter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f === "all" && "Tous"}
              {f === "unread" && `Non lus${unread ? ` (${unread})` : ""}`}
              {f === "week" && "Cette semaine"}
              {f === "important" && "Important"}
            </button>
          ))}
        </div>

        {refreshing && (
          <div className="text-center text-xs text-slate-500 py-2">Mise à jour…</div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center text-sm text-slate-500 py-12">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-12">
            Aucune notification à afficher
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(g => (
              <section key={g.label}>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">
                  {g.label}
                </h2>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden divide-y divide-slate-100">
                  {g.items.map(item => (
                    <SwipeableRow key={item.id} item={item} onTap={onItemClick} onArchive={onSwipeArchive} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function groupByDay(items: InboxItem[]): Array<{ label: string; items: InboxItem[] }> {
  const buckets = new Map<string, InboxItem[]>();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400 * 1000);

  for (const item of items) {
    const d = new Date(item.createdAt); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Aujourd'hui";
    else if (d.getTime() === yesterday.getTime()) label = "Hier";
    else label = d.toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(item);
  }
  return Array.from(buckets, ([label, items]) => ({ label, items }));
}

// ── Row avec swipe-to-archive ────────────────────────────────

function SwipeableRow({ item, onTap, onArchive }: {
  item: InboxItem;
  onTap: (i: InboxItem) => void;
  onArchive: (i: InboxItem) => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);

  const onStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(-120, dx));
  };
  const onEnd = () => {
    if (offset < -80) {
      onArchive(item);
    }
    setOffset(0);
    startX.current = null;
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 w-[120px] bg-emerald-600 flex items-center justify-center text-white text-xs font-semibold">
        Marquer lu
      </div>
      <button
        type="button"
        onClick={() => onTap(item)}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        className={`relative w-full text-left px-4 py-3 transition bg-white ${item.readAt ? "" : "bg-blue-50/40"}`}
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 0.2s" : "none" }}
      >
        <div className="flex items-start gap-3">
          {!item.readAt && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{item.title}</div>
            {item.body && (
              <div className="text-sm text-slate-600 mt-0.5 line-clamp-2">{item.body}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">
              {new Date(item.createdAt).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          {item.actionUrl && (
            <svg className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
