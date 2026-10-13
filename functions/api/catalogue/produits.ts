/**
 * Cloudflare Pages Function — GET /api/catalogue/produits
 *
 * Contrat : docs/architecture/contrat-catalogue.md. Version d'attente : les
 * tables des produits fournisseurs (session « Cercles : fiches société,
 * produit et service ») n'existent pas encore, donc aucun produit approuvé.
 * Le contrat prévoit précisément cette réponse quand la base n'est pas prête :
 * 200 { ok: true, disponible: false, produits: [] }. La matériauthèque reste
 * correcte et la requête n'échoue plus en 404 (règle « zéro impasse »,
 * docs/architecture/plan-rebranchement.md). À remplacer par l'implémentation
 * complète (lecture Neon, agrégat ≥ 3 fournisseurs).
 */

export const onRequestGet = async (): Promise<Response> =>
  new Response(JSON.stringify({ ok: true, disponible: false, produits: [] }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
