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
import { transform } from "esbuild";

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

// ════════════════════════════════════════════════════════════════════
// PAGES PORTES P1–P6 (FR) — prérender au build des landings éditoriales
// ════════════════════════════════════════════════════════════════════
// Source unique : apps/web/src/ui/seo/portes.data.ts (consommé aussi par le
// composant React PorteLanding). On transpile le TS en mémoire via esbuild
// pour éviter toute duplication/dérive de contenu.
// Sortie : public/fr/<slugFr>/index.html → servi tel quel par nginx
// (try_files $uri/) AVANT le fallback SPA. EN/AR différés tant que le
// contenu n'est pas traduit (garde-fou anti-thin/duplicate content).
const AREA_SERVED = ["Kénitra", "Mehdiya", "Sidi Taibi", "Salé", "Rabat", "Témara", "Harhoura"];

async function loadPortes() {
  const tsPath = path.join(WEB_ROOT, "src", "ui", "seo", "portes.data.ts");
  const ts = fs.readFileSync(tsPath, "utf8");
  const { code } = await transform(ts, { loader: "ts", format: "esm" });
  const mod = await import("data:text/javascript;base64," + Buffer.from(code, "utf8").toString("base64"));
  return mod.PORTES || [];
}

function porteServiceSchema(p, url) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: `${p.titleFr} — CITURBAREA`,
    serviceType: p.titleFr,
    description: p.subtitleFr,
    url,
    provider: {
      "@type": "Organization",
      name: "CITURBAREA",
      url: business.baseUrl,
      founder: { "@type": "Person", name: business.founder, jobTitle: business.founderTitle },
    },
    areaServed: [
      { "@type": "Country", name: "Maroc" },
      ...AREA_SERVED.map((c) => ({ "@type": "City", name: c })),
    ],
    inLanguage: "fr-MA",
  };
}

function porteFaqSchema(p) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (p.faqs || []).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

function porteBreadcrumbSchema(p, url) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: business.baseUrl },
      { "@type": "ListItem", position: 2, name: p.titleFr, item: url },
    ],
  };
}

