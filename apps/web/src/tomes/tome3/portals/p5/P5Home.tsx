import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiBase } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";
import { getStoredLang } from "../../../../i18n/i18n";

/**
 * P5Home — Rapports & Expertises (refonte v2 — UI premium niveau P2)
 *
 * Doctrine : trois rapports au pourcentage.
 *   - EXPERTISE_PRIX     = 1.0 % du prix foncier        (min 5 000 DH)
 *   - EXPERTISE_URBA     = 0.5 % du coût de construction (min 6 000 DH)
 *   - READY_TO_INVEST    = 1.0 % du montant total invest (min 18 000 DH)
 *
 * Séquence stricte (alignée P1/P2) :
 *   Étape 1 — Qui êtes-vous (identité MOA + localisation)
 *   Étape 2 — Choix du rapport (3 cartes premium type P1)
 *   Étape 3 — Caractéristiques financières (prix foncier / coût constr. / invest. total)
 *   Étape 4 — Délai souhaité
 *   Bouton final → si non connecté : signup + double OTP → P5Finalize
 *                  si connecté : intake direct + devis livré dans dossier identifié
 */

const P5_PENDING_KEY = "citurbarea:p5:pending_intake:v1";

type ReportType = "EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST";
type DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";
type Phase = "identity" | "report" | "details" | "delay";

type Quote = {
  ok: true;
  meta: {
    reportType: ReportType; reportLabel: string;
    delayMode: DelayMode; delayLabel: string; deliveryDays: number;
    rate: number; assietteLabel: string; assietteMAD: number;
  };
  base: { ratePercent: number; baseRawHT: number; minHT: number; minApplied: boolean; delayCoefficient: number; bundleDiscount: number };
  deliverables: string[];
  audience: string[];
  signature: string;
  amounts: { totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  payment: { modalities: string };
  notes: string[];
};

const REPORT_CARDS: { code: ReportType; category: string; title: string; sub: string; tagline: string; bullets: string[]; targets: string }[] = [
  {
    code: "EXPERTISE_PRIX",
    category: "EXPERTISE PRIX",
    title: "Rapport Expertise Prix",
    sub: "Valeur vénale fondée + étude comparée de marché.",
    tagline: "1 % du prix foncier · min 5 000 DH HT",
    bullets: [
      "Visite terrain + relevé du bien",
      "Étude comparée ≥ 3 références ventes",
      "Méthodologie documentée et opposable",
      "Fourchette + valeur centrale",
      "PDF signé numériquement (12-20 p)",
    ],
    targets: "Vendeurs / acquéreurs · Banques (garantie hypothécaire) · Successions",
  },
  {
    code: "EXPERTISE_URBA",
    category: "EXPERTISE URBANISTIQUE",
    title: "Rapport Expertise Urbanistique",
    sub: "Note RU + COS/CES/gabarit + scénarios de constructibilité.",
    tagline: "0,5 % du coût de construction · min 6 000 DH HT",
    bullets: [
      "Note de renseignement urbanistique actualisée",
      "Analyse PA / PADD / SDAU",
      "COS / CES / hauteur / recul / façades",
      "Scénarios constructibilité (mini / médian / max)",
      "Recommandations & risques réglementaires",
    ],
    targets: "Promoteurs en due-diligence · Acquéreurs fonciers · Architectes",
  },
  {
    code: "READY_TO_INVEST",
    category: "READY-TO-INVEST · BP BANKABLE",
    title: "Rapport Complet Premium",
    sub: "Business Plan complet pour banques, fonds et family offices.",
    tagline: "1 % du montant d'investissement · min 18 000 DH HT",
    bullets: [
      "Synthèse exécutive — recommandation investissement",
      "Foncier · Urba · Programme architectural",
      "Coût études CNOA + coût réalisation par standing",
      "Prix de vente projeté · Budget total",
      "ROI · TRI · VAN · payback · sensibilité",
      "Plan de financement · ratios LTV / LTC",
      "PDF premium 40-60 p co-signé (architecte + expert)",
    ],
    targets: "Banques · Fonds d'investissement · Family offices · Business angels",
  },
];

const DELAY_CARDS: { code: DelayMode; title: string; sub: string; pct: string; tone: "express" | "standard" | "eco" }[] = [
  { code: "EXPRESS",    title: "Express",    sub: "5 jours ouvrables",          pct: "+40 %",        tone: "express" },
  { code: "STANDARD",   title: "Standard",   sub: "Délai recommandé",           pct: "Tarif de base", tone: "standard" },
  { code: "ECONOMIQUE", title: "Économique", sub: "30 jours ouvrables",         pct: "-10 %",        tone: "eco" },
];

const fmtMAD = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(Number(n)) + " DH";
};

