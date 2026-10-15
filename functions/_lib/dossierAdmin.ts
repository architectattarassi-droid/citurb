/**
 * Création de dossier par l'admin (/cc) — client existant d'ARC-BATI ou d'un
 * autre cabinet, dossier neuf ou DÉJÀ AVANCÉ à n'importe quelle phase.
 * Contrat et mapping des tables : docs/architecture/contrat-devis-facturation.md.
 * SQL : docs/sql/devis-facturation-neon.sql (jamais créé ici).
 *
 *   - phases (codes de packages/contracts/src/phases.catalog.ts) : la phase
 *     actuelle est choisie ; les antérieures sont « faites hors plateforme »
 *     (ou « sans objet »), avec date et note facultatives — aucun blocage ;
 *   - missions déjà réglées (spec §7 règle 8) : stockées à part, elles ne
 *     reparaîtront jamais en ligne facturable d'un devis ;
 *   - dédoublonnage : l'admin voit les comptes, leads et dossiers de même
 *     téléphone / e-mail et choisit (rattacher ou créer) ;
 *   - invitation : lien signé /mon-dossier/<jeton> en attendant le compte
 *     client (lot 3a) ;
 *   - journal : chaque action admin dans "DossierEvenement".
 * Aucune coordonnée du client n'est renvoyée hors de /api/cc.
 */
import { PHASES_FIXES } from "../../packages/contracts/src/phases.catalog";
import { GRILLE_ARC_BATI_2026_10 } from "../../apps/web/src/domain/honoraires/grilleArcBati";
import { Dec } from "../../apps/web/src/domain/honoraires/decimal";

export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

const TYPOLOGIES = ["MAISON_INDIVIDUELLE", "IMMEUBLE", "VILLA", "LOCAL_COMMERCIAL", "AMENAGEMENT_INTERIEUR"] as const;
const CIVILITES = ["M.", "Mme", "Société"] as const;
export const STATUTS_ETAPE = ["FAITE_HORS_PLATEFORME", "SANS_OBJET", "EN_COURS"] as const;
export type StatutEtape = (typeof STATUTS_ETAPE)[number];

/** Phases proposées à l'admin, dans l'ordre du catalogue. */
export const PHASES = [...PHASES_FIXES].sort((a, b) => a.order - b.order).map((p) => ({
  code: p.code, titre: p.title, famille: p.famille, ordre: p.order, conditionnelle: !!(p.conditionFlag || p.conditionFoncier),
}));
const ORDRE = new Map(PHASES.map((p) => [p.code, p.ordre]));

const clip = (v: unknown, n: number): string => (typeof v === "string" ? v.trim().slice(0, n) : typeof v === "number" ? String(v).slice(0, n) : "");
const ouNull = (v: unknown, n: number) => clip(v, n) || null;

/** Même règle que functions/api/lead-funnel/capture.ts (telephoneLead). */
export function telephoneNormalise(t: string): string | null {
  const c = t.replace(/[\s.\-()]/g, "");
  if (/^(\+212|00212|0)[567]\d{8}$/.test(c)) return c.startsWith("00212") ? `+${c.slice(2)}` : c;
  if (/^(\+|00)[1-9]\d{7,14}$/.test(c)) return c.startsWith("00") ? `+${c.slice(2)}` : c;
  return null;
}
/** Neuf derniers chiffres : 0612345678 et +212612345678 se rejoignent. */
export const cleTelephone = (t: string | null | undefined) => (t || "").replace(/\D/g, "").slice(-9);

const dateIso = (v: unknown): string | null | "invalide" => {
  const s = clip(v, 10);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : "invalide";
};

export interface CreationDossier {
  cabinetId: string;
  client: {
    type: "PERSONNE" | "SOCIETE";
    civilite: (typeof CIVILITES)[number];
    nom: string; prenom: string | null; raisonSociale: string | null; representant: string | null;
    ice: string | null; identifiantFiscal: string | null; rc: string | null;
    telephone: string | null; email: string | null; adresse: string | null; ville: string | null;
  };
  projet: {
    intitule: string; typologie: (typeof TYPOLOGIES)[number] | null; gabarit: string | null; lot: string | null; lotissement: string | null;
    commune: string; prefecture: string | null; titreFoncier: string | null;
    autorisationNum: string | null; autorisationDate: string | null; autorisationExpiration: string | null; etatChantier: string | null;
  };
  phaseActuelle: string;
  etapes: Array<{ phaseCode: string; statut: StatutEtape; date: string | null; note: string | null }>;
  missionsReglees: Array<{ code: string; libelle: string; montant: string | null; date: string | null; note: string | null }>;
  /** Compte client existant choisi au dédoublonnage. */
  clientExistantId: string | null;
  /** Lead existant à rattacher au dossier. */
  leadId: string | null;
  inviter: boolean;
  /** Donnée de test (préfixe « TEST » imposé dans l'intitulé). */
  test: boolean;
}

