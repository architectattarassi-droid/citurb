/**
 * Bas de la page d'accueil (sous le hero) : une histoire qui mène à la prise
 * de contact.
 *
 *   1. L'architecte (preuve : Ordre, cabinet, zones)
 *   2. Comment ça marche (4 étapes)
 *   3. Combien coûtera votre projet ? → /chiffrage
 *   4. Réalisations (pilotées par content/realisations.ts — vidéo de chantier tant que vide)
 *   5. Vidéos de la chaîne Cities Talk Maroc (façades, chargement au clic)
 *   6. Terrains à vendre (TerrainsAccueil, existant)
 *   7. Guides (pages /guide/<slug> réellement publiées)
 *   8. FAQ courte
 *   9. Appel à l'action final (WhatsApp / chiffrage / téléphone)
 *  10. Pied de page (coordonnées NAP + liens internes)
 *
 * Aucune donnée inventée : faits repris de seo/business.json, des pages
 * guides/villes générées par scripts/build-seo.mjs et des textes déjà en ligne.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLang, type Lang } from "../../i18n/i18n";
import { AVIS_GOOGLE_URL, CONTACT, RESEAUX, lienTel, lienWhatsApp } from "../../config/contact";
import { LecteurYoutube, VIDEOS, type Video } from "../../features/social/VideosYoutube";
import TerrainsAccueil from "../../features/terrains/TerrainsAccueil";
import { REALISATIONS, type Realisation } from "../../content/realisations";
import { evenement } from "../../lib/marketing";

// ── Données réelles du site ─────────────────────────────────────────────

/** Pages guides publiées (scripts/build-seo.mjs → GUIDES). Temps de lecture
 * calculé sur le texte de chaque page (≈ 200 mots/min). Pages en français. */
const GUIDES = [
  { slug: "prix-construction-villa-maroc", titre: "Combien coûte la construction d'une villa au Maroc en 2026 ?", resume: "Coût au m² par niveau de standing, ce qui fait varier le budget et ce qu'il n'inclut pas.", min: 2, icone: "cout" },
  { slug: "permis-de-construire-maroc", titre: "Permis de construire au Maroc : documents, étapes et délais", resume: "Documents à fournir, étapes du dépôt, délais d'instruction et taxes à prévoir.", min: 1, icone: "permis" },
  { slug: "honoraires-architecte-maroc", titre: "Combien coûte un architecte au Maroc ? Honoraires et barème", resume: "Mode de calcul (barème CNOA), ce que couvrent les honoraires, comment les estimer.", min: 1, icone: "archi" },
  { slug: "etapes-construction-maison-maroc", titre: "Construire sa maison au Maroc : les étapes de A à Z", resume: "Du terrain à la réception : architecte, permis, chantier et suivi.", min: 1, icone: "etapes" },
  { slug: "bureau-etudes-techniques-bet-maroc", titre: "Bureau d'études techniques (BET) : à quoi sert-il ?", resume: "Structure, fluides, géotechnique : son rôle à côté de l'architecte et comment le choisir.", min: 2, icone: "bet" },
  { slug: "choisir-entreprise-construction-maroc", titre: "Comment choisir une entreprise de construction au Maroc ?", resume: "Comparer les devis sur un même descriptif, vérifier les références, sécuriser le contrat.", min: 2, icone: "entreprise" },
  // Guides de seo/guides/*.json (temps de lecture ≈ 200 mots/min).
  { slug: "prix-construction-maison-maroc-m2", titre: "Prix de construction d'une maison au m² au Maroc en 2026", resume: "Prix au m² par standing et par surface, tâcheron ou entreprise, sous-sol, villes.", min: 8, icone: "cout" },
  { slug: "procedure-autorisation-construire-maroc", titre: "Autorisation de construire : étapes, commissions et délais légaux", resume: "Petits ou grands projets, guichet unique, avis de l'agence urbaine, délais fixés par les textes.", min: 10, icone: "permis" },
  { slug: "permis-habiter-certificat-conformite-maroc", titre: "Permis d'habiter et certificat de conformité : comment les obtenir ?", resume: "Différence entre les deux, dossier, délais, recours et sanctions.", min: 7, icone: "etapes" },
] as const;

/** Versions EN / AR des guides (seo/guides/*.json, champs légers seulement). */
const G_SLUG = import.meta.glob<string>("../../../seo/guides/*.json", { eager: true, import: "slug" });
const G_LANG = import.meta.glob<string | undefined>("../../../seo/guides/*.json", { eager: true, import: "lang" });
const G_GROUPE = import.meta.glob<string | undefined>("../../../seo/guides/*.json", { eager: true, import: "groupe" });
const G_H1 = import.meta.glob<string>("../../../seo/guides/*.json", { eager: true, import: "h1" });
const G_DESC = import.meta.glob<string>("../../../seo/guides/*.json", { eager: true, import: "desc" });

/** Guide FR → sa version dans la langue du lecteur (titre et résumé dans cette langue). */
function guideTraduit(slugFr: string, lang: Lang): { slug: string; titre: string; resume: string } | null {
  if (lang === "fr") return null;
  for (const f of Object.keys(G_SLUG)) {
    if (G_LANG[f] === lang && G_GROUPE[f] === slugFr) {
      const d = G_DESC[f] || "";
      return { slug: G_SLUG[f], titre: G_H1[f], resume: d.length > 120 ? d.slice(0, d.lastIndexOf(" ", 118)) + "…" : d };
    }
  }
  return null;
}

