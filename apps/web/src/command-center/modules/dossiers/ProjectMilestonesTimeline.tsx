import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../tomes/tome4/apiClient";

interface Milestone {
  id: string;
  phase: string;
  label: string;
  status: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  IN_PROGRESS: { color: '#1d4ed8', bg: '#dbeafe', icon: '⏳' },
  DONE:        { color: '#166534', bg: '#dcfce7', icon: '✅' },
  BLOCKED:     { color: '#991b1b', bg: '#fee2e2', icon: '🚫' },
  PENDING:     { color: '#64748b', bg: '#f1f5f9', icon: '○' },
};

interface Props {
  projectId: string;
  isOps?: boolean;
  onAdvance?: () => void;
}

export default function ProjectMilestonesTimeline({ projectId, isOps, onAdvance }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await apiFetch(`/p2/project/${projectId}/milestones`);
      setMilestones(Array.isArray(data) ? data : []);
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const advance = async (phase: string) => {
    setAdvancing(phase);
    try {
      await apiFetch(`/p2/project/${projectId}/milestones/${phase}/advance`, { method: 'POST' });
      await load();
      onAdvance?.();
    } catch {
    } finally {
      setAdvancing(null);
    }
  };

  if (loading) return (
    <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>
      Chargement jalons...
    </div>
  );

  if (milestones.length === 0) return (
    <div style={{ color: '#64748b', fontSize: 13, padding: '8px 0' }}>
      Aucun jalon —{' '}
      <span
        style={{ color: '#2563eb', cursor: 'pointer', marginLeft: 4 }}
        onClick={() => apiFetch(`/p2/project/${projectId}/milestones/init`, { method: 'POST' }).then(load)}
      >
        Initialiser les jalons
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
      {milestones.map((m, idx) => {
        const cfg = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING;
        const isLast = idx === milestones.length - 1;
        return (
          <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: cfg.bg, border: `2px solid ${cfg.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0,
              }}>
                {cfg.icon}
              </div>
              {!isLast && (
                <div style={{ width: 2, flexGrow: 1, minHeight: 16, background: '#e2e8f0' }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {m.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, borderRadius: 4,
                  padding: '1px 6px', background: cfg.bg, color: cfg.color,
                }}>
                  {m.status}
                </span>
              </div>
              {m.completedAt && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  ✓ {new Date(m.completedAt).toLocaleDateString('fr-MA')}
                </div>
              )}
              {isOps && m.status === 'PENDING' && (
                <button
                  onClick={() => advance(m.phase)}
                  disabled={advancing === m.phase}
                  style={{
                    marginTop: 4, fontSize: 11, padding: '2px 8px',
                    background: advancing === m.phase ? '#e2e8f0' : '#f0fdf4',
                    color: '#166534', border: '1px solid #86efac',
                    borderRadius: 4, cursor: 'pointer',
                  }}
                >
                  {advancing === m.phase ? '…' : '▶ Marquer DONE'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