function portePageHtml(p, allPortes) {
  const url = `${business.baseUrl}/fr/${p.slugFr}`;
  // Titre ≤ ~60 car. (au-delà, Google tronque). Marque courte si ça rentre.
  const withBrand = `${p.titleFr} | CITURBAREA`;
  const title = withBrand.length <= 62 ? withBrand : String(p.titleFr).slice(0, 60).trim();
  // Meta description 90–158 car. : on complète si le sous-titre est court.
  let d = String(p.subtitleFr || "").trim();
  if (d.length < 90) d = `${d} — CITURBAREA, plateforme marocaine d'architecture, d'urbanisme et de gestion de projets BTP au Maroc.`.trim();
  const desc = esc(d.slice(0, 158));
  const otherPortes = allPortes
    .filter((o) => o.num !== p.num)
    .map((o) => `<li><a href="/fr/${o.slugFr}">${o.icon} ${esc(o.titleFr)}</a></li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fr" href="${url}">
<link rel="alternate" hreflang="ar" href="${business.baseUrl}/ar/${p.slugAr}">
<link rel="alternate" hreflang="en" href="${business.baseUrl}/en/${p.slugEn}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(p.titleFr)} — CITURBAREA">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CITURBAREA">
<meta property="og:locale" content="fr_MA">
<meta property="og:image" content="${business.image || business.baseUrl + "/og-default.png"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.titleFr)} — CITURBAREA">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${business.image || business.baseUrl + "/og-default.png"}">
<script type="application/ld+json">${JSON.stringify(porteServiceSchema(p, url))}</script>
<script type="application/ld+json">${JSON.stringify(porteFaqSchema(p))}</script>
<script type="application/ld+json">${JSON.stringify(porteBreadcrumbSchema(p, url))}</script>
<style>
  *{box-sizing:border-box}
  body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8eaf0;background:#080d14;margin:0}
  a{color:#60a5fa;text-decoration:none}
  main{max-width:880px;margin:0 auto;padding:32px 22px 64px}
  nav[aria-label="fil"]{font-size:13px;color:#4a5568;margin-bottom:18px}
  .badge{display:inline-block;background:#1a2a4a;color:#60a5fa;border-radius:6px;padding:4px 12px;font-size:13px;font-weight:700;margin-bottom:14px}
  h1{font-size:32px;font-weight:900;letter-spacing:-.02em;line-height:1.2;margin:0 0 12px}
  .lead{font-size:17px;color:#9aa6bd;margin:0 0 26px}
  h2{font-size:20px;font-weight:800;margin:34px 0 14px}
  .cta{display:inline-block;background:#1d4ed8;color:#fff;padding:13px 26px;border-radius:9px;font-weight:700;margin:8px 0 4px}
  .grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
  .card{background:#111827;border:1px solid #1e2330;border-radius:10px;padding:16px}
  .card h3{font-size:15px;font-weight:700;margin:0 0 6px}
  .card p{font-size:13px;color:#8892a4;margin:0}
  .etape{display:flex;gap:14px;margin-bottom:16px}
  .num{background:#1d4ed8;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0}
  ul.plain{list-style:none;padding:0}
  ul.plain li{background:#111827;border:1px solid #1e2330;border-radius:8px;padding:11px 14px;margin-bottom:8px}
  details{background:#111827;border:1px solid #1e2330;border-radius:8px;padding:12px 16px;margin-bottom:8px}
  details summary{cursor:pointer;font-weight:600}
  details p{color:#9aa6bd;font-size:14px;margin:8px 0 0}
  footer{border-top:1px solid #1a2234;margin-top:48px;padding-top:24px;color:#3d4f6a;font-size:13px}
</style>
</head>
<body>
<main>
  <nav aria-label="fil"><a href="${business.baseUrl}">CITURBAREA</a> › ${esc(p.titleFr)}</nav>
  <div class="badge">${p.icon} PORTE ${p.num}</div>
  <h1>${esc(p.heroFr)}</h1>
  <p class="lead">${esc(p.subtitleFr)}</p>
  <p><a class="cta" href="${p.appPath}">Démarrer mon projet →</a></p>

  <h2>${esc(p.titleFr)}</h2>
  <div class="grid">
    ${(p.sousTypes || []).map((st) => `<div class="card"><h3>${st.icon} ${esc(st.title)}</h3><p>${esc(st.desc)}</p></div>`).join("")}
  </div>

  <h2>Cette porte est faite pour vous si…</h2>
  <ul class="plain">${(p.pourQui || []).map((q) => `<li>✓ ${esc(q)}</li>`).join("")}</ul>

  <h2>Comment ça se passe, étape par étape</h2>
  ${(p.etapes || []).map((e) => `<div class="etape"><div class="num">${e.num}</div><div><strong>${esc(e.title)}</strong><br><span style="color:#8892a4;font-size:14px">${esc(e.desc)}</span></div></div>`).join("")}

  <h2>Questions fréquentes</h2>
  ${(p.faqs || []).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}

  <h2>Les 6 portes CITURBAREA</h2>
  <ul class="plain">${otherPortes}</ul>

  <p><a class="cta" href="${p.appPath}">Démarrer ${p.icon} →</a></p>

  <footer>
    <strong style="color:#e8eaf0">CITURBAREA</strong> — Plateforme nationale de gestion de projets architecturaux et immobiliers au Maroc.<br>
    Cabinet fondateur : ${esc(business.founder)}, ${esc(business.founderTitle)} — Kénitra, Maroc.<br>
    © 2026 CITURBAREA · <a href="${business.baseUrl}">citurbarea.com</a>
  </footer>
</main>
</body>
</html>`;
}

const PORTES = await loadPortes();
const portesDir = path.join(PUBLIC_DIR, "fr");
fs.mkdirSync(portesDir, { recursive: true });
// Nettoyage : on supprime les anciennes pages portes (fichiers .html plats ET
// anciens dossiers <slug>/index.html) pour ne laisser aucun obsolète.
for (const f of fs.readdirSync(portesDir)) {
  const full = path.join(portesDir, f);
  if (f.endsWith(".html")) fs.unlinkSync(full);
  else if (fs.statSync(full).isDirectory()) fs.rmSync(full, { recursive: true, force: true });
}
// URLs propres SANS slash final ni redirection : fichiers plats public/fr/<slug>.html
// servis par nginx via `try_files $uri $uri.html`. L'URL servie (200) == canonical
// == route React → aucune redirection 301, aucun port:8080 qui fuite.
const portePublished = [];
for (const p of PORTES) {
  fs.writeFileSync(path.join(portesDir, `${p.slugFr}.html`), portePageHtml(p, PORTES));
  portePublished.push({ full: `${business.baseUrl}/fr/${p.slugFr}`, ar: `${business.baseUrl}/ar/${p.slugAr}`, title: p.titleFr });
}

// sitemap-portes.xml (à déclarer dans robots.txt — étape SEO technique)
const sitemapPortes = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${portePublished
  .map(
    (p) => `  <url>
    <loc>${p.full}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="${p.full}"/>
    <xhtml:link rel="alternate" hreflang="ar" href="${p.ar}"/>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap-portes.xml"), sitemapPortes);

// ─────────────────────────── rapport console ───────────────────────
const total = services.length * localities.length;
console.log("\n  CITURBAREA — build:seo  ────────────────────────────────");
console.log(`  Services × villes      : ${services.length} × ${localities.length} = ${total} cellules`);
console.log(`  Pages publiées         : ${published.length} (avec override réel)`);
console.log(`  Cellules sans override : ${skipped.length} (non publiées — garde-fou #1)`);
console.log(`  Sortie                 : apps/web/public/services/*.html + sitemap-services.xml`);
console.log(`                           + apps/web/src/seo/published.json (manifest anti-cannibal.)`);
console.log(`  Pages portes (FR)      : ${portePublished.length} → public/fr/<slug>.html (clean URL) + sitemap-portes.xml`);
console.log("  ────────────────────────────────────────────────────────\n");
