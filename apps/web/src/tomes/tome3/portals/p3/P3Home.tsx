import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TYPES_PROJET = [
  { id: "VILLA", label: "Villa clé en main", icon: "🏠", desc: "De la conception à la remise des clés — villa individuelle ou jumelée." },
  { id: "IMMEUBLE", label: "Immeuble clé en main", icon: "🏢", desc: "Opération collective complète, GO + BET + corps secondaires coordonnés." },
  { id: "REHABILITATION", label: "Réhabilitation complète", icon: "🔧", desc: "Restructuration, mise aux normes, rénovation globale avec MOD unique." },
  { id: "INDUSTRIE", label: "Projet industriel", icon: "⚙️", desc: "Usine, entrepôt, équipement spécifique — coordination pluridisciplinaire." },
];

const tk = () => localStorage.getItem("citurbarea.token") || "";

const S = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" } as React.CSSProperties,
  hero: { background: "linear-gradient(135deg,#0a1a0a 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" as const },
  badge: { display: "inline-block", background: "#0a2a0a", color: "#4ade80", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8, color: "#e8eaf0" },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" },
  card: (active: boolean): React.CSSProperties => ({
    background: active ? "#0a2a0a" : "#111827",
    border: `2px solid ${active ? "#4ade80" : "#1e2330"}`,
    borderRadius: 12, padding: "24px 20px", cursor: "pointer", transition: "all .15s",
  }),
  cardIcon: { fontSize: 36, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  cardDesc: { color: "#6b7280", fontSize: 13 },
  formWrap: { maxWidth: 620, margin: "0 auto", padding: "40px 24px" },
  formTitle: { fontSize: 22, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 13, marginBottom: 28 },
  label: { display: "block", fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "10px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" as const, marginBottom: 16 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 } as React.CSSProperties,
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 } as React.CSSProperties,
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "8px 12px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#4ade80", fontSize: 18 } as React.CSSProperties,
  avantages: { maxWidth: 900, margin: "0 auto", padding: "40px 24px 60px" },
  avGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 },
  avCard: { background: "#111827", border: "1px solid #1e2330", borderRadius: 8, padding: "18px 16px" } as React.CSSProperties,
  avIcon: { fontSize: 28, marginBottom: 8 },
  avTitle: { fontWeight: 700, fontSize: 14, marginBottom: 4 },
  avDesc: { color: "#6b7280", fontSize: 13, lineHeight: 1.5 },
};

type Step = "landing" | "form" | "loading";

