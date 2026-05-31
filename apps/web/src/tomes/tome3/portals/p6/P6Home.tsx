import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang, useT } from "../../../../i18n/i18n";

/**
 * P6Home — Onboarding réseau prestataires & fournisseurs
 *
 * Path A — Entreprise prestataire de services:
 *   1. Type fiche (PRESTATAIRE_SERVICE / FOURNISSEUR_MATERIAUX)
 *   2. Identité société + classe BTP + agréments
 *   3. Documents (case à cocher pour preuve fournie)
 *   4. Préview score CITURBAREA L7
 *   5. Identité contact + soumission via /p2/intake (porteType:"P6")
 *
 * Path B — Fournisseur matériaux: identité simplifiée + spécialité (catalogue
 * matériaux à compléter en P6.2 dans l'espace prestataire).
 */

type P6Type = "PRESTATAIRE_SERVICE" | "FOURNISSEUR_MATERIAUX";

type P6TypeDef = { code: P6Type; label: string; desc: string; fields: string[] };
type ClasseBTP = { code: string; label: string; caRange: string; level: string };
type CategorieAgrement = { code: string; label: string; desc: string; subTypes: string[] };
type DocReq = { slug: string; label: string; obligatoire: boolean; notes?: string };

type ScoreResult = {
  ok: true;
  score: number;
  tier: "GOLD" | "SILVER" | "BRONZE" | "INSUFFICIENT";
  status: string;
  breakdown: { classe: number; agrement: number; documents: number; assurances: number; references: number; anciennete: number };
  missingDocuments: string[];
  warnings: string[];
  recommendations: string[];
};