/** Pages villes publiées (scripts/build-seo.mjs → VILLE_HUBS). */
const VILLES = [
  { slug: "kenitra", nom: "Kénitra" },
  { slug: "sale", nom: "Salé" },
  { slug: "rabat", nom: "Rabat" },
  { slug: "temara", nom: "Témara" },
  { slug: "mohammedia", nom: "Mohammedia" },
  { slug: "casablanca", nom: "Casablanca" },
  { slug: "tanger", nom: "Tanger" },
] as const;

/** Vidéo de chantier réelle (début de chantier et fondations, avec l'architecte). */
const VIDEO_CHANTIER: Video = VIDEOS.chantier[1];
/** Sélection de la section vidéos (sans la vidéo de chantier, déjà montrée plus haut). */
const VIDEOS_ACCUEIL: Video[] = [VIDEOS.cout[0], VIDEOS.chantier[0], VIDEOS.terrain[1], VIDEOS.contrat[0]];

// ── Textes (FR / EN / AR) ───────────────────────────────────────────────

const TXT = {
  fr: {
    archiKicker: "Votre architecte",
    archiTitre: "Un architecte inscrit à l'Ordre, du premier croquis à la remise des clés",
    archiNom: "Yassine AT-TARASSI",
    archiRole: "Architecte DENA inscrit à l'Ordre · Doctorant en géographie urbaine (Université Ibn Tofaïl)",
    archiTexte: "Cabinet Arc Bati Architecture, basé à Kénitra. Je conçois vos plans, je constitue et dépose votre dossier d'autorisation de construire, puis je suis le chantier jusqu'à la réception. CITURBAREA est la plateforme qui structure ce travail : chiffrage, dossier, suivi.",
    preuves: ["Inscrit à l'Ordre des architectes — signature obligatoire pour toute autorisation de construire", "Cabinet à Kénitra : Bureau 6, Immeuble Meryam C, angle rue Chellah et rue Mabrek Doukkali", "Rabat-Salé-Kénitra et au-delà, en présentiel ou à distance"],
    zones: "Architecte à",
    avis: "Laisser un avis Google",
    etapesKicker: "Comment ça marche",
    etapesTitre: "4 étapes, un seul interlocuteur",
    etapes: [
      { t: "On échange sur votre projet", d: "Par WhatsApp ou téléphone : terrain, besoin, budget, délais." },
      { t: "Vous connaissez le coût", d: "Chiffrage lot par lot et vérification du terrain avant d'engager quoi que ce soit." },
      { t: "Plans et autorisation", d: "Conception, dossier complet et dépôt auprès de la commune." },
      { t: "Suivi de chantier", d: "Visites, contrôle des travaux et du budget, jusqu'à la réception." },
    ],
    chiffrageTitre: "Combien coûtera votre projet ?",
    chiffrageTexte: "Villa, maison ou immeuble : chiffrez votre construction lot par lot en 2 minutes, gratuitement et sans engagement.",
    chiffrageCta: "Chiffrer mon projet",
    chiffrageGuide: "Lire le guide des prix", chiffrageGuideHref: "/guide/prix-construction-villa-maroc",
    realKicker: "Réalisations",
    realTitre: "Projets du cabinet",
    realChantierTitre: "Sur le chantier, avec l'architecte",
    realChantierTexte: "Début de chantier et fondations : ce que l'architecte vérifie sur place.",
    realVoir: "Voir les photos",
    realVideo: "Voir la vidéo",
    fermer: "Fermer",
    precedente: "Photo précédente",
    suivante: "Photo suivante",
    videosKicker: "Cities Talk Maroc",
    videosTitre: "Mes conseils en vidéo",
    videosTexte: "Coût réel, permis, terrain, contrat : je réponds aux questions que tout le monde se pose avant de construire (en darija).",
    voirChaine: "Voir la chaîne YouTube",
    guidesKicker: "Guides",
    guidesTitre: "Bien préparer votre construction",
    guidesTexte: "Des réponses claires, rédigées par l'architecte.",
    lecture: "min de lecture",
    guideLangue: "",
    tousGuides: "Tous les guides →",
    faqTitre: "Questions fréquentes",
    faq: [
      { q: "Faut-il obligatoirement un architecte pour construire au Maroc ?", r: "Oui. Toute autorisation de construire exige un dossier établi et signé par un architecte inscrit à l'Ordre." },
      { q: "Combien coûte un architecte ?", r: "Les honoraires se calculent en pourcentage du coût des travaux (barème CNOA, environ 5 % selon la mission). Le chiffrage vous donne d'abord le coût des travaux.", lien: { href: "/guide/honoraires-architecte-maroc", label: "Lire le guide des honoraires" } },
      { q: "Combien de temps pour obtenir le permis de construire ?", r: "Les textes fixent 15 jours (petit projet) ou 30 jours (grand projet) à compter d'un dossier complet et conforme ; en pratique, souvent plus si des modifications de plans sont demandées.", lien: { href: "/guide/permis-de-construire-maroc", label: "Lire le guide du permis" } },
      { q: "Où intervenez-vous ?", r: "Kénitra et toute la région Rabat-Salé-Kénitra, ainsi que Casablanca, Mohammedia et Tanger — en présentiel ou à distance." },
      { q: "Le chiffrage en ligne est-il gratuit ?", r: "Oui, gratuit et sans engagement. Il donne une estimation lot par lot que nous affinons ensemble ensuite." },
    ],
    finTitre: "Parlons de votre projet",
    finTexte: "Une question sur un terrain, un permis ou un budget ? Écrivez-moi sur WhatsApp, je vous réponds personnellement.",
    finWa: "Écrire sur WhatsApp",
    finChiffrage: "Chiffrer mon projet",
    finRdv: "Réserver un appel vidéo",
    finAppel: "Appeler",
    waMessage: "Bonjour, je vous ai découvert sur citurbarea.com et j'ai un projet.",
    piedServices: "Services",
    piedGuides: "Guides",
    piedVilles: "Villes",
    piedContact: "Contact",
    piedChiffrage: "Chiffrage gratuit",
    piedTerrains: "Terrains à vendre",
    piedPortes: [
      { href: "/p1", label: "Projet personnel / familial" },
      { href: "/p2", label: "Projet immobilier" },
      { href: "/p3", label: "Réalisation clé en main" },
      { href: "/p4", label: "Investisseur & foncier" },
      { href: "/p5", label: "Rapports & expertises" },
      { href: "/p6", label: "Entreprises & partenaires" },
    ],
    droits: "Plateforme d'architecture, d'urbanisme et d'investissement.",
  },
  en: {
    archiKicker: "Your architect",
    archiTitre: "A registered architect, from the first sketch to handover",
    archiNom: "Yassine AT-TARASSI",
    archiRole: "DENA architect registered with the Order of Architects · PhD candidate in urban geography (Ibn Tofaïl University)",
    archiTexte: "Arc Bati Architecture, based in Kénitra. I design your plans, prepare and file your building permit application, then supervise the works until handover. CITURBAREA is the platform that structures this work: cost estimate, file, follow-up.",
    preuves: ["Registered with the Order of Architects — a signature required for any building permit in Morocco", "Office in Kénitra: Office 6, Meryam C building, corner of rue Chellah and rue Mabrek Doukkali", "Rabat-Salé-Kénitra and beyond, on site or remotely"],
    zones: "Architect in",
    avis: "Leave a Google review",
    etapesKicker: "How it works",
    etapesTitre: "4 steps, one single contact",
    etapes: [
      { t: "We discuss your project", d: "On WhatsApp or by phone: plot, needs, budget, timing." },
      { t: "You know the cost", d: "Item-by-item estimate and plot check before committing to anything." },
      { t: "Plans and permit", d: "Design, complete file and submission to the municipality." },
      { t: "Site supervision", d: "Site visits, quality and budget control, until handover." },
    ],
    chiffrageTitre: "How much will your project cost?",
    chiffrageTexte: "Villa, house or building: estimate your construction item by item in 2 minutes, free and with no commitment.",
    chiffrageCta: "Estimate my project",
    chiffrageGuide: "Read the price guide", chiffrageGuideHref: "/guide/villa-construction-cost-morocco",
    realKicker: "Projects",
    realTitre: "Our work",
    realChantierTitre: "On site, with the architect",
    realChantierTexte: "Start of works and foundations: what the architect checks on site.",
    realVoir: "See photos",
    realVideo: "Watch the video",
    fermer: "Close",
    precedente: "Previous photo",
    suivante: "Next photo",
    videosKicker: "Cities Talk Maroc",
    videosTitre: "My advice on video",
    videosTexte: "Real costs, permits, land, contracts: answers to the questions everyone asks before building (in Moroccan Arabic).",
    voirChaine: "Visit the YouTube channel",
    guidesKicker: "Guides",
    guidesTitre: "Prepare your build properly",
    guidesTexte: "Clear answers, written by the architect.",
    lecture: "min read",
    guideLangue: "FR",
    tousGuides: "All guides →",
    faqTitre: "Frequently asked questions",
    faq: [
      { q: "Is an architect mandatory to build in Morocco?", r: "Yes. Every building permit requires a file prepared and signed by an architect registered with the Order." },
      { q: "How much does an architect cost?", r: "Fees are a percentage of the construction cost (CNOA scale, about 5% depending on the assignment). The estimate first gives you the construction cost.", lien: { href: "/guide/architect-fees-morocco", label: "Read the fees guide" } },
      { q: "How long does a building permit take?", r: "The regulations set 15 days (small project) or 30 days (large project) from a complete, compliant file; in practice it often takes longer when plan changes are requested.", lien: { href: "/guide/building-permit-morocco", label: "Read the permit guide" } },
      { q: "Where do you work?", r: "Kénitra and the whole Rabat-Salé-Kénitra region, as well as Casablanca, Mohammedia and Tangier — on site or remotely." },
      { q: "Is the online estimate free?", r: "Yes, free and with no commitment. It gives an item-by-item estimate that we then refine together." },
    ],
    finTitre: "Let's talk about your project",
    finTexte: "A question about a plot, a permit or a budget? Message me on WhatsApp, I answer personally.",
    finWa: "Message on WhatsApp",
    finChiffrage: "Estimate my project",
    finRdv: "Book a video call",
    finAppel: "Call",
    waMessage: "Hello, I found you on citurbarea.com and I have a project.",
    piedServices: "Services",
    piedGuides: "Guides",
    piedVilles: "Cities",
    piedContact: "Contact",
    piedChiffrage: "Free cost estimate",
    piedTerrains: "Land for sale",
    piedPortes: [
      { href: "/p1", label: "Personal / family project" },
      { href: "/p2", label: "Real-estate project" },
      { href: "/p3", label: "Turnkey delivery" },
      { href: "/p4", label: "Investor & land" },
      { href: "/p5", label: "Reports & appraisals" },
      { href: "/p6", label: "Companies & partners" },
    ],
    droits: "Architecture, urban planning and investment platform.",
  },
  ar: {
    archiKicker: "المهندس المعماري ديالك",
    archiTitre: "مهندس معماري مسجل فهيئة المهندسين المعماريين، من أول رسم حتى تسليم المفاتيح",
    archiNom: "ياسين الطراسي — Yassine AT-TARASSI",
    archiRole: "مهندس معماري DENA مسجل فالهيئة · باحث فالدكتوراه فالجغرافيا الحضرية (جامعة ابن طفيل)",
    archiTexte: "مكتب Arc Bati Architecture فالقنيطرة. كنصمم التصاميم ديالك، كنوجد ونودع ملف رخصة البناء، ومن بعد كنتبع الورش حتى التسليم. CITURBAREA هي المنصة اللي كتنظم هاد الخدمة: التقدير، الملف، والتتبع.",
    preuves: ["مسجل فهيئة المهندسين المعماريين — التوقيع ديالو ضروري لأي رخصة بناء", "المكتب فالقنيطرة: مكتب 6، عمارة مريم C، زاوية زنقة شالة وزنقة مبارك الدكالي", "جهة الرباط-سلا-القنيطرة وما بعدها، حضوريا أو عن بعد"],
    zones: "مهندس معماري ف",
    avis: "خلي تقييم فـ Google",
    etapesKicker: "كيفاش كنخدمو",
    etapesTitre: "4 مراحل، ومخاطب واحد",
    etapes: [
      { t: "كنتكلمو على المشروع ديالك", d: "فواتساب ولا فالتيليفون: الأرض، الحاجة، الميزانية والآجال." },
      { t: "كتعرف التكلفة", d: "تقدير حصة بحصة والتحقق من الأرض قبل ما تلتزم بشي حاجة." },
      { t: "التصاميم والرخصة", d: "التصميم، ملف كامل وإيداعه فالجماعة." },
      { t: "تتبع الورش", d: "زيارات، مراقبة الأشغال والميزانية، حتى التسليم." },
    ],
    chiffrageTitre: "شحال غادي يكلفك المشروع ديالك؟",
    chiffrageTexte: "فيلا، دار ولا عمارة: قدّر تكلفة البناء حصة بحصة ف 2 دقايق، بالمجان وبلا التزام.",
    chiffrageCta: "قدّر تكلفة مشروعي",
    chiffrageGuide: "دليل الأثمنة", chiffrageGuideHref: "/guide/thaman-bina-villa-maghrib",
    realKicker: "إنجازات",
    realTitre: "مشاريع المكتب",
    realChantierTitre: "فالورش، مع المهندس المعماري",
    realChantierTexte: "بداية الورش والأساسات: شنو كيتحقق منو المهندس المعماري فالبلاصة.",
    realVoir: "شوف الصور",
    realVideo: "شوف الفيديو",
    fermer: "سد",
    precedente: "الصورة السابقة",
    suivante: "الصورة التالية",
    videosKicker: "Cities Talk Maroc — مدن تتحدث",
    videosTitre: "نصائحي بالفيديو",
    videosTexte: "التكلفة الحقيقية، الرخصة، الأرض، العقد: كنجاوب على الأسئلة اللي كيطرحها الجميع قبل البناء.",
    voirChaine: "شوف القناة فيوتيوب",
    guidesKicker: "أدلة",
    guidesTitre: "وجد البناء ديالك مزيان",
    guidesTexte: "أجوبة واضحة كتبها المهندس المعماري.",
    lecture: "دقايق ديال القراءة",
    guideLangue: "FR",
    tousGuides: "← جميع الأدلة",
    faqTitre: "أسئلة متكررة",
    faq: [
      { q: "واش المهندس المعماري ضروري باش تبني فالمغرب؟", r: "إيه. كل رخصة بناء خاصها ملف موجد وموقع من طرف مهندس معماري مسجل فالهيئة." },
      { q: "شحال كيكلف المهندس المعماري؟", r: "الأتعاب كتحسب بنسبة من تكلفة الأشغال (سلم الهيئة، تقريبا 5 % حسب المهمة). التقدير كيعطيك أولا تكلفة الأشغال.", lien: { href: "/guide/ajr-al-muhandis-al-miamari-maghrib", label: "دليل أتعاب المهندس المعماري" } },
      { q: "شحال كتاخد رخصة البناء؟", r: "النصوص كتحدد 15 يوم للمشاريع الصغرى و30 يوم للمشاريع الكبرى من بعد إيداع ملف كامل ومطابق؛ ففالواقع كتطول المدة إلا طلبو تعديل التصاميم.", lien: { href: "/guide/rukhsat-al-bina-maghrib", label: "دليل رخصة البناء" } },
      { q: "فين كتخدمو؟", r: "القنيطرة وجهة الرباط-سلا-القنيطرة كاملة، وكذلك الدار البيضاء، المحمدية وطنجة — حضوريا أو عن بعد." },
      { q: "واش التقدير فالموقع بالمجان؟", r: "إيه، بالمجان وبلا التزام. كيعطيك تقدير حصة بحصة ومن بعد كندققوه مع بعض." },
    ],
    finTitre: "يالله نتكلمو على المشروع ديالك",
    finTexte: "عندك سؤال على أرض، رخصة ولا ميزانية؟ كتب ليا فواتساب، كنجاوبك شخصيا.",
    finWa: "كتب ليا فواتساب",
    finChiffrage: "قدّر تكلفة مشروعي",
    finRdv: "احجز مكالمة فيديو",
    finAppel: "عيّط",
    waMessage: "السلام، لقيتكم فـ citurbarea.com وعندي مشروع.",
    piedServices: "الخدمات",
    piedGuides: "أدلة",
    piedVilles: "المدن",
    piedContact: "التواصل",
    piedChiffrage: "تقدير مجاني",
    piedTerrains: "أراضي للبيع",
    piedPortes: [
      { href: "/p1", label: "مشروع شخصي / عائلي" },
      { href: "/p2", label: "مشروع عقاري" },
      { href: "/p3", label: "إنجاز مفتاح في اليد" },
      { href: "/p4", label: "مستثمر وعقار" },
      { href: "/p5", label: "تقارير وخبرات" },
      { href: "/p6", label: "مقاولات وشركاء" },
    ],
    droits: "منصة الهندسة المعمارية، التعمير والاستثمار.",
  },
} satisfies Record<Lang, unknown>;

