import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TYPES_RAPPORT = [
  { id: "ETAT_LIEUX", label: "État des lieux contradictoire", icon: "📋", desc: "Constat technique d'un bien avant acquisition, location ou litige." },
  { id: "DIAGNOSTIC", label: "Diagnostic & non-conformité", icon: "🔍", desc: "Identification des désordres, malfaçons ou non-conformités aux plans." },
  { id: "CONTRE_EXPERTISE", label: "Contre-expertise & litige", icon: "⚖️", desc: "Analyse contradictoire d'un rapport existant. Avis technique pour procédure." },
  { id: "CONFORMITE", label: "Rapport de conformité", icon: "✅", desc: "Vérification de conformité aux plans autorisés et aux normes applicables." },
];

const tk = () => localStorage.getItem("citurbarea.token") || "";

const S = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" } as React.CSSProperties,
  hero: { background: "linear-gradient(135deg,#0a1a1a 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" as const },
  badge: { display: "inline-block", background: "#0a1a1a", color: "#22d3ee", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" },
  card: (active: boolean): React.CSSProperties => ({
    background: active ? "#0a1a1a" : "#111827",
    border: `2px solid ${active ? "#0e7490" : "#1e2330"}`,
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
  ta: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "10px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" as const, marginBottom: 16, minHeight: 80, resize: "vertical" as const },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#0e7490", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 } as React.CSSProperties,
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 } as React.CSSProperties,
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "8px 12px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#22d3ee", fontSize: 18 } as React.CSSProperties,
  infoBox: { background: "#0a1a1a", border: "1px solid #0e7490", borderRadius: 8, padding: "14px 16px", marginBottom: 20 } as React.CSSProperties,
};

type Step = "landing" | "form" | "loading";

export default function P5Home() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("landing");
  const [typeRapport, setTypeRapport] = useState("");
  const [form, setForm] = useState({ commune: "", adresseBien: "", contexteDemande: "", surfaceBien: "", clientNom: "", clientTel: "", clientEmail: "" });
  const [error, setError] = useState("");

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!typeRapport || !form.commune) { setError("Commune obligatoire."); return; }
    setStep("loading"); setError("");
    try {
      const res = await fetch("/p2/dossier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          porteType: "P5", gestionMode: "AUTONOME", sousTypeP2: typeRapport,
          commune: form.commune, adresseTerrain: form.adresseBien || undefined,
          surfacePlancher: form.surfaceBien ? +form.surfaceBien : undefined,
          natureProjet: form.contexteDemande || undefined,
          clientNom: form.clientNom || undefined, clientTel: form.clientTel || undefined, clientEmail: form.clientEmail || undefined,
          title: `${TYPES_RAPPORT.find(t => t.id === typeRapport)?.label ?? "Rapport"} — ${form.commune}`,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({ message: `HTTP ${res.status}` })); throw new Error(e.message); }
      const body = await res.json();
      const id = body?.dossier?.id ?? body?.id;
      if (!id) throw new Error("Aucun ID dossier retourné");
      nav(`/cc/dossiers/${id}`);
    } catch (e: any) { setError(e.message); setStep("form"); }
  };

  if (step === "loading") return <div style={S.loader}>Création de la demande de rapport…</div>;
  const sel = TYPES_RAPPORT.find(t => t.id === typeRapport);

  if (step === "form") return (
    <div style={S.root}>
      <div style={S.formWrap}>
        <button style={S.btnBack} onClick={() => setStep("landing")}>← Retour</button>
        <div style={S.formTitle}>{sel?.icon} {sel?.label}</div>
        <div style={S.formSub}>Porte P5 — Rapports & expertises</div>
        {error && <div style={S.err}>⚠ {error}</div>}
        <div style={S.infoBox}>
          <div style={{ fontSize: 13, color: "#22d3ee", fontWeight: 700, marginBottom: 6 }}>📄 Rapport signé par architecte DENA</div>
          <div style={{ fontSize: 13, color: "#4a5568" }}>Opposable en cas de litige. Délai : 5–10 jours ouvrés.</div>
        </div>
        <div style={S.row2}>
          <div><label style={S.label}>Commune *</label><input style={S.inp} value={form.commune} onChange={f("commune")} placeholder="Kénitra, Rabat…" /></div>
          <div><label style={S.label}>Surface du bien (m²)</label><input type="number" style={S.inp} value={form.surfaceBien} onChange={f("surfaceBien")} /></div>
        </div>
        <label style={S.label}>Adresse exacte du bien</label>
        <input style={S.inp} value={form.adresseBien} onChange={f("adresseBien")} placeholder="Rue, quartier, ville…" />
        <label style={S.label}>Contexte de la demande</label>
        <textarea style={S.ta} value={form.contexteDemande} onChange={f("contexteDemande")} placeholder="Pré-achat, litige avec entreprise, vérification conformité, autre…" />
        <div style={{ borderTop: "1px solid #1e2330", marginTop: 8, paddingTop: 16, marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 }}>Contact</div>
          <div style={S.row2}>
            <div><label style={S.label}>Nom</label><input style={S.inp} value={form.clientNom} onChange={f("clientNom")} /></div>
            <div><label style={S.label}>Téléphone</label><input style={S.inp} value={form.clientTel} onChange={f("clientTel")} /></div>
          </div>
          <label style={S.label}>Email</label>
          <input style={S.inp} value={form.clientEmail} onChange={f("clientEmail")} />
        </div>
        <button style={S.btn} onClick={submit}>Commander mon rapport →</button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.hero}>
        <div style={S.badge}>PORTE P5 — RAPPORTS & EXPERTISES</div>
        <div style={S.title}>Expertise technique indépendante</div>
        <div style={S.sub}>Rapport signé par architecte DENA · Opposable en litige · 5–10 jours</div>
      </div>
      <div style={S.grid}>
        {TYPES_RAPPORT.map(t => (
          <div key={t.id} style={S.card(typeRapport === t.id)} onClick={() => { setTypeRapport(t.id); setStep("form"); }}>
            <div style={S.cardIcon}>{t.icon}</div>
            <div style={S.cardTitle}>{t.label}</div>
            <div style={S.cardDesc}>{t.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#090e18", borderTop: "1px solid #1a2234", padding: "24px", textAlign: "center", color: "#3d4f6a", fontSize: 12 }}>
        © 2026 CITURBAREA — Rapports d'expertise architecturale au Maroc
      </div>
    </div>
  );
}
