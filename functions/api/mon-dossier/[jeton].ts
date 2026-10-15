/**
 * GET /api/mon-dossier/<jeton> — le client ouvre son dossier par le lien signé
 * reçu à l'invitation (en attendant le compte client du lot 3a). Lecture seule.
 * Aucune coordonnée (ni du client, ni du cabinet, ni d'un tiers) n'est renvoyée :
 * le contact passe par la messagerie et les appels vidéo de CITURBAREA.
 */
import { neon } from "@neondatabase/serverless";
import { json } from "../../_lib/adminSession";
import { PHASES, lireJetonDossier, niveauAlerte, joursAvant, schemaPret, secretLien, type LienEnv, type Sql } from "../../_lib/dossierAdmin";

const s = (v: unknown) => (v == null ? null : String(v));
const ENTETES = { "x-robots-tag": "noindex", "referrer-policy": "no-referrer" };

export async function onRequestGet(ctx: { params: { jeton?: string }; env: LienEnv & { DATABASE_URL?: string } }): Promise<Response> {
  const secret = secretLien(ctx.env);
  if (!ctx.env.DATABASE_URL || !secret) return json(503, { ok: false, error: "storage_unavailable" }, ENTETES);
  const dossierId = await lireJetonDossier(secret, String(ctx.params.jeton || ""));
  if (!dossierId) return json(404, { ok: false, error: "lien_invalide" }, ENTETES);
  try {
    const sql = neon(ctx.env.DATABASE_URL) as unknown as Sql;
    if (!(await schemaPret(sql)).devisFacturation) return json(404, { ok: false, error: "lien_invalide" }, ENTETES);
    const r = (await sql`SELECT d."title", d."commune", d."prefecture", d."lot", d."lotissement", d."titreFoncier", d."gabarit", d."typologie",
        d."autorisationNum", to_char(d."autorisationDate", 'YYYY-MM-DD') AS "autDate", to_char(d."autorisationExpiration", 'YYYY-MM-DD') AS "autExp",
        d."etatChantier", d."phase", d."clientNom", d."raisonSociale", d."payload", d."archivedAt",
        c."nom" AS "cabNom", c."architecte" AS "cabArchitecte"
      FROM "Dossier" d LEFT JOIN "Cabinet" c ON c."id" = d."cabinetId" WHERE d."id" = ${dossierId}`)[0];
    if (!r || r.archivedAt) return json(404, { ok: false, error: "lien_invalide" }, ENTETES);
    const etapes = await sql`SELECT "phaseCode", "statut", to_char("dateRealisation", 'YYYY-MM-DD') AS "date" FROM "DossierEtape" WHERE "dossierId" = ${dossierId}`;
    const parCode = new Map(etapes.map((e) => [String(e.phaseCode), e]));
    const actuelle = PHASES.find((p) => p.code === r.phase);
    const payload = (r.payload && typeof r.payload === "object" ? r.payload : {}) as { missionsReglees?: Array<{ libelle: string; date: string | null }>; client?: { type?: string } };
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const exp = s(r.autExp);
    return json(200, {
      ok: true,
      dossier: {
        titre: s(r.title), commune: s(r.commune), prefecture: s(r.prefecture), lot: s(r.lot), lotissement: s(r.lotissement),
        titreFoncier: s(r.titreFoncier), gabarit: s(r.gabarit), typologie: s(r.typologie),
        autorisation: r.autorisationNum || exp ? { numero: s(r.autorisationNum), date: s(r.autDate), expiration: exp, niveauAlerte: niveauAlerte(exp, aujourdhui), joursRestants: exp ? joursAvant(exp, aujourdhui) : null } : null,
        etatChantier: s(r.etatChantier),
        client: { nom: payload.client?.type === "SOCIETE" ? s(r.raisonSociale) : s(r.clientNom) },
        cabinet: r.cabNom ? { nom: s(r.cabNom), architecte: s(r.cabArchitecte) } : null,
        phaseActuelle: actuelle ? { code: actuelle.code, titre: actuelle.titre } : null,
        // Parcours : étapes saisies (faites, en cours) puis les 5 prochaines phases générales du catalogue.
        etapes: [...PHASES.filter((p) => parCode.has(p.code)), ...PHASES.filter((p) => !parCode.has(p.code) && !p.conditionnelle && actuelle && p.ordre > actuelle.ordre).slice(0, 5)].map((p) => {
          const e = parCode.get(p.code);
          return { code: p.code, titre: p.titre, statut: e ? String(e.statut) : "A_VENIR", date: e ? s(e.date) : null };
        }).filter((e) => e.statut !== "SANS_OBJET"),
        missionsReglees: (payload.missionsReglees || []).map((m) => ({ libelle: m.libelle, date: m.date })),
      },
    }, ENTETES);
  } catch (e) {
    console.error(`[mon-dossier] lecture impossible (${(e as { code?: string })?.code || "sans code"})`);
    return json(503, { ok: false, error: "storage_unavailable" }, ENTETES);
  }
}
