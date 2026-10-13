/**
 * Espace projet — Depot sur Neon (SQL en gabarit balisé, @neondatabase/serverless).
 * Tables : docs/sql/espace-projet-neon.sql — jamais créées ici (absentes → 503).
 */
import type { DefJalon } from "./projets";
import type { Depot, DocumentLigne, EvenementLigne, FichierLigne, JalonLigne, MembreLigne, MessageLigne, ProjetLigne } from "./projetsApi";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : new Date(String(v).replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(v)) ? "" : "Z")).toISOString());
const isoN = (v: unknown) => (v == null ? null : iso(v));
const txt = (v: unknown) => (v == null ? null : String(v));
const objet = <T>(v: unknown, d: T): T => (v == null ? d : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

const projet = (r: Record<string, unknown>): ProjetLigne => ({
  id: String(r.id), dossierId: txt(r.dossierId), titre: String(r.titre), caracteristiques: objet(r.caracteristiques, {} as ProjetLigne["caracteristiques"]),
  referentielVersion: String(r.referentielVersion), referentiel: objet(r.referentiel, { exigences: {}, normes: {}, modeles: {}, phases: {} }),
  creePar: txt(r.creePar), createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt),
});
const membre = (r: Record<string, unknown>): MembreLigne => ({
  id: String(r.id), projetId: String(r.projetId), role: String(r.role) as MembreLigne["role"], nom: String(r.nom), telephone: txt(r.telephone), email: txt(r.email),
  entreprise: txt(r.entreprise), jetonHash: String(r.jetonHash), actif: r.actif === true, invitePar: txt(r.invitePar), createdAt: iso(r.createdAt), dernierAcces: isoN(r.dernierAcces),
});
const jalon = (r: Record<string, unknown>): JalonLigne => ({
  projetId: String(r.projetId), code: String(r.code), phase: String(r.phase), rang: Number(r.rang) || 0, definition: objet(r.definition, {} as DefJalon),
  statut: String(r.statut) as JalonLigne["statut"], checklist: objet(r.checklist, {}), validePar: txt(r.validePar), valideLe: isoN(r.valideLe), salle: txt(r.salle), updatedAt: iso(r.updatedAt),
});
const message = (r: Record<string, unknown>): MessageLigne => ({
  id: String(r.id), projetId: String(r.projetId), jalonCode: String(r.jalonCode), auteurMembreId: txt(r.auteurMembreId), auteurNom: String(r.auteurNom),
  auteurRole: String(r.auteurRole), texte: String(r.texte ?? ""), pieceIds: objet(r.pieceIds, [] as string[]), masque: r.masque === true, createdAt: iso(r.createdAt),
});
const fichier = (r: Record<string, unknown>): FichierLigne => ({
  id: String(r.id), projetId: String(r.projetId), jalonCode: txt(r.jalonCode), pointId: txt(r.pointId), auteurMembreId: txt(r.auteurMembreId), auteurNom: String(r.auteurNom),
  nom: String(r.nom), type: String(r.type), taille: Number(r.taille) || 0, cleR2: String(r.cleR2), nature: String(r.nature) as FichierLigne["nature"], createdAt: iso(r.createdAt),
});
const document = (r: Record<string, unknown>): DocumentLigne => ({
  id: String(r.id), projetId: String(r.projetId), jalonCode: String(r.jalonCode), modeleId: String(r.modeleId), valeurs: objet(r.valeurs, {}),
  statut: String(r.statut) === "SIGNE" ? "SIGNE" : "BROUILLON", signatures: objet(r.signatures, []), auteurNom: txt(r.auteurNom), createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt),
});
const evenement = (r: Record<string, unknown>): EvenementLigne => ({
  id: String(r.id), projetId: String(r.projetId), auteur: String(r.auteur), action: String(r.action), cible: txt(r.cible), details: objet(r.details, null), createdAt: iso(r.createdAt),
});

const J = (v: unknown) => JSON.stringify(v);
const LOT = 150;