export default function P3Home() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("landing");
  const [typeProjet, setTypeProjet] = useState("");
  const [form, setForm] = useState({
    commune: "", surfacePlancher: "", nbNiveaux: "",
    budgetEstime: "", natureProjet: "",
    clientNom: "", clientTel: "", clientEmail: "",
  });
  const [error, setError] = useState("");

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!typeProjet || !form.commune) {
      setError("Commune obligatoire."); return;
    }
    setStep("loading"); setError("");
    try {
      const res = await fetch("/p2/dossier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          porteType: "P3",
          gestionMode: "DELEGUE",
          sousTypeP2: typeProjet,
          commune: form.commune,
          surfacePlancher: form.surfacePlancher ? +form.surfacePlancher : undefined,
          nbNiveaux: form.nbNiveaux ? +form.nbNiveaux : undefined,
          budgetEstime: form.budgetEstime ? +form.budgetEstime : undefined,
          natureProjet: form.natureProjet || `Clé en main ${TYPES_PROJET.find(t => t.id === typeProjet)?.label}`,
          clientNom: form.clientNom || undefined,
          clientTel: form.clientTel || undefined,
          clientEmail: form.clientEmail || undefined,
          title: `MOD ${TYPES_PROJET.find(t => t.id === typeProjet)?.label ?? "P3"} — ${form.commune}`,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const body = await res.json();
      const id = body?.dossier?.id ?? body?.id;
      if (!id) throw new Error("Aucun ID dossier retourné");
      nav(`/cc/dossiers/${id}`);
    } catch (e: any) {
      setError(e.message); setStep("form");
    }
  };

  if (step === "loading") return <div style={S.loader}>Création du dossier clé en main…</div>;

  const selectedType = TYPES_PROJET.find(t => t.id === typeProjet);

  if (step === "form") return (
    <div style={S.root}>
      <div style={S.formWrap}>
        <button style={S.btnBack} onClick={() => setStep("landing")}>← Retour</button>
        <div style={S.formTitle}>{selectedType?.icon} {selectedType?.label}</div>
        <div style={S.formSub}>Porte P3 — Réalisation clé en main (MOD)</div>
        {error && <div style={S.err}>⚠ {error}</div>}

        <div style={S.row2}>
          <div>
            <label style={S.label}>Commune *</label>
            <input style={S.inp} value={form.commune} onChange={f("commune")} placeholder="Kénitra, Rabat…" />
          </div>
          <div>
            <label style={S.label}>Surface plancher (m²)</label>
            <input type="number" style={S.inp} value={form.surfacePlancher} onChange={f("surfacePlancher")} placeholder="200" />
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>Niveaux</label>
            <input type="number" style={S.inp} value={form.nbNiveaux} onChange={f("nbNiveaux")} placeholder="2" />
          </div>
          <div>
            <label style={S.label}>Budget estimé (MAD)</label>
            <input type="number" style={S.inp} value={form.budgetEstime} onChange={f("budgetEstime")} placeholder="1500000" />
          </div>
        </div>

        <label style={S.label}>Description du projet</label>
        <input style={S.inp} value={form.natureProjet} onChange={f("natureProjet")} placeholder="Construction neuve, réhabilitation complète…" />

        <div style={{ borderTop: "1px solid #1e2330", marginTop: 8, paddingTop: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 }}>Contact</div>
          <div style={S.row2}>
            <div>
              <label style={S.label}>Nom complet</label>
              <input style={S.inp} value={form.clientNom} onChange={f("clientNom")} placeholder="Nom Prénom" />
            </div>
            <div>
              <label style={S.label}>Téléphone</label>
              <input style={S.inp} value={form.clientTel} onChange={f("clientTel")} placeholder="+212600000000" />
            </div>
          </div>
          <label style={S.label}>Email</label>
          <input style={S.inp} value={form.clientEmail} onChange={f("clientEmail")} placeholder="contact@exemple.ma" />
        </div>

        <button style={S.btn} onClick={submit}>Démarrer mon projet clé en main →</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.hero}>
        <div style={S.badge}>PORTE P3 — CLÉ EN MAIN (MOD)</div>
        <div style={S.title}>Votre projet de A à Z</div>
        <div style={S.sub}>Un seul interlocuteur — conception, autorisations, entreprises, chantier, livraison</div>
      </div>

      <div style={S.avantages}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, textAlign: "center" }}>Pourquoi choisir la formule clé en main ?</div>
        <div style={S.avGrid}>
          {[
            { icon: "🎯", title: "1 seul interlocuteur", desc: "CITURBAREA coordonne architecte, BET, entreprises et administration à votre place." },
            { icon: "💰", title: "Budget maîtrisé", desc: "Appel d'offres structuré, analyse comparative des devis, pas de surcoût caché." },
            { icon: "📅", title: "Délais respectés", desc: "Planning contractuel, suivi hebdomadaire, alertes proactives." },
            { icon: "✅", title: "Qualité contrôlée", desc: "Réunions de chantier, comptes rendus, levée des réserves avant livraison." },
          ].map(a => (
            <div key={a.title} style={S.avCard}>
              <div style={S.avIcon}>{a.icon}</div>
              <div style={S.avTitle}>{a.title}</div>
              <div style={S.avDesc}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#090e18", padding: "40px 0 60px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>Choisissez votre type de projet</div>
        <div style={S.grid}>
          {TYPES_PROJET.map(t => (
            <div key={t.id} style={S.card(typeProjet === t.id)}
              onClick={() => { setTypeProjet(t.id); setStep("form"); }}>
              <div style={S.cardIcon}>{t.icon}</div>
              <div style={S.cardTitle}>{t.label}</div>
              <div style={S.cardDesc}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#090e18", borderTop: "1px solid #1a2234", padding: "24px", textAlign: "center", color: "#3d4f6a", fontSize: 12 }}>
        © 2026 CITURBAREA — Maîtrise d'Ouvrage Déléguée au Maroc
      </div>
    </div>
  );
}
