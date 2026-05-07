import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang } from "../../../../i18n/i18n";

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
    }).catch(() => setError("Erreur chargement référentiels"));
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
      if (!data.ok) throw new Error(data.error || "Erreur");
      setScore(data);
      setStep("score");
    } catch (e: any) { setError(e.message); setStep("docs"); }
  };

  const submit = async () => {
    setError("");
    if (!identite.clientNom || !identite.clientTel || !identite.raisonSociale) {
      setError("Nom contact, téléphone et raison sociale obligatoires.");
      return;
    }
    setStep("submitting");
    try {
      const title = `${type === "PRESTATAIRE_SERVICE" ? "Prestataire" : "Fournisseur"} — ${identite.raisonSociale}`;
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

  if (step === "submitting") return <div style={S.loader}>⏳ Calcul en cours…</div>;

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>Candidature reçue</div>
          <div style={S.successSub}>
            Votre fiche <strong>{type === "PRESTATAIRE_SERVICE" ? "prestataire" : "fournisseur"}</strong> a été transmise à l'équipe CITURBAREA.<br/>
            Score CITURBAREA L7 : <strong style={{ color: TIER_COLORS[score?.tier ?? "BRONZE"] }}>{score?.score}/100 ({score?.tier})</strong><br/><br/>
            Notre équipe de sourcing valide votre profil sous 5 jours ouvrables.<br/>
            Une fois validé, vous accéderez à votre tableau de bord prestataire pour compléter vos prix, zones et catalogue.<br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>Ref dossier : {dossierId?.slice(0, 12)}…</span>
          </div>
          <a href="/" style={{ color: "#dc2626", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Retour à l'accueil</a>
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
          <div style={S.badge}>PORTE P6 — RÉSEAU PRESTATAIRES & FOURNISSEURS</div>
          <div style={S.title}>Rejoindre le réseau CITURBAREA</div>
          <div style={S.sub}>2 types de fiches — score interne L7 + accès aux dossiers qualifiés</div>
        </div>
        <div style={S.grid}>
          {types.map(t => (
            <div key={t.code} style={cardStyle(false)} onClick={() => { setType(t.code); setStep("identite"); }}>
              <div style={S.cardIcon}>{t.code === "PRESTATAIRE_SERVICE" ? "🛠️" : "🏗️"}</div>
              <div style={S.cardTitle}>{t.label}</div>
              <div style={S.cardDesc}>{t.desc}</div>
            </div>
          ))}
          {types.length === 0 && <div style={{ color: "#6b7280" }}>Chargement…</div>}
        </div>
      </div>
    );
  }

  // Step 2: identité
  if (step === "identite") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("type")}>← Changer de type</button>
          <Stepper />
          <div style={S.formTitle}>Identité société</div>
          <div style={S.formSub}>Informations administratives & opérationnelles.</div>

          <label style={S.label}>Raison sociale *</label>
          <input style={S.inp} value={identite.raisonSociale} onChange={e => setIdentite({...identite, raisonSociale: e.target.value})} placeholder="SARL EXEMPLE BTP" />
          <div style={S.row2}>
            <div><label style={S.label}>RC</label><input style={S.inp} value={identite.rc} onChange={e => setIdentite({...identite, rc: e.target.value})} /></div>
            <div><label style={S.label}>ICE</label><input style={S.inp} value={identite.ice} onChange={e => setIdentite({...identite, ice: e.target.value})} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Patente</label><input style={S.inp} value={identite.patente} onChange={e => setIdentite({...identite, patente: e.target.value})} /></div>
            <div><label style={S.label}>Commune principale</label><input style={S.inp} value={identite.commune} onChange={e => setIdentite({...identite, commune: e.target.value})} placeholder="Kénitra" /></div>
          </div>
          <label style={S.label}>Représentant légal</label>
          <input style={S.inp} value={identite.representant} onChange={e => setIdentite({...identite, representant: e.target.value})} />
          <label style={S.label}>Ancienneté société (années)</label>
          <input type="number" style={S.inp} value={identite.ancienneteAnnees} onChange={e => setIdentite({...identite, ancienneteAnnees: e.target.value})} placeholder="5" />

          {type === "PRESTATAIRE_SERVICE" ? (
            <div style={S.row2}>
              <div><label style={S.label}>Nb références chantiers</label><input type="number" style={S.inp} value={identite.nbReferences} onChange={e => setIdentite({...identite, nbReferences: e.target.value})} placeholder="3" /></div>
              <div><label style={S.label}>Nb photos chantiers</label><input type="number" style={S.inp} value={identite.nbPhotosChantiers} onChange={e => setIdentite({...identite, nbPhotosChantiers: e.target.value})} placeholder="5" /></div>
            </div>
          ) : (
            <div style={S.row2}>
              <div><label style={S.label}>Nb matériaux catalogue</label><input type="number" style={S.inp} value={identite.nbMateriauxCatalogue} onChange={e => setIdentite({...identite, nbMateriauxCatalogue: e.target.value})} placeholder="20" /></div>
              <div><label style={S.label}>Zones fourniture (séparées par ,)</label><input style={S.inp} value={identite.zonesFourniture} onChange={e => setIdentite({...identite, zonesFourniture: e.target.value})} placeholder="Kénitra, Rabat, Salé" /></div>
            </div>
          )}

          <button style={S.btn} onClick={() => setStep(type === "FOURNISSEUR_MATERIAUX" ? "docs" : "classement")}>
            Suivant : {type === "FOURNISSEUR_MATERIAUX" ? "documents" : "classement BTP"} →
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
          <button style={S.btnBack} onClick={() => setStep("identite")}>← Retour</button>
          <Stepper />
          <div style={S.formTitle}>Classement & agréments</div>
          <div style={S.formSub}>Classification BTP (Décret 2-94-223 Maroc) et catégories d'agrément METLE.</div>

          <label style={S.label}>Classe BTP (METLE)</label>
          {classes.map(c => (
            <div key={c.code} style={{ ...S.classRow, ...(classeBTP === c.code ? S.classRowActive : {}) }} onClick={() => setClasseBTP(c.code === classeBTP ? "" : c.code)}>
              <div>
                <div style={{ fontWeight: 600 }}>{c.label} <span style={{ color: "#6b7280", fontWeight: 400, fontSize: 12 }}>({c.level})</span></div>
                <div style={{ color: "#6b7280", fontSize: 11 }}>{c.caRange}</div>
              </div>
              {classeBTP === c.code && <div style={{ color: "#dc2626" }}>✓</div>}
            </div>
          ))}

          <label style={{ ...S.label, marginTop: 18 }}>Catégories d'agrément (multi-select)</label>
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
            <div><label style={S.label}>N° agrément METLE</label><input style={S.inp} value={agrementMetleNumero} onChange={e => setAgrementMetleNumero(e.target.value)} /></div>
            <div><label style={S.label}>Validité agrément</label><input type="date" style={S.inp} value={agrementMetleValidite} onChange={e => setAgrementMetleValidite(e.target.value)} /></div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={decennaleValide} onChange={e => setDecennaleValide(e.target.checked)} />
              <span>Police décennale en cours valide</span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={rcProValide} onChange={e => setRcProValide(e.target.checked)} />
              <span>RC professionnelle valide</span>
            </label>
          </div>

          <button style={S.btn} onClick={() => setStep("docs")}>Suivant : documents →</button>
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
          <button style={S.btnBack} onClick={() => setStep(type === "FOURNISSEUR_MATERIAUX" ? "identite" : "classement")}>← Retour</button>
          <Stepper />
          <div style={S.formTitle}>Documents administratifs</div>
          <div style={S.formSub}>Cochez les documents que vous pouvez fournir. Les originaux/scans seront chargés après validation.</div>

          {list.map((d) => (
            <label key={d.slug} style={{ ...S.docRow, color: docs[d.slug] ? "#a7f3d0" : "#cbd5e1" }}>
              <input type="checkbox" checked={!!docs[d.slug]} onChange={() => toggleDoc(d.slug)} />
              <span style={{ flex: 1 }}>
                {d.label}
                {d.obligatoire && <span style={{ color: "#fcd34d", fontSize: 10, marginLeft: 6 }}>*obligatoire</span>}
                {d.notes && <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>{d.notes}</div>}
              </span>
            </label>
          ))}

          <button style={S.btn} onClick={computeScore}>Calculer mon score CITURBAREA →</button>
        </div>
      </div>
    );
  }

  // Step 5: score
  if (step === "score" && score) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("docs")}>← Modifier</button>
          <Stepper />
          <div style={S.formTitle}>Votre score CITURBAREA L7</div>
          <div style={S.formSub}>Basé sur classe BTP, agréments, documents, assurances et historique.</div>

          <div style={S.scoreWrap}>
            <div style={S.scoreHead}>
              <div>
                <div style={{ ...S.scoreSub, color: "#dc2626" }}>Score interne</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>Sur une échelle de 0 à 100</div>
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
                  <span style={{ color: "#e8eaf0", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{v} pts</span>
                </div>
              ))}
            </div>

            {score.warnings.length > 0 && (
              <div style={{ background: "#1a0a0a", border: "1px solid #ef444440", borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 12, lineHeight: 1.5, color: "#fca5a5" }}>
                <strong>⚠ Alertes :</strong>
                {score.warnings.map((w, i) => <div key={i} style={{ marginTop: 4 }}>• {w}</div>)}
              </div>
            )}
            {score.recommendations.length > 0 && (
              <div style={{ background: "#0a1a14", border: "1px solid #10b98140", borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.5, color: "#a7f3d0" }}>
                <strong>💡 Recommandations :</strong>
                {score.recommendations.map((r, i) => <div key={i} style={{ marginTop: 4 }}>• {r}</div>)}
              </div>
            )}
          </div>

          <button style={S.btn} onClick={() => setStep("contact")}>Continuer : contact →</button>
        </div>
      </div>
    );
  }

  // Step 6: contact
  if (step === "contact") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("score")}>← Retour score</button>
          <Stepper />
          <div style={S.formTitle}>Contact société</div>
          <div style={S.formSub}>Nous vous contactons sous 5 jours ouvrables après review de votre fiche.</div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div><label style={S.label}>Nom contact *</label><input style={S.inp} value={identite.clientNom} onChange={e => setIdentite({...identite, clientNom: e.target.value})} placeholder="Prénom Nom" /></div>
            <div><label style={S.label}>Téléphone *</label><input style={S.inp} value={identite.clientTel} onChange={e => setIdentite({...identite, clientTel: e.target.value})} placeholder="+212 6XX XXX XXX" /></div>
          </div>
          <label style={S.label}>Email</label>
          <input style={S.inp} value={identite.clientEmail} onChange={e => setIdentite({...identite, clientEmail: e.target.value})} placeholder="contact@société.ma" />

          <button style={S.btn} onClick={submit}>Soumettre la candidature →</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
