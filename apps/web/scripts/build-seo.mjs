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

// ════════════════════════════════════════════════════════════════════
// PAGES VILLES (hubs SEO local) — /architecte-<slug>.html
// Contenu UNIQUE par ville (anti duplicate-content) + LocalBusiness schema.
// Servi par nginx via try_files $uri.html AVANT le fallback SPA.
// ════════════════════════════════════════════════════════════════════
const VILLE_HUBS = [
  { slug: "kenitra", name: "Kénitra", region: "Rabat-Salé-Kénitra", lat: 34.2610, lng: -6.5802,
    intro: "Capitale de la région du Gharb, Kénitra conjugue essor industriel, port de commerce et forte demande résidentielle. Concevoir et bâtir à Kénitra suppose une bonne maîtrise du plan d'aménagement communal, des zones inondables proches de l'oued Sebou et des règles de l'agence urbaine de Kénitra-Sidi Kacem.",
    atouts: "Terrains encore accessibles dans le corridor, dynamique de lotissements neufs, proximité de Rabat (40 min). Je vous accompagne du choix du terrain à la réception, en tenant compte des contraintes locales (nappe phréatique, servitudes agricoles, PA en vigueur)." },
  { slug: "sale", name: "Salé", region: "Rabat-Salé-Kénitra", lat: 34.0531, lng: -6.7985,
    intro: "Ville jumelle de Rabat, Salé connaît une expansion résidentielle soutenue (Sala Al Jadida, Hay Karima, Bettana). Construire à Salé demande de composer avec un tissu urbain dense, la préservation de la médina classée et les prescriptions de l'agence urbaine de Rabat-Salé.",
    atouts: "Foncier plus abordable qu'à Rabat pour une même accessibilité. Villas, immeubles R+4 et projets mixtes : j'optimise la constructibilité (CES/COS) tout en sécurisant l'autorisation de construire." },
  { slug: "rabat", name: "Rabat", region: "Rabat-Salé-Kénitra", lat: 34.0209, lng: -6.8416,
    intro: "Capitale administrative du Maroc et ville classée au patrimoine mondial, Rabat impose des exigences architecturales et réglementaires élevées (hauteurs, façades, secteurs sauvegardés). Un projet à Rabat se gagne sur la qualité du dossier et la connaissance fine des servitudes.",
    atouts: "Standing, réhabilitation et projets haut de gamme : je pilote la conception, le BET et le suivi pour un rendu à la hauteur des attentes de la capitale, dans le respect strict du règlement d'urbanisme." },
  { slug: "temara", name: "Témara", region: "Rabat-Salé-Kénitra", lat: 33.9287, lng: -6.9067,
    intro: "Pôle résidentiel au sud de Rabat, Témara (Harhoura, Guich Oudaya, Massira) attire une clientèle en quête de villas et de cadre balnéaire. La pression foncière y est forte et les règles de lotissement strictes.",
    atouts: "Spécialiste des villas et maisons individuelles sur le littoral de Témara : implantation optimisée, sous-sol, prestations de standing, et gestion des contraintes de recul et de vue mer." },
  { slug: "mohammedia", name: "Mohammedia", region: "Casablanca-Settat", lat: 33.6866, lng: -7.3830,
    intro: "Entre Rabat et Casablanca, Mohammedia allie front de mer, tissu industriel et quartiers résidentiels de standing. Construire à Mohammedia implique de composer avec les zones portuaires/industrielles et un plan d'aménagement orienté qualité de vie.",
    atouts: "Villas balnéaires, immeubles et projets mixtes : j'accompagne les particuliers et promoteurs sur un marché recherché, en sécurisant l'autorisation auprès des services communaux et de l'agence urbaine." },
  { slug: "casablanca", name: "Casablanca", region: "Casablanca-Settat", lat: 33.5731, lng: -7.5898,
    intro: "Métropole économique du Maroc, Casablanca concentre la promotion immobilière, les immeubles de rapport et les projets mixtes à forte densité. Y construire exige une lecture experte du règlement d'urbanisme, des hauteurs autorisées et du stationnement.",
    atouts: "Immeubles résidentiels, RDC commerciaux, surélévations et rénovations : j'optimise la constructibilité et la rentabilité de votre foncier casablancais, du permis à la livraison, avec BET et bureau de contrôle." },
  { slug: "tanger", name: "Tanger", region: "Tanger-Tétouan-Al Hoceïma", lat: 35.7595, lng: -5.8340,
    intro: "Portée par Tanger Med et sa zone franche, Tanger vit un boom immobilier (Malabata, Boubana, Marchan) porté par les investisseurs et les MRE. Un projet à Tanger se construit avec la topographie en pente et les prescriptions de l'agence urbaine de Tanger.",
    atouts: "Villas avec vue mer, immeubles et investissements locatifs : je gère la conception, les études (dont géotechnique en terrain pentu) et le suivi, à distance ou sur place, pour une clientèle souvent non résidente." },
];

