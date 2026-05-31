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
      .catch(() => setError(t("portes.p4.err.load")));
  }, [t]);

  const stepIndex = ["pack", "foncier", "quote", "identity"].indexOf(step);
  const selectedPack = packs.find(p => p.code === pack);

  const compute = async () => {
    setError("");
    if (!foncier.prixVenteFoncierDH || +foncier.prixVenteFoncierDH <= 0) {
      setError(t("portes.p4.err.prix_required"));
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
      if (!data.ok) throw new Error(data.error || t("portes.p4.err.generic"));
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
      setError(t("portes.p4.err.name_phone"));
      return;
    }
    setStep("submitting");
    try {
      const title = t("portes.p4.recap.title_label", {
        label: selectedPack?.label ?? "",
        commune: foncier.commune || "—",
      });
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
      if (!data.ok) throw new Error(data.message || t("portes.p4.err.submit"));
      if (data.access_token) { try { localStorage.setItem("citurbarea.token", data.access_token); } catch {} }
      setDossierId(data.dossierId);
      setStep("success");
    } catch (e: any) {
      setError(e.message);
      setStep("identity");
    }
  };

  if (step === "submitting") return <div style={S.loader}>{t("portes.p4.loader.calc")}</div>;

  if (step === "success") {
    return (
      <div style={S.root}>
        <div style={S.successWrap}>
          <div style={S.successIcon}>✅</div>
          <div style={S.successTitle}>{t("portes.p4.recap.success_title")}</div>
          <div style={S.successSub}>
            <span dangerouslySetInnerHTML={{ __html: t("portes.p4.recap.success_body", {
              label: selectedPack?.label ?? "",
              amount: fmtMAD(quote?.amounts.totalTTC),
              days: quote?.meta.deliveryDays ?? 0,
            }) }} />
            <br/><br/>
            <span style={{ color: "#fcd34d", fontSize: 12 }}>{t("portes.p4.recap.watermark")}</span><br/>
            <span style={{ color: "#6b7280", fontSize: 12 }}>{t("portes.p4.recap.ref_dossier")} {dossierId?.slice(0, 12)}…</span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`/payment/start?dossier=${dossierId}`} style={{ background: "#dc2626", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>{t("portes.p4.recap.pay_now")}</a>
            <a href="/portal" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 700 }}>{t("portes.p4.recap.my_dossiers")}</a>
            <a href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: 13, fontWeight: 600, padding: "12px 16px" }}>{t("portes.p4.recap.home")}</a>
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
          <div style={S.badge}>{t("portes.p4.title_prefix")} — {t("p4.home_title").toUpperCase()}</div>
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
              <div style={{ color: "#6b7280", fontSize: 11 }}>{t("portes.p4.from", { n: p.deliveryDays })}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: "#cbd5e1" }}>
                {p.deliverables.slice(0, 3).map((d, i) => <div key={i}>✓ {d}</div>)}
                {p.deliverables.length > 3 && <div style={{ color: "#6b7280" }}>{t("portes.p4.more_deliverables", { n: p.deliverables.length - 3 })}</div>}
              </div>
            </div>
          ))}
          {packs.length === 0 && <div style={{ color: "#6b7280" }}>{t("portes.p4.loading_packs")}</div>}
        </div>
      </div>
    );
  }

  // Step 2: foncier info
  if (step === "foncier") {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("pack")}>{t("portes.p4.change_pack")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p4.foncier.title")}</div>
          <div style={S.formSub} dangerouslySetInnerHTML={{ __html: t("portes.p4.foncier.sub", { label: selectedPack?.label ?? "", rate: selectedPack?.ratePct ?? "" }) }} />
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div>
              <label style={S.label}>{t("portes.p4.foncier.tf")}</label>
              <input style={S.inp} value={foncier.titreFoncierNum} onChange={e => setFoncier({...foncier, titreFoncierNum: e.target.value})} placeholder={t("portes.p4.foncier.tf_ph")} />
            </div>
            <div>
              <label style={S.label}>{t("portes.p4.foncier.surface")}</label>
              <input type="number" style={S.inp} value={foncier.surfaceTerrainM2} onChange={e => setFoncier({...foncier, surfaceTerrainM2: e.target.value})} placeholder={t("portes.p4.foncier.surface_ph")} />
            </div>
          </div>
          <label style={S.label}>{t("portes.p4.foncier.commune")}</label>
          <input style={S.inp} value={foncier.commune} onChange={e => setFoncier({...foncier, commune: e.target.value})} placeholder={t("portes.p4.foncier.commune_ph")} />
          <label style={S.label}>{t("portes.p4.foncier.adresse")}</label>
          <input style={S.inp} value={foncier.adresse} onChange={e => setFoncier({...foncier, adresse: e.target.value})} placeholder={t("portes.p4.foncier.adresse_ph")} />
          <label style={S.label}>{t("portes.p4.foncier.prix")}</label>
          <input type="number" style={S.inp} value={foncier.prixVenteFoncierDH} onChange={e => setFoncier({...foncier, prixVenteFoncierDH: e.target.value})} placeholder={t("portes.p4.foncier.prix_ph")} />
          <div style={{ color: "#6b7280", fontSize: 11, marginTop: -8, marginBottom: 14 }}>
            {t("portes.p4.foncier.prix_help", { rate: selectedPack?.ratePct ?? "" })}
          </div>
          <label style={S.label}>{t("portes.p4.foncier.nature_usage")}</label>
          <input style={S.inp} value={foncier.natureUsagePrevu} onChange={e => setFoncier({...foncier, natureUsagePrevu: e.target.value})} placeholder={t("portes.p4.foncier.nature_usage_ph")} />

          <button style={S.btn} onClick={compute}>{t("portes.p4.foncier.compute_btn")}</button>
        </div>
      </div>
    );
  }

  // Step 3: quote
  if (step === "quote" && quote) {
    return (
      <div style={S.root}>
        <div style={S.wrap}>
          <button style={S.btnBack} onClick={() => setStep("foncier")}>{t("portes.p4.modify")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p4.quote.title")}</div>
          <div style={S.formSub}>{t("portes.p4.quote.sub")}</div>

          <div style={S.quoteWrap}>
            <div style={S.quoteHead}>
              <div>
                <div style={S.quoteCat}>{quote.meta.packLabel}</div>
                <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 4 }}>
                  {t("portes.p4.quote.delivery", { rate: quote.meta.ratePct, price: fmtMAD(quote.base.prixVenteFoncierDH), n: quote.meta.deliveryDays })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={S.quoteAmount}>{fmtMAD(quote.amounts.totalTTC)}</div>
                <div style={S.quoteAmountSub}>{t("portes.p4.quote.ttc")}</div>
              </div>
            </div>

            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p4.quote.calc_brut", { rate: quote.meta.ratePct })}</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.computedHT)}</span></div>
            {quote.base.flooredApplied && <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p4.quote.floor")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.base.floorHT)}</span></div>}
            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p4.quote.honoraires_ht")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.totalHT)}</span></div>
            <div style={S.quoteRow}><span style={S.quoteRowKey}>{t("portes.p4.quote.tva_20")}</span><span style={S.quoteRowVal}>{fmtMAD(quote.amounts.tva)}</span></div>

            <div style={{ marginTop: 18 }}>
              <div style={{ ...S.quoteRowKey, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("portes.p4.quote.deliverables")}</div>
              {quote.deliverables.map((d, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            <div style={S.noteBox}>
              <strong>{t("portes.p4.quote.modalities")}</strong> {quote.payment.modalities}<br/><br/>
              <strong>{t("portes.p4.quote.download")}</strong> {quote.payment.download}
            </div>

            <div style={{ marginTop: 14, color: "#6b7280", fontSize: 11, lineHeight: 1.6 }}>
              {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
            </div>
          </div>

          <button style={S.btn} onClick={() => setStep("identity")}>{t("portes.p4.quote.continue_identity")}</button>
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
          <button style={S.btnBack} onClick={() => setStep("quote")}>{t("portes.p4.back_quote")}</button>
          <Stepper />
          <div style={S.formTitle}>{t("portes.p4.identity.title")}</div>
          <div style={S.formSub}>{t("portes.p4.identity.sub")}</div>
          {error && <div style={S.err}>⚠ {error}</div>}

          <div style={S.row2}>
            <div>
              <label style={S.label}>{t("portes.p4.identity.fullname")}</label>
              <input style={S.inp} value={identity.clientNom} onChange={f("clientNom")} placeholder={t("portes.p4.identity.fullname_ph")} />
            </div>
            <div>
              <label style={S.label}>{t("portes.p4.identity.phone")}</label>
              <input style={S.inp} value={identity.clientTel} onChange={f("clientTel")} placeholder={t("portes.p4.identity.phone_ph")} />
            </div>
          </div>
          <label style={S.label}>{t("portes.p4.identity.email")}</label>
          <input style={S.inp} value={identity.clientEmail} onChange={f("clientEmail")} placeholder={t("portes.p4.identity.email_ph")} />
          <label style={S.label}>{t("portes.p4.identity.raison")}</label>
          <input style={S.inp} value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder={t("portes.p4.identity.raison_ph")} />

          <button style={S.btn} onClick={submit}>{t("portes.p4.identity.submit")}</button>
        </div>
      </div>
    );
  }

  return <div style={S.loader}>—</div>;
}