export type Validation = { ok: true; d: CreationDossier; avertissements: string[] } | { ok: false; erreurs: string[] };

export function validerCreation(b: Record<string, unknown>): Validation {
  const erreurs: string[] = [], avertissements: string[] = [];
  const c = (b.client && typeof b.client === "object" ? b.client : {}) as Record<string, unknown>;
  const p = (b.projet && typeof b.projet === "object" ? b.projet : {}) as Record<string, unknown>;

  const cabinetId = clip(b.cabinetId, 60);
  if (!cabinetId) erreurs.push("Choisir le cabinet");

  const type = c.type === "SOCIETE" ? "SOCIETE" : "PERSONNE";
  const civilite = type === "SOCIETE" ? "Société" : CIVILITES.includes(c.civilite as never) && c.civilite !== "Société" ? (c.civilite as "M." | "Mme") : null;
  if (!civilite) erreurs.push("Civilité du client : M. ou Mme");
  const nom = clip(c.nom, 120), raisonSociale = ouNull(c.raisonSociale, 160);
  if (type === "PERSONNE" && !nom) erreurs.push("Nom du client requis");
  if (type === "SOCIETE" && !raisonSociale) erreurs.push("Raison sociale requise");
  const ice = ouNull(c.ice, 20);
  if (ice && !/^\d{15}$/.test(ice.replace(/\s/g, ""))) erreurs.push("ICE : 15 chiffres");
  if (type === "SOCIETE" && !ice) avertissements.push("ICE de la société absent : obligatoire sur facture (à compléter avant facturation)");

  let telephone: string | null = null;
  const telBrut = clip(c.telephone, 30);
  if (telBrut) { telephone = telephoneNormalise(telBrut); if (!telephone) erreurs.push("Téléphone invalide"); }
  const email = ouNull(c.email, 160)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) erreurs.push("E-mail invalide");
  if (!telephone && !email) avertissements.push("Ni téléphone ni e-mail : l'invitation ne pourra être transmise que par le cabinet");

  const intitule = clip(p.intitule, 200);
  if (!intitule) erreurs.push("Intitulé du projet requis");
  const commune = clip(p.commune, 120);
  if (!commune) erreurs.push("Commune requise (elle est nommée dans la mission de dépôt)");
  const typologie = TYPOLOGIES.includes(p.typologie as never) ? (p.typologie as CreationDossier["projet"]["typologie"]) : null;
  if (p.typologie && !typologie) erreurs.push("Typologie inconnue");
  const dates: Record<string, string | null> = {};
  for (const k of ["autorisationDate", "autorisationExpiration"]) {
    const v = dateIso(p[k]);
    if (v === "invalide") erreurs.push(`Date invalide : ${k === "autorisationDate" ? "date d'autorisation" : "expiration d'autorisation"}`);
    dates[k] = v === "invalide" ? null : v;
  }
  if (dates.autorisationDate && dates.autorisationExpiration && dates.autorisationExpiration < dates.autorisationDate) erreurs.push("L'expiration précède la date d'autorisation");

  const phaseActuelle = clip(b.phaseActuelle, 60) || "00_BRIEF";
  if (!ORDRE.has(phaseActuelle)) erreurs.push("Phase actuelle inconnue");
  const ordreActuel = ORDRE.get(phaseActuelle) ?? 0;

  const etapes: CreationDossier["etapes"] = [];
  const vues = new Set<string>();
  for (const e of Array.isArray(b.etapes) ? b.etapes.slice(0, 120) : []) {
    const r = (e || {}) as Record<string, unknown>;
    const code = clip(r.phaseCode, 60);
    if (!ORDRE.has(code)) { erreurs.push(`Étape inconnue : ${code || "?"}`); continue; }
    if (vues.has(code) || code === phaseActuelle) continue;
    if ((ORDRE.get(code) ?? 0) > ordreActuel) { erreurs.push(`Étape postérieure à la phase actuelle : ${code}`); continue; }
    const statut = r.statut === "SANS_OBJET" ? "SANS_OBJET" : "FAITE_HORS_PLATEFORME";
    const date = dateIso(r.date);
    if (date === "invalide") { erreurs.push(`Date invalide pour l'étape ${code}`); continue; }
    vues.add(code);
    etapes.push({ phaseCode: code, statut, date, note: ouNull(r.note, 500) });
  }

  const missionsReglees: CreationDossier["missionsReglees"] = [];
  for (const m of Array.isArray(b.missionsReglees) ? b.missionsReglees.slice(0, 30) : []) {
    const r = (m || {}) as Record<string, unknown>;
    const code = clip(r.code, 40) || "AUTRE";
    const presta = GRILLE_ARC_BATI_2026_10.prestations.find((x) => x.code === code);
    const libelle = clip(r.libelle, 200) || presta?.libelle || "";
    if (!libelle) { erreurs.push("Mission réglée sans libellé"); continue; }
    let montant: string | null = null;
    if (clip(r.montant, 30)) {
      try { const d = Dec.de(clip(r.montant, 30)); if (d.estNegatif()) throw new Error(); montant = d.fixe2(); } catch { erreurs.push(`Montant invalide : ${libelle}`); continue; }
    }
    const date = dateIso(r.date);
    if (date === "invalide") { erreurs.push(`Date invalide : ${libelle}`); continue; }
    missionsReglees.push({ code, libelle, montant, date, note: ouNull(r.note, 500) });
  }

  const test = b.test === true;
  if (erreurs.length) return { ok: false, erreurs };
  return {
    ok: true,
    avertissements,
    d: {
      cabinetId,
      client: {
        type, civilite: civilite as CreationDossier["client"]["civilite"],
        nom: type === "PERSONNE" ? nom.toUpperCase() : nom, prenom: ouNull(c.prenom, 80), raisonSociale, representant: ouNull(c.representant, 120),
        ice: ice ? ice.replace(/\s/g, "") : null, identifiantFiscal: ouNull(c.identifiantFiscal, 30), rc: ouNull(c.rc, 30),
        telephone, email, adresse: ouNull(c.adresse, 300), ville: ouNull(c.ville, 120),
      },
      projet: {
        intitule: test && !/^TEST\b/i.test(intitule) ? `TEST — ${intitule}` : intitule,
        typologie, gabarit: ouNull(p.gabarit, 20)?.toUpperCase() ?? null, lot: ouNull(p.lot, 60), lotissement: ouNull(p.lotissement, 160),
        commune, prefecture: ouNull(p.prefecture, 120), titreFoncier: ouNull(p.titreFoncier, 60),
        autorisationNum: ouNull(p.autorisationNum, 60), autorisationDate: dates.autorisationDate, autorisationExpiration: dates.autorisationExpiration,
        etatChantier: ouNull(p.etatChantier, 1000),
      },
      phaseActuelle, etapes, missionsReglees,
      clientExistantId: ouNull(b.clientExistantId, 80), leadId: ouNull(b.leadId, 80),
      inviter: b.inviter === true, test,
    },
  };
}

