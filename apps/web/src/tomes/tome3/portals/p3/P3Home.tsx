import { useEffect, useMemo, useState } from "react";
import { getStoredLang, useT } from "../../../../i18n/i18n";
import { captureFromIntake, montantDevis, submitLead, telephoneEnvoyable } from "../../../../features/lead-funnel/leadBridge";
import BudgetPrevisionnelField from "../../../../features/lead-funnel/BudgetPrevisionnelField";
import FichesPrestations from "../../../../components/fiches-prestations/FichesPrestations";
import { P3_SECTIONS, categoriesP3, computeP3Quote, sectionBareme, type P3Quote, type P3Section } from "../../../../domain/p3/quoteLocal";
import { listCorpsMetiersGrouped } from "../../../../domain/p3/corpsMetiers";

/**
 * P3Home — Wizard MOD (Maîtrise d'Ouvrage Déléguée)
 *
 * 6 étapes, toutes calculées dans le navigateur (l'API est éteinte en
 * production ; le dossier est créé par /api/intake) :
 *   1. Section projet (villa / maison, immeuble, groupement, équipement, aménagement)
 *   2. Catégorie du barème CNOA 2021 (domain/p3/quoteLocal → @citurbarea/pricing-cnoa)
 *   3. Mesures (surface plancher, nb bâtiments si GR)
 *   4. Corps de métiers à coordonner (facultatif, liste locale domain/p3/corpsMetiers)
 *   5. Estimation : 10 % du coût de réalisation (computeP3Quote)
 *   6. Identité MO + soumission (porteType:"P3")
 */

/** Textes propres à la page, absents des dictionnaires (FR / AR / EN). */
const TXT_P3: Record<"fr" | "ar" | "en", { telVide: string }> = {
  fr: { telVide: "Indiquez un numéro de téléphone pour être rappelé." },
  ar: { telVide: "يرجى إدخال رقم هاتف ليتم الاتصال بك." },
  en: { telVide: "Please enter a phone number so we can call you back." },
};

/** Rend une carte cliquable utilisable au clavier (Entrée / Espace). */
const activable = (action: () => void) => ({
  role: "button" as const,
  tabIndex: 0,
  onClick: action,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); action(); }
  },
});

/** Référentiel local des corps de métier (identique à GET /p3/corps-metiers). */
const CORPS_GROUPES = listCorpsMetiersGrouped();

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};
const cardStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#0a1a14" : "#111827",
  border: `2px solid ${active ? "#10b981" : "#1e2330"}`,
  borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "all .15s",
});
const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 30, height: 4, borderRadius: 2,
  background: done ? "#10b981" : active ? "#047857" : "#1e2330",
});

