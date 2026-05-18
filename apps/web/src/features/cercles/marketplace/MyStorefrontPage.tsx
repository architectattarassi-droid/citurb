/**
 * MyStorefrontPage — /cercles/ma-vitrine
 * Le fournisseur gère ses produits : liste + formulaire création/édition
 * (photos, prix, stock, showroom, livraison) + suppression.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, SupplierProduct, resolveUploadUrl } from "../api";
import { CATEGORY_LABELS, UNIT_LABELS, formatPrice } from "./ProductCard";

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

type Draft = Partial<SupplierProduct>;

export default function MyStorefrontPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null); // null = liste, objet = form
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    marketplaceApi.myProducts()
      .then(r => setProducts(r.data))
      .catch((e: any) => setErr(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    marketplaceApi.meta().then(r => { setCategories(r.data.categories); setUnits(r.data.units); }).catch(() => {});
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    try { await marketplaceApi.remove(id); load(); }
    catch (e: any) { alert(e?.message || "Erreur"); }
  };

  if (editing) {
    return (
      <CerclesShell>
        <ProductForm
          draft={editing}
          categories={categories}
          units={units}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      </CerclesShell>
    );
  }

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Ma vitrine · Fournisseur BTP</div>
            <h1 style={S.title}>Ma vitrine numérique</h1>
            <p style={S.lead}>Publie tes produits — ils apparaissent dans la <Link to="/cercles/marketplace" style={{ color: CC_THEME.or }}>Marketplace BTP</Link>.</p>
          </div>
          <button onClick={() => setEditing({ unit: "UNITE", category: "AUTRE", active: true, photos: [], deliveryZones: [] })} style={S.addBtn}>
            + Ajouter un produit
          </button>
        </header>

        {err && <div style={S.err}>{err}</div>}
        {loading && <div style={S.muted}>Chargement…</div>}

        {!loading && products.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>🏪</div>
            <div style={S.emptyTitle}>Ta vitrine est vide</div>
            <p style={S.emptyBody}>Clique « Ajouter un produit » pour publier ton premier article.</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div style={S.list}>
            {products.map(p => {
              const photo = resolveUploadUrl(p.photos?.[0]);
              return (
                <div key={p.id} style={S.row}>
                  <div style={{ ...S.rowPhoto, backgroundImage: photo ? `url(${photo})` : undefined }}>
                    {!photo && "📦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.rowName}>
                      {p.name}
                      {!p.active && <span style={S.inactiveBadge}>masqué</span>}
                    </div>
                    <div style={S.rowMeta}>
                      {CATEGORY_LABELS[p.category] || p.category} · {formatPrice(p)}
                      {p.quantityAvailable != null && ` · stock ${p.quantityAvailable}`}
                    </div>
                  </div>
                  <button onClick={() => setEditing(p)} style={S.editBtn}>Modifier</button>
                  <button onClick={() => remove(p.id!)} style={S.delBtn}>Supprimer</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CerclesShell>
  );
}

// ── Formulaire produit ─────────────────────────────────────────────

function ProductForm({ draft, categories, units, onCancel, onSaved }: {
  draft: Draft; categories: string[]; units: string[]; onCancel: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>({ ...draft });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isEdit = !!draft.id;
  const set = (k: keyof SupplierProduct, v: any) => setD(prev => ({ ...prev, [k]: v }));

  const onPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const up = await marketplaceApi.uploadPhotos(files);
      set("photos", [...(d.photos || []), ...up.map(u => u.url)]);
    } catch (ex: any) { setErr(ex?.message || "Échec upload"); }
    finally { setUploading(false); }
  };

  const toggleZone = (z: string) => {
    const zones = d.deliveryZones || [];
    set("deliveryZones", zones.includes(z) ? zones.filter(x => x !== z) : [...zones, z]);
  };

  const num = (v: string) => v === "" ? undefined : Number(v);

  const save = async () => {
    if (!d.name?.trim()) { setErr("Le nom du produit est requis"); return; }
    setSaving(true); setErr(null);
    try {
      if (isEdit) await marketplaceApi.update(draft.id!, d);
      else await marketplaceApi.create(d);
      onSaved();
    } catch (ex: any) { setErr(ex?.message || "Échec enregistrement"); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.formRoot}>
      <button onClick={onCancel} style={S.back}>← Ma vitrine</button>
      <h1 style={S.formTitle}>{isEdit ? "Modifier le produit" : "Nouveau produit"}</h1>

      {err && <div style={S.err}>{err}</div>}

      <div style={S.formCard}>
        <Section title="Identité du produit">
          <Field label="Nom du produit *">
            <input style={S.input} value={d.name || ""} onChange={e => set("name", e.target.value)} placeholder="ex: Ciment CPJ 45 — sac 50 kg" />
          </Field>
          <Row>
            <Field label="Catégorie">
              <select style={S.input} value={d.category || "AUTRE"} onChange={e => set("category", e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
              </select>
            </Field>
            <Field label="Référence (optionnel)">
              <input style={S.input} value={d.reference || ""} onChange={e => set("reference", e.target.value)} placeholder="ex: CPJ45-50" />
            </Field>
          </Row>
          <Field label="Description">
            <textarea style={{ ...S.input, minHeight: 80 }} value={d.description || ""} onChange={e => set("description", e.target.value)} placeholder="Caractéristiques, normes, conditionnement…" />
          </Field>
        </Section>

        <Section title="Photos">
          <div style={S.photosRow}>
            {(d.photos || []).map((p, i) => (
              <div key={i} style={{ ...S.photoThumb, backgroundImage: `url(${resolveUploadUrl(p)})` }}>
                <button onClick={() => set("photos", (d.photos || []).filter((_, j) => j !== i))} style={S.photoDel}>✕</button>
              </div>
            ))}
            <label style={S.photoAdd}>
              {uploading ? "…" : "+ Photo"}
              <input type="file" accept="image/*" multiple onChange={onPhotos} style={{ display: "none" }} />
            </label>
          </div>
        </Section>

        <Section title="Prix & stock">
          <Row>
            <Field label="Prix unitaire (DH)">
              <input type="number" style={S.input} value={d.priceDH ?? ""} onChange={e => set("priceDH", num(e.target.value))} placeholder="ex: 75" />
            </Field>
            <Field label="Unité">
              <select style={S.input} value={d.unit || "UNITE"} onChange={e => set("unit", e.target.value)}>
                {units.map(u => <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>)}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Stock disponible">
              <input type="number" style={S.input} value={d.quantityAvailable ?? ""} onChange={e => set("quantityAvailable", num(e.target.value))} placeholder="ex: 500" />
            </Field>
            <Field label="Commande minimum">
              <input type="number" style={S.input} value={d.minOrder ?? ""} onChange={e => set("minOrder", num(e.target.value))} placeholder="ex: 10" />
            </Field>
          </Row>
        </Section>

        <Section title="Showroom">
          <Row>
            <Field label="Adresse du showroom">
              <input style={S.input} value={d.showroomAddress || ""} onChange={e => set("showroomAddress", e.target.value)} placeholder="ex: Zone industrielle, lot 42" />
            </Field>
            <Field label="Ville">
              <input style={S.input} value={d.showroomCity || ""} onChange={e => set("showroomCity", e.target.value)} placeholder="ex: Casablanca" />
            </Field>
          </Row>
        </Section>

        <Section title="Livraison">
          <Field label="Zones de livraison (régions)">
            <div style={S.chips}>
              {REGIONS.map(z => (
                <button key={z} type="button" onClick={() => toggleZone(z)} style={{
                  ...S.chip,
                  background: (d.deliveryZones || []).includes(z) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                  color: (d.deliveryZones || []).includes(z) ? CC_THEME.navy : CC_THEME.inkMid,
                  fontWeight: (d.deliveryZones || []).includes(z) ? 600 : 400,
                }}>{z}</button>
              ))}
            </div>
          </Field>
          <Row>
            <Field label="Délai de livraison (heures)">
              <input type="number" style={S.input} value={d.deliveryDelayHours ?? ""} onChange={e => set("deliveryDelayHours", num(e.target.value))} placeholder="ex: 48" />
            </Field>
            <Field label="Coût de livraison (DH)">
              <input type="number" style={S.input} value={d.deliveryCostDH ?? ""} onChange={e => set("deliveryCostDH", num(e.target.value))} placeholder="ex: 200" />
            </Field>
          </Row>
          <label style={S.checkRow}>
            <input type="checkbox" checked={!!d.deliveryIncluded} onChange={e => set("deliveryIncluded", e.target.checked)} />
            <span>Livraison incluse dans le prix</span>
          </label>
        </Section>

        <Section title="Visibilité">
          <label style={S.checkRow}>
            <input type="checkbox" checked={d.active !== false} onChange={e => set("active", e.target.checked)} />
            <span>Produit visible dans la marketplace (décoche pour le masquer)</span>
          </label>
        </Section>

        <div style={S.formActions}>
          <button onClick={onCancel} style={S.cancelBtn}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Enregistrement…" : (isEdit ? "Enregistrer les modifications" : "Publier le produit")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={S.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12, flex: 1, minWidth: 180 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "28px 32px 60px", maxWidth: 1000, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22, flexWrap: "wrap" },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.navy },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic" },
  addBtn: { background: CC_THEME.or, color: CC_THEME.bgDeep, border: 0, padding: "11px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },

  err: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 14 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 30 },
  empty: { textAlign: "center", padding: "50px 20px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12 },
  emptyTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, fontWeight: 600 },
  emptyBody: { color: CC_THEME.inkMid, fontSize: 13, marginTop: 6 },

  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8 },
  rowPhoto: { width: 52, height: 52, borderRadius: 6, background: CC_THEME.bgSoft, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
  rowName: { fontSize: 14, fontWeight: 600, color: CC_THEME.navy, display: "flex", alignItems: "center", gap: 8 },
  rowMeta: { fontSize: 12, color: CC_THEME.inkMuted, marginTop: 2 },
  inactiveBadge: { fontSize: 9, padding: "2px 6px", background: CC_THEME.warnBg, color: CC_THEME.warn, borderRadius: 3, textTransform: "uppercase", fontWeight: 600 },
  editBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "7px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  delBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.danger, padding: "7px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  formRoot: { padding: "24px 32px 60px", maxWidth: 760, margin: "0 auto" },
  back: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 },
  formTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 26, fontWeight: 600, color: CC_THEME.navy, marginBottom: 18 },
  formCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 24 },
  sectionTitle: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${CC_THEME.border}` },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: CC_THEME.inkMid, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 5, fontSize: 13.5, fontFamily: "inherit", outline: "none", background: CC_THEME.bg, boxSizing: "border-box" as const, resize: "vertical" as const },

  photosRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  photoThumb: { width: 90, height: 90, borderRadius: 8, backgroundSize: "cover", backgroundPosition: "center", border: `1px solid ${CC_THEME.border}`, position: "relative" },
  photoDel: { position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", border: 0, background: "rgba(148,41,43,0.9)", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1 },
  photoAdd: { width: 90, height: 90, borderRadius: 8, border: `2px dashed ${CC_THEME.border}`, background: CC_THEME.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: CC_THEME.inkMid, cursor: "pointer", fontWeight: 500 },

  chips: { display: "flex", flexWrap: "wrap" as const, gap: 5 },
  chip: { border: `1px solid ${CC_THEME.border}`, padding: "5px 10px", borderRadius: 14, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: CC_THEME.inkMid, cursor: "pointer" },

  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 },
  cancelBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.inkMid, padding: "11px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  saveBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "11px 22px", borderRadius: 6, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
