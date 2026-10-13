/**
 * Métadonnées et contenu servis dans le HTML des pages de l'application (SPA)
 * qui doivent être référencées : sans cela Google reçoit le titre, la
 * description et la canonique de l'accueil (contre-audit marketing du
 * 12/10/2026). Le contenu remplace le bloc [data-seo-prerender] d'index.html,
 * que React efface au montage.
 */

export type PageSeo = { titre: string; description: string; canonique: string; noindex?: boolean; contenu?: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FAQ: [string, string][] = [
  ["Le chiffrage est-il fiable ?", "C'est une estimation budgétaire lot par lot, pas un devis d'entreprise. Son niveau de précision est affiché ; il s'affine avec les plans, l'étude de sol et le choix des matériaux."],
  ["Tâcheron ou entreprise : que comprend le prix ?", "Matériaux et main-d'œuvre. Le régime tâcheron (fournitures achetées par le client) est moins cher ; l'entreprise générale livre clé en main."],
  ["Combien ajoute un sous-sol ?", "Le sous-sol est chiffré à part : terrassement, évacuation des terres, voiles, étanchéité, drainage et soutènements."],
  ["Les honoraires d'architecte sont-ils inclus ?", "Le budget total ajoute les honoraires (plan type au forfait ou plan personnalisé), les taxes d'autorisation et les raccordements. Le terrain n'est pas inclus."],
  ["Je vis à l'étranger : puis-je construire à distance ?", "Oui, avec des plans autorisés, un contrat écrit, des paiements à l'avancement et un suivi par un architecte inscrit à l'Ordre."],
];

const CHIFFRAGE: PageSeo = {
  titre: "Prix construction Maroc 2026 : villa, maison, immeuble | CITURBAREA",
  description: "Combien coûtera votre construction ? Estimation gratuite lot par lot (fondations, gros œuvre, finitions), aide à la décision selon votre budget, devis vérifié par un architecte inscrit à l'Ordre.",
  canonique: "https://citurbarea.com/chiffrage",
  contenu: `
<h1>Combien coûtera votre construction au Maroc ?</h1>
<p>Villa isolée, jumelée ou en bande, maison, immeuble ou immeuble mixte : renseignez le terrain, les niveaux, le sous-sol, le standing et la ville, et obtenez en 2 minutes une estimation lot par lot — terrassements, fondations, gros œuvre, étanchéité, menuiseries, finitions — avec son niveau de précision. Prix 2026 sourcés, base Rabat-Salé-Kénitra, ajustés par ville.</p>
<p>Gratuit · Sans engagement · Architecte inscrit à l'Ordre · Réponse sur WhatsApp.</p>
<h2>Que pouvez-vous construire avec votre budget ?</h2>
<p>L'aide à la décision compare votre projet à chaque standing (très économique, moyen standing, standing, haut standing, luxe), au régime tâcheron ou entreprise, avec ou sans sous-sol, avec un niveau de moins, en plan type ou en plan personnalisé, et indique les leviers pour rester dans votre budget.</p>
<h2>Comment ça marche</h2>
<ol><li>Décrivez votre projet.</li><li>Voyez votre estimation instantanée, lot par lot.</li><li>Recevez votre devis détaillé sur WhatsApp, vérifié par un architecte.</li></ol>
<h2>Questions fréquentes</h2>
${FAQ.map(([q, r]) => `<h3>${esc(q)}</h3><p>${esc(r)}</p>`).join("\n")}
<p><a href="/guide/prix-construction-villa-maroc">Guide : prix de construction d'une villa au Maroc</a> · <a href="https://www.youtube.com/@citiestalkmaroc">Nos vidéos</a></p>`,
};

/** Pages de la SPA dont le HTML est réécrit (chemin exact, sans barre finale). */
export const PAGES_SEO: Record<string, PageSeo> = {
  "/chiffrage": CHIFFRAGE,
  "/chiffrage/devis": { titre: "Votre devis estimatif | CITURBAREA", description: "Devis estimatif CITURBAREA.", canonique: "https://citurbarea.com/chiffrage", noindex: true },
  // Présente dans sitemap-terrains.xml : sans entrée ici, Google recevait le titre et la canonique de l'accueil.
  "/p4/terrains/deposer": {
    titre: "Vendre son terrain au Maroc : annonce gratuite vérifiée | CITURBAREA",
    description: "Propriétaire ou intermédiaire mandaté : déposez gratuitement votre terrain. Annonce vérifiée avant publication, vue par des acheteurs qui préparent un projet de construction.",
    canonique: "https://citurbarea.com/p4/terrains/deposer",
    contenu: `
<h1>Déposer mon terrain</h1>
<p>Vous vendez un terrain au Maroc ? Déposez gratuitement votre annonce : elle est vérifiée par notre équipe avant publication et présentée à des acheteurs qui préparent un projet de construction (villa, immeuble, commerce).</p>
<p>Vos coordonnées ne sont jamais publiées : les acheteurs passent par CITURBAREA, et un architecte inscrit à l'Ordre peut joindre une étude de faisabilité pour rassurer l'acheteur et justifier le prix.</p>
<h2>Ce qu'il faut indiquer</h2>
<ul><li>Ville, quartier ou lotissement, surface.</li><li>Situation foncière : titré, titre en cours (réquisition) ou non titré (melk).</li><li>Type : terrain à villa, à immeuble, commercial ou agricole ; prix demandé (facultatif).</li></ul>
<p><a href="/p4/terrains">Voir les terrains à vendre</a> · <a href="/chiffrage">Chiffrer une construction</a></p>`,
  },
};

// Prise de rendez-vous en visio (même FAQ que la page, en résumé).
PAGES_SEO["/rendez-vous"] = {
  titre: "Rendez-vous visio gratuit avec un architecte au Maroc | CITURBAREA",
  description: "Réservez un appel vidéo gratuit de 30 min avec un architecte inscrit à l'Ordre : maison, permis de construire, chiffrage, terrain. Créneaux en ligne, heure du Maroc, MRE bienvenus.",
  canonique: "https://citurbarea.com/rendez-vous",
  contenu: `
<h1>Réservez un appel vidéo gratuit de 30 min avec l'architecte</h1>
<p>Construire une maison, obtenir un permis de construire ou une autorisation, chiffrer un projet, vérifier un terrain : parlez-en directement avec un architecte inscrit à l'Ordre, en visio, depuis le Maroc ou l'étranger.</p>
<h2>Comment ça marche</h2>
<ol><li>Choisissez le sujet de l'appel.</li><li>Choisissez un créneau libre (heure du Maroc ; l'heure de votre pays est affichée si vous êtes à l'étranger).</li><li>Indiquez votre nom et votre téléphone : vous recevez le lien de votre espace rendez-vous.</li></ol>
<p>Pendant l'appel, vous remplissez votre dossier dans votre espace (terrain, programme, budget, documents disponibles) : l'architecte le voit en direct. Gratuit et sans engagement.</p>
<p><a href="/chiffrage">Chiffrer une construction</a> · <a href="/guide/prix-construction-villa-maroc">Prix de construction d'une villa au Maroc</a></p>`,
};

/** Espace client d'un rendez-vous (/rdv/<jeton>) : jamais indexé. */
export const PAGE_ESPACE_RDV: PageSeo = { titre: "Mon rendez-vous | CITURBAREA", description: "Espace rendez-vous CITURBAREA.", canonique: "https://citurbarea.com/rendez-vous", noindex: true, contenu: "<h1>Mon rendez-vous</h1>" };

/** Données structurées FAQ (utile aux moteurs et aux réponses IA, même sans résultat enrichi). */
export const jsonLdChiffrage = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })),
});

