/**
 * Compte client + dossier dans Neon, partagés par /api/intake (portes P1 à P6)
 * et /api/rdv (rendez-vous en visio).
 *
 *   - le compte est retrouvé par e-mail ou téléphone, sinon créé SANS mot de
 *     passe utilisable (pas de bcrypt sur Workers) : il sera activé plus tard ;
 *   - le dossier est créé en phase 00_BRIEF ;
 *   - le lead le plus récent de ce téléphone est rattaché au dossier.
 * Les tables "User" et "Dossier" ne sont jamais créées ici (docs/sql/dossiers-neon.sql).
 */

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

const idAleatoire = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** Les deux tables nécessaires existent-elles ? */
export async function tablesDossierPresentes(sql: Sql): Promise<boolean> {
  const t = await sql`SELECT to_regclass('public."Dossier"') IS NOT NULL AS d, to_regclass('public."User"') IS NOT NULL AS u`;
  return !!t[0]?.d && !!t[0]?.u;
}

/** Compte CLIENT retrouvé (e-mail ou téléphone) ou créé sans mot de passe. Renvoie son id. */
export async function trouverOuCreerClient(sql: Sql, c: { nom: string; tel: string; email: string | null }, maintenant = new Date().toISOString()): Promise<string> {
  const existant = await sql`SELECT "id" FROM "User" WHERE (${c.email}::text IS NOT NULL AND lower("email") = ${c.email}::text) OR "phone" = ${c.tel} ORDER BY "createdAt" ASC LIMIT 1`;
  if (existant.length) return String(existant[0].id);
  const ownerId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : idAleatoire("usr_");
  const mail = c.email || `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}@citurbarea.unknown`;
  await sql`INSERT INTO "User" ("id", "email", "passwordHash", "role", "plan", "isActive", "createdAt", "updatedAt", "username", "phone")
    VALUES (${ownerId}, ${mail}, '!sans-mot-de-passe:a-activer', 'CLIENT', 'PRO', true, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${c.nom}, ${c.tel})`;
  return ownerId;
}

export type NouveauDossier = {
  ownerId: string; titre: string; porte: string; nom: string; tel: string; email: string | null;
  payload: unknown; commune?: string | null; gestionMode?: string | null; raisonSociale?: string | null; representant?: string | null;
  sousTypeP2?: string | null; natureProjet?: string | null; surfaceTerrain?: number | null; surfacePlancher?: number | null;
  nbNiveaux?: number | null; budgetEstime?: number | null; packSelected?: string | null; packPriceMAD?: number | null;
  projectType?: string | null; constructionLevel?: string | null; caseId?: string | null;
};

/** Crée le dossier (phase 00_BRIEF) et y rattache le dernier lead du téléphone. Renvoie son id. */
export async function creerDossier(sql: Sql, d: NouveauDossier, maintenant = new Date().toISOString()): Promise<string> {
  const dossierId = idAleatoire("dos_");
  await sql`INSERT INTO "Dossier" (
      "id", "ownerId", "title", "commune", "payload", "createdAt", "updatedAt",
      "porteType", "gestionMode", "phase", "clientNom", "clientTel", "clientEmail", "raisonSociale", "representant",
      "sousTypeP2", "natureProjet", "surfaceTerrain", "surfacePlancher", "nbNiveaux", "budgetEstime",
      "packSelected", "packPriceMAD", "projectType", "constructionLevel", "caseId"
    ) VALUES (
      ${dossierId}, ${d.ownerId}, ${d.titre}, ${d.commune ?? null}, ${JSON.stringify(d.payload)}::jsonb, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3),
      ${d.porte}, ${d.gestionMode || "AUTONOME"}, '00_BRIEF', ${d.nom}, ${d.tel}, ${d.email}, ${d.raisonSociale ?? null}, ${d.representant ?? null},
      ${d.sousTypeP2 ?? null}, ${d.natureProjet ?? null}, ${d.surfaceTerrain ?? null}, ${d.surfacePlancher ?? null},
      ${d.nbNiveaux ?? null}, ${d.budgetEstime ?? null},
      ${d.packSelected ?? null}, ${d.packPriceMAD ?? null}, ${d.projectType ?? null}, ${d.constructionLevel ?? null}, ${d.caseId ?? null}
    )`;
  // Rattache le lead le plus récent de ce téléphone au dossier.
  await sql`UPDATE "Lead" SET "convertedDossierId" = ${dossierId}, "updatedAt" = ${maintenant}::timestamp(3)
    WHERE "id" = (SELECT "id" FROM "Lead" WHERE "telephone" = ${d.tel} ORDER BY "createdAt" DESC LIMIT 1)`.catch(() => []);
  return dossierId;
}
