/**
 * DossierMentionsPanel — panneau "Mes mentions" cross-dossiers.
 *
 * Usage :
 *   <DossierMentionsPanel onOpenDossier={(id, interactionId) => navigate(`/dossier/${id}?i=${interactionId}`)} />
 *
 * Affiche un badge avec compteur (utilisable dans le bottom-nav mobile).
 */

import React, { useEffect, useState, useCallback } from "react";
import { dossierInteractionsApi, DossierInteraction } from "./dossier-interactions.api";

type Props = {
  /** Si true : ne montre que les non-lues. Default false. */
  unreadOnly?: boolean;
  onOpenDossier?: (dossierId: string, interactionId: string) => void;
};

export default function DossierMentionsPanel({ unreadOnly = false, onOpenDossier }: Props) {
  const [items, setItems] = useState<DossierInteraction[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dossierInteractionsApi.myMentions({ unread: unreadOnly, limit: 50 });
      setItems(data.items);
      setCount(data.count);
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, [unreadOnly]);

  useEffect(() => { load(); }, [load]);

  async function markRead(it: DossierInteraction) {
    try {
      await dossierInteractionsApi.markRead(it.dossierId, it.id);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      setCount((c) => Math.max(0, c - 1));
    } catch { /* silencieux */ }
  }

  return (
    <div style={{ background: "#FFFFFF" }}>
      <header style={{ padding: "12px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#0F172A" }}>Mes mentions</h3>
        {count > 0 && (
          <span style={{ background: "#FEF3C7", color: "#92400E", padding: "2px 8px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
            {count}
          </span>
        )}
        <button onClick={load} style={{ marginLeft: "auto", background: "transparent", border: "1px solid #CBD5E1", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: "#475569" }}>
          ↻ Actualiser
        </button>
      </header>

      {loading && items.length === 0 && (
        <div style={{ padding: 20, textAlign: "center", color: "#94A3B8" }}>Chargement…</div>
      )}
      {!loading && items.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
          Aucune mention {unreadOnly ? "non lue" : ""}.
        </div>
      )}

      {items.map((it) => (
        <div
          key={it.id}
          onClick={() => onOpenDossier?.(it.dossierId, it.id)}
          style={{
            padding: "10px 16px", borderBottom: "1px solid #F1F5F9",
            cursor: onOpenDossier ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>@mention</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{it.dossierTitle || it.dossierId.slice(-6)}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8" }}>
              {new Date(it.createdAt).toLocaleString()}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#334155", marginTop: 4, lineHeight: 1.4 }}>
            {(it.contentMD || "").slice(0, 200)}
          </div>
          <div style={{ marginTop: 6 }}>
            <button onClick={(e) => { e.stopPropagation(); markRead(it); }}
              style={{ background: "transparent", border: "1px solid #CBD5E1", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: "#475569" }}>
              Marquer comme lu
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * MentionsBadge — petit badge avec compteur (pour bottom nav).
 * Polling 60s.
 */
export function MentionsBadge({ onClick }: { onClick?: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const data = await dossierInteractionsApi.myMentions({ unread: true, limit: 200 });
        if (alive) setCount(data.count);
      } catch { /* ignore */ }
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <button onClick={onClick}
      style={{ position: "relative", background: "transparent", border: "none", cursor: onClick ? "pointer" : "default", padding: 6, fontSize: 18 }}
      title="Mes mentions">
      @
      {count > 0 && (
        <span style={{
          position: "absolute", top: -2, right: -2, background: "#DC2626", color: "#FFFFFF",
          fontSize: 10, padding: "1px 5px", borderRadius: 10, fontWeight: 700, minWidth: 16, textAlign: "center",
        }}>{count > 99 ? "99+" : count}</span>
      )}
    </button>
  );
}
