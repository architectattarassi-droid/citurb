import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang } from "../../../../i18n/i18n";

/**
 * P2Home — Wizard 5-sections × pricing CNOA 2021
 *
 * Étapes:
 *   1. Section (IMM / GR / LOT / EPIG / AMG)
 *   2. Catégorie (depuis /p2/categories?section=...)
 *   3. Mesures (surface plancher, nb bâtiments si GR, surface terrain ha si LOT)
 *   4. Mode de suivi (ON_SITE 30% ou PHOTOS 10%, disabled si non disponible)
 *   5. Devis détaillé (depuis /p2/quote)
 *   6. Identité client + soumission /p2/intake
 *   7. Confirmation succès
 */

type P2Section = "IMM" | "GR" | "LOT" | "EPIG" | "AMG";
type FollowMode = "ON_SITE" | "PHOTOS";

const SECTIONS: { id: P2Section; label: string; icon: string; desc: string }[] = [
  { id: "IMM", label: "Immeuble", icon: "🏢", desc: "Construction neuve d'un immeuble (R+2 et plus, collectif ou bureaux)" },
  { id: "GR",  label: "Groupement résidentiel", icon: "🏘️", desc: "Plusieurs immeubles sur un même projet (résidence, complexe)" },
  { id: "LOT", label: "Lotissement / morcellement", icon: "🗺️", desc: "Aménagement foncier — découpage de terrains (loi 25-90)" },
  { id: "EPIG", label: "Équipement privé", icon: "🏛️", desc: "Hôtel, clinique, école, mosquée, hangar, usine — intérêt général" },
  { id: "AMG", label: "Aménagement", icon: "🏪", desc: "Transformation d'un local existant (commerce, agence, show-room…)" },
];

type Category = { code: string; label: string; costPerM2: number; photoOptionAvailable: boolean; notes?: string };
type Quote = {
  ok: true;
  currency: "MAD";
  meta: {
    section: P2Section;
    sectionLabel: string;
    category?: string;
    categoryLabel?: string;
    followMode: FollowMode;
    photoOptionAvailable: boolean;
    requiresQuotePersonnalise: boolean;
  };
  base: { surfacePlancherM2?: number; nbBatiments: number; coutConstructionM2?: number; coutTravauxEstime?: number; surfaceTerrainHa?: number };
  honoraires: {
    rate: number;
    totalHT: number | null;
    tvaRate: number;
    tva: number | null;
    totalTTC: number | null;
    breakdown: { phaseA_esquisseAutorisation: number | null; phaseB_dceCps: number | null; phaseC_suivi: number | null };
  };
  visaCroa: { payableSeparately: true; note: string };
  decennale: { applicable: boolean; options?: string[]; note: string };
  notes: string[];
};

