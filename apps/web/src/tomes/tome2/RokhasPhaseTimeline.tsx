import React, { useEffect, useState } from "react";
import { apiFetch } from "../../tomes/tome4/apiClient";

const STATUT_COLOR: Record<string, string> = {
  TERMINE: '#22c55e', EN_COURS: '#3b82f6',
  BLOQUE: '#ef4444', EN_ATTENTE: '#94a3b8',
};
const DOC_STATUT_COLOR: Record<string, string> = {
  RECUPERE: '#f59e0b', VALIDE_ARCH: '#3b82f6',
  ENVOYE_CLIENT: '#22c55e', EN_ATTENTE: '#94a3b8', REQUIS: '#94a3b8',
};

interface Props {
  dossierId: string;
  mode?: 'architecte' | 'client';
  activePhaseNum?: number;
  onSelect?: (phaseNum: number) => void;
}

export default function RokhasPhaseTimeline({ dossierId, mode = 'architecte', activePhaseNum, onSelect }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const endpoint = mode === 'client'
    ? `/p2/dossier/${dossierId}/rokhas/client-view`
    : `/p2/dossier/${dossierId}/rokhas/phases`;

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(endpoint);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement Rokhas');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [dossierId, mode]);

  const handleValidate = async (docId: string) => {
    setValidating(docId);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/rokhas/documents/${docId}/validate`, { method: 'POST' });
      await load();
    } finally { setValidating(null); }
  };

  const handleSend = async (docId: string) => {
    setSending(docId);
    try {
      await apiFetch(`/p2/dossier/${dossierId}/rokhas/documents/${docId}/send`, { method: 'POST' });
      await load();
    } finally { setSending(null); }
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: 16 }}>Chargement Rokhas...</div>;
  if (error)   return <div style={{ color: '#ef4444', padding: 16 }}>{error}</div>;
  if (!data)   return null;

  const rd = mode === 'client' ? data : data.rokhasDossier;
  const phases: any[] = data.phases || [];
  const documents: any[] = data.documents || [];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      {mode === 'architecte' && (
        <div style={{ background: '#0f172a', color: '#38bdf8', borderRadius: 8,
          padding: '6px 12px', marginBottom: 12, fontSize: 11, fontWeight: 700,
          display: 'inline-block', letterSpacing: '.08em' }}>
          🏛️ VUE COCKPIT ARCHITECTE — DONNÉES COMPLÈTES
        </div>
      )}
      {mode === 'client' && (
        <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 8,
          padding: '6px 12px', marginBottom: 12, fontSize: 11, fontWeight: 700,
          display: 'inline-block' }}>
          👤 SUIVI DE VOTRE DOSSIER
        </div>
      )}

      {/* En-tête dossier */}
      {rd && (
        <div style={{ background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', marginBottom: 8 }}>
            Permis de Construire — {rd.typePermis || 'construire'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
            {rd.refRokhas      && <div>📋 Réf. Rokhas: <strong>{rd.refRokhas}</strong></div>}
            {rd.numDossier     && <div>🔢 N° dossier: <strong>{rd.numDossier}</strong></div>}
            {rd.commune        && <div>📍 Commune: <strong>{rd.commune}</strong></div>}
            {rd.consistance    && <div>🏗️ Objet: <strong>{rd.consistance}</strong></div>}
            {rd.surfaceTerrain && <div>📐 Terrain: <strong>{rd.surfaceTerrain} m²</strong></div>}
            {rd.surfaceBatie   && <div>🏠 Surface bâtie: <strong>{rd.surfaceBatie} m²</strong></div>}
          </div>
          {rd.delaiGlobalJours && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              ⏱️ Délai global : <strong style={{ color: '#38bdf8' }}>{rd.delaiGlobalJours} jours</strong>
            </div>
          )}
          {rd.decisionCommission && (
            <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 6,
              background: rd.decisionCommission === 'FAVORABLE' ? '#166534' : '#7f1d1d',
              color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
              {rd.decisionCommission === 'FAVORABLE' ? '✅ Favorable' : '❌ Défavorable'}
            </div>
          )}
        </div>
      )}

      {/* Barre progression */}
      {rd && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
            Phase {rd.phaseActuelle || 1} / 10
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
              const current = (rd.phaseActuelle || 1) === n;
              const done = (rd.phaseActuelle || 1) > n;
              return (
                <React.Fragment key={n}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: done ? '#22c55e' : current ? '#3b82f6' : '#1e2330',
                    color: done || current ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    border: current ? '2px solid #1d4ed8' : '2px solid transparent',
                    cursor: onSelect ? 'pointer' : 'default',
                    outline: activePhaseNum === n ? '2px solid #f59e0b' : 'none',
                  }} onClick={() => onSelect?.(n)}>{n}</div>
                  {n < 10 && <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : '#1e2330' }} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline phases — cliquable si onSelect fourni */}
      <div style={{ marginBottom: 16 }}>
        {phases.map((ph: any) => {
          const isActive = activePhaseNum != null && (ph.phaseNum === activePhaseNum || ph.phase === activePhaseNum);
          return (
            <div key={ph.id || ph.phase}
              onClick={() => onSelect?.(ph.phaseNum ?? ph.phase)}
              style={{
                borderLeft: `3px solid ${STATUT_COLOR[ph.statut] || '#1e2330'}`,
                paddingLeft: 12, marginBottom: 10,
                opacity: ph.statut === 'EN_ATTENTE' ? 0.5 : 1,
                cursor: onSelect ? 'pointer' : 'default',
                background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                borderRadius: '0 6px 6px 0',
                transition: 'background 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>
                  {ph.phaseNum ? `${ph.phaseNum}. ` : ''}{ph.phaseLabel}
                </div>
                <span style={{ background: STATUT_COLOR[ph.statut] || '#1e2330',
                  color: '#fff', borderRadius: 4, padding: '2px 6px',
                  fontSize: 9, fontWeight: 700 }}>{ph.statut}</span>
              </div>
              {mode === 'architecte' && ph.responsable && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  👤 {ph.responsable}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'flex', gap: 10 }}>
                {ph.dateSaisie   && <span>↓ {new Date(ph.dateSaisie).toLocaleDateString('fr-MA')}</span>}
                {ph.dateDecision && <span>✓ {new Date(ph.dateDecision).toLocaleDateString('fr-MA')}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
            📎 Documents ({documents.length})
          </div>
          {documents.map((doc: any) => (
            <div key={doc.id} style={{ background: '#111827', borderRadius: 8, padding: 12,
              marginBottom: 8, border: '1px solid #1e2330' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#e8eaf0' }}>📄 {doc.nom}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {mode === 'architecte' && doc.visibleClient && (
                    <span style={{ fontSize: 9, background: '#166534', color: '#4ade80',
                      borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>VISIBLE CLIENT</span>
                  )}
                  <span style={{ background: DOC_STATUT_COLOR[doc.statut] || '#94a3b8',
                    color: '#fff', borderRadius: 4, padding: '2px 6px',
                    fontSize: 9, fontWeight: 700 }}>{doc.statut}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Phase {doc.phaseNum} — {doc.code ?? doc.type}
                {doc.filePath && ` — ${doc.filePath}`}
              </div>
              {mode === 'architecte' && doc.statut === 'RECUPERE' && (
                <button onClick={() => handleValidate(doc.id)} disabled={validating === doc.id}
                  style={{ marginTop: 8, padding: '4px 12px', background: '#3b82f6',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  {validating === doc.id ? '...' : '✅ Valider'}
                </button>
              )}
              {mode === 'architecte' && doc.statut === 'VALIDE_ARCH' && (
                <button onClick={() => handleSend(doc.id)} disabled={sending === doc.id}
                  style={{ marginTop: 8, marginLeft: 8, padding: '4px 12px', background: '#22c55e',
                    color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                  {sending === doc.id ? '...' : '📤 Envoyer au client'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