declare const HTMLRewriter: {
  new (): {
    on(sel: string, h: { element?(el: { setAttribute(n: string, v: string): void; setInnerContent(c: string, o?: { html?: boolean }): void; append(c: string, o?: { html?: boolean }): void; getAttribute(n: string): string | null }): void }): ReturnType<typeof nouveau>;
    transform(r: Response): Response;
  };
};
function nouveau() { return new HTMLRewriter(); }

/** Applique les métadonnées d'une page au HTML de l'application. */
export function reecrire(res: Response, p: PageSeo, jsonLd?: string): Response {
  let rw = new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(p.titre) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute("content", p.description) })
    .on('link[rel="canonical"]', { element: (el) => el.setAttribute("href", p.canonique) })
    .on('meta[property="og:title"]', { element: (el) => el.setAttribute("content", p.titre) })
    .on('meta[property="og:description"]', { element: (el) => el.setAttribute("content", p.description) })
    .on('meta[property="og:url"]', { element: (el) => el.setAttribute("content", p.canonique) });
  if (p.noindex) rw = rw.on("head", { element: (el) => el.append('<meta name="robots" content="noindex, follow" />', { html: true }) });
  if (jsonLd) rw = rw.on("head", { element: (el) => el.append(`<script type="application/ld+json">${jsonLd}</script>`, { html: true }) });
  if (p.contenu) rw = rw.on("[data-seo-prerender] main", { element: (el) => el.setInnerContent(p.contenu!, { html: true }) });
  return rw.transform(res);
}