// Quartiers desservis par ville (contenu local unique — anti-duplicate + géo-signal).
const QUARTIERS = {
  kenitra: "Maâmora, Bir Rami, Ouled Oujih, Val Fleuri, Mimosas, Saknia, Bassatine",
  sale: "Sala Al Jadida, Hay Karima, Bettana, Tabriquet, Hay Salam, Said Hajji",
  rabat: "Agdal, Hay Riad, Souissi, Hassan, L'Océan, Yacoub El Mansour, Aviation",
  temara: "Harhoura, Guich Oudaya, Massira, Wifak, Firdaous, Ain Atiq",
  mohammedia: "El Alia, Parc, El Wahda, Hassania, La Kasbah, Beausite",
  casablanca: "Maârif, Ain Diab, Californie, Bourgogne, Sidi Maârouf, Anfa, Oulfa",
  tanger: "Malabata, Marchan, Boubana, Iberia, California, Achakar, Branes",
};

function villeHubSchema(h, url) {
  return {
    "@context": "https://schema.org", "@type": "ProfessionalService",
    "@id": `${url}#business`, name: `${business.name} — Architecte à ${h.name}`,
    url, image: business.image, logo: business.logo, priceRange: business.priceRange,
    telephone: business.phone,
    description: `${business.name} (${business.founder}), architecte : conception, permis de construire et suivi de chantier à ${h.name} et dans la région ${h.region}. Cabinet basé à Kénitra.`,
    areaServed: { "@type": "City", name: h.name },
    geo: { "@type": "GeoCoordinates", latitude: business.hq.lat, longitude: business.hq.lng },
    address: { "@type": "PostalAddress", streetAddress: business.hq.streetAddress, addressLocality: business.hq.locality, addressRegion: business.hq.region, postalCode: business.hq.postalCode, addressCountry: business.hq.country },
    founder: { "@type": "Person", name: business.founder, jobTitle: business.founderTitle },
    sameAs: business.sameAs,
  };
}
function villeHubFaq(h) {
  const q = QUARTIERS[h.slug] || "";
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
    { "@type": "Question", name: `Faut-il un architecte pour construire à ${h.name} ?`, acceptedAnswer: { "@type": "Answer", text: `Oui. Au Maroc, le recours à un architecte inscrit à l'Ordre national (CNOA) est obligatoire pour toute demande d'autorisation de construire, y compris à ${h.name}.` } },
    { "@type": "Question", name: `Combien coûte un architecte à ${h.name} ?`, acceptedAnswer: { "@type": "Answer", text: `Les honoraires d'architecte se calculent en pourcentage du coût des travaux (barème CNOA), généralement autour de 5%. Le montant exact dépend de la surface, du standing et de la mission. Vous pouvez estimer votre budget avec le simulateur CITURBAREA avant tout engagement.` } },
    { "@type": "Question", name: `Combien de temps pour obtenir un permis de construire à ${h.name} ?`, acceptedAnswer: { "@type": "Answer", text: `À ${h.name}, le délai d'instruction d'une autorisation de construire varie selon la nature du projet et la commune, généralement de 1 à 3 mois après dépôt d'un dossier complet et conforme au plan d'aménagement.` } },
    { "@type": "Question", name: `Quels documents pour construire à ${h.name} ?`, acceptedAnswer: { "@type": "Answer", text: `Titre foncier ou attestation de propriété, plan cadastral, note de renseignements, et le dossier d'architecte (plans + formulaires). L'architecte constitue et dépose le dossier auprès des services de la commune de ${h.name}.` } },
    { "@type": "Question", name: `Quels quartiers de ${h.name} couvrez-vous ?`, acceptedAnswer: { "@type": "Answer", text: `J'interviens dans tous les quartiers de ${h.name}${q ? ` : ${q}` : ""}, ainsi que dans la région ${h.region}.` } },
    { "@type": "Question", name: `Intervenez-vous sur tout ${h.region} ?`, acceptedAnswer: { "@type": "Answer", text: `Oui, j'interviens à ${h.name} et dans toute la région ${h.region}, en présentiel ou avec un suivi à distance selon vos besoins.` } },
  ] };
}
function villeHubHtml(h, portes) {
  const url = `${business.baseUrl}/architecte-${h.slug}`;
  const title = `Architecte à ${h.name} | CITURBAREA`;
  const desc = esc(`Architecte à ${h.name} : conception, permis de construire, suivi de chantier et expertise. ${business.founder}, région ${h.region}. Devis et accompagnement de A à Z.`.slice(0, 158));
  const portesLi = portes.map((p) => `<li><a href="/fr/${p.slugFr}">${p.icon} ${esc(p.titleFr)}</a></li>`).join("");
  const otherVilles = VILLE_HUBS.filter((v) => v.slug !== h.slug).map((v) => `<a href="/architecte-${v.slug}">${esc(v.name)}</a>`).join(" · ");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fr" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CITURBAREA">
<meta property="og:locale" content="fr_MA">
<meta property="og:image" content="${business.image || business.baseUrl + "/og-default.png"}">
<script type="application/ld+json">${JSON.stringify(villeHubSchema(h, url))}</script>
<script type="application/ld+json">${JSON.stringify(villeHubFaq(h))}</script>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Accueil", item: business.baseUrl }, { "@type": "ListItem", position: 2, name: `Architecte à ${h.name}`, item: url }] })}</script>
<style>
  *{box-sizing:border-box}
  body{font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;margin:0}
  main{max-width:820px;margin:0 auto;padding:32px 20px 60px}
  nav[aria-label="fil"]{font-size:13px;color:#64748b;margin-bottom:18px}
  a{color:#1e3a8a}
  h1{font-size:30px;font-weight:900;letter-spacing:-.02em;margin:0 0 10px}
  .lead{font-size:17px;color:#475569;margin:0 0 20px}
  h2{font-size:19px;font-weight:800;margin:30px 0 12px}
  p{margin:0 0 14px}
  .cta{display:inline-block;background:#1e3a8a;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;margin:8px 0}
  ul.services{list-style:none;padding:0}
  ul.services li{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:8px}
  ul.services li a{text-decoration:none;font-weight:600}
  details{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:8px}
  details summary{cursor:pointer;font-weight:700}
  footer{border-top:1px solid #e2e8f0;margin-top:44px;padding-top:22px;color:#64748b;font-size:13px}
  .villes{font-size:13.5px;line-height:2}
</style>
</head>
<body>
<main>
  <nav aria-label="fil"><a href="${business.baseUrl}">CITURBAREA</a> › Architecte à ${esc(h.name)}</nav>
  <h1>Architecte à ${esc(h.name)}</h1>
  <p class="lead">${esc(business.founder)}, architecte — conception, permis de construire, expertise et suivi de chantier à ${esc(h.name)} et dans la région ${esc(h.region)}.</p>
  <p>${esc(h.intro)}</p>
  <p><a class="cta" href="${business.baseUrl}#contact">Discuter de mon projet à ${esc(h.name)}</a></p>

  <h2>Nos services d'architecture à ${esc(h.name)}</h2>
  <ul class="services">${portesLi}</ul>

  <h2>Construire à ${esc(h.name)} : ce qu'il faut savoir</h2>
  <p>${esc(h.atouts)}</p>
  ${QUARTIERS[h.slug] ? `<p><strong>Quartiers desservis à ${esc(h.name)} :</strong> ${esc(QUARTIERS[h.slug])}.</p>` : ""}

  <h2>Combien coûte un architecte à ${esc(h.name)} ?</h2>
  <p>Les honoraires se calculent en pourcentage du coût des travaux (barème CNOA, ~5% selon la mission). Le montant dépend de la surface, du standing et de l'étendue de l'accompagnement. Estimez votre budget en quelques clics avec le <a href="/simulateur">simulateur de coût de construction</a>, puis affinez lors d'un premier échange.</p>

  <h2>Guides utiles</h2>
  <ul class="services">
    <li><a href="/guide/prix-construction-villa-maroc">Prix de construction d'une villa au Maroc</a></li>
    <li><a href="/guide/permis-de-construire-maroc">Permis de construire : documents, étapes et délais</a></li>
    <li><a href="/guide/honoraires-architecte-maroc">Combien coûte un architecte au Maroc ?</a></li>
    <li><a href="/guide/etapes-construction-maison-maroc">Les étapes pour construire sa maison au Maroc</a></li>
  </ul>

  <h2>Questions fréquentes — architecte à ${esc(h.name)}</h2>
  <details><summary>Faut-il un architecte pour construire à ${esc(h.name)} ?</summary><p>Oui : au Maroc, l'architecte inscrit à l'Ordre (CNOA) est obligatoire pour toute autorisation de construire, y compris à ${esc(h.name)}.</p></details>
  <details><summary>Combien de temps pour un permis de construire à ${esc(h.name)} ?</summary><p>Généralement 1 à 3 mois après dépôt d'un dossier complet et conforme au plan d'aménagement de ${esc(h.name)}.</p></details>
  <details><summary>Quels documents faut-il fournir ?</summary><p>Titre foncier, plan cadastral, note de renseignements et le dossier d'architecte. Je constitue et dépose le tout auprès de la commune de ${esc(h.name)}.</p></details>
  <details><summary>Intervenez-vous dans tous les quartiers de ${esc(h.name)} ?</summary><p>Oui${QUARTIERS[h.slug] ? ` — ${esc(QUARTIERS[h.slug])}` : ""}, et dans toute la région ${esc(h.region)}, en présentiel ou à distance.</p></details>

  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-top:32px">
    <strong style="color:#0f172a;font-size:16px">${esc(business.name)}</strong> — ${esc(business.founder)}, architecte<br>
    📍 ${esc(business.hq.streetAddress)}, ${esc(business.hq.locality)}<br>
    ☎ <a href="tel:${business.phone}">${business.phone}</a> · WhatsApp <a href="https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}">${business.whatsapp}</a><br>
    <span style="font-size:13.5px">${["facebook", "instagram", "youtube", "linkedin", "tiktok"].filter((k) => business.social && business.social[k]).map((k) => `<a href="${business.social[k]}" rel="noopener" style="color:#1e3a8a;text-decoration:none">${k[0].toUpperCase() + k.slice(1)}</a>`).join(" · ")}</span>
  </div>
  <footer>
    <strong>Architecte dans d'autres villes :</strong> <span class="villes">${otherVilles}</span><br><br>
    <strong style="color:#0f172a">${esc(business.name)}</strong> — cabinet basé à Kénitra, sur la plateforme <a href="${business.baseUrl}">CITURBAREA</a>.<br>
    © 2026 CITURBAREA · <a href="${business.baseUrl}">citurbarea.com</a>
  </footer>
</main>
</body>
</html>`;
}

const villeHubsPublished = [];
for (const h of VILLE_HUBS) {
  fs.writeFileSync(path.join(PUBLIC_DIR, `architecte-${h.slug}.html`), villeHubHtml(h, PORTES));
  villeHubsPublished.push({ full: `${business.baseUrl}/architecte-${h.slug}`, name: h.name });
}
const sitemapVilles = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${villeHubsPublished.map((v) => `  <url>\n    <loc>${v.full}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap-villes.xml"), sitemapVilles);

// ════════════════════════════════════════════════════════════════════
// PAGES GUIDES (longue-traîne à forte intention) — /guide/<slug>.html
// Contenu éditorial réel + Article + FAQPage + Breadcrumb schema.
// ════════════════════════════════════════════════════════════════════
const GUIDES = [
  {
    slug: "prix-construction-villa-maroc",
    title: "Prix de construction d'une villa au Maroc (2026) — coût au m²",
    h1: "Combien coûte la construction d'une villa au Maroc en 2026 ?",
    desc: "Prix de construction d'une villa au Maroc en 2026 : coût au m² par niveau de standing (de 2 500 à 14 000 DH/m²), ce qui fait varier le budget et ce qu'il n'inclut pas.",
    intro: "Le coût de construction d'une villa au Maroc dépend surtout du <strong>niveau de finition (standing)</strong>, de la <strong>surface plancher</strong> et de la région. En 2026, comptez entre <strong>2 500 et 14 000 DH/m²</strong>. Voici une grille claire pour cadrer votre budget avant de vous lancer.",
    body: `
      <h2>Coût de construction au m² par standing</h2>
      <table>
        <tr><th>Standing</th><th>DH / m²</th><th>Villa 150 m²</th></tr>
        <tr><td>Très économique</td><td>2 500 – 3 500</td><td>375 000 – 525 000 DH</td></tr>
        <tr><td>Moyen standing</td><td>4 000 – 5 200</td><td>600 000 – 780 000 DH</td></tr>
        <tr><td>Standing</td><td>5 500 – 7 000</td><td>825 000 – 1 050 000 DH</td></tr>
        <tr><td>Haut standing</td><td>7 500 – 9 500</td><td>1 125 000 – 1 425 000 DH</td></tr>
        <tr><td>Luxe / Premium</td><td>10 000 – 14 000</td><td>1 500 000 – 2 100 000 DH</td></tr>
      </table>
      <p><a class="cta" href="/simulateur">Estimer précisément mon budget →</a></p>

      <h2>Ce qui fait varier le prix</h2>
      <ul>
        <li><strong>Les finitions</strong> (carrelage, menuiserie, façade, sanitaire) : le principal levier — un marbre ou une façade en pierre double certains lots.</li>
        <li><strong>Un sous-sol</strong> : excavation + structure = surface supplémentaire facturée.</li>
        <li><strong>Le terrain</strong> : pente forte, mauvais sol → fondations et voile de soutènement plus lourds.</li>
        <li><strong>La région</strong> : coût de la main-d'œuvre et des matériaux variable (corridor Rabat-Kénitra, Casablanca, Tanger…).</li>
      </ul>

      <h2>Ce que ce prix n'inclut PAS</h2>
      <p>Le prix au m² couvre le gros œuvre et le second œuvre, mais <strong>pas</strong> : le terrain, les honoraires d'architecte et de BET, les taxes et frais d'autorisation (taxe sur opérations de construction, agence urbaine, occupation du domaine public), les raccordements officiels (eau, électricité, égout), la cuisine équipée, le mobilier et les VRD lourds.</p>
    `,
    faq: [
      ["Combien coûte une villa de 200 m² au Maroc ?", "Pour 200 m² de plancher, comptez de 500 000 DH (très économique) à plus de 2 000 000 DH (luxe), hors terrain et honoraires. Le standard/haut standing se situe autour de 1,1 à 1,9 million de DH."],
      ["Le prix inclut-il l'architecte ?", "Non. Les honoraires d'architecte (≈ 5 % du coût des travaux, barème CNOA) s'ajoutent au coût de construction, tout comme le BET et les taxes."],
      ["Comment réduire le coût de construction ?", "En choisissant un standing de finition adapté, en optimisant la surface et le plan, et en composant les lots (le simulateur CITURBAREA permet de tester chaque option et de voir le budget en direct)."],
    ],
  },
  {
    slug: "permis-de-construire-maroc",
    title: "Permis de construire au Maroc : documents, étapes, délais et coût",
    h1: "Permis de construire au Maroc : documents, étapes et délais",
    desc: "Comment obtenir un permis de construire (autorisation de construire) au Maroc : documents à fournir, étapes du dépôt, délais d'instruction et taxes à prévoir.",
    intro: "Au Maroc, toute construction neuve nécessite une <strong>autorisation de construire</strong> délivrée par la commune, sur la base d'un dossier établi par un <strong>architecte inscrit à l'Ordre (CNOA)</strong>. Voici le parcours complet.",
    body: `
      <h2>Documents à fournir</h2>
      <ul>
        <li>Titre foncier ou attestation de propriété</li>
        <li>Plan cadastral et note de renseignements</li>
        <li>Dossier d'architecte : plans (masse, façades, coupes), formulaires réglementaires</li>
        <li>Selon le projet : étude de sol (géotechnique), avis du BET, note de calcul</li>
      </ul>

      <h2>Étapes et délais</h2>
      <ol>
        <li><strong>Conception</strong> par l'architecte + validation avec vous.</li>
        <li><strong>Dépôt</strong> du dossier auprès des services de la commune (guichet unique / agence urbaine).</li>
        <li><strong>Instruction</strong> par les services (voirie, régie, protection civile…) : généralement <strong>1 à 3 mois</strong> pour un dossier complet et conforme au plan d'aménagement.</li>
        <li><strong>Obtention</strong> de l'autorisation, puis démarrage du chantier.</li>
      </ol>

      <h2>Taxes et frais à prévoir</h2>
      <p>Taxe sur les opérations de construction (≈ 20 à 40 DH/m² selon la commune), participation à l'agence urbaine (≈ 3,6 DH/m²), occupation du domaine public pour le chantier, avis de la protection civile. <strong>Important :</strong> réglez votre <strong>taxe sur le terrain non bâti (TNB)</strong> en amont — un arriéré peut bloquer l'obtention de l'autorisation.</p>
    `,
    faq: [
      ["Peut-on construire sans architecte au Maroc ?", "Non. Le recours à un architecte inscrit à l'Ordre national (CNOA) est obligatoire pour toute demande d'autorisation de construire."],
      ["Combien de temps pour obtenir un permis de construire ?", "En général 1 à 3 mois après dépôt d'un dossier complet, selon la commune et la nature du projet."],
      ["Que risque-t-on à construire sans autorisation ?", "Une construction sans autorisation est illégale : arrêt de chantier, amendes, voire démolition, et impossibilité de régulariser ou de raccorder officiellement."],
    ],
  },
  {
    slug: "honoraires-architecte-maroc",
    title: "Honoraires d'architecte au Maroc : combien ça coûte ?",
    h1: "Combien coûte un architecte au Maroc ? Honoraires et barème",
    desc: "Honoraires d'architecte au Maroc : mode de calcul (pourcentage du coût des travaux, barème CNOA), ce qu'ils couvrent et comment estimer votre budget d'accompagnement.",
    intro: "Les honoraires d'architecte au Maroc se calculent en <strong>pourcentage du coût des travaux</strong> (barème indicatif CNOA), généralement autour de <strong>5 %</strong>. Le montant dépend de la surface, du standing et de l'étendue de la mission.",
    body: `
      <h2>Comment sont calculés les honoraires ?</h2>
      <p>La base = le coût estimé des travaux. Le taux (≈ 5 %) s'y applique. Pour une villa dont la construction est estimée à 1 000 000 DH, comptez donc de l'ordre de 50 000 DH d'honoraires d'architecte, à moduler selon la mission choisie (conception seule, conception + suivi, clé en main).</p>

      <h2>Ce que couvrent les honoraires</h2>
      <ul>
        <li>Conception (esquisse, avant-projet, plans définitifs)</li>
        <li>Constitution et dépôt du dossier d'autorisation</li>
        <li>Selon la mission : dossier d'exécution, consultation des entreprises, suivi de chantier, réception</li>
      </ul>
      <p>À cela s'ajoutent, séparément, le <strong>BET</strong> (structure & fluides, ≈ 2 %), et selon les cas géotechnicien, topographe, bureau de contrôle et laboratoire.</p>
    `,
    faq: [
      ["Les honoraires d'architecte sont-ils négociables ?", "Le barème CNOA est indicatif. Le montant final dépend surtout de l'étendue de la mission ; un premier échange permet de cadrer le périmètre et le budget."],
      ["Peut-on payer l'architecte par étapes ?", "Oui, les honoraires sont généralement échelonnés selon l'avancement (conception, autorisation, exécution, chantier)."],
    ],
  },
  {
    slug: "etapes-construction-maison-maroc",
    title: "Construire sa maison au Maroc : les étapes de A à Z",
    h1: "Construire sa maison au Maroc : les étapes de A à Z",
    desc: "Les étapes pour construire sa maison ou sa villa au Maroc : du terrain à la réception, en passant par l'architecte, le permis, le chantier et le suivi.",
    intro: "Construire au Maroc suit un parcours précis. Voici les <strong>grandes étapes</strong>, de l'acquisition du terrain à la remise des clés.",
    body: `
      <h2>Les 8 étapes clés</h2>
      <ol>
        <li><strong>Le terrain</strong> : vérifier le titre foncier, le zonage et la constructibilité (CES/COS).</li>
        <li><strong>L'architecte</strong> : conception du projet selon votre budget et vos besoins.</li>
        <li><strong>Les études</strong> : BET structure & fluides, étude de sol si nécessaire.</li>
        <li><strong>L'autorisation de construire</strong> : dépôt et instruction du dossier.</li>
        <li><strong>La consultation des entreprises</strong> : chiffrage et sélection.</li>
        <li><strong>Le gros œuvre</strong> : fondations, structure, maçonnerie.</li>
        <li><strong>Le second œuvre & finitions</strong> : électricité, plomberie, revêtements, peinture.</li>
        <li><strong>La réception</strong> : levée des réserves et remise des clés.</li>
      </ol>
      <p>Un <strong>suivi de chantier</strong> (sur place ou à distance par photos) sécurise la qualité et le respect du budget à chaque étape.</p>
    `,
    faq: [
      ["Combien de temps pour construire une villa au Maroc ?", "Comptez généralement 10 à 18 mois entre le dépôt du dossier et la réception, selon la taille du projet et les aléas."],
      ["Par quoi commencer pour construire au Maroc ?", "Par le terrain (vérifier titre + constructibilité) puis l'architecte, qui cadre la faisabilité et le budget avant tout engagement."],
    ],
  },
];

function guidePageHtml(g) {
  const url = `${business.baseUrl}/guide/${g.slug}`;
  const faqHtml = g.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("");
  const articleSchema = { "@context": "https://schema.org", "@type": "Article", headline: g.h1, description: g.desc, inLanguage: "fr-MA", mainEntityOfPage: url, author: { "@type": "Person", name: business.founder, jobTitle: "Architecte DENA", sameAs: business.sameAs }, publisher: { "@type": "Organization", name: "CITURBAREA", logo: { "@type": "ImageObject", url: business.logo } } };
  const faqSchema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: g.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Accueil", item: business.baseUrl }, { "@type": "ListItem", position: 2, name: "Guides", item: `${business.baseUrl}/guide` }, { "@type": "ListItem", position: 3, name: g.h1, item: url }] };
  const otherGuides = GUIDES.filter((x) => x.slug !== g.slug).map((x) => `<li><a href="/guide/${x.slug}">${esc(x.title)}</a></li>`).join("");
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(g.title)} | CITURBAREA</title>
<meta name="description" content="${esc(g.desc.slice(0, 158))}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="fr" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(g.title)}">
<meta property="og:description" content="${esc(g.desc.slice(0, 158))}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="CITURBAREA">
<meta property="og:image" content="${business.image || business.baseUrl + "/og-default.png"}">
<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<style>
  *{box-sizing:border-box}
  body{font:16px/1.65 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;background:#f8fafc;margin:0}
  main{max-width:800px;margin:0 auto;padding:32px 20px 60px}
  nav[aria-label="fil"]{font-size:13px;color:#64748b;margin-bottom:18px}
  a{color:#1e3a8a}
  h1{font-size:30px;font-weight:900;letter-spacing:-.02em;margin:0 0 14px;line-height:1.2}
  .lead{font-size:17px;color:#475569;margin:0 0 22px}
  h2{font-size:20px;font-weight:800;margin:30px 0 12px}
  p{margin:0 0 14px}ul,ol{padding-left:22px;margin:0 0 14px}li{margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14.5px}
  th,td{border:1px solid #e2e8f0;padding:9px 12px;text-align:left}th{background:#f1f5f9;font-weight:700}
  .cta{display:inline-block;background:#1e3a8a;color:#fff;padding:11px 22px;border-radius:10px;text-decoration:none;font-weight:700;margin:8px 0}
  details{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:8px}
  details summary{cursor:pointer;font-weight:700}
  footer{border-top:1px solid #e2e8f0;margin-top:44px;padding-top:22px;color:#64748b;font-size:13px}
</style>
</head>
<body>
<main>
  <nav aria-label="fil"><a href="${business.baseUrl}">CITURBAREA</a> › Guides › ${esc(g.h1)}</nav>
  <h1>${esc(g.h1)}</h1>
  <p class="lead">${g.intro}</p>
  ${g.body}
  <h2>Questions fréquentes</h2>
  ${faqHtml}
  <p style="margin-top:24px"><a class="cta" href="${business.baseUrl}#contact">Discuter de mon projet avec un architecte</a></p>
  <footer>
    <strong>Autres guides :</strong>
    <ul>${otherGuides}</ul>
    <strong style="color:#0f172a">${esc(business.name)}</strong> — ${esc(business.founder)}, architecte à Kénitra · <a href="${business.baseUrl}">citurbarea.com</a>
  </footer>
</main>
</body>
</html>`;
}

const guidesDir = path.join(PUBLIC_DIR, "guide");
fs.mkdirSync(guidesDir, { recursive: true });
for (const f of fs.readdirSync(guidesDir)) if (f.endsWith(".html")) fs.unlinkSync(path.join(guidesDir, f));
const guidesPublished = [];
for (const g of GUIDES) {
  fs.writeFileSync(path.join(guidesDir, `${g.slug}.html`), guidePageHtml(g));
  guidesPublished.push({ full: `${business.baseUrl}/guide/${g.slug}`, title: g.title });
}
const sitemapGuides = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${guidesPublished.map((x) => `  <url>\n    <loc>${x.full}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(PUBLIC_DIR, "sitemap-guides.xml"), sitemapGuides);

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
