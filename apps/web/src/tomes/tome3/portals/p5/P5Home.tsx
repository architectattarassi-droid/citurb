import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiBase } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";
import { getStoredLang } from "../../../../i18n/i18n";
import MapPicker from "../../../../features/geo/MapPicker";
import MohafadatiUpload, { UploadedDoc } from "../../../../features/geo/MohafadatiUpload";
import AdminLocationSelect from "../../../../features/geo/AdminLocationSelect";
import TitleFoncierInput from "../../../../features/geo/TitleFoncierInput";
import proj4 from "proj4";

// Définitions Lambert Maroc — déjà enregistrées dans MapPicker, on duplique
// ici pour pouvoir convertir indépendamment.
if (!proj4.defs("EPSG:26191")) {
  proj4.defs("EPSG:26191", "+proj=lcc +lat_1=33.3 +lat_0=33.3 +lon_0=-5.4 +k_0=0.999625769 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
  proj4.defs("EPSG:26192", "+proj=lcc +lat_1=29.7 +lat_0=29.7 +lon_0=-5.4 +k_0=0.999615596 +x_0=500000 +y_0=300000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
  proj4.defs("EPSG:26194", "+proj=lcc +lat_1=26.1 +lat_0=26.1 +lon_0=-5.4 +k_0=0.999616304 +x_0=1200000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
  proj4.defs("EPSG:26195", "+proj=lcc +lat_1=22.5 +lat_0=22.5 +lon_0=-5.4 +k_0=0.999616437 +x_0=1500000 +y_0=400000 +a=6378249.2 +b=6356515 +towgs84=31,146,47,0,0,0,0 +units=m +no_defs +type=crs");
}

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

type ReportType = "ESTIMATION_EXPRESS" | "EXPERTISE_PRIX" | "EXPERTISE_URBA" | "READY_TO_INVEST";
type DelayMode = "EXPRESS" | "STANDARD" | "ECONOMIQUE";
type Phase = "identity" | "report" | "details" | "delay";

type PricingTier = { upTo: number | null; rate: number };
type BreakdownItem = { from: number; to: number; rate: number; amount: number };
type Quote = {
  ok: true;
  meta: {
    reportType: ReportType; reportLabel: string;
    bankable?: boolean;
    delayMode: DelayMode; delayLabel: string; deliveryDays: number;
    pricingModel?: "flat" | "tiers";
    flatHT?: number | null;
    tiers?: PricingTier[];
    assietteLabel: string; assietteMAD: number;
    assietteSource?: "client" | "estimation_interne";
  };
  base: {
    baseRawHT: number; minHT: number; minApplied: boolean;
    delayCoefficient: number; bundleDiscount: number;
    breakdown?: BreakdownItem[];
  };
  estimation?: {
    prixFoncierMAD: number; coutConstructionMAD: number; montantInvestissementMAD: number;
    surfacePlancherEstimee: number; hypotheses: string[];
  };
  deliverables: string[];
  audience: string[];
  signature: string;
  amounts: { totalHT: number; tvaRate: number; tva: number; totalTTC: number };
  payment: { modalities: string };
  notes: string[];
};

const REPORT_CARDS: { code: ReportType; category: string; title: string; sub: string; tagline: string; bullets: string[]; targets: string; accessible?: boolean }[] = [
  {
    code: "ESTIMATION_EXPRESS",
    category: "ESTIMATION EXPRESS",
    title: "Estimation Express",
    sub: "Avis de valeur rapide, sans visite, livré sous 48h.",
    tagline: "Forfait fixe 990 DH HT · accessible à tous",
    bullets: [
      "Valeur estimée + fourchette ±10 %",
      "3 à 5 comparables ventes récentes du quartier",
      "Méthodologie comparables (sans déplacement)",
      "PDF synthétique 4-6 pages",
      "Idéal succession / partage / négociation",
    ],
    targets: "Particuliers · Successions · Décisions personnelles · Premier prix",
    accessible: true,
  },
  {
    code: "EXPERTISE_PRIX",
    category: "EXPERTISE PRIX",
    title: "Rapport Expertise Prix",
    sub: "Valeur vénale fondée + visite terrain + comparables.",
    tagline: "Tranches dégressives 0,5 → 0,2 % · min 1 500 DH HT",
    bullets: [
      "Visite terrain + relevé du bien",
      "Étude comparée ≥ 3 références ventes",
      "Méthodologie documentée et opposable",
      "Fourchette + valeur centrale",
      "PDF signé numériquement (12-20 p)",
      "✓ Opposable bancairement",
    ],
    targets: "Vendeurs / acquéreurs · Banques (garantie hypothécaire) · Successions",
  },
  {
    code: "EXPERTISE_URBA",
    category: "EXPERTISE URBANISTIQUE",
    title: "Rapport Expertise Urbanistique",
    sub: "Note RU + COS/CES/gabarit + scénarios de constructibilité.",
    tagline: "Tranches dégressives 0,5 → 0,2 % · min 2 500 DH HT",
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
    tagline: "Tranches dégressives 0,5 → 0,15 % · min 15 000 DH HT",
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

  // ── Inputs DESCRIPTIFS — c'est ce que le client SAIT (terrain, type, R+, standing, zone)
  // Le backend en déduit prix foncier, coût construction et montant invest pour l'assiette.
  type BienFamily = "TERRAIN_NU" | "VILLA" | "PETIT_COLLECTIF" | "GRAND_COLLECTIF" | "EQUIPEMENT" | "AMENAGEMENT" | "AUTRE";
  // 6 tranches calibrées marché Maroc 2025-2026
  type ZoneTier = "RURAL" | "PERIPHERIE" | "VILLE_MOYENNE" | "URBAIN" | "BON_QUARTIER" | "PREMIUM" | "PRESTIGE" | "ULTRA";
  type StandingTier = "economique" | "moyen" | "haut" | "luxe";

  const [bienFamily, setBienFamily] = useState<BienFamily>("VILLA");
  const [surfaceTerrainM2, setSurfaceTerrainM2] = useState<string>("");
  const [surfacePlancherM2, setSurfacePlancherM2] = useState<string>("");
  const [rLevel, setRLevel] = useState<string>("R0");
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [standing, setStanding] = useState<StandingTier>("moyen");
  const [zoneTier, setZoneTier] = useState<ZoneTier>("URBAIN");

  // Champs financiers OPTIONNELS — le client expert peut les renseigner pour affiner.
  const [knowsValues, setKnowsValues] = useState<boolean>(false);
  const [prixFoncier, setPrixFoncier] = useState<string>("");
  const [coutConstruction, setCoutConstruction] = useState<string>("");
  const [montantInvest, setMontantInvest] = useState<string>("");

  const [delayMode, setDelayMode] = useState<DelayMode>("STANDARD");

  // Aperçu en transparence de l'estimation sommaire calculée par notre backend
  const [preview, setPreview] = useState<any | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  // Sprint 1 SIG — géoréférencement + document foncier
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; source?: string } | null>(null);
  const [mohafadatiDoc, setMohafadatiDoc] = useState<UploadedDoc | null>(null);
  // Codes administratifs (HCP) issus des dropdowns — utilisés pour highlight commune sur la carte
  const [adminCodes, setAdminCodes] = useState<{ regionCode?: string; provinceCode?: string; communeCode?: string }>({});

  // Numéro de titre foncier (validation format + référentiel conservation)
  const [titleFoncier, setTitleFoncier] = useState<{ raw: string; numero?: string; conservationCode?: string; conservation?: any; valid: boolean } | null>(null);

  // Coordonnées Lambert Maroc — saisie directe optionnelle (override du géocodage adresse)
  // Plusieurs points = polygone (bornage d'une parcelle, sommets PV ANCFCC).
  // Un seul point = repère unique.
  type LambertZone = "EPSG:26191" | "EPSG:26192" | "EPSG:26194" | "EPSG:26195";
  type LambertPoint = { id: string; x: string; y: string };
  const [lambertZone, setLambertZone] = useState<LambertZone>("EPSG:26191");
  const [lambertPoints, setLambertPoints] = useState<LambertPoint[]>([{ id: "1", x: "", y: "" }]);
  const addLambertPoint = () => setLambertPoints(pts => [...pts, { id: String(Date.now()), x: "", y: "" }]);
  const removeLambertPoint = (id: string) => setLambertPoints(pts => pts.length <= 1 ? pts : pts.filter(p => p.id !== id));
  const updateLambertPoint = (id: string, field: "x" | "y", value: string) =>
    setLambertPoints(pts => pts.map(p => p.id === id ? { ...p, [field]: value } : p));
  // Liste des points valides (numérique non vide)
  const validLambertPoints = lambertPoints
    .filter(p => p.x.trim() !== "" && p.y.trim() !== "" && Number.isFinite(+p.x) && Number.isFinite(+p.y))
    .map(p => ({ x: +p.x, y: +p.y }));

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
    // Toujours requis : description du bien
    if (!bienFamily) return "Indiquez le type de bien.";
    if (bienFamily !== "AMENAGEMENT" && bienFamily !== "AUTRE") {
      if (+surfaceTerrainM2 <= 0) return "Indiquez la surface du terrain (m²).";
    }
    if (bienFamily === "AMENAGEMENT" && +surfacePlancherM2 <= 0) {
      return "Indiquez la surface du local à aménager (m²).";
    }
    // Si le client a coché « je connais les valeurs », au moins une doit être saisie
    if (knowsValues) {
      const hasAny = +prixFoncier > 0 || +coutConstruction > 0 || +montantInvest > 0;
      if (!hasAny) return "Renseignez au moins une valeur financière (ou décochez « je connais »).";
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
  const buildQuoteBody = () => {
    const body: any = { reportType, delayMode };
    if (bienFamily) body.bienFamily = bienFamily;
    if (surfaceTerrainM2) body.surfaceTerrainM2 = +surfaceTerrainM2;
    if (surfacePlancherM2) body.surfacePlancherM2 = +surfacePlancherM2;
    if (rLevel) body.rLevel = rLevel;
    if (nbBatiments) body.nbBatiments = +nbBatiments;
    if (standing) body.standing = standing;
    if (zoneTier) body.zoneTier = zoneTier;
    if (knowsValues) {
      if (prixFoncier) body.prixFoncierMAD = +prixFoncier;
      if (coutConstruction) body.coutConstructionMAD = +coutConstruction;
      if (montantInvest) body.montantInvestissementMAD = +montantInvest;
    }
    return body;
  };

  const computeQuote = async (): Promise<Quote | null> => {
    if (!reportType) return null;
    const res = await fetch(`${apiBase()}/p5/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildQuoteBody()),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Erreur de calcul du devis");
    setQuote(data);
    return data;
  };

  // Aperçu d'estimation sommaire en temps réel (transparence côté client).
  useEffect(() => {
    if (phase !== "details" || !reportType) { setPreview(null); return; }
    const t = setTimeout(async () => {
      const hasInputs = +surfaceTerrainM2 > 0 || +surfacePlancherM2 > 0
                      || +prixFoncier > 0 || +coutConstruction > 0 || +montantInvest > 0;
      if (!hasInputs) { setPreview(null); return; }
      setPreviewBusy(true);
      try {
        const res = await fetch(`${apiBase()}/p5/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildQuoteBody()),
        });
        const data = await res.json();
        if (data.ok) setPreview(data);
      } catch { /* silent */ }
      finally { setPreviewBusy(false); }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reportType, bienFamily, surfaceTerrainM2, surfacePlancherM2, rLevel, nbBatiments, standing, zoneTier, delayMode, knowsValues, prixFoncier, coutConstruction, montantInvest]);

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
        // Inputs descriptifs (toujours envoyés)
        bienFamily,
        surfaceTerrainM2: surfaceTerrainM2 ? +surfaceTerrainM2 : undefined,
        surfacePlancherM2: surfacePlancherM2 ? +surfacePlancherM2 : undefined,
        rLevel,
        nbBatiments: nbBatiments ? +nbBatiments : 1,
        standing,
        zoneTier,
        // Inputs financiers OPTIONNELS (uniquement si le client a coché « je connais »)
        prixFoncierMAD: knowsValues && prixFoncier ? +prixFoncier : undefined,
        coutConstructionMAD: knowsValues && coutConstruction ? +coutConstruction : undefined,
        montantInvestissementMAD: knowsValues && montantInvest ? +montantInvest : undefined,
        adresseBien: identity.adresseBien || undefined,
        region: identity.region,
        province: identity.province,
        moaType,
        // Sprint 1 SIG — géoréférencement et document foncier
        geoLat: geoCoords?.lat,
        geoLng: geoCoords?.lng,
        geoSource: geoCoords?.source,
        mohafadatiDocument: mohafadatiDoc || undefined,
        // Numéro TF si fourni par le client (sera traité par l'expert lors du rapport)
        titleFoncier: titleFoncier?.valid ? {
          numero: titleFoncier.numero,
          conservationCode: titleFoncier.conservationCode,
          conservationName: titleFoncier.conservation?.name,
          city: titleFoncier.conservation?.city,
          region: titleFoncier.conservation?.region,
          raw: titleFoncier.raw,
        } : undefined,
        // Sommets Lambert (PV de bornage) pour traçabilité dossier
        lambertSommets: validLambertPoints.length > 0 ? {
          zone: lambertZone,
          points: validLambertPoints,
        } : undefined,
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
                      {quote.meta.pricingModel === "flat"
                        ? <>Forfait fixe {fmtMAD(quote.meta.flatHT || 0)} HT · {quote.meta.delayLabel}</>
                        : <>Tarif dégressif par tranches sur {quote.meta.assietteLabel.toLowerCase()} · {quote.meta.delayLabel}</>}
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
                {quote.meta.pricingModel !== "flat" && (
                  <div className="qrow"><span className="k">{quote.meta.assietteLabel}</span><span className="v">{fmtMAD(quote.meta.assietteMAD)}</span></div>
                )}
                <div className="qrow"><span className="k">Honoraires HT</span><span className="v">{fmtMAD(quote.amounts.totalHT)}</span></div>
                <div className="qrow"><span className="k">TVA 20 %</span><span className="v">{fmtMAD(quote.amounts.tva)}</span></div>
                <div className="qrow"><span className="k">Délai de livraison</span><span className="v">{quote.meta.deliveryDays} j ouvrables</span></div>

                {quote.base.breakdown && quote.base.breakdown.length > 0 && (
                  <details style={{ marginTop: 14 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "rgba(11,27,58,0.75)" }}>
                      Voir le détail du calcul par tranche ({quote.base.breakdown.length})
                    </summary>
                    <div style={{ marginTop: 10, fontSize: 12, color: "rgba(11,27,58,0.78)", fontFamily: "ui-monospace, Menlo, Consolas, monospace", lineHeight: 1.7 }}>
                      {quote.base.breakdown.map((b, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0" }}>
                          <span>De {fmtMAD(b.from)} à {fmtMAD(b.to)} · {(b.rate * 100).toFixed(2)} %</span>
                          <strong>{fmtMAD(b.amount)}</strong>
                        </div>
                      ))}
                      {quote.base.minApplied && (
                        <div style={{ marginTop: 6, fontStyle: "italic", color: "rgba(11,27,58,0.65)" }}>
                          Plancher tarifaire de {fmtMAD(quote.base.minHT)} HT appliqué.
                        </div>
                      )}
                    </div>
                  </details>
                )}

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
                Quatre rapports calibrés à votre besoin — de l'estimation express forfaitaire
                à 990 DH au business plan complet ready-to-invest pour banques et fonds.
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
                    <div style={{ fontWeight: 900, color: "rgba(11,27,58,0.92)", marginBottom: 6 }}>À partir de 990 DH HT</div>
                    <div style={{ color: "rgba(11,18,32,0.72)", fontSize: 13, lineHeight: 1.6 }}>Estimation Express forfaitaire · expertises fondées au tarif dégressif (0,5 → 0,15 %).</div>
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
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 10, maxWidth: 720 }}>
              Sélection officielle issue du découpage HCP — 14 régions / 77 provinces / 1 505 communes.
            </div>
            <AdminLocationSelect
              required
              value={{ region: identity.region, province: identity.province, commune: identity.commune }}
              onChange={({ region, province, commune, codes }) => {
                setIdentity(prev => ({ ...prev, region, province, commune }));
                setAdminCodes(codes);
              }}
            />
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="label">Adresse précise du bien (optionnel)</label>
                <input className="control" value={identity.adresseBien} onChange={f("adresseBien")} placeholder="ex. Avenue Mohammed VI, secteur 4" />
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4, fontStyle: "italic" }}>
                  Le repère se pose automatiquement sur la carte 600 ms après votre dernière frappe.
                </div>
              </div>
            </div>

            {/* Coordonnées Lambert Maroc — multi-points (PV de bornage / sommets de parcelle) */}
            <details style={{ marginTop: 18, padding: "14px 18px", background: "rgba(11,27,58,0.04)", border: "1px solid rgba(11,27,58,0.10)", borderRadius: 10 }}>
              <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#0B1B3A" }}>
                📐 Vous avez des coordonnées Lambert Maroc ? <span style={{ fontWeight: 500, color: "rgba(11,27,58,0.55)" }}>(option, pas obligatoire)</span>
              </summary>
              <div className="muted" style={{ fontSize: 12, lineHeight: 1.55, margin: "10px 0 12px" }}>
                Saisie en système géodésique officiel ANCFCC. Si vous avez le PV de bornage ou
                le titre foncier avec coordonnées Lambert, cela permet une localisation millimétrique.
                <strong> Ajoutez autant de sommets que nécessaire</strong> — 1 point pose un repère,
                3 sommets et plus dessinent le polygone exact de la parcelle sur la carte.
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label">Zone Lambert (commune à tous les sommets)</label>
                <select className="control" value={lambertZone} onChange={(e) => setLambertZone(e.target.value as LambertZone)}>
                  <option value="EPSG:26191">Nord Maroc — Tanger / Rabat / Casa / Fès</option>
                  <option value="EPSG:26192">Sud Maroc — Marrakech / Agadir / Béni Mellal</option>
                  <option value="EPSG:26194">Sahara Nord — Tan-Tan / Laâyoune nord</option>
                  <option value="EPSG:26195">Sahara Sud — Dakhla / Aousserd</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lambertPoints.map((p, idx) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "48px 1fr 1fr 80px", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(11,27,58,0.65)", textAlign: "center", background: "rgba(201,162,39,0.10)", padding: "8px 0", borderRadius: 8 }}>
                      #{idx + 1}
                    </div>
                    <input
                      className="control" type="number" placeholder="X (m) ex. 350 000"
                      value={p.x} onChange={(e) => updateLambertPoint(p.id, "x", e.target.value)}
                    />
                    <input
                      className="control" type="number" placeholder="Y (m) ex. 380 000"
                      value={p.y} onChange={(e) => updateLambertPoint(p.id, "y", e.target.value)}
                    />
                    <button
                      type="button" onClick={() => removeLambertPoint(p.id)}
                      disabled={lambertPoints.length <= 1}
                      style={{
                        padding: "9px 0", borderRadius: 8,
                        background: lambertPoints.length <= 1 ? "rgba(11,27,58,0.06)" : "rgba(220,38,38,0.08)",
                        border: lambertPoints.length <= 1 ? "1px solid rgba(11,27,58,0.10)" : "1px solid rgba(220,38,38,0.30)",
                        color: lambertPoints.length <= 1 ? "rgba(11,27,58,0.35)" : "#b91c1c",
                        fontSize: 12, fontWeight: 700,
                        cursor: lambertPoints.length <= 1 ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✕ Retirer
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button" onClick={addLambertPoint}
                style={{
                  marginTop: 12, padding: "9px 16px", borderRadius: 8,
                  background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.45)",
                  color: "#0B1B3A", fontSize: 12.5, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                + Ajouter un sommet
              </button>
              {validLambertPoints.length > 0 && (() => {
                const converted = validLambertPoints.map(pt => {
                  try {
                    const [lng, lat] = proj4(lambertZone, "EPSG:4326", [pt.x, pt.y]);
                    const inMA = Number.isFinite(lat) && Number.isFinite(lng) && lat > 20 && lat < 36 && lng > -18 && lng < -1;
                    return { lat, lng, inMA };
                  } catch { return null; }
                }).filter((v): v is { lat: number; lng: number; inMA: boolean } => v !== null);
                const allInMA = converted.length > 0 && converted.every(c => c.inMA);
                return (
                  <div style={{
                    marginTop: 12, fontSize: 12, fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                    background: allInMA ? "rgba(201,162,39,0.08)" : "rgba(220,38,38,0.07)",
                    border: `1px solid ${allInMA ? "rgba(201,162,39,0.30)" : "rgba(220,38,38,0.22)"}`,
                    color: allInMA ? "rgba(11,27,58,0.85)" : "#b91c1c",
                    padding: "8px 12px", borderRadius: 8, lineHeight: 1.6,
                  }}>
                    {allInMA ? (
                      <>
                        ↪ <strong>{converted.length} sommet{converted.length > 1 ? "s" : ""} converti{converted.length > 1 ? "s" : ""} en WGS84</strong>
                        {converted.length === 1 && <> : {converted[0].lat.toFixed(5)}, {converted[0].lng.toFixed(5)}</>}
                        {converted.length >= 3 && <> → polygone dessiné sur la carte.</>}
                        {converted.length === 2 && <> → ligne dessinée sur la carte.</>}
                      </>
                    ) : (
                      <>⚠ Coordonnées hors Maroc — vérifiez la zone Lambert sélectionnée.</>
                    )}
                  </div>
                );
              })()}
            </details>

            {/* Sprint 1 SIG — géoréférencement du bien sur carte */}
            <div className="blk-title" style={{ marginTop: 28 }}>{moaType === "morale" ? "5" : "4"}) Géoréférencement (recommandé)</div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 12, maxWidth: 720 }}>
              Localisez précisément votre bien sur la carte — cela permet à l'expert de croiser
              automatiquement les références cadastrales, les comparables ventes et les zonages
              urbanistiques (Plans d'Aménagement TAAMIR).
            </div>
            <MapPicker
              region={identity.region}
              province={identity.province}
              commune={identity.commune}
              adresse={identity.adresseBien}
              onChange={(c) => setGeoCoords(c)}
              height={360}
              highlightRegionCode={adminCodes.regionCode}
              highlightProvinceCode={adminCodes.provinceCode}
              highlightCommuneCode={adminCodes.communeCode}
              autoGeocodeAddress
              externalLambert={validLambertPoints.length > 0 ? { zone: lambertZone, points: validLambertPoints } : undefined}
            />

            {/* Sprint 1 — upload extrait Mohafadati (workaround ANCFCC) */}
            <MohafadatiUpload onChange={(d) => setMohafadatiDoc(d)} />

            {/* Sprint 1 — N° de titre foncier (validation format + conservation) */}
            <TitleFoncierInput onChange={(d) => setTitleFoncier(d)} />

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

      {/* BLOC 3 — DÉTAILS DESCRIPTIFS (le client décrit son bien, nous calculons les valeurs) */}
      {reached("details") && reportType && (
        <section className="section" id="p5-details" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 3</div>
            <h2 className="section-title">Décrivez votre bien — nous calculons l'estimation</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              Vous venez justement pour obtenir une expertise — nous ne vous demandons pas
              de connaître les chiffres financiers. Donnez-nous quelques caractéristiques
              du bien, et nous calculons en interne une estimation sommaire qui servira de
              base au devis du rapport (le rapport l'affinera ensuite précisément).
            </p>

            {/* Type de bien — pictos clairs */}
            <div className="blk-title">Type de bien</div>
            <div className="grid-3" style={{ marginBottom: 20 }}>
              {[
                { id: "TERRAIN_NU",      label: "Terrain nu",          sub: "Foncier sans construction" },
                { id: "VILLA",           label: "Villa",               sub: "RDC à R+2 — 1 logement" },
                { id: "PETIT_COLLECTIF", label: "Petit collectif",     sub: "Immeuble ≤ R+4, ≥ 2 logements" },
                { id: "GRAND_COLLECTIF", label: "Grand collectif",     sub: "Immeuble R+5 et plus" },
                { id: "EQUIPEMENT",      label: "Équipement (EPIG)",   sub: "Hôtel, école, hangar, clinique…" },
                { id: "AMENAGEMENT",     label: "Aménagement",         sub: "Local existant à transformer" },
              ].map(o => {
                const sel = bienFamily === o.id;
                return (
                  <button
                    key={o.id} type="button"
                    onClick={() => setBienFamily(o.id as BienFamily)}
                    style={{
                      textAlign: "left", padding: 14, borderRadius: 12, cursor: "pointer",
                      background: sel ? "linear-gradient(135deg, rgba(201,162,39,0.14), rgba(232,216,166,0.14))" : "rgba(255,255,255,0.88)",
                      border: sel ? "2px solid #C9A227" : "1px solid rgba(201,162,39,0.30)",
                      fontFamily: "inherit", boxShadow: sel ? "0 14px 38px rgba(11,27,58,0.12)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 14.5 }}>{o.label}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{o.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Caractéristiques mesurables */}
            <div className="blk-title">Caractéristiques du bien</div>
            <div className="form-grid">
              {bienFamily !== "AMENAGEMENT" && (
                <div className="field">
                  <label className="label">Surface du terrain (m²) <span className="req">*</span></label>
                  <input className="control" type="number" min={0} value={surfaceTerrainM2}
                    onChange={(e) => setSurfaceTerrainM2(e.target.value)} placeholder="ex. 800" />
                </div>
              )}
              {(bienFamily === "AMENAGEMENT" || bienFamily === "EQUIPEMENT") && (
                <div className="field">
                  <label className="label">Surface plancher / du local (m²){bienFamily === "AMENAGEMENT" && <> <span className="req">*</span></>}</label>
                  <input className="control" type="number" min={0} value={surfacePlancherM2}
                    onChange={(e) => setSurfacePlancherM2(e.target.value)} placeholder="ex. 240" />
                </div>
              )}
              {(bienFamily === "VILLA" || bienFamily === "PETIT_COLLECTIF" || bienFamily === "GRAND_COLLECTIF" || bienFamily === "EQUIPEMENT") && (
                <div className="field">
                  <label className="label">Niveau d'étages</label>
                  <select className="control" value={rLevel} onChange={(e) => setRLevel(e.target.value)}>
                    <option value="R0">RDC seul</option>
                    <option value="R1">R+1</option>
                    <option value="R2">R+2</option>
                    <option value="R3">R+3</option>
                    <option value="R4">R+4</option>
                    <option value="R5">R+5</option>
                    <option value="R6">R+6</option>
                    <option value="R7">R+7</option>
                    <option value="R8">R+8 et plus</option>
                  </select>
                </div>
              )}
              {(bienFamily === "PETIT_COLLECTIF" || bienFamily === "GRAND_COLLECTIF") && (
                <div className="field">
                  <label className="label">Nombre de bâtiments</label>
                  <input className="control" type="number" min={1} step={1}
                    value={nbBatiments} onChange={(e) => setNbBatiments(e.target.value)} placeholder="1" />
                </div>
              )}
              {bienFamily !== "TERRAIN_NU" && (
                <div className="field">
                  <label className="label">Standing visé (coût construction au m²)</label>
                  <select className="control" value={standing} onChange={(e) => setStanding(e.target.value as StandingTier)}>
                    <option value="economique">Économique — env. 3 250 DH/m² (logement social conventionné)</option>
                    <option value="moyen">Moyen standing — env. 4 500 DH/m² (carrelage, PVC, peinture standard)</option>
                    <option value="haut">Haut standing — env. 7 500 DH/m² (marbre, alu, domotique basique)</option>
                    <option value="luxe">Luxe — env. 13 000 DH/m² (sur mesure, bois noble, domotique intégrale)</option>
                  </select>
                </div>
              )}
              <div className="field">
                <label className="label">Tranche de prix de la zone (foncier — base villa)</label>
                <select className="control" value={zoneTier} onChange={(e) => setZoneTier(e.target.value as ZoneTier)}>
                  <option value="RURAL">Rural / agricole / industriel — 500 à 2 500 DH/m² (douars, communes rurales, zones d'activité)</option>
                  <option value="PERIPHERIE">Périphérie économique — 1 500 à 4 000 DH/m² (Akkari, Hay Hassani, Branes Tanger, Sidi Bernoussi, périph. Fès/Meknès)</option>
                  <option value="VILLE_MOYENNE">Résidentiel standard — 3 000 à 7 000 DH/m² (Témara, Bouskoura, Aviation Rabat, Targa Marrakech, Dar Bouazza, Kénitra centre)</option>
                  <option value="URBAIN">Résidentiel intermédiaire — 5 000 à 10 000 DH/m² (Souissi standard, OLM, Sidi Maarouf, Hivernage entrée, Malabata, Founty)</option>
                  <option value="BON_QUARTIER">Résidentiel confort — 8 000 à 14 000 DH/m² (Hay Riad, Agdal résidentiel villa, Maarif/CIL, Gueliz, Mdiq, Tétouan centre)</option>
                  <option value="PREMIUM">Premium villa — 12 000 à 22 000 DH/m² (Souissi haut/Ambassadeurs, Anfa résidentiel villa, Gauthier, Marina Tanger, Cabo Negro)</option>
                  <option value="PRESTIGE">Prestige — 20 000 à 35 000 DH/m² (Haut Agdal immeuble, Ain Diab villa, Racine immeuble Casa, Hassan immeuble premium)</option>
                  <option value="ULTRA">Ultra-prime — 30 000 à 50 000 DH/m² (Anfa Supérieur immeuble, Bd d'Anfa, CFC, Ain Diab front mer immeuble)</option>
                </select>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 6, fontStyle: "italic", lineHeight: 1.55 }}>
                  Les fourchettes affichées sont calibrées sur le <strong>terrain villa</strong>.
                  Si vous avez sélectionné un <strong>petit collectif</strong> (×1,4) ou un
                  <strong> grand collectif R+5 et plus</strong> (×1,6), un multiplicateur destination
                  s'applique automatiquement — un terrain pour immeuble en hauteur capte la rente
                  du COS et se vend plus cher au m² (ex. Agdal villa ~14k vs Agdal immeuble ~25k).
                </div>
              </div>
            </div>

            {/* Bandeau explicite sur la source des fourchettes de prix */}
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.30)",
              borderLeft: "4px solid #f59e0b", borderRadius: 10,
              fontSize: 12.5, color: "rgba(11,27,58,0.85)", lineHeight: 1.6,
            }}>
              <strong>Fourchettes recalibrées 2025-2026 — sources croisées :</strong>
              {" "}
              <a href="https://portail.tax.gov.ma/wps/portal/DGI/Referentiels-des-prix-de-l_immobilier/" target="_blank" rel="noopener noreferrer" style={{ color: "#0B1B3A", fontWeight: 700, textDecoration: "underline" }}>Référentiel DGI</a> (officiel droits d'enregistrement),{" "}
              <a href="https://www.ancfcc.gov.ma/valeursvenales" target="_blank" rel="noopener noreferrer" style={{ color: "#0B1B3A", fontWeight: 700, textDecoration: "underline" }}>ANCFCC Valeurs Vénales</a>,{" "}
              <a href="https://www.bkam.ma/fr/content/download/834997/9078446/IPAI%20T3-2025.pdf" target="_blank" rel="noopener noreferrer" style={{ color: "#0B1B3A", fontWeight: 700, textDecoration: "underline" }}>IPAI BAM T3-2025</a>,
              {" "}plateformes marché (Yakeey, Agenz, Mubawab, Avito), analyses 2025 (Aykana Souissi, Sefiani Agdal, KNA Marrakech).
              {" "}<strong>Les valeurs sont alignées sur le terrain villa</strong> — un multiplicateur destination
              automatique (×1,4 à ×1,8) s'applique pour les terrains à immeuble en hauteur, conformément à la
              rente du COS observée par l'ANCFCC. Le rapport final croise ces sources avec le référentiel DGI
              de la commune concernée.
            </div>

            {/* Option expert : « je connais déjà les valeurs » */}
            <div style={{ marginTop: 22, padding: "14px 18px", background: "rgba(11,27,58,0.04)", border: "1px solid rgba(11,27,58,0.10)", borderRadius: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, color: "#0B1B3A", fontWeight: 600 }}>
                <input type="checkbox" checked={knowsValues} onChange={(e) => setKnowsValues(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#C9A227" }} />
                Je connais déjà les valeurs financières — les renseigner manuellement (optionnel)
              </label>
              {knowsValues && (
                <div className="form-grid" style={{ marginTop: 14 }}>
                  <div className="field">
                    <label className="label">Prix foncier (MAD)</label>
                    <input className="control" type="number" min={0} value={prixFoncier}
                      onChange={(e) => setPrixFoncier(e.target.value)} placeholder="ex. 2 500 000" />
                  </div>
                  <div className="field">
                    <label className="label">Coût construction (MAD)</label>
                    <input className="control" type="number" min={0} value={coutConstruction}
                      onChange={(e) => setCoutConstruction(e.target.value)} placeholder="ex. 8 000 000" />
                  </div>
                  <div className="field">
                    <label className="label">Investissement total (MAD)</label>
                    <input className="control" type="number" min={0} value={montantInvest}
                      onChange={(e) => setMontantInvest(e.target.value)} placeholder="auto = foncier + construction + 10 %" />
                  </div>
                </div>
              )}
            </div>

            {/* Aperçu en transparence — estimation sommaire interne + devis pré-calculé */}
            {preview && preview.estimation && (
              <div className="lux-card" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>Estimation sommaire interne · transparence</div>
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 20, fontWeight: 700, color: "#0B1B3A" }}>
                      Aperçu — pas encore le rapport final
                    </div>
                  </div>
                  <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.32)", borderRadius: 12, padding: "10px 16px", textAlign: "right" }}>
                    <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Devis rapport</div>
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 26, fontWeight: 800, color: "#0B1B3A", lineHeight: 1 }}>
                      {fmtMAD(preview.amounts?.totalTTC)}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>TTC · livré sous {preview.meta?.deliveryDays} j</div>
                  </div>
                </div>
                <div className="qrow"><span className="k">Prix foncier estimé</span><span className="v">{fmtMAD(preview.estimation.prixFoncierMAD)}</span></div>
                <div className="qrow"><span className="k">Coût de construction estimé</span><span className="v">{fmtMAD(preview.estimation.coutConstructionMAD)}</span></div>
                <div className="qrow"><span className="k">Surface plancher estimée</span><span className="v">{preview.estimation.surfacePlancherEstimee?.toLocaleString("fr-FR") || "—"} m²</span></div>
                <div className="qrow"><span className="k">Montant total d'investissement</span><span className="v">{fmtMAD(preview.estimation.montantInvestissementMAD)}</span></div>
                {preview.estimation.hypotheses?.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "rgba(11,27,58,0.7)" }}>
                      Voir les hypothèses du calcul ({preview.estimation.hypotheses.length})
                    </summary>
                    <div className="muted" style={{ fontSize: 12, lineHeight: 1.65, marginTop: 8 }}>
                      {preview.estimation.hypotheses.map((h: string, i: number) => <div key={i}>• {h}</div>)}
                    </div>
                  </details>
                )}
                <div className="muted" style={{ fontSize: 11.5, fontStyle: "italic", marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(11,27,58,0.15)" }}>
                  Ces chiffres sont une estimation indicative — le rapport final les affinera
                  précisément après visite terrain et étude marché localisée.
                </div>
              </div>
            )}
            {previewBusy && (
              <div className="muted" style={{ fontSize: 12, marginTop: 12, fontStyle: "italic" }}>Calcul de l'estimation…</div>
            )}

            <div className="mini-note" style={{ marginTop: 18 }}>
              <strong>Comment est calculé votre devis ?</strong>{" "}
              {reportType === "ESTIMATION_EXPRESS" && "Forfait fixe 990 DH HT — pas de visite, livré sous 48h. Accessible à tous (succession, partage, négociation, simple curiosité)."}
              {reportType === "EXPERTISE_PRIX" && "Tranches dégressives sur le prix foncier : 0,5 % jusqu'à 500 000 DH, puis 0,4 % jusqu'à 2 M DH, 0,3 % jusqu'à 10 M DH, 0,2 % au-delà. Plancher 1 500 DH HT — opposable bancairement."}
              {reportType === "EXPERTISE_URBA" && "Tranches dégressives sur le coût de construction : 0,5 % jusqu'à 500 000 DH, puis 0,4 % jusqu'à 5 M DH, 0,3 % jusqu'à 50 M DH, 0,2 % au-delà. Plancher 2 500 DH HT."}
              {reportType === "READY_TO_INVEST" && "Tranches dégressives sur l'investissement total : 0,5 % jusqu'à 5 M DH, puis 0,3 % jusqu'à 50 M DH, 0,2 % jusqu'à 200 M DH, 0,15 % au-delà. Plancher 15 000 DH HT — co-signé architecte + expert."}
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
