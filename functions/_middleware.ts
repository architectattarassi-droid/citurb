/**
 * Cloudflare Pages Function — middleware global
 *
 * Le même déploiement répond sur citurbarea.com, admin.citurbarea.com et
 * *.pages.dev (production et previews). Seul citurbarea.com doit être
 * indexé : les autres hôtes reçoivent X-Robots-Tag: noindex, nofollow pour
 * ne pas concurrencer le domaine principal dans Google.
 *
 * /assets/* absent (chunk d'un ancien build) : le fallback SPA renverrait
 * index.html en 200 avec l'en-tête immutable d'un an de _headers, ce qui
 * empoisonne le cache navigateur sous le nom du chunk. On répond un vrai 404
 * non mis en cache ; l'app recharge alors une fois (lib/chunkReload).
 */

import { neon } from "@neondatabase/serverless";
import { PAGES_SEO, PAGE_ESPACE_RDV, jsonLdChiffrage, pageTerrains, reecrire } from "./_lib/seo";
import { pageMateriaux } from "./_lib/seoMateriaux";
import { CHEMIN_CERCLES, pageCercles } from "./_lib/seoCercles";
import { apercu } from "./_lib/lecturePublique";
import type { Sql } from "./_lib/terrains";

const HOTE_INDEXABLE = "citurbarea.com";

interface Env {
  DATABASE_URL?: string;
  /** Jeton « Balise HTML » de Google Search Console (contenu de google-site-verification). */
  GOOGLE_SITE_VERIFICATION?: string;
  /** Jeton de Bing Webmaster Tools (contenu de msvalidate.01). */
  BING_SITE_VERIFICATION?: string;
}

// Fourni par le runtime Cloudflare (Workers / Pages Functions).
declare const HTMLRewriter: {
  new (): {
    on(sel: string, h: { element?(el: { append(c: string, o?: { html?: boolean }): void }): void }): { transform(r: Response): Response };
  };
};

const jeton = (v: string | undefined) => (v && /^[\w-]{6,120}$/.test(v.trim()) ? v.trim() : "");

/**
 * Ajoute dans <head> :
 *  - le pays du visiteur (Cloudflare) : le front décide du consentement par
 *    défaut (Europe : refusé jusqu'à accord ; ailleurs : accordé) ;
 *  - sur citurbarea.com seulement, les balises de vérification Google Search
 *    Console et Bing (variables d'environnement, aucune recompilation).
 */
function balisesHead(res: Response, req: Request, env: Env | undefined, indexable: boolean): Response {
  const pays = ((req as Request & { cf?: { country?: string } }).cf?.country || "").replace(/[^A-Z]/gi, "").slice(0, 2).toUpperCase();
  const google = indexable ? jeton(env?.GOOGLE_SITE_VERIFICATION) : "";
  const bing = indexable ? jeton(env?.BING_SITE_VERIFICATION) : "";
  if (!pays && !google && !bing) return res;
  return new HTMLRewriter().on("head", {
    element(e) {
      if (pays) e.append(`<meta name="cf-pays" content="${pays}">`, { html: true });
      if (google) e.append(`<meta name="google-site-verification" content="${google}">`, { html: true });
      if (bing) e.append(`<meta name="msvalidate.01" content="${bing}">`, { html: true });
    },
  }).transform(res);
}

/**
 * Premiers segments d'URL que l'application (React Router) sait afficher
 * (apps/web/src/tomes/tome1/router/routes.tsx + routeRegistry.ts). Une autre
 * adresse reçoit index.html (repli SPA) : sans correction, Google y voit une
 * copie de l'accueil en 200 (« soft 404 »). À tenir à jour avec les routes.
 */
const SEGMENTS_APP = new Set([
  "", "_dev", "admin", "ar", "auth", "cabinet", "calculateur", "cc", "cercles", "chantier", "chiffrage",
  "confirmer-email", "cps", "creer-compte", "docs", "dossier", "dossiers", "en", "enterprise", "faq", "forbidden",
  "foncier", "fr", "guide", "inscription", "login", "mandataires", "materiaux", "media", "metrics", "mon-espace",
  "mon-parcours", "mot-de-passe-oublie", "mre", "notifications", "opci", "p1", "p2", "p3", "p4", "p5", "p6",
  "payment", "permis-construire", "portal", "post", "prestataires", "projet", "pv-chantier", "rdv", "rendez-vous", "services",
  "share-target", "sig", "simulateur", "terriscan", "upgrade", "verify-phone",
]);

