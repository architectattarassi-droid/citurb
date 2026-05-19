import React, { useEffect, useState } from "react";
import { apiBase } from "../../../tome4/apiClient";
import { getStoredLang } from "../../../../i18n/i18n";

/**
 * P2Home — Porte 2 · Promotion immobilière & équipement privé
 *
 * Refondu sur le modèle EXACT de la Porte 1 : une seule page qui se déroule
 * (progressive disclosure), avec les classes CSS réelles de P1 — pas un
 * assistant pas-à-pas. Chaque bloc se révèle au fur et à mesure des choix.
 *
 * Logique métier P2 INCHANGÉE :
 *   Section → Catégorie (/p2/categories) → Mesures → Mode de suivi
 *   → Devis (/p2/quote) → Identité MO → /p2/intake.
 * NB : les catégories « villa » sont écartées des sections de construction
 *      neuve (Immeuble / Groupement) — elles ne relèvent de P2 que dans le
 *      cadre d'un équipement privé (changement d'affectation).
 */

type P2Section = "IMM" | "GR" | "LOT" | "EPIG" | "AMG";
type FollowMode = "ON_SITE" | "PHOTOS";
type Phase = "section" | "category" | "measures" | "follow" | "quote" | "identity";

const SECTIONS: { id: P2Section; label: string; title: string; sub: string; bullets: string[]; micro: string }[] = [
  {
    id: "IMM", label: "Immeuble",
    title: "Immeuble — Construction neuve",
    sub: "Immeuble collectif ou de bureaux, R+2 et plus.",
    bullets: [
      "Constructibilité : gabarit, hauteur, COS — optimisation du foncier.",
      "Conception : logements, circulations, RDC commercial, parkings.",
      "Honoraires au barème officiel CNOA 2021 selon le coût de construction.",
    ],
    micro: "Tarification transparente, phases A / B / C détaillées.",
  },
  {
    id: "GR", label: "Groupement résidentiel",
    title: "Groupement résidentiel — Plusieurs immeubles",
    sub: "Résidence ou complexe : plusieurs bâtiments sur un même projet.",
    bullets: [
      "Plan masse : implantation, voiries, espaces communs, VRD.",
      "Cohérence architecturale sur l'ensemble des bâtiments.",
      "Devis par bâtiment × nombre — barème CNOA 2021.",
    ],
    micro: "Pensé pour les promoteurs et les opérations groupées.",
  },
  {
    id: "LOT", label: "Lotissement / morcellement",
    title: "Lotissement / morcellement — Foncier",
    sub: "Découpage et viabilisation de terrains (loi 25-90).",
    bullets: [
      "Plan de lotissement : îlots, voirie, réseaux, espaces verts.",
      "Conformité réglementaire et passage en commission.",
      "Devis personnalisé selon la surface du terrain.",
    ],
    micro: "Grille tarifaire dédiée — devis sous 24h.",
  },
  {
    id: "EPIG", label: "Équipement privé",
    title: "Équipement privé — Intérêt général",
    sub: "Hôtel, clinique, école, mosquée, hangar, usine — y compris villa changée d'affectation.",
    bullets: [
      "Programme fonctionnel adapté à l'usage de l'équipement.",
      "Normes spécifiques : sécurité, accessibilité, ERP.",
      "Honoraires au barème CNOA 2021 selon la catégorie.",
    ],
    micro: "Inclut la transformation d'une villa en école, clinique, etc.",
  },
  {
    id: "AMG", label: "Aménagement",
    title: "Aménagement — Transformation d'un local",
    sub: "Commerce, agence, show-room — local existant.",
    bullets: [
      "Réagencement intérieur et mise en valeur de l'espace.",
      "Mise aux normes et conformité du local existant.",
      "Devis au barème CNOA selon la surface aménagée.",
    ],
    micro: "Transformer proprement un local existant.",
  },
];

