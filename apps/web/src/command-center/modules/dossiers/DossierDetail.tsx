import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../../tomes/tome4/apiClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES_CITURB: { key: string; label: string }[] = [
  { key: 'PHASE_01_ESQUISSE',            label: '01 Esquisse' },
  { key: 'PHASE_02_APS',                 label: '02 APS' },
  { key: 'PHASE_03_APD',                 label: '03 APD' },
  { key: 'PHASE_04_MANDAT_BET',          label: '04 Mandat BET' },
  { key: 'PHASE_05_AUTORISATION',        label: '05 Autorisation' },
  { key: 'PHASE_06_DOSSIER_EXECUTION',   label: '06 Dossier Exec.' },
  { key: 'PHASE_07_DCE',                 label: '07 DCE' },
  { key: 'PHASE_08_MANDATS',             label: '08 Mandats' },
  { key: 'PHASE_09_OUVERTURE_CHANTIER',  label: '09 Ouverture' },
  { key: 'PHASE_RECEPTION_PROVISOIRE',   label: 'Récep. Provisoire' },
  { key: 'PHASE_RECEPTION_DEFINITIVE',   label: 'Récep. Définitive' },
  { key: 'PHASE_PERMIS_HABITER',         label: 'Permis Habiter' },
];

const STATUT_COLORS: Record<string, string> = {
  COMPLETE: '#4ade80', EN_COURS: '#3b82f6',
  EN_ATTENTE: '#8892a4', BLOQUE: '#f87171', BLOQUÉ: '#f87171',
  TERMINE: '#4ade80',
};

const STATUS_DOT: Record<string, string> = {
  COMPLETE: '●', EN_COURS: '◉', EN_ATTENTE: '○', BLOQUE: '✕', BLOQUÉ: '✕', TERMINE: '●',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  wrap: { display: 'flex', flexDirection: 'column' as const, height: '100%', background: '#0d1117', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' },
  header: { background: '#090e18', borderBottom: '1px solid #1e2330', padding: '14px 20px', flexShrink: 0 },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  nav: { width: 220, flexShrink: 0, background: '#090e18', borderRight: '1px solid #1e2330', overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const },
  panel: { flex: 1, overflowY: 'auto' as const, padding: 24 },
  navSection: { fontSize: 10, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: 1, padding: '14px 16px 6px' },
  navItem: (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
    cursor: 'pointer', fontSize: 12,
    background: active ? '#1a2540' : 'transparent',
    borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent',
    transition: 'background 0.1s',
  }),
  card: { background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: '14px 18px', marginBottom: 14 } as React.CSSProperties,
  cardTitle: { fontSize: 11, fontWeight: 800, color: '#4a5568', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 10 },
  row: { display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #131820', fontSize: 13 } as React.CSSProperties,
  lbl: { color: '#4a5568', width: 160, flexShrink: 0, fontSize: 12 } as React.CSSProperties,
  val: { color: '#e8eaf0' } as React.CSSProperties,
  badge: (s: string): React.CSSProperties => ({ display: 'inline-block', background: s === 'COMPLETE' || s === 'TERMINE' ? '#1a3a2a' : s === 'EN_COURS' ? '#1a2a4a' : s === 'BLOQUE' || s === 'BLOQUÉ' ? '#3a1a1a' : '#1e2330', color: STATUT_COLORS[s] ?? '#8892a4', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }),
  btn: (variant: 'primary' | 'danger' | 'ghost'): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: variant === 'primary' ? '#1d4ed8' : variant === 'danger' ? '#991b1b' : '#1e2330',
    color: variant === 'ghost' ? '#8892a4' : '#fff',
  }),
  input: { background: '#0a0f1a', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const, resize: 'vertical' as const },
  empty: { color: '#4a5568', fontStyle: 'italic', fontSize: 13, padding: '8px 0' } as React.CSSProperties,
};

