/**
 * Pages publiques Cercles servies aux moteurs (titre, description, canonique,
 * contenu, hreflang) : /cercles/annuaire, /ar/cercles/annuaire,
 * /cercles/pro/:slug, /ar/cercles/pro/:slug. Lecture Neon (pros vérifiés,
 * non fictifs). hreflang réciproques FR ↔ AR seulement quand la version
 * arabe existe réellement : l'annuaire (interface traduite) toujours, une
 * fiche pro seulement si sa présentation arabe est saisie ; sinon la page
 * /ar/… n'est pas indexée et sa canonique est la page française.
 * Aucune coordonnée ni prix nominatif.
 */
import { libelleMetier, TYPES_SOCIETE } from "../../apps/web/src/domain/cercles/gabarits";
import { REGIONS_L3 } from "../../apps/web/src/domain/cercles/libelles";
import type { Sql } from "./cercles";
import { depotCatalogueNeon } from "./catalogueDepot";
import { masquerCoordonnees } from "./coordonnees";
import type { PageSeo } from "./seo";

const BASE = "https://citurbarea.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const court = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const txt = (v: unknown) => (typeof v === "string" ? masquerCoordonnees(v.trim()) : "");
const fictif = (f: Record<string, unknown>) => (f.meta as Record<string, unknown> | null)?.fictif === true;
const alternes = (chemin: string) => [
  { hreflang: "fr", href: `${BASE}${chemin}` }, { hreflang: "ar", href: `${BASE}/ar${chemin}` }, { hreflang: "x-default", href: `${BASE}${chemin}` },
];

export const CHEMIN_CERCLES = /^\/(ar\/)?cercles\/(annuaire|pro\/[a-z0-9-]{2,80})$/;