type Category = { code: string; label: string; costPerM2: number; photoOptionAvailable: boolean; notes?: string };
type Quote = {
  ok: true;
  currency: "MAD";
  meta: {
    section: P2Section;
    sectionLabel: string;
    category?: string;
    categoryLabel?: string;
    followMode: FollowMode;
    photoOptionAvailable: boolean;
    requiresQuotePersonnalise: boolean;
  };
  base: { surfacePlancherM2?: number; nbBatiments: number; coutConstructionM2?: number; coutTravauxEstime?: number; surfaceTerrainHa?: number };
  honoraires: {
    rate: number;
    totalHT: number | null;
    tvaRate: number;
    tva: number | null;
    totalTTC: number | null;
    breakdown: { phaseA_esquisseAutorisation: number | null; phaseB_dceCps: number | null; phaseC_suivi: number | null };
  };
  visaCroa: { payableSeparately: true; note: string };
  decennale: { applicable: boolean; options?: string[]; note: string };
  notes: string[];
};

const fmtMAD = (n: number | null | undefined) => {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 0 }).format(n) + " DH";
};

/* ── CSS de la Porte 1, repris à l'identique et scopé sous .p2page ──────── */
const P1_CSS = `
.p2page, .p2page *, .p2page *::before, .p2page *::after { box-sizing:border-box; }
.p2page { font-family:Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color:#0B1B3A; }
.p2page h1,.p2page h2,.p2page .lux-title { font-family:"Playfair Display", Georgia, serif; }

.p2page .container-max { max-width:1200px; margin:0 auto; padding:0 20px; }
.p2page .section { padding:72px 0; }
@media(max-width:768px){ .p2page .section { padding:52px 0; } }

.p2page .hero {
  background:
    radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%),
    radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,0.90), rgba(255,255,255,0.72));
  border-bottom:1px solid rgba(201,162,39,0.35);
}
.p2page .hero h1 { font-size:56px; line-height:1.08; letter-spacing:-0.8px; margin:0 0 16px; color:#0B1B3A; }
@media(max-width:768px){ .p2page .hero h1 { font-size:36px; } }

.p2page .kicker {
  display:inline-flex; gap:10px; align-items:center; flex-wrap:wrap;
  padding:10px 14px; border-radius:999px;
  background:rgba(255,255,255,0.86); border:1px solid rgba(201,162,39,0.22);
  color:rgba(11,27,58,0.86); font-size:13px; font-weight:700;
  box-shadow:0 10px 30px rgba(11,27,58,0.08); margin-bottom:22px;
}
.p2page .section-title { font-size:40px; letter-spacing:-0.4px; line-height:1.15; margin:0 0 14px; color:#0B1B3A; }
@media(max-width:768px){ .p2page .section-title { font-size:28px; } }
.p2page .sub { max-width:760px; font-size:16px; color:rgba(11,18,32,0.72); line-height:1.7; }
.p2page .muted { color:rgba(11,27,58,0.74); }
.p2page .eyebrow { font-size:12px; font-weight:900; letter-spacing:.14em; text-transform:uppercase; color:rgba(201,162,39,0.95); margin-bottom:10px; }

.p2page .gold-divider { height:1px; background:linear-gradient(90deg, transparent, rgba(201,162,39,0.55), transparent); }

.p2page .grid-3 { display:grid; gap:24px; grid-template-columns:repeat(3,minmax(0,1fr)); }
.p2page .grid-2 { display:grid; gap:20px; grid-template-columns:repeat(2,minmax(0,1fr)); }
@media(max-width:900px){ .p2page .grid-3,.p2page .grid-2 { grid-template-columns:1fr; } }

.p2page .lux-card {
  background:rgba(255,255,255,0.90); border:1px solid rgba(201,162,39,0.35);
  border-radius:16px; padding:28px; box-shadow:0 18px 55px rgba(11,27,58,0.12);
}
.p2page .price-card {
  border-radius:18px; padding:26px; background:rgba(255,255,255,0.88);
  border:1px solid rgba(201,162,39,0.35); box-shadow:0 18px 55px rgba(11,27,58,0.12);
  display:flex; flex-direction:column; transition:all .25s ease; cursor:pointer;
}
.p2page .price-card:hover { transform:translateY(-3px); border-color:rgba(201,162,39,0.55); box-shadow:0 26px 80px rgba(11,27,58,0.16); }
.p2page .price-card.sel {
  border:2px solid #C9A227;
  background:linear-gradient(135deg, rgba(201,162,39,0.14), rgba(232,216,166,0.14));
}
.p2page .price-card.disabled { opacity:.5; cursor:not-allowed; }
.p2page .price-card.disabled:hover { transform:none; box-shadow:0 18px 55px rgba(11,27,58,0.12); border-color:rgba(201,162,39,0.35); }
.p2page .lux-title { font-weight:700; font-size:19px; color:#0B1B3A; line-height:1.25; }
.p2page .card-sub { margin-top:6px; font-size:13px; color:rgba(11,27,58,0.68); line-height:1.55; }
.p2page .card-bullets-premium { margin:14px 0 0; padding-left:18px; font-size:13px; line-height:1.5; color:rgba(11,27,58,0.80); }
.p2page .card-bullets-premium li { margin:7px 0; }
.p2page .card-micro { margin-top:12px; font-size:12px; }

.p2page .btn {
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  padding:14px 24px; border-radius:12px; font-size:14px; font-weight:700;
  border:1px solid transparent; cursor:pointer; transition:all .2s ease;
  font-family:inherit; text-decoration:none;
}
.p2page .btn-gold {
  background:linear-gradient(135deg, #C9A227, #E6C75B); color:#1a1406;
  border-color:rgba(201,162,39,0.55); box-shadow:0 18px 34px rgba(201,162,39,0.25);
}
.p2page .btn-gold:hover { filter:brightness(1.03); transform:translateY(-1px); }
.p2page .btn-gold[disabled] { opacity:.6; cursor:not-allowed; transform:none; }
.p2page .btn-dark { background:#0B1B3A; color:#fff; border-color:rgba(11,27,58,0.35); }
.p2page .btn-dark:hover { filter:brightness(1.08); }

.p2page .form-grid { display:grid; gap:14px; grid-template-columns:repeat(3,minmax(0,1fr)); }
@media(max-width:1100px){ .p2page .form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:760px){ .p2page .form-grid { grid-template-columns:1fr; } }
.p2page .field { display:flex; flex-direction:column; gap:6px; }
.p2page .label { font-size:12px; font-weight:900; letter-spacing:.10em; text-transform:uppercase; color:rgba(11,27,58,0.80); }
.p2page .control {
  width:100%; border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.85);
  border-radius:14px; padding:12px 13px; font-size:14px; color:#0B1B3A; outline:none; font-family:inherit;
}
.p2page .control:focus { box-shadow:0 0 0 4px rgba(201,162,39,0.18); border-color:rgba(201,162,39,0.65); }

.p2page .pill {
  display:inline-flex; align-items:center; gap:10px; padding:8px 14px; border-radius:999px;
  border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.72);
  font-size:12px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
  color:rgba(11,27,58,0.78);
}
.p2page .req { color:rgba(201,162,39,0.95); font-weight:900; }
.p2page .mini-note {
  border:1px solid rgba(201,162,39,0.35); background:rgba(255,255,255,0.78);
  border-radius:16px; padding:14px 16px; color:rgba(11,18,32,0.80);
  font-size:13px; line-height:1.6; box-shadow:0 12px 40px rgba(11,27,58,0.06);
}
.p2page .blk-title { font-size:12px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:rgba(201,162,39,0.95); margin:26px 0 12px; }
.p2page .err {
  color:#b91c1c; font-size:13px; background:rgba(220,38,38,0.07);
  border:1px solid rgba(220,38,38,0.22); padding:11px 14px; border-radius:12px; margin:16px 0;
}
.p2page .qrow { display:flex; justify-content:space-between; gap:16px; padding:11px 0; border-bottom:1px solid rgba(11,27,58,0.08); font-size:14px; }
.p2page .qrow .k { color:rgba(11,27,58,0.66); }
.p2page .qrow .v { color:#0B1B3A; font-weight:800; white-space:nowrap; }
`;