type Textes = (typeof TXT)["fr"];

// ── Petits éléments communs ─────────────────────────────────────────────

const conteneur = "mx-auto w-full max-w-[1200px] px-4 sm:px-5";
const sansSoulignement = { textDecoration: "none" } as const;
const btn = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition";
const btnOr = `${btn} bg-[#C9A227] text-[#0B1B3A] hover:bg-[#d8b440]`;
const btnWa = `${btn} bg-[#15803d] text-white hover:bg-[#166534]`;
const btnContour = `${btn} border border-slate-300 bg-white text-[#0B1B3A] hover:border-[#0B1B3A]`;

function Entete({ kicker, titre, texte, id, clair = false }: { kicker: string; titre: string; texte?: string; id: string; clair?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`m-0 text-xs font-bold uppercase tracking-[0.14em] ${clair ? "text-[#C9A227]" : "text-[#7a5f0a]"}`}>{kicker}</p>
      <h2 id={id} className={`m-0 mt-2 text-[26px] font-extrabold leading-tight sm:text-[30px] ${clair ? "text-white" : "text-[#0B1B3A]"}`}>{titre}</h2>
      {texte && <p className={`m-0 mt-2 text-base leading-relaxed ${clair ? "text-slate-300" : "text-slate-600"}`}>{texte}</p>}
    </div>
  );
}

