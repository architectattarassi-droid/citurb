/**
 * LeadsModule.tsx
 * Module Leads — gestion complète du pipeline Cities Talk → CITURBAREA
 *
 * Features:
 * - Table leads avec filtres (source / type / status)
 * - Formulaire ajout lead
 * - Action "Convertir en projet CITURBAREA"
 * - Badges couleur par source
 */

import React, { useEffect, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────

export type LeadSource = 'YOUTUBE' | 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK' | 'SITE' | 'NEWSLETTER' | 'REFERRAL' | 'DIRECT';
export type LeadType = 'INVESTISSEUR' | 'PARTICULIER' | 'PROMOTEUR' | 'ARCHITECTE' | 'ENTREPRISE' | 'MRE';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONSULTATION' | 'CLIENT' | 'LOST';

export interface Lead {
  id: string;
  createdAt: string;
  nom: string;
  email?: string;
  telephone?: string;
  ville?: string;
  type: LeadType;
  source: LeadSource;
  status: LeadStatus;
  interet?: string;
  budget?: number;
  notes?: string;
  citProjectId?: string;
}

// ─── Config ──────────────────────────────────────────────────

const SOURCE_CONFIG: Record<LeadSource, { label: string; color: string; bg: string }> = {
  YOUTUBE:    { label: 'YouTube',    color: '#ff4444', bg: 'rgba(255,68,68,0.12)' },
  INSTAGRAM:  { label: 'Instagram',  color: '#e1306c', bg: 'rgba(225,48,108,0.12)' },
  TIKTOK:     { label: 'TikTok',     color: '#69c9d0', bg: 'rgba(105,201,208,0.12)' },
  FACEBOOK:   { label: 'Facebook',   color: '#4267b2', bg: 'rgba(66,103,178,0.12)' },
  SITE:       { label: 'Site',       color: '#00d4aa', bg: 'rgba(0,212,170,0.12)' },
  NEWSLETTER: { label: 'Newsletter', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  REFERRAL:   { label: 'Référence',  color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  DIRECT:     { label: 'Direct',     color: '#8892a4', bg: 'rgba(136,146,164,0.12)' },
};

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  NEW:          { label: 'Nouveau',      color: '#0088ff' },
  CONTACTED:    { label: 'Contacté',     color: '#f59e0b' },
  QUALIFIED:    { label: 'Qualifié',     color: '#a855f7' },
  CONSULTATION: { label: 'Consultation', color: '#00d4aa' },
  CLIENT:       { label: 'Client ✓',     color: '#34d399' },
  LOST:         { label: 'Perdu',        color: '#4a5568' },
};

const TYPE_LABELS: Record<LeadType, string> = {
  INVESTISSEUR: 'Investisseur',
  PARTICULIER:  'Particulier',
  PROMOTEUR:    'Promoteur',
  ARCHITECTE:   'Architecte',
  ENTREPRISE:   'Entreprise',
  MRE:          'MRE',
};

// ─── Mock data (remplacer par fetch API) ─────────────────────

const MOCK_LEADS: Lead[] = [
  { id: '1', createdAt: '2026-03-01', nom: 'Karim Benali', email: 'k.benali@gmail.com', telephone: '+212661234567', ville: 'Kénitra', type: 'INVESTISSEUR', source: 'YOUTUBE', status: 'CONSULTATION', interet: 'Terrain Bir Rami 500m² R+4', budget: 800000 },
  { id: '2', createdAt: '2026-03-03', nom: 'Fatima Zahra Idrissi', email: 'fz.idrissi@outlook.com', telephone: '+212662345678', ville: 'Rabat', type: 'PARTICULIER', source: 'INSTAGRAM', status: 'QUALIFIED', interet: 'Construction villa 200m²', budget: 1200000 },
  { id: '3', createdAt: '2026-03-04', nom: 'Hassan Alaoui', email: 'h.alaoui@hotmail.com', ville: 'Salé', type: 'MRE', source: 'YOUTUBE', status: 'NEW', interet: 'Investissement locatif Kénitra', budget: 600000 },
  { id: '4', createdAt: '2026-03-05', nom: 'Omar Tazi', email: 'o.tazi@gmail.com', ville: 'Kénitra', type: 'PROMOTEUR', source: 'SITE', status: 'CLIENT', interet: 'Lot 21400m² Bir Rami requalification', budget: 5000000, citProjectId: 'proj-001' },
  { id: '5', createdAt: '2026-03-06', nom: 'Nadia Cherif', email: 'n.cherif@gmail.com', ville: 'Meknès', type: 'PARTICULIER', source: 'TIKTOK', status: 'NEW', interet: 'Construction maison 150m²', budget: 900000 },
  { id: '6', createdAt: '2026-03-07', nom: 'Youssef Mansouri', ville: 'Casablanca', type: 'INVESTISSEUR', source: 'NEWSLETTER', status: 'CONTACTED', interet: 'Plusieurs terrains Kénitra', budget: 2000000 },
];

// ─── Module principal ────────────────────────────────────────

export default function LeadsModule() {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [filterSource, setFilterSource] = useState<LeadSource | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<LeadType | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView] = useState<'table' | 'detail'>('table');

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/cc/leads');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.length) setLeads(data);
    } catch {
      // garde mock data
    }
  }

  const filtered = leads.filter(l => {
    if (filterSource !== 'ALL' && l.source !== filterSource) return false;
    if (filterStatus !== 'ALL' && l.status !== filterStatus) return false;
    if (filterType !== 'ALL' && l.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.nom + l.email + l.ville + l.interet).toLowerCase().includes(q);
    }
    return true;
  });

  // Stats rapides
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED' || l.status === 'CONSULTATION').length,
    clients: leads.filter(l => l.status === 'CLIENT').length,
    fromYT: leads.filter(l => l.source === 'YOUTUBE').length,
  };

  if (view === 'detail' && selectedLead) {
    return <LeadDetail lead={selectedLead} onBack={() => setView('table')} onUpdate={(l) => {
      setLeads(prev => prev.map(x => x.id === l.id ? l : x));
      setView('table');
    }} />;
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.moduleHeader}>
        <div>
          <h1 style={styles.moduleTitle}>◉ Leads</h1>
          <p style={styles.moduleSubtitle}>Pipeline Cities Talk → CITURBAREA</p>
        </div>
        <button style={styles.btnPrimary} onClick={() => setShowForm(true)}>
          + Nouveau lead
        </button>
      </div>

      {/* Stats mini */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: '#8892a4' },
          { label: 'Nouveaux', value: stats.new, color: '#0088ff' },
          { label: 'En cours', value: stats.qualified, color: '#00d4aa' },
          { label: 'Clients', value: stats.clients, color: '#34d399' },
          { label: 'Depuis YouTube', value: stats.fromYT, color: '#ff4444' },
        ].map(s => (
          <div key={s.label} style={styles.statChip}>
            <span style={{ ...styles.statVal, color: s.color }}>{s.value}</span>
            <span style={styles.statLbl}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={styles.filtersRow}>
        <input
          type="text"
          placeholder="Rechercher nom, email, ville..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />

        <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)} style={styles.select}>
          <option value="ALL">Toutes sources</option>
          {(Object.keys(SOURCE_CONFIG) as LeadSource[]).map(s => (
            <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={styles.select}>
          <option value="ALL">Tous statuts</option>
          {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={styles.select}>
          <option value="ALL">Tous types</option>
          {(Object.keys(TYPE_LABELS) as LeadType[]).map(t => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>

        <span style={styles.countBadge}>{filtered.length} résultats</span>
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Nom', 'Ville', 'Type', 'Source', 'Statut', 'Budget', 'Date', ''].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                even={i % 2 === 0}
                onSelect={() => { setSelectedLead(lead); setView('detail'); }}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={styles.emptyCell}>Aucun lead trouvé</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <LeadFormModal
          onClose={() => setShowForm(false)}
          onSave={(lead) => {
            setLeads(prev => [lead, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

// ─── LeadRow ─────────────────────────────────────────────────

function LeadRow({ lead, even, onSelect }: { lead: Lead; even: boolean; onSelect: () => void }) {
  const src = SOURCE_CONFIG[lead.source];
  const sta = STATUS_CONFIG[lead.status];

  return (
    <tr
      style={{
        ...styles.tr,
        background: even ? 'transparent' : 'rgba(30,35,48,0.4)',
      }}
    >
      <td style={styles.td}>
        <div style={styles.namePrimary}>{lead.nom}</div>
        {lead.email && <div style={styles.nameSecondary}>{lead.email}</div>}
      </td>
      <td style={styles.td}>
        <span style={styles.cityBadge}>{lead.ville ?? '—'}</span>
      </td>
      <td style={styles.td}>
        <span style={styles.typeBadge}>{TYPE_LABELS[lead.type]}</span>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.sourceBadge, color: src.color, background: src.bg }}>
          {src.label}
        </span>
      </td>
      <td style={styles.td}>
        <span style={{ ...styles.statusDot, background: sta.color + '20', color: sta.color }}>
          {sta.label}
        </span>
      </td>
      <td style={styles.td}>
        <span style={styles.budget}>
          {lead.budget ? (lead.budget / 1000).toFixed(0) + 'K DH' : '—'}
        </span>
      </td>
      <td style={styles.td}>
        <span style={styles.dateText}>
          {new Date(lead.createdAt).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })}
        </span>
      </td>
      <td style={styles.td}>
        <button style={styles.btnView} onClick={onSelect}>→</button>
      </td>
    </tr>
  );
}

// ─── LeadDetail ──────────────────────────────────────────────

function LeadDetail({ lead, onBack, onUpdate }: {
  lead: Lead;
  onBack: () => void;
  onUpdate: (l: Lead) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const src = SOURCE_CONFIG[lead.source];

  async function save() {
    const updated = { ...lead, status, notes };
    try {
      const res = await fetch(`/api/cc/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // garde update local
    }
    onUpdate(updated);
  }

  async function convertToProject() {
    alert(`Ouvrir le tunnel CITURBAREA P1 pour créer un projet lié à ${lead.nom}`);
    // Naviguer vers /p1?leadId=${lead.id}
  }

  return (
    <div style={styles.root}>
      <button style={styles.backBtn} onClick={onBack}>← Retour leads</button>

      <div style={styles.detailGrid}>
        {/* Info */}
        <div style={styles.detailCard}>
          <h2 style={styles.detailName}>{lead.nom}</h2>
          <div style={{ ...styles.sourceBadge, color: src.color, background: src.bg, display: 'inline-block', marginBottom: 16 }}>
            {src.label}
          </div>

          <div style={styles.detailFields}>
            {[
              ['Email', lead.email ?? '—'],
              ['Téléphone', lead.telephone ?? '—'],
              ['Ville', lead.ville ?? '—'],
              ['Type client', TYPE_LABELS[lead.type]],
              ['Intérêt', lead.interet ?? '—'],
              ['Budget estimé', lead.budget ? (lead.budget / 1000).toFixed(0) + 'K DH' : '—'],
              ['Date', new Date(lead.createdAt).toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })],
            ].map(([k, v]) => (
              <div key={k} style={styles.detailField}>
                <span style={styles.detailKey}>{k}</span>
                <span style={styles.detailVal}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={styles.detailCard}>
          <h3 style={styles.cardTitle}>Statut pipeline</h3>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as LeadStatus)}
            style={{ ...styles.select, width: '100%', marginBottom: 16 }}
          >
            {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>

          <h3 style={styles.cardTitle}>Notes</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes sur ce lead..."
            rows={4}
            style={styles.textarea}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={styles.btnPrimary} onClick={save}>Enregistrer</button>
            {status !== 'CLIENT' && (
              <button
                style={{ ...styles.btnPrimary, background: '#1a2a1a', color: '#34d399', border: '1px solid #34d39940' }}
                onClick={convertToProject}
              >
                ⬡ Convertir → Projet
              </button>
            )}
          </div>

          {lead.citProjectId && (
            <div style={styles.projectLink}>
              <span style={{ color: '#34d399' }}>⬡</span>
              <span>Projet CITURBAREA lié: <code style={{ color: '#00d4aa' }}>{lead.citProjectId}</code></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LeadFormModal ───────────────────────────────────────────

function LeadFormModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    nom: '', email: '', telephone: '', ville: '',
    type: 'PARTICULIER' as LeadType,
    source: 'YOUTUBE' as LeadSource,
    interet: '', budget: '',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    const payload = {
      ...form,
      budget: form.budget ? parseFloat(form.budget) : undefined,
    };

    try {
      const res = await fetch('/api/cc/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data);
        return;
      }
    } catch {}

    // Fallback local
    onSave({
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'NEW',
      ...payload,
      budget: payload.budget,
    } as Lead);
  }

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nouveau lead</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.formGrid}>
          {[
            { k: 'nom', label: 'Nom complet *', type: 'text', placeholder: 'Karim Benali' },
            { k: 'email', label: 'Email', type: 'email', placeholder: 'karim@gmail.com' },
            { k: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '+212661234567' },
            { k: 'ville', label: 'Ville', type: 'text', placeholder: 'Kénitra' },
            { k: 'budget', label: 'Budget estimé (DH)', type: 'number', placeholder: '800000' },
          ].map(f => (
            <div key={f.k} style={styles.formField}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                value={(form as any)[f.k]}
                onChange={set(f.k)}
                placeholder={f.placeholder}
                style={styles.input}
              />
            </div>
          ))}

          <div style={styles.formField}>
            <label style={styles.label}>Source *</label>
            <select value={form.source} onChange={set('source')} style={styles.select}>
              {(Object.keys(SOURCE_CONFIG) as LeadSource[]).map(s => (
                <option key={s} value={s}>{SOURCE_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <div style={styles.formField}>
            <label style={styles.label}>Type client *</label>
            <select value={form.type} onChange={set('type')} style={styles.select}>
              {(Object.keys(TYPE_LABELS) as LeadType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.formField, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Intérêt / Projet</label>
            <textarea
              value={form.interet}
              onChange={set('interet')}
              placeholder="Construction villa 200m², terrain Bir Rami..."
              rows={3}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button
            style={{ ...styles.btnPrimary, opacity: !form.nom ? 0.5 : 1 }}
            onClick={submit}
            disabled={!form.nom}
          >
            Créer le lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 16 },
  moduleHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  moduleTitle: { margin: 0, fontSize: 20, fontWeight: 700, color: '#e8eaf0', letterSpacing: '-0.02em', fontFamily: "'DM Mono', monospace" },
  moduleSubtitle: { margin: '4px 0 0', fontSize: 12, color: '#4a5568' },
  backBtn: { background: 'transparent', border: '1px solid #1e2330', color: '#8892a4', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, marginBottom: 8 },

  statsRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  statChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px', background: '#0d1017', border: '1px solid #1e2330', borderRadius: 8, minWidth: 80 },
  statVal: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: "'DM Mono', monospace" },
  statLbl: { fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 },

  filtersRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  searchInput: { flex: 1, minWidth: 200, background: '#0d1017', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, outline: 'none' },
  select: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 6, color: '#8892a4', padding: '8px 10px', fontFamily: 'inherit', fontSize: 11, outline: 'none', cursor: 'pointer' },
  countBadge: { fontSize: 11, color: '#4a5568', padding: '6px 10px', border: '1px solid #1e2330', borderRadius: 4 },

  tableWrap: { overflowX: 'auto', border: '1px solid #1e2330', borderRadius: 10, background: '#0d1017' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '10px 14px', textAlign: 'left', color: '#4a5568', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10, borderBottom: '1px solid #1e2330', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  tr: { cursor: 'default', transition: 'background 0.1s' },
  td: { padding: '10px 14px', verticalAlign: 'middle', borderBottom: '1px solid #1a1f2e' },
  emptyCell: { padding: 24, textAlign: 'center', color: '#2d3748' },

  namePrimary: { color: '#e8eaf0', fontWeight: 600, lineHeight: 1.3 },
  nameSecondary: { color: '#4a5568', fontSize: 10, marginTop: 2 },
  cityBadge: { color: '#8892a4' },
  typeBadge: { color: '#8892a4', fontSize: 11 },
  sourceBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  statusDot: { display: 'inline-block', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  budget: { color: '#00d4aa', fontWeight: 600, fontFamily: "'DM Mono', monospace" },
  dateText: { color: '#4a5568', fontSize: 11 },
  btnView: { background: 'transparent', border: '1px solid #1e2330', color: '#4a5568', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 },

  // Detail
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  detailCard: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 10, padding: 20 },
  detailName: { margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#e8eaf0' },
  detailFields: { display: 'flex', flexDirection: 'column', gap: 10 },
  detailField: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1a1f2e', paddingBottom: 8 },
  detailKey: { color: '#4a5568', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' },
  detailVal: { color: '#8892a4', fontSize: 12, textAlign: 'right', maxWidth: '60%' },
  cardTitle: { margin: '0 0 8px', fontSize: 11, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  projectLink: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, padding: '8px 12px', background: '#0a1f12', border: '1px solid #34d39920', borderRadius: 6, fontSize: 11, color: '#8892a4' },

  // Form modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#0d1017', border: '1px solid #1e2330', borderRadius: 12, width: 600, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #1e2330' },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: '#e8eaf0' },
  closeBtn: { background: 'transparent', border: 'none', color: '#4a5568', fontSize: 18, cursor: 'pointer' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 24 },
  formField: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 },
  input: { background: '#131820', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, outline: 'none' },
  textarea: { background: '#131820', border: '1px solid #1e2330', borderRadius: 6, color: '#e8eaf0', padding: '8px 12px', fontFamily: 'inherit', fontSize: 12, outline: 'none', resize: 'vertical' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #1e2330' },

  // Buttons
  btnPrimary: { background: '#00d4aa', color: '#0a0c10', border: 'none', borderRadius: 6, padding: '8px 16px', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em' },
  btnSecondary: { background: 'transparent', color: '#8892a4', border: '1px solid #1e2330', borderRadius: 6, padding: '8px 16px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' },
};