const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 30, height: 4, borderRadius: 2,
  background: done ? "#f59e0b" : active ? "#b45309" : "#1e2330",
  transition: "background .2s",
});
const cardStyle = (active: boolean, disabled?: boolean): React.CSSProperties => ({
  background: disabled ? "#0a0f1a" : (active ? "#1a1200" : "#111827"),
  border: `2px solid ${disabled ? "#1e2330" : (active ? "#f59e0b" : "#1e2330")}`,
  borderRadius: 12, padding: "20px 18px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  transition: "all .15s",
});
const followCardStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
  flex: 1,
  background: disabled ? "#0a0f1a" : (active ? "#1a1200" : "#111827"),
  border: `2px solid ${disabled ? "#1e2330" : (active ? "#f59e0b" : "#1e2330")}`,
  borderRadius: 12, padding: "20px 18px", cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
});

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#1a1200 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" as const },
  badge: { display: "inline-block", background: "#2a1a00", color: "#f59e0b", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "20px 24px 60px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, padding: "0 24px 60px", maxWidth: 900, margin: "0 auto" },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  cardDesc: { color: "#6b7280", fontSize: 12 },
  catRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#111827", border: "2px solid #1e2330", borderRadius: 10, cursor: "pointer", marginBottom: 10 },
  catRowActive: { borderColor: "#f59e0b", background: "#1a1200" },
  catLabel: { fontSize: 14, fontWeight: 600 },
  catCost: { color: "#f59e0b", fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" as const },
  catNote: { color: "#6b7280", fontSize: 11, marginTop: 4 },
  formTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  label: { display: "block", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box" as const, marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#b45309", color: "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
  btnGhost: { background: "transparent", color: "#9ca3af", border: "1px solid #1e2330", borderRadius: 8, padding: "12px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 8 },
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "10px 14px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#f59e0b", fontSize: 18 },
  quoteWrap: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 12, padding: 24, marginBottom: 24 },
  quoteHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e2330", paddingBottom: 14, marginBottom: 18 },
  quoteCat: { color: "#f59e0b", fontSize: 13, fontWeight: 700 },
  quoteAmount: { fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 },
  quoteAmountSub: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  quoteRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a2030", fontSize: 13 },
  quoteRowKey: { color: "#9ca3af" },
  quoteRowVal: { color: "#e8eaf0", fontWeight: 600, fontFamily: "'DM Mono', monospace" },
  noteBox: { background: "#1a0e00", border: "1px solid #92400e40", borderRadius: 8, padding: 14, marginTop: 14, fontSize: 12, lineHeight: 1.6, color: "#fcd34d" },
  successWrap: { maxWidth: 560, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" as const },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "section" | "category" | "measures" | "follow" | "quote" | "identity" | "submitting" | "success";

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

export default function P2Home() {
  const [step, setStep] = useState<Step>("section");
  const [section, setSection] = useState<P2Section | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [surfacePlancher, setSurfacePlancher] = useState<string>("");
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [surfaceTerrainHa, setSurfaceTerrainHa] = useState<string>("");
  const [followMode, setFollowMode] = useState<FollowMode>("ON_SITE");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    commune: "", natureProjet: "",
  });
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  const selectedCategory = categories.find(c => c.code === categoryCode);
  const stepIndex = ["section", "category", "measures", "follow", "quote", "identity"].indexOf(step);

  // Load categories when section selected (skip for LOT)
  useEffect(() => {
    if (!section) return;
    if (section === "LOT") {
      setCategories([]);
      return;
    }
    fetch(`${apiBase()}/p2/categories?section=${section}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setCategories(d.items); })
      .catch(() => setError("Erreur chargement catégories"));
  }, [section]);

  // ---- Step transitions ----

  const goToCategory = (s: P2Section) => {
    setSection(s);
    setCategoryCode("");
    if (s === "LOT") setStep("measures");
    else setStep("category");
  };

  const goToMeasures = (code: string) => {
    setCategoryCode(code);
    setStep("measures");
  };

  const goToFollow = () => {
    setError("");
    if (section === "LOT") {
      if (!surfaceTerrainHa || +surfaceTerrainHa <= 0) { setError("Surface terrain en hectares requise."); return; }
      computeQuote();
      return;
    }
    if (!surfacePlancher || +surfacePlancher <= 0) { setError("Surface plancher requise."); return; }
    if (section === "GR" && (!nbBatiments || +nbBatiments < 1)) { setError("Nombre de bâtiments requis."); return; }
    setStep("follow");
  };

  const computeQuote = async () => {
    setError("");
    setStep("submitting");
    try {
      const body: any = { section, followMode };
      if (section !== "LOT") {
        body.categoryCode = categoryCode;
        body.surfacePlancherM2 = +surfacePlancher;
        body.nbBatiments = section === "GR" ? +nbBatiments : 1;
      } else {
        body.surfaceTerrainHa = +surfaceTerrainHa;
      }
      const res = await fetch(`${apiBase()}/p2/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur de calcul");
      setQuote(data);
      setStep("quote");
    } catch (e: any) {
      setError(e.message);
      setStep(section === "LOT" ? "measures" : "follow");
    }
  };

  const submitIntake = async () => {
    setError("");
    if (!identity.clientNom || !identity.clientTel) {
      setError("Nom et téléphone obligatoires.");
      return;
    }
    if (!identity.commune) {
      setError("Commune obligatoire.");
      return;
    }
    setStep("submitting");
    try {
      const sectionLabel = SECTIONS.find(s => s.id === section)?.label;
      const title = `${sectionLabel} — ${selectedCategory?.label || ""} — ${identity.commune}`.replace(/—\s+—/g, "—").trim();
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          porteType: "P2",
          gestionMode: "AUTONOME",
          sousTypeP2: section,
          commune: identity.commune,
          surfacePlancher: section !== "LOT" ? +surfacePlancher : undefined,
          natureProjet: identity.natureProjet || undefined,
          raisonSociale: identity.raisonSociale || undefined,
          rc: identity.rc || undefined,
          ice: identity.ice || undefined,
          representant: identity.representant || undefined,
          clientNom: identity.clientNom,
          clientTel: identity.clientTel,
          clientEmail: identity.clientEmail || undefined,
          title,
          lang: getStoredLang(),
          // Stocké dans payload
          source: "P2_WIZARD",
          brief: {
            sectionP2: section,
            categoryCode: categoryCode || undefined,
            categoryLabel: selectedCategory?.label,
            surfacePlancherM2: section !== "LOT" ? +surfacePlancher : undefined,
            nbBatiments: section === "GR" ? +nbBatiments : 1,
            surfaceTerrainHa: section === "LOT" ? +surfaceTerrainHa : undefined,
            followMode,
            quoteSnapshot: quote,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Erreur soumission");
      // Auto-login (magic-login post-wizard) — stocke le token pour /payment/start
      if (data.access_token) {
        try { localStorage.setItem("citurbarea.token", data.access_token); } catch {}
      }
      setDossierId(data.dossierId);
      setStep("success");
    } catch (e: any) {
      setError(e.message);
      setStep("identity");
    }
  };

  // ---- Render ----

  if (step === "submitting") {
    return <div style={S.loader}>⏳ Calcul en cours…</div>;
  }

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>Demande P2 enregistrée</div>
          <div style={S.successSub}>
            Votre projet <strong>{SECTIONS.find(s => s.id === section)?.label}</strong> a été transmis à l'équipe CITURBAREA.<br/>
            Vous recevez sous 24h un contrat type unifié à signer + le visa CROA à régler en ligne.<br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>Ref dossier : {dossierId?.slice(0, 12)}…</span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`/payment/start?dossier=${dossierId}`} style={{ background: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>💳 Payer maintenant</a>
            <a href="/portal" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>📁 Mes dossiers</a>
            <a href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "12px 16px" }}>← Accueil</a>
          </div>
        </div>
      </div>
    );
  }

  const Stepper = () => (
    <div style={S.stepper}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={stepStyle(i === stepIndex, i < stepIndex)} />
      ))}
    </div>
  );

  // ── Step 1: Section ──
  if (step === "section") {
    return (
      <div style={S.root}>
        <div style={S.hero}>
          <div style={S.badge}>PORTE P2 — PROMOTION & ÉQUIPEMENT PRIVÉ</div>
          <div style={S.title}>Quel type de projet ?</div>
          <div style={S.sub}>Choisissez votre section — pricing transparent selon barème CNOA 2021</div>
        </div>
        <div style={S.grid}>
          {SECTIONS.map(s => (
            <div key={s.id} style={cardStyle(false)} onClick={() => goToCategory(s.id)}>
              <div style={S.cardIcon}>{s.icon}</div>
              <div style={S.cardTitle}>{s.label}</div>
              <div style={S.cardDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 2: Catégorie ──
  if (step === "category") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("section")}>← Changer de section</button>
          <Stepper />
          <div style={S.formTitle}>Catégorie de projet</div>
          <div style={S.formSub}>
            Section : <strong>{SECTIONS.find(s => s.id === section)?.label}</strong> — Sélectionnez la catégorie qui correspond le mieux à votre projet.
            Le coût de construction au m² est issu du barème officiel CNOA 2021. Les honoraires seront révisés en cas de constatation d'un standing supérieur ou de demande de montée en gamme.
          </div>
          {categories.map(c => (
            <div
              key={c.code}
              style={{ ...S.catRow, ...(categoryCode === c.code ? S.catRowActive : {}) }}
              onClick={() => goToMeasures(c.code)}
            >
              <div style={{ flex: 1 }}>
                <div style={S.catLabel}>{c.label}</div>
                {c.notes && <div style={S.catNote}>⚠ {c.notes}</div>}
                {!c.photoOptionAvailable && <div style={S.catNote}>📍 Suivi physique obligatoire</div>}
              </div>
              <div style={S.catCost}>{fmtMAD(c.costPerM2)}/m²</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Step 3: Mesures ──
  if (step === "measures") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep(section === "LOT" ? "section" : "category")}>← Retour</button>
          <Stepper />
          <div style={S.formTitle}>Dimensions du projet</div>
          <div style={S.formSub}>
            {section === "LOT"
              ? "Surface du terrain à lotir / morceler en hectares (1 ha = 10 000 m²)."
              : selectedCategory?.label}
          </div>
          {error && <div style={S.err}>⚠ {error}</div>}

          {section === "LOT" ? (
            <>
              <label style={S.label}>Surface terrain (hectares)</label>
              <input type="number" step="0.1" style={S.inp} value={surfaceTerrainHa} onChange={e => setSurfaceTerrainHa(e.target.value)} placeholder="2.5" />
              <div style={{ ...S.noteBox, color: "#fcd34d" }}>
                ℹ La grille tarifaire des honoraires de lotissement est en cours de finalisation par CITURBAREA. Vous recevrez sous 24h un devis personnalisé après soumission de votre demande.
              </div>
            </>
          ) : section === "GR" ? (
            <div style={S.row2}>
              <div>
                <label style={S.label}>Surface plancher par bâtiment (m²)</label>
                <input type="number" style={S.inp} value={surfacePlancher} onChange={e => setSurfacePlancher(e.target.value)} placeholder="800" />
              </div>
              <div>
                <label style={S.label}>Nombre de bâtiments</label>
                <input type="number" min={1} style={S.inp} value={nbBatiments} onChange={e => setNbBatiments(e.target.value)} placeholder="3" />
              </div>
            </div>
          ) : (
            <>
              <label style={S.label}>Surface plancher totale (m²)</label>
              <input type="number" style={S.inp} value={surfacePlancher} onChange={e => setSurfacePlancher(e.target.value)} placeholder="350" />
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: -8, marginBottom: 16 }}>
                Surface totale de tous les niveaux (y compris sous-sol) — voir art. 4 du contrat type Construction.
              </div>
            </>
          )}

          <button style={S.btn} onClick={goToFollow}>
            {section === "LOT" ? "Continuer →" : "Suivant : mode de suivi →"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Mode de suivi ──
  if (step === "follow") {
    const photoAvail = selectedCategory?.photoOptionAvailable !== false;
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("measures")}>← Retour</button>
          <Stepper />
          <div style={S.formTitle}>Mode de suivi du chantier</div>
          <div style={S.formSub}>
            Phase C des honoraires (suivi des travaux). Source : Contrat type unifié Construction CNOA, article 7.
          </div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={followCardStyle(followMode === "ON_SITE", false)}
              onClick={() => setFollowMode("ON_SITE")}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📍</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Suivi physique</div>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>Visites sur site, PV in situ, attestations conformité</div>
              <div style={{ color: "#f59e0b", fontWeight: 700 }}>30% des honoraires</div>
            </div>
            <div
              style={followCardStyle(followMode === "PHOTOS", !photoAvail)}
              onClick={() => photoAvail && setFollowMode("PHOTOS")}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Suivi par photos</div>
              <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>1 photo par réception (gros œuvre par élément structure + second œuvre par étage)</div>
              <div style={{ color: photoAvail ? "#f59e0b" : "#6b7280", fontWeight: 700 }}>10% des honoraires</div>
              {!photoAvail && <div style={{ color: "#f87171", fontSize: 11, marginTop: 8 }}>Non disponible pour cette catégorie</div>}
            </div>
          </div>

          <button style={S.btn} onClick={computeQuote}>Calculer le devis →</button>
        </div>
      </div>
    );
  }

  // ── Step 5: Devis ──
  if (step === "quote" && quote) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep(section === "LOT" ? "measures" : "follow")}>← Modifier</button>
          <Stepper />
          <div style={S.formTitle}>Devis honoraires architecte</div>
          <div style={S.formSub}>Estimation provisoire selon barème CNOA 2021. Le montant sera révisé sur le coût réel des travaux après adjudication (art. 5 contrat type).</div>

          <div style={S.quoteWrap}>
            <div style={S.quoteHead}>
              <div>
                <div style={S.quoteCat}>{quote.meta.sectionLabel}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>{quote.meta.categoryLabel || "Tarification spécifique"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.quoteAmount}>{quote.honoraires.totalTTC != null ? fmtMAD(quote.honoraires.totalTTC) : "À devis"}</div>
                <div style={S.quoteAmountSub}>TTC honoraires architecte</div>
              </div>
            </div>

            {quote.base.coutTravauxEstime != null && (
              <div style={S.quoteRow}>
                <span style={S.quoteRowKey}>Coût travaux estimé</span>
                <span style={S.quoteRowVal}>{fmtMAD(quote.base.coutTravauxEstime)}</span>
              </div>
            )}
            {quote.honoraires.totalHT != null && (
              <>
                <div style={S.quoteRow}>
                  <span style={S.quoteRowKey}>Honoraires HT (5%)</span>
                  <span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.totalHT)}</span>
                </div>
                <div style={S.quoteRow}>
                  <span style={S.quoteRowKey}>TVA 20%</span>
                  <span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.tva)}</span>
                </div>
              </>
            )}

            {quote.honoraires.breakdown.phaseA_esquisseAutorisation != null && (
              <>
                <div style={{ ...S.quoteRow, borderTop: "1px solid #1e2330", marginTop: 14, paddingTop: 14 }}>
                  <span style={S.quoteRowKey}>Phase A — Esquisse + Autorisation (40%)</span>
                  <span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.breakdown.phaseA_esquisseAutorisation)}</span>
                </div>
                <div style={S.quoteRow}>
                  <span style={S.quoteRowKey}>Phase B — DCE + CPS (30%)</span>
                  <span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.breakdown.phaseB_dceCps)}</span>
                </div>
                <div style={S.quoteRow}>
                  <span style={S.quoteRowKey}>Phase C — Suivi ({quote.meta.followMode === "PHOTOS" ? "10% photos" : "30% physique"})</span>
                  <span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.breakdown.phaseC_suivi)}</span>
                </div>
              </>
            )}

            <div style={S.noteBox}>
              <strong>Visa CROA :</strong> {quote.visaCroa.note}
            </div>
            <div style={{ ...S.noteBox, color: "#a5b4fc", background: "#0f0f1f", borderColor: "#3730a3" }}>
              <strong>Décennale :</strong> {quote.decennale.note}
            </div>
            {quote.notes.length > 0 && (
              <div style={{ marginTop: 14, color: "#6b7280", fontSize: 11, lineHeight: 1.6 }}>
                {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
              </div>
            )}
          </div>

          <button style={S.btn} onClick={() => setStep("identity")}>Continuer : identité client →</button>
        </div>
      </div>
    );
  }

  // ── Step 6: Identité ──
  if (step === "identity") {
    const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setIdentity(prev => ({ ...prev, [k]: e.target.value }));
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("quote")}>← Retour devis</button>
          <Stepper />
          <div style={S.formTitle}>Identification du maître d'ouvrage</div>
          <div style={S.formSub}>Conformément à l'article 2 du contrat type unifié Construction CNOA — Maître d'Ouvrage.</div>

          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div>
              <label style={S.label}>Nom complet *</label>
              <input style={S.inp} value={identity.clientNom} onChange={f("clientNom")} placeholder="Prénom Nom" />
            </div>
            <div>
              <label style={S.label}>Téléphone *</label>
              <input style={S.inp} value={identity.clientTel} onChange={f("clientTel")} placeholder="+212 6XX XXX XXX" />
            </div>
          </div>
          <label style={S.label}>Email</label>
          <input style={S.inp} value={identity.clientEmail} onChange={f("clientEmail")} placeholder="contact@exemple.ma" />

          <div style={{ ...S.formSub, fontSize: 11, color: "#6b7280", marginTop: 4, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Société (si personne morale)</div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Raison sociale</label>
              <input style={S.inp} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL / SA / SNC…" />
            </div>
            <div>
              <label style={S.label}>Représentant légal</label>
              <input style={S.inp} value={identity.representant} onChange={f("representant")} placeholder="Gérant / DG" />
            </div>
          </div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>RC</label>
              <input style={S.inp} value={identity.rc} onChange={f("rc")} placeholder="12345" />
            </div>
            <div>
              <label style={S.label}>ICE</label>
              <input style={S.inp} value={identity.ice} onChange={f("ice")} placeholder="000000000000000" />
            </div>
          </div>

          <div style={{ ...S.formSub, fontSize: 11, color: "#6b7280", marginTop: 4, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Localisation projet</div>
          <label style={S.label}>Commune *</label>
          <input style={S.inp} value={identity.commune} onChange={f("commune")} placeholder="Kénitra, Rabat, Salé…" />
          <label style={S.label}>Nature du projet (optionnel)</label>
          <input style={S.inp} value={identity.natureProjet} onChange={f("natureProjet")} placeholder="Construction neuve / extension / réhabilitation…" />

          <button style={S.btn} onClick={submitIntake}>Soumettre la demande →</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
