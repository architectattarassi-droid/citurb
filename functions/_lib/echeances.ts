/**
 * Échéances de tous les dossiers et rappels par e-mail à l'administration (lot GP4).
 *   - GET  /api/cc/echeances            tableau de bord (/cc/dashboard)
 *   - POST /api/cc/echeances/rappels    envoi des rappels dus (bouton, ou ouverture du tableau de bord)
 *   - POST /api/taches/rappels          même envoi, appelé chaque jour par une tâche planifiée
 *                                        (en-tête x-tache-secret = TACHES_SECRET)
 * Calcul : packages/contracts/src/gestion/echeances.ts. Les rappels déjà envoyés sont notés
 * dans payload.gestion.rappels : un seul e-mail par échéance et par seuil (J−90, J−30, J−7).
 * Le contenu ne porte que le titre du dossier, la commune et la date : aucune coordonnée.
 */
import { PHASES, journaliser, schemaPret, type Sql } from "./dossierAdmin";
import { destinatairesArchitecte, envoyerMail, type EnvMail } from "./rdv";
import { echeancesDuDossier, rappelsDus, validerDates, type Echeance } from "../../packages/contracts/src/gestion/echeances";
import { CLE_PARAMETRES_GESTION, validerParametresGestion, type ParametresGestion } from "../../packages/contracts/src/gestion/parametres";

const s = (v: unknown) => (v == null || v === "" ? null : String(v));
const objet = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const ORDRE_FONDATIONS = PHASES.find((p) => p.code === "84_FONDATIONS")?.ordre ?? 8400;
const COMMENCE = new Set(["FAITE", "FAITE_HORS_PLATEFORME", "EN_COURS", "DEBLOQUEE"]);

export type DossierEcheances = { id: string; titre: string; clientNom: string | null; commune: string | null; echeances: Echeance[]; rappels: Record<string, number[]>; payload: Record<string, unknown> };

export async function lireEcheances(sql: Sql, aujourdhui: string): Promise<DossierEcheances[]> {
  const schema = await schemaPret(sql);
  if (!schema.dossier) return [];
  const rows = schema.devisFacturation
    ? await sql`SELECT "id", "title", "clientNom", "commune", "phase", "payload",
        to_char("autorisationDate", 'YYYY-MM-DD') AS "autDate", to_char("autorisationExpiration", 'YYYY-MM-DD') AS "autExp"
        FROM "Dossier" WHERE "archivedAt" IS NULL AND ("autorisationDate" IS NOT NULL OR "autorisationExpiration" IS NOT NULL OR "payload" ? 'gestion')
        ORDER BY "createdAt" DESC LIMIT 1000`
    : await sql`SELECT "id", "title", "clientNom", "commune", "phase", "payload", NULL AS "autDate", NULL AS "autExp"
        FROM "Dossier" WHERE "payload" ? 'gestion' ORDER BY "createdAt" DESC LIMIT 1000`;
  const fondations = schema.devisFacturation && rows.length
    ? new Map((await sql`SELECT "dossierId", "statut" FROM "DossierEtape" WHERE "phaseCode" = '84_FONDATIONS'`).map((r) => [String(r.dossierId), String(r.statut)]))
    : new Map<string, string>();
  return rows.map((r) => {
    const payload = objet(r.payload);
    const gestion = objet(payload.gestion);
    const ordre = PHASES.find((p) => p.code === r.phase)?.ordre ?? -1;
    const echeances = echeancesDuDossier({
      autorisationDate: s(r.autDate), autorisationExpiration: s(r.autExp), dates: validerDates(gestion.dates),
      fondationsCommencees: ordre >= ORDRE_FONDATIONS || COMMENCE.has(fondations.get(String(r.id)) ?? ""),
    }, aujourdhui);
    return { id: String(r.id), titre: String(r.title ?? ""), clientNom: s(r.clientNom), commune: s(r.commune), echeances, rappels: objet(gestion.rappels) as Record<string, number[]>, payload };
  }).filter((d) => d.echeances.length);
}