// ─── Header ───────────────────────────────────────────────────────────────────

function DossierHeader({ dossier, onBack }: { dossier: any; onBack: () => void }) {
  if (!dossier) return null;
  return (
    <div style={C.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <button onClick={onBack} style={{ ...C.btn('ghost'), padding: '4px 10px', fontSize: 12 }}>← Retour</button>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#e8eaf0' }}>{dossier.refInterne ?? dossier.id?.slice(0, 12)}</span>
        {dossier.porteType && <span style={{ ...C.badge('EN_ATTENTE'), fontSize: 11 }}>{dossier.porteType}</span>}
        {dossier.gestionMode && <span style={{ ...C.badge('EN_ATTENTE'), fontSize: 11 }}>{dossier.gestionMode}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a5568' }}>{dossier.commune ?? ''}</span>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#8892a4' }}>
        {dossier.clientNom && <span>Client : <strong style={{ color: '#e8eaf0' }}>{dossier.clientNom}</strong></span>}
        {dossier.firm?.name && <span>Cabinet : <strong style={{ color: '#60a5fa' }}>{dossier.firm.name}</strong></span>}
        {dossier.status && <span>Statut : <strong style={{ color: '#e8eaf0' }}>{dossier.status}</strong></span>}
        {dossier.owner?.email && <span>Email : <strong style={{ color: '#e8eaf0' }}>{dossier.owner.email}</strong></span>}
      </div>
    </div>
  );
}

// ─── PhaseNav ─────────────────────────────────────────────────────────────────

