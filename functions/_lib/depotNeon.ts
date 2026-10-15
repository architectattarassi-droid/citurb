/**
 * Dépôt de documents — branchement Neon : qui appartient à quel contexte
 * (gardien), identification par lien personnel (en-tête x-acces), red flag
 * des noms de fichiers, archive Google Drive.
 */
import { CLE_CABINET } from "./appels";
import { empreinte as empreinteJeton } from "./appelsService";
import type { ContexteDepot } from "./depotRegles";
import { depotFichiersNeon, type Sql } from "./depotStockage";
import { idDocument, nomNormalise } from "./depotRegles";
import { archiverDrive, type EnvDrive } from "./depotDrive";
import type { ActeurDepot, CtxDepot, EnvDepot, Gardien } from "./depotService";
import { hacherJeton, JETON_RE } from "./rdv";

export interface EnvDepotComplet extends EnvDepot, EnvDrive { DATABASE_URL?: string; RESEND_API_KEY?: string; LEAD_NOTIFY_FROM?: string }

export const ADMIN_DEPOT: ActeurDepot = { genre: "admin", cle: CLE_CABINET, nom: "CITURBAREA" };

/** Appartenance vérifiée en base pour chaque contexte. */
export function gardienNeon(sql: Sql): Gardien {
  return {
    async autorise(a, contexte, objetId) {
      if (a.genre === "admin") return true;
      // Un lien personnel n'ouvre que l'objet auquel il appartient.
      if (a.genre === "lien") return !!a.lien && a.lien.contexte === contexte && a.lien.objetId === objetId;
      switch (contexte) {
        case "conversation":
          return (await sql`SELECT 1 FROM "Conversation" WHERE "id" = ${objetId} AND "cles" @> ARRAY[${a.cle}]::text[] LIMIT 1`).length > 0;
        case "appel":
          return (await sql`SELECT 1 FROM "DemandeAppel" WHERE "id" = ${objetId} AND "cles" @> ARRAY[${a.cle}]::text[] LIMIT 1`).length > 0;
        case "dossier":
          return a.genre === "client" && !!a.dossierIds?.includes(objetId);
        case "projet":
          return a.genre === "membre" && a.projetId === objetId;
        default:
          return false;
      }
    },
  };
}

/** En-tête x-acces : « messages:<jeton> » | « appel:<jeton> » | « rdv:<jeton> » → acteur limité à cet objet. */
export async function acteurParLien(sql: Sql, entete: string | null): Promise<ActeurDepot | null> {
  const m = /^(messages|appel|rdv):([A-Za-z0-9_-]{43})$/.exec(entete || "");
  if (!m) return null;
  const [, type, jeton] = m;
  if (type === "rdv") {
    if (!JETON_RE.test(jeton)) return null;
    const r = (await sql`SELECT "id", "nom" FROM "RendezVous" WHERE "jetonHash" = ${await hacherJeton(jeton)} LIMIT 1`)[0];
    return r ? { genre: "lien", cle: `rdv:${r.id}`, nom: String(r.nom), lien: { contexte: "rdv", objetId: String(r.id) } } : null;
  }
  const h = await empreinteJeton(jeton);
  const table = type === "messages" ? await sql`SELECT "id", "donnees" FROM "Conversation" WHERE "jetons" @> ARRAY[${h}]::text[] LIMIT 1`
    : await sql`SELECT "id", "donnees" FROM "DemandeAppel" WHERE "jetons" @> ARRAY[${h}]::text[] LIMIT 1`;
  const r = table[0];
  if (!r) return null;
  const donnees = (typeof r.donnees === "string" ? JSON.parse(r.donnees) : r.donnees) as { participants: { cle: string; nom: string; jetonHash: string }[] };
  const p = donnees.participants.find((x) => x.jetonHash === h);
  if (!p) return null;
  const contexte: ContexteDepot = type === "messages" ? "conversation" : "appel";
  return { genre: "lien", cle: p.cle, nom: p.nom, lien: { contexte, objetId: String(r.id) } };
}

const echapper = (s: string) => s.replace(/[&<>"']/g, (x) => `&#${x.charCodeAt(0)};`);

export function contexteDepotNeon(env: EnvDepotComplet, sql: Sql, attendre?: (p: Promise<unknown>) => void): CtxDepot {
  return {
    depot: depotFichiersNeon(sql), gardien: gardienNeon(sql), env, maintenant: Date.now(), attendre,
    archiver: (d, octets) => archiverDrive(env, d, octets),
    // Red flag : coordonnées tentées dans le nom ou la légende d'un document → cabinet prévenu (types seulement).
    signaler: async (a, contexte, objetId, types) => {
      const to = (env.LEAD_NOTIFY_TO || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (!env.RESEND_API_KEY || !to.length) return;
      const texte = `${a.nom} a tenté de transmettre des coordonnées (${types.join(", ")}) dans le nom ou la légende d'un document (${contexte} ${objetId}). Le texte a été masqué ; le document attend votre modération.`;
      await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: env.LEAD_NOTIFY_FROM || "CITURBAREA <no-reply@citurbarea.com>", to, subject: `Tentative de contact direct (document) : ${a.nom}`, text: texte, html: `<p>${echapper(texte)}</p>` }),
      }).catch(() => undefined);
    },
  };
}

/**
 * Enregistrement d'appel vidéo (webhook JaaS, consentement de tous déjà vérifié) → dépôt
 * commun, contexte « appel ». Seulement avec R2 (une vidéo ne tient pas dans Neon) ;
 * sinon null : la trace indique « non conservé » et le cabinet reçoit le lien 8x8 (24 h).
 */
export function deposerEnregistrementAppel(env: EnvDepotComplet, sql: Sql) {
  return async (d: { id: string }, lien: string, dureeS: number | null): Promise<string | null> => {
    if (!env.FICHIERS || !/^https:\/\//.test(lien)) return null;
    const r = await fetch(lien);
    if (!r.ok || !r.body) return null;
    const id = idDocument();
    const cleR2 = `depot/appel/${d.id}/${id}`;
    await env.FICHIERS.put(cleR2, r.body, { httpMetadata: { contentType: "video/mp4" } });
    const taille = Number(r.headers.get("content-length")) || (await env.FICHIERS.get(cleR2, { range: { offset: 0, length: 1 } }))?.size || 0;
    const le = new Date().toISOString();
    const nom = `Enregistrement de l'appel ${le.slice(0, 10)}.mp4`;
    await depotFichiersNeon(sql).creer({
      id, contexte: "appel", objetId: d.id, deposantCle: "admin:cabinet", deposantNom: "CITURBAREA", nom, nomNormalise: nomNormalise(nom), type: "video/mp4", taille,
      empreinte: null, support: "R2", cleR2, largeur: null, hauteur: null,
      meta: { categorie: "video", legende: `Enregistrement accepté par tous les participants${dureeS ? ` · ${Math.round(dureeS / 60)} min` : ""}` },
      version: 1, statut: "VISIBLE", motif: null, moderePar: "consentement de tous", modereLe: le, supprimePar: null, supprimeLe: null, televersement: null,
      aVignette: false, driveId: null, createdAt: le, updatedAt: le,
    });
    return id;
  };
}
