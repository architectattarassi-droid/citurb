/**
 * Matériauthèque — titre, description, canonique, contenu HTML et données
 * structurées servis aux moteurs pour /materiaux, /materiaux/famille/<slug> et
 * /materiaux/<slug> (mêmes données que la page React : domain/materiaux).
 *
 * Données structurées : schema.org Dataset (+ BreadcrumbList). PAS de
 * Product/AggregateOffer : CITURBAREA ne vend pas ces matériaux, des offres
 * inventées seraient trompeuses (règles Google sur les données structurées).
 */
import { CATALOGUE_VERSION } from "../../apps/web/src/domain/materiaux/catalogue";
import { unitesVente } from "../../apps/web/src/domain/materiaux/conversions";
import {
  MATERIAUTHEQUE_MAJ, MATERIAUX_PUBLICS, SLUG_CATEGORIE, VILLES_COEF, categorieParSlug, coefMateriaux, enPhrase, materiauParSlug, prixReference, prixTTC, slugMateriau,
} from "../../apps/web/src/domain/materiaux/reference";
import { indicesMateriau, sourcesCitees } from "../../apps/web/src/domain/materiaux/sources";
import { CATEGORIES, type Categorie, type MaterialRef } from "../../apps/web/src/domain/materiaux/types";
import { usagesMateriau } from "../../apps/web/src/domain/materiaux/usages";
import type { PageSeo } from "./seo";

const BASE = "https://citurbarea.com";
const ANNEE = MATERIAUTHEQUE_MAJ.slice(0, 4);
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][Number(MATERIAUTHEQUE_MAJ.slice(5, 7)) - 1];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dh = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n >= 100 ? 0 : 2 })} DH`;
const u = (x: string) => ({ m3: "m³", m2: "m²", l: "L", ens: "ensemble" } as Record<string, string>)[x] || x;
const FIAB: Record<string, string> = { A: "A (prix constaté)", B: "B (prix publiés datés)", C: "C (indicatif)" };
/** JSON-LD dans <script> : « </ » neutralisé. */
const ld = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

export type PageMateriaux = PageSeo & { jsonLd: string; introuvable?: boolean };

function ligneListe(r: MaterialRef): string {
  const p = prixReference(r.code)!;
  const v = r.ventes[0];
  return `<li><a href="/materiaux/${slugMateriau(r.code)}">${esc(r.libelle)}</a> : ${dh(p.ref)} HT / ${u(r.uniteRef)}${v ? ` (${dh(Math.round(p.ref * v.facteur * 100) / 100)} / ${esc(v.libelle.toLowerCase())})` : ""} — fiabilité ${p.fiabilite}</li>`;
}

function liste(rs: MaterialRef[]): string {
  const parCat = new Map<Categorie, MaterialRef[]>();
  for (const r of rs) parCat.set(r.categorie, [...(parCat.get(r.categorie) || []), r]);
  return [...parCat].map(([c, l]) => `<h2><a href="/materiaux/famille/${SLUG_CATEGORIE[c]}">${esc(CATEGORIES[c])}</a></h2><ul>${l.map(ligneListe).join("")}</ul>`).join("\n");
}

const EXPLICATION = `<h2>Comment lire ces prix</h2><p>Prix de référence en dirhams hors taxes (TVA 20 % en sus), base Rabat-Salé-Kénitra : médiane des sources datées (distributeurs, devis réels, guides). Fiabilité A : devis réel ou au moins 3 fournisseurs vérifiés ; B : prix publiés et datés ; C : indicatif. Les mêmes prix alimentent le <a href="/chiffrage">chiffrage de construction CITURBAREA</a>. Un coefficient matériaux par ville s'applique (Casablanca, Rabat, Tanger, Marrakech, Agadir, Fès, Oujda…).</p><p><a href="/cercles/inscription">Fournisseur ou négociant : publiez vos prix</a></p>`;

function dataset(nom: string, description: string, url: string, extra: Record<string, unknown> = {}) {
  return {
    "@type": "Dataset", name: nom, description, url, inLanguage: "fr-MA", isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "CITURBAREA", url: BASE },
    spatialCoverage: { "@type": "Place", name: "Maroc" }, temporalCoverage: MATERIAUTHEQUE_MAJ, dateModified: `${MATERIAUTHEQUE_MAJ}-01`,
    version: CATALOGUE_VERSION, ...extra,
  };
}

function fil(items: [string, string][]) {
  return { "@type": "BreadcrumbList", itemListElement: items.map(([n, l], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: `${BASE}${l}` })) };
}

