import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";
import { getStoredLang } from "../../../../i18n/i18n";

const P2_PENDING_KEY = "citurbarea:p2:pending_intake:v1";

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
// Séquence stricte (alignée P1) : on identifie d'abord le client,
// puis son projet, puis on crée le compte → le devis n'est livré
// qu'avec un vrai dossier identifié.
type Phase = "identity" | "section" | "category" | "measures" | "follow";

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

/**
 * Liste des natures de projet, dérivée des catégories du barème CNOA 2021
 * (cf. apps/api/src/tomes/tome-2/p2/pricing.service.ts BAREME_CNOA_2021).
 *
 * Regroupée par famille pour un <select> à <optgroup>. L'option « autre »
 * débloque un champ libre pour saisir un type non listé.
 */
const NATURE_PROJET_OPTIONS: { group: string; options: { value: string; label: string }[] }[] = [
  {
    group: "Habitat individuel (≤ R+3)",
    options: [
      { value: "habitat_rdc",        label: "Maison RDC (de plain-pied)" },
      { value: "habitat_r1",         label: "Maison R+1" },
      { value: "habitat_r2",         label: "Maison R+2" },
      { value: "habitat_r3",         label: "Maison R+3" },
      { value: "habitat_social",     label: "Habitat social (conventionné Etat — 140 000 / 250 000 DH)" },
    ],
  },
  {
    group: "Immeuble collectif / bureaux (R+4 et plus)",
    options: [
      { value: "immeuble_r4",        label: "Immeuble R+4" },
      { value: "immeuble_r5",        label: "Immeuble R+5" },
      { value: "immeuble_r6",        label: "Immeuble R+6" },
      { value: "immeuble_r7",        label: "Immeuble R+7" },
      { value: "immeuble_r8plus",    label: "Immeuble R+8 et plus" },
      { value: "immeuble_moyen",     label: "Immeuble collectif moyen standing R+4+" },
      { value: "immeuble_haut",      label: "Immeuble collectif haut standing R+4+" },
      { value: "bureaux_r4plus",     label: "Immeuble de bureaux R+4+" },
    ],
  },
  {
    group: "Villas",
    options: [
      { value: "villa_bande",        label: "Villa en bande" },
      { value: "villa_bande_st",     label: "Villa en bande de standing" },
      { value: "villa_jumelee",      label: "Villa jumelée" },
      { value: "villa_jumelee_st",   label: "Villa jumelée de standing" },
      { value: "villa_isolee",       label: "Villa isolée" },
      { value: "villa_isolee_st",    label: "Villa isolée de standing" },
    ],
  },
  {
    group: "Groupement résidentiel",
    options: [
      { value: "gr_residence",       label: "Résidence (plusieurs immeubles)" },
      { value: "gr_complexe",        label: "Complexe résidentiel mixte" },
      { value: "gr_villas",          label: "Lotissement de villas" },
    ],
  },
  {
    group: "Lotissement / morcellement",
    options: [
      { value: "lot_residentiel",    label: "Lotissement résidentiel" },
      { value: "lot_industriel",     label: "Lotissement industriel" },
      { value: "lot_morcellement",   label: "Morcellement (loi 25-90)" },
    ],
  },
  {
    group: "Équipement privé d'intérêt général (EPIG)",
    options: [
      { value: "epig_hangar_agri",   label: "Hangar agricole" },
      { value: "epig_hangar_indus",  label: "Hangar / dépôt industriel" },
      { value: "epig_usine",         label: "Usine" },
      { value: "epig_ecole",         label: "École / collège / lycée" },
      { value: "epig_mosquee",       label: "Mosquée" },
      { value: "epig_maison_hote",   label: "Maison d'hôte" },
      { value: "epig_hotel2",        label: "Hôtel 2★ / résidence touristique" },
      { value: "epig_hotel3",        label: "Hôtel 3★" },
      { value: "epig_hotel4",        label: "Hôtel 4★" },
      { value: "epig_hotel5",        label: "Hôtel 5★ / équipement haut standing" },
      { value: "epig_clinique",      label: "Clinique / hospitalier" },
      { value: "epig_labo",          label: "Laboratoire / hémodialyse" },
    ],
  },
  {
    group: "Aménagement / transformation",
    options: [
      { value: "amg_petit",          label: "Petit aménagement intérieur (≤ 50 m²)" },
      { value: "amg_agence",         label: "Agence bancaire / télécom" },
      { value: "amg_showroom",       label: "Show-room / commerce" },
      { value: "amg_restaurant",     label: "Restaurant / café" },
      { value: "amg_changement_aff", label: "Changement d'affectation (villa → équipement)" },
    ],
  },
  {
    group: "Autre",
    options: [
      { value: "autre",              label: "Autre — à préciser" },
    ],
  },
];