export function adresseConnue(chemin: string): boolean {
  const seg = chemin.split("/")[1] ?? "";
  return SEGMENTS_APP.has(seg) || seg.startsWith("architecte-") || /\.[a-z0-9]{2,5}$/i.test(seg);
}

export async function onRequest(ctx: { request: Request; next: () => Promise<Response>; env?: Env }): Promise<Response> {
  let res = await ctx.next();
  const url = new URL(ctx.request.url);
  // Adresse inconnue servie par le repli SPA (marqueur propre à index.html) : vrai 404,
  // la page « introuvable » de l'application s'affiche quand même.
  if (res.status === 200 && (res.headers.get("content-type") || "").includes("text/html") && !adresseConnue(url.pathname)) {
    const html = await res.text();
    const r404 = new Response(html, { status: html.includes("data-seo-prerender") ? 404 : 200, headers: res.headers });
    if (r404.status === 404) {
      r404.headers.set("x-robots-tag", "noindex");
      r404.headers.set("cache-control", "no-store");
    }
    res = r404;
  }
  // Pages de l'application à référencer : titre, description, canonique et contenu dans le HTML servi.
  const chemin = url.pathname.replace(/\/+$/, "") || "/";
  const estHtml = (res.headers.get("content-type") || "").includes("text/html");
  const page = PAGES_SEO[chemin];
  if (page && estHtml) {
    res = reecrire(res, page, chemin.startsWith("/chiffrage") && !page.noindex ? jsonLdChiffrage : undefined);
  } else if (estHtml && chemin.startsWith("/rdv/")) {
    // Espace client d'un rendez-vous : lien secret, jamais indexé, jamais transmis en référent.
    res = new Response(reecrire(res, PAGE_ESPACE_RDV).body, res);
    res.headers.set("x-robots-tag", "noindex, nofollow");
    res.headers.set("referrer-policy", "no-referrer");
    res.headers.set("cache-control", "no-store");
  } else if (estHtml && (chemin === "/materiaux" || chemin.startsWith("/materiaux/"))) {
    // Matériauthèque : prix, sources et données structurées (Dataset) servis aux moteurs.
    const p = pageMateriaux(chemin);
    if (p) {
      res = reecrire(res, p, p.jsonLd || undefined);
      if (p.introuvable) {
        res = new Response(res.body, { status: 404, headers: res.headers });
        res.headers.set("x-robots-tag", "noindex");
        res.headers.set("cache-control", "no-store");
      }
    }
  } else if (estHtml && (chemin === "/projet" || /^\/projet\/[A-Za-z0-9_-]{43}$/.test(chemin))) {
    // Espace projet : lien d'accès secret, jamais indexé, jamais transmis en référent.
    res = new Response(res.body, res);
    res.headers.set("x-robots-tag", "noindex, nofollow");
    res.headers.set("referrer-policy", "no-referrer");
    res.headers.set("cache-control", "no-store");
  } else if (estHtml && CHEMIN_CERCLES.test(chemin) && ctx.env?.DATABASE_URL) {
    // Annuaire et fiches des pros Cercles : contenu réel (Neon), hreflang FR/AR quand la version arabe existe.
    try {
      const p = await pageCercles(neon(ctx.env.DATABASE_URL) as unknown as Sql, chemin, apercu(ctx.request));
      if (p) {
        res = reecrire(res, p);
        if (p.introuvable) {
          res = new Response(res.body, { status: 404, headers: res.headers });
          res.headers.set("x-robots-tag", "noindex");
          res.headers.set("cache-control", "no-store");
        }
      }
    } catch { /* tables absentes ou base indisponible : la page reste servie telle quelle */ }
  } else if (estHtml && chemin.startsWith("/p4/terrains") && ctx.env?.DATABASE_URL) {
    // Annonces de terrains : contenu réel (Neon) servi aux moteurs.
    try {
      const p = await pageTerrains(neon(ctx.env.DATABASE_URL) as unknown as Sql, chemin);
      if (p) res = reecrire(res, p);
    } catch { /* la page reste servie telle quelle */ }
  }
  if (url.pathname.startsWith("/assets/") && (res.headers.get("content-type") || "").includes("text/html")) {
    return new Response("Asset introuvable", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (estHtml) res = balisesHead(res, ctx.request, ctx.env, url.hostname === HOTE_INDEXABLE);
  if (url.hostname === HOTE_INDEXABLE) return res;
  const out = new Response(res.body, res);
  out.headers.set("x-robots-tag", "noindex, nofollow");
  return out;
}
