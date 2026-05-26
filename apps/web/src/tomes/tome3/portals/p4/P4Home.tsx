import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang, useT } from "../../../../i18n/i18n";

/**
 * P4Home — Wizard analyse foncière (3 packs)
 *
 * Étapes:
 *   1. Pack (BASIQUE 0.3% / MOYEN 0.6% / RENTABILITE 1%)
 *   2. Identité du foncier (titre, surface, commune, prix vente cible)
 *   3. Devis détaillé (POST /p4/quote)
 *   4. Identité client + soumission via /p2/intake (porteType:"P4")
 */

type P4Pack = "BASIQUE" | "MOYEN" | "RENTABILITE";

type Pack = {
  code: P4Pack;
  rate: number;
  ratePct: string;
  label: string;
  shortDesc: string;
  deliveryDays: number;
  deliverables: string[];
};

type Quote = {
  ok: true;
  meta: { pack: P4Pack; packLabel: string; rate: number; ratePct: string; deliveryDays: number };
  base: { prixVenteFoncierDH: number; rate: number; floorHT: number; flooredApplied: boolean };
  deliverables: string[];
  amounts: { computedHT: number; totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  payment: { modalities: string; download: string };
  notes: string[];
};

const ICONS: Record<P4Pack, string> = {
  BASIQUE: "🗺️",
  MOYEN: "📜",
  RENTABILITE: "💰",
};
const COLORS: Record<P4Pack, string> = {
  BASIQUE: "#22d3ee",
  MOYEN: "#a78bfa",
  RENTABILITE: "#f59e0b",
};

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};
const cardStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#1a0f00" : "#111827",
  border: `2px solid ${active ? "#f59e0b" : "#1e2330"}`,
  borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "all .15s",
});
const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 30, height: 4, borderRadius: 2,
  background: done ? "#f59e0b" : active ? "#b45309" : "#1e2330",
});

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#1a0f00 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" },
  badge: { display: "inline-block", background: "#1a0f00", color: "#f59e0b", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "20px 24px 60px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16, padding: "0 24px 60px", maxWidth: 1000, margin: "0 auto" },
  cardIcon: { fontSize: 36, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  cardDesc: { color: "#9ca3af", fontSize: 12, marginBottom: 12, lineHeight: 1.5 },
  cardRate: { fontWeight: 800, fontFamily: "'DM Mono', monospace" },
  formTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  label: { display: "block", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#b45309", color: "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
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
  successWrap: { maxWidth: 560, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "pack" | "foncier" | "quote" | "identity" | "submitting" | "success";

export default function P4Home() {
  const t = useT();
  const [step, setStep] = useState<Step>("pack");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [pack, setPack] = useState<P4Pack | null>(null);
  const [foncier, setFoncier] = useState({
    titreFoncierNum: "", surfaceTerrainM2: "", commune: "", adresse: "", prixVenteFoncierDH: "",
    natureUsagePrevu: "",
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "", raisonSociale: "",
  });
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/p4/packs`).then(r => r.json())
      .then(d => { if (d.ok) setPacks(d.items); })
      .catch(() => setError("Erreur chargement"));
  }, []);

  const stepIndex = ["pack", "foncier", "quote", "identity"].indexOf(step);
  const selectedPack = packs.find(p => p.code === pack);

  const compute = async () => {
    setError("");
    if (!foncier.prixVenteFoncierDH || +foncier.prixVenteFoncierDH <= 0) {
      setError("Prix de vente du foncier requis (en DH).");
      return;
    }
    setStep("submitting");
    try {
      const res = await fetch(`${apiBase()}/p4/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, prixVenteFoncierDH: +foncier.prixVenteFoncierDH }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur");
      setQuote(data);
      setStep("quote");
    } catch (e: any) {
      setError(e.message);
      setStep("foncier");
    }
  };

  const submit = async () => {
    setError("");
    if (!identity.clientNom || !identity.clientTel) {
      setError("Nom et téléphone obligatoires.");
      return;
    }
    setStep("submitting");
    try {
      const title = `Analyse foncière ${selectedPack?.label} — ${foncier.commune || "—"}`;
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          porteType: "P4",
          gestionMode: "AUTONOME",
          commune: foncier.commune || undefined,
          raisonSociale: identity.raisonSociale || undefined,
          clientNom: identity.clientNom,
          clientTel: identity.clientTel,
          clientEmail: identity.clientEmail || undefined,
          natureProjet: foncier.natureUsagePrevu || undefined,
          surfaceTerrain: foncier.surfaceTerrainM2 ? +foncier.surfaceTerrainM2 : undefined,
          title,
          source: "P4_WIZARD",
          lang: getStoredLang(),
          brief: {
            pack,
            packLabel: selectedPack?.label,
            titreFoncierNum: foncier.titreFoncierNum,
            adresse: foncier.adresse,
            prixVenteFoncierDH: +foncier.prixVenteFoncierDH,
            natureUsagePrevu: foncier.natureUsagePrevu,
            quoteSnapshot: quote,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Erreur soumission");
      if (data.access_token) { try { localStorage.setItem("citurbarea.token", data.access_token); } catch {} }
      setDossierId(data.dossierId);
      setStep("success");
    } catch (e: any) {
      setError(e.message);
      setStep("identity");
    }
  };

  if (step === "submitting") return <div style={S.loader}>⏳ Calcul en cours…</div>;

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>Demande d'analyse foncière enregistrée</div>
          <div style={S.successSub}>
            Pack <strong>{selectedPack?.label}</strong> — {fmtMAD(quote?.amounts.totalTTC)} TTC.<br/>
            Vous recevez sous 24h le lien de paiement sécurisé.<br/>
            Le rapport vous sera livré sous {quote?.meta.deliveryDays} jours ouvrables après paiement.<br/><br/>
            <span style={{ color: "#fcd34d", fontSize: 12 }}>📄 Le rapport sera téléchargeable en PDF watermarké après confirmation du paiement.</span><br/>
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
    <div style={S.stepper}>{[0,1,2,3].map(i => <div key={i} style={stepStyle(i === stepIndex, i < stepIndex)} />)}</div>
  );

  // Step 1: pack
  if (step === "pack") {
    return (
      <div style={S.root}>
        <div style={S.hero}>
          <div style={S.badge}>PORTE P4 — {t("p4.home_title").toUpperCase()}</div>
          <div style={S.title}>{t("p4.home_title")}</div>
          <div style={S.sub}>{t("p4.home_subtitle")}</div>
        </div>
        <div style={S.grid}>
          {packs.map(p => (
            <div key={p.code} style={cardStyle(false)} onClick={() => { setPack(p.code); setStep("foncier"); }}>
              <div style={S.cardIcon}>{ICONS[p.code]}</div>
              <div style={S.cardTitle}>{p.label}</div>
              <div style={S.cardDesc}>{p.shortDesc}</div>
              <div style={{ ...S.cardRate, color: COLORS[p.code], fontSize: 22 }}>{p.ratePct}</div>
              <div style={{ color: "#6b7280", fontSize: 11 }}>du prix vente foncier · livraison {p.deliveryDays} j</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#cbd5e1" }}>
                {p.deliverables.slice(0, 3).map((d, i) => <div key={i}>✓ {d}</div>)}
                {p.deliverables.length > 3 && <div style={{ color: "#6b7280" }}>… +{p.deliverables.length - 3} livrables</div>}
              </div>
            </div>
          ))}
          {packs.length === 0 && <div style={{ color: "#6b7280" }}>Chargement…</div>}
        </div>
      </div>
    );
  }

  // Step 2: foncier info
  if (step === "foncier") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("pack")}>← Changer de pack</button>
          <Stepper />
          <div style={S.formTitle}>Informations sur le foncier</div>
          <div style={S.formSub}>Pack sélectionné : <strong>{selectedPack?.label}</strong> ({selectedPack?.ratePct} du prix vente).</div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div>
              <label style={S.label}>Titre foncier (n°)</label>
              <input style={S.inp} value={foncier.titreFoncierNum} onChange={e => setFoncier({...foncier, titreFoncierNum: e.target.value})} placeholder="12345/68" />
            </div>
            <div>
              <label style={S.label}>Surface terrain (m²)</label>
              <input type="number" style={S.inp} value={foncier.surfaceTerrainM2} onChange={e => setFoncier({...foncier, surfaceTerrainM2: e.target.value})} placeholder="500" />
            </div>
          </div>
          <label style={S.label}>Commune *</label>
          <input style={S.inp} value={foncier.commune} onChange={e => setFoncier({...foncier, commune: e.target.value})} placeholder="Kénitra" />
          <label style={S.label}>Adresse précise / lieu-dit</label>
          <input style={S.inp} value={foncier.adresse} onChange={e => setFoncier({...foncier, adresse: e.target.value})} placeholder="Quartier, bd, …" />
          <label style={S.label}>Prix de vente / acquisition cible (DH) *</label>
          <input type="number" style={S.inp} value={foncier.prixVenteFoncierDH} onChange={e => setFoncier({...foncier, prixVenteFoncierDH: e.target.value})} placeholder="2 500 000" />
          <div style={{ color: "#6b7280", fontSize: 11, marginTop: -8, marginBottom: 14 }}>
            Assiette de calcul des honoraires P4 : {selectedPack?.ratePct} de ce montant (plancher 3 000 DH HT).
          </div>
          <label style={S.label}>Nature d'usage prévue (si pack RENTABILITÉ)</label>
          <input style={S.inp} value={foncier.natureUsagePrevu} onChange={e => setFoncier({...foncier, natureUsagePrevu: e.target.value})} placeholder="Résidentiel R+4, équipement, lotissement…" />

          <button style={S.btn} onClick={compute}>{t("wizard.compute_quote")} →</button>
        </div>
      </div>
    );
  }

  // Step 3: quote
  if (step === "quote" && quote) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("foncier")}>← Modifier</button>
          <Stepper />
          <div style={S.formTitle}>Devis analyse foncière</div>
          <div style={S.formSub}>Honoraires forfaitaires en pourcentage du prix de vente / acquisition du foncier.</div>

          <div style={S.quoteWrap}>
            <div style={S.quoteHead}>
              <div>
                <div style={S.quoteCat}>{quote.meta.packLabel}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
                  {quote.meta.ratePct} de {fmtMAD(quote.base.prixVenteFoncierDH)} foncier · livraison {quote.meta.deliveryDays} j
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.quoteAmount}>{fmtMAD(quote.amounts.totalTTC)}</div>
                <div style={S.quoteAmountSub}>TTC honoraires P4</div>
              </div>
            </div>

            <div style={S.quoteRow}><span style={S.quoteRowKey}>Calcul brut ({quote.meta.ratePct})</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.computedHT)}</span></div>
            {quote.base.flooredApplied && <div style={S.quoteRow}><span style={S.quoteRowKey}>Plancher tarifaire</span><span style={S.quoteRowVal}>{fmtMAD(quote.base.floorHT)}</span></div>}
            <div style={S.quoteRow}><span style={S.quoteRowKey}>Honoraires HT retenus</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.totalHT)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>TVA 20%</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.tva)}</span></div>

            <div style={{ marginTop: 18 }}>
              <div style={{ ...S.quoteRowKey, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Livrables</div>
              {quote.deliverables.map((d, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            <div style={S.noteBox}>
              <strong>Modalités de paiement :</strong> {quote.payment.modalities}<br/><br/>
              <strong>📄 Téléchargement & utilisation :</strong> {quote.payment.download}
            </div>

            <div style={{ marginTop: 14, color: "#6b7280", fontSize: 11, lineHeight: 1.6 }}>
              {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
            </div>
          </div>

          <button style={S.btn} onClick={() => setStep("identity")}>Continuer : identité →</button>
        </div>
      </div>
    );
  }

  // Step 4: identity
  if (step === "identity") {
    const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setIdentity(prev => ({ ...prev, [k]: e.target.value }));
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("quote")}>← Retour devis</button>
          <Stepper />
          <div style={S.formTitle}>Vos coordonnées</div>
          <div style={S.formSub}>Pour vous transmettre le lien de paiement et le rapport.</div>
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
          <input style={S.inp} value={identity.clientEmail} onChange={f("clientEmail")} placeholder="vous@exemple.ma" />
          <label style={S.label}>Raison sociale (si entreprise)</label>
          <input style={S.inp} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="—" />

          <button style={S.btn} onClick={submit}>{t("wizard.submit")} →</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
