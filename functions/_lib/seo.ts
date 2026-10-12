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
};

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
