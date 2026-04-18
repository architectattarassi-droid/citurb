import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SOUS_TYPES = [
  { id: "COMMERCE", label: "Local commercial", icon: "🏪", desc: "Boutique, restaurant, commerce de détail" },
  { id: "BUREAU", label: "Bureau / Coworking", icon: "🏢", desc: "Espace de travail professionnel" },
  { id: "ENTREPOT", label: "Entrepôt / Hangar", icon: "🏭", desc: "Stockage, logistique, distribution" },
  { id: "INDUSTRIE", label: "Unité industrielle", icon: "⚙️", desc: "Usine, atelier de production" },
  { id: "EQUIPEMENT", label: "Équipement", icon: "🏗️", desc: "École, mosquée, équipement public" },
  { id: "RENOVATION_PRO", label: "Rénovation pro", icon: "🔧", desc: "Extension ou réhabilitation professionnelle" },
];

const tk = () => localStorage.getItem("citurbarea.token") || "";

const S = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#1a1200 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" as const },
  badge: { display: "inline-block", background: "#2a1a00", color: "#f59e0b", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8, color: "#e8eaf0" },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, maxWidth: 900, margin: "0 auto", padding: "0 24px 60px" },
  card: (active: boolean): React.CSSProperties => ({
    background: active ? "#1a1200" : "#111827",
    border: `2px solid ${active ? "#f59e0b" : "#1e2330"}`,
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
  section: { borderTop: "1px solid #1e2330", marginTop: 8, paddingTop: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 },
  btn: { background: "#b45309", color: "#fff", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 8 },
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "8px 12px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#f59e0b", fontSize: 18 },
};

type Step = "landing" | "form" | "loading";

export default function P2Home() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("landing");
  const [sousType, setSousType] = useState("");
  const [form, setForm] = useState({
    commune: "", surfaceTerrain: "", surfacePlancher: "", nbNiveaux: "", natureProjet: "",
    clientNom: "", raisonSociale: "", representant: "", rc: "", ice: "",
    clientTel: "", clientEmail: "",
  });
  const [error, setError] = useState("");

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async () => {
    if (!sousType || !form.commune || !form.surfacePlancher) {
      setError("Commune et surface plancher sont obligatoires.");
      return;
    }
    setStep("loading");
    setError("");
    try {
      const res = await fetch("/p2/dossier/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tk()}` },
        body: JSON.stringify({
          porteType: "P2",
          gestionMode: "AUTONOME",
          sousTypeP2: sousType,
          commune: form.commune,
          surfaceTerrain: form.surfaceTerrain ? +form.surfaceTerrain : undefined,
          surfacePlancher: +form.surfacePlancher,
          nbNiveaux: form.nbNiveaux ? +form.nbNiveaux : undefined,
          natureProjet: form.natureProjet || undefined,
          raisonSociale: form.raisonSociale || form.clientNom || undefined,
          rc: form.rc || undefined,
          ice: form.ice || undefined,
          representant: form.representant || undefined,
          clientNom: form.clientNom || form.raisonSociale || undefined,
          clientTel: form.clientTel || undefined,
          clientEmail: form.clientEmail || undefined,
          title: `${SOUS_TYPES.find(s => s.id === sousType)?.label ?? "P2"} — ${form.commune}`,
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
      setError(e.message);
      setStep("form");
    }
  };

  if (step === "loading") {
    return <div style={S.loader}>Création du dossier P2…</div>;
  }

  const selectedType = SOUS_TYPES.find(s => s.id === sousType);

  if (step === "form") {
    return (
      <div style={S.root}>
        <div style={S.formWrap}>
          <button style={S.btnBack} onClick={() => setStep("landing")}>← Retour</button>
          <div style={S.formTitle}>
            {selectedType?.icon} {selectedType?.label}
          </div>
          <div style={S.formSub}>Porte P2 — Projet professionnel & institutionnel</div>

          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div>
              <label style={S.label}>Commune *</label>
              <input style={S.inp} value={form.commune} onChange={f("commune")} placeholder="Kénitra, Rabat…" />
            </div>
            <div>
              <label style={S.label}>Surface plancher (m²) *</label>
              <input type="number" style={S.inp} value={form.surfacePlancher} onChange={f("surfacePlancher")} placeholder="150" />
            </div>
          </div>

          <div style={S.row2}>
            <div>
              <label style={S.label}>Surface terrain (m²)</label>
              <input type="number" style={S.inp} value={form.surfaceTerrain} onChange={f("surfaceTerrain")} placeholder="300" />
            </div>
            <div>
              <label style={S.label}>Niveaux</label>
              <input type="number" style={S.inp} value={form.nbNiveaux} onChange={f("nbNiveaux")} placeholder="2" />
            </div>
          </div>

          <label style={S.label}>Nature du projet</label>
          <input style={S.inp} value={form.natureProjet} onChange={f("natureProjet")} placeholder="Construction neuve, extension, réhabilitation…" />

          <div style={S.section}>
            <div style={S.sectionLabel}>Identité client / société</div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Raison sociale *</label>
                <input style={S.inp} value={form.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL EXEMPLE" />
              </div>
              <div>
                <label style={S.label}>Représentant légal</label>
                <input style={S.inp} value={form.representant} onChange={f("representant")} placeholder="M. Nom Prénom" />
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>RC</label>
                <input style={S.inp} value={form.rc} onChange={f("rc")} placeholder="12345" />
              </div>
              <div>
                <label style={S.label}>ICE</label>
                <input style={S.inp} value={form.ice} onChange={f("ice")} placeholder="000000000000000" />
              </div>
            </div>
            <div style={S.row2}>
              <div>
                <label style={S.label}>Téléphone</label>
                <input style={S.inp} value={form.clientTel} onChange={f("clientTel")} placeholder="+212600000000" />
              </div>
              <div>
                <label style={S.label}>Email</label>
                <input style={S.inp} value={form.clientEmail} onChange={f("clientEmail")} placeholder="contact@societe.ma" />
              </div>
            </div>
          </div>

          <button style={S.btn} onClick={submit}>Créer le dossier P2 →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <div style={S.hero}>
        <div style={S.badge}>PORTE P2 — PROFESSIONNEL</div>
        <div style={S.title}>Projet professionnel & institutionnel</div>
        <div style={S.sub}>Commerce, bureau, industrie, équipement — choisissez votre type de projet</div>
      </div>
      <div style={S.grid}>
        {SOUS_TYPES.map(st => (
          <div
            key={st.id}
            style={S.card(sousType === st.id)}
            onClick={() => { setSousType(st.id); setStep("form"); }}
          >
            <div style={S.cardIcon}>{st.icon}</div>
            <div style={S.cardTitle}>{st.label}</div>
            <div style={S.cardDesc}>{st.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
