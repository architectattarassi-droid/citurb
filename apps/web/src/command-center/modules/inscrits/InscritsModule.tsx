/**
 * InscritsModule — Liste des inscrits Cercles dans le backoffice CC.
 *
 * Table de tous les ProProfile + filtres (métier, ville, vérifié), actions
 * "vérifier (badge bleu)" + "désactiver", recherche texte, lien profil public.
 *
 * Endpoint : GET /api/cc/inscrits (admin/owner/ops)
 */

import React, { useEffect, useMemo, useState } from "react";
import { apiBase, getToken } from "../../../tomes/tome4/apiClient";

interface Inscrit {
  id: string;
  userId: string;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  metier: string;
  cabinetName: string | null;
  cabinetStatus: string | null;
  cnoaNumero: string | null;
  yearsExperience: number | null;
  villePrincipale: string | null;
  regions: string[];
  specialites: string[];
  langues: string[];
  websiteUrl: string | null;
  linkedinUrl: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  user: {
    email: string;
    username: string | null;
    phone: string | null;
    isActive: boolean;
    role: string;
    plan: string;
    emailVerifiedAt: string | null;
    createdAt: string;
  };
}

const METIER_LABELS: Record<string, string> = {
  ARCHITECTE: "Architecte",
  BET_STRUCTURE: "BET Structure",
  BET_FLUIDES: "BET Fluides",
  BET_VRD: "BET VRD",
  TOPOGRAPHE: "Topographe",
  GEOMETRE: "Géomètre",
  CONTROLE_TECHNIQUE: "Contrôle technique",
  LABORATOIRE: "Laboratoire",
  ENTREPRISE_GO: "Entreprise GO",
  ENTREPRISE_SECOND_OEUVRE: "Second œuvre",
  FOURNISSEUR_MATERIAUX: "Fournisseur",
  PROMOTEUR: "Promoteur",
  MOA_PUBLIQUE: "MOA publique",
  MOA_PRIVEE: "MOA privée",
  ARTISAN_QUALIFIE: "Artisan",
};