export function pageMateriaux(chemin: string): PageMateriaux | null {
  if (chemin === "/materiaux") {
    const titre = `Prix des matériaux de construction au Maroc ${ANNEE} | CITURBAREA`;
    const description = `Prix ${MOIS} ${ANNEE} de ${MATERIAUX_PUBLICS.length} matériaux de construction au Maroc : ciment, fer à béton, sable, agglos, carrelage, peinture… Prix HT et TTC, unités de vente, prix par ville, sources citées.`;
    return {
      titre, description: description.slice(0, 160), canonique: `${BASE}/materiaux`,
      contenu: `<h1>Prix des matériaux de construction au Maroc — ${MOIS} ${ANNEE}</h1><p>${MATERIAUX_PUBLICS.length} matériaux, du gros œuvre aux finitions et équipements : prix de référence HT avec fourchette, équivalences d'unités (sac, tonne, m³, barre…), prix par ville, sources et niveau de fiabilité. Demandez un prix aux fournisseurs vérifiés de votre région, gratuitement.</p>${EXPLICATION}\n${liste(MATERIAUX_PUBLICS)}`,
      jsonLd: ld({ "@context": "https://schema.org", "@graph": [
        dataset(`Prix des matériaux de construction au Maroc (${MOIS} ${ANNEE})`, `Prix de référence HT de ${MATERIAUX_PUBLICS.length} matériaux de construction au Maroc, avec fourchette, unités de vente, coefficient par ville, sources et niveau de fiabilité. Base Rabat-Salé-Kénitra, mis à jour ${MOIS} ${ANNEE}.`, `${BASE}/materiaux`,
          { variableMeasured: ["Prix de référence HT (MAD)", "Prix minimum HT (MAD)", "Prix maximum HT (MAD)"], keywords: ["prix ciment Maroc", "prix fer à béton Maroc", "prix matériaux construction Maroc"] }),
        fil([["Accueil", "/"], ["Matériaux", "/materiaux"]]),
      ] }),
    };
  }
  const f = chemin.match(/^\/materiaux\/famille\/([a-z0-9-]{2,80})$/);
  if (f) {
    const c = categorieParSlug(f[1]);
    if (!c) return null;
    const rs = MATERIAUX_PUBLICS.filter((r) => r.categorie === c);
    const nom = CATEGORIES[c];
    return {
      titre: `Prix ${nom.toLowerCase()} au Maroc ${ANNEE} | CITURBAREA`,
      description: `Prix ${MOIS} ${ANNEE} des matériaux « ${nom} » au Maroc : ${rs.slice(0, 4).map((r) => r.libelle).join(", ")}… Prix HT et TTC, unités de vente, sources citées.`.slice(0, 160),
      canonique: `${BASE}/materiaux/famille/${f[1]}`,
      contenu: `<h1>Prix ${esc(nom.toLowerCase())} au Maroc — ${MOIS} ${ANNEE}</h1><p>${rs.length} matériaux de la famille « ${esc(nom)} » : prix de référence HT, fourchette, unités de vente et sources. <a href="/materiaux">Tous les matériaux</a>.</p>${liste(rs)}${EXPLICATION}`,
      jsonLd: ld({ "@context": "https://schema.org", "@graph": [
        dataset(`Prix ${nom.toLowerCase()} au Maroc (${MOIS} ${ANNEE})`, `Prix de référence HT des matériaux « ${nom} » au Maroc (${rs.length} articles), avec fourchette, unités de vente, sources et niveau de fiabilité.`, `${BASE}/materiaux/famille/${f[1]}`),
        fil([["Accueil", "/"], ["Matériaux", "/materiaux"], [nom, `/materiaux/famille/${f[1]}`]]),
      ] }),
    };
  }
  const m = chemin.match(/^\/materiaux\/([A-Za-z0-9-]{2,90})$/);
  if (!m || m[1] === "commande") return null;
  const r = materiauParSlug(m[1]);
  if (!r) return { titre: "Matériau introuvable | CITURBAREA", description: "Ce matériau n'est pas au catalogue.", canonique: `${BASE}/materiaux`, noindex: true, contenu: `<h1>Matériau introuvable</h1><p><a href="/materiaux">Tous les matériaux</a></p>`, jsonLd: "", introuvable: true };
  const slug = slugMateriau(r.code);
  const p = prixReference(r.code)!;
  const v = r.ventes[0];
  const sources = sourcesCitees(r.code);
  const usages = usagesMateriau(r.code);
  const indices = indicesMateriau(r.code);
  const url = `${BASE}/materiaux/${slug}`;
  const prixVente = v ? `, soit ${dh(Math.round(p.ref * v.facteur * 100) / 100)} HT ${v.libelle.toLowerCase()}` : "";
  const unites = unitesVente(r).map((x) => `<tr><td>${x.code === r.uniteRef ? `1 ${u(r.uniteRef)}` : esc(x.libelle)}</td><td>${dh(Math.round(p.ref * x.facteur * 100) / 100)} HT</td><td>${dh(prixTTC(p.ref * x.facteur))} TTC</td></tr>`).join("");
  const villes = VILLES_COEF.map((x) => `<tr><td>${esc(x.nom)}</td><td>${dh(Math.round(p.ref * coefMateriaux(x.nom).coef * 100) / 100)} HT / ${u(r.uniteRef)}</td></tr>`).join("");
  const voisins = MATERIAUX_PUBLICS.filter((x) => x.categorie === r.categorie && x.code !== r.code).slice(0, 8);
  return {
    titre: `Prix ${enPhrase(r.libelle)} au Maroc ${ANNEE} | CITURBAREA`.slice(0, 90),
    description: `Prix ${enPhrase(r.libelle)} au Maroc (${MOIS} ${ANNEE}) : ${dh(p.ref)} HT / ${u(r.uniteRef)}${prixVente}. Fourchette ${dh(p.min)} – ${dh(p.max)}, prix par ville, sources citées.`.slice(0, 160),
    canonique: url,
    contenu: `<nav><a href="/materiaux">Matériaux</a> › <a href="/materiaux/famille/${SLUG_CATEGORIE[r.categorie]}">${esc(CATEGORIES[r.categorie])}</a></nav>
<h1>Prix ${esc(enPhrase(r.libelle))} au Maroc (${MOIS} ${ANNEE})</h1>
<p><strong>${dh(p.ref)} HT par ${u(r.uniteRef)}</strong> (${dh(prixTTC(p.ref))} TTC)${esc(prixVente)}. Fourchette observée : ${dh(p.min)} à ${dh(p.max)} HT. Fiabilité ${FIAB[p.fiabilite]}${p.date ? `, prix de ${esc(p.date)}` : ""}. Base Rabat-Salé-Kénitra ; prix indicatif tant que moins de 3 fournisseurs vérifiés publient leur prix.</p>
<h2>Unités de vente et équivalences</h2><table>${unites}</table>
<h2>Prix par ville</h2><table>${villes}</table>
<h2>Sources</h2><ul>${sources.map((s) => `<li>${s.url ? `<a href="${esc(s.url)}" rel="nofollow">${esc(s.nom)}</a>` : esc(s.nom)}${s.date ? ` (${esc(s.date)})` : ""} — fiabilité ${s.fiabilite}${s.releve ? ` — relevé : ${esc(s.releve)}` : ""}</li>`).join("")}</ul>
${indices.length ? `<h2>Évolution des prix</h2><ul>${indices.map((i) => `<li>${esc(i.valeur)} — ${esc(i.libelle)} (${esc(i.periode)}), ${esc(i.source)}</li>`).join("")}</ul>` : ""}
${usages.length ? `<h2>Ce matériau sert à…</h2><ul>${usages.slice(0, 16).map((x) => `<li>${esc(x.libelle)} (${esc(x.lot)})</li>`).join("")}</ul>` : ""}
<p><a href="/chiffrage">Chiffrer ma construction avec ces prix</a> · Demander un prix aux fournisseurs vérifiés de ma région (gratuit)</p>
${voisins.length ? `<h2>Dans la même famille</h2><ul>${voisins.map(ligneListe).join("")}</ul>` : ""}`,
    jsonLd: ld({ "@context": "https://schema.org", "@graph": [
      dataset(`Prix ${enPhrase(r.libelle)} au Maroc (${MOIS} ${ANNEE})`, `Prix de référence HT de ${r.libelle} au Maroc : ${dh(p.ref)} par ${u(r.uniteRef)} (fourchette ${dh(p.min)} – ${dh(p.max)}), unités de vente, prix par ville, ${sources.length} source(s) citée(s), fiabilité ${p.fiabilite}.`, url,
        { variableMeasured: [{ "@type": "PropertyValue", name: `Prix de référence HT par ${u(r.uniteRef)}`, value: p.ref, minValue: p.min, maxValue: p.max, unitText: `MAD/${u(r.uniteRef)}` }],
          isBasedOn: sources.filter((s) => s.url).map((s) => s.url) }),
      fil([["Accueil", "/"], ["Matériaux", "/materiaux"], [CATEGORIES[r.categorie], `/materiaux/famille/${SLUG_CATEGORIE[r.categorie]}`], [r.libelle, `/materiaux/${slug}`]]),
    ] }),
  };
}

/** Sitemap des pages matériaux (catalogue, familles, fiches). */
export function sitemapMateriaux(): string {
  const urls = [
    `${BASE}/materiaux`,
    ...(Object.keys(CATEGORIES) as Categorie[]).filter((c) => MATERIAUX_PUBLICS.some((r) => r.categorie === c)).map((c) => `${BASE}/materiaux/famille/${SLUG_CATEGORIE[c]}`),
    ...MATERIAUX_PUBLICS.map((r) => `${BASE}/materiaux/${slugMateriau(r.code)}`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => `  <url><loc>${x}</loc><lastmod>${MATERIAUTHEQUE_MAJ}-01</lastmod><changefreq>monthly</changefreq></url>`).join("\n")}\n</urlset>\n`;
}
