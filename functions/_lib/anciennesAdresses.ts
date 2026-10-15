/**
 * Anciennes adresses encore connues de Google (rapport de couverture Search
 * Console, 15/10/2026) : variantes régionales des portes, pages « immeuble »
 * par ville, anciennes landings. Sans règle, le repli SPA les sert en 200 avec
 * la page « introuvable » (soft 404) ; on les redirige en 301 vers la page
 * vivante la plus proche pour garder leur historique de référencement.
 */

const PORTES: Record<"fr" | "en" | "ar", Record<string, string>> = {
  fr: {
    "01": "porte-01-projet-personnel", "02": "porte-02-projet-immobilier-equipements", "03": "porte-03-realisation-cle-en-main",
    "04": "porte-04-investisseur-foncier", "05": "porte-05-rapports-expertises", "06": "porte-06-entreprises-partenaires",
  },
  en: {
    "01": "door-01-personal-family-project", "02": "door-02-real-estate-development-facilities", "03": "door-03-turnkey-delivery",
    "04": "door-04-land-investor", "05": "door-05-reports-expert-opinions", "06": "door-06-companies-partners",
  },
  ar: {
    "01": "bab-01-mashrou-shakhsi-wa-usari", "02": "bab-02-mashrou-aqari-wa-tajhizat", "03": "bab-03-injaz-miftah-fi-yad",
    "04": "bab-04-mostathmir-aqari-wa-aard", "05": "bab-05-taqarir-wa-khibra", "06": "bab-06-sharikat-wa-shoraka",
  },
};

/** Anciennes landings sans équivalent direct → page vivante la plus proche. */
const FIXES: Record<string, string> = {
  "/promotion-immobiliere-rabat-sale-kenitra": "/fr/porte-02-projet-immobilier-equipements",
  "/etude-faisabilite-maroc": "/fr/porte-04-investisseur-foncier",
};

/** Adresse vivante vers laquelle rediriger (301), ou null si l'adresse n'est pas une ancienne adresse connue. */
export function redirectionAncienne(chemin: string): string | null {
  const p = chemin.replace(/\/+$/, "").replace(/\.html$/i, "").toLowerCase();
  if (FIXES[p]) return FIXES[p];

  // Portes avec suffixe régional (« -oriental », « -dakhla », « -tanger »…) ou ancien libellé.
  const porte = /^\/(fr|en|ar)\/(?:porte|door|bab)-(0[1-6])(?:-[a-z0-9-]*)?$/.exec(p);
  if (porte) {
    const cible = `/${porte[1]}/${PORTES[porte[1] as "fr" | "en" | "ar"][porte[2]]}`;
    return cible === p ? null : cible;
  }
  // Variantes arabes sans numéro (« /ar/mostathmir-aqari-wa-aard-beni-mellal ») : préfixe de la porte.
  const ar = /^\/ar\/([a-z0-9-]+)$/.exec(p);
  if (ar) {
    for (const slug of Object.values(PORTES.ar)) {
      const base = slug.replace(/^bab-0[1-6]-/, "");
      if (ar[1] === base || ar[1].startsWith(`${base}-`)) return `/ar/${slug}`;
    }
  }
  // Anciennes pages « architecte d'immeuble » par ville → landing de la ville.
  const immeuble = /^\/architecte-immeuble-([a-z-]+)$/.exec(p);
  if (immeuble) return `/architecte-${immeuble[1]}`;
  // Ancien portail : /portail/p5 → /p5.
  const portail = /^\/portail\/(p[1-6])$/.exec(p);
  if (portail) return `/${portail[1]}`;
  return null;
}
