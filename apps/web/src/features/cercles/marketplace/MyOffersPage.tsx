/**
 * MyOffersPage — /cercles/mes-offres
 * Le fournisseur propose ses offres (prix/stock/livraison) sur les produits
 * du référentiel marketplace.
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CerclesShell from "../CerclesShell";
import { CC_THEME } from "../theme";
import { marketplaceApi, MyOffer } from "../api";
import { CORPS_LABELS, UNIT_LABELS } from "./ProductCard";

const REGIONS = [
  "Tanger-Tétouan-Al Hoceïma", "Oriental", "Fès-Meknès", "Rabat-Salé-Kénitra",
  "Béni Mellal-Khénifra", "Casablanca-Settat", "Marrakech-Safi", "Drâa-Tafilalet",
  "Souss-Massa", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab",
];

type RefHit = { id: string; name: string; corpsMetier: string; famille: string; unit: string };

export default function MyOffersPage() {
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MyOffer | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    marketplaceApi.myOffers()
      .then(r => setOffers(r.data))
      .catch((e: any) => setErr(e?.message || "Erreur"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette offre ?")) return;
    try { await marketplaceApi.removeOffer(id); load(); }
    catch (e: any) { alert(e?.message || "Erreur"); }
  };

  if (creating || editing) {
    return (
      <CerclesShell>
        <OfferForm
          offer={editing}
          onCancel={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      </CerclesShell>
    );
  }

  return (
    <CerclesShell>
      <div style={S.root}>
        <header style={S.header}>
          <div>
            <div style={S.eyebrow}>Espace fournisseur</div>
            <h1 style={S.title}>Mes offres marketplace</h1>
            <p style={S.lead}>
              Proposez vos prix et conditions sur les matériaux du{" "}
              <Link to="/cercles/marketplace" style={{ color: CC_THEME.or }}>référentiel BTP</Link>.
            </p>
          </div>
          <button onClick={() => setCreating(true)} style={S.addBtn}>+ Ajouter une offre</button>
        </header>

        <div style={S.contractNote}>
          🔒 Tant que votre contrat fournisseur CITURBAREA n'est pas signé, votre identité reste masquée
          (« Fournisseur partenaire ») sur les fiches produit. Vos offres sont visibles, le contact passe par la marketplace.
        </div>

        {err && <div style={S.err}>{err}</div>}
        {loading && <div style={S.muted}>Chargement…</div>}

        {!loading && offers.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏪</div>
            <div style={S.emptyTitle}>Aucune offre publiée</div>
            <p style={S.emptyBody}>Cliquez « Ajouter une offre », cherchez un matériau du référentiel et fixez votre prix.</p>
          </div>
        )}

        {!loading && offers.length > 0 && (
          <div style={S.list}>
            {offers.map(o => (
              <div key={o.id} style={S.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.rowName}>
                    {o.marketProduct?.name || "Produit"}
                    {!o.active && <span style={S.inactive}>masquée</span>}
                  </div>
                  <div style={S.rowMeta}>
                    {o.marketProduct && (CORPS_LABELS[o.marketProduct.corpsMetier] || o.marketProduct.corpsMetier)}
                    {" · "}{o.priceDH.toLocaleString("fr-MA")} DH / {UNIT_LABELS[o.marketProduct?.unit || "UNITE"] || o.marketProduct?.unit}
                    {o.quantityAvailable != null && ` · stock ${o.quantityAvailable}`}
                  </div>
                </div>
                <button onClick={() => setEditing(o)} style={S.editBtn}>Modifier</button>
                <button onClick={() => remove(o.id)} style={S.delBtn}>Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </CerclesShell>
  );
}

// ── Formulaire d'offre ─────────────────────────────────────────────

function OfferForm({ offer, onCancel, onSaved }: { offer: MyOffer | null; onCancel: () => void; onSaved: () => void }) {
  const isEdit = !!offer;
  const [productId, setProductId] = useState(offer?.marketProductId || "");
  const [productLabel, setProductLabel] = useState(offer?.marketProduct?.name || "");
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<RefHit[]>([]);
  const [priceDH, setPriceDH] = useState<string>(offer?.priceDH != null ? String(offer.priceDH) : "");
  const [qty, setQty] = useState<string>(offer?.quantityAvailable != null ? String(offer.quantityAvailable) : "");
  const [minOrder, setMinOrder] = useState<string>(offer?.minOrder != null ? String(offer.minOrder) : "");
  const [showroomCity, setShowroomCity] = useState(offer?.showroomCity || "");
  const [zones, setZones] = useState<string[]>(offer?.deliveryZones || []);
  const [delay, setDelay] = useState<string>(offer?.deliveryDelayHours != null ? String(offer.deliveryDelayHours) : "");
  const [cost, setCost] = useState<string>(offer?.deliveryCostDH != null ? String(offer.deliveryCostDH) : "");
  const [included, setIncluded] = useState(!!offer?.deliveryIncluded);
  const [active, setActive] = useState(offer?.active !== false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (search.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      marketplaceApi.searchReferentiel(search.trim()).then(r => setHits(r.data)).catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const toggleZone = (z: string) => setZones(zones.includes(z) ? zones.filter(x => x !== z) : [...zones, z]);
  const num = (v: string) => v === "" ? undefined : Number(v);

  const save = async () => {
    if (!productId) { setErr("Choisissez un produit du référentiel"); return; }
    if (!priceDH || Number(priceDH) <= 0) { setErr("Prix valide requis"); return; }
    setSaving(true); setErr(null);
    const body: any = {
      marketProductId: productId,
      priceDH: Number(priceDH),
      quantityAvailable: num(qty), minOrder: num(minOrder),
      showroomCity: showroomCity.trim() || undefined,
      deliveryZones: zones, deliveryDelayHours: num(delay), deliveryCostDH: num(cost),
      deliveryIncluded: included, active,
    };
    try {
      if (isEdit) await marketplaceApi.updateOffer(offer!.id, body);
      else await marketplaceApi.createOffer(body);
      onSaved();
    } catch (e: any) { setErr(e?.message || "Échec enregistrement"); }
    finally { setSaving(false); }
  };

  return (
    <div style={S.formRoot}>
      <button onClick={onCancel} style={S.back}>← Mes offres</button>
      <h1 style={S.formTitle}>{isEdit ? "Modifier l'offre" : "Nouvelle offre"}</h1>
      {err && <div style={S.err}>{err}</div>}

      <div style={S.formCard}>
        <div style={S.sectionTitle}>Produit du référentiel</div>
        {productId ? (
          <div style={S.picked}>
            ✓ {productLabel}
            {!isEdit && <button onClick={() => { setProductId(""); setProductLabel(""); }} style={S.changeBtn}>changer</button>}
          </div>
        ) : (
          <>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un matériau (ciment, fer, carrelage…)" style={S.input}
            />
            {hits.length > 0 && (
              <div style={S.hits}>
                {hits.map(h => (
                  <button key={h.id} onClick={() => { setProductId(h.id); setProductLabel(h.name); setHits([]); setSearch(""); }} style={S.hit}>
                    <strong>{h.name}</strong>
                    <span style={S.hitMeta}>{CORPS_LABELS[h.corpsMetier] || h.corpsMetier} · {h.famille}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ ...S.sectionTitle, marginTop: 18 }}>Prix & stock</div>
        <div style={S.row}>
          <Field label="Prix unitaire (DH) *">
            <input type="number" style={S.input} value={priceDH} onChange={e => setPriceDH(e.target.value)} placeholder="ex: 75" />
          </Field>
          <Field label="Stock disponible">
            <input type="number" style={S.input} value={qty} onChange={e => setQty(e.target.value)} placeholder="ex: 500" />
          </Field>
          <Field label="Commande minimum">
            <input type="number" style={S.input} value={minOrder} onChange={e => setMinOrder(e.target.value)} placeholder="ex: 10" />
          </Field>
        </div>

        <div style={{ ...S.sectionTitle, marginTop: 8 }}>Showroom & livraison</div>
        <Field label="Ville du showroom">
          <input style={S.input} value={showroomCity} onChange={e => setShowroomCity(e.target.value)} placeholder="ex: Casablanca" />
        </Field>
        <Field label="Zones de livraison">
          <div style={S.chips}>
            {REGIONS.map(z => (
              <button key={z} type="button" onClick={() => toggleZone(z)} style={{
                ...S.chip,
                background: zones.includes(z) ? CC_THEME.orSoft : CC_THEME.bgSoft,
                color: zones.includes(z) ? CC_THEME.navy : CC_THEME.inkMid,
                fontWeight: zones.includes(z) ? 600 : 400,
              }}>{z}</button>
            ))}
          </div>
        </Field>
        <div style={S.row}>
          <Field label="Délai de livraison (h)">
            <input type="number" style={S.input} value={delay} onChange={e => setDelay(e.target.value)} placeholder="ex: 48" />
          </Field>
          <Field label="Coût de livraison (DH)">
            <input type="number" style={S.input} value={cost} onChange={e => setCost(e.target.value)} placeholder="ex: 200" />
          </Field>
        </div>
        <label style={S.check}>
          <input type="checkbox" checked={included} onChange={e => setIncluded(e.target.checked)} />
          <span>Livraison incluse dans le prix</span>
        </label>
        <label style={S.check}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          <span>Offre visible sur la marketplace</span>
        </label>

        <div style={S.formActions}>
          <button onClick={onCancel} style={S.cancelBtn}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Enregistrement…" : (isEdit ? "Enregistrer" : "Publier l'offre")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12, flex: 1, minWidth: 150 }}><label style={S.label}>{label}</label>{children}</div>;
}

const S: Record<string, React.CSSProperties> = {
  root: { padding: "28px 32px 60px", maxWidth: 920, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 14, flexWrap: "wrap" },
  eyebrow: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 600 },
  title: { margin: "6px 0 4px", fontFamily: CC_THEME.fontDisplay, fontSize: 28, fontWeight: 600, color: CC_THEME.navy },
  lead: { color: CC_THEME.inkMid, fontSize: 13.5, fontStyle: "italic" },
  addBtn: { background: CC_THEME.or, color: CC_THEME.bgDeep, border: 0, padding: "11px 20px", borderRadius: 6, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  contractNote: { background: CC_THEME.bgSoft, border: `1px solid ${CC_THEME.border}`, borderLeft: `4px solid ${CC_THEME.or}`, borderRadius: 8, padding: "12px 16px", fontSize: 12.5, color: CC_THEME.inkMid, lineHeight: 1.55, marginBottom: 18 },

  err: { background: CC_THEME.dangerBg, color: CC_THEME.danger, padding: "10px 14px", borderRadius: 6, fontSize: 13, marginBottom: 14 },
  muted: { color: CC_THEME.inkMuted, fontStyle: "italic", padding: 30 },
  empty: { textAlign: "center", padding: "50px 20px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12 },
  emptyTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 18, color: CC_THEME.navy, fontWeight: 600 },
  emptyBody: { color: CC_THEME.inkMid, fontSize: 13, marginTop: 6 },

  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 8 },
  rowName: { fontSize: 14, fontWeight: 600, color: CC_THEME.navy, display: "flex", alignItems: "center", gap: 8 },
  rowMeta: { fontSize: 12, color: CC_THEME.inkMuted, marginTop: 2 },
  inactive: { fontSize: 9, padding: "2px 6px", background: CC_THEME.warnBg, color: CC_THEME.warn, borderRadius: 3, textTransform: "uppercase", fontWeight: 600 },
  editBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.navy, padding: "7px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  delBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.danger, padding: "7px 12px", borderRadius: 5, fontSize: 12, cursor: "pointer", fontFamily: "inherit" },

  formRoot: { padding: "24px 32px 60px", maxWidth: 720, margin: "0 auto" },
  back: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginBottom: 12 },
  formTitle: { fontFamily: CC_THEME.fontDisplay, fontSize: 25, fontWeight: 600, color: CC_THEME.navy, marginBottom: 16 },
  formCard: { background: CC_THEME.bgRaised, border: `1px solid ${CC_THEME.border}`, borderRadius: 12, padding: 22 },
  sectionTitle: { fontSize: 10.5, color: CC_THEME.or, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${CC_THEME.border}` },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: CC_THEME.inkMid, letterSpacing: "0.04em", textTransform: "uppercase" as const, marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", border: `1px solid ${CC_THEME.border}`, borderRadius: 5, fontSize: 13.5, fontFamily: "inherit", outline: "none", background: CC_THEME.bg, boxSizing: "border-box" as const },
  row: { display: "flex", gap: 12, flexWrap: "wrap" },
  picked: { display: "flex", alignItems: "center", gap: 10, background: CC_THEME.successBg, color: CC_THEME.success, padding: "10px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600 },
  changeBtn: { background: "transparent", border: 0, color: CC_THEME.inkMid, fontSize: 11, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" },
  hits: { display: "flex", flexDirection: "column", gap: 2, marginTop: 6, maxHeight: 240, overflowY: "auto", border: `1px solid ${CC_THEME.border}`, borderRadius: 6 },
  hit: { display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "8px 12px", background: CC_THEME.bgRaised, border: 0, borderBottom: `1px solid ${CC_THEME.borderSoft}`, cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: CC_THEME.ink, textAlign: "left" as const, width: "100%" },
  hitMeta: { fontSize: 11, color: CC_THEME.inkMuted },
  chips: { display: "flex", flexWrap: "wrap" as const, gap: 5 },
  chip: { border: `1px solid ${CC_THEME.border}`, padding: "5px 10px", borderRadius: 14, fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  check: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: CC_THEME.inkMid, cursor: "pointer", marginBottom: 8 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  cancelBtn: { background: "transparent", border: `1px solid ${CC_THEME.border}`, color: CC_THEME.inkMid, padding: "11px 20px", borderRadius: 6, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  saveBtn: { background: CC_THEME.navy, color: CC_THEME.bg, border: 0, padding: "11px 22px", borderRadius: 6, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
