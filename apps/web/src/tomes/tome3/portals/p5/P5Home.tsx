import { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";

/**
 * P5Home — Wizard rapports d'expertise (one-shot)
 *
 * Étapes:
 *   1. Type de rapport (4 cards depuis /p5/reports)
 *   2. Surface du bien (optionnel, slot 0-200 / 200-500 / 500+)
 *   3. Délai (Express +50% / Standard / Économique -10%)
 *   4. Devis détaillé (POST /p5/quote)
 *   5. Identité client + soumission via /p2/intake (porteType:"P5")
 */

type ReportType = "ESTIMATION_VENALE" | "CONFORMITE_URBANISTIQUE" | "RISQUE_TECHNIQUE" | "EXPERTISE_BATI";
type DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";
type SurfaceSlot = "S_0_200" | "S_200_500" | "S_500_PLUS";

type Report = {
  code: ReportType;
  label: string;
  shortDesc: string;
  baseHT: number;
  deliveryDays: number;
  deliverables: string[];
};

type Quote = {
  ok: true;
  meta: {
    reportType: ReportType; reportLabel: string;
    delayMode: DelayMode; delayLabel: string;
    deliveryDays: number;
    surfaceSlot: SurfaceSlot; surfaceLabel: string;
  };
  base: { baseHT: number; surfaceCoefficient: number; delayCoefficient: number };
  deliverables: string[];
  amounts: { totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  payment: { modalities: string };
  notes: string[];
};

const ICONS: Record<ReportType, string> = {
  ESTIMATION_VENALE: "💰",
  CONFORMITE_URBANISTIQUE: "📐",
  RISQUE_TECHNIQUE: "⚠️",
  EXPERTISE_BATI: "🔍",
};

const SURFACE_OPTIONS: { id: SurfaceSlot; label: string; sub: string }[] = [
  { id: "S_0_200", label: "≤ 200 m²", sub: "Appartement, petite villa, local commercial" },
  { id: "S_200_500", label: "200 – 500 m²", sub: "Villa moyenne, immeuble petit gabarit" },
  { id: "S_500_PLUS", label: "≥ 500 m²", sub: "Grand bâti, ensemble immobilier" },
];

const DELAY_OPTIONS: { id: DelayMode; label: string; sub: string; pct: string; color: string }[] = [
  { id: "EXPRESS", label: "Express", sub: "5 jours ouvrables", pct: "+50%", color: "#ef4444" },
  { id: "STANDARD", label: "Standard", sub: "Délai recommandé", pct: "tarif normal", color: "#22d3ee" },
  { id: "ECONOMIQUE", label: "Économique", sub: "30 jours ouvrables", pct: "-10%", color: "#34d399" },
];

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

const cardStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#0a1a1a" : "#111827",
  border: `2px solid ${active ? "#0e7490" : "#1e2330"}`,
  borderRadius: 12, padding: "20px 18px", cursor: "pointer", transition: "all .15s",
});
const stepStyle = (active: boolean, done: boolean): React.CSSProperties => ({
  width: 30, height: 4, borderRadius: 2,
  background: done ? "#22d3ee" : active ? "#0e7490" : "#1e2330",
});

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#080d14", color: "#e8eaf0", fontFamily: "system-ui,sans-serif" },
  hero: { background: "linear-gradient(135deg,#0a1a1a 0%,#080d14 100%)", padding: "60px 24px 40px", textAlign: "center" },
  badge: { display: "inline-block", background: "#0a1a1a", color: "#22d3ee", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  sub: { color: "#6b7280", fontSize: 16, marginBottom: 32 },
  stepper: { display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "20px 24px 60px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16, padding: "0 24px 60px", maxWidth: 900, margin: "0 auto" },
  cardIcon: { fontSize: 36, marginBottom: 12 },
  cardTitle: { fontWeight: 700, fontSize: 16, marginBottom: 4 },
  cardDesc: { color: "#6b7280", fontSize: 13 },
  cardPrice: { color: "#22d3ee", fontWeight: 700, marginTop: 12, fontFamily: "'DM Mono', monospace" },
  formTitle: { fontSize: 24, fontWeight: 800, marginBottom: 8 },
  formSub: { color: "#6b7280", fontSize: 14, marginBottom: 24 },
  label: { display: "block", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  inp: { background: "#0a0f1a", border: "1px solid #1e2330", borderRadius: 6, color: "#e8eaf0", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 14 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  btn: { background: "#0e7490", color: "#fff", border: "none", borderRadius: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 12 },
  btnBack: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", marginBottom: 16, fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, background: "#1a0a0a", padding: "10px 14px", borderRadius: 6 },
  loader: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#080d14", color: "#22d3ee", fontSize: 18 },
  quoteWrap: { background: "#0d1217", border: "1px solid #1e2330", borderRadius: 12, padding: 24, marginBottom: 24 },
  quoteHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e2330", paddingBottom: 14, marginBottom: 18 },
  quoteCat: { color: "#22d3ee", fontSize: 13, fontWeight: 700 },
  quoteAmount: { fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 },
  quoteAmountSub: { color: "#6b7280", fontSize: 12, marginTop: 4 },
  quoteRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1a2030", fontSize: 13 },
  quoteRowKey: { color: "#9ca3af" },
  quoteRowVal: { color: "#e8eaf0", fontWeight: 600, fontFamily: "'DM Mono', monospace" },
  noteBox: { background: "#0a1a1a", border: "1px solid #0e749040", borderRadius: 8, padding: 14, marginTop: 14, fontSize: 12, lineHeight: 1.6, color: "#7dd3fc" },
  successWrap: { maxWidth: 560, margin: "80px auto", padding: "40px 32px", background: "#0d1a0d", border: "1.5px solid #166534", borderRadius: 16, textAlign: "center" },
  successIcon: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: 800, color: "#4ade80", marginBottom: 8 },
  successSub: { color: "#9ca3af", fontSize: 14, lineHeight: 1.7, marginBottom: 24 },
};

type Step = "type" | "surface" | "delay" | "quote" | "identity" | "submitting" | "success";

export default function P5Home() {
  const [step, setStep] = useState<Step>("type");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [surfaceSlot, setSurfaceSlot] = useState<SurfaceSlot>("S_0_200");
  const [delayMode, setDelayMode] = useState<DelayMode>("STANDARD");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", commune: "", adresseBien: "",
  });
  const [dossierId, setDossierId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase()}/p5/reports`).then(r => r.json())
      .then(d => { if (d.ok) setReports(d.items); })
      .catch(() => setError("Erreur chargement"));
  }, []);

  const stepIndex = ["type", "surface", "delay", "quote", "identity"].indexOf(step);
  const selectedReport = reports.find(r => r.code === reportType);

  const compute = async () => {
    setError("");
    setStep("submitting");
    try {
      const res = await fetch(`${apiBase()}/p5/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType, surfaceSlot, delayMode }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur");
      setQuote(data);
      setStep("quote");
    } catch (e: any) {
      setError(e.message);
      setStep("delay");
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
      const title = `Rapport ${selectedReport?.label} — ${identity.commune || identity.adresseBien || "—"}`;
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          porteType: "P5",
          gestionMode: "AUTONOME",
          commune: identity.commune || undefined,
          raisonSociale: identity.raisonSociale || undefined,
          clientNom: identity.clientNom,
          clientTel: identity.clientTel,
          clientEmail: identity.clientEmail || undefined,
          natureProjet: identity.adresseBien || undefined,
          title,
          source: "P5_WIZARD",
          brief: {
            reportType,
            reportLabel: selectedReport?.label,
            surfaceSlot,
            delayMode,
            adresseBien: identity.adresseBien,
            quoteSnapshot: quote,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Erreur soumission");
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
          <div style={S.successTitle}>Demande de rapport enregistrée</div>
          <div style={S.successSub}>
            Votre demande de <strong>{selectedReport?.label}</strong> a été transmise à l'équipe d'experts CITURBAREA.<br/>
            Vous recevez sous 24h un devis ferme + lien de paiement sécurisé.<br/>
            La mission démarre à réception du paiement, le rapport vous sera livré sous {quote?.meta.deliveryDays} jours ouvrables.<br/><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>Ref dossier : {dossierId?.slice(0, 12)}…</span>
          </div>
          <a href="/" style={{ color: "#22d3ee", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>← Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  const Stepper = () => (
    <div style={S.stepper}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={stepStyle(i === stepIndex, i < stepIndex)} />
      ))}
    </div>
  );

  // Step 1: type rapport
  if (step === "type") {
    return (
      <div style={S.root}>
        <div style={S.hero}>
          <div style={S.badge}>PORTE P5 — RAPPORTS & EXPERTISES</div>
          <div style={S.title}>Quel rapport souhaitez-vous ?</div>
          <div style={S.sub}>Livrable PDF signé numériquement par l'expert · 4 types disponibles</div>
        </div>
        <div style={S.grid}>
          {reports.map(r => (
            <div key={r.code} style={cardStyle(false)} onClick={() => { setReportType(r.code); setStep("surface"); }}>
              <div style={S.cardIcon}>{ICONS[r.code]}</div>
              <div style={S.cardTitle}>{r.label}</div>
              <div style={S.cardDesc}>{r.shortDesc}</div>
              <div style={S.cardPrice}>à partir de {fmtMAD(r.baseHT)} HT</div>
              <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>Délai standard : {r.deliveryDays} jours</div>
            </div>
          ))}
          {reports.length === 0 && <div style={{ color: "#6b7280" }}>Chargement des prestations…</div>}
        </div>
      </div>
    );
  }

  // Step 2: surface
  if (step === "surface") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("type")}>← Changer de type</button>
          <Stepper />
          <div style={S.formTitle}>Surface du bien</div>
          <div style={S.formSub}>Le tarif s'ajuste selon la complexité de l'expertise (surface plancher du bâti).</div>
          {SURFACE_OPTIONS.map(o => (
            <div
              key={o.id}
              style={{ ...cardStyle(surfaceSlot === o.id), marginBottom: 12, padding: "16px 20px" }}
              onClick={() => { setSurfaceSlot(o.id); setStep("delay"); }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>{o.label}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{o.sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: delay
  if (step === "delay") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("surface")}>← Retour</button>
          <Stepper />
          <div style={S.formTitle}>Délai souhaité</div>
          <div style={S.formSub}>Délai de livraison à compter de la réception du paiement et des documents nécessaires.</div>
          {error && <div style={S.err}>⚠ {error}</div>}
          {DELAY_OPTIONS.map(o => (
            <div
              key={o.id}
              style={{ ...cardStyle(delayMode === o.id), marginBottom: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onClick={() => setDelayMode(o.id)}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{o.label}</div>
                <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{o.sub}</div>
              </div>
              <div style={{ color: o.color, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{o.pct}</div>
            </div>
          ))}
          <button style={S.btn} onClick={compute}>Calculer le devis →</button>
        </div>
      </div>
    );
  }

  // Step 4: quote
  if (step === "quote" && quote) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("delay")}>← Modifier</button>
          <Stepper />
          <div style={S.formTitle}>Devis rapport d'expertise</div>
          <div style={S.formSub}>Prestation forfaitaire one-shot. Paiement intégral à la commande.</div>

          <div style={S.quoteWrap}>
            <div style={S.quoteHead}>
              <div>
                <div style={S.quoteCat}>{quote.meta.reportLabel}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
                  {quote.meta.surfaceLabel} · {quote.meta.delayLabel}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.quoteAmount}>{fmtMAD(quote.amounts.totalTTC)}</div>
                <div style={S.quoteAmountSub}>TTC honoraires expertise</div>
              </div>
            </div>

            <div style={S.quoteRow}><span style={S.quoteRowKey}>Honoraires HT</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.totalHT)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>TVA 20%</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.tva)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>Délai de livraison</span><span style={S.quoteRowVal}>{quote.meta.deliveryDays} j ouvrables</span></div>

            <div style={{ marginTop: 18 }}>
              <div style={{ ...S.quoteRowKey, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Livrables inclus</div>
              {quote.deliverables.map((d, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "4px 0" }}>✓ {d}</div>
              ))}
            </div>

            <div style={S.noteBox}>
              <strong>Modalités :</strong> {quote.payment.modalities}
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

  // Step 5: identity
  if (step === "identity") {
    const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setIdentity(prev => ({ ...prev, [k]: e.target.value }));
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("quote")}>← Retour devis</button>
          <Stepper />
          <div style={S.formTitle}>Vos coordonnées</div>
          <div style={S.formSub}>Pour vous transmettre le devis ferme + lien de paiement sécurisé.</div>
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

          <div style={{ ...S.formSub, fontSize: 11, color: "#6b7280", margin: "8px 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>Bien à expertiser</div>
          <label style={S.label}>Commune</label>
          <input style={S.inp} value={identity.commune} onChange={f("commune")} placeholder="Kénitra, Rabat…" />
          <label style={S.label}>Adresse précise du bien (optionnel)</label>
          <input style={S.inp} value={identity.adresseBien} onChange={f("adresseBien")} placeholder="N° rue, quartier, étage…" />

          <button style={S.btn} onClick={submit}>Soumettre la demande →</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
