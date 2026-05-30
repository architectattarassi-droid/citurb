/**
 * LeadsModule.tsx
 * Module Leads — pipeline de qualification CITURBAREA
 *
 * Backend: GET/POST/PATCH /api/cc/leads (extractLeadView from Dossier.payload.leadQualif)
 *
 * Features:
 * - Table avec filtres (porteType P1..P6, status, recherche)
 * - Drawer détail avec changeur de statut + ajout note (timeline)
 * - Bouton "Ouvrir vue dossier" → /cc/dossiers/:id/shadow
 * - Bouton "+ Nouveau dossier" → modal création manuelle (admin)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase, getToken } from "../../../tomes/tome4/apiClient";
import { useIsMobile, BottomSheet } from "../../../components/mobile";

// ─── Types alignés sur backend cc.controller.ts ──────────────

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "WON"
  | "LOST"
  | "SPAM"
  // Stages provenant de LeadFunnelService (capture front public)
  | "WIZARD_STARTED"
  | "DOSSIER_OPENED"
  | "PAID"
  | "ARCHIVED";
export type PorteType = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export interface LeadNote {
  ts: string;
  author: string;
  text: string;
  status?: LeadStatus;
}

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  nom: string;
  ville: string;
  type: PorteType;
  source: string;
  status: LeadStatus;
  dossierStatus?: string;
  interet?: string;
  gestionMode?: string;
  email?: string;
  tel?: string;
  raisonSociale?: string;
  notesCount: number;
  lastContactAt?: string;
  lastNote?: LeadNote | null;
  notes: LeadNote[];
  brief?: any;
}

// ─── Config UI ───────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  NEW:             { label: "Nouveau",         color: "#0088ff", bg: "rgba(0,136,255,0.15)" },
  CONTACTED:       { label: "Contacté",        color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  QUALIFIED:       { label: "Qualifié",        color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  WIZARD_STARTED:  { label: "Wizard démarré",  color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
  DOSSIER_OPENED:  { label: "Dossier ouvert",  color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
  PAID:            { label: "Payé",            color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  WON:             { label: "Gagné ✓",         color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  LOST:            { label: "Perdu",           color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  ARCHIVED:        { label: "Archivé",         color: "#475569", bg: "rgba(71,85,105,0.15)" },
  SPAM:            { label: "Spam",            color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

const PORTE_CONFIG: Record<PorteType, { label: string; color: string }> = {
  P1: { label: "P1 — Particulier",  color: "#3b82f6" },
  P2: { label: "P2 — Pro/BET",      color: "#8b5cf6" },
  P3: { label: "P3 — Promoteur",    color: "#06b6d4" },
  P4: { label: "P4 — Institutionnel", color: "#f59e0b" },
  P5: { label: "P5 — MRE/Diaspora", color: "#10b981" },
  P6: { label: "P6 — Prestataire",  color: "#ef4444" },
};

// ─── Module principal ────────────────────────────────────────

export default function LeadsModule() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterPorte, setFilterPorte] = useState<PorteType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase()}/api/cc/leads`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (filterPorte !== "ALL" && l.type !== filterPorte) return false;
    if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [l.nom, l.email, l.tel, l.ville, l.interet, l.raisonSociale].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === "NEW").length,
    contacted: leads.filter(l => l.status === "CONTACTED").length,
    qualified: leads.filter(l => l.status === "QUALIFIED").length,
    won: leads.filter(l => l.status === "WON").length,
  };

  const selected = leads.find(l => l.id === selectedId) ?? null;

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>◉ Leads</h1>
          <p style={S.subtitle}>Pipeline de qualification — {stats.total} prospect{stats.total > 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btnSecondary} onClick={fetchLeads} disabled={loading}>
            {loading ? "..." : "↻ Refresh"}
          </button>
          <button style={S.btnPrimary} onClick={() => setShowCreateModal(true)}>
            + Nouveau dossier
          </button>
        </div>
      </div>

      <div style={S.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#8892a4" },
          { label: "Nouveau", value: stats.new, color: STATUS_CONFIG.NEW.color },
          { label: "Contacté", value: stats.contacted, color: STATUS_CONFIG.CONTACTED.color },
          { label: "Qualifié", value: stats.qualified, color: STATUS_CONFIG.QUALIFIED.color },
          { label: "Gagné", value: stats.won, color: STATUS_CONFIG.WON.color },
        ].map(s => (
          <div key={s.label} style={S.statChip}>
            <span style={{ ...S.statVal, color: s.color }}>{s.value}</span>
            <span style={S.statLbl}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={S.filtersRow}>
        <input
          type="text"
          placeholder="Rechercher nom, email, tél, ville…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={S.search}
        />
        <select value={filterPorte} onChange={e => setFilterPorte(e.target.value as any)} style={S.select}>
          <option value="ALL">Toutes portes</option>
          {(Object.keys(PORTE_CONFIG) as PorteType[]).map(p => (
            <option key={p} value={p}>{PORTE_CONFIG[p].label}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} style={S.select}>
          <option value="ALL">Tous statuts</option>
          {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <span style={S.countBadge}>{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {error && <div style={S.errorBanner}>⚠ {error}</div>}

      {isMobile ? (
        /* ── Mobile : stack de cards verticales — le tableau 8 colonnes déborde sur 360px ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(l => <LeadCardMobile key={l.id} lead={l} onSelect={() => setSelectedId(l.id)} />)}
          {!loading && filtered.length === 0 && (
            <div style={S.emptyCell}>Aucun lead</div>
          )}
          {loading && filtered.length === 0 && (
            <div style={S.emptyCell}>Chargement…</div>
          )}
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Nom", "Porte", "Ville", "Contact", "Statut", "Notes", "Date", ""].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <LeadRow key={l.id} lead={l} even={i % 2 === 0} onSelect={() => setSelectedId(l.id)} />
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} style={S.emptyCell}>Aucun lead</td></tr>
              )}
              {loading && (
                <tr><td colSpan={8} style={S.emptyCell}>Chargement…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <LeadDrawer
          lead={selected}
          isMobile={isMobile}
          onClose={() => setSelectedId(null)}
          onUpdated={(l) => setLeads(prev => prev.map(x => x.id === l.id ? { ...x, ...l } : x))}
          onOpenShadow={() => navigate(`/cc/dossiers/${selected.id}/shadow`)}
        />
      )}

      {showCreateModal && (
        <CreateDossierModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(l) => {
            setLeads(prev => [l, ...prev]);
            setShowCreateModal(false);
            setSelectedId(l.id);
          }}
        />
      )}
    </div>
  );
}

// ─── LeadRow ─────────────────────────────────────────────────

function LeadRow({ lead, even, onSelect }: { lead: Lead; even: boolean; onSelect: () => void }) {
  const sta = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.NEW;
  const porte = PORTE_CONFIG[lead.type] ?? PORTE_CONFIG.P1;
  return (
    <tr style={{ ...S.tr, background: even ? "transparent" : "rgba(30,35,48,0.3)" }} onClick={onSelect}>
      <td style={S.td}>
        <div style={S.namePrimary}>{lead.nom}</div>
        {lead.raisonSociale && <div style={S.nameSecondary}>{lead.raisonSociale}</div>}
        {lead.interet && <div style={{ ...S.nameSecondary, color: "#6b7280", fontStyle: "italic", marginTop: 2 }}>{truncate(lead.interet, 60)}</div>}
      </td>
      <td style={S.td}>
        <span style={{ ...S.porteBadge, color: porte.color, borderColor: porte.color + "40" }}>
          {lead.type}
        </span>
        {lead.gestionMode && <div style={{ ...S.nameSecondary, marginTop: 2 }}>{lead.gestionMode}</div>}
      </td>
      <td style={S.td}><span style={{ color: "#8892a4" }}>{lead.ville}</span></td>
      <td style={S.td}>
        {lead.email && <div style={{ color: "#9ca3af", fontSize: 11 }}>{lead.email}</div>}
        {lead.tel && <div style={{ color: "#6b7280", fontSize: 11 }}>{lead.tel}</div>}
      </td>
      <td style={S.td}>
        <span style={{ ...S.statusBadge, color: sta.color, background: sta.bg }}>{sta.label}</span>
      </td>
      <td style={S.td}>
        <span style={{ color: lead.notesCount > 0 ? "#a855f7" : "#4a5568", fontWeight: 600 }}>
          {lead.notesCount}
        </span>
        {lead.lastContactAt && (
          <div style={{ ...S.nameSecondary, color: "#6b7280" }}>
            {timeSince(lead.lastContactAt)}
          </div>
        )}
      </td>
      <td style={S.td}><span style={S.dateText}>{fmtDate(lead.createdAt)}</span></td>
      <td style={S.td}><button style={S.btnView}>→</button></td>
    </tr>
  );
}

// ─── LeadCardMobile — variante mobile en card verticale ──────

function LeadCardMobile({ lead, onSelect }: { lead: Lead; onSelect: () => void }) {
  const sta = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.NEW;
  const porte = PORTE_CONFIG[lead.type] ?? PORTE_CONFIG.P1;
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      style={{ background: "#0d1017", border: "1px solid #1e2330", borderRadius: 10, padding: 14, cursor: "pointer", minHeight: 44 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e8eaf0", lineHeight: 1.3 }}>{lead.nom}</div>
          {lead.raisonSociale && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{lead.raisonSociale}</div>}
        </div>
        <span style={{ ...S.statusBadge, color: sta.color, background: sta.bg, fontSize: 12, whiteSpace: "nowrap" }}>{sta.label}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12.5, color: "#9ca3af" }}>
        <span style={{ ...S.porteBadge, color: porte.color, borderColor: porte.color + "40", fontSize: 11 }}>{lead.type}</span>
        {lead.ville && <span>📍 {lead.ville}</span>}
        {lead.tel && <span>📞 {lead.tel}</span>}
      </div>
      {lead.interet && <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 8, fontStyle: "italic" }}>{truncate(lead.interet, 100)}</div>}
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>
        {lead.notesCount > 0 && <>📝 {lead.notesCount} note(s) · </>}
        {fmtDate(lead.createdAt)}
      </div>
    </div>
  );
}

// ─── LeadDrawer (détail latéral — BottomSheet sur mobile) ───

function LeadDrawer({ lead, onClose, onUpdated, onOpenShadow, isMobile }: {
  lead: Lead;
  onClose: () => void;
  onUpdated: (l: Lead) => void;
  onOpenShadow: () => void;
  isMobile?: boolean;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function commit() {
    if (!note.trim() && status === lead.status) {
      setErr("Change le statut ou ajoute une note");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${apiBase()}/api/cc/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
        body: JSON.stringify({
          status: status !== lead.status ? status : undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const newQualif = data.leadQualif ?? {};
      onUpdated({
        ...lead,
        status: newQualif.status ?? status,
        notes: newQualif.notes ?? lead.notes,
        notesCount: (newQualif.notes ?? lead.notes ?? []).length,
        lastContactAt: newQualif.lastContactAt ?? lead.lastContactAt,
        lastNote: newQualif.notes?.length ? newQualif.notes[newQualif.notes.length - 1] : lead.lastNote,
      });
      setNote("");
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const sta = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.NEW;
  const porte = PORTE_CONFIG[lead.type] ?? PORTE_CONFIG.P1;

  // ── Contenu factorisé du drawer (réutilisé desktop et mobile) ──
  const drawerBody = (
    <div style={{ background: isMobile ? "transparent" : "#0d1017", color: "#e8eaf0", padding: isMobile ? 0 : 24, overflowY: "auto", flex: 1 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: isMobile ? "#0f172a" : "#e8eaf0" }}>{lead.nom}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
          <span style={{ ...S.porteBadge, color: porte.color, borderColor: porte.color + "40" }}>{lead.type}</span>
          <span style={{ ...S.statusBadge, color: sta.color, background: sta.bg }}>{sta.label}</span>
          {lead.dossierStatus && <span style={{ ...S.porteBadge, color: "#6b7280", borderColor: "#1e2330" }}>Dossier: {lead.dossierStatus}</span>}
        </div>
      </div>

      <Section title="Identité">
        <Field k="Téléphone" v={lead.tel} />
        <Field k="Email" v={lead.email} />
        <Field k="Ville" v={lead.ville} />
        {lead.raisonSociale && <Field k="Raison sociale" v={lead.raisonSociale} />}
        {lead.gestionMode && <Field k="Mode gestion" v={lead.gestionMode} />}
        <Field k="Source" v={lead.source} />
        <Field k="Reçu" v={fmtDate(lead.createdAt) + " · " + timeSince(lead.createdAt)} />
      </Section>

      {(lead.interet || lead.brief) && (
        <Section title="Demande">
          {lead.interet && <div style={S.briefText}>{lead.interet}</div>}
          {lead.brief && <pre style={S.briefJson}>{JSON.stringify(lead.brief, null, 2)}</pre>}
        </Section>
      )}

      <Section title="Qualifier">
        {err && <div style={S.errorMini}>⚠ {err}</div>}
        <label style={S.label}>Nouveau statut</label>
        <select value={status} onChange={e => setStatus(e.target.value as LeadStatus)} style={{ ...S.select, width: "100%", marginBottom: 12, minHeight: isMobile ? 44 : undefined, fontSize: isMobile ? 14 : 11 }}>
          {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <label style={S.label}>Note (timeline horodatée)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Ex: Appelé, RDV fixé jeudi 15h, intéressé par pack ESSENTIEL…"
          rows={3}
          style={{ ...S.textarea, minHeight: isMobile ? 88 : undefined, fontSize: isMobile ? 14 : 13 }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <button style={{ ...S.btnPrimary, minHeight: 44, fontSize: 14 }} onClick={commit} disabled={busy}>
            {busy ? "…" : "Enregistrer"}
          </button>
          <button style={{ ...S.btnGhost, minHeight: 44, fontSize: 14 }} onClick={onOpenShadow}>👁️ Vue dossier</button>
        </div>
      </Section>

      <Section title={`Historique (${lead.notes.length})`}>
        {lead.notes.length === 0 && <div style={S.emptyMini}>Aucune note pour le moment</div>}
        {[...lead.notes].reverse().map((n, i) => (
          <div key={i} style={S.noteItem}>
            <div style={S.noteHead}>
              <span style={{ color: "#a78bfa", fontWeight: 600 }}>{n.author}</span>
              <span style={{ color: "#6b7280", fontSize: 10 }}>{fmtDateTime(n.ts)}</span>
              {n.status && <span style={{ ...S.statusBadge, color: STATUS_CONFIG[n.status]?.color, background: STATUS_CONFIG[n.status]?.bg, fontSize: 9 }}>→ {STATUS_CONFIG[n.status]?.label}</span>}
            </div>
            <div style={S.noteText}>{n.text}</div>
          </div>
        ))}
      </Section>
    </div>
  );

  // ── Mobile : BottomSheet full-height ──
  if (isMobile) {
    return (
      <BottomSheet open onClose={onClose} snap="full" title={lead.nom}>
        {drawerBody}
      </BottomSheet>
    );
  }

  // ── Desktop : drawer latéral classique ──
  return (
    <div style={S.drawerOverlay} onClick={onClose}>
      <div style={S.drawer} onClick={e => e.stopPropagation()}>
        <div style={S.drawerHeader}>
          <div>
            <div style={S.drawerName}>{lead.nom}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <span style={{ ...S.porteBadge, color: porte.color, borderColor: porte.color + "40" }}>{lead.type}</span>
              <span style={{ ...S.statusBadge, color: sta.color, background: sta.bg }}>{sta.label}</span>
              {lead.dossierStatus && <span style={{ ...S.porteBadge, color: "#6b7280", borderColor: "#1e2330" }}>Dossier: {lead.dossierStatus}</span>}
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        {drawerBody}
      </div>
    </div>
  );
}

// ─── CreateDossierModal (admin manuel) ───────────────────────

function CreateDossierModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (l: Lead) => void;
}) {
  const [form, setForm] = useState({
    porteType: "P1" as PorteType,
    gestionMode: "AUTONOME" as "AUTONOME" | "DELEGUE",
    title: "",
    commune: "",
    clientNom: "",
    clientEmail: "",
    clientTel: "",
    raisonSociale: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value as any }));

  async function submit() {
    if (!form.clientNom.trim()) { setErr("Nom client requis"); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${apiBase()}/api/cc/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onCreated(data);
    } catch (e: any) {
      setErr(e.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>Nouveau dossier (admin)</h2>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {err && <div style={S.errorMini}>⚠ {err}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Porte</label>
              <select value={form.porteType} onChange={set("porteType")} style={{ ...S.select, width: "100%" }}>
                {(Object.keys(PORTE_CONFIG) as PorteType[]).map(p => (
                  <option key={p} value={p}>{PORTE_CONFIG[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Mode</label>
              <select value={form.gestionMode} onChange={set("gestionMode")} style={{ ...S.select, width: "100%" }}>
                <option value="AUTONOME">Autonome</option>
                <option value="DELEGUE">Délégué</option>
              </select>
            </div>
          </div>

          <Field2 label="Titre dossier" v={form.title} onChange={set("title")} placeholder="Ex: Villa Bir Rami R+2" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field2 label="Nom client *" v={form.clientNom} onChange={set("clientNom")} placeholder="Karim Benali" />
            <Field2 label="Téléphone" v={form.clientTel} onChange={set("clientTel")} placeholder="+212661234567" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field2 label="Email" v={form.clientEmail} onChange={set("clientEmail")} placeholder="email@exemple.ma" />
            <Field2 label="Commune" v={form.commune} onChange={set("commune")} placeholder="Kénitra" />
          </div>
          <Field2 label="Raison sociale (si pro)" v={form.raisonSociale} onChange={set("raisonSociale")} placeholder="—" />
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: busy || !form.clientNom ? 0.5 : 1 }} onClick={submit} disabled={busy || !form.clientNom}>
            {busy ? "…" : "Créer le dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={S.sectionTitle}>{title}</div>
      <div style={S.sectionBody}>{children}</div>
    </div>
  );
}

function Field({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div style={S.fieldRow}>
      <span style={S.fieldKey}>{k}</span>
      <span style={S.fieldVal}>{v}</span>
    </div>
  );
}

function Field2({ label, v, onChange, placeholder }: {
  label: string; v: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input value={v} onChange={onChange} placeholder={placeholder} style={S.input} />
    </div>
  );
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("fr-MA", { day: "numeric", month: "short" }); } catch { return s; }
}
function fmtDateTime(s: string) {
  try { return new Date(s).toLocaleString("fr-MA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return s; }
}
function timeSince(s: string) {
  try {
    const ms = Date.now() - new Date(s).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    return `il y a ${d} j`;
  } catch { return ""; }
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ─── Styles ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", gap: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: "#e8eaf0", letterSpacing: "-0.02em", fontFamily: "'DM Mono', monospace" },
  subtitle: { margin: "4px 0 0", fontSize: 12, color: "#4a5568" },

  statsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  statChip: { display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 16px", background: "#0d1017", border: "1px solid #1e2330", borderRadius: 8, minWidth: 80 },
  statVal: { fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace" },
  statLbl: { fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 },

  filtersRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  search: { flex: 1, minWidth: 200, background: "#0d1017", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "8px 12px", fontFamily: "inherit", fontSize: 12, outline: "none" },
  select: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 6, color: "#8892a4", padding: "8px 10px", fontFamily: "inherit", fontSize: 11, outline: "none", cursor: "pointer" },
  countBadge: { fontSize: 11, color: "#4a5568", padding: "6px 10px", border: "1px solid #1e2330", borderRadius: 4 },

  errorBanner: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "10px 14px", borderRadius: 6, fontSize: 12 },

  tableWrap: { overflowX: "auto", border: "1px solid #1e2330", borderRadius: 10, background: "#0d1017" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "10px 14px", textAlign: "left", color: "#4a5568", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: 10, borderBottom: "1px solid #1e2330", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", transition: "background 0.1s" },
  td: { padding: "10px 14px", verticalAlign: "middle", borderBottom: "1px solid #1a1f2e" },
  emptyCell: { padding: 24, textAlign: "center", color: "#2d3748" },

  namePrimary: { color: "#e8eaf0", fontWeight: 600, lineHeight: 1.3 },
  nameSecondary: { color: "#4a5568", fontSize: 10, marginTop: 2 },
  porteBadge: { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, border: "1px solid", background: "transparent" },
  statusBadge: { display: "inline-block", padding: "3px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 },
  dateText: { color: "#4a5568", fontSize: 11 },
  btnView: { background: "transparent", border: "1px solid #1e2330", color: "#4a5568", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 14 },

  // Drawer
  drawerOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "flex-end" },
  drawer: { width: 540, maxWidth: "95vw", height: "100%", background: "#0d1017", borderLeft: "1px solid #1e2330", display: "flex", flexDirection: "column" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #1e2330" },
  drawerName: { fontSize: 18, fontWeight: 700, color: "#e8eaf0" },
  drawerBody: { padding: 24, overflowY: "auto", flex: 1 },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer" },

  sectionTitle: { fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 8 },
  sectionBody: { background: "#0a0f1a", border: "1px solid #1a1f2e", borderRadius: 8, padding: 14 },
  fieldRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #131820", fontSize: 12 },
  fieldKey: { color: "#6b7280" },
  fieldVal: { color: "#cbd5e1", fontWeight: 500, textAlign: "right" as const, maxWidth: "60%" },

  briefText: { color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" as const },
  briefJson: { color: "#9ca3af", fontSize: 10, marginTop: 8, background: "#020617", padding: 10, borderRadius: 4, overflowX: "auto", maxHeight: 200 },

  label: { display: "block", fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 4 },
  input: { background: "#131820", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "8px 12px", fontFamily: "inherit", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" as const },
  textarea: { background: "#131820", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "10px 12px", fontFamily: "inherit", fontSize: 13, outline: "none", resize: "vertical" as const, width: "100%", boxSizing: "border-box" as const },
  errorMini: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "6px 10px", borderRadius: 4, fontSize: 11, marginBottom: 8 },
  emptyMini: { color: "#4a5568", fontSize: 12, fontStyle: "italic" as const },

  noteItem: { padding: "10px 0", borderBottom: "1px solid #131820" },
  noteHead: { display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" as const },
  noteText: { color: "#cbd5e1", fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" as const },

  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 },
  modal: { background: "#0d1017", border: "1px solid #1e2330", borderRadius: 12, width: 600, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1e2330" },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#e8eaf0" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: "1px solid #1e2330" },

  // Buttons
  btnPrimary: { background: "#00d4aa", color: "#0a0c10", border: "none", borderRadius: 6, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" },
  btnSecondary: { background: "transparent", color: "#8892a4", border: "1px solid #1e2330", borderRadius: 6, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  btnGhost: { background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid #6d28d9", borderRadius: 6, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
};
