import { useEffect, useState, useCallback } from "react";
import { apiBase, apiFetch, getToken } from "../../../tome4/apiClient";

/**
 * P6Dashboard — Tableau de bord prestataire/fournisseur
 *
 * Pour les FOURNISSEURS_MATERIAUX: gestion du catalogue (ajout/edit/désact items)
 * Pour les PRESTATAIRES_SERVICE: vue de leurs dossiers attribués (à venir)
 *
 * Pré-requis: user connecté + dossier P6 owned par lui.
 */

type CatalogCategory =
  | "CIMENT_BETON" | "AGGLOMERES" | "ACIER" | "BOIS" | "ETANCHEITE" | "ISOLATION"
  | "PLOMBERIE" | "ELECTRICITE" | "CARRELAGE" | "REVETEMENT_SOL" | "PEINTURE"
  | "MENUISERIE_ALU" | "MENUISERIE_BOIS" | "QUINCAILLERIE" | "CHAUFFAGE_CLIM" | "AUTRE";

type CatalogUnit = "M3" | "M2" | "ML" | "T" | "KG" | "SAC" | "UNITE" | "PALETTE";

type CatalogItem = {
  id: string;
  materialName: string;
  materialCode?: string;
  categorie: CatalogCategory;
  unite: CatalogUnit;
  prixFournitureDH: number;
  prixMainOeuvreDH?: number;
  prixLivraisonDH: number;
  livraisonIncluse: boolean;
  minLivraisonDH?: number;
  delaiLivraisonHeures?: number;
  quantiteDisponibleMax?: number;
  zonesFourniture: string[];
  description?: string;
  certifications?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
};