export async function pageCercles(sql: Sql, chemin: string, apercu = false): Promise<(PageSeo & { introuvable?: boolean }) | null> {
  const m = CHEMIN_CERCLES.exec(chemin);
  if (!m) return null;
  const ar = !!m[1];
  const depot = depotCatalogueNeon(sql);

  if (m[2] === "annuaire") {
    const pros = (await depot.annuaire(apercu)).slice(0, 300);
    const items = pros.map((f) => {
      const nom = ar ? txt(f.raisonSocialeAr) || txt(f.raisonSociale) : txt(f.raisonSociale);
      return `<li><a href="${ar ? "/ar" : ""}/cercles/pro/${esc(String(f.slug))}">${esc(nom)}</a> — ${esc(libelleMetier(String(f.metier))[ar ? "ar" : "fr"])}, ${esc(String(f.ville))}</li>`;
    }).join("");
    const types = Object.values(TYPES_SOCIETE).map((t) => (ar ? t.libelle.ar : t.libelle.fr)).join(ar ? "، " : ", ");
    return ar ? {
      titre: "دليل مهنيي البناء في المغرب: موردو المواد والمقاولات ومكاتب الدراسات | سيتوربارية",
      description: "موردو مواد البناء والمقاولات والحرفيون ومكاتب الدراسات والمختبرات والطوبوغرافيون موثَّقون من طرف سيتوربارية. التواصل عبر المنصة.",
      canonique: `${BASE}/ar/cercles/annuaire`, lang: "ar", alternates: alternes("/cercles/annuaire"),
      contenu: `<h1>دليل مهنيي البناء والأشغال في المغرب</h1><p>${esc(types)}.</p>${items ? `<ul>${items}</ul>` : "<p>يفتح الدليل قريباً.</p>"}<p><a href="/cercles/inscription">سجّلوا مقاولتكم مجاناً</a> · <a href="/materiaux">أسعار مواد البناء</a></p>`,
    } : {
      titre: "Annuaire des pros du BTP au Maroc : fournisseurs, entreprises, BET | CITURBAREA",
      description: "Fournisseurs de matériaux, entreprises, artisans, bureaux d'études, laboratoires et topographes vérifiés par CITURBAREA. Contact par la plateforme, sans engagement.",
      canonique: `${BASE}/cercles/annuaire`, alternates: alternes("/cercles/annuaire"),
      contenu: `<h1>Annuaire des professionnels du BTP au Maroc</h1><p>${esc(types)}.</p>${items ? `<ul>${items}</ul>` : "<p>L'annuaire ouvre bientôt.</p>"}<p><a href="/cercles/inscription">Inscrire mon entreprise gratuitement</a> · <a href="/materiaux">Prix des matériaux de construction</a></p>`,
    };
  }

  const slug = m[2].slice(4);
  const f = await depot.fParSlug(slug);
  const lienFr = `/cercles/pro/${slug}`;
  if (!f || f.statut !== "APPROVED" || (fictif(f) && !apercu)) {
    return { titre: "Professionnel introuvable | CITURBAREA", description: "Fiche introuvable ou pas encore publiée.", canonique: `${BASE}/cercles/annuaire`, noindex: true, introuvable: true, contenu: "<h1>Fiche introuvable</h1>" };
  }
  const [produits, services] = await Promise.all([depot.prPublics(apercu), depot.svPublics(apercu)]);
  const siens = produits.filter((p) => p.fournisseurId === f.id), sv = services.filter((s) => s.fournisseurId === f.id);
  const arabeExiste = !!txt(f.descriptionAr);
  const metier = libelleMetier(String(f.metier));
  const region = REGIONS_L3[String(f.region)] || null;
  const alternates = arabeExiste ? alternes(lienFr) : [];
  const liste = (l: Record<string, unknown>[], cleFr: string, cleAr: string) => l.slice(0, 40).map((x) => {
    const n = ar ? txt(x[cleAr]) || txt(x[cleFr]) : txt(x[cleFr]) || txt(x[cleAr]);
    return n ? `<li>${esc(n)}${x.marque ? ` — ${esc(String(x.marque))}` : ""}</li>` : "";
  }).join("");

  if (ar) {
    const nom = txt(f.raisonSocialeAr) || txt(f.raisonSociale);
    return {
      titre: `${court(nom, 50)} — ${metier.ar}، ${f.ville} | سيتوربارية`,
      description: court(`${metier.ar} في ${f.ville}${region ? ` (${region.ar})` : ""}، موثَّق من طرف سيتوربارية. ${txt(f.descriptionAr)}`, 160),
      canonique: arabeExiste ? `${BASE}/ar${lienFr}` : `${BASE}${lienFr}`, noindex: !arabeExiste, lang: "ar", alternates,
      contenu: `<h1>${esc(nom)}</h1><p>${esc(metier.ar)} · ${esc(String(f.ville))}</p>${arabeExiste ? `<p>${esc(txt(f.descriptionAr))}</p>` : ""}${siens.length ? `<h2>المنتجات</h2><ul>${liste(siens, "designationFr", "designationAr")}</ul>` : ""}${sv.length ? `<h2>الخدمات</h2><ul>${liste(sv, "designationFr", "designationAr")}</ul>` : ""}<p>التواصل عبر سيتوربارية · <a href="/ar/cercles/annuaire">دليل المهنيين</a></p>`,
    };
  }
  const nom = txt(f.raisonSociale);
  return {
    titre: `${court(nom, 50)} — ${metier.fr}, ${f.ville} | CITURBAREA`,
    description: court(`${metier.fr} à ${f.ville}${region ? ` (${region.fr})` : ""}, vérifié par CITURBAREA. ${txt(f.description)}`, 160),
    canonique: `${BASE}${lienFr}`, alternates,
    contenu: `<h1>${esc(nom)}</h1><p>${esc(metier.fr)} · ${esc(String(f.ville))}</p>${txt(f.description) ? `<p>${esc(txt(f.description))}</p>` : ""}${siens.length ? `<h2>Produits</h2><ul>${liste(siens, "designationFr", "designationAr")}</ul>` : ""}${sv.length ? `<h2>Prestations</h2><ul>${liste(sv, "designationFr", "designationAr")}</ul>` : ""}<p>Contact par CITURBAREA · <a href="/cercles/annuaire">Annuaire des pros</a></p>`,
  };
}

/** Sitemap : annuaire FR/AR et fiches des pros vérifiés (version arabe listée seulement si elle existe). */
export async function sitemapCercles(sql: Sql): Promise<string> {
  const pros = await depotCatalogueNeon(sql).annuaire(false);
  const urls = [`${BASE}/cercles/annuaire`, `${BASE}/ar/cercles/annuaire`];
  for (const f of pros) {
    urls.push(`${BASE}/cercles/pro/${f.slug}`);
    if (txt(f.descriptionAr)) urls.push(`${BASE}/ar/cercles/pro/${f.slug}`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc><changefreq>weekly</changefreq></url>`).join("\n")}\n</urlset>\n`;
}