// ── Annonces de terrains (porte P4) : contenu servi dans le HTML pour les moteurs ──
import { LIB_TITRE, LIB_USAGE, annonceParSlug, annoncesPubliees, type Sql } from "./terrains";

const dhSeo = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} DH`;

/** Métadonnées et contenu de /p4/terrains et /p4/terrains/:slug, lus dans Neon. */
export async function pageTerrains(sql: Sql, chemin: string): Promise<PageSeo | null> {
  if (chemin === "/p4/terrains") {
    const l = await annoncesPubliees(sql, { limite: 100 });
    const items = l.filter((t) => t.statut === "PUBLIE").map((t) => `<li><a href="/p4/terrains/${esc(t.slug)}">Terrain ${t.surface} m² à ${esc(t.quartier ? `${t.quartier}, ` : "")}${esc(t.ville)}${t.prix ? ` — ${dhSeo(t.prix)}` : ""}</a> (${esc(LIB_USAGE[t.usage] ?? "terrain")}, ${esc(LIB_TITRE[t.titre] ?? "")})</li>`).join("");
    return {
      titre: "Terrains à vendre au Maroc, vérifiés par un architecte | CITURBAREA",
      description: "Terrains à vendre déposés par des propriétaires et des intermédiaires mandatés, vérifiés avant publication. Estimation du coût de construction et étude de faisabilité par un architecte inscrit à l'Ordre.",
      canonique: "https://citurbarea.com/p4/terrains",
      contenu: `<h1>Terrains à vendre au Maroc</h1><p>Annonces vérifiées avant publication. Avant d'acheter, faites vérifier la constructibilité et chiffrez votre future construction avec un architecte inscrit à l'Ordre.</p>${items ? `<ul>${items}</ul>` : "<p>Aucune annonce publiée pour le moment.</p>"}<p><a href="/p4/terrains/deposer">Déposer un terrain gratuitement</a> · <a href="/chiffrage">Chiffrer une construction</a></p>`,
    };
  }
  const m = chemin.match(/^\/p4\/terrains\/([a-z0-9-]{8,90})$/);
  if (!m || m[1] === "deposer") return null;
  const t = await annonceParSlug(sql, m[1]);
  if (!t) return null;
  const titre = `Terrain ${t.surface.toLocaleString("fr-FR")} m² à ${t.ville}${t.prix ? ` — ${dhSeo(t.prix)}` : ""}`;
  return {
    titre: `${titre} | CITURBAREA`,
    description: `${LIB_USAGE[t.usage] ?? "Terrain"} de ${t.surface} m² ${t.quartier ? `à ${t.quartier}, ` : "à "}${t.ville}, ${LIB_TITRE[t.titre] ?? ""}${t.prixM2 ? `, ${dhSeo(t.prixM2)}/m²` : ""}. Vérification et estimation du coût de construction par un architecte.`.slice(0, 160),
    canonique: `https://citurbarea.com/p4/terrains/${t.slug}`,
    contenu: `<h1>${esc(titre)}</h1><p>${esc(LIB_USAGE[t.usage] ?? "Terrain")} · ${esc(LIB_TITRE[t.titre] ?? "")}${t.prixM2 ? ` · ${dhSeo(t.prixM2)}/m²` : ""}</p>${t.description ? `<p>${esc(t.description)}</p>` : ""}<p><a href="/chiffrage?terrain=${Math.round(t.surface)}&amp;ville=${encodeURIComponent(t.ville)}">Combien coûterait la construction sur ce terrain ?</a> · <a href="/p4/terrains">Tous les terrains</a></p>`,
  };
}

/** Sitemap des annonces publiées. */
export async function sitemapTerrains(sql: Sql): Promise<string> {
  const l = await annoncesPubliees(sql, { limite: 200 });
  const urls = [`https://citurbarea.com/p4/terrains`, `https://citurbarea.com/p4/terrains/deposer`, `https://citurbarea.com/rendez-vous`, ...l.filter((t) => t.statut === "PUBLIE").map((t) => `https://citurbarea.com/p4/terrains/${t.slug}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><changefreq>daily</changefreq></url>`).join("\n")}\n</urlset>\n`;
}
