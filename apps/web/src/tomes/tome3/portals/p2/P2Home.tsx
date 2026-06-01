import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase } from "../../../tome4/apiClient";
import { useAuth } from "../../../tome5/AuthProvider";
import { getStoredLang, useT } from "../../../../i18n/i18n";
import AdminLocationSelect from "../../../../features/geo/AdminLocationSelect";

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
type Phase = "identity" | "section" | "category" | "measures" | "follow" | "quote";

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

/* FIX-4 — responsive: caps fluides au lieu des maxWidth fixes inline */
.p2page .cit-porte-p2-narrow { max-width:820px; width:100%; }
.p2page .cit-porte-p2-mid    { max-width:760px; width:100%; }
.p2page .cit-porte-p2-help   { max-width:720px; width:100%; }
@media(max-width:760px){
  .p2page .cit-porte-p2-narrow,
  .p2page .cit-porte-p2-mid,
  .p2page .cit-porte-p2-help { max-width:100%; }
}
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
/**
 * Familles de projet — grandes cartes premium « type P1 ».
 *
 * Doctrine P2 : promotion immobilière à partir de 2 logements (bi-familial+).
 * L'habitat individuel mono-logement relève de la Porte 1 et n'est PAS proposé ici.
 * Les immeubles sont scindés en deux familles distinctes selon la doctrine :
 *   - Petit collectif jusqu'à R+4 (bi-familial et plus, max R+4)
 *   - Collectif R+5 et plus
 */
const NATURE_FAMILIES: { code: "immeuble_petit" | "immeuble_grand" | "villa" | "gr" | "lot" | "epig" | "amg" | "expertise" | "autre"; category: string; title: string; sub: string }[] = [
  { code: "immeuble_petit", category: "PETIT COLLECTIF (≤ R+4)", title: "Immeuble jusqu'à R+4", sub: "Bi-familial et plus, max R+4 — au moins 2 logements." },
  { code: "immeuble_grand", category: "COLLECTIF R+5 ET PLUS",   title: "Immeuble R+5 et plus", sub: "Collectif à partir de R+5, moyen / haut standing, bureaux." },
  { code: "villa",          category: "RÉSIDENTIEL",             title: "Villas",                sub: "En bande, jumelée ou isolée — version standard ou de standing." },
  { code: "gr",             category: "OPÉRATION GROUPÉE",       title: "Groupement résidentiel", sub: "Plusieurs bâtiments sur un même projet (résidence, complexe)." },
  { code: "lot",            category: "FONCIER",                 title: "Lotissement",           sub: "Découpage / morcellement / viabilisation (loi 25-90)." },
  { code: "epig",           category: "ÉQUIPEMENT",              title: "Équipement privé",      sub: "Hôtel, école, mosquée, clinique, hangar, usine, etc." },
  { code: "amg",            category: "TRANSFORMATION",          title: "Aménagement",           sub: "Réagencement d'un local existant / changement d'affectation." },
  { code: "expertise",      category: "EXPERTISE & QUALIFICATION", title: "Je ne sais pas — Expertise", sub: "Vous hésitez sur la typologie ? Une mission d'expertise CITURBAREA qualifie votre projet (programme, gabarit, faisabilité). Mission facturable, livrable = rapport." },
  { code: "autre",          category: "AUTRE",                   title: "Autre — à préciser",    sub: "Votre projet ne correspond à aucune des familles ci-dessus." },
];


