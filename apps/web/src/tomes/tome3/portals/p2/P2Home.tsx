import React, { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang } from "../../../../i18n/i18n";

/**
 * P2Home — Porte 2 · Promotion immobilière & équipement privé
 *
 * Refonte au modèle de qualification + à l'habillage de la Porte 1
 * (thème clair navy/or, typographie Playfair, cartes de sélection).
 * La logique métier P2 est INCHANGÉE :
 *   1. Section (IMM / GR / LOT / EPIG / AMG)
 *   2. Catégorie (GET /p2/categories?section=)
 *   3. Mesures (surface plancher, nb bâtiments si GR, surface terrain ha si LOT)
 *   4. Mode de suivi (ON_SITE 30% / PHOTOS 10%)
 *   5. Devis détaillé (POST /p2/quote — barème CNOA 2021)
 *   6. Identité maître d'ouvrage → POST /p2/intake
 */

type P2Section = "IMM" | "GR" | "LOT" | "EPIG" | "AMG";
type FollowMode = "ON_SITE" | "PHOTOS";

const SECTIONS: { id: P2Section; label: string; icon: string; desc: string }[] = [
  { id: "IMM", label: "Immeuble", icon: "🏢", desc: "Construction neuve d'un immeuble (R+2 et plus, collectif ou bureaux)." },
  { id: "GR", label: "Groupement résidentiel", icon: "🏘️", desc: "Plusieurs immeubles sur un même projet (résidence, complexe)." },
  { id: "LOT", label: "Lotissement / morcellement", icon: "🗺️", desc: "Aménagement foncier — découpage de terrains (loi 25-90)." },
  { id: "EPIG", label: "Équipement privé", icon: "🏛️", desc: "Hôtel, clinique, école, mosquée, hangar, usine — intérêt général." },
  { id: "AMG", label: "Aménagement", icon: "🏪", desc: "Transformation d'un local existant (commerce, agence, show-room…)." },
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

type Step = "section" | "category" | "measures" | "follow" | "quote" | "identity" | "submitting" | "success";

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

// ── Design tokens — alignés sur la Porte 1 ────────────────────────────────
const NAVY = "#0B1B3A";
const GOLD = "#C9A227";
const GOLD_GRAD = "linear-gradient(135deg,#C9A227,#E6C75B)";
const LINE = "rgba(201,162,39,0.28)";
const INK_MUTED = "rgba(11,27,58,0.60)";
const INK_SOFT = "rgba(11,27,58,0.80)";
const SERIF = '"Playfair Display", Georgia, serif';
const PAGE_BG =
  "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.12), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.92), rgba(246,248,255,0.96))";

const CSS = `
.p2x, .p2x * { box-sizing: border-box; }
.p2x .p2card { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
.p2x .p2card:hover { transform: translateY(-3px); box-shadow: 0 22px 60px rgba(11,27,58,0.16); border-color: rgba(201,162,39,0.65); }
.p2x input:focus, .p2x textarea:focus { border-color: ${GOLD}; box-shadow: 0 0 0 4px rgba(201,162,39,0.16); }
.p2x .p2btn { transition: filter .15s ease, transform .1s ease; }
.p2x .p2btn:hover { filter: brightness(1.04); }
.p2x .p2btn:active { transform: translateY(1px); }
`;

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: PAGE_BG, color: NAVY, fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "0 0 70px" },
  hero: { textAlign: "center", padding: "64px 24px 36px", maxWidth: 760, margin: "0 auto" },
  kicker: {
    display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 15px", borderRadius: 999,
    background: "rgba(201,162,39,0.13)", border: `1px solid rgba(201,162,39,0.40)`,
    color: "#7a6010", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 18,
  },
  heroTitle: { fontFamily: SERIF, fontSize: 42, fontWeight: 700, color: NAVY, margin: "0 0 12px", lineHeight: 1.12 },
  heroSub: { fontSize: 15.5, color: INK_MUTED, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(264px,1fr))", gap: 18, maxWidth: 980, margin: "0 auto", padding: "8px 24px" },
  sectionCard: {
    background: "rgba(255,255,255,0.96)", border: `1px solid ${LINE}`, borderRadius: 16,
    padding: "26px 22px", cursor: "pointer", textAlign: "left",
    boxShadow: "0 14px 40px rgba(11,27,58,0.07)",
  },
  cardIcon: { fontSize: 30, marginBottom: 12 },
  cardTitle: { fontFamily: SERIF, fontWeight: 700, fontSize: 18, color: NAVY, marginBottom: 6 },
  cardDesc: { color: INK_MUTED, fontSize: 13, lineHeight: 1.55 },

  panelWrap: { maxWidth: 720, margin: "0 auto", padding: "36px 24px 0" },
  panel: {
    background: "rgba(255,255,255,0.96)", border: `1px solid ${LINE}`, borderRadius: 20,
    padding: "30px 30px 34px", boxShadow: "0 18px 55px rgba(11,27,58,0.10)",
  },
  back: { background: "none", border: "none", padding: 0, cursor: "pointer", color: INK_MUTED, fontSize: 13, fontFamily: "inherit", marginBottom: 18 },
  stepper: { display: "flex", gap: 6, marginBottom: 22 },
  formTitle: { fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: NAVY, margin: "0 0 8px" },
  formSub: { color: INK_MUTED, fontSize: 13.5, lineHeight: 1.6, marginBottom: 22 },

  catRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14,
    padding: "16px 18px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12,
    cursor: "pointer", marginBottom: 10,
  },
  catLabel: { fontSize: 14.5, fontWeight: 600, color: NAVY },
  catCost: { color: "#7a6010", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" },
  catNote: { color: INK_MUTED, fontSize: 11.5, marginTop: 4 },

  label: { display: "block", fontSize: 11.5, color: INK_SOFT, fontWeight: 700, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: {
    width: "100%", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12,
    color: NAVY, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", outline: "none", marginBottom: 16,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  hint: { color: INK_MUTED, fontSize: 12, lineHeight: 1.55, marginTop: -8, marginBottom: 16 },
  blockTitle: { fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "10px 0 14px" },

  btn: {
    width: "100%", background: GOLD_GRAD, color: "#3a2c00", border: "none", borderRadius: 12,
    padding: "15px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10,
  },
  err: { color: "#b91c1c", fontSize: 13, marginBottom: 14, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)", padding: "11px 14px", borderRadius: 10 },
  loader: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6010", fontSize: 17, fontWeight: 600 },

  followGrid: { display: "flex", gap: 14, flexWrap: "wrap" },
  followCard: {
    flex: 1, minWidth: 220, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "20px 18px",
  },

  quoteCard: { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: 24, marginBottom: 22 },
  quoteHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  quoteAmountBox: { background: "rgba(201,162,39,0.10)", border: `1px solid rgba(201,162,39,0.32)`, borderRadius: 12, padding: "14px 18px", textAlign: "right" },
  quoteAmount: { fontFamily: SERIF, fontSize: 32, fontWeight: 800, color: NAVY, lineHeight: 1 },
  quoteAmountSub: { color: INK_MUTED, fontSize: 11.5, marginTop: 4 },
  quoteRow: { display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid rgba(11,27,58,0.08)", fontSize: 13.5 },
  quoteKey: { color: INK_MUTED },
  quoteVal: { color: NAVY, fontWeight: 700 },
  note: { background: "rgba(201,162,39,0.09)", border: `1px solid rgba(201,162,39,0.28)`, borderRadius: 10, padding: "12px 14px", marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: "#6b5410" },

  successWrap: { maxWidth: 540, margin: "70px auto 0", padding: "40px 34px", background: "rgba(255,255,255,0.96)", border: `1px solid ${LINE}`, borderRadius: 20, textAlign: "center", boxShadow: "0 18px 55px rgba(11,27,58,0.10)" },
};

const stepBar = (active: boolean, done: boolean): React.CSSProperties => ({
  height: 5, flex: 1, borderRadius: 3,
  background: done || active ? GOLD_GRAD : "rgba(11,27,58,0.10)",
  opacity: done ? 1 : active ? 1 : 0.55,
});

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

  // Charge les catégories quand la section est choisie (sauf LOT)
  useEffect(() => {
    if (!section) return;
    if (section === "LOT") { setCategories([]); return; }
    fetch(`${apiBase()}/p2/categories?section=${section}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setCategories(d.items); })
      .catch(() => setError("Erreur chargement catégories"));
  }, [section]);

  // ── Transitions ──────────────────────────────────────────────────────
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
    if (!identity.clientNom || !identity.clientTel) { setError("Nom et téléphone obligatoires."); return; }
    if (!identity.commune) { setError("Commune obligatoire."); return; }
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

  // ── Rendu ────────────────────────────────────────────────────────────
  const Stepper = () => (
    <div style={S.stepper}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} style={stepBar(i === stepIndex, i < stepIndex)} />
      ))}
    </div>
  );

  if (step === "submitting") {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.loader}>⏳ Traitement en cours…</div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.successWrap}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
          <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
            Demande enregistrée
          </div>
          <div style={{ color: INK_MUTED, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Votre projet <strong style={{ color: NAVY }}>{SECTIONS.find(s => s.id === section)?.label}</strong> a été transmis
            à l'équipe CITURBAREA. Vous recevez sous 24h un contrat type unifié à signer + le visa CROA à régler en ligne.
            <br /><br />
            <span style={{ fontSize: 12, color: INK_MUTED }}>Réf. dossier : {dossierId?.slice(0, 12)}…</span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`/payment/start?dossier=${dossierId}`} className="p2btn"
              style={{ background: GOLD_GRAD, color: "#3a2c00", padding: "12px 22px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
              💳 Payer maintenant
            </a>
            <a href="/portal" className="p2btn"
              style={{ background: NAVY, color: "#fff", padding: "12px 22px", borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>
              📁 Mes dossiers
            </a>
            <a href="/" style={{ color: INK_MUTED, textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "12px 14px" }}>← Accueil</a>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 1 — Section ──
  if (step === "section") {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.hero}>
          <div style={S.kicker}>Porte 2 · Promotion immobilière & équipement</div>
          <h1 style={S.heroTitle}>Quel est votre projet ?</h1>
          <p style={S.heroSub}>
            Sélectionnez la nature de votre projet — tarification transparente selon le barème officiel CNOA 2021.
          </p>
        </div>
        <div style={S.grid}>
          {SECTIONS.map(s => (
            <div key={s.id} className="p2card" style={S.sectionCard} onClick={() => goToCategory(s.id)}>
              <div style={S.cardIcon}>{s.icon}</div>
              <div style={S.cardTitle}>{s.label}</div>
              <div style={S.cardDesc}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Étape 2 — Catégorie ──
  if (step === "category") {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.panelWrap}>
          <div style={S.panel}>
            <button style={S.back} onClick={() => setStep("section")}>← Changer de section</button>
            <Stepper />
            <h2 style={S.formTitle}>Catégorie de projet</h2>
            <p style={S.formSub}>
              Section : <strong style={{ color: NAVY }}>{SECTIONS.find(s => s.id === section)?.label}</strong> — sélectionnez la
              catégorie qui correspond le mieux à votre projet. Le coût de construction au m² est issu du barème officiel
              CNOA 2021. Les honoraires sont révisés en cas de constatation d'un standing supérieur.
            </p>
            {categories.map(c => (
              <div key={c.code} className="p2card" style={S.catRow} onClick={() => goToMeasures(c.code)}>
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
      </div>
    );
  }

  // ── Étape 3 — Mesures ──
  if (step === "measures") {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.panelWrap}>
          <div style={S.panel}>
            <button style={S.back} onClick={() => setStep(section === "LOT" ? "section" : "category")}>← Retour</button>
            <Stepper />
            <h2 style={S.formTitle}>Dimensions du projet</h2>
            <p style={S.formSub}>
              {section === "LOT"
                ? "Surface du terrain à lotir / morceler en hectares (1 ha = 10 000 m²)."
                : selectedCategory?.label}
            </p>
            {error && <div style={S.err}>⚠ {error}</div>}

            {section === "LOT" ? (
              <>
                <label style={S.label}>Surface terrain (hectares)</label>
                <input type="number" step="0.1" style={S.input} value={surfaceTerrainHa}
                  onChange={e => setSurfaceTerrainHa(e.target.value)} placeholder="2.5" />
                <div style={S.note}>
                  ℹ La grille tarifaire des honoraires de lotissement est en cours de finalisation par CITURBAREA.
                  Vous recevrez sous 24h un devis personnalisé après soumission de votre demande.
                </div>
              </>
            ) : section === "GR" ? (
              <div style={S.row2}>
                <div>
                  <label style={S.label}>Surface plancher / bâtiment (m²)</label>
                  <input type="number" style={S.input} value={surfacePlancher}
                    onChange={e => setSurfacePlancher(e.target.value)} placeholder="800" />
                </div>
                <div>
                  <label style={S.label}>Nombre de bâtiments</label>
                  <input type="number" min={1} style={S.input} value={nbBatiments}
                    onChange={e => setNbBatiments(e.target.value)} placeholder="3" />
                </div>
              </div>
            ) : (
              <>
                <label style={S.label}>Surface plancher totale (m²)</label>
                <input type="number" style={S.input} value={surfacePlancher}
                  onChange={e => setSurfacePlancher(e.target.value)} placeholder="350" />
                <div style={S.hint}>
                  Surface totale de tous les niveaux (y compris sous-sol) — voir art. 4 du contrat type Construction.
                </div>
              </>
            )}

            <button className="p2btn" style={S.btn} onClick={goToFollow}>
              {section === "LOT" ? "Continuer →" : "Suivant : mode de suivi →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 4 — Mode de suivi ──
  if (step === "follow") {
    const photoAvail = selectedCategory?.photoOptionAvailable !== false;
    const followCard = (active: boolean, disabled: boolean): React.CSSProperties => ({
      ...S.followCard,
      borderColor: active ? GOLD : LINE,
      background: active ? "rgba(201,162,39,0.08)" : "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    });
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.panelWrap}>
          <div style={S.panel}>
            <button style={S.back} onClick={() => setStep("measures")}>← Retour</button>
            <Stepper />
            <h2 style={S.formTitle}>Mode de suivi du chantier</h2>
            <p style={S.formSub}>
              Phase C des honoraires (suivi des travaux). Source : contrat type unifié Construction CNOA, article 7.
            </p>
            {error && <div style={S.err}>⚠ {error}</div>}

            <div style={S.followGrid}>
              <div style={followCard(followMode === "ON_SITE", false)} onClick={() => setFollowMode("ON_SITE")}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 5 }}>Suivi physique</div>
                <div style={{ color: INK_MUTED, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
                  Visites sur site, PV in situ, attestations de conformité.
                </div>
                <div style={{ color: "#7a6010", fontWeight: 800, fontSize: 13.5 }}>30 % des honoraires</div>
              </div>
              <div style={followCard(followMode === "PHOTOS", !photoAvail)}
                onClick={() => photoAvail && setFollowMode("PHOTOS")}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 5 }}>Suivi par photos</div>
                <div style={{ color: INK_MUTED, fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>
                  1 photo par réception (gros œuvre par élément de structure + second œuvre par étage).
                </div>
                <div style={{ color: photoAvail ? "#7a6010" : INK_MUTED, fontWeight: 800, fontSize: 13.5 }}>
                  10 % des honoraires
                </div>
                {!photoAvail && <div style={{ color: "#b91c1c", fontSize: 11, marginTop: 8 }}>Non disponible pour cette catégorie</div>}
              </div>
            </div>

            <button className="p2btn" style={S.btn} onClick={computeQuote}>Calculer le devis →</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 5 — Devis ──
  if (step === "quote" && quote) {
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.panelWrap}>
          <div style={S.panel}>
            <button style={S.back} onClick={() => setStep(section === "LOT" ? "measures" : "follow")}>← Modifier</button>
            <Stepper />
            <h2 style={S.formTitle}>Votre devis d'honoraires</h2>
            <p style={S.formSub}>
              Estimation provisoire selon barème CNOA 2021. Le montant sera révisé sur le coût réel des travaux après
              adjudication (art. 5 du contrat type).
            </p>

            <div style={S.quoteCard}>
              <div style={S.quoteHead}>
                <div>
                  <div style={{ color: "#7a6010", fontSize: 13, fontWeight: 700 }}>{quote.meta.sectionLabel}</div>
                  <div style={{ color: INK_MUTED, fontSize: 13, marginTop: 4 }}>
                    {quote.meta.categoryLabel || "Tarification spécifique"}
                  </div>
                </div>
                <div style={S.quoteAmountBox}>
                  <div style={S.quoteAmount}>
                    {quote.honoraires.totalTTC != null ? fmtMAD(quote.honoraires.totalTTC) : "À devis"}
                  </div>
                  <div style={S.quoteAmountSub}>TTC · honoraires architecte</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                {quote.base.coutTravauxEstime != null && (
                  <div style={S.quoteRow}>
                    <span style={S.quoteKey}>Coût travaux estimé</span>
                    <span style={S.quoteVal}>{fmtMAD(quote.base.coutTravauxEstime)}</span>
                  </div>
                )}
                {quote.honoraires.totalHT != null && (
                  <>
                    <div style={S.quoteRow}>
                      <span style={S.quoteKey}>Honoraires HT (5 %)</span>
                      <span style={S.quoteVal}>{fmtMAD(quote.honoraires.totalHT)}</span>
                    </div>
                    <div style={S.quoteRow}>
                      <span style={S.quoteKey}>TVA 20 %</span>
                      <span style={S.quoteVal}>{fmtMAD(quote.honoraires.tva)}</span>
                    </div>
                  </>
                )}
                {quote.honoraires.breakdown.phaseA_esquisseAutorisation != null && (
                  <>
                    <div style={{ ...S.quoteRow, marginTop: 8 }}>
                      <span style={S.quoteKey}>Phase A — Esquisse + Autorisation (40 %)</span>
                      <span style={S.quoteVal}>{fmtMAD(quote.honoraires.breakdown.phaseA_esquisseAutorisation)}</span>
                    </div>
                    <div style={S.quoteRow}>
                      <span style={S.quoteKey}>Phase B — DCE + CPS (30 %)</span>
                      <span style={S.quoteVal}>{fmtMAD(quote.honoraires.breakdown.phaseB_dceCps)}</span>
                    </div>
                    <div style={S.quoteRow}>
                      <span style={S.quoteKey}>
                        Phase C — Suivi ({quote.meta.followMode === "PHOTOS" ? "10 % photos" : "30 % physique"})
                      </span>
                      <span style={S.quoteVal}>{fmtMAD(quote.honoraires.breakdown.phaseC_suivi)}</span>
                    </div>
                  </>
                )}
              </div>

              <div style={S.note}><strong>Visa CROA :</strong> {quote.visaCroa.note}</div>
              <div style={{ ...S.note, background: "rgba(28,72,255,0.06)", borderColor: "rgba(28,72,255,0.22)", color: "#1e3a8a" }}>
                <strong>Décennale :</strong> {quote.decennale.note}
              </div>
              {quote.notes.length > 0 && (
                <div style={{ marginTop: 14, color: INK_MUTED, fontSize: 11.5, lineHeight: 1.65 }}>
                  {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
              )}
            </div>

            <button className="p2btn" style={S.btn} onClick={() => setStep("identity")}>
              Continuer : identité du maître d'ouvrage →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 6 — Identité ──
  if (step === "identity") {
    const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setIdentity(prev => ({ ...prev, [k]: e.target.value }));
    return (
      <div className="p2x" style={S.root}>
        <style>{CSS}</style>
        <div style={S.panelWrap}>
          <div style={S.panel}>
            <button style={S.back} onClick={() => setStep("quote")}>← Retour au devis</button>
            <Stepper />
            <h2 style={S.formTitle}>Identité du maître d'ouvrage</h2>
            <p style={S.formSub}>Conformément à l'article 2 du contrat type unifié Construction CNOA.</p>

            {error && <div style={S.err}>⚠ {error}</div>}

            <div style={S.row2}>
              <div>
                <label style={S.label}>Nom complet *</label>
                <input style={S.input} value={identity.clientNom} onChange={f("clientNom")} placeholder="Prénom Nom" />
              </div>
              <div>
                <label style={S.label}>Téléphone *</label>
                <input style={S.input} value={identity.clientTel} onChange={f("clientTel")} placeholder="+212 6XX XXX XXX" />
              </div>
            </div>
            <label style={S.label}>Email</label>
            <input style={S.input} value={identity.clientEmail} onChange={f("clientEmail")} placeholder="contact@exemple.ma" />

            <div style={S.blockTitle}>Société (si personne morale)</div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Raison sociale</label>
                <input style={S.input} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL / SA / SNC…" />
              </div>
              <div>
                <label style={S.label}>Représentant légal</label>
                <input style={S.input} value={identity.representant} onChange={f("representant")} placeholder="Gérant / DG" />
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>RC</label>
                <input style={S.input} value={identity.rc} onChange={f("rc")} placeholder="12345" />
              </div>
              <div>
                <label style={S.label}>ICE</label>
                <input style={S.input} value={identity.ice} onChange={f("ice")} placeholder="000000000000000" />
              </div>
            </div>

            <div style={S.blockTitle}>Localisation du projet</div>
            <label style={S.label}>Commune *</label>
            <input style={S.input} value={identity.commune} onChange={f("commune")} placeholder="Kénitra, Rabat, Salé…" />
            <label style={S.label}>Nature du projet (optionnel)</label>
            <input style={S.input} value={identity.natureProjet} onChange={f("natureProjet")}
              placeholder="Construction neuve / extension / réhabilitation…" />

            <button className="p2btn" style={S.btn} onClick={submitIntake}>Soumettre la demande →</button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="p2x" style={S.root}><style>{CSS}</style><div style={S.loader}>—</div></div>;
}
