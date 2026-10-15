/**
 * Fiche dossier du back-office (lot 3c) — /cc/dossiers/<id>.
 *
 *   lireFiche     : dossier, compte client, leads, rendez-vous, espaces projet,
 *                   étapes saisies (DossierEtape), journal (DossierEvenement) et
 *                   PARCOURS A → Z (pré-dossier + phases du catalogue).
 *   appliquerAction : actions admin, JAMAIS bloquantes pour l'admin :
 *                   statut forcé, phase forcée, étape (faite / en cours / à faire /
 *                   sans objet / débloquée), étape rouverte, note OPS, déblocage.
 *                   Chaque action est journalisée (journaliser(), dossierAdmin.ts).
 * Tables "DossierEtape" / "DossierEvenement" : docs/sql/devis-facturation-neon.sql
 * (absentes → la fiche se lit, les actions qui en dépendent répondent sql_a_coller).
 * Contrat : docs/architecture/contrat-devis-facturation.md.
 */
import { PHASES, journaliser, schemaPret, type Sql } from "./dossierAdmin";
import { STATUTS_FAITS } from "./vueDossierClient";
import { PHASES_RETIREES } from "../../packages/contracts/src/phases.catalog";
import { PHASES_REF, phaseDuCatalogue, ordrePhase, typeProjetDepuis, VERSION_REFERENTIEL } from "../../packages/contracts/src/gestion/referentiel";
import { bureauControleObligatoire, profilDuDossier, validerProfil, SEUIL_BUREAU_CONTROLE_MDH, type ProfilProjet } from "../../packages/contracts/src/gestion/profil";
import { libelleOrdre, ordreRegional, type OrdreRegional } from "../../packages/contracts/src/gestion/ordres";
import { echeancesDuDossier, validerDates, type DatesGestion } from "../../packages/contracts/src/gestion/echeances";
import { ajouterVideo, videosDe } from "../../packages/contracts/src/gestion/plans";
import { masquerCoordonnees } from "./coordonnees";

const s = (v: unknown) => (v == null || v === "" ? null : String(v));
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : s(v));

/** Statuts du dossier (enum Postgres "DossierStatus"). */
export const STATUTS_DOSSIER = ["DRAFT", "SUBMITTED", "IN_REVIEW", "NEEDS_CHANGES", "APPROVED", "REJECTED"] as const;
/** Statuts d'étape saisissables par l'admin (complète STATUTS_ETAPE de la création admin). */
export const STATUTS_ETAPE_ADMIN = ["FAITE", "FAITE_HORS_PLATEFORME", "EN_COURS", "A_FAIRE", "SANS_OBJET", "DEBLOQUEE"] as const;

/** Étapes avant les phases d'études : du premier contact au paiement (docs/parcours-client.md). */
export const PRE_ETAPES = [
  { code: "PRE_LEAD", titre: "Premier contact (lead)" },
  { code: "PRE_RDV", titre: "Rendez-vous avec l'architecte" },
  { code: "PRE_QUALIFICATION", titre: "Qualification du besoin (brief)" },
  { code: "PRE_DEVIS", titre: "Devis d'honoraires" },
  { code: "PRE_CONTRAT", titre: "Contrat signé" },
  { code: "PRE_PAIEMENT", titre: "Paiement / acompte" },
] as const;
const CODES_ETAPES = new Set<string>([...PRE_ETAPES.map((p) => p.code), ...PHASES.map((p) => p.code), ...PHASES_RETIREES.map((p) => p.code)]);
/** Le bureau de contrôle (18, 42) dépend du budget : obligatoire au-delà de 5 MDH (décision du 15/10/2026). */
const CODES_BUREAU_CONTROLE = new Set(["18_MANDAT_BUREAU_CONTROLE", "42_VISA_STRUCTURE_CONTROLE"]);
/** Le visa : conseil régional de l'Ordre déduit de la commune. */
const CODE_VISA = "32_VISA_CNOA";

