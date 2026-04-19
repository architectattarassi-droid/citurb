import { useState } from "react";

const TYPES_PRESTATAIRE = [
  { id: "ARCHITECTE", label: "Architecte", icon: "🏛️", desc: "Conception, maîtrise d'œuvre, suivi chantier. Agréé CNOA." },
  { id: "BET", label: "Bureau d'études techniques", icon: "🔬", desc: "Structure, fluides, thermique, électricité. Calculs et plans d'exécution." },
  { id: "ENTREPRISE_GO", label: "Entreprise de gros œuvre", icon: "🏗️", desc: "Fondations, maçonnerie, béton armé. Expérience R+2 et plus." },
  { id: "ARTISAN", label: "Artisan & corps d'état secondaire", icon: "🔧", desc: "Plomberie, électricité, menuiserie, carrelage, peinture, etc." },
  { id: "TOPOGRAPHE", label: "Topographe", icon: "📐", desc: "Levés topographiques, bornage, morcellement, plans de situation." },
  { id: "BUREAU_CONTROLE", label: "Bureau de contrôle", icon: "✅", desc: "Contrôle technique, certification, audit sécurité incendie, accessibilité." },
  { id: "LABORATOIRE", label: "Laboratoire d'essais", icon: "🧪", desc: "Essais béton, sol, matériaux. Rapports d'analyses opposables." },
];

const tk = () => localStorage.getItem("citurbarea.token") || "";

const S = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" } as React.CSSProperties,
  hero: { background: "linear-gradient(135deg,#1a0a0a 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" as const },
  badge: { display: "inline-block", background: "#1a0a0a", color: "#f87171", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16, maxWidth: 1000, margin: "0 auto", padding: "0 24px 60px" },
  card: (active: boolean): React.CSSProperties => ({
    background: active ? "#1a0a0a" : "#111827",
    border: `2px solid ${active ? "#dc2626" : "#1e2330"}`,
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
  ta: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "10px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" as const, marginBottom: 16, minHeight: 70, resize: "vertical" as const },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 } as React.CSSProperties,
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 } as React.CSSProperties,
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "8px 12px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#f87171", fontSize: 18 } as React.CSSProperties,
  successWrap: { maxWidth: 520, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" as const },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#6b7280", fontSize: 14, lineHeight: 1.6, marginBottom: 24 },
  successInfo: { background: "#0a0f1a", borderRadius: 8, padding: "14px 16px", fontSize: 13, color: "#9ca3af", textAlign: "left" as const },
};

type Step = "landing" | "form" | "loading" | "success";

