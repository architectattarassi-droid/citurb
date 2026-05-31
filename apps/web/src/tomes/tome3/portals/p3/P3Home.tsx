import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang, useT } from "../../../../i18n/i18n";

/**
 * P3Home — Wizard MOD (Maîtrise d'Ouvrage Déléguée)
 *
 * 6 étapes:
 *   1. Section projet (IMM/GR/EPIG/AMG — réutilise barème P2)
 *   2. Catégorie (depuis /p2/categories?section=...)
 *   3. Mesures (surface plancher, nb bâtiments si GR)
 *   4. Corps de métiers à coordonner (multi-select groupé, 40+ corps)
 *   5. Devis détaillé (POST /p3/quote — 10% du coût de réalisation)
 *   6. Identité MO + soumission via /p2/intake (porteType:"P3")
 */

type P3Section = "IMM" | "GR" | "EPIG" | "AMG";

const SECTION_IDS: P3Section[] = ["IMM", "GR", "EPIG", "AMG"];

type Category = { code: string; label: string; costPerM2: number; photoOptionAvailable: boolean; notes?: string };
type CorpsMetier = { slug: string; label: string; groupe: string; lotNumero?: string; obligatoireQualification?: boolean; notes?: string };
type CorpsGroupe = { groupe: string; label: string; items: CorpsMetier[] };
type Quote = {
  ok: true;
  meta: { porte: string; category: string; categoryLabel: string; section: string };
  base: { surfacePlancherM2: number; nbBatiments: number; coutConstructionM2: number; coutRealisation: number };
  honoraires: { rate: number; ratePct: string; totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  escrow: { platformOnly: boolean; notice: string };
  services: string[];
  notes: string[];
};

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

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#0a1a14 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" },
  badge: { display: "inline-block", background: "#0a1a14", color: "#10b981", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: { maxWidth: 760, margin: "0 auto", padding: "20px 24px 60px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, padding: "0 24px 60px", maxWidth: 900, margin: "0 auto" },
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
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
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
  successWrap: { maxWidth: 560, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "section" | "category" | "measures" | "corps" | "quote" | "identity" | "submitting" | "success";

export default function P3Home() {
  const t = useT();
  const [step, setStep] = useState<Step>("section");
  const [section, setSection] = useState<P3Section | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [surfacePlancher, setSurfacePlancher] = useState<string>("");
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [corpsGroupes, setCorpsGroupes] = useState<CorpsGroupe[]>([]);
  const [selectedCorps, setSelectedCorps] = useState<Set<string>>(new Set());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    commune: "", natureProjet: "",
  });
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  const stepIndex = ["section", "category", "measures", "corps", "quote", "identity"].indexOf(step);
  const selectedCategory = categories.find(c => c.code === categoryCode);
  const sectionLabel = section ? t(`portes.p3.section.${section}.label`) : "";

  useEffect(() => {
    fetch(`${apiBase()}/p3/corps-metiers`).then(r => r.json())
      .then(d => { if (d.ok) setCorpsGroupes(d.groupes); })
      .catch(() => setError(t("portes.p3.err.load_corps")));
  }, [t]);

  useEffect(() => {
    if (!section) return;
    fetch(`${apiBase()}/p2/categories?section=${section}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setCategories(d.items); });
  }, [section]);

  const toggleCorps = (slug: string) => {
    setSelectedCorps(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const computeQuote = async () => {
    setError("");
    if (!surfacePlancher || +surfacePlancher <= 0) { setError(t("portes.p3.err.surface_required")); return; }
    setStep("submitting");
    try {
      const res = await fetch(`${apiBase()}/p3/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section, categoryCode,
          surfacePlancherM2: +surfacePlancher,
          nbBatiments: section === "GR" ? +nbBatiments : 1,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || t("portes.p3.err.generic"));
      setQuote(data);
      setStep("quote");
    } catch (e: any) { setError(e.message); setStep("corps"); }
  };

  const submit = async () => {
    setError("");
    if (!identity.clientNom || !identity.clientTel) { setError(t("portes.p3.err.name_phone")); return; }
    if (!identity.commune) { setError(t("portes.p3.err.commune")); return; }
    setStep("submitting");
    try {
      const title = t("portes.p3.recap.title_label", {
        section: sectionLabel,
        category: selectedCategory?.label ?? "",
        commune: identity.commune,
      });
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
            section, categoryCode,
            categoryLabel: selectedCategory?.label,
            surfacePlancherM2: +surfacePlancher,
            nbBatiments: section === "GR" ? +nbBatiments : 1,
            corpsMetiers: Array.from(selectedCorps),
            quoteSnapshot: quote,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || t("portes.p3.err.submit"));
      if (data.access_token) { try { localStorage.setItem("citurbarea.token", data.access_token); } catch {} }
      setDossierId(data.dossierId);
      setStep("success");
    } catch (e: any) { setError(e.message); setStep("identity"); }
  };

  if (step === "submitting") return <div style={S.loader}>{t("portes.p3.loader.calc")}</div>;

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>{t("portes.p3.recap.success_title")}</div>
          <div style={S.successSub}>
            <span dangerouslySetInnerHTML={{ __html: t("portes.p3.recap.success_body", { n: selectedCorps.size }) }} />
            <br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{t("portes.p3.recap.ref_dossier")} {dossierId?.slice(0, 12)}…</span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`/payment/start?dossier=${dossierId}`} style={{ background: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>{t("portes.p3.recap.pay_acompte")}</a>
            <a href="/portal" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>{t("portes.p3.recap.my_dossiers")}</a>
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
        <div style={S.hero}>
          <div style={S.badge}>{t("portes.p3.title_prefix")} — {t("p3.home_title").toUpperCase()}</div>
          <div style={S.title}>{t("p3.home_title")}</div>
          <div style={S.sub}>{t("p3.home_subtitle")}</div>
        </div>
        <div style={S.grid}>
          {SECTION_IDS.map(id => (
            <div key={id} style={cardStyle(false)} onClick={() => { setSection(id); setStep("category"); }}>
              <div style={S.cardIcon}>{t(`portes.p3.section.${id}.icon`)}</div>
              <div style={S.cardTitle}>{t(`portes.p3.section.${id}.label`)}</div>
              <div style={S.cardDesc}>{t(`portes.p3.section.${id}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "category") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("section")}>{t("portes.p3.change_section")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.category.title")}</div>
          <div style={S.formSub} dangerouslySetInnerHTML={{ __html: t("portes.p3.category.sub", { section: `<strong>${sectionLabel}</strong>` }) }} />
          {categories.map(c => (
            <div key={c.code} style={{ ...S.catRow, ...(categoryCode === c.code ? S.catRowActive : {}) }} onClick={() => { setCategoryCode(c.code); setStep("measures"); }}>
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
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("category")}>{t("portes.p3.back")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.measures.title")}</div>
          <div style={S.formSub}>{selectedCategory?.label}</div>
          {section === "GR" ? (
            <div style={S.row2}>
              <div>
                <label style={S.label}>{t("portes.p3.measures.surface_per_bldg")}</label>
                <input type="number" style={S.inp} value={surfacePlancher} onChange={e => setSurfacePlancher(e.target.value)} placeholder={t("portes.p3.measures.surface_per_bldg_ph")} />
              </div>
              <div>
                <label style={S.label}>{t("portes.p3.measures.nb_bldg")}</label>
                <input type="number" min={1} style={S.inp} value={nbBatiments} onChange={e => setNbBatiments(e.target.value)} placeholder={t("portes.p3.measures.nb_bldg_ph")} />
              </div>
            </div>
          ) : (
            <>
              <label style={S.label}>{t("portes.p3.measures.surface_total")}</label>
              <input type="number" style={S.inp} value={surfacePlancher} onChange={e => setSurfacePlancher(e.target.value)} placeholder={t("portes.p3.measures.surface_ph")} />
            </>
          )}
          <button style={S.btn} onClick={() => setStep("corps")}>{t("portes.p3.measures.next_corps")}</button>
        </div>
      </div>
    );
  }

  if (step === "corps") {
    const totalCorps = corpsGroupes.reduce((a, g) => a + g.items.length, 0);
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("measures")}>{t("portes.p3.back_measures")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.corps.title")}</div>
          <div style={S.formSub} dangerouslySetInnerHTML={{ __html: t("portes.p3.corps.progress", { n: `<strong>${selectedCorps.size}</strong>`, total: `<strong>${totalCorps}</strong>` }) }} />
          {error && <div style={S.err}>⚠ {error}</div>}

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
        <div style={S.wrap}>
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
              {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
            </div>

            <div style={{ marginTop: 14, color: "#9ca3af", fontSize: 12 }}>
              {t("portes.p3.quote.coordination_count", { n: selectedCorps.size })}
            </div>
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
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("quote")}>{t("portes.p3.back_quote")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p3.identity.title")}</div>
          <div style={S.formSub}>{t("portes.p3.identity.sub")}</div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p3.identity.fullname")}</label><input style={S.inp} value={identity.clientNom} onChange={f("clientNom")} placeholder={t("portes.p3.identity.fullname_ph")} /></div>
            <div><label style={S.label}>{t("portes.p3.identity.phone")}</label><input style={S.inp} value={identity.clientTel} onChange={f("clientTel")} placeholder={t("portes.p3.identity.phone_ph")} /></div>
          </div>
          <label style={S.label}>{t("portes.p3.identity.email")}</label>
          <input style={S.inp} value={identity.clientEmail} onChange={f("clientEmail")} placeholder={t("portes.p3.identity.email_ph")} />
          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p3.identity.raison")}</label><input style={S.inp} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
            <div><label style={S.label}>{t("portes.p3.identity.representant")}</label><input style={S.inp} value={identity.representant} onChange={f("representant")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p3.identity.rc")}</label><input style={S.inp} value={identity.rc} onChange={f("rc")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
            <div><label style={S.label}>{t("portes.p3.identity.ice")}</label><input style={S.inp} value={identity.ice} onChange={f("ice")} placeholder={t("portes.p3.identity.dash_ph")} /></div>
          </div>
          <label style={S.label}>{t("portes.p3.identity.commune")}</label>
          <input style={S.inp} value={identity.commune} onChange={e => setIdentity({...identity, commune: e.target.value})} placeholder={t("portes.p3.identity.commune_ph")} />
          <label style={S.label}>{t("portes.p3.identity.nature")}</label>
          <input style={S.inp} value={identity.natureProjet} onChange={e => setIdentity({...identity, natureProjet: e.target.value})} placeholder={t("portes.p3.identity.nature_ph")} />

          <button style={S.btn} onClick={submit}>{t("portes.p3.identity.submit")}</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