export function depotNeon(sql: Sql): Depot {
  return {
    async tablesPresentes() {
      const r = await sql`SELECT to_regclass('public."Projet"') IS NOT NULL AS p, to_regclass('public."ProjetMembre"') IS NOT NULL AS m,
        to_regclass('public."ProjetJalon"') IS NOT NULL AS j, to_regclass('public."ProjetMessage"') IS NOT NULL AS msg,
        to_regclass('public."ProjetFichier"') IS NOT NULL AS f, to_regclass('public."ProjetDocument"') IS NOT NULL AS d,
        to_regclass('public."ProjetEvenement"') IS NOT NULL AS e`;
      const x = r[0] ?? {};
      return !!(x.p && x.m && x.j && x.msg && x.f && x.d && x.e);
    },
    async dossierExiste(id) {
      const t = await sql`SELECT to_regclass('public."Dossier"') IS NOT NULL AS d`;
      if (!t[0]?.d) return false;
      return (await sql`SELECT 1 FROM "Dossier" WHERE "id" = ${id} LIMIT 1`).length > 0;
    },
    async creerProjet(p, jalons, le) {
      await sql`INSERT INTO "Projet" ("id", "dossierId", "titre", "caracteristiques", "referentielVersion", "referentiel", "creePar", "createdAt", "updatedAt")
        VALUES (${p.id}, ${p.dossierId}, ${p.titre}, ${J(p.caracteristiques)}::jsonb, ${p.referentielVersion}, ${J(p.referentiel)}::jsonb, ${p.creePar}, ${le}::timestamp(3), ${le}::timestamp(3))`;
      try {
        for (let i = 0; i < jalons.length; i += LOT) {
          const lot = jalons.slice(i, i + LOT).map((d, k) => ({ code: d.code, phase: d.phase, rang: i + k, definition: d }));
          await sql`INSERT INTO "ProjetJalon" ("projetId", "code", "phase", "rang", "definition", "updatedAt")
            SELECT ${p.id}, x->>'code', x->>'phase', (x->>'rang')::int, x->'definition', ${le}::timestamp(3) FROM jsonb_array_elements(${J(lot)}::jsonb) AS x`;
        }
      } catch (e) {
        await sql`DELETE FROM "Projet" WHERE "id" = ${p.id}`.catch(() => []);
        throw e;
      }
    },
    async listerProjets() {
      const r = await sql`SELECT p."id", p."titre", p."dossierId", p."createdAt",
        (SELECT count(*)::int FROM "ProjetJalon" j WHERE j."projetId" = p."id") AS "nbJalons",
        (SELECT count(*)::int FROM "ProjetJalon" j WHERE j."projetId" = p."id" AND j."statut" = 'VALIDE') AS "nbValides",
        (SELECT count(*)::int FROM "ProjetMembre" m WHERE m."projetId" = p."id" AND m."actif") AS "nbMembres"
        FROM "Projet" p ORDER BY p."createdAt" DESC LIMIT 500`;
      return r.map((x) => ({ id: String(x.id), titre: String(x.titre), dossierId: txt(x.dossierId), createdAt: iso(x.createdAt), nbJalons: Number(x.nbJalons) || 0, nbValides: Number(x.nbValides) || 0, nbMembres: Number(x.nbMembres) || 0 }));
    },
    async projet(id) {
      const r = await sql`SELECT * FROM "Projet" WHERE "id" = ${id} LIMIT 1`;
      return r.length ? projet(r[0]) : null;
    },

    async membres(projetId) {
      return (await sql`SELECT * FROM "ProjetMembre" WHERE "projetId" = ${projetId} ORDER BY "createdAt" ASC`).map(membre);
    },
    async membre(id) {
      const r = await sql`SELECT * FROM "ProjetMembre" WHERE "id" = ${id} LIMIT 1`;
      return r.length ? membre(r[0]) : null;
    },
    async membreParJeton(h) {
      const r = await sql`SELECT * FROM "ProjetMembre" WHERE "jetonHash" = ${h} LIMIT 1`;
      return r.length ? membre(r[0]) : null;
    },
    async creerMembre(m) {
      await sql`INSERT INTO "ProjetMembre" ("id", "projetId", "role", "nom", "telephone", "email", "entreprise", "jetonHash", "actif", "invitePar", "createdAt")
        VALUES (${m.id}, ${m.projetId}, ${m.role}, ${m.nom}, ${m.telephone}, ${m.email}, ${m.entreprise}, ${m.jetonHash}, ${m.actif}, ${m.invitePar}, ${m.createdAt}::timestamp(3))`;
    },
    async majMembre(projetId, id, m) {
      const r = await sql`UPDATE "ProjetMembre" SET "actif" = COALESCE(${m.actif ?? null}::boolean, "actif"), "jetonHash" = COALESCE(${m.jetonHash ?? null}::text, "jetonHash")
        WHERE "id" = ${id} AND "projetId" = ${projetId} RETURNING "id"`;
      return r.length > 0;
    },
    async toucherMembre(id, le) {
      await sql`UPDATE "ProjetMembre" SET "dernierAcces" = ${le}::timestamp(3) WHERE "id" = ${id}`;
    },

    async jalons(projetId) {
      return (await sql`SELECT * FROM "ProjetJalon" WHERE "projetId" = ${projetId} ORDER BY "rang" ASC`).map(jalon);
    },
    async jalon(projetId, code) {
      const r = await sql`SELECT * FROM "ProjetJalon" WHERE "projetId" = ${projetId} AND "code" = ${code} LIMIT 1`;
      return r.length ? jalon(r[0]) : null;
    },
    async etats(projetId, codes) {
      if (!codes.length) return [];
      const r = await sql`SELECT "code", "statut", COALESCE(("definition"->>'pointArret')::boolean, false) AS "pointArret"
        FROM "ProjetJalon" WHERE "projetId" = ${projetId} AND "code" = ANY(${codes}::text[])`;
      return r.map((x) => ({ code: String(x.code), statut: String(x.statut) as JalonLigne["statut"], definition: { pointArret: x.pointArret === true } }));
    },
    async majStatut(projetId, code, de, vers, validePar, le) {
      const valide = vers === "VALIDE";
      const r = await sql`UPDATE "ProjetJalon" SET "statut" = ${vers},
          "validePar" = CASE WHEN ${valide}::boolean THEN ${validePar}::text ELSE NULL END,
          "valideLe" = CASE WHEN ${valide}::boolean THEN ${le}::timestamp(3) ELSE NULL END,
          "updatedAt" = ${le}::timestamp(3)
        WHERE "projetId" = ${projetId} AND "code" = ${code} AND "statut" = ${de} RETURNING "code"`;
      return r.length > 0;
    },
    async majPoint(projetId, code, pointId, etat, le) {
      await sql`UPDATE "ProjetJalon" SET "checklist" = jsonb_set("checklist", ARRAY[${pointId}]::text[], ${J(etat)}::jsonb, true), "updatedAt" = ${le}::timestamp(3)
        WHERE "projetId" = ${projetId} AND "code" = ${code}`;
    },
    async salle(projetId, code, nouvelle) {
      const r = await sql`UPDATE "ProjetJalon" SET "salle" = COALESCE("salle", ${nouvelle}) WHERE "projetId" = ${projetId} AND "code" = ${code} RETURNING "salle"`;
      return String(r[0]?.salle ?? nouvelle);
    },

    async messages(projetId, code, o) {
      if (o.apres) {
        return (await sql`SELECT * FROM "ProjetMessage" WHERE "projetId" = ${projetId} AND "jalonCode" = ${code} AND "createdAt" > ${o.apres}::timestamp(3)
          ORDER BY "createdAt" ASC LIMIT ${o.limite}`).map(message);
      }
      const r = await sql`SELECT * FROM "ProjetMessage" WHERE "projetId" = ${projetId} AND "jalonCode" = ${code}
        AND (${o.avant ?? null}::text IS NULL OR "createdAt" < ${o.avant ?? null}::timestamp(3)) ORDER BY "createdAt" DESC LIMIT ${o.limite}`;
      return r.map(message).reverse();
    },
    async derniersMessages(projetId, limite) {
      return (await sql`SELECT * FROM "ProjetMessage" WHERE "projetId" = ${projetId} AND NOT "masque" ORDER BY "createdAt" DESC LIMIT ${limite}`).map(message);
    },
    async insererMessage(m) {
      await sql`INSERT INTO "ProjetMessage" ("id", "projetId", "jalonCode", "auteurMembreId", "auteurNom", "auteurRole", "texte", "pieceIds", "masque", "createdAt")
        VALUES (${m.id}, ${m.projetId}, ${m.jalonCode}, ${m.auteurMembreId}, ${m.auteurNom}, ${m.auteurRole}, ${m.texte}, ${J(m.pieceIds)}::jsonb, false, ${m.createdAt}::timestamp(3))`;
    },
    async masquerMessage(projetId, id, masque) {
      return (await sql`UPDATE "ProjetMessage" SET "masque" = ${masque} WHERE "id" = ${id} AND "projetId" = ${projetId} RETURNING "id"`).length > 0;
    },

    async insererFichier(f) {
      await sql`INSERT INTO "ProjetFichier" ("id", "projetId", "jalonCode", "pointId", "auteurMembreId", "auteurNom", "nom", "type", "taille", "cleR2", "nature", "createdAt")
        VALUES (${f.id}, ${f.projetId}, ${f.jalonCode}, ${f.pointId}, ${f.auteurMembreId}, ${f.auteurNom}, ${f.nom}, ${f.type}, ${f.taille}, ${f.cleR2}, ${f.nature}, ${f.createdAt}::timestamp(3))`;
    },
    async fichier(projetId, id) {
      const r = await sql`SELECT * FROM "ProjetFichier" WHERE "id" = ${id} AND "projetId" = ${projetId} LIMIT 1`;
      return r.length ? fichier(r[0]) : null;
    },
    async fichiers(projetId, o) {
      if (o.ids) {
        if (!o.ids.length) return [];
        return (await sql`SELECT * FROM "ProjetFichier" WHERE "projetId" = ${projetId} AND "id" = ANY(${o.ids}::text[])`).map(fichier);
      }
      const r = await sql`SELECT * FROM "ProjetFichier" WHERE "projetId" = ${projetId}
        AND (${o.jalonCode ?? null}::text IS NULL OR "jalonCode" = ${o.jalonCode ?? null}::text)
        AND (NOT ${o.images === true}::boolean OR "nature" IN ('PHOTO', 'VIDEO'))
        ORDER BY "createdAt" DESC LIMIT ${o.limite}`;
      return r.map(fichier);
    },

    async documents(projetId, code) {
      return (await sql`SELECT * FROM "ProjetDocument" WHERE "projetId" = ${projetId} AND "jalonCode" = ${code} ORDER BY "createdAt" ASC`).map(document);
    },
    async document(projetId, id) {
      const r = await sql`SELECT * FROM "ProjetDocument" WHERE "id" = ${id} AND "projetId" = ${projetId} LIMIT 1`;
      return r.length ? document(r[0]) : null;
    },
    async insererDocument(d) {
      await sql`INSERT INTO "ProjetDocument" ("id", "projetId", "jalonCode", "modeleId", "valeurs", "statut", "signatures", "auteurNom", "createdAt", "updatedAt")
        VALUES (${d.id}, ${d.projetId}, ${d.jalonCode}, ${d.modeleId}, ${J(d.valeurs)}::jsonb, ${d.statut}, ${J(d.signatures)}::jsonb, ${d.auteurNom}, ${d.createdAt}::timestamp(3), ${d.updatedAt}::timestamp(3))`;
    },
    async majDocument(projetId, id, attendu, d, le) {
      const r = await sql`UPDATE "ProjetDocument" SET
          "valeurs" = COALESCE(${d.valeurs ? J(d.valeurs) : null}::jsonb, "valeurs"),
          "signatures" = COALESCE(${d.signatures ? J(d.signatures) : null}::jsonb, "signatures"),
          "statut" = COALESCE(${d.statut ?? null}::text, "statut"),
          "updatedAt" = ${le}::timestamp(3)
        WHERE "id" = ${id} AND "projetId" = ${projetId} AND "updatedAt" = ${attendu}::timestamp(3) RETURNING "id"`;
      return r.length > 0;
    },

    async journaliser(e) {
      await sql`INSERT INTO "ProjetEvenement" ("id", "projetId", "auteur", "action", "cible", "details", "createdAt")
        VALUES (${e.id}, ${e.projetId}, ${e.auteur}, ${e.action}, ${e.cible}, ${e.details ? J(e.details) : null}::jsonb, ${e.createdAt}::timestamp(3))`;
    },
    async journal(projetId, limite) {
      return (await sql`SELECT * FROM "ProjetEvenement" WHERE "projetId" = ${projetId} ORDER BY "createdAt" DESC LIMIT ${limite}`).map(evenement);
    },
  };
}