const fullBleed: React.CSSProperties = {
  width: "100vw", position: "relative", left: "50%", right: "50%",
  marginLeft: "-50vw", marginRight: "-50vw", minHeight: "100vh", background: PAGE_BG,
  // Flex column → on peut forcer le bloc « identité » à venir juste après
  // le header sans déplacer 150 lignes de JSX.
  display: "flex", flexDirection: "column",
};

const HERO_POINTS = [
  { t: "Barème officiel", d: "Honoraires calculés sur le barème CNOA 2021." },
  { t: "Phases détaillées", d: "Esquisse, DCE, suivi — phases A / B / C transparentes." },
  { t: "Devis immédiat", d: "Estimation chiffrée avant tout engagement." },
  { t: "Contrat unifié", d: "Contrat type CNOA + visa CROA en ligne." },
];

function P2HomeInner() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"flow" | "success">("flow");
  const [phase, setPhase] = useState<Phase>("identity");
  const [busy, setBusy] = useState(false);

  const [section, setSection] = useState<P2Section | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryCode, setCategoryCode] = useState<string>("");
  const [surfacePlancher, setSurfacePlancher] = useState<string>("");          // AMG : plancher direct
  const [nbBatiments, setNbBatiments] = useState<string>("1");
  const [surfaceTerrainHa, setSurfaceTerrainHa] = useState<string>("");        // LOT : hectares
  // IMM / GR / EPIG — caractéristiques du projet → plancher CALCULÉ (logique P1)
  const [terrainM2, setTerrainM2] = useState<string>("");
  const [rLevel, setRLevel] = useState<string>("R2");
  const [facades, setFacades] = useState<string>("3");
  const [basement, setBasement] = useState<boolean>(false);
  const [immVariant, setImmVariant] = useState<string>("standard");
  const [followMode, setFollowMode] = useState<FollowMode>("ON_SITE");
  const [quote, setQuote] = useState<Quote | null>(null);
  // Niveau de standing — pilote le coût construction (en complément de la
  // catégorie de barème). Aligné sur la doctrine P1 (économique / moyen /
  // haut / luxe → 2000 / 3500 / 5000 / 7500 MAD par m²).
  const [standing, setStanding] = useState<"economique" | "moyen" | "haut" | "luxe">("moyen");
  // Maître d'ouvrage : personne physique ou morale (cf. P1)
  const [moaType, setMoaType] = useState<"physique" | "morale">("physique");
  // Statut du propriétaire du terrain (cf. P1 ownerStatus)
  const [ownerStatus, setOwnerStatus] = useState<string>("");
  // Délai souhaité (cf. P1 timeline)
  const [timeline, setTimeline] = useState<string>("");
  const [identity, setIdentity] = useState({
    clientNom: "", clientTel: "", clientEmail: "",
    raisonSociale: "", representant: "", rc: "", ice: "",
    region: "", province: "", commune: "", natureProjet: "",
  });
  // Si l'utilisateur choisit « autre » dans la liste, on stocke la
  // valeur libre dans un état dédié et on l'écrit dans natureProjet
  // lors du submit (format : « Autre : <texte libre> »).
  const [natureCode, setNatureCode] = useState<string>("");
  const [natureAutre, setNatureAutre] = useState<string>("");
  const [error, setError] = useState("");
  const [dossierId, setDossierId] = useState<string | null>(null);

  const isLOT = section === "LOT";
  const isAMG = section === "AMG";
  const useRichMeasures = section === "IMM" || section === "GR" || section === "EPIG";
  const selectedCategory = categories.find(c => c.code === categoryCode);

  // ── Calcul du plancher estimé (logique P1) ─────────────────────────
  // SP = terrain × baseCoef × (1 + sous-sol + (étages × multiplier))
  //   multiplier = 1.0 si 1 façade (mitoyenne), 1.1 si ≥ 2 façades
  //   baseCoef = 0.7 pour Maison de ville / RDC commercial, sinon 1.0
  const parseR = (r: string): number => { const m = r.match(/R(\d+)/i); return m ? parseInt(m[1], 10) : NaN; };
  const computedSPPerBuilding: number | null = (() => {
    if (!useRichMeasures) return null;
    const st = Number(terrainM2);
    if (!Number.isFinite(st) || st <= 0) return null;
    const e = parseR(rLevel);
    if (!Number.isFinite(e)) return null;
    const fac = parseInt(facades, 10);
    if (!Number.isFinite(fac) || fac <= 0) return null;
    const hasBasement = basement ? 1 : 0;
    const baseCoef = (section === "IMM" && (immVariant === "maison_ville" || immVariant === "rdc_commercial")) ? 0.7 : 1.0;
    const raw = fac === 1
      ? st * baseCoef * (1 + hasBasement + e)
      : st * baseCoef * (1 + hasBasement + 1.1 * e);
    return Math.round(raw);
  })();
  const computedSPTotal: number | null = (() => {
    if (computedSPPerBuilding == null) return null;
    if (section === "GR") {
      const n = parseInt(nbBatiments, 10);
      return Number.isFinite(n) && n > 0 ? computedSPPerBuilding * n : computedSPPerBuilding;
    }
    return computedSPPerBuilding;
  })();
  const fmtInt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
  const PHASES: Phase[] = ["identity", "section", "category", "measures", "follow"];
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
      // LOT n'a pas de phase « mode de suivi » → on enchaîne directement
      // sur la création de compte + dossier ; le devis est livré ensuite.
      submitIntake();
      return;
    }
    if (isAMG) {
      if (!surfacePlancher || +surfacePlancher <= 0) { setError("Surface du local à aménager requise."); return; }
      setPhase("follow");
      return;
    }
    // IMM / GR / EPIG — plancher calculé à partir des caractéristiques
    if (!terrainM2 || +terrainM2 <= 0) { setError("Surface du terrain requise."); return; }
    if (computedSPPerBuilding == null) { setError("Renseignez le niveau (R+), la configuration des façades et le sous-sol."); return; }
    if (section === "GR" && (!nbBatiments || +nbBatiments < 1)) { setError("Nombre de bâtiments requis."); return; }
    setPhase("follow");
  };

  const computeQuote = async () => {
    setError("");
    setBusy(true);
    try {
      const body: any = { section, followMode };
      if (section === "LOT") {
        body.surfaceTerrainHa = +surfaceTerrainHa;
      } else {
        body.categoryCode = categoryCode;
        // AMG : plancher saisi directement. IMM/GR/EPIG : plancher calculé depuis le terrain et la typologie.
        body.surfacePlancherM2 = isAMG ? +surfacePlancher : (computedSPPerBuilding ?? 0);
        body.nbBatiments = section === "GR" ? +nbBatiments : 1;
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

  // Construit le payload /p2/intake à partir de l'état actuel.
  // Réutilisé par le submit direct ET par la branche signup (stockée puis rejouée).
  const buildIntakePayload = (clientEmailOverride?: string) => {
    const sectionLabel = SECTIONS.find(s => s.id === section)?.label;
    const title = `${sectionLabel} — ${selectedCategory?.label || ""} — ${identity.commune}`.replace(/—\s+—/g, "—").trim();
    return {
      porteType: "P2" as const,
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
      clientEmail: clientEmailOverride || identity.clientEmail || undefined,
      title,
      lang: getStoredLang(),
      source: "P2_WIZARD",
      brief: {
        sectionP2: section,
        categoryCode: categoryCode || undefined,
        categoryLabel: selectedCategory?.label,
        surfacePlancherM2: section === "LOT" ? undefined : (isAMG ? +surfacePlancher : (computedSPPerBuilding ?? undefined)),
        surfacePlancherTotalEstime: !isLOT && computedSPTotal != null ? computedSPTotal : undefined,
        terrainM2: useRichMeasures && terrainM2 ? +terrainM2 : undefined,
        rLevel: useRichMeasures ? rLevel : undefined,
        facades: useRichMeasures ? +facades : undefined,
        basement: useRichMeasures ? basement : undefined,
        immVariant: section === "IMM" ? immVariant : undefined,
        nbBatiments: section === "GR" ? +nbBatiments : 1,
        surfaceTerrainHa: section === "LOT" ? +surfaceTerrainHa : undefined,
        followMode,
        // Champs P1 répliqués (qualification complète)
        region: identity.region,
        province: identity.province,
        moaType,
        standing,
        ownerStatus,
        timeline,
        natureProjetCode: natureCode,
        natureProjetAutre: natureCode === "autre" ? natureAutre : undefined,
        quoteSnapshot: quote,
      },
    };
  };

  // Famille déduite du code nature pour afficher les sous-champs adéquats.
  const natureFamily: "habitat" | "immeuble" | "villa" | "gr" | "lot" | "epig" | "amg" | "autre" | "" = (() => {
    if (!natureCode) return "";
    if (natureCode === "autre") return "autre";
    if (natureCode.startsWith("habitat_") || natureCode === "bureaux_r4plus") return "habitat";
    if (natureCode.startsWith("immeuble_")) return "immeuble";
    if (natureCode.startsWith("villa_")) return "villa";
    if (natureCode.startsWith("gr_")) return "gr";
    if (natureCode.startsWith("lot_")) return "lot";
    if (natureCode.startsWith("epig_")) return "epig";
    if (natureCode.startsWith("amg_")) return "amg";
    return "";
  })();

  // Le niveau R+ est-il déjà inscrit dans le label de la nature ?
  // (ex. "Maison R+2", "Immeuble R+5"). Dans ce cas on ne le redemande pas.
  const rLevelImpliedByNature = /(_r\d|_rdc)/.test(natureCode);

  // Quels sous-champs faut-il afficher en étape 1 ?
  const askRLevel       = natureFamily === "villa" || natureFamily === "gr" || (natureFamily === "habitat" && !rLevelImpliedByNature) || (natureFamily === "immeuble" && !rLevelImpliedByNature);
  const askNbBatiments  = natureFamily === "gr";
  const askTerrainM2    = ["habitat", "immeuble", "villa", "gr", "epig"].includes(natureFamily);
  const askTerrainHa    = natureFamily === "lot";
  const askPlancher     = natureFamily === "amg" || natureFamily === "epig";

  // Validation de la phase identité (étape 1 — qui êtes-vous).
  const validateIdentity = (): string | null => {
    if (!identity.clientNom || !identity.clientTel) return "Nom et téléphone obligatoires.";
    if (!identity.region || !identity.province || !identity.commune) return "Région, province et commune obligatoires.";
    if (moaType === "morale" && (!identity.raisonSociale || !identity.representant)) {
      return "Raison sociale et représentant légal obligatoires pour une personne morale.";
    }
    if (!natureCode) return "Choisissez la nature du projet dans la liste.";
    if (natureCode === "autre" && !natureAutre.trim()) {
      return "Précisez votre type de projet (champ « Autre »).";
    }
    // Sous-champs contextuels (n'apparaissent que pour certaines familles).
    if (askRLevel && !rLevel) return "Indiquez le niveau d'étages (R, R+1, …).";
    if (askNbBatiments && (!nbBatiments || +nbBatiments < 1)) return "Indiquez le nombre de bâtiments.";
    if (askTerrainHa && (!surfaceTerrainHa || +surfaceTerrainHa <= 0)) return "Surface du terrain (hectares) obligatoire.";
    if (askPlancher && (!surfacePlancher || +surfacePlancher <= 0)) return "Surface plancher / du local obligatoire.";
    if (!ownerStatus) return "Indiquez le statut du terrain.";
    if (!timeline) return "Indiquez le délai souhaité.";
    return null;
  };

  // Étape 1 → 2 : on a identifié le client, on passe au projet.
  const identityContinue = () => {
    setError("");
    const err = validateIdentity();
    if (err) { setError(err); return; }
    setPhase("section");
  };

  const submitIntake = async () => {
    setError("");
    // Filet de sécurité : si on arrive ici via un raccourci, on re-vérifie l'identité.
    const idErr = validateIdentity();
    if (idErr) { setError(idErr); setPhase("identity"); return; }

    // Continuité « comme P1 » : si pas connecté, on passe par le signup client
    // (mot de passe + double validation email/SMS), puis on rejoue l'intake.
    if (!auth.isAuthed) {
      try {
        localStorage.setItem(P2_PENDING_KEY, JSON.stringify(buildIntakePayload()));
      } catch {}
      // Préremplit l'inscription avec le téléphone/email/nom déjà saisis (via query).
      const params = new URLSearchParams();
      if (identity.clientEmail) params.set("email", identity.clientEmail);
      if (identity.clientTel) params.set("phone", identity.clientTel);
      if (identity.clientNom) params.set("name", identity.clientNom);
      params.set("next", "/p2/finalize");
      navigate(`/creer-compte/client?${params.toString()}`);
      return;
    }

    setBusy(true);
    try {
      // Devis calculé en silence juste avant la création du dossier — il
      // accompagnera la confirmation. Comme prévu : le devis n'est livré
      // qu'avec un dossier identifié.
      if (!quote) {
        try { await computeQuote(); } catch { /* devis livré plus tard */ }
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

  // ── Écran de succès : compte créé + dossier identifié + devis livré ──
  if (screen === "success") {
    return (
      <div className="p2page" style={fullBleed}>
        <style>{P1_CSS}</style>
        <section className="section">
          <div className="container-max" style={{ maxWidth: 820 }}>
            <div className="lux-card" style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
              <h2 style={{ fontSize: 26, margin: "0 0 12px" }}>Dossier créé · devis livré</h2>
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.7, margin: "0 0 18px" }}>
                Votre projet <strong style={{ color: "#0B1B3A" }}>{SECTIONS.find(s => s.id === section)?.label}</strong> est
                désormais rattaché à votre compte et à un dossier identifié dans votre espace
                CITURBAREA. L'équipe vous recontacte sous 24h avec le contrat type unifié et le visa CROA.
                <br />
                <span style={{ fontSize: 12 }}>Réf. dossier : {dossierId?.slice(0, 12)}…</span>
              </p>
            </div>

            {/* Devis officiel — livré uniquement avec un dossier identifié */}
            {quote && (
              <div className="lux-card" style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "rgba(201,162,39,0.95)", fontSize: 13, fontWeight: 800 }}>{quote.meta.sectionLabel}</div>
                    <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{quote.meta.categoryLabel || "Tarification spécifique"}</div>
                  </div>
                  <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.32)", borderRadius: 14, padding: "14px 20px", textAlign: "right" }}>
                    {quote.honoraires.totalTTC != null && (
                      <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Devis dossier</div>
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

  // ── Page de qualification (déroulante) ───────────────────────────────
  return (
    <div className="p2page" style={fullBleed}>
      <style>{P1_CSS}</style>

      {/* HERO — forcé en première position par order=-2 (avant tout autre flex item) */}
      <header className="hero" style={{ order: -2 }}>
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
                const el = document.getElementById("p2-identity");
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

      {/* BLOC 2 — SECTION (apparaît après l'identification du client) */}
      {reached("section") && (
      <section className="section" id="p2-section" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
        <div className="container-max">
          <div className="eyebrow">Étape 2</div>
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
      )}

      {/* BLOC 3 — CATÉGORIE */}
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
                : isAMG
                ? "Surface utile du local existant à transformer."
                : "Caractéristiques du projet — le plancher est estimé automatiquement à partir du terrain, du niveau (R+) et de la configuration des façades. Vous n'avez pas à le deviner."}
            </p>
            {isLOT ? (
              <div style={{ maxWidth: 760 }}>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label className="label">Surface terrain (hectares)</label>
                  <input className="control" type="number" step="0.1" value={surfaceTerrainHa}
                    onChange={e => setSurfaceTerrainHa(e.target.value)} placeholder="2.5" />
                </div>
                <div className="mini-note">
                  ℹ La grille tarifaire des honoraires de lotissement est en cours de finalisation par CITURBAREA.
                  Vous recevrez sous 24h un devis personnalisé après soumission de votre demande.
                </div>
              </div>
            ) : isAMG ? (
              <div style={{ maxWidth: 760 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">Surface du local à aménager (m²)</label>
                  <input className="control" type="number" value={surfacePlancher}
                    onChange={e => setSurfacePlancher(e.target.value)} placeholder="120" />
                </div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  Surface utile du local existant à transformer.
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">Surface du terrain (m²)</label>
                    <input className="control" type="number" value={terrainM2}
                      onChange={e => setTerrainM2(e.target.value)} placeholder="800" />
                  </div>
                  <div className="field">
                    <label className="label">Niveau (R+)</label>
                    <select className="control" value={rLevel} onChange={e => setRLevel(e.target.value)}>
                      <option value="R0">R+0 (RDC seul)</option>
                      <option value="R1">R+1</option>
                      <option value="R2">R+2</option>
                      <option value="R3">R+3</option>
                      <option value="R4">R+4</option>
                      <option value="R5">R+5</option>
                      <option value="R6">R+6</option>
                      <option value="R7">R+7</option>
                      <option value="R8">R+8</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Configuration façades</label>
                    <select className="control" value={facades} onChange={e => setFacades(e.target.value)}>
                      <option value="1">1 façade (mitoyenne)</option>
                      <option value="2">Lot d'angle (2 façades)</option>
                      <option value="3">3 façades</option>
                      <option value="4">4 façades (isolé)</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Sous-sol</label>
                    <select className="control" value={basement ? "yes" : "no"}
                      onChange={e => setBasement(e.target.value === "yes")}>
                      <option value="no">Sans sous-sol</option>
                      <option value="yes">Avec sous-sol (parking / cave)</option>
                    </select>
                  </div>
                  {section === "IMM" && (
                    <div className="field">
                      <label className="label">Variante</label>
                      <select className="control" value={immVariant} onChange={e => setImmVariant(e.target.value)}>
                        <option value="standard">Immeuble standard (collectif / bureaux)</option>
                        <option value="maison_ville">Maison de ville</option>
                        <option value="rdc_commercial">RDC commercial dominant</option>
                      </select>
                    </div>
                  )}
                  {section === "GR" && (
                    <div className="field">
                      <label className="label">Nombre de bâtiments</label>
                      <input className="control" type="number" min={1} value={nbBatiments}
                        onChange={e => setNbBatiments(e.target.value)} placeholder="3" />
                    </div>
                  )}
                </div>
                {computedSPPerBuilding != null && (
                  <div className="mini-note" style={{ marginTop: 22, background: "rgba(201,162,39,0.10)", borderColor: "rgba(201,162,39,0.40)" }}>
                    <div>
                      <strong style={{ color: "#0B1B3A" }}>Plancher estimé :</strong>{" "}
                      <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontWeight: 800, color: "#0B1B3A" }}>
                        {fmtInt(computedSPPerBuilding)} m²
                      </span>
                      {section === "GR" && computedSPTotal != null && computedSPTotal !== computedSPPerBuilding && (
                        <> par bâtiment · <strong>Total :</strong> {fmtInt(computedSPTotal)} m²</>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "rgba(11,27,58,0.65)", fontStyle: "italic" }}>
                      Estimation indicative sous réserve de l'étude d'esquisse du projet. Le devis sera révisé sur le coût réel des travaux après adjudication.
                    </div>
                  </div>
                )}
              </>
            )}
            {error && phase === "measures" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" disabled={busy} onClick={measuresContinue}>
                {busy
                  ? "Envoi…"
                  : isLOT
                    ? (auth.isAuthed ? "Créer mon dossier et obtenir le devis →" : "Créer mon compte + dossier → recevoir le devis")
                    : "Continuer →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 5 — MODE DE SUIVI (dernière étape avant création de compte + dossier) */}
      {reached("follow") && !isLOT && (
        <section className="section" id="p2-follow" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">Étape 5</div>
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
              <button className="btn btn-gold" disabled={busy} onClick={submitIntake}>
                {busy ? "Envoi…" : (auth.isAuthed ? "Créer mon dossier et obtenir le devis →" : "Créer mon compte + dossier → recevoir le devis")}
              </button>
            </div>
            <div className="muted" style={{ marginTop: 14, fontSize: 12.5, maxWidth: 720, lineHeight: 1.6 }}>
              Votre devis personnalisé (barème CNOA 2021) est calculé après la création
              du dossier — un dossier identifié, rattaché à votre compte client.
            </div>
          </div>
        </section>
      )}

      {/* BLOC 1 IDENTITÉ — première étape (« qui êtes-vous »), avant le projet */}
      {reached("identity") && (
        <section className="section" id="p2-identity" style={{ order: -1 }}>
          <div className="container-max">
            <div className="eyebrow">Étape 1</div>
            <h2 className="section-title">Qui êtes-vous ?</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              On commence par vous identifier : statut, contact, localisation et caractéristiques
              du projet — ces données alimentent votre dossier et conditionnent le calcul du devis
              (article 2 du contrat type unifié Construction CNOA).
            </p>

            {/* 1) Type de maître d'ouvrage — comme P1 */}
            <div className="pill" style={{ marginBottom: 14 }}>1) Type de maître d'ouvrage <span className="req">*</span></div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              {[
                { id: "physique", label: "Personne physique", sub: "Particulier — Nom + CIN" },
                { id: "morale",   label: "Personne morale",   sub: "Société — Raison sociale + RC/ICE" },
              ].map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setMoaType(o.id as any)}
                  className={moaType === o.id ? "lux-card lux-card-active" : "lux-card"}
                  style={{
                    flex: "1 1 240px", textAlign: "left", cursor: "pointer", padding: 14,
                    border: moaType === o.id ? "2px solid #C9A227" : "1px solid rgba(11,27,58,0.18)",
                    background: moaType === o.id ? "#fff8e1" : "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 14.5 }}>{o.label}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{o.sub}</div>
                </button>
              ))}
            </div>

            {/* 2) Contact (toujours) */}
            <div className="pill" style={{ marginBottom: 14 }}>2) Contact <span className="req">*</span></div>
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

            {/* 3) Société — visible UNIQUEMENT si personne morale */}
            {moaType === "morale" && (
              <>
                <div className="blk-title">3) Société</div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">Raison sociale <span className="req">*</span></label>
                    <input className="control" value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder="SARL / SA / SNC…" />
                  </div>
                  <div className="field">
                    <label className="label">Représentant légal <span className="req">*</span></label>
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
              </>
            )}

            {/* 4) Localisation — région / province / commune (cf. P1) */}
            <div className="blk-title">{moaType === "morale" ? "4" : "3"}) Localisation du projet</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Région <span className="req">*</span></label>
                <input className="control" value={identity.region} onChange={f("region")} placeholder="Rabat-Salé-Kénitra, Casablanca-Settat…" />
              </div>
              <div className="field">
                <label className="label">Province / Préfecture <span className="req">*</span></label>
                <input className="control" value={identity.province} onChange={f("province")} placeholder="Kénitra, Salé, Rabat…" />
              </div>
              <div className="field">
                <label className="label">Commune <span className="req">*</span></label>
                <input className="control" value={identity.commune} onChange={f("commune")} placeholder="Mehdia, Témara, Bouznika…" />
              </div>
              <div className="field">
                <label className="label">Nature du projet <span className="req">*</span></label>
                <select
                  className="control"
                  value={natureCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNatureCode(v);
                    if (v !== "autre") {
                      // Renseigne natureProjet avec le label lisible.
                      let label = "";
                      for (const g of NATURE_PROJET_OPTIONS) {
                        const o = g.options.find(x => x.value === v);
                        if (o) { label = o.label; break; }
                      }
                      setIdentity(prev => ({ ...prev, natureProjet: label }));
                      setNatureAutre("");
                    } else {
                      setIdentity(prev => ({ ...prev, natureProjet: "" }));
                    }
                  }}
                >
                  <option value="">— Sélectionner —</option>
                  {NATURE_PROJET_OPTIONS.map(g => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {natureCode === "autre" && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Précisez votre type de projet <span className="req">*</span></label>
                  <input
                    className="control"
                    value={natureAutre}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNatureAutre(v);
                      setIdentity(prev => ({ ...prev, natureProjet: v ? `Autre : ${v}` : "" }));
                    }}
                    placeholder="Décrivez précisément la nature de votre projet…"
                  />
                </div>
              )}

              {/* Sous-champs contextuels — apparaissent selon le type de projet choisi */}
              {askRLevel && (
                <div className="field">
                  <label className="label">Niveau d'étages <span className="req">*</span></label>
                  <select className="control" value={rLevel} onChange={(e) => setRLevel(e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    <option value="R0">RDC (de plain-pied)</option>
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
              {askNbBatiments && (
                <div className="field">
                  <label className="label">Nombre de bâtiments <span className="req">*</span></label>
                  <input className="control" type="number" min={1} step={1}
                    value={nbBatiments} onChange={(e) => setNbBatiments(e.target.value)}
                    placeholder="ex. 4" />
                </div>
              )}
              {askTerrainM2 && (
                <div className="field">
                  <label className="label">Surface du terrain (m²)</label>
                  <input className="control" type="number" min={0} step={1}
                    value={terrainM2} onChange={(e) => setTerrainM2(e.target.value)}
                    placeholder="ex. 1500" />
                </div>
              )}
              {askTerrainHa && (
                <div className="field">
                  <label className="label">Surface du terrain (hectares) <span className="req">*</span></label>
                  <input className="control" type="number" min={0} step="0.01"
                    value={surfaceTerrainHa} onChange={(e) => setSurfaceTerrainHa(e.target.value)}
                    placeholder="ex. 3.5" />
                </div>
              )}
              {askPlancher && (
                <div className="field">
                  <label className="label">Surface plancher / du local (m²) <span className="req">*</span></label>
                  <input className="control" type="number" min={0} step={1}
                    value={surfacePlancher} onChange={(e) => setSurfacePlancher(e.target.value)}
                    placeholder="ex. 240" />
                </div>
              )}
              {natureCode && natureCode !== "autre" && (askRLevel || askNbBatiments || askTerrainM2 || askTerrainHa || askPlancher) && (
                <div className="muted" style={{ gridColumn: "1 / -1", fontSize: 11.5, fontStyle: "italic", marginTop: 6 }}>
                  Ces caractéristiques alimentent automatiquement le calcul du devis (vous pourrez les ajuster aux étapes suivantes).
                </div>
              )}
            </div>

            {/* 5) Caractéristiques projet — standing, propriétaire, délai (cf. P1) */}
            <div className="blk-title">{moaType === "morale" ? "5" : "4"}) Caractéristiques du projet</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">Niveau de standing <span className="req">*</span></label>
                <select className="control" value={standing} onChange={(e) => setStanding(e.target.value as any)}>
                  <option value="economique">Économique — env. 2 000 DH/m²</option>
                  <option value="moyen">Moyen standing — env. 3 500 DH/m²</option>
                  <option value="haut">Haut standing — env. 5 000 DH/m²</option>
                  <option value="luxe">Luxe — env. 7 500 DH/m² et plus</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Statut du terrain <span className="req">*</span></label>
                <select className="control" value={ownerStatus} onChange={(e) => setOwnerStatus(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  <option value="proprietaire">Propriétaire (titre foncier au nom du MOA)</option>
                  <option value="indivision">En indivision</option>
                  <option value="promesse">Promesse / compromis de vente</option>
                  <option value="leasing">Leasing / location longue durée</option>
                  <option value="autre">Autre / à préciser</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Délai souhaité <span className="req">*</span></label>
                <select className="control" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  <option value="0-6m">Démarrage sous 6 mois</option>
                  <option value="6-12m">6 à 12 mois</option>
                  <option value="12-24m">12 à 24 mois</option>
                  <option value="24m+">Plus de 24 mois / à étudier</option>
                </select>
              </div>
            </div>

            {error && phase === "identity" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 28 }}>
              <button className="btn btn-gold" onClick={identityContinue}>
                Continuer : décrire mon projet →
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Garde-fou : si le rendu de P2 plante, on affiche l'erreur exacte
 * à l'écran (message + pile) au lieu d'une page blanche.
 */
class P2ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ maxWidth: 900, margin: "48px auto", padding: "24px 28px", fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.6, color: "#b91c1c", background: "#fff", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, whiteSpace: "pre-wrap" }}>
          <strong style={{ fontSize: 15 }}>Porte 2 — erreur de rendu</strong>
          {"\n\n"}{this.state.err.message}
          {"\n\n"}{this.state.err.stack}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function P2Home() {
  return (
    <P2ErrorBoundary>
      <P2HomeInner />
    </P2ErrorBoundary>
  );
}
