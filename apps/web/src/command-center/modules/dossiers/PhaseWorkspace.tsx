import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const tk = () => localStorage.getItem('citurbarea.token') || '';
const api = async (path: string, opts?: RequestInit) => {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk()}`, ...(opts?.headers ?? {}) } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

const PHASES = [
  { key: 'PHASE_01_ESQUISSE', label: '01 Esquisse', icon: '✏️' },
  { key: 'PHASE_02_APS', label: '02 APS', icon: '📐' },
  { key: 'PHASE_03_APD', label: '03 APD', icon: '📋' },
  { key: 'PHASE_04_MANDAT_BET', label: '04 Mandat BET', icon: '📝' },
  { key: 'PHASE_05_AUTORISATION', label: '05 Autorisation', icon: '🏛️' },
  { key: 'PHASE_06_DOSSIER_EXECUTION', label: '06 Exec.', icon: '📁' },
  { key: 'PHASE_07_DCE', label: '07 DCE', icon: '📦' },
  { key: 'PHASE_08_MANDATS', label: '08 Mandats', icon: '🤝' },
  { key: 'PHASE_09_OUVERTURE_CHANTIER', label: '09 Ouverture', icon: '🏗️' },
  { key: 'PHASE_RECEPTION_PROVISOIRE', label: 'Récep. Prov.', icon: '✅' },
  { key: 'PHASE_RECEPTION_DEFINITIVE', label: 'Récep. Def.', icon: '✅' },
  { key: 'PHASE_PERMIS_HABITER', label: 'Permis Habiter', icon: '🏠' },
];

const SC: Record<string, { bg: string; c: string; dot: string }> = {
  COMPLETE:    { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
  VALIDEE:     { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
  TERMINE:     { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
  EN_COURS:    { bg: '#1a2a4a', c: '#60a5fa', dot: '◉' },
  SOUMISE:     { bg: '#2a2a1a', c: '#fbbf24', dot: '◎' },
  PLANIFIEE:   { bg: '#2a2a1a', c: '#fbbf24', dot: '◎' },
  TENUE:       { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
  EN_ATTENTE:  { bg: '#1e2330', c: '#8892a4', dot: '○' },
  BROUILLON:   { bg: '#1e2330', c: '#8892a4', dot: '○' },
  ENVOYE:      { bg: '#1a2a4a', c: '#60a5fa', dot: '◉' },
  ACCEPTE:     { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
  REJETEE:     { bg: '#3a1a1a', c: '#f87171', dot: '✕' },
  REFUSE:      { bg: '#3a1a1a', c: '#f87171', dot: '✕' },
  BLOQUE:      { bg: '#3a1a1a', c: '#f87171', dot: '✕' },
  EMISE:       { bg: '#2a2a1a', c: '#fbbf24', dot: '◎' },
  PAYEE:       { bg: '#1a3a2a', c: '#4ade80', dot: '●' },
};
const gs = (s: string) => SC[s] ?? SC.EN_ATTENTE;

const C = {
  root:    { display: 'flex', flexDirection: 'column' as const, height: '100vh', background: '#080d14', color: '#e8eaf0', fontFamily: 'system-ui,sans-serif', fontSize: 13 },
  hdr:     { background: '#090e18', borderBottom: '1px solid #1a2234', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 as const },
  body:    { display: 'flex', flex: 1, overflow: 'hidden' },
  nav:     { width: 196, flexShrink: 0 as const, background: '#06090f', borderRight: '1px solid #1a2234', overflowY: 'auto' as const },
  nSec:    { fontSize: 9, fontWeight: 800, color: '#2d3a50', textTransform: 'uppercase' as const, letterSpacing: 1.5, padding: '14px 14px 5px' },
  panel:   { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  tabs:    { display: 'flex', borderBottom: '1px solid #1a2234', background: '#090e18', padding: '0 14px', flexShrink: 0 as const },
  content: { flex: 1, overflowY: 'auto' as const, padding: 16 },
  card:    { background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: '14px 16px', marginBottom: 10 } as React.CSSProperties,
  inp:     { background: '#0a0f1a', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const },
  ta:      { background: '#0a0f1a', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' as const, resize: 'vertical' as const, minHeight: 68 },
};

const btn = (v: 'p'|'s'|'d'|'w'|'g'): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  background: v==='p'?'#1d4ed8':v==='s'?'#15803d':v==='d'?'#991b1b':v==='w'?'#92400e':'#1e2330',
  color: v==='g'?'#8892a4':'#fff',
});

function Bdg({ s, ch }: { s: string; ch?: string }) {
  const st = gs(s);
  return <span style={{ background: st.bg, color: st.c, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{ch ?? s}</span>;
}

function fmt(d?: any) { return d ? new Date(d).toLocaleDateString('fr-MA') : '—'; }
function fmtT(d?: any) { return d ? new Date(d).toLocaleString('fr-MA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'; }

// ── Main ────────────────────────────────────────────────
export default function PhaseWorkspace() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [dos, setDos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ap, setAp] = useState('');
  const [snap, setSnap] = useState<any>(null);
  const [snL, setSnL] = useState(false);
  const [tab, setTab] = useState<'it'|'ch'|'re'|'fi'|'hi'>('it');

  const loadDos = useCallback(async () => {
    if (!id) return;
    try { const d = await api(`/p2/dossier/${id}/complet`); setDos(d); if (!ap) setAp(d.phase ?? PHASES[0].key); }
    finally { setLoading(false); }
  }, [id]);

  const loadSnap = useCallback(async () => {
    if (!id || !ap || ap.startsWith('ROKHAS_')) return;
    setSnL(true);
    try { setSnap(await api(`/p2/dossier/${id}/phase/${encodeURIComponent(ap)}/snapshot`)); }
    catch { setSnap(null); } finally { setSnL(false); }
  }, [id, ap]);

  useEffect(() => { loadDos(); }, [id]);
  useEffect(() => { if (ap) loadSnap(); }, [ap]);

  if (loading) return <div style={{ color: '#4a5568', padding: 40 }}>Chargement…</div>;
  if (!dos) return <div style={{ color: '#f87171', padding: 40 }}>Dossier introuvable.</div>;

  const rm: Record<string, any> = {};
  (dos.phaseRecords ?? []).forEach((r: any) => { rm[r.phase] = r; });
  const rokhasPhases = dos.rokhas?.phases ?? [];
  const isRok = ap.startsWith('ROKHAS_');

  return (
    <div style={C.root}>
      <div style={C.hdr}>
        <button onClick={() => nav('/cc/dossiers')} style={{ ...btn('g'), padding: '4px 10px', fontSize: 11 }}>← Retour</button>
        <span style={{ fontWeight: 800, fontSize: 15 }}>{dos.refInterne ?? dos.id?.slice(0, 12)}</span>
        <Bdg s={dos.porteType ?? 'P1'} ch={dos.porteType ?? 'P1'} />
        {dos.gestionMode && <Bdg s="EN_ATTENTE" ch={dos.gestionMode} />}
        <span style={{ color: '#4a5568', marginLeft: 4 }}>{dos.commune}</span>
        {dos.clientNom && <span style={{ color: '#8892a4' }}>· <strong style={{ color: '#e8eaf0' }}>{dos.clientNom}</strong></span>}
        {dos.firm?.name && <span style={{ color: '#4a5568' }}>· <strong style={{ color: '#60a5fa' }}>{dos.firm.name}</strong></span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3d4f6a' }}>{dos.owner?.email}</span>
      </div>
      <div style={C.body}>
        {/* NAV */}
        <div style={C.nav}>
          <div style={C.nSec}>Phases CITURBAREA</div>
          {PHASES.map(p => {
            const rec = rm[p.key]; const st = rec?.statut ?? 'EN_ATTENTE'; const stS = gs(st); const active = ap === p.key;
            return (
              <div key={p.key} onClick={() => { setAp(p.key); setTab('it'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', cursor: 'pointer', background: active ? '#0f1c33' : 'transparent', borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent' }}
                onMouseEnter={e => { if (!active)(e.currentTarget as HTMLElement).style.background = '#0a0f1a'; }}
                onMouseLeave={e => { if (!active)(e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                <span style={{ color: stS.c, fontSize: 12 }}>{stS.dot}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: active ? '#e8eaf0' : '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{p.icon} {p.label}</div>
                  {rec?.dateFin && <div style={{ fontSize: 10, color: '#3d4f6a' }}>{fmt(rec.dateFin)}</div>}
                </div>
              </div>
            );
          })}
          {rokhasPhases.length > 0 && (
            <>
              <div style={{ ...C.nSec, borderTop: '1px solid #1a2234', marginTop: 8, paddingTop: 14 }}>Phases Rokhas</div>
              {rokhasPhases.map((ph: any) => {
                const key = `ROKHAS_${ph.phaseNum ?? ph.id}`; const active = ap === key; const stS = gs(ph.statut === 'TERMINE' ? 'COMPLETE' : ph.statut);
                return (
                  <div key={key} onClick={() => setAp(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', cursor: 'pointer', background: active ? '#0f1c33' : 'transparent', borderLeft: active ? '2px solid #3b82f6' : '2px solid transparent' }}
                    onMouseEnter={e => { if (!active)(e.currentTarget as HTMLElement).style.background = '#0a0f1a'; }}
                    onMouseLeave={e => { if (!active)(e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                    <span style={{ color: stS.c, fontSize: 12 }}>{stS.dot}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: active ? '#e8eaf0' : '#8892a4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{ph.phaseLabel ?? `Phase ${ph.phaseNum}`}</div>
                      {ph.dateDecision && <div style={{ fontSize: 10, color: '#3d4f6a' }}>{fmt(ph.dateDecision)}</div>}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
        {/* PANEL */}
        <div style={C.panel}>
          {isRok ? <RokPanel dos={dos} pk={ap} /> : (
            <>
              <div style={{ background: '#0a0f1a', borderBottom: '1px solid #1a2234', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{PHASES.find(p => p.key === ap)?.icon} {PHASES.find(p => p.key === ap)?.label}</span>
                {rm[ap] && <Bdg s={rm[ap].statut} />}
                {rm[ap]?.dateDebut && <span style={{ color: '#3d4f6a', fontSize: 11 }}>Début: {fmt(rm[ap].dateDebut)}</span>}
                <span style={{ flex: 1 }} />
                {snap?.finances && <span style={{ fontSize: 11, color: '#4a5568' }}>💰 {snap.finances.totalFacture.toLocaleString()} MAD · payé: {snap.finances.totalPaye.toLocaleString()}</span>}
              </div>
              <div style={C.tabs}>
                {([
                  ['it', 'Itérations' + (snap ? ` (${snap.sousPhases.length})` : '')],
                  ['ch', 'Chat' + (snap?.chat?.nonLus > 0 ? ` 🔴${snap.chat.nonLus}` : snap ? ` (${snap.chat.total})` : '')],
                  ['re', 'Réunions' + (snap ? ` (${snap.reunions.length})` : '')],
                  ['fi', 'Finances'],
                  ['hi', 'Historique' + (snap ? ` (${snap.historique.length})` : '')],
                ] as [string, string][]).map(([k, l]) => (
                  <div key={k} onClick={() => setTab(k as any)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: tab === k ? '#60a5fa' : '#4a5568', borderBottom: tab === k ? '2px solid #3b82f6' : '2px solid transparent' }}>{l}</div>
                ))}
              </div>
              <div style={C.content}>
                {snL ? <div style={{ color: '#3d4f6a', padding: 20 }}>Chargement…</div> : (
                  <>
                    {tab === 'it' && <IterTab id={id!} pr={ap} snap={snap} onR={loadSnap} />}
                    {tab === 'ch' && <ChatTab id={id!} pr={ap} snap={snap} onR={loadSnap} />}
                    {tab === 're' && <ReTab id={id!} pr={ap} snap={snap} onR={loadSnap} />}
                    {tab === 'fi' && <FinTab id={id!} pr={ap} snap={snap} onR={loadSnap} />}
                    {tab === 'hi' && <HiTab snap={snap} />}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Itérations ─────────────────────────────────────────
function IterTab({ id, pr, snap, onR }: any) {
  const [creating, setCreating] = useState(false);
  const [titre, setTitre] = useState('');
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [actNote, setActNote] = useState('');
  const sps: any[] = snap?.sousPhases ?? [];

  const create = async () => {
    await api(`/p2/dossier/${id}/sous-phases`, { method: 'POST', body: JSON.stringify({ phaseRef: pr, titre, notePrestataire: note }) });
    setCreating(false); setTitre(''); setNote(''); onR();
  };
  const act = async (sid: string, action: string) => {
    await api(`/p2/dossier/${id}/sous-phases/${sid}/${action}`, { method: 'POST', body: JSON.stringify({ note: actNote }) });
    setActNote(''); onR();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700 }}>Versions ({sps.length})</span>
        <button style={btn('p')} onClick={() => setCreating(true)}>+ Nouvelle version</button>
      </div>
      {creating && (
        <div style={C.card}>
          <input placeholder="Titre…" style={{ ...C.inp, marginBottom: 8 }} value={titre} onChange={e => setTitre(e.target.value)} />
          <textarea placeholder="Note prestataire…" style={{ ...C.ta, marginBottom: 8 }} value={note} onChange={e => setNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}><button style={btn('p')} onClick={create}>Créer</button><button style={btn('g')} onClick={() => setCreating(false)}>Annuler</button></div>
        </div>
      )}
      {sps.map(sp => (
        <div key={sp.id}>
          <div onClick={() => setSel(sel?.id === sp.id ? null : sp)}
            style={{ background: sel?.id === sp.id ? '#0f1c33' : '#111827', border: `1px solid ${sel?.id === sp.id ? '#1d4ed8' : '#1e2330'}`, borderRadius: 8, padding: '11px 14px', marginBottom: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>
                V{sp.numero} — {sp.titre ?? sp.label}
                {sp.type === 'DEFINITIVE' && <span style={{ marginLeft: 6, fontSize: 10, background: '#15803d', color: '#fff', borderRadius: 3, padding: '1px 5px' }}>DÉFINITIVE</span>}
              </div>
              <div style={{ fontSize: 11, color: '#4a5568' }}>{fmt(sp.createdAt)} · {sp.documents?.length ?? 0} doc.</div>
            </div>
            <Bdg s={sp.statut} />
          </div>
          {sel?.id === sp.id && (
            <div style={{ ...C.card, margin: '-4px 0 10px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none' }}>
              {sp.notePrestataire && <div style={{ marginBottom: 8, padding: 8, background: '#0f1520', borderRadius: 6, fontSize: 12 }}><span style={{ color: '#60a5fa', fontWeight: 600 }}>Note prestataire: </span>{sp.notePrestataire}</div>}
              {sp.noteClient && <div style={{ marginBottom: 8, padding: 8, background: '#0f1520', borderRadius: 6, fontSize: 12 }}><span style={{ color: '#4ade80', fontWeight: 600 }}>Note client: </span>{sp.noteClient}</div>}
              <div style={{ fontSize: 12, color: '#4a5568', marginBottom: 10 }}>📎 {sp.documents?.length ?? 0} document(s)</div>
              {sp.statut === 'EN_COURS' && <button style={btn('w')} onClick={() => act(sp.id, 'soumettre')}>📤 Soumettre au client</button>}
              {sp.statut === 'SOUMISE' && (
                <div>
                  <textarea placeholder="Note (obligatoire pour rejeter)…" style={{ ...C.ta, marginBottom: 8 }} value={actNote} onChange={e => setActNote(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={btn('s')} onClick={() => act(sp.id, 'valider')}>✅ Valider</button>
                    <button style={btn('d')} onClick={() => act(sp.id, 'rejeter')}>✕ Rejeter</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {sps.length === 0 && !creating && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucune version. Cliquez "+ Nouvelle version".</div>}
    </div>
  );
}

// ── Chat ────────────────────────────────────────────────
function ChatTab({ id, pr, snap, onR }: any) {
  const msgs: any[] = snap?.chat?.messages ?? [];
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bot = useRef<HTMLDivElement>(null);

  useEffect(() => { bot.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try { await api(`/p2/dossier/${id}/phase/${encodeURIComponent(pr)}/chat`, { method: 'POST', body: JSON.stringify({ contenu: msg }) }); setMsg(''); onR(); }
    finally { setSending(false); }
  };

  const rc: Record<string, string> = { OWNER: '#60a5fa', ADMIN: '#a78bfa', OPS: '#34d399', CLIENT: '#fbbf24', PRESTATAIRE: '#f97316' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {msgs.length === 0 && <div style={{ color: '#3d4f6a', padding: '30px 0', textAlign: 'center' }}>Aucun message. Démarrez la discussion.</div>}
        {msgs.map((m: any) => {
          const ops = ['OWNER', 'ADMIN', 'OPS'].includes(m.expediteurRole);
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: ops ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: rc[m.expediteurRole] ?? '#3d4f6a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                {(m.expediteurNom ?? m.expediteurRole).charAt(0).toUpperCase()}
              </div>
              <div style={{ maxWidth: '72%' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 2, flexDirection: ops ? 'row-reverse' : 'row' }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: rc[m.expediteurRole] ?? '#8892a4' }}>{m.expediteurNom ?? m.expediteurRole}</span>
                  <span style={{ fontSize: 10, color: '#3d4f6a' }}>{fmtT(m.createdAt)}</span>
                </div>
                <div style={{ background: ops ? '#1a2a4a' : '#1a3a2a', borderRadius: ops ? '12px 4px 12px 12px' : '4px 12px 12px 12px', padding: '8px 12px', fontSize: 13 }}>{m.contenu}</div>
              </div>
            </div>
          );
        })}
        <div ref={bot} />
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1a2234', paddingTop: 12 }}>
        <textarea value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message… (Entrée pour envoyer)" rows={2} style={C.ta} />
        <button onClick={send} disabled={sending || !msg.trim()} style={{ ...btn('p'), alignSelf: 'flex-end', flexShrink: 0 }}>{sending ? '…' : '➤'}</button>
      </div>
    </div>
  );
}

// ── Réunions ────────────────────────────────────────────
function ReTab({ id, pr, snap, onR }: any) {
  const reu: any[] = snap?.reunions ?? [];
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ titre: '', type: 'PRESENTIEL', dateDebut: '', dureeMinutes: 60, lieu: '', lienVisio: '', noteOrdreJour: '' });

  const create = async () => {
    await api(`/p2/dossier/${id}/reunions`, { method: 'POST', body: JSON.stringify({ ...f, phaseRef: pr }) });
    setForm(false); onR();
  };
  const marquer = async (rid: string) => {
    await api(`/p2/dossier/${id}/reunions/${rid}`, { method: 'PATCH', body: JSON.stringify({ statut: 'TENUE' }) });
    onR();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700 }}>Réunions ({reu.length})</span>
        <button style={btn('p')} onClick={() => setForm(true)}>+ Planifier</button>
      </div>
      {form && (
        <div style={C.card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input placeholder="Titre" style={C.inp} value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} />
            <select style={C.inp} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
              <option value="PRESENTIEL">🤝 Présentiel</option>
              <option value="VISIO">🎥 Visio</option>
              <option value="TELEPHONE">📞 Téléphone</option>
            </select>
            <input type="datetime-local" style={C.inp} value={f.dateDebut} onChange={e => setF({ ...f, dateDebut: e.target.value })} />
            <input type="number" placeholder="Durée (min)" style={C.inp} value={f.dureeMinutes} onChange={e => setF({ ...f, dureeMinutes: +e.target.value })} />
            {f.type === 'PRESENTIEL' && <input placeholder="Lieu" style={{ ...C.inp, gridColumn: '1/-1' }} value={f.lieu} onChange={e => setF({ ...f, lieu: e.target.value })} />}
            {f.type === 'VISIO' && <input placeholder="Lien visio" style={{ ...C.inp, gridColumn: '1/-1' }} value={f.lienVisio} onChange={e => setF({ ...f, lienVisio: e.target.value })} />}
            <textarea placeholder="Ordre du jour" style={{ ...C.ta, gridColumn: '1/-1' } as any} value={f.noteOrdreJour} onChange={e => setF({ ...f, noteOrdreJour: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}><button style={btn('p')} onClick={create}>Planifier</button><button style={btn('g')} onClick={() => setForm(false)}>Annuler</button></div>
        </div>
      )}
      {reu.map(r => (
        <div key={r.id} style={C.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>{r.type === 'VISIO' ? '🎥' : r.type === 'TELEPHONE' ? '📞' : '🤝'} {r.titre}</div>
              <div style={{ fontSize: 12, color: '#4a5568' }}>{fmtT(r.dateDebut)} · {r.dureeMinutes} min{r.lieu && ` · ${r.lieu}`}</div>
              {r.lienVisio && <a href={r.lienVisio} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none' }}>🔗 Rejoindre</a>}
              {r.noteOrdreJour && <div style={{ fontSize: 12, color: '#8892a4', marginTop: 6 }}>OJ: {r.noteOrdreJour}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <Bdg s={r.statut} />
              {r.statut === 'PLANIFIEE' && <button style={{ ...btn('s'), fontSize: 11 }} onClick={() => marquer(r.id)}>✓ Tenue</button>}
            </div>
          </div>
        </div>
      ))}
      {reu.length === 0 && !form && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucune réunion.</div>}
    </div>
  );
}

// ── Finances ────────────────────────────────────────────
function FinTab({ id, pr, snap, onR }: any) {
  const devis: any[] = snap?.finances?.devis ?? [];
  const factures: any[] = snap?.finances?.factures ?? [];
  const [sub, setSub] = useState<'d' | 'f'>('d');
  const [formD, setFormD] = useState(false);
  const [formF, setFormF] = useState(false);
  const [titre, setTitre] = useState('');
  const [lignes, setLignes] = useState([{ description: '', quantite: 1, prixUnitaire: 0 }]);
  const ht = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);

  const addL = () => setLignes([...lignes, { description: '', quantite: 1, prixUnitaire: 0 }]);
  const updL = (i: number, k: string, v: any) => setLignes(lignes.map((l, j) => j === i ? { ...l, [k]: v } : l));
  const resetForm = () => { setTitre(''); setLignes([{ description: '', quantite: 1, prixUnitaire: 0 }]); };

  const createD = async () => {
    await api(`/p2/dossier/${id}/devis`, { method: 'POST', body: JSON.stringify({ phaseRef: pr, titre, lignes }) });
    setFormD(false); resetForm(); onR();
  };
  const createF = async () => {
    await api(`/p2/dossier/${id}/factures`, { method: 'POST', body: JSON.stringify({ phaseRef: pr, titre, lignes }) });
    setFormF(false); resetForm(); onR();
  };
  const updDevStatut = async (did: string, statut: string) => {
    await api(`/p2/dossier/${id}/devis/${did}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) });
    onR();
  };
  const payer = async (fid: string, montant: number) => {
    const mode = window.prompt('Mode paiement (VIREMENT, CHEQUE, ESPECES, CMI):', 'VIREMENT');
    if (!mode) return;
    await api(`/p2/dossier/${id}/factures/${fid}/paiement`, { method: 'POST', body: JSON.stringify({ montantPaye: montant, modePaiement: mode }) });
    onR();
  };

  const Ledger = () => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 40px', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#4a5568' }}>Prestation</span>
        <span style={{ fontSize: 11, color: '#4a5568' }}>Qté</span>
        <span style={{ fontSize: 11, color: '#4a5568' }}>P.U. MAD</span>
        <span />
      </div>
      {lignes.map((l, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 40px', gap: 6, marginBottom: 6 }}>
          <input style={C.inp} value={l.description} onChange={e => updL(i, 'description', e.target.value)} placeholder="Prestation" />
          <input type="number" style={C.inp} value={l.quantite} onChange={e => updL(i, 'quantite', +e.target.value)} />
          <input type="number" style={C.inp} value={l.prixUnitaire} onChange={e => updL(i, 'prixUnitaire', +e.target.value)} />
          <button style={{ ...btn('d'), padding: '6px' }} onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button style={{ ...btn('g'), fontSize: 11 }} onClick={addL}>+ Ligne</button>
      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <span style={{ color: '#4a5568' }}>HT: </span><strong>{ht.toLocaleString()}</strong>
        <span style={{ color: '#4ade80', marginLeft: 12 }}>TTC (20%): </span><strong style={{ color: '#4ade80' }}>{(ht * 1.2).toLocaleString()} MAD</strong>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        {[
          ['Total devis', (snap?.finances?.totalDevis ?? 0).toLocaleString() + ' MAD', '#60a5fa'],
          ['Total facturé', (snap?.finances?.totalFacture ?? 0).toLocaleString() + ' MAD', '#fbbf24'],
          ['Solde dû', (snap?.finances?.solde ?? 0).toLocaleString() + ' MAD', (snap?.finances?.solde ?? 0) > 0 ? '#f87171' : '#4ade80'],
        ].map(([l, v, c]) => (
          <div key={l as string} style={{ background: '#111827', border: '1px solid #1e2330', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={btn(sub === 'd' ? 'p' : 'g')} onClick={() => setSub('d')}>Devis ({devis.length})</button>
        <button style={btn(sub === 'f' ? 'p' : 'g')} onClick={() => setSub('f')}>Factures ({factures.length})</button>
      </div>

      {sub === 'd' && (
        <>
          <button style={{ ...btn('p'), marginBottom: 10 }} onClick={() => { setFormD(true); setFormF(false); }}>+ Nouveau devis</button>
          {formD && (
            <div style={C.card}>
              <input placeholder="Titre devis" style={{ ...C.inp, marginBottom: 8 }} value={titre} onChange={e => setTitre(e.target.value)} />
              <Ledger />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('p')} onClick={createD}>Créer devis</button>
                <button style={btn('g')} onClick={() => setFormD(false)}>Annuler</button>
              </div>
            </div>
          )}
          {devis.map(d => (
            <div key={d.id} style={C.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.numero} — {d.titre}</div>
                  <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Émis: {fmt(d.dateEmission)}{d.dateValidite && ` · Valide jusqu'au ${fmt(d.dateValidite)}`}</div>
                  <div style={{ marginTop: 6 }}><strong style={{ color: '#4ade80' }}>{d.montantTTC.toLocaleString()} MAD TTC</strong></div>
                  {d.noteRefus && <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>Motif refus: {d.noteRefus}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <Bdg s={d.statut} />
                  {d.statut === 'BROUILLON' && <button style={{ ...btn('p'), fontSize: 11 }} onClick={() => updDevStatut(d.id, 'ENVOYE')}>📤 Envoyer</button>}
                  {d.statut === 'ENVOYE' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ ...btn('s'), fontSize: 11 }} onClick={() => updDevStatut(d.id, 'ACCEPTE')}>✅ Accepté</button>
                      <button style={{ ...btn('d'), fontSize: 11 }} onClick={() => updDevStatut(d.id, 'REFUSE')}>✕ Refusé</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {devis.length === 0 && !formD && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucun devis.</div>}
        </>
      )}

      {sub === 'f' && (
        <>
          <button style={{ ...btn('p'), marginBottom: 10 }} onClick={() => { setFormF(true); setFormD(false); }}>+ Nouvelle facture</button>
          {formF && (
            <div style={C.card}>
              <input placeholder="Titre facture" style={{ ...C.inp, marginBottom: 8 }} value={titre} onChange={e => setTitre(e.target.value)} />
              <Ledger />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn('p')} onClick={createF}>Émettre facture</button>
                <button style={btn('g')} onClick={() => setFormF(false)}>Annuler</button>
              </div>
            </div>
          )}
          {factures.map(f => (
            <div key={f.id} style={C.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{f.numero} — {f.titre}</div>
                  <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Émise: {fmt(f.dateEmission)}{f.dateEcheance && ` · Échéance: ${fmt(f.dateEcheance)}`}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong style={{ color: '#fbbf24' }}>{f.montantTTC.toLocaleString()} MAD TTC</strong>
                    {f.montantPaye > 0 && <span style={{ marginLeft: 8, color: '#4ade80', fontSize: 12 }}>Payé: {f.montantPaye.toLocaleString()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <Bdg s={f.statut} />
                  {(f.statut === 'EMISE' || f.statut === 'PARTIELLEMENT_PAYEE') && (
                    <button style={{ ...btn('s'), fontSize: 11 }} onClick={() => payer(f.id, f.montantTTC)}>💳 Enregistrer paiement</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {factures.length === 0 && !formF && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucune facture.</div>}
        </>
      )}
    </div>
  );
}

// ── Historique ──────────────────────────────────────────
function HiTab({ snap }: any) {
  const items: any[] = snap?.historique ?? [];
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>Historique ({items.length})</div>
      {items.length === 0 && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucune entrée.</div>}
      {items.map(h => (
        <div key={h.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #1a2030' }}>
          <div style={{ fontSize: 10, color: '#3d4f6a', flexShrink: 0, minWidth: 90, marginTop: 1 }}>{fmtT(h.createdAt)}</div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: 12 }}>{h.action}</span>
            {h.acteurNom && <span style={{ color: '#4a5568', fontSize: 11, marginLeft: 8 }}>par {h.acteurNom}</span>}
            {h.note && <div style={{ color: '#8892a4', fontSize: 12, marginTop: 2 }}>{h.note}</div>}
            {h.details && <div style={{ color: '#3d4f6a', fontSize: 11, marginTop: 2 }}>{JSON.stringify(h.details)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Rokhas Panel ────────────────────────────────────────
function RokPanel({ dos, pk }: any) {
  const num = pk.replace('ROKHAS_', '');
  const ph = (dos.rokhas?.phases ?? []).find((p: any) => String(p.phaseNum) === num || p.id === num);
  const docs = (dos.rokhas?.documents ?? []).filter((d: any) => String(d.phaseNum) === num);

  if (!ph) return <div style={{ padding: 20, color: '#4a5568' }}>Phase Rokhas introuvable.</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={C.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Phase {ph.phaseNum} — {ph.phaseLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {[
            ['Statut', <Bdg key="s" s={ph.statut === 'TERMINE' ? 'COMPLETE' : ph.statut ?? 'EN_ATTENTE'} />],
            ['Saisie', fmt(ph.dateSaisie)],
            ['Traitement', fmt(ph.dateTraitement)],
            ['Décision', fmt(ph.dateDecision)],
            ['Service', ph.serviceTraitant ?? '—'],
            ['Agent', ph.agentNom ?? '—'],
          ].map(([k, v]) => (
            <div key={k as string}>
              <span style={{ color: '#4a5568' }}>{k}: </span>
              {typeof v === 'string' ? <strong>{v}</strong> : v}
            </div>
          ))}
        </div>
        {ph.motifRejet && <div style={{ marginTop: 10, padding: 8, background: '#1a0a0a', borderRadius: 6, color: '#f87171', fontSize: 12 }}>Motif rejet: {ph.motifRejet}</div>}
      </div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Documents ({docs.length})</div>
      {docs.map((d: any) => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1a2030', fontSize: 12 }}>
          <div>
            <span style={{ color: '#e8eaf0' }}>{d.nom}</span>
            {d.categorie && <span style={{ color: '#4a5568', marginLeft: 6 }}>({d.categorie})</span>}
          </div>
          <Bdg s={d.statut ?? 'EN_ATTENTE'} />
        </div>
      ))}
      {docs.length === 0 && <div style={{ color: '#3d4f6a', textAlign: 'center', padding: '20px 0' }}>Aucun document Rokhas pour cette phase.</div>}
    </div>
  );
}