const NATURE_PROJET_OPTIONS: { family: string; group: string; options: { value: string; label: string }[] }[] = [
  {
    family: "immeuble_petit",
    group: "Petit immeuble collectif (≤ R+4, ≥ 2 logements)",
    options: [
      { value: "immeuble_rdc_bifam",  label: "Immeuble RDC bi-familial (2 logements de plain-pied)" },
      { value: "immeuble_r1",         label: "Immeuble R+1 (2 à 4 logements)" },
      { value: "immeuble_r2",         label: "Immeuble R+2 (3 à 6 logements)" },
      { value: "immeuble_r3",         label: "Immeuble R+3 (4 à 8 logements)" },
      { value: "immeuble_r4",         label: "Immeuble R+4 (5 à 10 logements)" },
      { value: "immeuble_social_r4",  label: "Habitat social conventionné — petit collectif (≤ R+4)" },
    ],
  },
  {
    family: "immeuble_grand",
    group: "Immeuble collectif / bureaux R+5 et plus",
    options: [
      { value: "immeuble_r5",        label: "Immeuble R+5" },
      { value: "immeuble_r6",        label: "Immeuble R+6" },
      { value: "immeuble_r7",        label: "Immeuble R+7" },
      { value: "immeuble_r8plus",    label: "Immeuble R+8 et plus" },
      { value: "immeuble_moyen",     label: "Immeuble collectif moyen standing (R+5+)" },
      { value: "immeuble_haut",      label: "Immeuble collectif haut standing (R+5+)" },
      { value: "bureaux_r5plus",     label: "Immeuble de bureaux R+5+" },
    ],
  },
  {
    family: "villa",
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
    family: "gr",
    group: "Groupement résidentiel",
    options: [
      { value: "gr_residence",       label: "Résidence (plusieurs immeubles)" },
      { value: "gr_complexe",        label: "Complexe résidentiel mixte" },
      { value: "gr_villas",          label: "Lotissement de villas" },
    ],
  },
  {
    family: "lot",
    group: "Lotissement / morcellement",
    options: [
      { value: "lot_residentiel",    label: "Lotissement résidentiel" },
      { value: "lot_industriel",     label: "Lotissement industriel" },
      { value: "lot_morcellement",   label: "Morcellement (loi 25-90)" },
    ],
  },
  {
    family: "epig",
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
    family: "amg",
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
    family: "autre",
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

const HERO_POINT_IDS = ["bareme", "phases", "devis", "contract"] as const;

function P2HomeInner() {
  const t = useT();
  const auth = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<"flow" | "success">("flow");
  const [phase, setPhase] = useState<Phase>("identity");

  // Sections du barème CNOA — construites depuis l'i18n pour assurer FR/AR/EN.
  const SECTIONS: { id: P2Section; label: string; title: string; sub: string; bullets: string[]; micro: string }[] = [
    "IMM", "GR", "LOT", "EPIG", "AMG",
  ].map(id => ({
    id: id as P2Section,
    label: t(`portes.p2.sections.${id}.label`),
    title: t(`portes.p2.sections.${id}.title`),
    sub: t(`portes.p2.sections.${id}.sub`),
    bullets: [
      t(`portes.p2.sections.${id}.b1`),
      t(`portes.p2.sections.${id}.b2`),
      t(`portes.p2.sections.${id}.b3`),
    ],
    micro: t(`portes.p2.sections.${id}.micro`),
  }));

  // Points du hero (barème / phases / devis / contrat) — i18n.
  const HERO_POINTS: { t: string; d: string }[] = HERO_POINT_IDS.map(id => ({
    t: t(`portes.p2.hero.point.${id}.t`),
    d: t(`portes.p2.hero.point.${id}.d`),
  }));
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
      .catch(() => setError(t("portes.p2.category.loading")));
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
      if (!surfaceTerrainHa || +surfaceTerrainHa <= 0) { setError(t("portes.p2.measures.err_lot")); return; }
      // LOT n'a pas de phase « mode de suivi » → on enchaîne directement
      // sur la création de compte + dossier ; le devis est livré ensuite.
      submitIntake();
      return;
    }
    if (isAMG) {
      if (!surfacePlancher || +surfacePlancher <= 0) { setError(t("portes.p2.measures.err_amg")); return; }
      setPhase("follow");
      return;
    }
    // IMM / GR / EPIG — plancher calculé à partir des caractéristiques
    if (!terrainM2 || +terrainM2 <= 0) { setError(t("portes.p2.measures.err_terrain")); return; }
    if (computedSPPerBuilding == null) { setError(t("portes.p2.measures.err_rich")); return; }
    if (section === "GR" && (!nbBatiments || +nbBatiments < 1)) { setError(t("portes.p2.measures.err_nb")); return; }
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
      if (!data.ok) throw new Error(data.error || t("portes.p2.identity.err_calc"));
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
    const sectionLabel = section ? t(`portes.p2.sections.${section}.label`) : "";
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
        // Mission d'expertise & qualification (rapport facturable) — pas de devis
        // CNOA classique, la facturation suit le barème expertise CITURBAREA.
        expertiseRequested: natureCode === "expertise_qualif" ? true : undefined,
        quoteSnapshot: quote,
      },
    };
  };

  // Famille déduite du code nature pour afficher les sous-champs adéquats.
  // (Habitat individuel est volontairement exclu — il relève de la Porte 1.)
  const natureFamily: "immeuble_petit" | "immeuble_grand" | "villa" | "gr" | "lot" | "epig" | "amg" | "expertise" | "autre" | "" = (() => {
    if (!natureCode) return "";
    if (natureCode === "autre") return "autre";
    if (natureCode === "expertise_qualif") return "expertise";
    // Petits immeubles ≤ R+4 (et habitat social petit collectif)
    if (
      natureCode === "immeuble_rdc_bifam" ||
      natureCode === "immeuble_r1" ||
      natureCode === "immeuble_r2" ||
      natureCode === "immeuble_r3" ||
      natureCode === "immeuble_r4" ||
      natureCode === "immeuble_social_r4"
    ) return "immeuble_petit";
    // Grands immeubles R+5 et plus
    if (natureCode.startsWith("immeuble_") || natureCode === "bureaux_r5plus") return "immeuble_grand";
    if (natureCode.startsWith("villa_")) return "villa";
    if (natureCode.startsWith("gr_")) return "gr";
    if (natureCode.startsWith("lot_")) return "lot";
    if (natureCode.startsWith("epig_")) return "epig";
    if (natureCode.startsWith("amg_")) return "amg";
    return "";
  })();

  // Le niveau R+ est-il déjà inscrit dans le label de la nature ?
  // (ex. "Immeuble R+2", "Immeuble R+5"). Dans ce cas on ne le redemande pas.
  const rLevelImpliedByNature = /(_r\d|_rdc)/.test(natureCode);

  // Quels sous-champs faut-il afficher en étape 1 ?
  // (Expertise & qualification : aucun champ technique — c'est nous qui qualifions.)
  const isExpertise = natureFamily === "expertise";
  const askRLevel       = !isExpertise && (
                          natureFamily === "villa" || natureFamily === "gr"
                          || (natureFamily === "immeuble_petit" && !rLevelImpliedByNature)
                          || (natureFamily === "immeuble_grand" && !rLevelImpliedByNature));
  const askNbBatiments  = !isExpertise && natureFamily === "gr";
  const askTerrainM2    = !isExpertise && ["immeuble_petit", "immeuble_grand", "villa", "gr", "epig"].includes(natureFamily);
  const askTerrainHa    = !isExpertise && natureFamily === "lot";
  const askPlancher     = !isExpertise && (natureFamily === "amg" || natureFamily === "epig");

  // Validation de la phase identité (étape 1 — qui êtes-vous).
  const validateIdentity = (): string | null => {
    if (!identity.clientNom || !identity.clientTel) return t("portes.p2.identity.err_name_phone");
    if (!identity.region || !identity.province || !identity.commune) return t("portes.p2.identity.err_loc");
    if (moaType === "morale" && (!identity.raisonSociale || !identity.representant)) {
      return t("portes.p2.identity.err_moral");
    }
    if (!natureCode) return t("portes.p2.identity.err_nature");
    if (natureCode === "autre" && !natureAutre.trim()) {
      return t("portes.p2.identity.err_autre");
    }
    // Sous-champs contextuels (n'apparaissent que pour certaines familles).
    if (askRLevel && !rLevel) return t("portes.p2.identity.err_rlevel");
    if (askNbBatiments && (!nbBatiments || +nbBatiments < 1)) return t("portes.p2.identity.err_nb_bat");
    if (askTerrainHa && (!surfaceTerrainHa || +surfaceTerrainHa <= 0)) return t("portes.p2.identity.err_ha");
    if (askPlancher && (!surfacePlancher || +surfacePlancher <= 0)) return t("portes.p2.identity.err_plancher");
    if (!ownerStatus) return t("portes.p2.identity.err_owner");
    if (!timeline) return t("portes.p2.identity.err_timeline");
    return null;
  };

  // Étape 1 → 2 : on a identifié le client, on passe au projet.
  const identityContinue = () => {
    setError("");
    const err = validateIdentity();
    if (err) { setError(err); return; }
    // Mission d'expertise : pas d'étapes projet (section/catégorie/mesures) —
    // le rapport facturable est créé directement à partir de l'identité.
    if (isExpertise) {
      submitIntake();
      return;
    }
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
      // (Pas de devis CNOA pour une mission d'expertise — la facturation se
      // fait au forfait expertise dans la Porte 5.)
      if (!quote && !isExpertise) {
        try { await computeQuote(); } catch { /* devis livré plus tard */ }
      }
      const payload = buildIntakePayload(auth.email);
      const res = await fetch(`${apiBase()}/p2/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || t("portes.p2.identity.err_calc"));
      if (data.access_token) {
        try { localStorage.setItem("citurbarea.token", data.access_token); } catch {}
      }
      setDossierId(data.dossierId);
      // Mission d'expertise : on quitte la P2 et on bascule sur la Porte 5
      // (rapports & expertises) avec le dossier en référence, pour scoper le
      // rapport et déclencher le devis du forfait expertise.
      if (isExpertise) {
        const ref = data.dossierId ? `?fromP2=${encodeURIComponent(data.dossierId)}&expertise=1` : "?expertise=1";
        navigate(`/p5${ref}`, { replace: true });
        return;
      }
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
          <div className="container-max cit-porte-p2-narrow">
            <div className="lux-card" style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>{isExpertise ? t("portes.p2.recap.expertise_emoji") : t("portes.p2.recap.ok_emoji")}</div>
              <h2 style={{ fontSize: 26, margin: "0 0 12px" }}>
                {isExpertise ? t("portes.p2.recap.expertise_title") : t("portes.p2.recap.ok_title")}
              </h2>
              <p
                className="muted"
                style={{ fontSize: 14.5, lineHeight: 1.7, margin: "0 0 18px" }}
                dangerouslySetInnerHTML={{
                  __html: (isExpertise
                    ? t("portes.p2.recap.expertise_body")
                    : t("portes.p2.recap.ok_body", { section: SECTIONS.find(s => s.id === section)?.label ?? "" })
                  ) + `<br/><span style="font-size:12px">${t("portes.p2.recap.ref")} ${(dossierId ?? "").slice(0, 12)}…</span>`,
                }}
              />
            </div>

            {/* Devis officiel — livré uniquement avec un dossier identifié.
                Masqué pour les missions d'expertise (forfait notifié séparément). */}
            {!isExpertise && quote && (
              <div className="lux-card" style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "rgba(201,162,39,0.95)", fontSize: 13, fontWeight: 800 }}>{quote.meta.sectionLabel}</div>
                    <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{quote.meta.categoryLabel || t("portes.p2.recap.specific_pricing")}</div>
                  </div>
                  <div style={{ background: "rgba(201,162,39,0.10)", border: "1px solid rgba(201,162,39,0.32)", borderRadius: 14, padding: "14px 20px", textAlign: "right" }}>
                    {quote.honoraires.totalTTC != null && (
                      <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{t("portes.p2.recap.dossier_devis")}</div>
                    )}
                    <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 32, fontWeight: 800, color: "#0B1B3A", lineHeight: 1, marginTop: 3 }}>
                      {quote.honoraires.totalTTC != null ? fmtMAD(quote.honoraires.totalTTC) : t("portes.p2.recap.to_quote")}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 5 }}>{t("portes.p2.recap.ttc_label")}</div>
                  </div>
                </div>
                <div className="gold-divider" style={{ margin: "18px 0 6px" }} />
                {quote.base.coutTravauxEstime != null && (
                  <div className="qrow"><span className="k">{t("portes.p2.recap.coast_estim")}</span><span className="v">{fmtMAD(quote.base.coutTravauxEstime)}</span></div>
                )}
                {quote.honoraires.totalHT != null && (
                  <>
                    <div className="qrow"><span className="k">{t("portes.p2.recap.honoraires_5")}</span><span className="v">{fmtMAD(quote.honoraires.totalHT)}</span></div>
                    <div className="qrow"><span className="k">{t("portes.p2.recap.tva_20")}</span><span className="v">{fmtMAD(quote.honoraires.tva)}</span></div>
                  </>
                )}
                {quote.honoraires.breakdown.phaseA_esquisseAutorisation != null && (
                  <>
                    <div className="qrow" style={{ marginTop: 8 }}><span className="k">{t("portes.p2.recap.phaseA")}</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseA_esquisseAutorisation)}</span></div>
                    <div className="qrow"><span className="k">{t("portes.p2.recap.phaseB")}</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseB_dceCps)}</span></div>
                    <div className="qrow"><span className="k">{quote.meta.followMode === "PHOTOS" ? t("portes.p2.recap.phaseC_photos") : t("portes.p2.recap.phaseC_phys")}</span><span className="v">{fmtMAD(quote.honoraires.breakdown.phaseC_suivi)}</span></div>
                  </>
                )}
                <div className="mini-note" style={{ marginTop: 16 }}><strong>{t("portes.p2.recap.visa_label")}</strong> {quote.visaCroa.note}</div>
                <div className="mini-note" style={{ marginTop: 10 }}><strong>{t("portes.p2.recap.decennale_label")}</strong> {quote.decennale.note}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a className="btn btn-gold" href={`/payment/start?dossier=${dossierId}`}>{t("portes.p2.recap.pay_now")}</a>
              <a className="btn btn-dark" href="/portal">{t("portes.p2.recap.my_dossiers")}</a>
              <a className="btn" href="/" style={{ background: "transparent", border: "1px solid rgba(11,27,58,0.18)", color: "#0B1B3A" }}>{t("portes.p2.recap.home")}</a>
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
            <span>{t("portes.p2.hero.kicker.promo")}</span><span style={{ opacity: 0.5 }}>•</span>
            <span>{t("portes.p2.hero.kicker.bareme")}</span><span style={{ opacity: 0.5 }}>•</span>
            <span>{t("portes.p2.hero.kicker.devis")}</span>
          </div>
          <div className="grid-2" style={{ alignItems: "center" }}>
            <div>
              <h1>{t("p2.home_title")} — {t("p2.cnoa_visa")}</h1>
              <p className="sub" style={{ fontSize: 18, marginBottom: 26 }}>
                {t("p2.home_subtitle")}
              </p>
              <button className="btn btn-gold" onClick={() => {
                const el = document.getElementById("p2-identity");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                {t("portes.p2.hero.cta")} →
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
                  {t("portes.p2.hero.foot")}
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
          <div className="eyebrow">{t("portes.p2.section.step")}</div>
          <h2 className="section-title">{t("wizard.choose_section")}</h2>
          <p className="sub" style={{ marginBottom: 34 }}>
            {t("portes.p2.section.sub")}
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
                  {section === s.id ? t("portes.p2.section.selected") : t("portes.p2.section.select")}
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
            <div className="eyebrow">{t("portes.p2.category.step")}</div>
            <h2 className="section-title">{t("wizard.choose_category")}</h2>
            <p
              className="sub"
              style={{ marginBottom: 34 }}
              dangerouslySetInnerHTML={{
                __html: t("portes.p2.category.sub", {
                  section: `<strong style="color:#0B1B3A">${SECTIONS.find(s => s.id === section)?.label ?? ""}</strong>`,
                }),
              }}
            />
            <div className="grid-3">
              {categories.map(c => (
                <div key={c.code} className={"price-card" + (categoryCode === c.code ? " sel" : "")} onClick={() => pickCategory(c.code)}>
                  <div className="lux-title" style={{ fontSize: 17 }}>{c.label}</div>
                  <div style={{ margin: "14px 0 4px" }}>
                    <div className="muted" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{t("portes.p2.category.from")}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
                      <span style={{ fontSize: 28, fontWeight: 900, color: "#0B1B3A" }}>{fmtMAD(c.costPerM2)}</span>
                      <span className="muted" style={{ fontWeight: 800, fontSize: 13 }}>{t("portes.p2.category.per_m2")}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {c.notes && <div className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>⚠ {c.notes}</div>}
                    {!c.photoOptionAvailable && <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{t("portes.p2.category.warn_physical")}</div>}
                  </div>
                  <div className="btn btn-dark" style={{ width: "100%", marginTop: 18 }}>
                    {categoryCode === c.code ? t("portes.p2.section.selected") : t("portes.p2.section.select")}
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="muted">{t("portes.p2.category.loading")}</div>}
            </div>
          </div>
        </section>
      )}

      {/* BLOC 3 — MESURES */}
      {reached("measures") && (
        <section className="section" id="p2-measures" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">{isLOT ? t("portes.p2.measures.step_lot") : t("portes.p2.measures.step_norm")}</div>
            <h2 className="section-title">{t("wizard.dimensions")}</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              {isLOT
                ? t("portes.p2.measures.sub_lot")
                : isAMG
                ? t("portes.p2.measures.sub_amg")
                : t("portes.p2.measures.sub_rich")}
            </p>
            {isLOT ? (
              <div className="cit-porte-p2-mid">
                <div className="field" style={{ marginBottom: 16 }}>
                  <label className="label">{t("portes.p2.measures.lot_label")}</label>
                  <input className="control" type="number" step="0.1" value={surfaceTerrainHa}
                    onChange={e => setSurfaceTerrainHa(e.target.value)} placeholder="2.5" />
                </div>
                <div className="mini-note">
                  {t("portes.p2.measures.lot_note")}
                </div>
              </div>
            ) : isAMG ? (
              <div className="cit-porte-p2-mid">
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="label">{t("portes.p2.measures.amg_label")}</label>
                  <input className="control" type="number" value={surfacePlancher}
                    onChange={e => setSurfacePlancher(e.target.value)} placeholder="120" />
                </div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                  {t("portes.p2.measures.amg_help")}
                </div>
              </div>
            ) : (
              <>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">{t("portes.p2.measures.terrain_label")}</label>
                    <input className="control" type="number" value={terrainM2}
                      onChange={e => setTerrainM2(e.target.value)} placeholder="800" />
                  </div>
                  <div className="field">
                    <label className="label">{t("portes.p2.measures.rlevel_label")}</label>
                    <select className="control" value={rLevel} onChange={e => setRLevel(e.target.value)}>
                      <option value="R0">{t("portes.p2.measures.r0")}</option>
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
                    <label className="label">{t("portes.p2.measures.facades_label")}</label>
                    <select className="control" value={facades} onChange={e => setFacades(e.target.value)}>
                      <option value="1">{t("portes.p2.measures.fac.1")}</option>
                      <option value="2">{t("portes.p2.measures.fac.2")}</option>
                      <option value="3">{t("portes.p2.measures.fac.3")}</option>
                      <option value="4">{t("portes.p2.measures.fac.4")}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">{t("portes.p2.measures.basement_label")}</label>
                    <select className="control" value={basement ? "yes" : "no"}
                      onChange={e => setBasement(e.target.value === "yes")}>
                      <option value="no">{t("portes.p2.measures.basement_no")}</option>
                      <option value="yes">{t("portes.p2.measures.basement_yes")}</option>
                    </select>
                  </div>
                  {section === "IMM" && (
                    <div className="field">
                      <label className="label">{t("portes.p2.measures.variant_label")}</label>
                      <select className="control" value={immVariant} onChange={e => setImmVariant(e.target.value)}>
                        <option value="standard">{t("portes.p2.measures.variant_std")}</option>
                        <option value="maison_ville">{t("portes.p2.measures.variant_mdv")}</option>
                        <option value="rdc_commercial">{t("portes.p2.measures.variant_rdc")}</option>
                      </select>
                    </div>
                  )}
                  {section === "GR" && (
                    <div className="field">
                      <label className="label">{t("portes.p2.measures.nb_label")}</label>
                      <input className="control" type="number" min={1} value={nbBatiments}
                        onChange={e => setNbBatiments(e.target.value)} placeholder="3" />
                    </div>
                  )}
                </div>
                {computedSPPerBuilding != null && (
                  <div className="mini-note" style={{ marginTop: 22, background: "rgba(201,162,39,0.10)", borderColor: "rgba(201,162,39,0.40)" }}>
                    <div>
                      <strong style={{ color: "#0B1B3A" }}>{t("portes.p2.measures.plancher_label")}</strong>{" "}
                      <span style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 22, fontWeight: 800, color: "#0B1B3A" }}>
                        {fmtInt(computedSPPerBuilding)} m²
                      </span>
                      {section === "GR" && computedSPTotal != null && computedSPTotal !== computedSPPerBuilding && (
                        <> {t("portes.p2.measures.per_building")} · <strong>{t("portes.p2.measures.total")}</strong> {fmtInt(computedSPTotal)} m²</>
                      )}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "rgba(11,27,58,0.65)", fontStyle: "italic" }}>
                      {t("portes.p2.measures.estim_note")}
                    </div>
                  </div>
                )}
              </>
            )}
            {error && phase === "measures" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" disabled={busy} onClick={measuresContinue}>
                {busy
                  ? t("portes.p2.btn.sending")
                  : isLOT
                    ? (auth.isAuthed ? t("portes.p2.btn.create_lot_auth") : t("portes.p2.btn.create_lot_anon"))
                    : t("portes.p2.btn.continue")}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* BLOC 5 — MODE DE SUIVI (dernière étape avant création de compte + dossier) */}
      {reached("follow") && !isLOT && (
        <section className="section" id="p2-follow" style={{ borderTop: "1px solid rgba(201,162,39,0.22)" }}>
          <div className="container-max">
            <div className="eyebrow">{t("portes.p2.follow.step")}</div>
            <h2 className="section-title">{t("wizard.follow_mode")}</h2>
            <p className="sub" style={{ marginBottom: 30 }}>
              {t("portes.p2.follow.sub")}
            </p>
            <div className="grid-2 cit-porte-p2-narrow">
              <div className={"price-card" + (followMode === "ON_SITE" ? " sel" : "")} onClick={() => setFollowMode("ON_SITE")}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📍</div>
                <div className="lux-title" style={{ fontSize: 17 }}>{t("portes.p2.follow.physique")}</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 12px", flex: 1 }}>
                  {t("portes.p2.follow.physique_d")}
                </div>
                <div style={{ fontWeight: 900, color: "#0B1B3A" }}>{t("portes.p2.follow.physique_pct")}</div>
              </div>
              {(() => {
                const photoAvail = selectedCategory?.photoOptionAvailable !== false;
                return (
                  <div className={"price-card" + (followMode === "PHOTOS" ? " sel" : "") + (photoAvail ? "" : " disabled")}
                    onClick={() => photoAvail && setFollowMode("PHOTOS")}>
                    <div style={{ fontSize: 30, marginBottom: 10 }}>📷</div>
                    <div className="lux-title" style={{ fontSize: 17 }}>{t("portes.p2.follow.photos")}</div>
                    <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 12px", flex: 1 }}>
                      {t("portes.p2.follow.photos_d")}
                    </div>
                    <div style={{ fontWeight: 900, color: photoAvail ? "#0B1B3A" : "rgba(11,27,58,0.5)" }}>{t("portes.p2.follow.photos_pct")}</div>
                    {!photoAvail && <div style={{ color: "#b91c1c", fontSize: 11.5, marginTop: 8 }}>{t("portes.p2.follow.photos_na")}</div>}
                  </div>
                );
              })()}
            </div>
            {error && phase === "follow" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 26 }}>
              <button className="btn btn-gold" disabled={busy} onClick={submitIntake}>
                {busy ? t("portes.p2.btn.sending") : (auth.isAuthed ? t("portes.p2.btn.create_lot_auth") : t("portes.p2.btn.create_lot_anon"))}
              </button>
            </div>
            <div className="muted cit-porte-p2-help" style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.6 }}>
              {t("portes.p2.follow.foot")}
            </div>
          </div>
        </section>
      )}

      {/* BLOC 1 IDENTITÉ — première étape (« qui êtes-vous »), avant le projet */}
      {reached("identity") && (
        <section className="section" id="p2-identity" style={{ order: -1 }}>
          <div className="container-max">
            <div className="eyebrow">{t("portes.p2.identity.step")}</div>
            <h2 className="section-title">{t("p5.who_are_you")}</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              {t("portes.p2.identity.sub")}
            </p>

            {/* 1) Type de maître d'ouvrage — comme P1 */}
            <div className="pill" style={{ marginBottom: 14 }}>{t("portes.p2.identity.moa_title")} <span className="req">*</span></div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              {[
                { id: "physique", label: t("portes.p2.identity.moa_phys"),  sub: t("portes.p2.identity.moa_phys_sub") },
                { id: "morale",   label: t("portes.p2.identity.moa_moral"), sub: t("portes.p2.identity.moa_moral_sub") },
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
            <div className="pill" style={{ marginBottom: 14 }}>{t("portes.p2.identity.contact")} <span className="req">*</span></div>
            <div className="form-grid">
              <div className="field">
                <label className="label">{t("portes.p2.identity.fullname")} <span className="req">*</span></label>
                <input className="control" value={identity.clientNom} onChange={f("clientNom")} placeholder={t("portes.p2.identity.fullname_ph")} />
              </div>
              <div className="field">
                <label className="label">{t("portes.p2.identity.phone")} <span className="req">*</span></label>
                <input className="control" value={identity.clientTel} onChange={f("clientTel")} placeholder={t("portes.p2.identity.phone_ph")} />
              </div>
              <div className="field">
                <label className="label">{t("portes.p2.identity.email")}</label>
                <input className="control" value={identity.clientEmail} onChange={f("clientEmail")} placeholder={t("portes.p2.identity.email_ph")} />
              </div>
            </div>

            {/* 3) Société — visible UNIQUEMENT si personne morale */}
            {moaType === "morale" && (
              <>
                <div className="blk-title">3) {t("portes.p2.identity.company")}</div>
                <div className="form-grid">
                  <div className="field">
                    <label className="label">{t("portes.p2.identity.raison")} <span className="req">*</span></label>
                    <input className="control" value={identity.raisonSociale} onChange={f("raisonSociale")} placeholder={t("portes.p2.identity.raison_ph")} />
                  </div>
                  <div className="field">
                    <label className="label">{t("portes.p2.identity.repr")} <span className="req">*</span></label>
                    <input className="control" value={identity.representant} onChange={f("representant")} placeholder={t("portes.p2.identity.repr_ph")} />
                  </div>
                  <div className="field">
                    <label className="label">{t("portes.p2.identity.rc")}</label>
                    <input className="control" value={identity.rc} onChange={f("rc")} placeholder="12345" />
                  </div>
                  <div className="field">
                    <label className="label">{t("portes.p2.identity.ice")}</label>
                    <input className="control" value={identity.ice} onChange={f("ice")} placeholder="000000000000000" />
                  </div>
                </div>
              </>
            )}

            {/* 4) Localisation — sélection officielle HCP (14 régions / 77 prov / 1505 communes) */}
            <div className="blk-title">{moaType === "morale" ? "4" : "3"}) {t("portes.p2.identity.location")}</div>
            <div className="muted cit-porte-p2-help" style={{ fontSize: 12.5, marginBottom: 10 }}>
              {t("portes.p2.identity.location_sub")}
            </div>
            <AdminLocationSelect
              required
              value={{ region: identity.region, province: identity.province, commune: identity.commune }}
              onChange={({ region, province, commune }) => {
                setIdentity(prev => ({
                  ...prev,
                  region: region ?? "",
                  province: province ?? "",
                  commune: commune ?? "",
                }));
              }}
            />
            <div className="form-grid" style={{ marginTop: 14 }}>
              {/* Nature du projet — cartes premium par famille (style P1) */}
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label className="label" style={{ marginBottom: 8 }}>{t("portes.p2.identity.nature")} <span className="req">*</span></label>
                <div style={{
                  background: "rgba(201,162,39,0.07)",
                  border: "1px solid rgba(201,162,39,0.22)",
                  borderRadius: 10, padding: "10px 14px",
                  fontSize: 12.5, color: "rgba(11,27,58,0.8)",
                  lineHeight: 1.6, marginBottom: 14,
                }}>
                  <strong>{t("portes.p2.identity.nature_note")}</strong>
                  {" "}<a href="/p1" style={{ color: "#C9A227", fontWeight: 600, textDecoration: "underline" }}>{t("portes.p2.identity.nature_p1")}</a>
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 16, marginBottom: 14,
                }}>
                  {NATURE_FAMILIES.map(fam => {
                    const sel = natureFamily === fam.code;
                    return (
                      <button
                        key={fam.code}
                        type="button"
                        onClick={() => {
                          if (fam.code === "autre") {
                            setNatureCode("autre");
                            setIdentity(prev => ({ ...prev, natureProjet: "" }));
                          } else if (fam.code === "expertise") {
                            // Mission d'expertise & qualification — pas de sous-type technique :
                            // un dossier est créé, l'équipe qualifie ensuite le projet (rapport facturable).
                            setNatureCode("expertise_qualif");
                            setIdentity(prev => ({ ...prev, natureProjet: "Mission d'expertise & qualification (rapport)" }));
                            setNatureAutre("");
                          } else {
                            // Pré-sélectionne la première option de la famille pour aider le visiteur.
                            const grp = NATURE_PROJET_OPTIONS.find(g => g.family === fam.code);
                            const first = grp?.options[0];
                            if (first) {
                              setNatureCode(first.value);
                              setIdentity(prev => ({ ...prev, natureProjet: first.label }));
                            }
                            setNatureAutre("");
                          }
                        }}
                        style={{
                          position: "relative", textAlign: "left", cursor: "pointer",
                          padding: 22, borderRadius: 16,
                          background: sel
                            ? "linear-gradient(135deg, rgba(201,162,39,0.15), rgba(232,216,166,0.15))"
                            : "rgba(255,255,255,0.95)",
                          border: sel ? "2px solid #C9A227" : "1px solid rgba(201,162,39,0.25)",
                          transition: "all 0.25s",
                          transform: sel ? "translateY(-3px)" : "none",
                          boxShadow: sel ? "0 8px 22px rgba(201,162,39,0.25)" : "0 3px 10px rgba(11,27,58,0.06)",
                          fontFamily: "inherit",
                        }}
                      >
                        {sel && (
                          <div style={{
                            position: "absolute", top: 12, right: 12,
                            width: 28, height: 28, borderRadius: "50%",
                            background: "linear-gradient(135deg, #C9A227, #E6C75B)",
                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                          }}>✓</div>
                        )}
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: "#C9A227", letterSpacing: "0.06em", marginBottom: 8 }}>
                          {fam.category}
                        </div>
                        <div style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 19, fontWeight: 700, color: "#0B1B3A", margin: "0 0 8px" }}>
                          {fam.title}
                        </div>
                        <div style={{ fontSize: 12.5, color: "rgba(11,27,58,0.72)", lineHeight: 1.55 }}>
                          {fam.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sous-dropdown filtrée par famille — apparaît dès qu'une carte est sélectionnée */}
                {natureFamily === "expertise" && (
                  <div style={{
                    marginTop: 4,
                    background: "linear-gradient(135deg, rgba(11,27,58,0.06), rgba(201,162,39,0.10))",
                    border: "1px solid rgba(201,162,39,0.35)",
                    borderLeft: "4px solid #C9A227",
                    borderRadius: 12, padding: "16px 20px",
                  }}>
                    <div style={{ fontWeight: 700, color: "#0B1B3A", fontSize: 14.5, marginBottom: 6 }}>
                      {t("portes.p2.identity.expertise_title")}
                    </div>
                    <div
                      style={{ fontSize: 13, color: "rgba(11,27,58,0.78)", lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: t("portes.p2.identity.expertise_body") }}
                    />
                  </div>
                )}
                {natureFamily && natureFamily !== "autre" && natureFamily !== "expertise" && (() => {
                  const grp = NATURE_PROJET_OPTIONS.find(g => g.family === natureFamily);
                  if (!grp) return null;
                  return (
                    <div style={{ marginTop: 4 }}>
                      <label className="label" style={{ marginBottom: 8 }}>{t("portes.p2.identity.precise_subtype")} <span className="req">*</span></label>
                      <select
                        className="control"
                        value={natureCode}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNatureCode(v);
                          const o = grp.options.find(x => x.value === v);
                          if (o) setIdentity(prev => ({ ...prev, natureProjet: o.label }));
                        }}
                      >
                        {grp.options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
              </div>
              {natureCode === "autre" && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="label">{t("portes.p2.identity.precise_autre")} <span className="req">*</span></label>
                  <input
                    className="control"
                    value={natureAutre}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNatureAutre(v);
                      setIdentity(prev => ({ ...prev, natureProjet: v ? `Autre : ${v}` : "" }));
                    }}
                    placeholder={t("portes.p2.identity.precise_autre_ph")}
                  />
                </div>
              )}

              {/* Sous-champs contextuels — apparaissent selon le type de projet choisi */}
              {askRLevel && (
                <div className="field">
                  <label className="label">{t("portes.p2.identity.r_level")} <span className="req">*</span></label>
                  <select className="control" value={rLevel} onChange={(e) => setRLevel(e.target.value)}>
                    <option value="">{t("portes.p2.identity.r_select")}</option>
                    <option value="R0">{t("portes.p2.identity.r_rdc")}</option>
                    <option value="R1">R+1</option>
                    <option value="R2">R+2</option>
                    <option value="R3">R+3</option>
                    <option value="R4">R+4</option>
                    <option value="R5">R+5</option>
                    <option value="R6">R+6</option>
                    <option value="R7">R+7</option>
                    <option value="R8">{t("portes.p2.identity.r_r8plus")}</option>
                  </select>
                </div>
              )}
              {askNbBatiments && (
                <div className="field">
                  <label className="label">{t("portes.p2.identity.nb_bat")} <span className="req">*</span></label>
                  <input className="control" type="number" min={1} step={1}
                    value={nbBatiments} onChange={(e) => setNbBatiments(e.target.value)}
                    placeholder={t("portes.p2.identity.nb_bat_ph")} />
                </div>
              )}
              {askTerrainM2 && (
                <div className="field">
                  <label className="label">{t("portes.p2.measures.terrain_label")}</label>
                  <input className="control" type="number" min={0} step={1}
                    value={terrainM2} onChange={(e) => setTerrainM2(e.target.value)}
                    placeholder={t("portes.p2.identity.terrain_m2_ph")} />
                </div>
              )}
              {askTerrainHa && (
                <div className="field">
                  <label className="label">{t("portes.p2.identity.terrain_ha")} <span className="req">*</span></label>
                  <input className="control" type="number" min={0} step="0.01"
                    value={surfaceTerrainHa} onChange={(e) => setSurfaceTerrainHa(e.target.value)}
                    placeholder={t("portes.p2.identity.terrain_ha_ph")} />
                </div>
              )}
              {askPlancher && (
                <div className="field">
                  <label className="label">{t("portes.p2.identity.plancher")} <span className="req">*</span></label>
                  <input className="control" type="number" min={0} step={1}
                    value={surfacePlancher} onChange={(e) => setSurfacePlancher(e.target.value)}
                    placeholder={t("portes.p2.identity.plancher_ph")} />
                </div>
              )}
              {natureCode && natureCode !== "autre" && (askRLevel || askNbBatiments || askTerrainM2 || askTerrainHa || askPlancher) && (
                <div className="muted" style={{ gridColumn: "1 / -1", fontSize: 11.5, fontStyle: "italic", marginTop: 6 }}>
                  {t("portes.p2.identity.auto_calc")}
                </div>
              )}
            </div>

            {/* 5) Caractéristiques projet — standing, propriétaire, délai (cf. P1) */}
            <div className="blk-title">{moaType === "morale" ? "5" : "4"}) {t("portes.p2.identity.proj_char")}</div>
            <div className="form-grid">
              <div className="field">
                <label className="label">{t("portes.p2.identity.standing")} <span className="req">*</span></label>
                <select className="control" value={standing} onChange={(e) => setStanding(e.target.value as any)}>
                  <option value="economique">{t("portes.p2.identity.standing.eco")}</option>
                  <option value="moyen">{t("portes.p2.identity.standing.moy")}</option>
                  <option value="haut">{t("portes.p2.identity.standing.haut")}</option>
                  <option value="luxe">{t("portes.p2.identity.standing.luxe")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("portes.p2.identity.owner")} <span className="req">*</span></label>
                <select className="control" value={ownerStatus} onChange={(e) => setOwnerStatus(e.target.value)}>
                  <option value="">{t("portes.p2.identity.r_select")}</option>
                  <option value="proprietaire">{t("portes.p2.identity.owner.prop")}</option>
                  <option value="indivision">{t("portes.p2.identity.owner.indiv")}</option>
                  <option value="promesse">{t("portes.p2.identity.owner.promesse")}</option>
                  <option value="leasing">{t("portes.p2.identity.owner.leasing")}</option>
                  <option value="autre">{t("portes.p2.identity.owner.autre")}</option>
                </select>
              </div>
              <div className="field">
                <label className="label">{t("portes.p2.identity.timeline")} <span className="req">*</span></label>
                <select className="control" value={timeline} onChange={(e) => setTimeline(e.target.value)}>
                  <option value="">{t("portes.p2.identity.r_select")}</option>
                  <option value="0-6m">{t("portes.p2.identity.timeline.0_6m")}</option>
                  <option value="6-12m">{t("portes.p2.identity.timeline.6_12m")}</option>
                  <option value="12-24m">{t("portes.p2.identity.timeline.12_24m")}</option>
                  <option value="24m+">{t("portes.p2.identity.timeline.24m_plus")}</option>
                </select>
              </div>
            </div>

            {error && phase === "identity" && <div className="err">⚠ {error}</div>}
            <div style={{ marginTop: 28 }}>
              <button className="btn btn-gold" disabled={busy} onClick={identityContinue}>
                {busy
                  ? t("portes.p2.btn.sending")
                  : isExpertise
                    ? (auth.isAuthed ? t("portes.p2.identity.cta_expertise_auth") : t("portes.p2.identity.cta_expertise_anon"))
                    : t("portes.p2.identity.cta_continue")}
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