function PhaseNav({ dossier, activePhase, onSelect }: { dossier: any; activePhase: string; onSelect: (k: string) => void }) {
  const recordMap: Record<string, any> = {};
  (dossier?.phaseRecords ?? []).forEach((r: any) => { recordMap[r.phase] = r; });

  const rokhasPhases: any[] = dossier?.rokhas?.phases ?? [];

  return (
    <div style={C.nav}>
      <div style={C.navSection}>Phases CITURBAREA</div>
      {PHASES_CITURB.map(p => {
        const rec = recordMap[p.key];
        const statut = rec?.statut ?? 'EN_ATTENTE';
        const color = STATUT_COLORS[statut] ?? '#4a5568';
        const active = activePhase === p.key;
        return (
          <div key={p.key} style={C.navItem(active)}
            onClick={() => onSelect(p.key)}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#111827'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ color, fontSize: 14, lineHeight: 1 }}>{STATUS_DOT[statut] ?? '○'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: active ? '#e8eaf0' : '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.label}</div>
              {rec?.dateFin && <div style={{ fontSize: 10, color: '#4a5568' }}>{new Date(rec.dateFin).toLocaleDateString('fr-MA')}</div>}
            </div>
          </div>
        );
      })}

      {rokhasPhases.length > 0 && (
        <>
          <div style={{ ...C.navSection, borderTop: '1px solid #1e2330', marginTop: 8, paddingTop: 16 }}>Phases Rokhas</div>
          {rokhasPhases.map((ph: any) => {
            const key = `ROKHAS_${ph.phaseNum ?? ph.id}`;
            const active = activePhase === key;
            const statut = ph.statut === 'TERMINE' ? 'COMPLETE' : ph.statut;
            const color = STATUT_COLORS[statut] ?? '#4a5568';
            return (
              <div key={key} style={C.navItem(active)}
                onClick={() => onSelect(key)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#111827'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ color, fontSize: 14, lineHeight: 1 }}>{STATUS_DOT[statut] ?? '○'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: active ? '#e8eaf0' : '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ph.phaseLabel ?? `Phase ${ph.phaseNum}`}</div>
                  {ph.dateDecision && <div style={{ fontSize: 10, color: '#4a5568' }}>{new Date(ph.dateDecision).toLocaleDateString('fr-MA')}</div>}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── PhasePanel — CITURBAREA ──────────────────────────────────────────────────

function CiturbPhasePanel({ dossier, phase, detail, onAction, onMessageSent }: { dossier: any; phase: string; detail: any; onAction: (action: string, note?: string) => void; onMessageSent: () => void }) {
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [actionNote, setActionNote] = useState('');

  const statut: string = detail?.statut ?? 'EN_ATTENTE';
  const phaseLabel = PHASES_CITURB.find(p => p.key === phase)?.label ?? phase;
  const rokhas = dossier?.rokhas;

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/p2/dossier/${dossier.id}/phase/${phase}/message`, { method: 'POST', body: JSON.stringify({ canal: 'CLIENT_OPS', contenu: msgText }) });
      setMsgText('');
      onMessageSent();
    } finally { setSending(false); }
  };

  return (
    <div>
      {/* Statut & dates */}
      <div style={C.card}>
        <div style={C.cardTitle}>Phase {phaseLabel}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
          <span style={C.badge(statut)}>{statut}</span>
          {detail?.dateDebut && <span style={{ fontSize: 12, color: '#8892a4' }}>Début : {new Date(detail.dateDebut).toLocaleDateString('fr-MA')}</span>}
          {detail?.dateFin && <span style={{ fontSize: 12, color: '#8892a4' }}>Fin : {new Date(detail.dateFin).toLocaleDateString('fr-MA')}</span>}
          {detail?.note && <span style={{ fontSize: 12, color: '#f59e0b' }}>Note : {detail.note}</span>}
        </div>
      </div>

      {/* Données spécifiques phase */}
      {phase === 'PHASE_01_ESQUISSE' && (
        <div style={C.card}>
          <div style={C.cardTitle}>Données dossier</div>
          {[
            ['Client', dossier.clientNom], ['CIN', dossier.clientCin], ['Raison sociale', dossier.raisonSociale],
            ['RC', dossier.rc], ['ICE', dossier.ice],
            ['Surface terrain', dossier.surfaceTerrain ? `${dossier.surfaceTerrain} m²` : null],
            ['Surface plancher', dossier.surfacePlancher ? `${dossier.surfacePlancher} m²` : null],
            ['Lambert X', dossier.lambertX], ['Lambert Y', dossier.lambertY], ['Système', dossier.lambertSystem],
            ['WGS84 Lat', dossier.wgs84Lat], ['WGS84 Lng', dossier.wgs84Lng],
          ].filter(([, v]) => v != null).map(([l, v]) => (
            <div key={String(l)} style={C.row}><span style={C.lbl}>{l}</span><span style={C.val}>{String(v)}</span></div>
          ))}
          {!dossier.clientNom && !dossier.lambertX && <div style={C.empty}>Aucune donnée saisie pour cette phase.</div>}
        </div>
      )}

      {phase === 'PHASE_05_AUTORISATION' && rokhas && (
        <div style={C.card}>
          <div style={C.cardTitle}>Données Rokhas / Permis</div>
          {[
            ['Type permis', rokhas.typePermis], ['N° arrêté', rokhas.numArrete],
            ['Date arrêté', rokhas.dateArrete ? new Date(rokhas.dateArrete).toLocaleDateString('fr-MA') : null],
            ['Architecte', rokhas.architecteNom], ['BET structure', rokhas.betStructureNom],
            ['BET techniques', rokhas.betTechniquesNom], ['Topographe', rokhas.topographeNom],
            ['Entrepreneur', rokhas.entrepreneurNom], ['ICE client', rokhas.clientIce],
            ['Douar', rokhas.douar], ['Cercle', rokhas.cercle], ['Province', rokhas.province],
            ['Sync', rokhas.syncStatus], ['Dernière sync', rokhas.lastSyncAt ? new Date(rokhas.lastSyncAt).toLocaleString('fr-MA') : null],
          ].filter(([, v]) => v != null).map(([l, v]) => (
            <div key={String(l)} style={C.row}><span style={C.lbl}>{l}</span><span style={C.val}>{String(v)}</span></div>
          ))}
          {!rokhas.typePermis && <div style={C.empty}>Données Rokhas non synchronisées.</div>}
        </div>
      )}

      {/* Documents */}
      <div style={C.card}>
        <div style={C.cardTitle}>Documents ({(detail?.documents ?? []).length})</div>
        {(detail?.documents ?? []).length === 0
          ? <div style={C.empty}>Aucun document uploadé.</div>
          : (detail.documents as any[]).map((doc: any) => (
            <div key={doc.id} style={{ ...C.row, alignItems: 'center' }}>
              <span style={{ ...C.lbl, width: 'auto', flex: 1 }}>{doc.originalName ?? doc.docType}</span>
              <span style={{ fontSize: 11, color: '#4a5568', marginRight: 8 }}>{doc.mimeType}</span>
              <span style={{ fontSize: 11, color: '#4a5568' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('fr-MA') : ''}</span>
            </div>
          ))
        }
      </div>

      {/* Messagerie */}
      <div style={C.card}>
        <div style={C.cardTitle}>Messagerie phase ({(detail?.messages ?? []).length})</div>
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 10 }}>
          {(detail?.messages ?? []).length === 0
            ? <div style={C.empty}>Aucun message pour cette phase.</div>
            : (detail.messages as any[]).map((m: any) => (
              <div key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid #131820', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{m.expediteurRole}</span>
                  <span style={{ color: '#4a5568', fontSize: 11 }}>{m.createdAt ? new Date(m.createdAt).toLocaleString('fr-MA') : ''}</span>
                </div>
                <div style={{ color: '#e8eaf0' }}>{m.contenu}</div>
              </div>
            ))
          }
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Message..." rows={2} style={C.input} />
          <button onClick={sendMsg} disabled={sending || !msgText.trim()} style={{ ...C.btn('primary'), flexShrink: 0, alignSelf: 'flex-end' }}>Envoyer</button>
        </div>
      </div>

      {/* Actions */}
      <div style={C.card}>
        <div style={C.cardTitle}>Actions</div>
        {statut === 'EN_COURS' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input placeholder="Note optionnelle..." value={actionNote} onChange={e => setActionNote(e.target.value)} style={{ ...C.input, padding: '6px 10px' }} />
            </div>
            <button onClick={() => { onAction('VALIDER', actionNote); setActionNote(''); }} style={C.btn('primary')}>✓ Valider phase</button>
            <button onClick={() => { onAction('BLOQUER', actionNote); setActionNote(''); }} style={C.btn('danger')}>✕ Bloquer</button>
          </div>
        )}
        {statut === 'EN_ATTENTE' && (
          <button onClick={() => onAction('DEMARRER')} style={C.btn('primary')}>▶ Démarrer phase</button>
        )}
        {(statut === 'COMPLETE' || statut === 'BLOQUE' || statut === 'BLOQUÉ') && (
          <div style={C.empty}>{statut === 'COMPLETE' ? 'Phase validée — lecture seule.' : 'Phase bloquée.'}</div>
        )}
      </div>
    </div>
  );
}

// ─── PhasePanel — ROKHAS ─────────────────────────────────────────────────────

function RokhasPhasePanel({ phaseKey, dossier }: { phaseKey: string; dossier: any }) {
  const num = parseInt(phaseKey.replace('ROKHAS_', ''), 10);
  const phase: any = (dossier?.rokhas?.phases ?? []).find((p: any) => p.phaseNum === num || String(p.id) === phaseKey.replace('ROKHAS_', ''));
  const docs: any[] = (dossier?.rokhas?.documents ?? []).filter((d: any) => d.phaseNum === num);

  if (!phase) return <div style={C.empty}>Données de phase Rokhas introuvables.</div>;

  const statut = phase.statut === 'TERMINE' ? 'COMPLETE' : phase.statut;

  return (
    <div>
      <div style={C.card}>
        <div style={C.cardTitle}>Rokhas — {phase.phaseLabel ?? `Phase ${phase.phaseNum}`}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <span style={C.badge(statut)}>{phase.statut}</span>
          <span style={{ fontSize: 12, color: '#4a5568' }}>Lecture seule — piloté par Rokhas.ma</span>
        </div>
        {[
          ['Phase N°', phase.phaseNum], ['Statut', phase.statut],
          ['Date saisie', phase.dateSaisie ? new Date(phase.dateSaisie).toLocaleDateString('fr-MA') : null],
          ['Date décision', phase.dateDecision ? new Date(phase.dateDecision).toLocaleDateString('fr-MA') : null],
          ['Note', phase.note],
        ].filter(([, v]) => v != null).map(([l, v]) => (
          <div key={String(l)} style={C.row}><span style={C.lbl}>{l}</span><span style={C.val}>{String(v)}</span></div>
        ))}
      </div>

      <div style={C.card}>
        <div style={C.cardTitle}>Pièces Rokhas ({docs.length})</div>
        {docs.length === 0
          ? <div style={C.empty}>Aucune pièce pour cette phase.</div>
          : docs.map((doc: any) => (
            <div key={doc.id} style={{ ...C.row, alignItems: 'center' }}>
              <span style={{ flex: 1, color: '#e8eaf0', fontSize: 13 }}>{doc.nom ?? doc.code}</span>
              <span style={{ ...C.badge(doc.statut === 'RECUPERE' ? 'EN_COURS' : 'EN_ATTENTE'), fontSize: 10, marginLeft: 8 }}>{doc.statut}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<string>('');
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDossier = useCallback(() => {
    if (!id) return;
    apiFetch(`/p2/dossier/ops/${id}`)
      .then((d: any) => {
        setDossier(d);
        const cur = d.phase ?? d.phaseRecords?.[0]?.phase ?? PHASES_CITURB[0].key;
        setActivePhase(prev => prev || cur);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadDossier(); }, [loadDossier]);

  useEffect(() => {
    if (!activePhase || !id || activePhase.startsWith('ROKHAS_')) { setDetail(null); return; }
    setDetailLoading(true);
    apiFetch(`/p2/dossier/${id}/phase/${activePhase}/detail`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [id, activePhase]);

  const handleAction = async (action: string, note?: string) => {
    if (!id || !activePhase) return;
    try {
      await apiFetch(`/p2/dossier/${id}/phase/${activePhase}/action`, { method: 'POST', body: JSON.stringify({ action, note }) });
      loadDossier();
      setDetail(null);
    } catch (e: any) { alert(e?.message ?? 'Erreur'); }
  };

  if (loading) return <div style={{ color: '#4a5568', padding: 40 }}>Chargement…</div>;
  if (!dossier) return <div style={{ color: '#f87171', padding: 40 }}>Dossier introuvable.</div>;

  const isRokhas = activePhase.startsWith('ROKHAS_');

  return (
    <div style={C.wrap}>
      <DossierHeader dossier={dossier} onBack={() => navigate('/cc/dossiers')} />
      <div style={C.body}>
        <PhaseNav dossier={dossier} activePhase={activePhase} onSelect={setActivePhase} />
        <div style={C.panel}>
          {detailLoading && <div style={{ color: '#4a5568', padding: 16 }}>Chargement phase…</div>}
          {!detailLoading && isRokhas && (
            <RokhasPhasePanel phaseKey={activePhase} dossier={dossier} />
          )}
          {!detailLoading && !isRokhas && (
            <CiturbPhasePanel
              dossier={dossier}
              phase={activePhase}
              detail={detail}
              onAction={handleAction}
              onMessageSent={() => {
                if (activePhase && id) apiFetch(`/p2/dossier/${id}/phase/${activePhase}/detail`).then(setDetail).catch(() => {});
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