export default function InscritsModule() {
  const [items, setItems] = useState<Inscrit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [metierFilter, setMetierFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<"" | "yes" | "no">("");
  const [selected, setSelected] = useState<Inscrit | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${apiBase()}/api/cc/inscrits`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Erreur chargement");
      setItems(j.data);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let out = items;
    if (metierFilter) out = out.filter(i => i.metier === metierFilter);
    if (verifiedFilter === "yes") out = out.filter(i => i.isVerified);
    if (verifiedFilter === "no") out = out.filter(i => !i.isVerified);
    if (q.trim()) {
      const needle = q.toLowerCase();
      out = out.filter(i =>
        i.displayName.toLowerCase().includes(needle) ||
        i.user.email.toLowerCase().includes(needle) ||
        (i.cabinetName || "").toLowerCase().includes(needle) ||
        (i.villePrincipale || "").toLowerCase().includes(needle) ||
        (i.cnoaNumero || "").toLowerCase().includes(needle),
      );
    }
    return out;
  }, [items, q, metierFilter, verifiedFilter]);

  const verifyToggle = async (userId: string, current: boolean) => {
    try {
      const r = await fetch(`${apiBase()}/api/cc/inscrits/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isVerified: !current }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error("Erreur");
      setItems(prev => prev.map(i =>
        i.userId === userId ? { ...i, isVerified: !current, verifiedAt: !current ? new Date().toISOString() : null } : i,
      ));
      if (selected?.userId === userId) {
        setSelected(s => s ? { ...s, isVerified: !current } : s);
      }
    } catch (e: any) {
      alert(e?.message || "Erreur");
    }
  };

  const deactivateToggle = async (userId: string, currentActive: boolean) => {
    if (currentActive && !confirm("Désactiver ce compte ? L'utilisateur ne pourra plus se connecter.")) return;
    try {
      const r = await fetch(`${apiBase()}/api/cc/inscrits/${userId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error("Erreur");
      setItems(prev => prev.map(i =>
        i.userId === userId ? { ...i, user: { ...i.user, isActive: !currentActive } } : i,
      ));
    } catch (e: any) {
      alert(e?.message || "Erreur");
    }
  };

  const stats = useMemo(() => ({
    total: items.length,
    verified: items.filter(i => i.isVerified).length,
    pending: items.filter(i => !i.isVerified).length,
    inactive: items.filter(i => !i.user.isActive).length,
  }), [items]);

  const metiersInUse = useMemo(() => {
    const set = new Set(items.map(i => i.metier));
    return Array.from(set).sort();
  }, [items]);

  return (
    <div>
      {/* Stats */}
      <div style={S.statsRow}>
        <StatCard label="Total inscrits"      value={stats.total} />
        <StatCard label="Vérifiés (badge)"    value={stats.verified} color="#6B7F5C" />
        <StatCard label="À vérifier"          value={stats.pending}  color="#B08D57" />
        <StatCard label="Comptes désactivés"  value={stats.inactive} color="#94292B" />
      </div>

      {/* Filtres */}
      <div style={S.filters}>
        <input
          placeholder="Recherche (nom, email, cabinet, ville, CNOA)…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={S.search}
        />
        <select value={metierFilter} onChange={e => setMetierFilter(e.target.value)} style={S.select}>
          <option value="">Tous métiers</option>
          {metiersInUse.map(m => <option key={m} value={m}>{METIER_LABELS[m] || m}</option>)}
        </select>
        <select value={verifiedFilter} onChange={e => setVerifiedFilter(e.target.value as any)} style={S.select}>
          <option value="">Tous statuts</option>
          <option value="yes">Vérifiés seulement</option>
          <option value="no">Non vérifiés seulement</option>
        </select>
        <button onClick={load} style={S.refreshBtn}>↻ Actualiser</button>
      </div>

      {/* Table */}
      {err && <div style={S.err}>⚠ {err}</div>}
      {loading && <div style={S.empty}>Chargement…</div>}
      {!loading && filtered.length === 0 && (
        <div style={S.empty}>Aucun inscrit ne correspond aux filtres.</div>
      )}
      {!loading && filtered.length > 0 && (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Inscrit</th>
                <th style={S.th}>Métier · Statut</th>
                <th style={S.th}>Société · CNOA</th>
                <th style={S.th}>Ville</th>
                <th style={S.th}>Contact</th>
                <th style={S.th}>Inscrit le</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id} style={{ ...S.tr, opacity: i.user.isActive ? 1 : 0.5 }}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        ...S.avatar,
                        backgroundImage: i.avatarUrl ? `url(${i.avatarUrl.startsWith("/") ? apiBase() + i.avatarUrl : i.avatarUrl})` : undefined,
                      }}>
                        {!i.avatarUrl && i.displayName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "#0F2A4A", display: "flex", alignItems: "center", gap: 6 }}>
                          {i.displayName}
                          {i.isVerified && <span title="Vérifié" style={S.verifiedBadge}>✓</span>}
                          {!i.user.isActive && <span style={S.inactiveBadge}>désactivé</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#8B91A1" }}>{i.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontWeight: 500 }}>{METIER_LABELS[i.metier] || i.metier}</div>
                    <div style={{ fontSize: 11, color: "#8B91A1" }}>{i.title || i.cabinetStatus || "—"}</div>
                  </td>
                  <td style={S.td}>
                    <div>{i.cabinetName || "—"}</div>
                    <div style={{ fontSize: 11, color: "#8B91A1" }}>
                      {i.cnoaNumero ? `CNOA ${i.cnoaNumero}` : ""}
                      {i.yearsExperience ? ` · ${i.yearsExperience} ans` : ""}
                    </div>
                  </td>
                  <td style={S.td}>{i.villePrincipale || "—"}</td>
                  <td style={S.td} title={i.user.phone || ""}>
                    <div style={{ fontSize: 12 }}>{i.phonePublic || i.user.phone || "—"}</div>
                    <div style={{ fontSize: 11, color: "#8B91A1" }}>{i.emailPublic && i.emailPublic !== i.user.email ? i.emailPublic : ""}</div>
                  </td>
                  <td style={S.td}>
                    <div style={{ fontSize: 12 }}>{new Date(i.createdAt).toLocaleDateString("fr-MA")}</div>
                    <div style={{ fontSize: 10, color: "#8B91A1" }}>
                      {new Date(i.createdAt).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button onClick={() => setSelected(i)} style={S.actionBtn}>Voir</button>
                      <button
                        onClick={() => verifyToggle(i.userId, i.isVerified)}
                        style={{ ...S.actionBtn, color: i.isVerified ? "#94292B" : "#6B7F5C" }}
                      >
                        {i.isVerified ? "Retirer ✓" : "Vérifier ✓"}
                      </button>
                      <button
                        onClick={() => deactivateToggle(i.userId, i.user.isActive)}
                        style={{ ...S.actionBtn, color: i.user.isActive ? "#94292B" : "#6B7F5C" }}
                      >
                        {i.user.isActive ? "Désactiver" : "Réactiver"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer détail */}
      {selected && (
        <div style={S.drawerBackdrop} onClick={() => setSelected(null)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <div style={S.drawerHeader}>
              <div>
                <div style={{ fontSize: 10, color: "#B08D57", letterSpacing: "0.2em", fontWeight: 600 }}>FICHE INSCRIT</div>
                <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 600, color: "#0F2A4A", marginTop: 4 }}>{selected.displayName}</div>
                <div style={{ fontSize: 13, color: "#8B91A1" }}>{selected.user.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={S.closeBtn}>✕</button>
            </div>

            <div style={S.drawerBody}>
              <Section title="Métier & exercice">
                <Row k="Métier" v={METIER_LABELS[selected.metier] || selected.metier} />
                <Row k="Statut" v={selected.cabinetStatus || "—"} />
                <Row k="Cabinet/société" v={selected.cabinetName || "—"} />
                <Row k="N° CNOA" v={selected.cnoaNumero || "—"} />
                <Row k="Expérience" v={selected.yearsExperience ? `${selected.yearsExperience} ans` : "—"} />
              </Section>

              <Section title="Localisation">
                <Row k="Ville principale" v={selected.villePrincipale || "—"} />
                <Row k="Régions" v={selected.regions.length ? selected.regions.join(", ") : "—"} />
              </Section>

              <Section title="Spécialités & langues">
                <Row k="Spécialités" v={selected.specialites.length ? selected.specialites.join(", ") : "—"} />
                <Row k="Langues" v={selected.langues.length ? selected.langues.join(", ") : "—"} />
              </Section>

              <Section title="Contact public">
                <Row k="Téléphone privé" v={selected.user.phone || "—"} />
                <Row k="Téléphone public" v={selected.phonePublic || "—"} />
                <Row k="Email public" v={selected.emailPublic || "—"} />
                <Row k="Site web" v={selected.websiteUrl ? <a href={selected.websiteUrl} target="_blank" rel="noopener noreferrer">{selected.websiteUrl}</a> : "—"} />
                <Row k="LinkedIn" v={selected.linkedinUrl ? <a href={selected.linkedinUrl} target="_blank" rel="noopener noreferrer">{selected.linkedinUrl}</a> : "—"} />
              </Section>

              <Section title="Statut compte">
                <Row k="Rôle" v={selected.user.role} />
                <Row k="Plan" v={selected.user.plan} />
                <Row k="Compte actif" v={selected.user.isActive ? "Oui" : "Non"} />
                <Row k="Email vérifié" v={selected.user.emailVerifiedAt ? new Date(selected.user.emailVerifiedAt).toLocaleString("fr-MA") : "Non"} />
                <Row k="Badge vérifié" v={selected.isVerified ? `Oui (${selected.verifiedAt ? new Date(selected.verifiedAt).toLocaleDateString("fr-MA") : ""})` : "Non"} />
                <Row k="Inscrit le" v={new Date(selected.createdAt).toLocaleString("fr-MA")} />
              </Section>

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <a href={`/cercles/profile/${selected.userId}`} target="_blank" rel="noopener noreferrer" style={S.primaryAction}>
                  Ouvrir le profil public →
                </a>
                <button
                  onClick={() => verifyToggle(selected.userId, selected.isVerified)}
                  style={{ ...S.primaryAction, background: selected.isVerified ? "#94292B" : "#6B7F5C" }}
                >
                  {selected.isVerified ? "Retirer badge ✓" : "Apposer badge ✓"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "#0F2A4A" }: { label: string; value: number; color?: string }) {
  return (
    <div style={S.statCard}>
      <div style={{ fontSize: 11, color: "#8B91A1", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "Playfair Display, serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, color: "#B08D57", letterSpacing: "0.18em", fontWeight: 600, textTransform: "uppercase", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #E8E2D5" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, gap: 10 }}>
      <span style={{ color: "#8B91A1" }}>{k}</span>
      <span style={{ color: "#1A1F2E", textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 },
  statCard: { background: "#FFFFFF", border: "1px solid #E8E2D5", padding: "16px 18px", borderRadius: 8 },
  filters: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  search: { flex: 1, minWidth: 240, padding: "10px 14px", border: "1px solid #E8E2D5", borderRadius: 6, fontSize: 13, fontFamily: "inherit", outline: "none", background: "#FFFFFF" },
  select: { padding: "10px 12px", border: "1px solid #E8E2D5", borderRadius: 6, fontSize: 13, background: "#FFFFFF", fontFamily: "inherit", cursor: "pointer" },
  refreshBtn: { padding: "10px 14px", border: "1px solid #E8E2D5", borderRadius: 6, background: "#FFFFFF", color: "#5C6373", cursor: "pointer", fontSize: 12, fontFamily: "inherit" },
  err: { background: "#F2DEDE", color: "#94292B", padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 },
  empty: { background: "#FFFFFF", border: "1px solid #E8E2D5", padding: 40, borderRadius: 8, textAlign: "center", color: "#8B91A1", fontStyle: "italic", fontSize: 14 },
  tableWrap: { background: "#FFFFFF", border: "1px solid #E8E2D5", borderRadius: 8, overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" },
  th: { background: "#F2EDE3", padding: "12px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#5C6373", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #E8E2D5" },
  tr: { borderBottom: "1px solid #F0EBE0" },
  td: { padding: "12px 14px", fontSize: 13, color: "#1A1F2E", verticalAlign: "top" },
  avatar: { width: 36, height: 36, borderRadius: "50%", background: "#E5D4B5", color: "#0F2A4A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: 14, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 },
  verifiedBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#6B7F5C", color: "white", fontSize: 10, fontWeight: 700 },
  inactiveBadge: { fontSize: 9, padding: "2px 6px", background: "#F2DEDE", color: "#94292B", borderRadius: 3, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 },
  actionBtn: { padding: "5px 9px", border: "1px solid #E8E2D5", borderRadius: 4, background: "#FFFFFF", cursor: "pointer", fontSize: 11, fontFamily: "inherit", color: "#0F2A4A", letterSpacing: "0.01em" },

  drawerBackdrop: { position: "fixed", inset: 0, background: "rgba(15,42,74,0.45)", display: "flex", justifyContent: "flex-end", zIndex: 50 },
  drawer: { width: "min(540px, 95vw)", background: "#FAF7F2", height: "100%", overflowY: "auto", boxShadow: "-4px 0 20px rgba(0,0,0,0.15)" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #E8E2D5", background: "#FFFFFF" },
  closeBtn: { border: "none", background: "transparent", fontSize: 20, color: "#8B91A1", cursor: "pointer" },
  drawerBody: { padding: "20px 24px 32px" },
  primaryAction: { background: "#0F2A4A", color: "#FAF7F2", padding: "10px 16px", borderRadius: 5, textDecoration: "none", fontSize: 13, fontWeight: 600, border: 0, cursor: "pointer", fontFamily: "inherit", flex: 1, textAlign: "center" },
};
