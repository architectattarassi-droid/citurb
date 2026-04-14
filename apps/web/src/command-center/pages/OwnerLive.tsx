import React, { useEffect, useState, useRef } from "react";
import { apiFetch } from "../../tomes/tome4/apiClient";

interface LiveItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  status: string;
  docsCount: number;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#94a3b8', SUBMITTED: '#f59e0b', IN_REVIEW: '#3b82f6',
  APPROVED: '#22c55e', NEEDS_CHANGES: '#f97316', REJECTED: '#ef4444',
};

function toItems(raw: any[]): LiveItem[] {
  return raw.slice(0, 30).map(d => ({
    id: d.id,
    title: d.title || 'Sans titre',
    detail: `${d.owner?.email || '?'} — ${d.commune || '?'} — ${d.packSelected || 'Pack ?'}`,
    time: new Date(d.updatedAt || d.createdAt).toLocaleString('fr-MA', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: 'Africa/Casablanca',
    }),
    status: d.status,
    docsCount: d._count?.documents ?? 0,
  }));
}

export default function OwnerLive() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [total, setTotal] = useState(0);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<any>(null);

  const fetchData = async () => {
    try {
      const data: any[] = await apiFetch('/p2/dossier/ops/all');
      setItems(toItems(data));
      const n = data.length;
      if (prevTotal !== null && n > prevTotal) setNewCount(n - prevTotal);
      setPrevTotal(n);
      setTotal(n);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('[OwnerLive]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '16px', maxWidth: 480, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>📡 CITURBAREA LIVE</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {lastRefresh.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })} · refresh 30s
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {newCount > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '50%',
              width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: 14,
            }}>{newCount}</span>
          )}
          <button onClick={() => { fetchData(); setNewCount(0); }}
            style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
            🔄
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total dossiers', value: total, color: '#38bdf8' },
          { label: 'Nouveaux', value: newCount, color: newCount > 0 ? '#ef4444' : '#64748b' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#1e293b', borderRadius: 10, padding: '14px 16px',
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#475569', marginTop: 40 }}>Chargement...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#475569', marginTop: 40 }}>Aucun dossier.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: '#1e293b', borderRadius: 10, padding: '14px 16px',
              border: '1px solid #334155',
              borderLeft: `3px solid ${STATUS_COLOR[item.status] || '#334155'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
                  📁 {item.title}
                </span>
                <span style={{
                  background: STATUS_COLOR[item.status] || '#334155', color: '#fff',
                  borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700,
                  alignSelf: 'flex-start', whiteSpace: 'nowrap',
                }}>{item.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{item.detail}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>🕐 {item.time}</span>
                {item.docsCount > 0 && (
                  <span style={{ fontSize: 11, color: '#38bdf8' }}>📎 {item.docsCount} doc(s)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
