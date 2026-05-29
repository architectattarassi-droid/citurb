#!/usr/bin/env node
/**
 * build-seo.mjs — Génère les pages SEO long-tail service×ville (corridor Rabat-Kénitra)
 * et le sitemap-services.xml + llms.txt.
 *
 * Source : apps/web/seo/{business,services,localities,overrides}.json
 * Sortie : apps/web/public/services/{service-slug}-{locality-slug}.html
 *          apps/web/public/sitemap-services.xml
 *          apps/web/public/llms.txt
 *
 * GARDE-FOU DOCTRINAL (brief Chantier A) :
 *   Seules les pages avec override RÉEL dans overrides.json sont émises ET
 *   entrent dans le sitemap. Toute cellule sans override reste en "preview"
 *   (non écrite sur disque, non publiée) — pour ne JAMAIS générer de doorway
 *   pages identiques au nom de ville près (risque de désindexation Google).
 *
 * Exécution : `npm --prefix apps/web run build:seo` (chaîné dans prebuild).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "..");
const SEO_DIR = path.join(WEB_ROOT, "seo");
const PUBLIC_DIR = path.join(WEB_ROOT, "public");
const PAGES_DIR = path.join(PUBLIC_DIR, "services");

const read = (f) => JSON.parse(fs.readFileSync(path.join(SEO_DIR, f), "utf8"));
const business = read("business.json");
const services = read("services.json");
const localities = read("localities.json");
const overrides = read("overrides.json");

fs.mkdirSync(PAGES_DIR, { recursive: true });

// On nettoie d'abord les anciennes pages services pour éviter d'en laisser des obsolètes.
for (const f of fs.readdirSync(PAGES_DIR)) {
  if (f.endsWith(".html")) fs.unlinkSync(path.join(PAGES_DIR, f));
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const urlFor = (svc, loc) => `${business.pathPrefix}/${svc.slug}-${loc.slug}.html`;
const fullUrl = (svc, loc) => `${business.baseUrl}${urlFor(svc, loc)}`;

// ───────────────────────────── JSON-LD ─────────────────────────────
function localBusinessSchema(svc, loc, ov) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "additionalType": "https://www.wikidata.org/wiki/Q42973",
    "@id": `${fullUrl(svc, loc)}#business`,
    name: `${svc.name} à ${loc.name} — ${business.name}`,
    url: fullUrl(svc, loc),
    image: business.image,
    logo: business.logo,
    telephone: business.phone,
    email: business.email,
    priceRange: business.priceRange,
    description: `${svc.detail} ${ov.localContext || `Intervention à ${loc.name} et environs.`}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.hq.streetAddress,
      addressLocality: business.hq.locality,
      addressRegion: business.hq.region,
      postalCode: business.hq.postalCode,
      addressCountry: business.hq.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: loc.lat, longitude: loc.lng },
    areaServed: { "@type": "City", name: loc.name },
    founder: { "@type": "Person", name: business.founder, jobTitle: business.founderTitle },
    sameAs: business.sameAs,
  };
}

function faqSchema(svc, loc) {
  const qa = [
    [
      `Proposez-vous un service de ${svc.name.toLowerCase()} à ${loc.name} ?`,
      `Oui. ${svc.detail} J'interviens à ${loc.name} et dans tout le corridor Rabat-Kénitra.`,
    ],
    [
      `Comment se déroule une première prise de contact à ${loc.name} ?`,
      `Un premier échange permet de cadrer votre projet, vérifier la faisabilité réglementaire à ${loc.name} et estimer le budget avant tout engagement.`,
    ],
    [
      `Intervenez-vous au-delà de ${loc.name} ?`,
      `Oui, sur l'ensemble du corridor : Kénitra, Mehdiya, Sidi Taibi, Salé, Rabat, Témara et environs.`,
    ],
  ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

// ───────────────────────── maillage interne ─────────────────────────
function relatedLinks(svc, loc) {
  // Maillage UNIQUEMENT vers les pages personnalisées (sinon liens vers landings React /architecte-:ville).
  const otherSvcPersonalized = services
    .filter((s) => s.slug !== svc.slug && overrides[`${s.slug}__${loc.slug}`])
    .slice(0, 4)
    .map((s) => `<li><a href="${urlFor(s, loc)}">${esc(s.name)} à ${esc(loc.name)}</a></li>`);
  const otherLocPersonalized = localities
    .filter((l) => l.slug !== loc.slug && overrides[`${svc.slug}__${l.slug}`])
    .slice(0, 4)
    .map((l) => `<li><a href="${urlFor(svc, l)}">${esc(svc.name)} à ${esc(l.name)}</a></li>`);
  // Lien vers la landing React /architecte-:ville pour exploration interactive (rel=alternate).
  return { otherSvcPersonalized, otherLocPersonalized };
}

// ─────────────────────────── template HTML ───────────────────────────
function pageHtml(svc, loc, ov) {
  const title = `${svc.name} à ${loc.name} | ${business.founder} — Architecte`;
  const desc = `${svc.summary} ${ov.localContext.slice(0, 130)}`.slice(0, 158);
  const { otherSvcPersonalized, otherLocPersonalized } = relatedLinks(svc, loc);
  const villeReactUrl = `${business.baseUrl}/architecte-${loc.slug}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${fullUrl(svc, loc)}">
<link rel="alternate" hreflang="fr" href="${fullUrl(svc, loc)}">
<link rel="alternate" hreflang="ar" href="${business.baseUrl}/ar${urlFor(svc, loc)}">
<link rel="alternate" hreflang="x-default" href="${fullUrl(svc, loc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${fullUrl(svc, loc)}">
<meta property="og:locale" content="fr_MA">
<script type="application/ld+json">${JSON.stringify(localBusinessSchema(svc, loc, ov))}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema(svc, loc))}</script>
<style>
  *{box-sizing:border-box}
  body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;margin:0}
  main{max-width:820px;margin:0 auto;padding:32px 20px 60px}
  nav[aria-label="fil"]{font-size:13px;color:#64748b;margin-bottom:18px}
  nav[aria-label="fil"] a{color:#1e3a8a;text-decoration:none}
  h1{font-size:30px;font-weight:900;letter-spacing:-0.02em;margin:0 0 8px}
  .lead{font-size:17px;color:#475569;margin:0 0 18px}
  h2{font-size:18px;font-weight:800;margin:28px 0 10px}
  p{margin:0 0 14px}
  .cta{display:inline-block;background:#1e3a8a;color:#fff;padding:11px 22px;border-radius:10px;text-decoration:none;font-weight:700;margin:12px 0}
  details{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:10px}
  details summary{cursor:pointer;font-weight:700}
  ul{padding-left:20px}
  a{color:#1e3a8a}
  .react-cta{display:inline-block;margin-top:10px;padding:8px 14px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;text-decoration:none;color:#1e3a8a;font-weight:600;font-size:14px}
</style>
</head>
<body>
<main>
  <nav aria-label="fil"><a href="${business.baseUrl}">CITURBAREA</a> › <a href="${business.pathPrefix}">Services</a> › ${esc(svc.name)} › ${esc(loc.name)}</nav>

  <h1>${esc(svc.name)} à ${esc(loc.name)}</h1>
  <p class="lead">${esc(svc.summary)}</p>
  <p>${esc(svc.detail)} À ${esc(loc.name)}, je vous accompagne avec une connaissance fine du territoire et de sa réglementation.</p>

  <p><a class="cta" href="${business.baseUrl}#contact">Discuter de mon projet à ${esc(loc.name)}</a></p>

  <h2>${esc(svc.name)} à ${esc(loc.name)} : contexte local</h2>
  <p>${esc(ov.localContext)}</p>
  ${ov.localProof ? `<p><strong>Réalisations :</strong> ${esc(ov.localProof)}</p>` : ""}

  <p><a class="react-cta" href="${villeReactUrl}">Découvrir tous les services à ${esc(loc.name)} →</a></p>

  <section aria-label="faq">
    <h2>Questions fréquentes</h2>
    <details><summary>Proposez-vous ce service à ${esc(loc.name)} ?</summary><p>Oui, ${esc(svc.summary.toLowerCase())} à ${esc(loc.name)} et dans tout le corridor Rabat-Kénitra.</p></details>
    <details><summary>Comment commencer ?</summary><p>Un premier échange cadre le projet et vérifie la faisabilité réglementaire à ${esc(loc.name)}.</p></details>
  </section>

  ${otherSvcPersonalized.length ? `<section><h2>Autres prestations à ${esc(loc.name)}</h2><ul>${otherSvcPersonalized.join("")}</ul></section>` : ""}
  ${otherLocPersonalized.length ? `<section><h2>${esc(svc.name)} dans d'autres villes</h2><ul>${otherLocPersonalized.join("")}</ul></section>` : ""}
</main>
</body>
</html>`;
}

// ─────────────────────────── génération ───────────────────────────
const published = [];
const skipped = [];
for (const svc of services) {
  for (const loc of localities) {
    const key = `${svc.slug}__${loc.slug}`;
    const ov = overrides[key];
    if (!ov || !ov.localContext) {
      skipped.push({ key, reason: "no-override" });
      continue;
    }
    const html = pageHtml(svc, loc, ov);
    const file = path.join(PAGES_DIR, `${svc.slug}-${loc.slug}.html`);
    fs.writeFileSync(file, html);
    published.push({ url: urlFor(svc, loc), full: fullUrl(svc, loc), service: svc.name, locality: loc.name, key });
  }
}

// ─────────────────────────── sitemap-services.xml ───────────────────
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${published
  .map(
    (p) => `  <url>
    <loc>${p.full}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="${p.full}"/>
    <xhtml:link rel="alternate" hreflang="ar" href="${business.baseUrl}/ar${p.url}"/>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap-services.xml"), sitemap);

// NB : llms.txt N'EST PAS régénéré ici — un llms.txt plateforme déjà
// comprehensif existe sous apps/web/public/llms.txt (couvre les 6 portes,
// MRE, OPCI, etc.). Le mettre à jour manuellement pour mentionner les pages
// locales publiées si besoin.

// ─── manifest pour le React (rel=canonical anti-cannibalisation) ───
// Liste des pages service×ville publiées, importée par VilleLanding et la
// home pour pointer canonical vers la page statique quand elle existe.
const MANIFEST_DIR = path.join(WEB_ROOT, "src", "seo");
fs.mkdirSync(MANIFEST_DIR, { recursive: true });
fs.writeFileSync(
  path.join(MANIFEST_DIR, "published.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString().slice(0, 10), // jour seulement (idempotent dans la journée)
      baseUrl: business.baseUrl,
      pathPrefix: business.pathPrefix,
      cells: published.map((p) => ({
        service: p.key.split("__")[0],
        locality: p.key.split("__")[1],
        url: p.url,
        full: p.full,
      })),
    },
    null,
    2,
  ),
);

// ─────────────────────────── rapport console ───────────────────────
const total = services.length * localities.length;
console.log("\n  CITURBAREA — build:seo  ────────────────────────────────");
console.log(`  Services × villes      : ${services.length} × ${localities.length} = ${total} cellules`);
console.log(`  Pages publiées         : ${published.length} (avec override réel)`);
console.log(`  Cellules sans override : ${skipped.length} (non publiées — garde-fou #1)`);
console.log(`  Sortie                 : apps/web/public/services/*.html + sitemap-services.xml`);
console.log(`                           + apps/web/src/seo/published.json (manifest anti-cannibal.)`);
console.log("  ────────────────────────────────────────────────────────\n");