const TIER_COLORS: Record<string, string> = {
  GOLD: "#fbbf24", SILVER: "#94a3b8", BRONZE: "#a16207", INSUFFICIENT: "#ef4444",
};

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};
const cardStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#1a0a1a" : "#111827",
  border: `2px solid ${active ? "#dc2626" : "#1e2330"}`,
  borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "all .15s",
});
const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 30, height: 4, borderRadius: 2,
  background: done ? "#dc2626" : active ? "#7f1d1d" : "#1e2330",
});

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#1a0a0a 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" },
  badge: { display: "inline-block", background: "#1a0a0a", color: "#f87171", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: { maxWidth: 760, margin: "0 auto", padding: "20px 24px 60px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, padding: "0 24px 60px", maxWidth: 1000, margin: "0 auto" },
  cardIcon: { fontSize: 36, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  cardDesc: { color: "#9ca3af", fontSize: 13, marginBottom: 12 },
  formTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  label: { display: "block", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "10px 14px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#dc2626", fontSize: 18 },
  classRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#111827", border: "2px solid #1e2330", borderRadius: 8, cursor: "pointer", marginBottom: 8 },
  classRowActive: { borderColor: "#dc2626", background: "#1a0a0a" },
  docRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: 13 },
  scoreWrap: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 12, padding: 24, marginBottom: 24 },
  scoreHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e2330", paddingBottom: 14, marginBottom: 18 },
  scoreVal: { fontSize: 56, fontWeight: 800, fontFamily: "'DM Mono', monospace", lineHeight: 1 },
  scoreSub: { fontSize: 12, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  successWrap: { maxWidth: 560, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "type" | "identite" | "classement" | "docs" | "score" | "contact" | "submitting" | "success";

export default function P6Home() {
  const t = useT();
  const [step, setStep] = useState<Step>("type");
  const [types, setTypes] = useState<P6TypeDef[]>([]);
  const [classes, setClasses] = useState<ClasseBTP[]>([]);
  const [categories, setCategories] = useState<CategorieAgrement[]>([]);
  const [docsList, setDocsList] = useState<{ PRESTATAIRE_SERVICE: DocReq[]; FOURNISSEUR_MATERIAUX: DocReq[] } | null>(null);

  const [type, setType] = useState<P6Type | null>(null);
  const [identite, setIdentite] = useState({
    raisonSociale: "", rc: "", ice: "", patente: "", commune: "",
    representant: "", clientNom: "", clientTel: "", clientEmail: "",
    ancienneteAnnees: "",
    nbReferences: "", nbPhotosChantiers: "",
    nbMateriauxCatalogue: "", zonesFourniture: "",
  });
  const [classeBTP, setClasseBTP] = useState<string>("");
  const [categoriesAgrement, setCategoriesAgrement] = useState<Set<string>>(new Set());
  const [agrementMetleNumero, setAgrementMetleNumero] = useState("");
  const [agrementMetleValidite, setAgrementMetleValidite] = useState("");
  const [decennaleValide, setDecennaleValide] = useState(false);
  const [rcProValide, setRcProValide] = useState(false);
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${apiBase()}/p6/types`).then(r => r.json()),
      fetch(`${apiBase()}/p6/classes-btp`).then(r => r.json()),
      fetch(`${apiBase()}/p6/categories-agrement`).then(r => r.json()),
      fetch(`${apiBase()}/p6/documents-requis`).then(r => r.json()),
    ]).then(([t, c, ca, d]) => {
      if (t.ok) setTypes(t.items);
      if (c.ok) setClasses(c.items);
      if (ca.ok) setCategories(ca.items);
      if (d.ok) setDocsList({ PRESTATAIRE_SERVICE: d.PRESTATAIRE_SERVICE, FOURNISSEUR_MATERIAUX: d.FOURNISSEUR_MATERIAUX });
    }).catch(() => setError(t("portes.p6.err.refload")));
  }, []);

  const stepIndex = ["type", "identite", "classement", "docs", "score", "contact"].indexOf(step);

  const toggleCategorie = (code: string) => {
    setCategoriesAgrement(prev => {
      const n = new Set(prev);
      if (n.has(code)) n.delete(code); else n.add(code);
      return n;
    });
  };
  const toggleDoc = (slug: string) => setDocs(prev => ({ ...prev, [slug]: !prev[slug] }));

  const buildScoringInput = () => ({
    type, raisonSociale: identite.raisonSociale, rc: identite.rc, ice: identite.ice, patente: identite.patente,
    classeBTP: classeBTP || undefined,
    categoriesAgrement: Array.from(categoriesAgrement),
    agrementMetleNumero: agrementMetleNumero || undefined,
    agrementMetleValidite: agrementMetleValidite ? new Date(agrementMetleValidite).toISOString() : undefined,
    decennaleValide, rcProValide,
    documents: docs,
    nbReferences: identite.nbReferences ? +identite.nbReferences : 0,
    nbPhotosChantiers: identite.nbPhotosChantiers ? +identite.nbPhotosChantiers : 0,
    ancienneteAnnees: identite.ancienneteAnnees ? +identite.ancienneteAnnees : 0,
    nbMateriauxCatalogue: identite.nbMateriauxCatalogue ? +identite.nbMateriauxCatalogue : 0,
    zonesFourniture: identite.zonesFourniture ? identite.zonesFourniture.split(",").map(s => s.trim()).filter(Boolean) : [],
  });

  const computeScore = async () => {
    setError("");
    setStep("submitting");
    try {
      const res = await fetch(`${apiBase()}/p6/scoring`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildScoringInput()),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || t("portes.p6.err.refload"));
      setScore(data);
      setStep("score");
    } catch (e: any) { setError(e.message); setStep("docs"); }
  };

  const submit = async () => {
    setError("");
    if (!identite.clientNom || !identite.clientTel || !identite.raisonSociale) {
      setError(t("portes.p6.contact.err_required"));
      return;
    }
    setStep("submitting");
    try {
      const title = `${type === "PRESTATAIRE_SERVICE" ? t("portes.p6.title.prestataire") : t("portes.p6.title.fournisseur")} — ${identite.raisonSociale}`;
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          porteType: "P6", gestionMode: "AUTONOME",
          commune: identite.commune || undefined,
          raisonSociale: identite.raisonSociale,
          representant: identite.representant || undefined,
          rc: identite.rc || undefined,
          ice: identite.ice || undefined,
          clientNom: identite.clientNom,
          clientTel: identite.clientTel,
          clientEmail: identite.clientEmail || undefined,
          title, source: "P6_WIZARD", lang: getStoredLang(),
          brief: {
            p6Type: type,
            classeBTP: classeBTP || undefined,
            categoriesAgrement: Array.from(categoriesAgrement),
            agrementMetleNumero, agrementMetleValidite,
            ancienneteAnnees: identite.ancienneteAnnees ? +identite.ancienneteAnnees : 0,
            nbReferences: identite.nbReferences ? +identite.nbReferences : 0,
            nbPhotosChantiers: identite.nbPhotosChantiers ? +identite.nbPhotosChantiers : 0,
            nbMateriauxCatalogue: identite.nbMateriauxCatalogue ? +identite.nbMateriauxCatalogue : 0,
            zonesFourniture: identite.zonesFourniture,
            decennaleValide, rcProValide,
            documents: docs,
            scoreSnapshot: score,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Erreur soumission");
      if (data.access_token) { try { localStorage.setItem("citurbarea.token", data.access_token); } catch {} }
      setDossierId(data.dossierId);
      setStep("success");
    } catch (e: any) { setError(e.message); setStep("contact"); }
  };

  if (step === "submitting") return <div style={S.loader}>{t("portes.p6.loader.computing")}</div>;

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>{t("portes.p6.success.title")}</div>
          <div style={S.successSub}>
            {t("portes.p6.success.fiche_prefix")} <strong>{type === "PRESTATAIRE_SERVICE" ? t("portes.p6.success.role_prestataire") : t("portes.p6.success.role_fournisseur")}</strong> {t("portes.p6.success.fiche_suffix")}<br/>
            {t("portes.p6.success.score_label")} <strong style={{ color: TIER_COLORS[score?.tier ?? "BRONZE"] }}>{score?.score}/100 ({score?.tier})</strong><br/><br/>
            {t("portes.p6.success.sla")}<br/>
            {t("portes.p6.success.next")}<br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{t("portes.p6.success.ref_label")} {dossierId?.slice(0, 12)}…</span>
          </div>
          <a href="/" style={{ color: "#dc2626", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("portes.p6.success.back_home")}</a>
        </div>
      </div>
    );
  }

  const Stepper = () => (
    <div style={S.stepper}>{[0,1,2,3,4,5].map(i => <div key={i} style={stepStyle(i === stepIndex, i < stepIndex)} />)}</div>
  );

  // Step 1: type
  if (step === "type") {
    return (
      <div style={S.root}>
        <div style={S.hero}>
          <div style={S.badge}>{t("portes.p6.badge_prefix")} {t("p6.home_title").toUpperCase()}</div>
          <div style={S.title}>{t("p6.home_title")}</div>
          <div style={S.sub}>{t("p6.home_subtitle")}</div>
        </div>
        <div style={S.grid}>
          {types.map(tp => (
            <div key={tp.code} style={cardStyle(false)} onClick={() => { setType(tp.code); setStep("identite"); }}>
              <div style={S.cardIcon}>{tp.code === "PRESTATAIRE_SERVICE" ? "🛠️" : "🏗️"}</div>
              <div style={S.cardTitle}>{tp.label}</div>
              <div style={S.cardDesc}>{tp.desc}</div>
            </div>
          ))}
          {types.length === 0 && <div style={{ color: "#6b7280" }}>{t("portes.p6.loading_ellipsis")}</div>}
        </div>

        {/* Accès au réseau professionnel CITURBAREA Cercles */}
        <a
          href="https://cercles.citurbarea.com"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block", maxWidth: 760, margin: "8px auto 40px", padding: "20px 24px",
            background: "linear-gradient(135deg,#0F2A4A,#1A3A5C)", borderRadius: 14,
            textDecoration: "none", color: "#FAF7F2", textAlign: "center",
            border: "1px solid rgba(176,141,87,0.35)",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#B08D57", fontWeight: 700 }}>
            {t("portes.p6.cercles.kicker")}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, margin: "8px 0 4px" }}>
            {t("portes.p6.cercles.title")}
          </div>
          <div style={{ fontSize: 13, color: "#D4CFC2", lineHeight: 1.5 }}>
            {t("portes.p6.cercles.body")}
          </div>
          <div style={{
            display: "inline-block", marginTop: 14, padding: "10px 22px",
            background: "#B08D57", color: "#0F2A4A", borderRadius: 7, fontWeight: 700, fontSize: 13.5,
          }}>
            {t("portes.p6.cercles.cta")}
          </div>
        </a>
      </div>
    );
  }

  // Step 2: identité
  if (step === "identite") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("type")}>{t("portes.p6.identite.back_change_type")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p6.identite.title")}</div>
          <div style={S.formSub}>{t("portes.p6.identite.sub")}</div>

          <label style={S.label}>{t("portes.p6.identite.raison_sociale")}</label>
          <input style={S.inp} value={identite.raisonSociale} onChange={e => setIdentite({...identite, raisonSociale: e.target.value})} placeholder={t("portes.p6.identite.raison_sociale_ph")} />
          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p6.identite.rc")}</label><input style={S.inp} value={identite.rc} onChange={e => setIdentite({...identite, rc: e.target.value})} /></div>
            <div><label style={S.label}>{t("portes.p6.identite.ice")}</label><input style={S.inp} value={identite.ice} onChange={e => setIdentite({...identite, ice: e.target.value})} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p6.identite.patente")}</label><input style={S.inp} value={identite.patente} onChange={e => setIdentite({...identite, patente: e.target.value})} /></div>
            <div><label style={S.label}>{t("portes.p6.identite.commune")}</label><input style={S.inp} value={identite.commune} onChange={e => setIdentite({...identite, commune: e.target.value})} placeholder={t("portes.p6.identite.commune_ph")} /></div>
          </div>
          <label style={S.label}>{t("portes.p6.identite.representant")}</label>
          <input style={S.inp} value={identite.representant} onChange={e => setIdentite({...identite, representant: e.target.value})} />
          <label style={S.label}>{t("portes.p6.identite.anciennete")}</label>
          <input type="number" style={S.inp} value={identite.ancienneteAnnees} onChange={e => setIdentite({...identite, ancienneteAnnees: e.target.value})} placeholder="5" />

          {type === "PRESTATAIRE_SERVICE" ? (
            <div style={S.row2}>
              <div><label style={S.label}>{t("portes.p6.identite.nb_references")}</label><input type="number" style={S.inp} value={identite.nbReferences} onChange={e => setIdentite({...identite, nbReferences: e.target.value})} placeholder="3" /></div>
              <div><label style={S.label}>{t("portes.p6.identite.nb_photos")}</label><input type="number" style={S.inp} value={identite.nbPhotosChantiers} onChange={e => setIdentite({...identite, nbPhotosChantiers: e.target.value})} placeholder="5" /></div>
            </div>
          ) : (
            <div style={S.row2}>
              <div><label style={S.label}>{t("portes.p6.identite.nb_materiaux")}</label><input type="number" style={S.inp} value={identite.nbMateriauxCatalogue} onChange={e => setIdentite({...identite, nbMateriauxCatalogue: e.target.value})} placeholder="20" /></div>
              <div><label style={S.label}>{t("portes.p6.identite.zones")}</label><input style={S.inp} value={identite.zonesFourniture} onChange={e => setIdentite({...identite, zonesFourniture: e.target.value})} placeholder={t("portes.p6.identite.zones_ph")} /></div>
            </div>
          )}

          <button style={S.btn} onClick={() => setStep(type === "FOURNISSEUR_MATERIAUX" ? "docs" : "classement")}>
            {type === "FOURNISSEUR_MATERIAUX" ? t("portes.p6.identite.next_docs") : t("portes.p6.identite.next_classement")}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: classement (PRESTATAIRE_SERVICE only)
  if (step === "classement") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("identite")}>{t("portes.p6.classement.back")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p6.classement.title")}</div>
          <div style={S.formSub}>{t("portes.p6.classement.sub")}</div>

          <label style={S.label}>{t("portes.p6.classement.classe_label")}</label>
          {classes.map(c => (
            <div key={c.code} style={{ ...S.classRow, ...(classeBTP === c.code ? S.classRowActive : {}) }} onClick={() => setClasseBTP(c.code === classeBTP ? "" : c.code)}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.label} <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 12 }}>({c.level})</span></div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>{c.caRange}</div>
              </div>
              {classeBTP === c.code && <div style={{ color: "#dc2626" }}>✓</div>}
            </div>
          ))}

          <label style={{ ...S.label, marginTop: 18 }}>{t("portes.p6.classement.categories_label")}</label>
          {categories.map(c => (
            <div key={c.code} style={{ ...S.classRow, ...(categoriesAgrement.has(c.code) ? S.classRowActive : {}) }} onClick={() => toggleCategorie(c.code)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{c.label}</div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>{c.desc}</div>
              </div>
              {categoriesAgrement.has(c.code) && <div style={{ color: "#dc2626" }}>✓</div>}
            </div>
          ))}

          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p6.classement.n_agrement")}</label><input style={S.inp} value={agrementMetleNumero} onChange={e => setAgrementMetleNumero(e.target.value)} /></div>
            <div><label style={S.label}>{t("portes.p6.classement.validite")}</label><input type="date" style={S.inp} value={agrementMetleValidite} onChange={e => setAgrementMetleValidite(e.target.value)} /></div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={decennaleValide} onChange={e => setDecennaleValide(e.target.checked)} />
              <span>{t("portes.p6.classement.decennale")}</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={rcProValide} onChange={e => setRcProValide(e.target.checked)} />
              <span>{t("portes.p6.classement.rcpro")}</span>
            </label>
          </div>

          <button style={S.btn} onClick={() => setStep("docs")}>{t("portes.p6.classement.next_docs")}</button>
        </div>
      </div>
    );
  }

  // Step 4: documents
  if (step === "docs") {
    const list = type ? docsList?.[type] ?? [] : [];
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep(type === "FOURNISSEUR_MATERIAUX" ? "identite" : "classement")}>{t("portes.p6.classement.back")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p6.docs.title")}</div>
          <div style={S.formSub}>{t("portes.p6.docs.sub")}</div>

          {list.map((d) => (
            <label key={d.slug} style={{ ...S.docRow, color: docs[d.slug] ? "#a7f3d0" : "#cbd5e1" }}>
              <input type="checkbox" checked={!!docs[d.slug]} onChange={() => toggleDoc(d.slug)} />
              <span style={{ flex: 1 }}>
                {d.label}
                {d.obligatoire && <span style={{ color: "#fcd34d", fontSize: 10, marginLeft: 6 }}>{t("portes.p6.docs.obligatoire")}</span>}
                {d.notes && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{d.notes}</div>}
              </span>
            </label>
          ))}

          <button style={S.btn} onClick={computeScore}>{t("portes.p6.docs.cta")}</button>
        </div>
      </div>
    );
  }

  // Step 5: score
  if (step === "score" && score) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("docs")}>{t("portes.p6.score.back_edit")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p6.score.title")}</div>
          <div style={S.formSub}>{t("portes.p6.score.sub")}</div>

          <div style={S.scoreWrap}>
            <div style={S.scoreHead}>
              <div>
                <div style={{ ...S.scoreSub, color: "#dc2626" }}>{t("portes.p6.score.internal")}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>{t("portes.p6.score.scale")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...S.scoreVal, color: TIER_COLORS[score.tier] }}>{score.score}</div>
                <div style={{ ...S.scoreSub, color: TIER_COLORS[score.tier] }}>{score.tier}</div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              {Object.entries(score.breakdown).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid #1a2030" }}>
                  <span style={{ color: "#9ca3af", textTransform: "capitalize" }}>{k}</span>
                  <span style={{ color: "#e8eaf0", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{v} {t("portes.p6.score.pts")}</span>
                </div>
              ))}
            </div>

            {score.warnings.length > 0 && (
              <div style={{ background: "#1a0a0a", border: "1px solid #ef444440", borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 12, lineHeight: 1.5, color: "#fca5a5" }}>
                <strong>{t("portes.p6.score.warnings")}</strong>
                {score.warnings.map((w, i) => <div key={i} style={{ marginTop: 4 }}>• {w}</div>)}
              </div>
            )}
            {score.recommendations.length > 0 && (
              <div style={{ background: "#0a1a14", border: "1px solid #10b98140", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5, color: "#a7f3d0" }}>
                <strong>{t("portes.p6.score.recommendations")}</strong>
                {score.recommendations.map((r, i) => <div key={i} style={{ marginTop: 4 }}>• {r}</div>)}
              </div>
            )}
          </div>

          <button style={S.btn} onClick={() => setStep("contact")}>{t("portes.p6.score.next_contact")}</button>
        </div>
      </div>
    );
  }

  // Step 6: contact
  if (step === "contact") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("score")}>{t("portes.p6.contact.back_score")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p6.contact.title")}</div>
          <div style={S.formSub}>{t("portes.p6.contact.sub")}</div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div><label style={S.label}>{t("portes.p6.contact.name_label")}</label><input style={S.inp} value={identite.clientNom} onChange={e => setIdentite({...identite, clientNom: e.target.value})} placeholder={t("portes.p6.contact.name_ph")} /></div>
            <div><label style={S.label}>{t("portes.p6.contact.phone_label")}</label><input style={S.inp} value={identite.clientTel} onChange={e => setIdentite({...identite, clientTel: e.target.value})} placeholder={t("portes.p6.contact.phone_ph")} /></div>
          </div>
          <label style={S.label}>{t("portes.p6.contact.email_label")}</label>
          <input style={S.inp} value={identite.clientEmail} onChange={e => setIdentite({...identite, clientEmail: e.target.value})} placeholder={t("portes.p6.contact.email_ph")} />

          <button style={S.btn} onClick={submit}>{t("portes.p6.contact.submit")}</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
