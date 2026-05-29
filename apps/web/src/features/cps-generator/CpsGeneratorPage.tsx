/**
 * CpsGeneratorPage (/cps) — studio CPS + branchement marketplace.
 *
 * Génère un Cahier des Prescriptions Spéciales trilingue, puis permet, depuis
 * chaque poste du bordereau, de rechercher des matériaux existants/similaires
 * dans la marketplace (produits + prix « suivant CPS »), de les ajouter à un
 * devis estimatif et de passer commande (livraisons) pour les offres
 * fournisseurs sous contrat.
 */

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../tomes/tome4/apiClient";

type ProjectTypeItem = { code: string; label: string; description?: string; lotsCount: number };
type CpsLotResult = { code: string; numero: number | null; intitule: string; obligatoire: boolean; present: boolean; articlesCount: number };
type CpsBordereauRow = { code: string; lotCode: string; lotNumero: number | null; lotIntitule: string; famille: string; designation: string; unite: string };
type CpsDocument = { projectTypeLabel: string; projectName: string; lots: CpsLotResult[]; missingLots: string[]; bordereau: CpsBordereauRow[]; markdown: string; html: string };

type Offer = { offerId: string; priceDH: number; supplierId: string | null; supplierName: string; contracted: boolean; showroomCity?: string | null; deliveryZones?: string[] };
type CpsMatch = { source: "CATALOGUE" | "MARKETPLACE"; code: string; label: string; unit: string; category: string | null; score: number; priceMin: number | null; priceMoyen: number | null; priceMax: number | null; productId?: string; offers?: Offer[]; orderable: boolean };
type PricedRow = { code: string; lotCode: string; lotIntitule: string; famille: string; designation: string; unite: string; best: CpsMatch | null; alternatives: number };
type CartItem = { key: string; materialCode: string; materialLabel: string; unit: string; qty: number; prixUnitaire: number; source: string; supplierUserId: string | null; supplierName: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-MA").format(Math.round(n));

export default function CpsGeneratorPage() {
  const [types, setTypes] = useState<ProjectTypeItem[]>([]);
  const [code, setCode] = useState("");
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("");
  const [lang, setLang] = useState<"fr" | "ar" | "en">("fr");
  const [marketType, setMarketType] = useState<"PUBLIC" | "PRIVE">("PRIVE");
  const [doc, setDoc] = useState<CpsDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Bordereau chiffré + recherche marketplace par poste
  const [priced, setPriced] = useState<PricedRow[] | null>(null);
  const [pricing, setPricing] = useState(false);
  const [openPoste, setOpenPoste] = useState<string | null>(null);
  const [posteMatches, setPosteMatches] = useState<Record<string, CpsMatch[]>>({});
  const [matchLoading, setMatchLoading] = useState<string | null>(null);

  // Devis / commande
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dossierId, setDossierId] = useState("");
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    apiFetch<{ items: ProjectTypeItem[] }>(`/api/cps/project-types?lang=${lang}`)
      .then((r) => { setTypes(r.items); if (r.items[0] && !code) setCode(r.items[0].code); })
      .catch((e: any) => setErr(e?.message || "Erreur de chargement"));
  }, [lang]);

  const selected = useMemo(() => types.find((t) => t.code === code) || null, [types, code]);
  const genBody = () => ({ projectTypeCode: code, projectName: projectName.trim(), projectAddress: address.trim() || undefined, zoneSismique: zone.trim() || undefined, lang, marketType });

  async function generate() {
    if (!code || !projectName.trim()) { setErr("Type de projet et nom du projet requis."); return; }
    setErr(null); setLoading(true); setPriced(null); setPosteMatches({}); setOpenPoste(null);
    try {
      const r = await apiFetch<CpsDocument>("/api/cps/generate", { method: "POST", body: genBody() });
      setDoc(r);
    } catch (e: any) { setErr(e?.message || "Échec de la génération"); }
    finally { setLoading(false); }
  }

  async function chiffrer() {
    if (!doc) return;
    setPricing(true);
    try {
      const r = await apiFetch<{ bordereau: PricedRow[] }>("/api/cps/bordereau-chiffre", { method: "POST", body: genBody() });
      setPriced(r.bordereau);
    } catch (e: any) { setErr(e?.message || "Échec du chiffrage"); }
    finally { setPricing(false); }
  }

  async function searchPoste(row: PricedRow) {
    if (openPoste === row.code) { setOpenPoste(null); return; }
    setOpenPoste(row.code);
    if (posteMatches[row.code]) return;
    setMatchLoading(row.code);
    try {
      const r = await apiFetch<{ matches: CpsMatch[] }>("/api/cps/marketplace/match", {
        method: "POST",
        body: { query: row.designation, famille: row.famille, unite: row.unite, limit: 8 },
      });
      setPosteMatches((p) => ({ ...p, [row.code]: r.matches }));
    } catch { setPosteMatches((p) => ({ ...p, [row.code]: [] })); }
    finally { setMatchLoading(null); }
  }

  function addToCart(m: CpsMatch, offer?: Offer) {
    const prix = offer ? offer.priceDH : (m.priceMoyen ?? m.priceMin ?? 0);
    const item: CartItem = {
      key: `${m.code}_${offer?.offerId ?? "cat"}_${Date.now()}`,
      materialCode: m.code, materialLabel: m.label, unit: m.unit, qty: 1, prixUnitaire: prix,
      source: offer ? "MARKETPLACE" : m.source,
      supplierUserId: offer?.supplierId ?? null,
      supplierName: offer?.supplierName ?? "—",
    };
    setCart((c) => [...c, item]);
    setOrderMsg(null);
  }
  const setQty = (key: string, qty: number) => setCart((c) => c.map((i) => (i.key === key ? { ...i, qty: Math.max(0, qty) } : i)));
  const removeItem = (key: string) => setCart((c) => c.filter((i) => i.key !== key));
  const devisTotal = cart.reduce((s, i) => s + i.qty * i.prixUnitaire, 0);
  const orderable = cart.filter((i) => i.supplierUserId);

  async function passerCommande() {
    if (!dossierId.trim()) { setOrderMsg("Renseignez un identifiant de dossier pour commander."); return; }
    if (!orderable.length) { setOrderMsg("Aucun article commandable (offre fournisseur sous contrat) dans le devis."); return; }
    setOrdering(true); setOrderMsg(null);
    try {
      // Une commande par fournisseur
      const bySupplier = new Map<string, CartItem[]>();
      for (const i of orderable) { const k = i.supplierUserId!; bySupplier.set(k, [...(bySupplier.get(k) ?? []), i]); }
      let n = 0;
      for (const [supplierUserId, items] of bySupplier) {
        await apiFetch("/api/livraisons/commande", {
          method: "POST",
          body: {
            dossierId: dossierId.trim(), supplierUserId,
            lignes: items.map((i) => ({ materialCode: i.materialCode, materialLabel: i.materialLabel, unit: i.unit, qty: i.qty, prixUnitaire: i.prixUnitaire })),
            adresseLivraison: address.trim() || "À préciser", dateLivraisonSouhaitee: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
          },
        });
        n++;
      }
      setOrderMsg(`✅ ${n} commande(s) créée(s) sur le dossier ${dossierId.trim()}.`);
      setCart((c) => c.filter((i) => !i.supplierUserId));
    } catch (e: any) { setOrderMsg(e?.message || "Échec de la commande"); }
    finally { setOrdering(false); }
  }

  function printDoc() {
    if (!doc) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(doc.html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  }

  const presentCount = doc ? doc.lots.filter((l) => l.present).length : 0;
  const rows = priced ?? (doc ? doc.bordereau.map((b) => ({ ...b, best: null, alternatives: 0 })) : []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ fontSize: 12, color: "#C9A227", letterSpacing: "0.18em", textTransform: "uppercase" }}>CITURBAREA · CPS</div>
      <h1 style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 800, color: "#0B1B3A" }}>Générateur de CPS + Marketplace</h1>
      <p style={{ fontSize: 14, color: "rgba(11,27,58,0.6)", marginTop: 6, maxWidth: 680 }}>
        CPS pré-codé trilingue (RPS 2011 / RTCM, clauses légales DOC, assurances loi 59-13). Depuis chaque poste
        du bordereau : recherchez des matériaux existants dans la marketplace, voyez les prix « suivant CPS »,
        constituez un devis et passez commande.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 20 }}>
        <Field label="Type de projet"><select value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle}>{types.map((t) => (<option key={t.code} value={t.code}>{t.label}</option>))}</select></Field>
        <Field label="Nom du projet"><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Villa M. Alaoui" style={inputStyle} /></Field>
        <Field label="Adresse / commune"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Casablanca" style={inputStyle} /></Field>
        <Field label="Zone sismique (RPS)"><input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Z2" style={inputStyle} /></Field>
        <Field label="Langue / اللغة / Language"><select value={lang} onChange={(e) => setLang(e.target.value as any)} style={inputStyle}><option value="fr">Français</option><option value="ar">العربية</option><option value="en">English</option></select></Field>
        <Field label="Type de marché"><select value={marketType} onChange={(e) => setMarketType(e.target.value as any)} style={inputStyle}><option value="PRIVE">Privé</option><option value="PUBLIC">Public (CCAG-T)</option></select></Field>
      </div>

      {selected?.description && <p style={{ fontSize: 13, color: "rgba(11,27,58,0.55)", marginTop: 10 }}>{selected.description}</p>}
      {err && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 10, borderRadius: 8, marginTop: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={generate} disabled={loading} style={{ ...btnStyle, background: "#0B1B3A", opacity: loading ? 0.6 : 1 }}>{loading ? "Génération…" : "Générer le CPS"}</button>
        {doc && <button onClick={chiffrer} disabled={pricing} style={{ ...btnStyle, background: "#16a34a", opacity: pricing ? 0.6 : 1 }}>{pricing ? "Chiffrage…" : "Chiffrer le bordereau"}</button>}
        {doc && <button onClick={printDoc} style={{ ...btnStyle, background: "#C9A227" }}>Imprimer / PDF</button>}
      </div>

      {doc && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: "#0B1B3A", fontSize: 15 }}>{doc.lots.length} lots · {presentCount} détaillés · {doc.bordereau.length} postes au bordereau</div>
          </div>

          {/* Bordereau interactif */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0B1B3A" }}>Bordereau → Marketplace</h2>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
            <div style={{ maxHeight: 520, overflowY: "auto" }}>
              {rows.map((r) => (
                <div key={r.lotCode + r.code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, width: 44 }}>{r.code}</span>
                    <span style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: "#0B1B3A" }}>{r.designation}</span>
                    <span style={{ fontSize: 12, color: "#64748b", width: 36, textAlign: "center" }}>{r.unite}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: r.best ? "#16a34a" : "#cbd5e1", width: 120, textAlign: "right" }}>
                      {r.best ? `${fmt(r.best.priceMin ?? 0)}–${fmt(r.best.priceMax ?? 0)} MAD` : "—"}
                    </span>
                    <button onClick={() => searchPoste(r)} style={{ ...miniBtn, background: openPoste === r.code ? "#0B1B3A" : "#eef2f7", color: openPoste === r.code ? "#fff" : "#0B1B3A" }}>🔍 Marketplace</button>
                  </div>
                  {openPoste === r.code && (
                    <div style={{ padding: "0 12px 12px 56px", background: "#fbfdff" }}>
                      {matchLoading === r.code && <div style={{ fontSize: 12.5, color: "#64748b", padding: 8 }}>Recherche…</div>}
                      {posteMatches[r.code] && posteMatches[r.code].length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8", padding: 8 }}>Aucun matériau similaire trouvé.</div>}
                      {(posteMatches[r.code] ?? []).map((m, i) => (
                        <div key={m.code + i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: i ? "1px dashed #e2e8f0" : 0, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: m.source === "MARKETPLACE" ? "#dbeafe" : "#f1f5f9", color: m.source === "MARKETPLACE" ? "#1e40af" : "#475569" }}>{m.source === "MARKETPLACE" ? "Marketplace" : "Catalogue"}</span>
                          <span style={{ flex: 1, minWidth: 180, fontSize: 13, color: "#0B1B3A" }}>{m.label}</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0B1B3A" }}>{m.priceMoyen != null ? `${fmt(m.priceMoyen)} MAD/${m.unit}` : m.priceMin != null ? `${fmt(m.priceMin)}+ MAD/${m.unit}` : "—"}</span>
                          {m.source === "MARKETPLACE" && m.offers && m.offers.length > 0 ? (
                            m.offers.map((o) => (
                              <button key={o.offerId} disabled={!o.contracted} onClick={() => addToCart(m, o)} title={o.contracted ? `${o.supplierName} · ${fmt(o.priceDH)} MAD` : "Fournisseur non contractualisé"} style={{ ...miniBtn, background: o.contracted ? "#16a34a" : "#e2e8f0", color: o.contracted ? "#fff" : "#94a3b8" }}>
                                {o.contracted ? `Commander ${fmt(o.priceDH)}` : "🔒 partenaire"}
                              </button>
                            ))
                          ) : (
                            <button onClick={() => addToCart(m)} style={{ ...miniBtn, background: "#eef2f7", color: "#0B1B3A" }}>+ Devis</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Devis / commande */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0B1B3A", marginTop: 24 }}>Devis estimatif {cart.length > 0 && `(${cart.length})`}</h2>
          {cart.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Ajoutez des matériaux depuis le bordereau pour constituer un devis et passer commande.</p>
          ) : (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, marginTop: 8 }}>
              {cart.map((i) => (
                <div key={i.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: 160, fontSize: 13, color: "#0B1B3A" }}>{i.materialLabel}{i.supplierUserId && <span style={{ color: "#1e40af", fontSize: 11 }}> · {i.supplierName}</span>}</span>
                  <input type="number" min={0} value={i.qty} onChange={(e) => setQty(i.key, Number(e.target.value))} style={{ width: 64, padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }} />
                  <span style={{ fontSize: 12, color: "#64748b", width: 32 }}>{i.unit}</span>
                  <span style={{ fontSize: 12.5, color: "#64748b", width: 90, textAlign: "right" }}>× {fmt(i.prixUnitaire)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1B3A", width: 100, textAlign: "right" }}>{fmt(i.qty * i.prixUnitaire)} MAD</span>
                  <button onClick={() => removeItem(i.key)} style={{ ...miniBtn, background: "#fee2e2", color: "#991b1b" }}>✕</button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", fontWeight: 800, color: "#0B1B3A", marginTop: 10, fontSize: 15 }}>Total estimatif : {fmt(devisTotal)} MAD HT</div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
                <Field label="Dossier (ID) pour commander"><input value={dossierId} onChange={(e) => setDossierId(e.target.value)} placeholder="dossier_xxxxx" style={{ ...inputStyle, width: 220 }} /></Field>
                <button onClick={passerCommande} disabled={ordering || !orderable.length} style={{ ...btnStyle, background: orderable.length ? "#16a34a" : "#cbd5e1", minHeight: 44 }}>
                  {ordering ? "Commande…" : `Commander ${orderable.length} article(s) fournisseur`}
                </button>
              </div>
              {orderMsg && <div style={{ marginTop: 10, fontSize: 13, color: orderMsg.startsWith("✅") ? "#166534" : "#991b1b" }}>{orderMsg}</div>}
              <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 8 }}>Les articles « catalogue » servent d'estimation (prix de référence). Seules les offres marketplace de fournisseurs sous contrat sont commandables (anti-désintermédiation).</p>
            </div>
          )}

          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0B1B3A", marginTop: 24 }}>Aperçu du CPS</h2>
          <iframe title="Aperçu CPS" srcDoc={doc.html} style={{ width: "100%", height: 540, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", marginTop: 8 }} />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(11,27,58,0.55)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0B1B3A" };
const btnStyle: React.CSSProperties = { color: "#fff", border: 0, borderRadius: 9, padding: "12px 22px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 48 };
const miniBtn: React.CSSProperties = { border: 0, borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" };