export type EtapeParcours = {
  code: string; titre: string; famille: string; conditionnelle: boolean;
  /** Phase du référentiel (P00…P14) : regroupement et ordre chronologique de l'affichage. */
  phaseRef: string;
  /** Étape retirée du catalogue (historique d'un dossier ancien), gardée avec son statut. */
  retiree?: boolean;
  /** Explication courte (condition, ordre compétent…). */
  aide?: string;
  /** FAITE | FAITE_HORS_PLATEFORME | EN_COURS | A_FAIRE | SANS_OBJET | DEBLOQUEE | ANTERIEURE (avant la phase actuelle, non saisie) | A_VENIR */
  statut: string; source: "saisie" | "deduite"; date: string | null; note: string | null; saisiPar: string | null;
};

export type Faits = {
  phase: string | null; createdAt: string | null;
  leads: Array<{ createdAt: string | null }>;
  rdv: Array<{ debut: string | null; statut: string | null }>;
  devisPropose: boolean;
  etapes: Map<string, { statut: string; date: string | null; note: string | null; saisiPar: string | null }>;
  maintenant: string;
  /** Profil du projet (budget, niveaux…) : étapes conditionnelles. */
  profil?: ProfilProjet;
  /** Conseil régional de l'Ordre compétent (visa) ; undefined = non calculé. */
  ordre?: OrdreRegional | null;
};

/** Parcours complet A → Z : rien n'est masqué ni verrouillé, chaque étape reste modifiable par l'admin. */
export function construireParcours(f: Faits): EtapeParcours[] {
  const saisie = (code: string) => f.etapes.get(code);
  const pre = PRE_ETAPES.map((p): EtapeParcours => {
    const e = saisie(p.code);
    if (e) return { code: p.code, titre: p.titre, famille: "PRE_DOSSIER", phaseRef: "P00_IDEE_PROGRAMME", conditionnelle: false, statut: e.statut, source: "saisie", date: e.date, note: e.note, saisiPar: e.saisiPar };
    let statut = "A_FAIRE", date: string | null = null;
    if (p.code === "PRE_LEAD" && f.leads.length) { statut = "FAITE"; date = f.leads[f.leads.length - 1].createdAt; }
    if (p.code === "PRE_RDV") {
      const fait = f.rdv.find((r) => r.statut === "TERMINE");
      const prevu = f.rdv.find((r) => r.statut === "CONFIRME" && (r.debut || "") >= f.maintenant);
      if (fait) { statut = "FAITE"; date = fait.debut; } else if (prevu) { statut = "EN_COURS"; date = prevu.debut; }
    }
    if (p.code === "PRE_QUALIFICATION" && f.createdAt) { statut = "FAITE"; date = f.createdAt; }
    if (p.code === "PRE_DEVIS" && f.devisPropose) statut = "EN_COURS";
    return { code: p.code, titre: p.titre, famille: "PRE_DOSSIER", phaseRef: "P00_IDEE_PROGRAMME", conditionnelle: false, statut, source: "deduite", date: date ? date.slice(0, 10) : null, note: null, saisiPar: null };
  });
  // Phase actuelle ancienne (étape retirée) : son rang dans le catalogue sert encore à déduire « antérieure ».
  const ordreActuel = PHASES.find((p) => p.code === f.phase)?.ordre ?? PHASES_RETIREES.find((p) => p.code === f.phase)?.order ?? -1;
  const ctc = f.profil ? bureauControleObligatoire(f.profil) : null;
  const visa = f.ordre !== undefined ? libelleOrdre(f.ordre) : null;
  const phases = PHASES.map((p): EtapeParcours => {
    const e = saisie(p.code);
    const estCtc = CODES_BUREAU_CONTROLE.has(p.code);
    const titre = p.code === CODE_VISA && f.ordre ? `Visa de l'ordre régional — ${f.ordre.conseil}${f.ordre.antenne ? ` (antenne de ${f.ordre.antenne})` : ""}` : p.titre;
    const aide = estCtc
      ? `Obligatoire si le budget de travaux dépasse ${SEUIL_BUREAU_CONTROLE_MDH} MDH (${ctc === null ? "budget à renseigner" : ctc ? "c'est le cas" : "non obligatoire ici, recommandé"})`
      : p.code === CODE_VISA && visa ? visa.fr : undefined;
    const commun = { code: p.code, titre, famille: p.famille, phaseRef: phaseDuCatalogue(p.code) ?? "P00_IDEE_PROGRAMME", conditionnelle: p.conditionnelle || estCtc, ...(aide ? { aide } : {}) };
    if (e) return { ...commun, statut: e.statut, source: "saisie", date: e.date, note: e.note, saisiPar: e.saisiPar };
    let statut = p.code === f.phase ? "EN_COURS" : p.ordre < ordreActuel ? "ANTERIEURE" : "A_VENIR";
    if (estCtc && ctc === false && statut !== "EN_COURS") statut = "SANS_OBJET";
    return { ...commun, statut, source: "deduite", date: null, note: null, saisiPar: null };
  });
  // Étapes retirées du catalogue : affichées seulement si elles portent un statut (migration sans perte).
  const retirees = PHASES_RETIREES.filter((p) => saisie(p.code) || f.phase === p.code).map((p): EtapeParcours => {
    const e = saisie(p.code);
    return {
      code: p.code, titre: p.title, famille: p.famille, phaseRef: phaseDuCatalogue(p.code) ?? "P04_AUTORISATION", conditionnelle: false, retiree: true, aide: p.motif,
      statut: e?.statut ?? "EN_COURS", source: e ? "saisie" : "deduite", date: e?.date ?? null, note: e?.note ?? null, saisiPar: e?.saisiPar ?? null,
    };
  });
  // Ordre chronologique : phase du référentiel (P00 → P14), puis ordre du catalogue.
  const rang = new Map<string, number>([
    ...PRE_ETAPES.map((p, i): [string, number] => [p.code, i - 100]),
    ...PHASES.map((p): [string, number] => [p.code, p.ordre]),
    ...PHASES_RETIREES.map((p): [string, number] => [p.code, p.order]),
  ]);
  return [...pre, ...phases, ...retirees].sort((a, b) => ordrePhase(a.phaseRef) - ordrePhase(b.phaseRef) || (rang.get(a.code) ?? 0) - (rang.get(b.code) ?? 0));
}