export default function P6Home() {
  const [step, setStep] = useState<Step>("landing");
  const [typePrestataire, setTypePrestataire] = useState("");
  const [form, setForm] = useState({ nom: "", raisonSociale: "", tel: "", email: "", commune: "", specialites: "", communes: "", ice: "", certifications: "" });
  const [error, setError] = useState("");

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!typePrestataire || !form.nom || !form.tel) { setError("Nom et téléphone obligatoires."); return; }
    setStep("loading"); setError("");
    const sel = TYPES_PRESTATAIRE.find(t => t.id === typePrestataire);
    const natureProjet = [
      form.specialites && `Spécialités: ${form.specialites}`,
      form.communes && `Zones: ${form.communes}`,
      form.certifications && `Certifications: ${form.certifications}`,
    ].filter(Boolean).join(" | ");
    try {
      const res = await fetch("/p2/dossier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          porteType: "P6", gestionMode: "AUTONOME", sousTypeP2: typePrestataire,
          commune: form.commune || undefined,
          raisonSociale: form.raisonSociale || undefined,
          ice: form.ice || undefined,
          clientNom: form.nom, clientTel: form.tel, clientEmail: form.email || undefined,
          natureProjet: natureProjet || undefined,
          title: `${sel?.label ?? "Prestataire"} — ${form.raisonSociale || form.nom}`,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` })); throw new Error(e.message); }
      setStep("success");
    } catch (e: any) { setError(e.message); setStep("form"); }
  };

  if (step === "loading") return <div style={S.loader}>Envoi de votre candidature…</div>;

  if (step === "success") return (
    <div style={S.root}>
      <div style={S.successWrap}>
        <div style={S.successIcon}>✅</div>
        <div style={S.successTitle}>Candidature enregistrée</div>
        <div style={S.successSub}>
          Votre profil prestataire a été transmis à l'équipe CITURBAREA.<br />
          Nous vous contacterons sous 48h pour validation et intégration au réseau.
        </div>
        <div style={S.successInfo}>
          <div style={{ fontWeight: 700, color: "#e8eaf0", marginBottom: 8 }}>Prochaines étapes</div>
          <div>1. Vérification de vos références et agréments</div>
          <div>2. Entretien de qualification (visio ou téléphone)</div>
          <div>3. Accès au tableau de bord prestataire</div>
        </div>
      </div>
    </div>
  );

  const sel = TYPES_PRESTATAIRE.find(t => t.id === typePrestataire);

  if (step === "form") return (
    <div style={S.root}>
      <div style={S.formWrap}>
        <button style={S.btnBack} onClick={() => setStep("landing")}>← Retour</button>
        <div style={S.formTitle}>{sel?.icon} {sel?.label}</div>
        <div style={S.formSub}>Porte P6 — Rejoindre le réseau prestataire CITURBAREA</div>
        {error && <div style={S.err}>⚠ {error}</div>}
        <div style={S.row2}>
          <div><label style={S.label}>Nom complet *</label><input style={S.inp} value={form.nom} onChange={f("nom")} placeholder="Prénom Nom" /></div>
          <div><label style={S.label}>Téléphone *</label><input style={S.inp} value={form.tel} onChange={f("tel")} placeholder="+212 6XX XXX XXX" /></div>
        </div>
        <label style={S.label}>Raison sociale / Entreprise</label>
        <input style={S.inp} value={form.raisonSociale} onChange={f("raisonSociale")} placeholder="Nom de votre société (si applicable)" />
        <div style={S.row2}>
          <div><label style={S.label}>Email</label><input style={S.inp} value={form.email} onChange={f("email")} placeholder="contact@exemple.ma" /></div>
          <div><label style={S.label}>ICE / Registre commerce</label><input style={S.inp} value={form.ice} onChange={f("ice")} /></div>
        </div>
        <label style={S.label}>Commune principale d'activité</label>
        <input style={S.inp} value={form.commune} onChange={f("commune")} placeholder="Kénitra, Rabat…" />
        <label style={S.label}>Zones d'intervention (autres villes)</label>
        <input style={S.inp} value={form.communes} onChange={f("communes")} placeholder="Salé, Témara, Skhirat…" />
        <label style={S.label}>Spécialités & compétences clés</label>
        <textarea style={S.ta} value={form.specialites} onChange={f("specialites")} placeholder="Ex : villa R+2, béton armé, ossature métallique…" />
        <label style={S.label}>Certifications & agréments</label>
        <textarea style={S.ta} value={form.certifications} onChange={f("certifications")} placeholder="CNOA, ONTP, CEEC, ISO, OMPIC…" />
        <button style={S.btn} onClick={submit}>Soumettre ma candidature →</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.hero}>
        <div style={S.badge}>PORTE P6 — RÉSEAU PRESTATAIRE</div>
        <div style={S.title}>Rejoindre le réseau CITURBAREA</div>
        <div style={S.sub}>Accès à des dossiers qualifiés · Collaboration structurée · Méthode qualité imposée</div>
      </div>
      <div style={S.grid}>
        {TYPES_PRESTATAIRE.map(t => (
          <div key={t.id} style={S.card(typePrestataire === t.id)} onClick={() => { setTypePrestataire(t.id); setStep("form"); }}>
            <div style={S.cardIcon}>{t.icon}</div>
            <div style={S.cardTitle}>{t.label}</div>
            <div style={S.cardDesc}>{t.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#090e18", borderTop: "1px solid #1a2234", padding: "24px", textAlign: "center", color: "#3d4f6a", fontSize: 12 }}>
        © 2026 CITURBAREA — Réseau de prestataires qualifiés au Maroc
      </div>
    </div>
  );
}