const CATEGORIES: { code: CatalogCategory; label: string }[] = [
  { code: "CIMENT_BETON", label: "Ciment / Béton" },
  { code: "AGGLOMERES", label: "Agglos / Briques" },
  { code: "ACIER", label: "Acier / Fer" },
  { code: "BOIS", label: "Bois" },
  { code: "ETANCHEITE", label: "Étanchéité" },
  { code: "ISOLATION", label: "Isolation" },
  { code: "PLOMBERIE", label: "Plomberie" },
  { code: "ELECTRICITE", label: "Électricité" },
  { code: "CARRELAGE", label: "Carrelage" },
  { code: "REVETEMENT_SOL", label: "Revêtement sol" },
  { code: "PEINTURE", label: "Peinture" },
  { code: "MENUISERIE_ALU", label: "Menuiserie alu" },
  { code: "MENUISERIE_BOIS", label: "Menuiserie bois" },
  { code: "QUINCAILLERIE", label: "Quincaillerie" },
  { code: "CHAUFFAGE_CLIM", label: "Chauffage / Clim" },
  { code: "AUTRE", label: "Autre" },
];
const UNITES: CatalogUnit[] = ["M3", "M2", "ML", "T", "KG", "SAC", "UNITE", "PALETTE"];

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif", padding: "32px 24px 60px", maxWidth: 1100, margin: "0 auto" },
  hero: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1e2330" },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 4 },
  sub: { color: "#6b7280", fontSize: 13 },
  pill: { display: "inline-block", padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, marginLeft: 8 },
  btnPrimary: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost: { background: "transparent", color: "#9ca3af", border: "1px solid #334155", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" },
  err: { color: "#fca5a5", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "10px 14px", borderRadius: 6, border: "1px solid #ef444440" },
  empty: { color: "#6b7280", padding: 48, textAlign: "center" as const, fontSize: 14, background: "#0d1217", borderRadius: 10, border: "1px dashed #1e2330" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12, background: "#0d1217", border: "1px solid #1e2330", borderRadius: 10, overflow: "hidden" },
  th: { padding: "12px 14px", textAlign: "left" as const, color: "#4a5568", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontSize: 10, borderBottom: "1px solid #1e2330", background: "#0a0f1a" },
  td: { padding: "12px 14px", borderBottom: "1px solid #1a1f2e", verticalAlign: "middle" as const },
  modalBg: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 12, width: 640, maxWidth: "95vw", maxHeight: "92vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: "1px solid #1e2330" },
  modalBody: { padding: "20px 22px" },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 22px", borderTop: "1px solid #1e2330" },
  label: { display: "block", fontSize: 10, color: "#9ca3af", textTransform: "uppercase" as const, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box" as const, marginBottom: 12 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
};

export default function P6Dashboard() {
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierInfo, setSupplierInfo] = useState<any>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // 1. Trouver le dossier P6 du user connecté
  useEffect(() => {
    if (!getToken()) {
      setError("Vous devez être connecté pour accéder au tableau de bord prestataire.");
      setLoading(false);
      return;
    }
    apiFetch<any>("/p2/dossier/ops/all").then(r => {
      const list: any[] = Array.isArray(r) ? r : (r?.items ?? []);
      const p6 = list.find(d => d.porteType === "P6");
      if (p6) setSupplierId(p6.id);
      else {
        setError("Aucune fiche prestataire P6 trouvée pour votre compte. Soumettez le formulaire P6 d'abord.");
        setLoading(false);
      }
    }).catch((e: any) => {
      setError(e?.message || "Erreur chargement");
      setLoading(false);
    });
  }, []);

  // 2. Charger le catalogue
  const load = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const r: any = await apiFetch(`/p6/suppliers/${supplierId}/catalog/manage`);
      setSupplierInfo(r.supplier);
      setItems(r.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement catalogue");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (input: any) => {
    if (!supplierId) return;
    try {
      if (editingItem) {
        await apiFetch(`/p6/suppliers/${supplierId}/catalog/${editingItem.id}`, { method: "PATCH", body: input });
      } else {
        await apiFetch(`/p6/suppliers/${supplierId}/catalog`, { method: "POST", body: input });
      }
      await load();
      setEditingItem(null);
      setShowCreate(false);
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "?"));
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!supplierId) return;
    if (!window.confirm(`Désactiver "${item.materialName}" ?`)) return;
    try {
      await apiFetch(`/p6/suppliers/${supplierId}/catalog/${item.id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      alert("Erreur: " + (e?.message || "?"));
    }
  };

  if (error && !supplierId) return (
    <div style={S.root}>
      <div style={S.err}>⚠ {error}</div>
      <a href="/p6" style={{ color: "#dc2626", fontSize: 13 }}>← Soumettre une fiche P6</a>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.hero}>
        <div>
          <div style={S.title}>📦 Mon catalogue matériaux</div>
          <div style={S.sub}>
            {supplierInfo?.raisonSociale || supplierInfo?.clientNom || "—"}
            <span style={{ ...S.pill, color: "#a7f3d0", background: "rgba(16,185,129,0.15)" }}>
              {items.filter(i => i.active).length} actifs
            </span>
            <span style={{ ...S.pill, color: "#94a3b8", background: "rgba(148,163,184,0.1)" }}>
              {items.length} total
            </span>
          </div>
        </div>
        <button style={S.btnPrimary} onClick={() => { setEditingItem(null); setShowCreate(true); }}>
          + Ajouter matériau
        </button>
      </div>

      {error && <div style={S.err}>⚠ {error}</div>}

      {loading ? (
        <div style={S.empty}>Chargement…</div>
      ) : items.length === 0 ? (
        <div style={S.empty}>
          Aucun matériau dans votre catalogue. Cliquez "+ Ajouter matériau" pour commencer.
        </div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              {["Matériau", "Catégorie", "Prix fourniture", "Livraison", "Délai", "Zones", "Statut", ""].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={{ opacity: it.active ? 1 : 0.5 }}>
                <td style={S.td}>
                  <div style={{ fontWeight: 600 }}>{it.materialName}</div>
                  {it.materialCode && <div style={{ color: "#6b7280", fontSize: 10 }}>{it.materialCode}</div>}
                </td>
                <td style={S.td}><span style={{ color: "#cbd5e1", fontSize: 11 }}>{CATEGORIES.find(c => c.code === it.categorie)?.label || it.categorie}</span></td>
                <td style={S.td}>
                  <span style={{ color: "#10b981", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmtMAD(it.prixFournitureDH)}</span>
                  <span style={{ color: "#6b7280", fontSize: 11 }}> / {it.unite}</span>
                </td>
                <td style={S.td}>
                  {it.livraisonIncluse ? <span style={{ color: "#a7f3d0" }}>Incluse</span> : (
                    <>
                      <span style={{ color: "#fcd34d", fontWeight: 600 }}>{fmtMAD(it.prixLivraisonDH)}</span>
                      {it.minLivraisonDH ? <div style={{ color: "#6b7280", fontSize: 10 }}>min {fmtMAD(it.minLivraisonDH)}</div> : null}
                    </>
                  )}
                </td>
                <td style={S.td}>
                  <span style={{ color: "#cbd5e1" }}>{it.delaiLivraisonHeures != null ? `${it.delaiLivraisonHeures}h` : "—"}</span>
                </td>
                <td style={S.td}>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>
                    {it.zonesFourniture?.length ? it.zonesFourniture.slice(0, 3).join(", ") : "—"}
                    {it.zonesFourniture && it.zonesFourniture.length > 3 ? ` +${it.zonesFourniture.length - 3}` : ""}
                  </span>
                </td>
                <td style={S.td}>
                  <span style={{ color: it.active ? "#34d399" : "#6b7280", fontSize: 11, fontWeight: 600 }}>
                    {it.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td style={S.td}>
                  <button style={{ ...S.btnGhost, marginRight: 4 }} onClick={() => { setEditingItem(it); setShowCreate(true); }}>✎</button>
                  {it.active && <button style={{ ...S.btnGhost, color: "#ef4444", borderColor: "#ef444450" }} onClick={() => handleDelete(it)}>×</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreate && (
        <ItemModal
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowCreate(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

function ItemModal({ item, onSave, onClose }: { item: CatalogItem | null; onSave: (input: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    materialName: item?.materialName ?? "",
    materialCode: item?.materialCode ?? "",
    categorie: item?.categorie ?? "AUTRE" as CatalogCategory,
    unite: item?.unite ?? "UNITE" as CatalogUnit,
    prixFournitureDH: String(item?.prixFournitureDH ?? ""),
    prixMainOeuvreDH: item?.prixMainOeuvreDH != null ? String(item.prixMainOeuvreDH) : "",
    prixLivraisonDH: String(item?.prixLivraisonDH ?? "0"),
    livraisonIncluse: item?.livraisonIncluse ?? false,
    minLivraisonDH: item?.minLivraisonDH != null ? String(item.minLivraisonDH) : "",
    delaiLivraisonHeures: item?.delaiLivraisonHeures != null ? String(item.delaiLivraisonHeures) : "24",
    quantiteDisponibleMax: item?.quantiteDisponibleMax != null ? String(item.quantiteDisponibleMax) : "",
    zonesFourniture: (item?.zonesFourniture ?? []).join(", "),
    certifications: (item?.certifications ?? []).join(", "),
    description: item?.description ?? "",
    active: item?.active ?? true,
  });

  const submit = () => {
    if (!form.materialName.trim()) { alert("Nom matériau requis"); return; }
    if (!form.prixFournitureDH || +form.prixFournitureDH <= 0) { alert("Prix fourniture requis et > 0"); return; }
    onSave({
      materialName: form.materialName.trim(),
      materialCode: form.materialCode.trim() || undefined,
      categorie: form.categorie,
      unite: form.unite,
      prixFournitureDH: +form.prixFournitureDH,
      prixMainOeuvreDH: form.prixMainOeuvreDH ? +form.prixMainOeuvreDH : undefined,
      prixLivraisonDH: form.prixLivraisonDH ? +form.prixLivraisonDH : 0,
      livraisonIncluse: form.livraisonIncluse,
      minLivraisonDH: form.minLivraisonDH ? +form.minLivraisonDH : undefined,
      delaiLivraisonHeures: form.delaiLivraisonHeures ? +form.delaiLivraisonHeures : undefined,
      quantiteDisponibleMax: form.quantiteDisponibleMax ? +form.quantiteDisponibleMax : undefined,
      zonesFourniture: form.zonesFourniture.split(",").map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean),
      description: form.description.trim() || undefined,
      active: form.active,
    });
  };

  return (
    <div style={S.modalBg} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{item ? "Modifier matériau" : "Nouveau matériau"}</div>
          <button style={{ background: "transparent", border: 0, color: "#6b7280", fontSize: 18, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <label style={S.label}>Nom matériau *</label>
          <input style={S.inp} value={form.materialName} onChange={e => setForm({...form, materialName: e.target.value})} placeholder="Ex: Béton C25/30 prêt-à-l'emploi" />

          <div style={S.row2}>
            <div>
              <label style={S.label}>Code interne</label>
              <input style={S.inp} value={form.materialCode} onChange={e => setForm({...form, materialCode: e.target.value})} placeholder="BC25-30" />
            </div>
            <div>
              <label style={S.label}>Catégorie *</label>
              <select style={S.inp} value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value as CatalogCategory})}>
                {CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div style={S.row2}>
            <div>
              <label style={S.label}>Unité *</label>
              <select style={S.inp} value={form.unite} onChange={e => setForm({...form, unite: e.target.value as CatalogUnit})}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Prix fourniture / unité (DH) *</label>
              <input type="number" style={S.inp} value={form.prixFournitureDH} onChange={e => setForm({...form, prixFournitureDH: e.target.value})} placeholder="1200" />
            </div>
          </div>

          <label style={S.label}>Prix main d'œuvre / unité (DH, optionnel)</label>
          <input type="number" style={S.inp} value={form.prixMainOeuvreDH} onChange={e => setForm({...form, prixMainOeuvreDH: e.target.value})} placeholder="—" />

          <div style={S.row2}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input type="checkbox" checked={form.livraisonIncluse} onChange={e => setForm({...form, livraisonIncluse: e.target.checked})} />
              <span style={{ fontSize: 13 }}>Livraison incluse dans le prix</span>
            </label>
            <div>
              <label style={S.label}>Prix livraison (DH, si non incluse)</label>
              <input type="number" style={S.inp} value={form.prixLivraisonDH} onChange={e => setForm({...form, prixLivraisonDH: e.target.value})} disabled={form.livraisonIncluse} />
            </div>
          </div>

          <div style={S.row2}>
            <div>
              <label style={S.label}>Min. livraison (DH)</label>
              <input type="number" style={S.inp} value={form.minLivraisonDH} onChange={e => setForm({...form, minLivraisonDH: e.target.value})} placeholder="2000" />
            </div>
            <div>
              <label style={S.label}>Délai livraison (heures)</label>
              <input type="number" style={S.inp} value={form.delaiLivraisonHeures} onChange={e => setForm({...form, delaiLivraisonHeures: e.target.value})} placeholder="24" />
            </div>
          </div>

          <label style={S.label}>Quantité disponible max</label>
          <input type="number" style={S.inp} value={form.quantiteDisponibleMax} onChange={e => setForm({...form, quantiteDisponibleMax: e.target.value})} placeholder="—" />

          <label style={S.label}>Zones fourniture (séparées par ,)</label>
          <input style={S.inp} value={form.zonesFourniture} onChange={e => setForm({...form, zonesFourniture: e.target.value})} placeholder="Kénitra, Rabat, Salé, Témara" />

          <label style={S.label}>Certifications</label>
          <input style={S.inp} value={form.certifications} onChange={e => setForm({...form, certifications: e.target.value})} placeholder="ISO 9001, NM 10.1.005" />

          <label style={S.label}>Description (optionnel)</label>
          <textarea
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            rows={2}
            style={{ ...S.inp, fontFamily: "inherit", resize: "vertical" }}
            placeholder="Spécifications techniques, conditions particulières…"
          />

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} />
            <span style={{ fontSize: 13 }}>Actif (visible côté clients)</span>
          </label>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnGhost} onClick={onClose}>Annuler</button>
          <button style={S.btnPrimary} onClick={submit}>{item ? "Sauvegarder" : "Ajouter"}</button>
        </div>
      </div>
    </div>
  );
}