/** Phases du référentiel (en-têtes de la fiche et de la frise), FR/AR. */
export const ENTETES_PHASES = PHASES_REF.map((p) => ({ code: p.code, ordre: p.ordre, titre: p.libelleFr, titreAr: p.libelleAr }));

// ── Actions admin ───────────────────────────────────────────────────────

export type Action =
  | { action: "statut"; statut: (typeof STATUTS_DOSSIER)[number]; motif: string | null }
  | { action: "phase"; phase: string; motif: string | null }
  | { action: "etape"; code: string; statut: (typeof STATUTS_ETAPE_ADMIN)[number]; date: string | null; note: string | null }
  | { action: "rouvrir"; code: string; motif: string | null }
  | { action: "note"; note: string | null }
  | { action: "debloquer"; motif: string }
  | { action: "profil"; profil: ProfilProjet }
  | { action: "dates"; dates: DatesGestion }
  | { action: "video_ajouter"; phase: string; titre: string; url: string; publie: boolean }
  | { action: "video_publier"; id: string; publie: boolean };

const texte = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

/** Valide le corps d'une action (aucune écriture). */
export function lireAction(b: unknown): Action | { erreur: string } {
  const o = (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
  const motif = texte(o.motif, 500);
  switch (o.action) {
    case "statut":
      return (STATUTS_DOSSIER as readonly string[]).includes(String(o.statut)) ? { action: "statut", statut: o.statut as (typeof STATUTS_DOSSIER)[number], motif } : { erreur: "statut_invalide" };
    case "phase":
      return PHASES.some((p) => p.code === o.phase) ? { action: "phase", phase: String(o.phase), motif } : { erreur: "phase_invalide" };
    case "etape": {
      if (!CODES_ETAPES.has(String(o.code))) return { erreur: "etape_invalide" };
      if (!(STATUTS_ETAPE_ADMIN as readonly string[]).includes(String(o.statut))) return { erreur: "statut_etape_invalide" };
      const date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null;
      const note = texte(o.note, 1000) ?? motif;
      // Déblocage d'une étape : motif écrit obligatoire (GP3), gardé dans la note et le journal.
      if (o.statut === "DEBLOQUEE" && !note) return { erreur: "motif_obligatoire" };
      return { action: "etape", code: String(o.code), statut: o.statut as (typeof STATUTS_ETAPE_ADMIN)[number], date, note };
    }
    case "rouvrir":
      return CODES_ETAPES.has(String(o.code)) ? { action: "rouvrir", code: String(o.code), motif } : { erreur: "etape_invalide" };
    case "note":
      return { action: "note", note: texte(o.note, 4000) };
    case "debloquer":
      return motif ? { action: "debloquer", motif } : { erreur: "motif_obligatoire" };
    case "profil":
      return { action: "profil", profil: validerProfil(o.profil, null) };
    case "dates":
      return { action: "dates", dates: validerDates(o.dates) };
    case "video_ajouter":
      return { action: "video_ajouter", phase: String(o.phase ?? ""), titre: masquerCoordonnees(texte(o.titre, 120) ?? ""), url: String(o.url ?? "").slice(0, 300), publie: o.publie === true };
    case "video_publier":
      return typeof o.id === "string" && /^vid_[a-z0-9]{6,40}$/.test(o.id) ? { action: "video_publier", id: o.id, publie: o.publie === true } : { erreur: "video_inconnue" };
    default:
      return { erreur: "action_inconnue" };
  }
}

export type ResultatAction = { status: number; json: Record<string, unknown> };

async function ecrireEtape(sql: Sql, dossierId: string, code: string, statut: string, date: string | null, note: string | null, admin: string, maintenant: string) {
  await sql`INSERT INTO "DossierEtape" ("dossierId", "phaseCode", "statut", "dateRealisation", "note", "saisiPar", "updatedAt")
    VALUES (${dossierId}, ${code}, ${statut}, ${date}::date, ${note}, ${admin}, ${maintenant}::timestamp(3))
    ON CONFLICT ("dossierId", "phaseCode") DO UPDATE SET "statut" = EXCLUDED."statut",
      "dateRealisation" = COALESCE(EXCLUDED."dateRealisation", "DossierEtape"."dateRealisation"),
      "note" = COALESCE(EXCLUDED."note", "DossierEtape"."note"), "saisiPar" = EXCLUDED."saisiPar", "updatedAt" = EXCLUDED."updatedAt"`;
}

/** Applique une action admin et la journalise. */
export async function appliquerAction(sql: Sql, dossierId: string, a: Action, admin: string, maintenant = new Date().toISOString()): Promise<ResultatAction> {
  const d = (await sql`SELECT "status", "phase", "payload" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return { status: 404, json: { ok: false, error: "not_found" } };
  const journal = (await schemaPret(sql)).devisFacturation;
  const besoinTables = a.action === "etape" || a.action === "rouvrir";
  if (besoinTables && !journal) return { status: 503, json: { ok: false, error: "sql_a_coller", fichier: "docs/sql/devis-facturation-neon.sql" } };
  const tracer = (action: string, details: unknown) => (journal ? journaliser(sql, dossierId, admin, action, details, maintenant) : Promise.resolve());

  switch (a.action) {
    case "statut":
      await sql`UPDATE "Dossier" SET "status" = ${a.statut}::"DossierStatus", "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      await tracer("STATUT_FORCE", { de: s(d.status), vers: a.statut, motif: a.motif });
      break;
    case "phase":
      await sql`UPDATE "Dossier" SET "phase" = ${a.phase}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      await tracer("PHASE_FORCEE", { de: s(d.phase), vers: a.phase, motif: a.motif });
      break;
    case "etape":
      await ecrireEtape(sql, dossierId, a.code, a.statut, a.date, a.note, admin, maintenant);
      await tracer(a.statut === "DEBLOQUEE" ? "ETAPE_DEBLOQUEE" : "ETAPE_MAJ", { code: a.code, statut: a.statut, date: a.date, ...(a.statut === "DEBLOQUEE" ? { motif: a.note } : {}) });
      break;
    case "rouvrir":
      await ecrireEtape(sql, dossierId, a.code, "EN_COURS", null, null, admin, maintenant);
      await tracer("ETAPE_ROUVERTE", { code: a.code, motif: a.motif });
      break;
    case "note":
      await sql`UPDATE "Dossier" SET "opsNote" = ${a.note}, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      await tracer("NOTE_OPS", { longueur: a.note?.length ?? 0 });
      break;
    case "profil":
    case "dates": {
      // Profil du projet et dates clés (GP1, GP4) : payload.gestion.{profil,dates} — aucune table nouvelle.
      const payload = { ...((d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>) };
      const avant = (payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>;
      const gestion = a.action === "profil" ? { ...avant, profil: a.profil } : { ...avant, dates: a.dates };
      await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify({ ...payload, gestion })}::jsonb, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      await tracer(a.action === "profil" ? "PROFIL_PROJET" : "DATES_CLES", a.action === "profil" ? { profil: a.profil } : { dates: a.dates });
      break;
    }
    case "video_ajouter":
    case "video_publier": {
      // Liens vidéo (YouTube non répertorié / Vimeo) tant que R2 n'est pas activé : simples références.
      const payload = { ...((d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>) };
      const avant = (payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>;
      let videos = videosDe(payload);
      if (a.action === "video_ajouter") {
        const r = ajouterVideo(videos, a, admin, maintenant, `vid_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
        if (!r.ok) return { status: 400, json: { ok: false, error: r.erreur } };
        videos = r.liste;
        await tracer("VIDEO_AJOUTEE", { id: r.video.id, phase: r.video.phase, version: r.video.version, publie: r.video.publie });
      } else {
        if (!videos.some((v) => v.id === a.id)) return { status: 404, json: { ok: false, error: "video_inconnue" } };
        videos = videos.map((v) => (v.id === a.id ? { ...v, publie: a.publie } : v));
        await tracer(a.publie ? "VIDEO_PUBLIEE" : "VIDEO_DEPUBLIEE", { id: a.id });
      }
      await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify({ ...payload, gestion: { ...avant, videos } })}::jsonb, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      break;
    }
    case "debloquer": {
      // Lève tout ce qui peut arrêter le client : statut de refus / corrections, archivage, blocage posé dans le payload.
      const avant = s(d.status);
      const statut = avant === "REJECTED" || avant === "NEEDS_CHANGES" || avant === "DRAFT" ? "IN_REVIEW" : avant;
      const payload = { ...((d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>) };
      const levees = ["blocage", "blocked", "bloque", "lock"].filter((k) => k in payload);
      for (const k of levees) delete payload[k];
      await sql`UPDATE "Dossier" SET "status" = ${statut}::"DossierStatus", "payload" = ${JSON.stringify(payload)}::jsonb, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
      await sql`UPDATE "Dossier" SET "archivedAt" = NULL WHERE "id" = ${dossierId}`.catch(() => []);
      await tracer("DEBLOQUE", { statutAvant: avant, statutApres: statut, blocagesLeves: levees, motif: a.motif });
      break;
    }
  }
  return { status: 200, json: { ok: true } };
}

// ── Lecture de la fiche ─────────────────────────────────────────────────

async function table(sql: Sql, nom: string): Promise<boolean> {
  const r = await sql`SELECT to_regclass(${`public."${nom}"`}) IS NOT NULL AS ok`;
  return !!r[0]?.ok;
}

export async function lireFiche(sql: Sql, dossierId: string, maintenant = new Date().toISOString()) {
  const d = (await sql`SELECT * FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return null;
  const schema = await schemaPret(sql);
  const cle = (s(d.clientTel) || "").replace(/\D/g, "").slice(-9) || null;
  const [owner, leads, rdv, projets, etapes, journal, cabinet] = await Promise.all([
    sql`SELECT "id", "email", "phone", "username", "isActive", "passwordHash" LIKE '!sans-mot-de-passe%' AS "sansMotDePasse" FROM "User" WHERE "id" = ${d.ownerId} LIMIT 1`.then((r) => r[0] ?? null),
    table(sql, "Lead").then((ok) => ok ? sql`SELECT "id", "nom", "stage", "source", "projetType", "createdAt" FROM "Lead"
      WHERE "convertedDossierId" = ${dossierId} OR (${cle}::text IS NOT NULL AND right(regexp_replace("telephone", '[^0-9]', '', 'g'), 9) = ${cle}::text)
      ORDER BY "createdAt" ASC LIMIT 20` : []),
    table(sql, "RendezVous").then((ok) => ok ? sql`SELECT "id", "debut", "statut", "nom" FROM "RendezVous"
      WHERE "dossierId" = ${dossierId} OR (${cle}::text IS NOT NULL AND right(regexp_replace("telephone", '[^0-9]', '', 'g'), 9) = ${cle}::text)
      ORDER BY "debut" ASC LIMIT 20` : []),
    table(sql, "Projet").then((ok) => ok ? sql`SELECT "id", "titre", "createdAt" FROM "Projet" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt" ASC` : []),
    schema.devisFacturation ? sql`SELECT "phaseCode", "statut", to_char("dateRealisation", 'YYYY-MM-DD') AS "date", "note", "saisiPar" FROM "DossierEtape" WHERE "dossierId" = ${dossierId}` : [],
    schema.devisFacturation ? sql`SELECT "id", "auteur", "action", "details", "createdAt" FROM "DossierEvenement" WHERE "dossierId" = ${dossierId} ORDER BY "createdAt" DESC LIMIT 200` : [],
    schema.devisFacturation && d.cabinetId ? sql`SELECT "id", "nom", "architecte" FROM "Cabinet" WHERE "id" = ${d.cabinetId} LIMIT 1`.then((r) => r[0] ?? null) : null,
  ]);
  const payload = (d.payload && typeof d.payload === "object" ? d.payload : {}) as Record<string, unknown>;
  const mapEtapes = new Map(etapes.map((e) => [String(e.phaseCode), { statut: String(e.statut), date: s(e.date), note: s(e.note), saisiPar: s(e.saisiPar) }]));
  const profil = profilDuDossier(d, typeProjetDepuis(s(d.typologie)));
  const dates = validerDates(((payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>).dates);
  const ordre = ordreRegional({ prefecture: s(d.prefecture), commune: s(d.commune) });
  const parcours = construireParcours({
    profil, ordre,
    phase: s(d.phase), createdAt: iso(d.createdAt),
    leads: leads.map((l) => ({ createdAt: iso(l.createdAt) })),
    rdv: rdv.map((r) => ({ debut: iso(r.debut), statut: s(r.statut) })),
    devisPropose: !!(payload.quoteSnapshot || payload.brief && (payload.brief as Record<string, unknown>).quoteSnapshot || d.packPriceMAD),
    etapes: mapEtapes, maintenant,
  });
  const dossier: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) dossier[k] = v instanceof Date ? v.toISOString() : v;
  return {
    dossier,
    compteClient: owner ? { id: String(owner.id), email: s(owner.email)?.endsWith("@citurbarea.unknown") ? null : s(owner.email), telephone: s(owner.phone), nom: s(owner.username), actif: owner.isActive !== false, motDePasse: !owner.sansMotDePasse } : null,
    cabinet: cabinet ? { id: String(cabinet.id), nom: s(cabinet.nom), architecte: s(cabinet.architecte) } : null,
    leads: leads.map((l) => ({ id: String(l.id), nom: s(l.nom), stage: s(l.stage), source: s(l.source), projetType: s(l.projetType), createdAt: iso(l.createdAt) })),
    rendezVous: rdv.map((r) => ({ id: String(r.id), debut: iso(r.debut), statut: s(r.statut) })),
    projets: projets.map((p) => ({ id: String(p.id), titre: s(p.titre), createdAt: iso(p.createdAt) })),
    parcours,
    phasesRef: ENTETES_PHASES,
    referentielVersion: VERSION_REFERENTIEL,
    profil,
    ordreRegional: ordre ? { ...ordre, libelle: libelleOrdre(ordre).fr } : null,
    dates,
    videos: videosDe(payload),
    echeances: echeancesDuDossier({
      autorisationDate: iso(d.autorisationDate)?.slice(0, 10) ?? null, autorisationExpiration: iso(d.autorisationExpiration)?.slice(0, 10) ?? null, dates,
      fondationsCommencees: (PHASES.find((p) => p.code === d.phase)?.ordre ?? -1) >= (PHASES.find((p) => p.code === "84_FONDATIONS")?.ordre ?? 8400)
        || ["FAITE", "FAITE_HORS_PLATEFORME", "EN_COURS", "DEBLOQUEE"].includes(mapEtapes.get("84_FONDATIONS")?.statut ?? ""),
    }, maintenant.slice(0, 10)),
    journal: journal.map((j) => ({ id: String(j.id), auteur: s(j.auteur), action: s(j.action), details: j.details ?? null, createdAt: iso(j.createdAt) })),
    sqlACollerDevisFacturation: !schema.devisFacturation,
    statutsDossier: STATUTS_DOSSIER, statutsEtape: STATUTS_ETAPE_ADMIN, statutsFaits: [...STATUTS_FAITS],
  };
}