function Icone({ nom }: { nom: string }) {
  const p = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (nom) {
    case "cout": return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h8" /></svg>;
    case "permis": return <svg {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 14l2 2 4-4" /></svg>;
    case "archi": return <svg {...p}><path d="M3 21h18M5 21V9l7-5 7 5v12" /><path d="M10 21v-6h4v6" /></svg>;
    case "etapes": return <svg {...p}><path d="M4 20h4v-4h4v-4h4V8h4" /></svg>;
    case "bet": return <svg {...p}><path d="M4 20h16M6 20V10l6-6 6 6v10M9 14h6M12 11v6" /></svg>;
    case "entreprise": return <svg {...p}><path d="M3 21h18M5 21V7h6v14M11 21V3h8v18M8 11h0M8 15h0M15 7h0M15 11h0M15 15h0" /></svg>;
    case "check": return <svg {...p} width={20} height={20}><path d="M5 12l4 4 10-10" /></svg>;
    default: return null;
  }
}

// ── 1. L'architecte ──────────────────────────────────────────────────────

function SectionArchitecte({ t }: { t: Textes }) {
  return (
    <section aria-labelledby="archi-titre" className="bg-white py-12 sm:py-16">
      <div className={`${conteneur} grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center`}>
        <div>
          <Entete id="archi-titre" kicker={t.archiKicker} titre={t.archiTitre} />
          <p className="m-0 mt-5 text-lg font-bold text-[#0B1B3A]">{t.archiNom}</p>
          <p className="m-0 mt-1 text-sm font-semibold text-slate-500">{t.archiRole}</p>
          <p className="m-0 mt-4 text-base leading-relaxed text-slate-700">{t.archiTexte}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={RESEAUX.youtube} target="_blank" rel="noopener noreferrer" onClick={() => evenement("reseau_click", { reseau: "youtube", emplacement: "accueil_archi" })} className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#0B1B3A]" style={sansSoulignement}>YouTube</a>
            <a href={RESEAUX.facebook} target="_blank" rel="noopener noreferrer" onClick={() => evenement("reseau_click", { reseau: "facebook", emplacement: "accueil_archi" })} className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#0B1B3A]" style={sansSoulignement}>Facebook</a>
            <a href={RESEAUX.instagram} target="_blank" rel="noopener noreferrer" onClick={() => evenement("reseau_click", { reseau: "instagram", emplacement: "accueil_archi" })} className="inline-flex min-h-[44px] items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-[#0B1B3A]" style={sansSoulignement}>Instagram</a>
            {AVIS_GOOGLE_URL && (
              <a href={AVIS_GOOGLE_URL} target="_blank" rel="noopener noreferrer" onClick={() => evenement("avis_google_click")} className="inline-flex min-h-[44px] items-center rounded-full border border-[#C9A227] px-4 text-sm font-semibold text-[#0B1B3A]" style={sansSoulignement}>★ {t.avis}</a>
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-[#0B1B3A] p-6 text-white sm:p-8">
          <ul className="m-0 grid list-none gap-4 p-0">
            {t.preuves.map((p) => (
              <li key={p} className="flex gap-3 text-base leading-snug">
                <span className="mt-0.5 shrink-0 text-[#C9A227]"><Icone nom="check" /></span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-6 text-sm font-semibold text-slate-300">{t.zones}</p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
            {VILLES.map((v) => (
              <li key={v.slug}>
                <a href={`/architecte-${v.slug}`} className="inline-flex min-h-[44px] items-center rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:border-[#C9A227]" style={sansSoulignement}>{v.nom}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── 2. Comment ça marche ────────────────────────────────────────────────

function SectionEtapes({ t }: { t: Textes }) {
  return (
    <section aria-labelledby="etapes-titre" className="py-12 sm:py-16">
      <div className={conteneur}>
        <Entete id="etapes-titre" kicker={t.etapesKicker} titre={t.etapesTitre} />
        <ol className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {t.etapes.map((e, i) => (
            <li key={e.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1B3A] text-base font-extrabold text-[#C9A227]">{i + 1}</span>
              <h3 className="m-0 mt-4 text-lg font-bold text-[#0B1B3A]">{e.t}</h3>
              <p className="m-0 mt-1 text-base leading-relaxed text-slate-600">{e.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── 3. Combien coûtera votre projet ? ───────────────────────────────────

function SectionChiffrage({ t }: { t: Textes }) {
  return (
    <section aria-labelledby="cout-titre" className="pb-12 sm:pb-16">
      <div className={conteneur}>
        <div className="flex flex-col gap-6 rounded-3xl bg-gradient-to-br from-[#0B1B3A] to-[#16306a] p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 id="cout-titre" className="m-0 text-[26px] font-extrabold leading-tight sm:text-[32px]">{t.chiffrageTitre}</h2>
            <p className="m-0 mt-3 text-base leading-relaxed text-slate-200">{t.chiffrageTexte}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to="/chiffrage" onClick={() => evenement("cta_chiffrage", { emplacement: "accueil_bloc_cout" })} className={btnOr} style={sansSoulignement}>{t.chiffrageCta} →</Link>
            <a href={t.chiffrageGuideHref} className={`${btn} border border-white/30 text-white hover:border-[#C9A227]`} style={sansSoulignement}>{t.chiffrageGuide}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 4. Réalisations ─────────────────────────────────────────────────────

function Lightbox({ r, depart, t, fermer }: { r: Realisation; depart: number; t: Textes; fermer: () => void }) {
  const [i, setI] = useState(depart);
  const n = r.images.length;
  const btnFermer = useRef<HTMLButtonElement>(null);
  const aller = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    const precedent = document.activeElement as HTMLElement | null;
    btnFermer.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight") aller(1);
      else if (e.key === "ArrowLeft") aller(-1);
    };
    document.addEventListener("keydown", touche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", touche);
      document.body.style.overflow = overflow;
      precedent?.focus?.();
    };
  }, [aller, fermer]);
  const img = r.images[i];
  const fleche = "absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#0B1B3A] shadow";
  return (
    <div role="dialog" aria-modal="true" aria-label={r.titre} className="fixed inset-0 z-[10000] flex flex-col bg-black/90 p-3 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="m-0 text-base font-semibold">{r.titre} — {r.ville}{n > 1 ? ` (${i + 1}/${n})` : ""}</p>
        <button ref={btnFermer} type="button" onClick={fermer} className="min-h-[44px] rounded-xl bg-white/15 px-4 text-base font-bold text-white">{t.fermer} ✕</button>
      </div>
      <div className="relative mt-3 flex flex-1 items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) fermer(); }}>
        <img src={img.src} alt={img.alt} className="max-h-full max-w-full rounded-lg object-contain" />
        {n > 1 && (
          <>
            <button type="button" onClick={() => aller(-1)} aria-label={t.precedente} className={`${fleche} left-1`}>‹</button>
            <button type="button" onClick={() => aller(1)} aria-label={t.suivante} className={`${fleche} right-1`}>›</button>
          </>
        )}
      </div>
    </div>
  );
}

function SectionRealisations({ t }: { t: Textes }) {
  const [ouverte, setOuverte] = useState<{ r: Realisation; i: number } | null>(null);
  const fermer = useCallback(() => setOuverte(null), []);

  // Pas encore de réalisations renseignées : vidéo de chantier réelle à la place.
  if (REALISATIONS.length === 0) {
    return (
      <section aria-labelledby="real-titre" className="bg-white py-12 sm:py-16">
        <div className={`${conteneur} grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center`}>
          <div>
            <Entete id="real-titre" kicker={t.realKicker} titre={t.realChantierTitre} texte={t.realChantierTexte} />
            <a href={RESEAUX.youtube} target="_blank" rel="noopener noreferrer" onClick={() => evenement("reseau_click", { reseau: "youtube", emplacement: "accueil_realisations" })} className={`${btnContour} mt-6`} style={sansSoulignement}>{t.voirChaine}</a>
          </div>
          <LecteurYoutube v={VIDEO_CHANTIER} />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="real-titre" className="bg-white py-12 sm:py-16">
      <div className={conteneur}>
        <Entete id="real-titre" kicker={t.realKicker} titre={t.realTitre} />
        {/* Mobile : carrousel horizontal (scroll-snap) ; desktop : grille. */}
        <ul className="m-0 -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 list-none gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {REALISATIONS.map((r) => (
            <li key={r.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <article className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button type="button" onClick={() => setOuverte({ r, i: 0 })} className="flex w-full cursor-zoom-in border-0 bg-slate-100 p-0" aria-label={`${t.realVoir} : ${r.titre}`}>
                  <img src={r.images[0].src} alt={r.images[0].alt} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
                </button>
                <div className="p-4">
                  <p className="m-0 text-xs font-bold uppercase tracking-wide text-[#7a5f0a]">{[r.type, r.ville, r.annee].filter(Boolean).join(" · ")}</p>
                  <h3 className="m-0 mt-1 text-lg font-bold text-[#0B1B3A]">{r.titre}</h3>
                  {r.mission && <p className="m-0 mt-1 text-base text-slate-600">{r.mission}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.images.length > 1 && <button type="button" onClick={() => setOuverte({ r, i: 0 })} className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-[#0B1B3A]">{t.realVoir} ({r.images.length})</button>}
                    {r.videoYoutubeId && <a href={`https://www.youtube.com/watch?v=${r.videoYoutubeId}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-[#0B1B3A]" style={sansSoulignement}>▶ {t.realVideo}</a>}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
      {ouverte && <Lightbox r={ouverte.r} depart={ouverte.i} t={t} fermer={fermer} />}
    </section>
  );
}

// ── 5. Vidéos ───────────────────────────────────────────────────────────

function SectionVideos({ t }: { t: Textes }) {
  return (
    <section id="videos" aria-labelledby="videos-titre" className="py-12 sm:py-16" style={{ scrollMarginTop: 140 }}>
      <div className={conteneur}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Entete id="videos-titre" kicker={t.videosKicker} titre={t.videosTitre} texte={t.videosTexte} />
          <a href={RESEAUX.youtube} target="_blank" rel="noopener noreferrer" onClick={() => evenement("reseau_click", { reseau: "youtube", emplacement: "accueil_videos" })} className={btnContour} style={sansSoulignement}>
            <span className="text-red-600" aria-hidden="true">▶</span> {t.voirChaine}
          </a>
        </div>
        <ul className="m-0 -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 list-none gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {VIDEOS_ACCUEIL.map((v) => (
            <li key={v.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <LecteurYoutube v={v} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── 7. Guides ───────────────────────────────────────────────────────────

function SectionGuides({ t, lang }: { t: Textes; lang: Lang }) {
  return (
    <section id="medias" aria-labelledby="guides-titre" className="bg-white py-12 sm:py-16" style={{ scrollMarginTop: 140 }}>
      <div className={conteneur}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Entete id="guides-titre" kicker={t.guidesKicker} titre={t.guidesTitre} texte={t.guidesTexte} />
          <a href="/guide" className={btnContour} style={sansSoulignement}>{t.tousGuides}</a>
        </div>
        <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((g0) => {
            const tr = guideTraduit(g0.slug, lang);
            const g = { ...g0, ...(tr ?? {}) };
            const langue = tr ? lang : "fr";
            return (
            <li key={g0.slug}>
              <a href={`/guide/${g.slug}`} lang={langue} dir={langue === "ar" ? "rtl" : "ltr"} className="group flex h-full gap-4 rounded-2xl border border-slate-200 bg-[#fbfaf6] p-4 transition hover:border-[#C9A227] hover:bg-white" style={sansSoulignement}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B1B3A] text-[#C9A227]"><Icone nom={g.icone} /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-bold leading-snug text-[#0B1B3A] group-hover:underline">{g.titre}</span>
                  <span className="mt-1 text-[15px] leading-snug text-slate-600">{g.resume}</span>
                  <span dir="auto" className="mt-2 text-sm font-semibold text-slate-500">{g.min} {t.lecture}{!tr && t.guideLangue ? ` · ${t.guideLangue}` : ""}</span>
                </span>
              </a>
            </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ── 8. FAQ ──────────────────────────────────────────────────────────────

function SectionFaq({ t }: { t: Textes }) {
  return (
    <section aria-labelledby="faq-titre" className="py-12 sm:py-16">
      <div className={`${conteneur} max-w-[860px]`}>
        <h2 id="faq-titre" className="m-0 text-[26px] font-extrabold text-[#0B1B3A] sm:text-[30px]">{t.faqTitre}</h2>
        <div className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {t.faq.map((f) => (
            <details key={f.q} className="group px-5">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-bold text-[#0B1B3A] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="shrink-0 text-xl text-[#7a5f0a] transition group-open:rotate-45">+</span>
              </summary>
              <p className="m-0 pb-4 text-base leading-relaxed text-slate-700">
                {f.r}
                {"lien" in f && f.lien && <> <a href={f.lien.href} className="font-semibold text-[#0B1B3A] underline">{f.lien.label}</a></>}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 9. Appel à l'action final ───────────────────────────────────────────

function SectionFinale({ t }: { t: Textes }) {
  return (
    <section aria-labelledby="fin-titre" className="pb-12 sm:pb-16">
      <div className={conteneur}>
        <div className="rounded-3xl border border-[#C9A227]/40 bg-white p-6 text-center shadow-sm sm:p-10">
          <h2 id="fin-titre" className="m-0 text-[26px] font-extrabold text-[#0B1B3A] sm:text-[32px]">{t.finTitre}</h2>
          <p className="mx-auto m-0 mt-3 max-w-xl text-base leading-relaxed text-slate-600">{t.finTexte}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a href={lienWhatsApp(t.waMessage)} target="_blank" rel="noopener noreferrer" onClick={() => evenement("whatsapp_click", { emplacement: "accueil_final" })} className={btnWa} style={sansSoulignement}>{t.finWa}</a>
            <Link to="/chiffrage" onClick={() => evenement("cta_chiffrage", { emplacement: "accueil_final" })} className={btnOr} style={sansSoulignement}>{t.finChiffrage}</Link>
            <Link to="/rendez-vous" onClick={() => evenement("cta_rdv", { emplacement: "accueil_final" })} className={btnContour} style={sansSoulignement}>{t.finRdv}</Link>
            <a href={lienTel} onClick={() => evenement("tel_click", { emplacement: "accueil_final" })} className={btnContour} style={sansSoulignement}>{t.finAppel} · <span dir="ltr">{CONTACT.telAffiche}</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 10. Pied de page ────────────────────────────────────────────────────

function PiedDePage({ t }: { t: Textes }) {
  const titre = "m-0 text-sm font-bold uppercase tracking-wide text-[#C9A227]";
  const lien = "inline-flex min-h-[44px] items-center text-[15px] text-slate-300 hover:text-white";
  return (
    <footer className="m-0 bg-[#0B1B3A] px-0 py-12 text-slate-300">
      <div className={`${conteneur} grid gap-8 sm:grid-cols-2 lg:grid-cols-4`}>
        <div>
          <p className="m-0 text-lg font-extrabold text-white">CITURBAREA</p>
          <p className="m-0 mt-2 text-[15px] leading-relaxed">{t.droits}</p>
          <p className="m-0 mt-3 text-[15px] leading-relaxed">Arc Bati Architecture — Yassine AT-TARASSI<br />Bureau 6, Immeuble Meryam C, angle rue Chellah et rue Mabrek Doukkali, 14000 Kénitra</p>
        </div>
        <nav aria-label={t.piedServices}>
          <p className={titre}>{t.piedServices}</p>
          <ul className="m-0 mt-2 list-none p-0">
            <li><Link to="/chiffrage" className={lien} style={sansSoulignement}>{t.piedChiffrage}</Link></li>
            <li><Link to="/p4/terrains" className={lien} style={sansSoulignement}>{t.piedTerrains}</Link></li>
            {t.piedPortes.map((p) => <li key={p.href}><Link to={p.href} className={lien} style={sansSoulignement}>{p.label}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label={t.piedVilles}>
          <p className={titre}>{t.piedVilles}</p>
          <ul className="m-0 mt-2 list-none p-0">
            {VILLES.map((v) => <li key={v.slug}><a href={`/architecte-${v.slug}`} className={lien} style={sansSoulignement}>{t.zones} {v.nom}</a></li>)}
            <li><a href="/guide" className={lien} style={sansSoulignement}>{t.piedGuides}</a></li>
          </ul>
        </nav>
        <div>
          <p className={titre}>{t.piedContact}</p>
          <ul className="m-0 mt-2 list-none p-0">
            <li><a href={lienTel} className={lien} style={sansSoulignement} dir="ltr">{CONTACT.telAffiche}</a></li>
            <li><a href={lienWhatsApp(t.waMessage)} target="_blank" rel="noopener noreferrer" className={lien} style={sansSoulignement}>WhatsApp</a></li>
            <li><a href={RESEAUX.youtube} target="_blank" rel="noopener noreferrer" className={lien} style={sansSoulignement}>YouTube — Cities Talk Maroc</a></li>
            <li><a href={RESEAUX.facebook} target="_blank" rel="noopener noreferrer" className={lien} style={sansSoulignement}>Facebook</a></li>
            <li><a href={RESEAUX.instagram} target="_blank" rel="noopener noreferrer" className={lien} style={sansSoulignement}>Instagram</a></li>
            <li><a href={RESEAUX.tiktok} target="_blank" rel="noopener noreferrer" className={lien} style={sansSoulignement}>TikTok</a></li>
          </ul>
        </div>
      </div>
      <p className={`${conteneur} m-0 mt-8 border-t border-white/10 pt-6 text-sm text-slate-400`}>
        © {new Date().getFullYear()} CITURBAREA · HSE DECO ·{" "}
        <a href="/mentions-legales" className="text-slate-300 hover:text-white">Mentions légales</a> ·{" "}
        <a href="/confidentialite" className="text-slate-300 hover:text-white">Confidentialité</a> ·{" "}
        <a href="/mentions-legales#conditions" className="text-slate-300 hover:text-white">Conditions d'utilisation</a>
      </p>
    </footer>
  );
}

// ── Assemblage ──────────────────────────────────────────────────────────

export default function AccueilBasDePage() {
  const { lang } = useLang();
  const t: Textes = TXT[lang] ?? TXT.fr;
  return (
    <div className="bg-[#f7f6f2] text-[#0f172a]" style={{ fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial, sans-serif" }}>
      <SectionArchitecte t={t} />
      <SectionEtapes t={t} />
      <SectionChiffrage t={t} />
      <SectionRealisations t={t} />
      <SectionVideos t={t} />
      <TerrainsAccueil />
      <SectionGuides t={t} lang={lang} />
      <SectionFaq t={t} />
      <SectionFinale t={t} />
      <PiedDePage t={t} />
    </div>
  );
}