class P5ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ maxWidth: 900, margin: "48px auto", padding: "24px 28px", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.6, color: "#b91c1c", background: "#fff", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, whiteSpace: "pre-wrap" }}>
          <strong style={{ fontSize: 15 }}>Porte 5 — erreur de rendu</strong>
          {"\n\n"}{this.state.err.message}
          {"\n\n"}{this.state.err.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function P5Home() {
  return <P5ErrorBoundary><P5HomeInner /></P5ErrorBoundary>;
}

function P5HomeInner() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Si on arrive depuis P2 expertise (?fromP2=<id>&expertise=1) on pré-sélectionne le rapport
  // complet (Ready-to-Invest) car c'est l'option par défaut pour un projet pas encore qualifié.
  const fromP2 = searchParams.get("fromP2");
  const expertiseHint = searchParams.get("expertise") === "1";

  const [screen, setScreen] = useState<"flow" | "success">("flow");
  const [phase, setPhase] = useState<Phase>("identity");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [moaType, setMoaType] = useState<"physique" | "morale">("physique");
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    region: "", province: "", commune: "", adresseBien: "",
  });

  const [reportType, setReportType] = useState<ReportType | null>(expertiseHint ? "READY_TO_INVEST" : null);
  const [prixFoncier, setPrixFoncier] = useState<string>("");
  const [coutConstruction, setCoutConstruction] = useState<string>("");
  const [montantInvest, setMontantInvest] = useState<string>("");
  const [surfaceM2, setSurfaceM2] = useState<string>("");
  const [delayMode, setDelayMode] = useState<DelayMode>("STANDARD");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [dossierId, setDossierId] = useState<string | null>(null);

  const PHASES: Phase[] = ["identity", "report", "details", "delay"];
  const reached = (p: Phase) => PHASES.indexOf(phase) >= PHASES.indexOf(p);

  // Pré-remplissage automatique du montant d'investissement pour Ready-to-Invest
  useEffect(() => {
    if (reportType === "READY_TO_INVEST") {
      const f = Number(prixFoncier || 0);
      const c = Number(coutConstruction || 0);
      if ((f > 0 || c > 0) && !montantInvest) {
        setMontantInvest(String(f + c));
      }
    }
  }, [reportType, prixFoncier, coutConstruction, montantInvest]);

  const selectedReport = REPORT_CARDS.find(r => r.code === reportType);

  // ── Validation ─────────────────────────────────────────────────────
  const validateIdentity = (): string | null => {
    if (!identity.clientNom || !identity.clientTel) return "Nom et téléphone obligatoires.";
    if (!identity.region || !identity.province || !identity.commune) return "Région, province et commune obligatoires.";
    if (moaType === "morale" && (!identity.raisonSociale || !identity.representant)) {
      return "Raison sociale et représentant légal obligatoires pour une personne morale.";
    }
    return null;
  };
  const validateDetails = (): string | null => {
    if (!reportType) return "Choisissez un type de rapport.";
    if (reportType === "EXPERTISE_PRIX" && +prixFoncier <= 0) return "Indiquez le prix d'acquisition du foncier (MAD).";
    if (reportType === "EXPERTISE_URBA" && +coutConstruction <= 0) return "Indiquez le coût de construction estimé (MAD).";
    if (reportType === "READY_TO_INVEST") {
      const total = +montantInvest > 0 ? +montantInvest : (+prixFoncier + +coutConstruction);
      if (total <= 0) return "Indiquez au moins le prix foncier + coût de construction (ou le montant total d'investissement).";
    }
    return null;
  };

  // ── Transitions ────────────────────────────────────────────────────
  const identityContinue = () => {
    setError("");
    const err = validateIdentity();
    if (err) { setError(err); return; }
    setPhase("report");
  };
  const pickReport = (code: ReportType) => {
    setError("");
    setReportType(code);
    setPhase("details");
  };
  const detailsContinue = () => {
    setError("");
    const err = validateDetails();
    if (err) { setError(err); return; }
    setPhase("delay");
  };

  // ── Calcul du devis ────────────────────────────────────────────────
  const computeQuote = async (): Promise<Quote | null> => {
    if (!reportType) return null;
    const body: any = { reportType, delayMode };
    if (prixFoncier) body.prixFoncierMAD = +prixFoncier;
    if (coutConstruction) body.coutConstructionMAD = +coutConstruction;
    if (montantInvest) body.montantInvestissementMAD = +montantInvest;
    if (surfaceM2) body.surfaceM2 = +surfaceM2;
    const res = await fetch(`${apiBase()}/p5/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Erreur de calcul du devis");
    setQuote(data);
    return data;
  };

  // ── Construction du payload intake ─────────────────────────────────
  const buildIntakePayload = (clientEmailOverride?: string) => {
    const title = `Rapport ${selectedReport?.label || ""} — ${identity.commune || identity.adresseBien || "—"}`.trim();
    return {
      porteType: "P5" as const,
      gestionMode: "AUTONOME",
      commune: identity.commune,
      raisonSociale: identity.raisonSociale || undefined,
      representant: identity.representant || undefined,
      rc: identity.rc || undefined,
      ice: identity.ice || undefined,
      clientNom: identity.clientNom,
      clientTel: identity.clientTel,
      clientEmail: clientEmailOverride || identity.clientEmail || undefined,
      natureProjet: selectedReport?.label,
      title,
      lang: getStoredLang(),
      source: "P5_WIZARD",
      brief: {
        reportType,
        reportLabel: selectedReport?.label,
        delayMode,
        prixFoncierMAD: prixFoncier ? +prixFoncier : undefined,
        coutConstructionMAD: coutConstruction ? +coutConstruction : undefined,
        montantInvestissementMAD: montantInvest ? +montantInvest : undefined,
        surfaceM2: surfaceM2 ? +surfaceM2 : undefined,
        adresseBien: identity.adresseBien || undefined,
        region: identity.region,
        province: identity.province,
        moaType,
        fromP2Dossier: fromP2 || undefined,
        quoteSnapshot: quote,
      },
    };
  };

  // ── Submit final ──────────────────────────────────────────────────
  const submitIntake = async () => {
    setError("");
    const idErr = validateIdentity();   if (idErr)   { setError(idErr);   setPhase("identity"); return; }
    const detErr = validateDetails();   if (detErr)  { setError(detErr);  setPhase("details");  return; }

    // Comme P1/P2 : pas connecté → on passe par le signup avec mot de passe + double OTP.
    if (!auth.isAuthed) {
      try { localStorage.setItem(P5_PENDING_KEY, JSON.stringify(buildIntakePayload())); } catch {}
      const params = new URLSearchParams();
      if (identity.clientEmail) params.set("email", identity.clientEmail);
      if (identity.clientTel) params.set("phone", identity.clientTel);
      if (identity.clientNom) params.set("name", identity.clientNom);
      params.set("next", "/p5/finalize");
      navigate(`/creer-compte/client?${params.toString()}`);
      return;
    }

    setBusy(true);
    try {
      // Devis calculé en silence — livré uniquement avec un dossier identifié
      if (!quote) {
        try { await computeQuote(); } catch { /* devis livré ensuite */ }
      }
      const payload = buildIntakePayload(auth.email);
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Erreur soumission");
      if (data.access_token) {
        try { localStorage.setItem("citurbarea.token", data.access_token); } catch {}
      }
      setDossierId(data.dossierId);
      setScreen("success");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  const f = (k: keyof typeof identity) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setIdentity(prev => ({ ...prev, [k]: e.target.value }));

  // ── Écran de succès ────────────────────────────────────────────────
  if (screen === "success") {
    return (
      <div className="p5page" style={fullBleed}>
        <style>{P5_CSS}</style>
        <section className="section">
          <div className="container-max" style={{ maxWidth: 820 }}>
            <div className="lux-card" style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
              <h2 style={{ fontSize: 26, margin: "0 0 12px" }}>Dossier créé · devis du rapport livré</h2>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, margin: "0 0 18px" }}>
                Votre demande de <strong style={{ color: "#0B1B3A" }}>{selectedReport?.label}</strong> est désormais
                rattachée à votre compte et à un dossier identifié dans votre espace CITURBAREA. L'équipe vous
                recontacte sous 24h pour confirmer le devis et lancer la mission à réception du paiement.
                <br />
                <span style={{ fontSize: 12 }}>Réf. dossier : {dossierId?.slice(0, 12)}…</span>
              </p>
            </div>

            {quote && (
              <div className="lux-card" style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "rgba(201,162,39,0.95)", fontSize: 13, fontWeight: 800 }}>{quote.meta.reportLabel}</div>
                    <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
                      Taux {(quote.meta.rate * 100).toFixed(2)} % de {quote.meta.assietteLabel.toLowerCase()} · {quote.meta.delayLabel}
                    </div>
                  </div>
                  <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.32)", borderRadius: 14, padding: "14px 20px", textAlign: "right" }}>
                    <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Devis dossier</div>
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 32, fontWeight: 800, color: "#0B1B3A", lineHeight: 1, marginTop: 3 }}>
                      {fmtMAD(quote.amounts.totalTTC)}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>TTC · honoraires expertise</div>
                  </div>
                </div>
                <div className="gold-divider" style={{ margin: "18px 0 6px" }} />
                <div className="qrow"><span className="k">{quote.meta.assietteLabel}</span><span className="v">{fmtMAD(quote.meta.assietteMAD)}</span></div>
                <div className="qrow"><span className="k">Honoraires HT</span><span className="v">{fmtMAD(quote.amounts.totalHT)}</span></div>
                <div className="qrow"><span className="k">TVA 20 %</span><span className="v">{fmtMAD(quote.amounts.tva)}</span></div>
                <div className="qrow"><span className="k">Délai de livraison</span><span className="v">{quote.meta.deliveryDays} j ouvrables</span></div>

                <div className="blk-title" style={{ marginTop: 16 }}>Livrables inclus</div>
                <div style={{ fontSize: 13, color: "rgba(11,27,58,0.78)", lineHeight: 1.7 }}>
                  {quote.deliverables.map((d, i) => <div key={i}>✓ {d}</div>)}
                </div>

                <div className="mini-note" style={{ marginTop: 14 }}>
                  <strong>Modalités :</strong> {quote.payment.modalities}
                </div>
                <div className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.65 }}>
                  {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a className="btn btn-gold" href={`/payment/start?dossier=${dossierId}`}>💳 Payer maintenant</a>
              <a className="btn btn-dark" href="/portal">📁 Mes dossiers</a>
              <a className="btn" href="/" style={{ background: "transparent", border: "1px solid rgba(11,27,58,0.18)", color: "#0B1B3A" }}>← Accueil</a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Page de qualification ─────────────────────────────────────────
  return (
    <div className="p5page" style={fullBleed}>
      <style>{P5_CSS}</style>

      <header className="hero" style={{ order: -2 }}>
        <div className="container-max" style={{ paddingTop: 72, paddingBottom: 60 }}>
          <div className="kicker">
            <span>Rapports & expertises</span><span style={{ opacity: 0.5 }}>•</span>
            <span>Expert + architecte CNOA</span><span style={{ opacity: 0.5 }}>•</span>
            <span>Livrable PDF signé</span>
          </div>
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <h1>Le rapport qui sécurise votre décision d'investissement.</h1>
              <p className="sub" style={{ fontSize: 18, marginBottom: 26 }}>
                Trois rapports premium au juste prix — expertise prix, expertise urbanistique
                ou business plan complet ready-to-invest pour banques et fonds.
              </p>
              <button className="btn btn-gold" onClick={() => {
                const el = document.getElementById("p5-identity");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                Démarrer ma qualification →
              </button>
              {fromP2 && (
                <div className="mini-note" style={{ marginTop: 18, fontSize: 12.5 }}>
                  ✦ Vous arrivez depuis la Porte 2 — votre dossier <code>{fromP2.slice(0, 8)}…</code> est
                  rattaché à cette mission d'expertise.
                </div>
              )}
            </div>
            <div>
              <div className="lux-card">
                <div className="gold-divider" style={{ marginBottom: 18 }} />
                <div className="grid-2">
                  <div>
                    <div style={{ fontWeight: 900, color: "rgba(11,27,58,0.92)", marginBottom: 6 }}>Tarif au pourcentage</div>
                    <div style={{ color: "rgba(11,18,32,0.72)", fontSize: 13, lineHeight: 1.6 }}>1 % du foncier · 0,5 % du coût construction · 1 % de l'investissement.</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, color: "rgba(11,27,58,0.92)", marginBottom: 6 }}>Livrable bankable</div>
                    <div style={{ color: "rgba(11,18,32,0.72)", fontSize: 13, lineHeight: 1.6 }}>PDF signé, opposable, prêt à présenter à votre banque ou investisseur.</div>
                  </div>
                </div>
                <div className="gold-divider" style={{ marginTop: 18 }} />
                <div style={{ marginTop: 12, fontSize: 12, color: "rgba(11,18,32,0.60)" }}>
                  Mission one-shot, sans engagement de suivi (pour un projet sur la durée, voir Porte 1 ou Porte 2).
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BLOC 1 — IDENTITÉ (style P2) */}
      {reached("identity") && (
        <section className="section" id="p5-identity" style={{ order: -1 }}>
          <div className="container-max">
            <div className="eyebrow">Étape 1</div>
            <h2 className="section-title">Qui êtes-vous ?</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              On commence par vous identifier : statut, contact et localisation du bien.
            </p>

            <div className="pill" style={{ marginBottom: 14 }}>1) Type de maître d'ouvrage <span className="req">*</span></div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              {[
                { id: "physique", label: "Personne physique", sub: "Particulier — Nom + CIN" },
                { id: "morale",   label: "Personne morale",   sub: "Société — Raison sociale + RC/ICE" },
              ].map(o => (
                <button
                  key={o.id} type="button"
                  onClick={() => setMoaType(o.id as any)}
                  style={{
                    flex: "1 1 240px", textAlign: "left", cursor: "pointer", padding: 14,
                    border: moaType === o.id ? "2px solid #C9A227" : "1px solid rgba(11,27,58,0.18)",
                    background: moaType === o.id ? "#fff8e1" : "#fff",
                    borderRadius: 14, fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 14.5 }}>{o.label}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{o.sub}</div>
                </button>
              ))}
            </div>

            <div className="pill" style={{ marginBottom: 14 }}>2) Contact <span className="req">*</span></div>
            <div className="form-grid">
              <div className="field"><label className="label">Nom complet <span className="req">*</span></label><input className="control" value={identity.clientNom} onChange={f("clientNom")} placeholder="Prénom Nom" /></div>
              <div className="field"><label className="label">Téléphone <span className="req">*</span></label><input className="control" value={identity.clientTel} onChange={f("clientTel")} placeholder="+212 6XX XXX XXX" /></div>
              <div className="field"><label className="label">Email</label><input className="control" value={identity.clientEmail} onChange={f("clientEmail")} placeholder="contact@exemple.ma" /></div>
            </div>

            {moaType === "morale" && (
              <>
                <div className="blk-title">3) Société</div>
                <div className="form-grid">
                  <div className="field"><label className="label">Raison sociale <span className="req">*</span></label><input className="control" value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL / SA / SNC…" /></div>
                  <div className="field"><label className="label">Représentant légal <span className="req">*</span></label><input className="control" value={identity.representant} onChange={f("representant")} placeholder="Gérant / DG" /></div>
                  <div className="field"><label className="label">RC</label><input className="control" value={identity.rc} onChange={f("rc")} placeholder="12345" /></div>
                  <div className="field"><label className="label">ICE</label><input className="control" value={identity.ice} onChange={f("ice")} placeholder="000000000000000" /></div>
                </div>
              </>
            )}

            <div className="blk-title">{moaType === "morale" ? "4" : "3"}) Localisation du bien</div>
            <div className="form-grid">
              <div className="field"><label className="label">Région <span className="req">*</span></label><input className="control" value={identity.region} onChange={f("region")} placeholder="Rabat-Salé-Kénitra…" /></div>
              <div className="field"><label className="label">Province / Préfecture <span className="req">*</span></label><input className="control" value={identity.province} onChange={f("province")} placeholder="Kénitra, Salé, Rabat…" /></div>
              <div className="field"><label className="label">Commune <span className="req">*</span></label><input className="control" value={identity.commune} onChange={f("commune")} placeholder="Mehdia, Témara…" /></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label className="label">Adresse précise du bien (optionnel)</label><input className="control" value={identity.adresseBien} onChange={f("adresseBien")} placeholder="N° rue, quartier, lot, étage…" /></div>
            </div>

            {error && phase === "identity" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 28 }}>
              <button className="btn btn-gold" onClick={identityContinue}>Continuer : choisir mon rapport →</button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 2 — TYPE DE RAPPORT (3 cartes premium) */}
      {reached("report") && (
        <section className="section" id="p5-report" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 2</div>
            <h2 className="section-title">Quel rapport souhaitez-vous ?</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              Trois niveaux d'expertise — du simple avis de valeur au business plan complet pour
              investisseurs institutionnels. Le tarif s'applique au pourcentage sur l'assiette
              naturelle du rapport.
            </p>
            <div className="grid-3">
              {REPORT_CARDS.map(r => {
                const sel = reportType === r.code;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => pickReport(r.code)}
                    style={{
                      position: "relative", textAlign: "left", cursor: "pointer",
                      padding: 26, borderRadius: 18,
                      background: sel
                        ? "linear-gradient(135deg, rgba(201,162,39,0.14), rgba(232,216,166,0.14))"
                        : "rgba(255,255,255,0.88)",
                      border: sel ? "2px solid #C9A227" : "1px solid rgba(201,162,39,0.35)",
                      boxShadow: sel ? "0 26px 80px rgba(11,27,58,0.16)" : "0 18px 55px rgba(11,27,58,0.12)",
                      transform: sel ? "translateY(-3px)" : "none",
                      transition: "all .25s ease", fontFamily: "inherit",
                    }}
                  >
                    {sel && (
                      <div style={{
                        position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%",
                        background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 17, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}>✓</div>
                    )}
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#C9A227", letterSpacing: "0.06em", marginBottom: 10 }}>
                      {r.category}
                    </div>
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 21, fontWeight: 700, color: "#0B1B3A", margin: "0 0 8px" }}>
                      {r.title}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.55 }}>{r.sub}</div>
                    <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.30)", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#0B1B3A", marginBottom: 14 }}>
                      {r.tagline}
                    </div>
                    <ul className="card-bullets-premium">
                      {r.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                    <div className="muted card-micro" style={{ marginTop: 14, fontStyle: "italic" }}>
                      Cible : {r.targets}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* BLOC 3 — DÉTAILS FINANCIERS (champs contextuels selon rapport) */}
      {reached("details") && reportType && (
        <section className="section" id="p5-details" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 3</div>
            <h2 className="section-title">Caractéristiques financières du bien</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              Ces montants servent uniquement de base au calcul de votre devis (taux %). Ils
              restent confidentiels et ne sont pas publiés. Indiquez votre meilleure estimation.
            </p>

            <div className="form-grid">
              {(reportType === "EXPERTISE_PRIX" || reportType === "READY_TO_INVEST") && (
                <div className="field">
                  <label className="label">Prix d'acquisition du foncier (MAD) {reportType === "EXPERTISE_PRIX" && <span className="req">*</span>}</label>
                  <input className="control" type="number" min={0} value={prixFoncier}
                    onChange={(e) => setPrixFoncier(e.target.value)} placeholder="ex. 2 500 000" />
                </div>
              )}
              {(reportType === "EXPERTISE_URBA" || reportType === "READY_TO_INVEST") && (
                <div className="field">
                  <label className="label">Coût de construction estimé (MAD) {reportType === "EXPERTISE_URBA" && <span className="req">*</span>}</label>
                  <input className="control" type="number" min={0} value={coutConstruction}
                    onChange={(e) => setCoutConstruction(e.target.value)} placeholder="ex. 8 000 000" />
                </div>
              )}
              {reportType === "READY_TO_INVEST" && (
                <div className="field">
                  <label className="label">Montant total d'investissement (MAD)</label>
                  <input className="control" type="number" min={0} value={montantInvest}
                    onChange={(e) => setMontantInvest(e.target.value)} placeholder="ex. 11 500 000 (auto = foncier + construction)" />
                </div>
              )}
              <div className="field">
                <label className="label">Surface du bien (m²) — indicative</label>
                <input className="control" type="number" min={0} value={surfaceM2}
                  onChange={(e) => setSurfaceM2(e.target.value)} placeholder="ex. 800" />
              </div>
            </div>

            <div className="mini-note" style={{ marginTop: 18 }}>
              <strong>Comment est calculé votre devis ?</strong>{" "}
              {reportType === "EXPERTISE_PRIX" && "1 % du prix foncier, plancher 5 000 DH HT."}
              {reportType === "EXPERTISE_URBA" && "0,5 % du coût de construction, plancher 6 000 DH HT."}
              {reportType === "READY_TO_INVEST" && "1 % du montant total d'investissement, plancher 18 000 DH HT."}
              {" "}Modulable par le délai souhaité à l'étape suivante.
            </div>

            {error && phase === "details" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" onClick={detailsContinue}>Continuer : délai →</button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 4 — DÉLAI */}
      {reached("delay") && (
        <section className="section" id="p5-delay" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 4</div>
            <h2 className="section-title">Délai souhaité</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              Délai de livraison à compter de la réception du paiement et des documents nécessaires.
            </p>
            <div className="grid-3">
              {DELAY_CARDS.map(d => {
                const sel = delayMode === d.code;
                const accent = d.tone === "express" ? "#ef4444" : d.tone === "eco" ? "#16a34a" : "#0B1B3A";
                return (
                  <button
                    key={d.code} type="button"
                    onClick={() => setDelayMode(d.code)}
                    style={{
                      position: "relative", textAlign: "left", cursor: "pointer",
                      padding: 22, borderRadius: 16,
                      background: sel ? "linear-gradient(135deg, rgba(201,162,39,0.14), rgba(232,216,166,0.14))" : "rgba(255,255,255,0.88)",
                      border: sel ? "2px solid #C9A227" : "1px solid rgba(201,162,39,0.35)",
                      boxShadow: sel ? "0 22px 60px rgba(11,27,58,0.14)" : "0 14px 42px rgba(11,27,58,0.08)",
                      transform: sel ? "translateY(-2px)" : "none",
                      transition: "all .2s ease", fontFamily: "inherit",
                    }}
                  >
                    {sel && (
                      <div style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #C9A227, #E6C75B)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>✓</div>
                    )}
                    <div style={{ fontWeight: 800, color: "#0B1B3A", fontSize: 17, marginBottom: 6 }}>{d.title}</div>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>{d.sub}</div>
                    <div style={{ display: "inline-block", padding: "5px 10px", borderRadius: 8, background: `${accent}15`, color: accent, fontWeight: 700, fontSize: 13 }}>{d.pct}</div>
                  </button>
                );
              })}
            </div>

            {error && phase === "delay" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 30 }}>
              <button className="btn btn-gold" disabled={busy} onClick={submitIntake}>
                {busy
                  ? "Envoi…"
                  : (auth.isAuthed ? "Créer mon dossier et obtenir le devis →" : "Créer mon compte + dossier → recevoir le devis")}
              </button>
            </div>
            <div className="muted" style={{ marginTop: 14, fontSize: 12.5, maxWidth: 720, lineHeight: 1.6 }}>
              Votre devis personnalisé est calculé après la création du dossier — un dossier
              identifié, rattaché à votre compte client.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

const fullBleed: React.CSSProperties = {
  width: "100vw", position: "relative", left: "50%", right: "50%",
  marginLeft: "-50vw", marginRight: "-50vw", minHeight: "100vh",
  background:
    "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%), " +
    "radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%), " +
    "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))",
  display: "flex", flexDirection: "column",
};

const P5_CSS = `
.p5page, .p5page *, .p5page *::before, .p5page *::after { box-sizing:border-box; }
.p5page { font-family:Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color:#0B1B3A; }
.p5page h1,.p5page h2,.p5page .lux-title { font-family:"Playfair Display", Georgia, serif; }
.p5page .container-max { max-width:1200px; margin:0 auto; padding:0 20px; }
.p5page .section { padding:72px 0; }
@media(max-width:768px){ .p5page .section { padding:52px 0; } }

.p5page .hero {
  background:
    radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%),
    radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72));
  border-bottom:1px solid rgba(201,162,39,0.35);
}
.p5page .hero h1 { font-size:56px; line-height:1.08; letter-spacing:-0.8px; margin:0 0 16px; color:#0B1B3A; }
@media(max-width:768px){ .p5page .hero h1 { font-size:36px; } }

.p5page .kicker { display:inline-flex; gap:10px; align-items:center; flex-wrap:wrap; padding:10px 14px; border-radius:999px; background:rgba(255,255,255,0.86); border:1px solid rgba(201,162,39,0.22); color:rgba(11,27,58,0.86); font-size:13px; font-weight:700; box-shadow:0 10px 30px rgba(11,27,58,0.08); margin-bottom:22px; }
.p5page .section-title { font-size:40px; letter-spacing:-0.4px; line-height:1.15; margin:0 0 14px; color:#0B1B3A; }
@media(max-width:768px){ .p5page .section-title { font-size:28px; } }
.p5page .sub { max-width:760px; font-size:16px; color:rgba(11,18,32,0.72); line-height:1.7; }
.p5page .muted { color:rgba(11,27,58,0.74); }
.p5page .eyebrow { font-size:12px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:rgba(201,162,39,0.95); margin-bottom:10px; }
.p5page .gold-divider { height:1px; background:linear-gradient(90deg, transparent, rgba(201,162,39,0.55), transparent); }
.p5page .grid-3 { display:grid; gap:24px; grid-template-columns:repeat(3,minmax(0,1fr)); }
.p5page .grid-2 { display:grid; gap:20px; grid-template-columns:repeat(2,minmax(0,1fr)); }
@media(max-width:900px){ .p5page .grid-3,.p5page .grid-2 { grid-template-columns:1fr; } }
.p5page .lux-card { background:rgba(255,255,255,0.90); border:1px solid rgba(201,162,39,0.35); border-radius:16px; padding:28px; box-shadow:0 18px 55px rgba(11,27,58,0.12); }
.p5page .lux-title { font-weight:700; font-size:19px; color:#0B1B3A; line-height:1.25; }
.p5page .card-bullets-premium { margin:14px 0 0; padding-left:18px; font-size:13px; line-height:1.5; color:rgba(11,27,58,0.80); }
.p5page .card-bullets-premium li { margin:7px 0; }
.p5page .card-micro { margin-top:12px; font-size:12px; }
.p5page .btn { display:inline-flex; align-items:center; justify-content:center; gap:10px; padding:14px 24px; border-radius:12px; font-size:14px; font-weight:700; border:1px solid transparent; cursor:pointer; transition:all .2s ease; font-family:inherit; text-decoration:none; }
.p5page .btn-gold { background:linear-gradient(135deg, #C9A227, #E6C75B); color:#1a1406; border-color:rgba(201,162,39,0.55); box-shadow:0 18px 34px rgba(201,162,39,0.25); }
.p5page .btn-gold:hover { filter:brightness(1.03); transform:translateY(-1px); }
.p5page .btn-gold[disabled] { opacity:.6; cursor:not-allowed; transform:none; }
.p5page .btn-dark { background:#0B1B3A; color:#fff; border-color:rgba(11,27,58,0.35); }
.p5page .form-grid { display:grid; gap:14px; grid-template-columns:repeat(3,minmax(0,1fr)); }
@media(max-width:1100px){ .p5page .form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:760px){ .p5page .form-grid { grid-template-columns:1fr; } }
.p5page .field { display:flex; flex-direction:column; gap:6px; }
.p5page .label { font-size:12px; font-weight:900; letter-spacing:.10em; text-transform:uppercase; color:rgba(11,27,58,0.80); }
.p5page .control { width:100%; border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.85); border-radius:14px; padding:12px 13px; font-size:14px; color:#0B1B3A; outline:none; font-family:inherit; }
.p5page .control:focus { box-shadow:0 0 0 4px rgba(201,162,39,0.18); border-color:rgba(201,162,39,0.65); }
.p5page .pill { display:inline-flex; align-items:center; gap:10px; padding:8px 14px; border-radius:999px; border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.72); font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:rgba(11,27,58,0.78); }
.p5page .req { color:rgba(201,162,39,0.95); font-weight:900; }
.p5page .mini-note { border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.78); border-radius:16px; padding:14px 16px; color:rgba(11,18,32,0.80); font-size:13px; line-height:1.6; box-shadow:0 12px 40px rgba(11,27,58,0.06); }
.p5page .blk-title { font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:rgba(201,162,39,0.95); margin:26px 0 12px; }
.p5page .err { color:#b91c1c; font-size:13px; background:rgba(220,38,38,0.07); border:1px solid rgba(220,38,38,0.22); padding:11px 14px; border-radius:12px; margin:16px 0; }
.p5page .qrow { display:flex; justify-content:space-between; gap:16px; padding:11px 0; border-bottom:1px solid rgba(11,27,58,0.08); font-size:14px; }
.p5page .qrow .k { color:rgba(11,27,58,0.66); }
.p5page .qrow .v { color:#0B1B3A; font-weight:800; white-space:nowrap; }
`;