const PAGE_BG =
  "radial-gradient(1200px 520px at 18% 8%, rgba(201,162,39,0.10), transparent 60%)," +
  "radial-gradient(900px 420px at 82% 30%, rgba(232,216,166,0.10), transparent 60%)," +
  "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(246,248,255,0.96))";

const fullBleed: React.CSSProperties = {
  width: "100vw", position: "relative", left: "50%", right: "50%",
  marginLeft: "-50vw", marginRight: "-50vw", minHeight: "100vh", background: PAGE_BG,
};

const HERO_POINTS = [
  { t: "Barème officiel", d: "Honoraires calculés sur le barème CNOA 2021." },
  { t: "Phases détaillées", d: "Esquisse, DCE, suivi — phases A / B / C transparentes." },
  { t: "Devis immédiat", d: "Estimation chiffrée avant tout engagement." },
  { t: "Contrat unifié", d: "Contrat type CNOA + visa CROA en ligne." },
];

export default function P2Home() {
  const [screen, setScreen] = useState<"flow" | "success">("flow");
  const [phase, setPhase] = useState<Phase>("section");
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState<P2Section | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [surfacePlancher, setSurfacePlancher] = useState<string>("");
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [surfaceTerrainHa, setSurfaceTerrainHa] = useState<string>("");
  const [followMode, setFollowMode] = useState<FollowMode>("ON_SITE");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    commune: "", natureProjet: "",
  });
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  const isLOT = section === "LOT";
  const selectedCategory = categories.find(c => c.code === categoryCode);
  const PHASES: Phase[] = ["section", "category", "measures", "follow", "quote", "identity"];
  const phaseIdx = PHASES.indexOf(phase);
  const reached = (p: Phase) => phaseIdx >= PHASES.indexOf(p);

  // Charge les catégories quand la section est choisie (sauf LOT).
  // Les catégories « villa » sont écartées des sections de construction neuve.
  useEffect(() => {
    if (!section || section === "LOT") { setCategories([]); return; }
    fetch(`${apiBase()}/p2/categories?section=${section}`)
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        const items: Category[] = (d.items || []).filter((c: Category) =>
          (section === "IMM" || section === "GR") ? !/villa/i.test(c.label) : true
        );
        setCategories(items);
      })
      .catch(() => setError("Erreur chargement catégories"));
  }, [section]);

  // Défilement doux vers le bloc qui vient de se révéler.
  useEffect(() => {
    if (phase === "section") return;
    const el = document.getElementById(`p2-${phase}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 70);
  }, [phase]);

  // ── Transitions ──────────────────────────────────────────────────────
  const pickSection = (s: P2Section) => {
    setError("");
    setSection(s);
    setCategoryCode("");
    setQuote(null);
    setPhase(s === "LOT" ? "measures" : "category");
  };

  const pickCategory = (code: string) => {
    setError("");
    setCategoryCode(code);
    setQuote(null);
    setPhase("measures");
  };

  const measuresContinue = () => {
    setError("");
    if (isLOT) {
      if (!surfaceTerrainHa || +surfaceTerrainHa <= 0) { setError("Surface terrain en hectares requise."); return; }
      computeQuote();
      return;
    }
    if (!surfacePlancher || +surfacePlancher <= 0) { setError("Surface plancher requise."); return; }
    if (section === "GR" && (!nbBatiments || +nbBatiments < 1)) { setError("Nombre de bâtiments requis."); return; }
    setPhase("follow");
  };

  const computeQuote = async () => {
    setError("");
    setBusy(true);
    try {
      const body: any = { section, followMode };
      if (section !== "LOT") {
        body.categoryCode = categoryCode;
        body.surfacePlancherM2 = +surfacePlancher;
        body.nbBatiments = section === "GR" ? +nbBatiments : 1;
      } else {
        body.surfaceTerrainHa = +surfaceTerrainHa;
      }
      const res = await fetch(`${apiBase()}/p2/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Erreur de calcul");
      setQuote(data);
      setPhase("quote");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitIntake = async () => {
    setError("");
    if (!identity.clientNom || !identity.clientTel) { setError("Nom et téléphone obligatoires."); return; }
    if (!identity.commune) { setError("Commune obligatoire."); return; }
    setBusy(true);
    try {
      const sectionLabel = SECTIONS.find(s => s.id === section)?.label;
      const title = `${sectionLabel} — ${selectedCategory?.label || ""} — ${identity.commune}`.replace(/—\s+—/g, "—").trim();
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          porteType: "P2",
          gestionMode: "AUTONOME",
          sousTypeP2: section,
          commune: identity.commune,
          surfacePlancher: section !== "LOT" ? +surfacePlancher : undefined,
          natureProjet: identity.natureProjet || undefined,
          raisonSociale: identity.raisonSociale || undefined,
          rc: identity.rc || undefined,
          ice: identity.ice || undefined,
          representant: identity.representant || undefined,
          clientNom: identity.clientNom,
          clientTel: identity.clientTel,
          clientEmail: identity.clientEmail || undefined,
          title,
          lang: getStoredLang(),
          source: "P2_WIZARD",
          brief: {
            sectionP2: section,
            categoryCode: categoryCode || undefined,
            categoryLabel: selectedCategory?.label,
            surfacePlancherM2: section !== "LOT" ? +surfacePlancher : undefined,
            nbBatiments: section === "GR" ? +nbBatiments : 1,
            surfaceTerrainHa: section === "LOT" ? +surfaceTerrainHa : undefined,
            followMode,
            quoteSnapshot: quote,
          },
        }),
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

  // ── Écran de succès ──────────────────────────────────────────────────
  if (screen === "success") {
    return (
      <div className="p2page" style={fullBleed}>
        <style>{P1_CSS}</style>
        <section className="section">
          <div className="container-max" style={{ maxWidth: 620 }}>
            <div className="lux-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
              <h2 style={{ fontSize: 26, margin: "0 0 12px" }}>Demande enregistrée</h2>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, margin: "0 0 26px" }}>
                Votre projet <strong style={{ color: "#0B1B3A" }}>{SECTIONS.find(s => s.id === section)?.label}</strong> a été
                transmis à l'équipe CITURBAREA. Vous recevez sous 24h un contrat type unifié à signer + le visa CROA à régler en ligne.
                <br /><br />
                <span style={{ fontSize: 12 }}>Réf. dossier : {dossierId?.slice(0, 12)}…</span>
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a className="btn btn-gold" href={`/payment/start?dossier=${dossierId}`}>💳 Payer maintenant</a>
                <a className="btn btn-dark" href="/portal">📁 Mes dossiers</a>
                <a className="btn" href="/" style={{ background: "transparent", border: "1px solid rgba(11,27,58,0.18)", color: "#0B1B3A" }}>← Accueil</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── Page de qualification (déroulante) ───────────────────────────────
  return (
    <div className="p2page" style={fullBleed}>
      <style>{P1_CSS}</style>

      {/* HERO */}
      <header className="hero">
        <div className="container-max" style={{ paddingTop: 72, paddingBottom: 60 }}>
          <div className="kicker">
            <span>Promotion immobilière</span><span style={{ opacity: 0.5 }}>•</span>
            <span>Barème CNOA 2021</span><span style={{ opacity: 0.5 }}>•</span>
            <span>Devis transparent</span>
          </div>
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <h1>Votre projet de promotion, chiffré au barème officiel.</h1>
              <p className="sub" style={{ fontSize: 18, marginBottom: 26 }}>
                Immeuble, groupement résidentiel, lotissement, équipement privé ou aménagement —
                qualifiez votre projet et obtenez un devis d'honoraires d'architecte transparent,
                issu du barème officiel CNOA 2021.
              </p>
              <button className="btn btn-gold" onClick={() => {
                const el = document.getElementById("p2-section");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                Démarrer ma qualification →
              </button>
            </div>
            <div>
              <div className="lux-card">
                <div className="gold-divider" style={{ marginBottom: 18 }} />
                <div className="grid-2">
                  {HERO_POINTS.map(p => (
                    <div key={p.t}>
                      <div style={{ fontWeight: 900, color: "rgba(11,27,58,0.92)", marginBottom: 6 }}>{p.t}</div>
                      <div style={{ color: "rgba(11,18,32,0.72)", fontSize: 13, lineHeight: 1.6 }}>{p.d}</div>
                    </div>
                  ))}
                </div>
                <div className="gold-divider" style={{ marginTop: 18 }} />
                <div style={{ marginTop: 12, fontSize: 12, color: "rgba(11,18,32,0.60)" }}>
                  Le devis est révisé sur le coût réel des travaux après adjudication (art. 5 du contrat type).
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BLOC 1 — SECTION */}
      <section className="section" id="p2-section">
        <div className="container-max">
          <div className="eyebrow">Étape 1</div>
          <h2 className="section-title">Quel type de projet ?</h2>
          <p className="sub" style={{ marginBottom: 34 }}>
            Sélectionnez la nature de votre projet. Le périmètre choisi détermine les catégories
            et le mode de tarification appliqués.
          </p>
          <div className="grid-3">
            {SECTIONS.map(s => (
              <div key={s.id} className={"price-card" + (section === s.id ? " sel" : "")} onClick={() => pickSection(s.id)}>
                <div className="lux-title">{s.title}</div>
                <div className="card-sub">{s.sub}</div>
                <ul className="card-bullets-premium">
                  {s.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
                <div className="muted card-micro">{s.micro}</div>
                <div className="btn btn-dark" style={{ width: "100%", marginTop: 18 }}>
                  {section === s.id ? "✓ Sélectionné" : "Sélectionner →"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOC 2 — CATÉGORIE */}
      {reached("category") && !isLOT && (
        <section className="section" id="p2-category" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 2</div>
            <h2 className="section-title">Catégorie de projet</h2>
            <p className="sub" style={{ marginBottom: 34 }}>
              Section : <strong style={{ color: "#0B1B3A" }}>{SECTIONS.find(s => s.id === section)?.label}</strong>. Le coût de
              construction au m² est issu du barème officiel CNOA 2021 ; les honoraires sont révisés en cas de constatation
              d'un standing supérieur.
            </p>
            <div className="grid-3">
              {categories.map(c => (
                <div key={c.code} className={"price-card" + (categoryCode === c.code ? " sel" : "")} onClick={() => pickCategory(c.code)}>
                  <div className="lux-title" style={{ fontSize: 17 }}>{c.label}</div>
                  <div style={{ margin: "14px 0 4px" }}>
                    <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>À partir de</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#0B1B3A" }}>{fmtMAD(c.costPerM2)}</span>
                      <span className="muted" style={{ fontWeight: 800, fontSize: 13 }}>/ m²</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {c.notes && <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>⚠ {c.notes}</div>}
                    {!c.photoOptionAvailable && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>📍 Suivi physique obligatoire</div>}
                  </div>
                  <div className="btn btn-dark" style={{ width: "100%", marginTop: 18 }}>
                    {categoryCode === c.code ? "✓ Sélectionné" : "Sélectionner →"}
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="muted">Chargement des catégories…</div>}
            </div>
          </div>
        </section>
      )}

      {/* BLOC 3 — MESURES */}
      {reached("measures") && (
        <section className="section" id="p2-measures" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape {isLOT ? 2 : 3}</div>
            <h2 className="section-title">Dimensions du projet</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              {isLOT
                ? "Surface du terrain à lotir / morceler, en hectares (1 ha = 10 000 m²)."
                : (selectedCategory?.label || "Renseignez les dimensions de votre projet.")}
            </p>
            <div style={{ maxWidth: 760 }}>
              {isLOT ? (
                <>
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label className="label">Surface terrain (hectares)</label>
                    <input className="control" type="number" step="0.1" value={surfaceTerrainHa}
                      onChange={e => setSurfaceTerrainHa(e.target.value)} placeholder="2.5" />
                  </div>
                  <div className="mini-note">
                    ℹ La grille tarifaire des honoraires de lotissement est en cours de finalisation par CITURBAREA.
                    Vous recevrez sous 24h un devis personnalisé après soumission de votre demande.
                  </div>
                </>
              ) : section === "GR" ? (
                <div className="form-grid">
                  <div className="field">
                    <label className="label">Surface plancher / bâtiment (m²)</label>
                    <input className="control" type="number" value={surfacePlancher}
                      onChange={e => setSurfacePlancher(e.target.value)} placeholder="800" />
                  </div>
                  <div className="field">
                    <label className="label">Nombre de bâtiments</label>
                    <input className="control" type="number" min={1} value={nbBatiments}
                      onChange={e => setNbBatiments(e.target.value)} placeholder="3" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label className="label">Surface plancher totale (m²)</label>
                    <input className="control" type="number" value={surfacePlancher}
                      onChange={e => setSurfacePlancher(e.target.value)} placeholder="350" />
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                    Surface totale de tous les niveaux (y compris sous-sol) — voir art. 4 du contrat type Construction.
                  </div>
                </>
              )}
            </div>
            {error && phase === "measures" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" disabled={busy} onClick={measuresContinue}>
                {busy ? "Calcul…" : isLOT ? "Calculer le devis →" : "Continuer →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 4 — MODE DE SUIVI */}
      {reached("follow") && !isLOT && (
        <section className="section" id="p2-follow" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 4</div>
            <h2 className="section-title">Mode de suivi du chantier</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              Phase C des honoraires (suivi des travaux). Source : contrat type unifié Construction CNOA, article 7.
            </p>
            <div className="grid-2" style={{ maxWidth: 820 }}>
              <div className={"price-card" + (followMode === "ON_SITE" ? " sel" : "")} onClick={() => setFollowMode("ON_SITE")}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📍</div>
                <div className="lux-title" style={{ fontSize: 17 }}>Suivi physique</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 12px", flex: 1 }}>
                  Visites sur site, PV in situ, attestations de conformité.
                </div>
                <div style={{ fontWeight: 900, color: "#0B1B3A" }}>30 % des honoraires</div>
              </div>
              {(() => {
                const photoAvail = selectedCategory?.photoOptionAvailable !== false;
                return (
                  <div className={"price-card" + (followMode === "PHOTOS" ? " sel" : "") + (photoAvail ? "" : " disabled")}
                    onClick={() => photoAvail && setFollowMode("PHOTOS")}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>📷</div>
                    <div className="lux-title" style={{ fontSize: 17 }}>Suivi par photos</div>
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 12px", flex: 1 }}>
                      1 photo par réception (gros œuvre par élément de structure + second œuvre par étage).
                    </div>
                    <div style={{ fontWeight: 900, color: photoAvail ? "#0B1B3A" : "rgba(11,27,58,0.5)" }}>10 % des honoraires</div>
                    {!photoAvail && <div style={{ color: "#b91c1c", fontSize: 11.5, marginTop: 8 }}>Non disponible pour cette catégorie</div>}
                  </div>
                );
              })()}
            </div>
            {error && phase === "follow" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" disabled={busy} onClick={computeQuote}>
                {busy ? "Calcul…" : "Calculer le devis →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 5 — DEVIS */}
      {reached("quote") && quote && (
        <section className="section" id="p2-quote" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape {isLOT ? 3 : 5}</div>
            <h2 className="section-title">Votre devis d'honoraires</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              Estimation provisoire selon barème CNOA 2021. Le montant sera révisé sur le coût réel des travaux
              après adjudication (art. 5 du contrat type).
            </p>
            <div className="lux-card" style={{ maxWidth: 780 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "rgba(201,162,39,0.95)", fontSize: 13, fontWeight: 800 }}>{quote.meta.sectionLabel}</div>
                  <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{quote.meta.categoryLabel || "Tarification spécifique"}</div>
                </div>
                <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.32)", borderRadius: 14, padding: "14px 20px", textAlign: "right" }}>
                  {quote.honoraires.totalTTC != null && (
                    <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>À partir de</div>
                  )}
                  <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 32, fontWeight: 800, color: "#0B1B3A", lineHeight: 1, marginTop: 3 }}>
                    {quote.honoraires.totalTTC != null ? fmtMAD(quote.honoraires.totalTTC) : "À devis"}
                  </div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>TTC · honoraires architecte</div>
                </div>
              </div>

              <div className="gold-divider" style={{ margin: "18px 0 6px" }} />

              {quote.base.coutTravauxEstime != null && (
                <div className="qrow"><span className="k">Coût travaux estimé</span><span className="v">{fmtMAD(quote.base.coutTravauxEstime)}</span></div>
              )}
              {quote.honoraires.totalHT != null && (
                <>
                  <div className="qrow"><span className="k">Honoraires HT (5 %)</span><span className="v">{fmtMAD(quote.honoraires.totalHT)}</span></div>
                  <div className="qrow"><span className="k">TVA 20 %</span><span className="v">{fmtMAD(quote.honoraires.tva)}</span></div>
                </>
              )}
              {quote.honoraires.breakdown.phaseA_esquisseAutorisation != null && (
                <>
                  <div className="qrow" style={{ marginTop: 8 }}><span className="k">Phase A — Esquisse + Autorisation (40 %)</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseA_esquisseAutorisation)}</span></div>
                  <div className="qrow"><span className="k">Phase B — DCE + CPS (30 %)</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseB_dceCps)}</span></div>
                  <div className="qrow"><span className="k">Phase C — Suivi ({quote.meta.followMode === "PHOTOS" ? "10 % photos" : "30 % physique"})</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseC_suivi)}</span></div>
                </>
              )}

              <div className="mini-note" style={{ marginTop: 16 }}><strong>Visa CROA :</strong> {quote.visaCroa.note}</div>
              <div className="mini-note" style={{ marginTop: 10 }}><strong>Décennale :</strong> {quote.decennale.note}</div>
              {quote.notes.length > 0 && (
                <div className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.65 }}>
                  {quote.notes.map((n, i) => <div key={i}>• {n}</div>)}
                </div>
              )}
            </div>
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" onClick={() => setPhase("identity")}>Continuer : identité du maître d'ouvrage →</button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 6 — IDENTITÉ */}
      {reached("identity") && (
        <section className="section" id="p2-identity" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape {isLOT ? 4 : 6}</div>
            <h2 className="section-title">Identité du maître d'ouvrage</h2>
            <p className="sub" style={{ marginBottom: 24 }}>Conformément à l'article 2 du contrat type unifié Construction CNOA.</p>

            <div className="pill" style={{ marginBottom: 14 }}>1) Contact <span className="req">*</span></div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Nom complet <span className="req">*</span></label>
                <input className="control" value={identity.clientNom} onChange={f("clientNom")} placeholder="Prénom Nom" />
              </div>
              <div className="field">
                <label className="label">Téléphone <span className="req">*</span></label>
                <input className="control" value={identity.clientTel} onChange={f("clientTel")} placeholder="+212 6XX XXX XXX" />
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input className="control" value={identity.clientEmail} onChange={f("clientEmail")} placeholder="contact@exemple.ma" />
              </div>
            </div>

            <div className="blk-title">2) Société (si personne morale)</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Raison sociale</label>
                <input className="control" value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL / SA / SNC…" />
              </div>
              <div className="field">
                <label className="label">Représentant légal</label>
                <input className="control" value={identity.representant} onChange={f("representant")} placeholder="Gérant / DG" />
              </div>
              <div className="field">
                <label className="label">RC</label>
                <input className="control" value={identity.rc} onChange={f("rc")} placeholder="12345" />
              </div>
              <div className="field">
                <label className="label">ICE</label>
                <input className="control" value={identity.ice} onChange={f("ice")} placeholder="000000000000000" />
              </div>
            </div>

            <div className="blk-title">3) Localisation du projet</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Commune <span className="req">*</span></label>
                <input className="control" value={identity.commune} onChange={f("commune")} placeholder="Kénitra, Rabat, Salé…" />
              </div>
              <div className="field">
                <label className="label">Nature du projet (optionnel)</label>
                <input className="control" value={identity.natureProjet} onChange={f("natureProjet")} placeholder="Construction neuve / extension…" />
              </div>
            </div>

            {error && phase === "identity" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 28 }}>
              <button className="btn btn-gold" disabled={busy} onClick={submitIntake}>
                {busy ? "Envoi…" : "Soumettre la demande →"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