// FIX-4 — responsive: CSS injecté pour caps fluides + row2 mobile-friendly
const P3_RESPONSIVE_CSS = `
.cit-porte-p3-wrap   { max-width:1280px; width:100%; margin:0 auto; padding:20px 24px 60px; }
.cit-porte-p3-grid   { max-width:1280px; width:100%; margin:0 auto; padding:0 24px 60px; }
.cit-porte-p3-narrow { max-width:760px; width:100%; margin:80px auto; padding:40px 32px; }
.cit-porte-p3-row2   { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width:760px){
  .cit-porte-p3-wrap   { padding:16px 16px 40px; max-width:100%; }
  .cit-porte-p3-grid   { padding:0 16px 40px; max-width:100%; }
  .cit-porte-p3-narrow { margin:32px 16px; padding:24px 18px; max-width:calc(100% - 32px); }
  .cit-porte-p3-row2   { grid-template-columns:1fr; }
}
`;

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#0a1a14 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" },
  badge: { display: "inline-block", background: "#0a1a14", color: "#10b981", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: {},
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontWeight: 700, fontSize: 15, marginBottom: 4 },
  cardDesc: { color: "#6b7280", fontSize: 12 },
  catRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#111827", border: "2px solid #1e2330", borderRadius: 10, cursor: "pointer", marginBottom: 10 },
  catRowActive: { borderColor: "#10b981", background: "#0a1a14" },
  catLabel: { fontSize: 14, fontWeight: 600 },
  catCost: { color: "#10b981", fontWeight: 700, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" as const },
  formTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  label: { display: "block", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 16, width: "100%", boxSizing: "border-box", marginBottom: 14 },
  row2: {},
  btn: { background: "#047857", color: "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "10px 14px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#10b981", fontSize: 18 },
  groupeBox: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 10, padding: 14, marginBottom: 14 },
  groupeTitle: { color: "#10b981", fontWeight: 700, fontSize: 13, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  corpsCheck: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", fontSize: 13 },
  quoteWrap: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 12, padding: 24, marginBottom: 24 },
  quoteHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e2330", paddingBottom: 14, marginBottom: 18 },
  quoteCat: { color: "#10b981", fontSize: 13, fontWeight: 700 },
  quoteAmount: { fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 },
  quoteAmountSub: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  quoteRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a2030", fontSize: 13 },
  quoteRowKey: { color: "#9ca3af" },
  quoteRowVal: { color: "#e8eaf0", fontWeight: 600, fontFamily: "'DM Mono', monospace" },
  noteBox: { background: "#0a1a14", border: "1px solid #10b98140", borderRadius: 8, padding: 14, marginTop: 14, fontSize: 12, lineHeight: 1.6, color: "#a7f3d0" },
  successWrap: { background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "section" | "category" | "measures" | "corps" | "quote" | "identity" | "submitting" | "success";

export default function P3Home() {
  const t = useT();
  const [step, setStep] = useState<Step>("section");
  const [section, setSection] = useState<P3Section | null>(null);
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [surfacePlancher, setSurfacePlancher] = useState<string>("");
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [selectedCorps, setSelectedCorps] = useState<Set<string>>(new Set());
  const [quote, setQuote] = useState<P3Quote | null>(null);
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    commune: "", natureProjet: "",
  });
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);
  // Budget prévisionnel de construction déclaré (facultatif) — jamais les honoraires.
  const [budgetPrev, setBudgetPrev] = useState<number | null>(null);

  const stepIndex = ["section", "category", "measures", "corps", "quote", "identity"].indexOf(step);
  // Catégories du barème pour la section choisie (remplace GET /p2/categories).
  const categories = useMemo(() => (section ? categoriesP3(section) : []), [section]);
  const selectedCategory = categories.find(c => c.code === categoryCode);
  const sectionLabel = section ? t(`portes.p3.section.${section}.label`) : "";
  const corpsGroupes = CORPS_GROUPES;

  // Champ en erreur à l'étape identité (message sous le champ, focus dessus).
  const [errField, setErrField] = useState<{ field: string; n: number } | null>(null);
  const txt = TXT_P3[getStoredLang()] || TXT_P3.fr;

  // Focus + défilement sur le champ invalide signalé.
  useEffect(() => {
    if (!errField || step !== "identity") return;
    const el = document.getElementById(`p3f_${errField.field}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [errField?.n, step]);

  // Le message disparaît dès que le champ signalé devient valide.
  useEffect(() => {
    if (!errField) return;
    const ok = errField.field === "nom" ? identity.clientNom.trim().length >= 2
      : errField.field === "tel" ? !!telephoneEnvoyable(identity.clientTel)
      : errField.field === "commune" ? !!identity.commune.trim() : false;
    if (ok) { setErrField(null); setError(""); }
  }, [identity, errField]);

  const errSous = (field: string) =>
    errField?.field === field && error
      ? <div id={`p3f_${field}_err`} role="alert" style={{ ...S.err, marginTop: -8 }}>⚠ {error}</div>
      : null;
  const erreurSur = (field: string) =>
    errField?.field === field ? { "aria-invalid": true, "aria-describedby": `p3f_${field}_err` } : {};

  const toggleCorps = (slug: string) => {
    setSelectedCorps(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  // Mesures validées avant les corps de métier : l'estimation en dépend.
  const measuresContinue = () => {
    setError("");
    if (!surfacePlancher || +surfacePlancher <= 0) { setError(t("portes.p3.err.surface_required")); return; }
    setStep("corps");
  };

  // Estimation calculée localement (même règle que POST /p3/quote).
  const computeQuote = () => {
    setError("");
    if (!section) { setStep("section"); return; }
    if (!surfacePlancher || +surfacePlancher <= 0) { setError(t("portes.p3.err.surface_required")); setStep("measures"); return; }
    try {
      setQuote(computeP3Quote({
        section, categoryCode,
        surfacePlancherM2: +surfacePlancher,
        nbBatiments: section === "GR" ? +nbBatiments : 1,
      }));
      setStep("quote");
    } catch {
      setError(t("portes.p3.err.generic"));
    }
  };

  const submit = async () => {
    setError("");
    const signaler = (field: string, msg: string) => { setError(msg); setErrField({ field, n: Date.now() }); };
    if (identity.clientNom.trim().length < 2) { signaler("nom", t("portes.p3.err.name_phone")); return; }
    if (!telephoneEnvoyable(identity.clientTel)) {
      signaler("tel", identity.clientTel.trim() ? t("lead.porte.err_contact") : txt.telVide);
      return;
    }
    if (!identity.commune.trim()) { signaler("commune", t("portes.p3.err.commune")); return; }
    setErrField(null);
    setStep("submitting");
    const title = t("portes.p3.recap.title_label", {
      section: sectionLabel,
      category: selectedCategory?.label ?? "",
      commune: identity.commune,
    });
    const payload = {
      porteType: "P3", gestionMode: "DELEGUE",
      commune: identity.commune,
      surfacePlancher: +surfacePlancher,
      natureProjet: identity.natureProjet || undefined,
      raisonSociale: identity.raisonSociale || undefined,
      rc: identity.rc || undefined, ice: identity.ice || undefined,
      representant: identity.representant || undefined,
      clientNom: identity.clientNom, clientTel: identity.clientTel,
      clientEmail: identity.clientEmail || undefined,
      title, source: "P3_WIZARD", lang: getStoredLang(),
      brief: {
        // Section du barème (API) + section affichée (VILLA n'existe pas côté API).
        section: section ? sectionBareme(section) : undefined,
        sectionP3: section || undefined,
        categoryCode,
        categoryLabel: selectedCategory?.label || undefined,
        surfacePlancherM2: +surfacePlancher,
        nbBatiments: section === "GR" ? +nbBatiments : 1,
        corpsMetiers: Array.from(selectedCorps),
        budgetPrevisionnelMAD: budgetPrev ?? undefined,
        quoteSnapshot: quote,
      },
    };
    // Point de sortie unique : capture d'abord (sans API), dossier si l'API répond.
    const { key, body } = captureFromIntake("P3", payload, { budget: budgetPrev, honoraires: montantDevis(quote) });
    const envoi = submitLead({ key, capture: body, intake: payload });
    const res = await envoi.intake;
    if (res) {
      if (res.accessToken) { try { localStorage.setItem("citurbarea.token", res.accessToken); } catch {} }
      setDossierId(res.dossierId || null);
      setStep("success");
      return;
    }
    const cap = await envoi.capture;
    if (cap.status === "invalid") {
      setError(cap.code === "phone_invalid" ? t("lead.porte.err_contact") : t("lead.err.generic"));
      if (cap.code === "phone_invalid") setErrField({ field: "tel", n: Date.now() });
      setStep("identity");
      return;
    }
    setDossierId(null);
    setStep("success");
  };

  if (step === "submitting") return <div style={S.loader}>{t("portes.p3.loader.calc")}</div>;

  // Succès sans dossier (API absente) : demande confirmée, sans espace client promis.
  if (step === "success" && !dossierId) {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-narrow" style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>{t("lead.porte.success_title")}</div>
          <div style={S.successSub}>{t("lead.porte.success_body")}<br />{t("lead.porte.quote_later")}</div>
          <a href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("lead.porte.home")}</a>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-narrow" style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>{t("portes.p3.recap.success_title")}</div>
          <div style={S.successSub}>
            <span dangerouslySetInnerHTML={{ __html: t("portes.p3.recap.success_body", { n: selectedCorps.size }) }} />
            <br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{t("portes.p3.recap.ref_dossier")} {dossierId?.slice(0, 12)}…</span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/rendez-vous" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>{t("portes.p3.recap.my_dossiers")}</a>
            <a href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "12px 16px" }}>{t("portes.p3.recap.home")}</a>
          </div>
        </div>
      </div>
    );
  }

  const Stepper = () => (
    <div style={S.stepper}>{[0,1,2,3,4,5].map(i => <div key={i} style={stepStyle(i === stepIndex, i < stepIndex)} />)}</div>
  );

  if (step === "section") {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div style={S.hero}>
          <div style={S.badge}>{t("portes.p3.title_prefix")} — {t("p3.home_title").toUpperCase()}</div>
          <h1 style={{ ...S.title, marginTop: 0, lineHeight: 1.2 }}>{t("p3.home_title")}</h1>
          <p style={{ ...S.sub, marginTop: 0 }}>{t("p3.home_subtitle")}</p>
        </div>
        <section className="cit-porte-p3-wrap" style={{ background: "#f8fafc", color: "#1a2540", borderRadius: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: "#1e3a5f" }}>{t("portes.p3.fiches.section_title")}</h2>
          <p style={{ color: "#4a5568", fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>{t("portes.p3.fiches.section_sub")}</p>
          <FichesPrestations porte="P3" />
        </section>
        <div className="cit-porte-p3-grid" style={S.grid}>
          {P3_SECTIONS.map(id => (
            <button key={id} type="button"
              style={{ ...cardStyle(false), color: "inherit", font: "inherit", textAlign: "left", width: "100%" }}
              onClick={() => { setSection(id); setStep("category"); }}>
              <div style={S.cardIcon} aria-hidden="true">{t(`portes.p3.section.${id}.icon`)}</div>
              <div style={S.cardTitle}>{t(`portes.p3.section.${id}.label`)}</div>
              <div style={S.cardDesc}>{t(`portes.p3.section.${id}.desc`)}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "category") {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-wrap">
          <button style={S.btnBack} onClick={() => setStep("section")}>{t("portes.p3.change_section")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.category.title")}</div>
          <div style={S.formSub} dangerouslySetInnerHTML={{ __html: t("portes.p3.category.sub", { section: `<strong>${sectionLabel}</strong>` }) }} />
          {categories.map(c => (
            <div key={c.code} style={{ ...S.catRow, ...(categoryCode === c.code ? S.catRowActive : {}) }} {...activable(() => { setCategoryCode(c.code); setStep("measures"); })}>
              <div style={{ flex: 1 }}>
                <div style={S.catLabel}>{c.label}</div>
                {c.notes && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>⚠ {c.notes}</div>}
              </div>
              <div style={S.catCost}>{fmtMAD(c.costPerM2)}/m²</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "measures") {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-wrap">
          <button style={S.btnBack} onClick={() => setStep("category")}>{t("portes.p3.back")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.measures.title")}</div>
          <div style={S.formSub}>{selectedCategory?.label}</div>
          {section === "GR" ? (
            <div className="cit-porte-p3-row2">
              <div>
                <label style={S.label}>{t("portes.p3.measures.surface_per_bldg")}</label>
                <input type="number" style={S.inp} value={surfacePlancher} onChange={e => { setSurfacePlancher(e.target.value); setError(""); }} placeholder={t("portes.p3.measures.surface_per_bldg_ph")} />
              </div>
              <div>
                <label style={S.label}>{t("portes.p3.measures.nb_bldg")}</label>
                <input type="number" min={1} style={S.inp} value={nbBatiments} onChange={e => setNbBatiments(e.target.value)} placeholder={t("portes.p3.measures.nb_bldg_ph")} />
              </div>
            </div>
          ) : (
            <>
              <label style={S.label}>{t("portes.p3.measures.surface_total")}</label>
              <input type="number" style={S.inp} value={surfacePlancher} onChange={e => { setSurfacePlancher(e.target.value); setError(""); }} placeholder={t("portes.p3.measures.surface_ph")} />
            </>
          )}
          {error && <div style={S.err} role="alert">⚠ {error}</div>}
          <button style={S.btn} onClick={measuresContinue}>{t("portes.p3.measures.next_corps")}</button>
        </div>
      </div>
    );
  }

  if (step === "corps") {
    const totalCorps = corpsGroupes.reduce((a, g) => a + g.items.length, 0);
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-wrap">
          <button style={S.btnBack} onClick={() => setStep("measures")}>{t("portes.p3.back_measures")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.corps.title")}</div>
          <div style={S.formSub} dangerouslySetInnerHTML={{ __html: t("portes.p3.corps.progress", { n: `<strong>${selectedCorps.size}</strong>`, total: `<strong>${totalCorps}</strong>` }) }} />
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 14 }}>{t("portes.p3.corps.optional")}</div>

          {corpsGroupes.map(g => (
            <div key={g.groupe} style={S.groupeBox}>
              <div style={S.groupeTitle}>{g.label} ({g.items.length})</div>
              {g.items.map(c => (
                <label key={c.slug} style={{ ...S.corpsCheck, color: selectedCorps.has(c.slug) ? "#a7f3d0" : "#cbd5e1" }}>
                  <input type="checkbox" checked={selectedCorps.has(c.slug)} onChange={() => toggleCorps(c.slug)} />
                  <span style={{ flex: 1 }}>
                    {c.lotNumero && <span style={{ color: "#6b7280", marginRight: 6 }}>[{c.lotNumero}]</span>}
                    {c.label}
                    {c.obligatoireQualification && <span style={{ color: "#fcd34d", fontSize: 10, marginLeft: 6 }}>{t("portes.p3.corps.qualif_required")}</span>}
                  </span>
                </label>
              ))}
            </div>
          ))}

          <button style={S.btn} onClick={computeQuote}>{t("portes.p3.corps.compute_btn")}</button>
        </div>
      </div>
    );
  }

  if (step === "quote" && quote) {
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-wrap">
          <button style={S.btnBack} onClick={() => setStep("corps")}>{t("portes.p3.modify")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.quote.title")}</div>
          <div style={S.formSub}>{t("portes.p3.quote.sub")}</div>

          <div style={S.quoteWrap}>
            <div style={S.quoteHead}>
              <div>
                <div style={S.quoteCat}>{quote.meta.categoryLabel}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
                  {quote.base.surfacePlancherM2} m² × {fmtMAD(quote.base.coutConstructionM2)}/m² {quote.base.nbBatiments > 1 ? `× ${quote.base.nbBatiments} bât.` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.quoteAmount}>{fmtMAD(quote.honoraires.totalTTC)}</div>
                <div style={S.quoteAmountSub}>{t("portes.p3.quote.ttc")}</div>
              </div>
            </div>

            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p3.quote.cost_realisation")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.base.coutRealisation)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p3.quote.honoraires_10")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.totalHT)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p3.quote.tva_20")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.honoraires.tva)}</span></div>

            <div style={{ marginTop: 18 }}>
              <div style={{ ...S.quoteRowKey, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("portes.p3.quote.services_included")}</div>
              {quote.services.map((s, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "4px 0" }}>✓ {s}</div>
              ))}
            </div>

            <div style={S.noteBox}>
              <strong>{t("portes.p3.quote.escrow_label")}</strong> {quote.escrow.notice}
            </div>

            <div style={{ marginTop: 14, color: "#6b7280", fontSize: 11, lineHeight: 1.6 }}>
              <div>• {t("portes.p3.quote.local_note")}</div>
              {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
            </div>

            {selectedCorps.size > 0 && (
              <div style={{ marginTop: 14, color: "#9ca3af", fontSize: 12 }}>
                {t("portes.p3.quote.coordination_count", { n: selectedCorps.size })}
              </div>
            )}
          </div>

          <button style={S.btn} onClick={() => setStep("identity")}>{t("portes.p3.quote.continue_identity")}</button>
        </div>
      </div>
    );
  }

  if (step === "identity") {
    const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setIdentity(prev => ({ ...prev, [k]: e.target.value }));
    return (
      <div style={S.root}>
        <style>{P3_RESPONSIVE_CSS}</style>
        <div className="cit-porte-p3-wrap">
          <button style={S.btnBack} onClick={() => setStep(quote ? "quote" : "corps")}>{quote ? t("portes.p3.back_estimate") : t("portes.p3.back")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.identity.title")}</div>
          <div style={S.formSub}>{t("portes.p3.identity.sub_light")}</div>
          {quote && (
            <div style={{ ...S.noteBox, marginTop: 0, marginBottom: 18 }}>
              {quote.meta.categoryLabel} — <strong>{fmtMAD(quote.honoraires.totalTTC)}</strong> {t("portes.p3.quote.ttc")}
            </div>
          )}
          {error && !errField && <div style={S.err} role="alert">⚠ {error}</div>}

          <div className="cit-porte-p3-row2">
            <div>
              <label htmlFor="p3f_nom" style={S.label}>{t("portes.p3.identity.fullname")}</label>
              <input id="p3f_nom" style={S.inp} autoComplete="name" value={identity.clientNom} onChange={f("clientNom")} placeholder={t("portes.p3.identity.fullname_ph")} {...erreurSur("nom")} />
              {errSous("nom")}
            </div>
            <div>
              <label htmlFor="p3f_tel" style={S.label}>{t("portes.p3.identity.phone")}</label>
              <input id="p3f_tel" style={S.inp} type="tel" inputMode="tel" autoComplete="tel" value={identity.clientTel} onChange={f("clientTel")} placeholder={t("portes.p3.identity.phone_ph")} {...erreurSur("tel")} />
              {errSous("tel")}
            </div>
          </div>
          <label htmlFor="p3f_email" style={S.label}>{t("portes.p3.identity.email")}</label>
          <input id="p3f_email" style={S.inp} type="email" inputMode="email" autoComplete="email" value={identity.clientEmail} onChange={f("clientEmail")} placeholder={t("portes.p3.identity.email_ph")} />
          <label htmlFor="p3f_commune" style={S.label}>{t("portes.p3.identity.commune")}</label>
          <input id="p3f_commune" style={S.inp} autoComplete="address-level2" value={identity.commune} onChange={e => setIdentity({...identity, commune: e.target.value})} placeholder={t("portes.p3.identity.commune_ph")} {...erreurSur("commune")} />
          {errSous("commune")}
          <details style={{ marginBottom: 14 }}>
            <summary style={{ cursor: "pointer", color: "#9ca3af", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t("portes.p3.identity.company_toggle")}</summary>
          <div className="cit-porte-p3-row2">
            <div><label style={S.label}>{t("portes.p3.identity.raison")}</label><input style={S.inp} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
            <div><label style={S.label}>{t("portes.p3.identity.representant")}</label><input style={S.inp} value={identity.representant} onChange={f("representant")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
          </div>
          <div className="cit-porte-p3-row2">
            <div><label style={S.label}>{t("portes.p3.identity.rc")}</label><input style={S.inp} value={identity.rc} onChange={f("rc")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
            <div><label style={S.label}>{t("portes.p3.identity.ice")}</label><input style={S.inp} value={identity.ice} onChange={f("ice")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
          </div>
          </details>
          <label htmlFor="p3f_nature" style={S.label}>{t("portes.p3.identity.nature")}</label>
          <input id="p3f_nature" style={S.inp} value={identity.natureProjet} onChange={e => setIdentity({...identity, natureProjet: e.target.value})} placeholder={t("portes.p3.identity.nature_ph")} />
          <BudgetPrevisionnelField
            surfaceM2={+surfacePlancher > 0 ? +surfacePlancher * (section === "GR" ? Math.max(1, +nbBatiments || 1) : 1) : null}
            value={budgetPrev}
            onChange={setBudgetPrev}
            labelStyle={S.label}
            controlStyle={S.inp}
            helpStyle={{ color: "#9ca3af", marginTop: -6 }}
          />

          <button style={S.btn} onClick={submit}>{t("portes.p3.identity.submit")}</button>
          <p style={{ color: "#9ca3af", fontSize: 12.5, lineHeight: 1.5, marginTop: 12 }}>{t("lead.legal")}</p>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