const date = (x: string) => new Date(`${x}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const echapper = (x: string) => x.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Envoie les rappels dus (un e-mail récapitulatif à l'administration) et les note dans chaque dossier. */
export async function envoyerRappels(sql: Sql, env: EnvMail & { PUBLIC_WEB_URL?: string }, aujourdhui: string, auteur = "rappels"): Promise<{ envoyes: number; destinataires: number }> {
  const dossiers = await lireEcheances(sql, aujourdhui);
  const lignes: Array<{ d: DossierEcheances; e: Echeance; seuil: number }> = [];
  for (const d of dossiers) for (const r of rappelsDus(d.echeances, d.rappels)) lignes.push({ d, e: r.echeance, seuil: r.seuil });
  const to = destinatairesArchitecte(env);
  if (!lignes.length || !to.length || !env.RESEND_API_KEY) return { envoyes: 0, destinataires: to.length };
  const base = (env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/$/, "");
  const texte = lignes.map(({ d, e }) => `- ${d.titre}${d.commune ? ` (${d.commune})` : ""} : ${e.libelle} — ${date(e.date)} (${e.joursRestants < 0 ? `dépassée de ${-e.joursRestants} j` : `J−${e.joursRestants}`}). ${e.action} ${base}/cc/dossiers/${d.id}`).join("\n");
  const html = `<p>Échéances à surveiller :</p><ul>${lignes.map(({ d, e }) => `<li><b>${echapper(d.titre)}</b>${d.commune ? ` (${echapper(d.commune)})` : ""} : ${echapper(e.libelle)} — <b>${date(e.date)}</b> (${e.joursRestants < 0 ? `dépassée de ${-e.joursRestants} j` : `J−${e.joursRestants}`}).<br>${echapper(e.action)} <a href="${base}/cc/dossiers/${encodeURIComponent(d.id)}">Ouvrir le dossier</a></li>`).join("")}</ul><p>Tableau de bord : <a href="${base}/cc/dashboard">${base}/cc/dashboard</a></p>`;
  await envoyerMail(env, { to, subject: `CITURBAREA — ${lignes.length} échéance(s) à surveiller`, text: `Échéances à surveiller :\n${texte}`, html });
  // Notés après l'envoi : une erreur d'e-mail est journalisée par envoyerMail et le rappel repartira demain.
  const journal = (await schemaPret(sql)).devisFacturation;
  const parDossier = new Map<string, Array<{ e: Echeance; seuil: number }>>();
  for (const l of lignes) parDossier.set(l.d.id, [...(parDossier.get(l.d.id) ?? []), { e: l.e, seuil: l.seuil }]);
  for (const [id, ls] of parDossier) {
    const d = dossiers.find((x) => x.id === id)!;
    const rappels = { ...d.rappels };
    for (const { e, seuil } of ls) rappels[`${e.cle}|${e.date}`] = [...new Set([...(rappels[`${e.cle}|${e.date}`] ?? []), seuil])];
    const payload = { ...d.payload, gestion: { ...objet(d.payload.gestion), rappels } };
    const maintenant = new Date().toISOString();
    await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify(payload)}::jsonb WHERE "id" = ${id}`;
    if (journal) await journaliser(sql, id, auteur, "RAPPEL_ECHEANCE", { echeances: ls.map(({ e, seuil }) => ({ cle: e.cle, date: e.date, seuil })) }, maintenant).catch(() => undefined);
  }
  return { envoyes: lignes.length, destinataires: to.length };
}

// ── Paramètres (questions ouvertes) — table "Parametre", clé « gestion-projet » ──

export async function lireParametresGestion(sql: Sql): Promise<{ parametres: ParametresGestion; table: boolean }> {
  const t = (await sql`SELECT to_regclass('public."Parametre"') IS NOT NULL AS ok`)[0]?.ok;
  if (!t) return { parametres: validerParametresGestion({}), table: false };
  const r = (await sql`SELECT "valeur" FROM "Parametre" WHERE "cle" = ${CLE_PARAMETRES_GESTION}`)[0];
  return { parametres: validerParametresGestion(r?.valeur), table: true };
}
export async function ecrireParametresGestion(sql: Sql, v: unknown): Promise<ParametresGestion | null> {
  const t = (await sql`SELECT to_regclass('public."Parametre"') IS NOT NULL AS ok`)[0]?.ok;
  if (!t) return null;
  const p = validerParametresGestion(v);
  await sql`INSERT INTO "Parametre" ("cle", "valeur", "updatedAt") VALUES (${CLE_PARAMETRES_GESTION}, ${JSON.stringify(p)}::jsonb, CURRENT_TIMESTAMP)
    ON CONFLICT ("cle") DO UPDATE SET "valeur" = EXCLUDED."valeur", "updatedAt" = EXCLUDED."updatedAt"`;
  return p;
}