/** « Monsieur Rida MEHDAOUI » / raison sociale. */
export function nomAffiche(c: Pick<CreationDossier["client"], "type" | "civilite" | "nom" | "prenom" | "raisonSociale">): string {
  if (c.type === "SOCIETE") return c.raisonSociale || c.nom;
  return [c.civilite === "Mme" ? "Madame" : "Monsieur", c.prenom, c.nom].filter(Boolean).join(" ");
}

// ── Alerte d'expiration d'autorisation (spec §8.4) ─────────────────────

export type NiveauAlerte = "EXPIREE" | "J90" | null;
export function joursAvant(expiration: string, aujourdhui: string): number {
  return Math.round((Date.parse(`${expiration}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86_400_000);
}
export function niveauAlerte(expiration: string | null | undefined, aujourdhui: string): NiveauAlerte {
  if (!expiration) return null;
  const j = joursAvant(expiration, aujourdhui);
  return j < 0 ? "EXPIREE" : j <= 90 ? "J90" : null;
}

// ── Lien d'invitation signé (/mon-dossier/<jeton>) ──────────────────────

const enc = new TextEncoder();
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (x) => x.charCodeAt(0));
async function hmac(secret: string, d: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(d)));
}
export const DUREE_INVITATION_S = 90 * 24 * 3600;

export interface LienEnv { DOSSIER_LIEN_SECRET?: string; ADMIN_SESSION_SECRET?: string }
/** Secret des liens dossier : DOSSIER_LIEN_SECRET (≥ 32 caractères), à défaut ADMIN_SESSION_SECRET. */
export function secretLien(env: LienEnv): string | null {
  const s = (env.DOSSIER_LIEN_SECRET || "").trim() || (env.ADMIN_SESSION_SECRET || "").trim();
  return s.length >= 32 ? s : null;
}

/** « d1.<exp>.<dossierId>.<hmac> » — sans stockage, expirant (90 jours). */
export async function jetonDossier(secret: string, dossierId: string, maintenant = Date.now()): Promise<string> {
  const corps = `d1.${Math.floor(maintenant / 1000) + DUREE_INVITATION_S}.${b64url(enc.encode(dossierId))}`;
  return `${corps}.${b64url(await hmac(secret, `dossier|${corps}`))}`;
}
export async function lireJetonDossier(secret: string, jeton: string, maintenant = Date.now()): Promise<string | null> {
  const p = jeton.split(".");
  if (p.length !== 4 || p[0] !== "d1" || !/^\d+$/.test(p[1]) || jeton.length > 300) return null;
  let mac: Uint8Array;
  try { mac = deB64url(p[3]); } catch { return null; }
  const attendu = await hmac(secret, `dossier|${p[0]}.${p[1]}.${p[2]}`);
  let diff = attendu.length ^ mac.length;
  for (let i = 0; i < attendu.length; i++) diff |= attendu[i] ^ (mac[i] ?? 0);
  if (diff) return null;
  if (Number(p[1]) < Math.floor(maintenant / 1000)) return null;
  try { return new TextDecoder().decode(deB64url(p[2])) || null; } catch { return null; }
}

// ── Base Neon ───────────────────────────────────────────────────────────

const idAleatoire = (p: string) => `${p}${Date.now().toString(36)}${crypto.getRandomValues(new Uint32Array(2)).reduce((a, n) => a + n.toString(36), "")}`;

/** Le SQL devis-facturation a-t-il été collé ? (colonnes Dossier + tables). */
export async function schemaPret(sql: Sql): Promise<{ dossier: boolean; devisFacturation: boolean }> {
  const r = await sql`SELECT to_regclass('public."Dossier"') IS NOT NULL AS d, to_regclass('public."User"') IS NOT NULL AS u,
    to_regclass('public."Cabinet"') IS NOT NULL AS c, to_regclass('public."DossierEtape"') IS NOT NULL AS e, to_regclass('public."DossierEvenement"') IS NOT NULL AS j,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Dossier' AND column_name = 'autorisationExpiration') AS col`;
  const x = r[0] || {};
  return { dossier: !!x.d && !!x.u, devisFacturation: !!x.c && !!x.e && !!x.j && !!x.col };
}

export async function journaliser(sql: Sql, dossierId: string, auteur: string, action: string, details: unknown, maintenant: string) {
  await sql`INSERT INTO "DossierEvenement" ("id", "dossierId", "auteur", "action", "details", "createdAt")
    VALUES (${idAleatoire("dev_")}, ${dossierId}, ${auteur}, ${action}, ${JSON.stringify(details ?? null)}::jsonb, ${maintenant}::timestamp(3))`;
}

export interface Doublons {
  comptes: Array<{ id: string; nom: string | null; email: string | null; telephone: string | null; nbDossiers: number }>;
  leads: Array<{ id: string; nom: string | null; telephone: string | null; email: string | null; ville: string | null; createdAt: string | null; dossierId: string | null }>;
  dossiers: Array<{ id: string; titre: string; clientNom: string | null; commune: string | null; phase: string | null }>;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const comptesFactices = (e: unknown) => (typeof e === "string" && e.endsWith("@citurbarea.unknown") ? null : (e as string | null) ?? null);

/** Comptes, leads et dossiers de même téléphone (9 derniers chiffres) ou e-mail — pour l'admin uniquement. */
export async function chercherDoublons(sql: Sql, q: { telephone?: string | null; email?: string | null }): Promise<Doublons> {
  const tel = cleTelephone(q.telephone);
  const t = tel.length === 9 ? tel : null;
  const email = (q.email || "").trim().toLowerCase() || null;
  if (!t && !email) return { comptes: [], leads: [], dossiers: [] };
  const tables = (await sql`SELECT to_regclass('public."User"') IS NOT NULL AS u, to_regclass('public."Lead"') IS NOT NULL AS l, to_regclass('public."Dossier"') IS NOT NULL AS d`)[0] || {};
  // "User" n'existe jamais sans "Dossier" (même fichier SQL) : le décompte peut lire "Dossier".
  const comptes = tables.u && tables.d
    ? await sql`SELECT u."id", u."username", u."email", u."phone",
        (SELECT count(*)::int FROM "Dossier" x WHERE x."ownerId" = u."id") AS "n"
        FROM "User" u WHERE u."role" = 'CLIENT' AND ((${t}::text IS NOT NULL AND right(regexp_replace(coalesce(u."phone", ''), '\\D', '', 'g'), 9) = ${t}::text)
          OR (${email}::text IS NOT NULL AND lower(u."email") = ${email}::text)) LIMIT 10`.catch(() => [])
    : [];
  const leads = tables.l
    ? await sql`SELECT "id", "nom", "telephone", "email", "ville", "createdAt", "convertedDossierId" FROM "Lead"
        WHERE (${t}::text IS NOT NULL AND right(regexp_replace(coalesce("telephone", ''), '\\D', '', 'g'), 9) = ${t}::text)
           OR (${email}::text IS NOT NULL AND lower("email") = ${email}::text) ORDER BY "createdAt" DESC LIMIT 10`.catch(() => [])
    : [];
  const dossiers = tables.d
    ? await sql`SELECT "id", "title", "clientNom", "commune", "phase" FROM "Dossier"
        WHERE (${t}::text IS NOT NULL AND right(regexp_replace(coalesce("clientTel", ''), '\\D', '', 'g'), 9) = ${t}::text)
           OR (${email}::text IS NOT NULL AND lower("clientEmail") = ${email}::text) ORDER BY "createdAt" DESC LIMIT 10`.catch(() => [])
    : [];
  return {
    comptes: comptes.map((r) => ({ id: String(r.id), nom: (r.username as string) ?? null, email: comptesFactices(r.email), telephone: (r.phone as string) ?? null, nbDossiers: Number(r.n) || 0 })),
    leads: leads.map((r) => ({ id: String(r.id), nom: (r.nom as string) ?? null, telephone: (r.telephone as string) ?? null, email: (r.email as string) ?? null, ville: (r.ville as string) ?? null, createdAt: iso(r.createdAt), dossierId: (r.convertedDossierId as string) ?? null })),
    dossiers: dossiers.map((r) => ({ id: String(r.id), titre: String(r.title ?? ""), clientNom: (r.clientNom as string) ?? null, commune: (r.commune as string) ?? null, phase: (r.phase as string) ?? null })),
  };
}

export class RefusCreation extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

/** Crée le compte (si besoin), le dossier, ses étapes, le rattachement du lead et le journal. */
export async function creerDossierAdmin(sql: Sql, d: CreationDossier, admin: string, maintenant = new Date().toISOString()): Promise<{ dossierId: string; ownerId: string; compteCree: boolean }> {
  const cab = await sql`SELECT "id" FROM "Cabinet" WHERE "id" = ${d.cabinetId} AND "actif" = true`;
  if (!cab.length) throw new RefusCreation(400, "cabinet_inconnu", "Cabinet inconnu ou inactif");

  let ownerId: string, compteCree = false;
  if (d.clientExistantId) {
    const u = await sql`SELECT "id" FROM "User" WHERE "id" = ${d.clientExistantId} AND "role" = 'CLIENT'`;
    if (!u.length) throw new RefusCreation(400, "client_inconnu", "Compte client introuvable");
    ownerId = String(u[0].id);
  } else {
    if (d.client.email) {
      const pris = await sql`SELECT "id" FROM "User" WHERE lower("email") = ${d.client.email}`;
      if (pris.length) throw new RefusCreation(409, "email_existant", "Un compte existe déjà avec cet e-mail : le rattacher (dédoublonnage)");
    }
    ownerId = crypto.randomUUID();
    const mail = d.client.email || `client-${ownerId.slice(0, 12)}@citurbarea.unknown`;
    await sql`INSERT INTO "User" ("id", "email", "passwordHash", "role", "plan", "isActive", "createdAt", "updatedAt", "username", "phone")
      VALUES (${ownerId}, ${mail}, '!sans-mot-de-passe:a-activer', 'CLIENT', 'PRO', true, ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${nomAffiche(d.client)}, ${d.client.telephone})`;
    compteCree = true;
  }

  const dossierId = idAleatoire("dos_");
  const c = d.client, p = d.projet;
  const payload = {
    origine: "admin",
    test: d.test || undefined,
    client: { type: c.type, civilite: c.civilite, nom: c.nom, prenom: c.prenom, raisonSociale: c.raisonSociale, representant: c.representant },
    missionsReglees: d.missionsReglees,
  };
  const statut = d.phaseActuelle === "00_BRIEF" ? "SUBMITTED" : "APPROVED";
  await sql`INSERT INTO "Dossier" (
      "id", "ownerId", "title", "commune", "payload", "status", "submittedAt", "createdAt", "updatedAt",
      "porteType", "gestionMode", "phase", "clientNom", "clientTel", "clientEmail", "clientAdresse", "raisonSociale", "rc", "ice", "representant",
      "cabinetId", "origine", "creePar", "clientCivilite", "clientPrenom", "clientVille", "clientIdentifiantFiscal",
      "typologie", "gabarit", "lot", "lotissement", "prefecture", "titreFoncier",
      "autorisationNum", "autorisationDate", "autorisationExpiration", "etatChantier"
    ) VALUES (
      ${dossierId}, ${ownerId}, ${p.intitule}, ${p.commune}, ${JSON.stringify(payload)}::jsonb, ${statut}::"DossierStatus", ${maintenant}::timestamp(3), ${maintenant}::timestamp(3), ${maintenant}::timestamp(3),
      'P1', 'DELEGUE', ${d.phaseActuelle}, ${nomAffiche(c)}, ${c.telephone}, ${c.email}, ${c.adresse}, ${c.raisonSociale}, ${c.rc}, ${c.ice}, ${c.representant},
      ${d.cabinetId}, 'ADMIN', ${admin}, ${c.civilite}, ${c.prenom}, ${c.ville}, ${c.identifiantFiscal},
      ${p.typologie}, ${p.gabarit}, ${p.lot}, ${p.lotissement}, ${p.prefecture}, ${p.titreFoncier},
      ${p.autorisationNum}, ${p.autorisationDate}::date, ${p.autorisationExpiration}::date, ${p.etatChantier}
    )`;

  const etapes = [...d.etapes, { phaseCode: d.phaseActuelle, statut: "EN_COURS" as StatutEtape, date: null, note: null }];
  for (const e of etapes) {
    await sql`INSERT INTO "DossierEtape" ("dossierId", "phaseCode", "statut", "dateRealisation", "note", "saisiPar", "updatedAt")
      VALUES (${dossierId}, ${e.phaseCode}, ${e.statut}, ${e.date}::date, ${e.note}, ${admin}, ${maintenant}::timestamp(3))
      ON CONFLICT ("dossierId", "phaseCode") DO NOTHING`;
  }

  if (d.leadId) {
    await sql`UPDATE "Lead" SET "convertedDossierId" = ${dossierId}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${d.leadId}`.catch(() => []);
  }

  // Journal : aucune coordonnée (seulement des faits).
  await journaliser(sql, dossierId, admin, "DOSSIER_CREE_ADMIN", {
    cabinetId: d.cabinetId, phaseActuelle: d.phaseActuelle, etapesAnterieures: d.etapes.length, missionsReglees: d.missionsReglees.map((m) => m.code),
    compteCree, clientExistant: !!d.clientExistantId, leadRattache: d.leadId, test: d.test,
  }, maintenant);
  return { dossierId, ownerId, compteCree };
}

/** Dossiers dont l'autorisation expire dans 90 jours ou moins (ou a expiré). */
export async function alertesAutorisation(sql: Sql, aujourdhui: string) {
  const rows = await sql`SELECT "id", "title", "clientNom", "commune", "cabinetId", "autorisationNum", to_char("autorisationExpiration", 'YYYY-MM-DD') AS "exp"
    FROM "Dossier" WHERE "autorisationExpiration" IS NOT NULL AND "archivedAt" IS NULL AND "autorisationExpiration" <= (${aujourdhui}::date + 90)
    ORDER BY "autorisationExpiration" ASC LIMIT 200`;
  return rows.map((r) => ({
    id: String(r.id), titre: String(r.title ?? ""), clientNom: (r.clientNom as string) ?? null, commune: (r.commune as string) ?? null,
    cabinetId: (r.cabinetId as string) ?? null, autorisationNum: (r.autorisationNum as string) ?? null, expiration: String(r.exp),
    joursRestants: joursAvant(String(r.exp), aujourdhui), niveau: niveauAlerte(String(r.exp), aujourdhui),
    /** Devis de renouvellement à proposer (spec §8.4) — prérempli à l'étape Devis. */
    prestationProposee: "DEPOT_RENOUV",
  }));
}
