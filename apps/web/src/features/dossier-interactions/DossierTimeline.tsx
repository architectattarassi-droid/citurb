/**
 * DossierTimeline — fil d'interactions Dossier (mobile-first).
 *
 * - Scroll infini cursor-based (IntersectionObserver sur sentinel bottom)
 * - Items pinnés affichés en tête
 * - Polling 30s pour mise à jour passive (en attendant SSE/WS — voir INTEGRATION.md)
 * - Composer sticky bottom
 * - Replies en thread (parentId)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dossierInteractionsApi, DossierInteraction } from "./dossier-interactions.api";
import DossierInteractionItem from "./DossierInteractionItem";
import DossierCommentComposer from "./DossierCommentComposer";

type Props = {
  dossierId: string;
  currentUserId: string;
  currentUserRole?: string;
  /** Optionnel — recherche de membres pour @mention. */
  fetchMembers?: (q: string) => Promise<Array<{ id: string; label: string; role?: string }>>;
};

const POLL_MS = 30_000;

export default function DossierTimeline(props: Props) {
  const { dossierId, currentUserId, currentUserRole, fetchMembers } = props;
  const [items, setItems] = useState<DossierInteraction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isStaff = !!currentUserRole && ["ADMIN", "OWNER", "OPS", "SUPER_ADMIN", "ADMIN_SUPPORT"].includes(currentUserRole);

  // Initial + polling
  const loadInitial = useCallback(async () => {
    try {
      setError(null);
      const page = await dossierInteractionsApi.list(dossierId, undefined, 30);
      setItems(page.items);
      setCursor(page.nextCursor);
      setDone(!page.nextCursor);
    } catch (e: any) { setError(e.message); }
  }, [dossierId]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const page = await dossierInteractionsApi.list(dossierId, undefined, 30);
        // merge: garde les ajouts récents en haut
        setItems((prev) => mergeItems(prev, page.items));
      } catch { /* silencieux */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [dossierId]);

  // Scroll infini
  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const page = await dossierInteractionsApi.list(dossierId, cursor, 20);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
      if (!page.nextCursor) setDone(true);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [dossierId, cursor, loading, done]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // ── Display split: pinned first ─────────────────────────────
  const pinned = useMemo(() => items.filter(i => i.isPinned && !i.deletedAt), [items]);
  const normal = useMemo(() => items.filter(i => !i.isPinned && !i.deletedAt), [items]);

  // ── Handlers ────────────────────────────────────────────────
  function onCreated(it: DossierInteraction) {
    setItems((prev) => [it, ...prev]);
    setParentId(null);
  }
  function onChanged(next: DossierInteraction) {
    setItems((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }
  function onDeleted(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }
  function onReply(pid: string) {
    setParentId(pid);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", paddingBottom: 8 }}>
      <div style={{ flex: 1, padding: "8px 10px" }}>
        {error && (
          <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: 8, borderRadius: 6, marginBottom: 8 }}>
            {error}
          </div>
        )}

        {pinned.length > 0 && (
          <>
            <h4 style={{ fontSize: 12, color: "#92400E", margin: "4px 0 6px" }}>📌 Épinglés</h4>
            {pinned.map((it) => (
              <DossierInteractionItem
                key={it.id} it={it} currentUserId={currentUserId} currentUserRole={currentUserRole}
                dossierId={dossierId} onChanged={onChanged} onDeleted={onDeleted} onReply={onReply}
              />
            ))}
            <hr style={{ margin: "8px 0 10px", border: "none", borderTop: "1px dashed #E5E7EB" }} />
          </>
        )}

        {normal.length === 0 && pinned.length === 0 && !error && (
          <div style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
            Aucune interaction. Soyez le premier à commenter.
          </div>
        )}

        {normal.map((it) => (
          <DossierInteractionItem
            key={it.id} it={it} currentUserId={currentUserId} currentUserRole={currentUserRole}
            dossierId={dossierId} onChanged={onChanged} onDeleted={onDeleted} onReply={onReply}
          />
        ))}

        {!done && <div ref={sentinelRef} style={{ height: 8 }} />}
        {loading && <div style={{ textAlign: "center", color: "#94A3B8", padding: 8 }}>Chargement…</div>}
        {done && items.length > 20 && (
          <div style={{ textAlign: "center", color: "#CBD5E1", padding: 8, fontSize: 12 }}>— Fin du fil —</div>
        )}
      </div>

      <DossierCommentComposer
        dossierId={dossierId}
        parentId={parentId}
        onParentCleared={() => setParentId(null)}
        isStaff={isStaff}
        fetchMembers={fetchMembers}
        onCreated={onCreated}
      />
    </div>
  );
}

/** Fusion liste serveur + locale ; conserve dédup par id, le serveur fait foi. */
function mergeItems(prev: DossierInteraction[], fresh: DossierInteraction[]): DossierInteraction[] {
  const map = new Map<string, DossierInteraction>();
  for (const p of prev) map.set(p.id, p);
  for (const f of fresh) map.set(f.id, f);
  const out = Array.from(map.values());
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}
