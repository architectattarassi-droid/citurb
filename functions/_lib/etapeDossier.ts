/**
 * Page d'une étape du dossier (lot GP6, « l'étape = une page entière », fondateur 16/10/2026).
 *   GET   /api/cc/dossiers/:id/etapes/:code      admin : tout (fiche, paiement, pièces, normes, journal…)
 *   PATCH /api/cc/dossiers/:id/etapes/:code      admin : planning (dates prévues, responsable), intervenants
 *   GET   /api/client/dossiers/:id/etapes/:code  client : même structure, sans données réservées au cabinet
 * Les blocs qui ont leur propre service sont lus par l'écran à leurs routes : pièces graphiques
 * (dépôt commun), carnet des matériaux (session Matériauthèque, /…/materiaux), messages et appels
 * (contexte « dossier »). Données propres à l'étape : Dossier.payload.gestion.etapes[code].
 */
import { journaliser, schemaPret, type Sql } from "./dossierAdmin";
import { lireFiche } from "./ficheDossier";
import { lirePieces } from "./dossierPieces";
import { lireVueDossierClient } from "./vueDossierClient";
import { masquerCoordonnees } from "./coordonnees";
import { avecDonneesEtape, donneesEtape, infoEtape, messageRelance, roleProjetDuMetier, validerPlanning, type Intervenant } from "../../packages/contracts/src/gestion/etape";
import { nouvelId } from "./projets";
import { depotNeon } from "./projetsNeon";
import { hacherJeton, nouveauJeton } from "./rdv";

const s = (v: unknown) => (v == null || v === "" ? null : String(v));

/** L'événement du journal concerne-t-il cette étape ? (code d'étape, pièce ou phase de l'étape) */
export function evenementDeLEtape(details: unknown, code: string, phaseRef: string | null): boolean {
  const d = (details && typeof details === "object" ? details : {}) as Record<string, unknown>;
  if (d.code === code || d.etape === code || d.jalon === code || d.vers === code || d.de === code) return true;
  if (phaseRef && typeof d.cle === "string" && d.cle.startsWith(`${phaseRef}:`)) return true;
  if (phaseRef && (d.phase === phaseRef || d.phaseRef === phaseRef)) return true;
  return false;
}

/** Vue admin d'une étape. */
export async function lireEtapeAdmin(sql: Sql, dossierId: string, code: string, maintenant = new Date().toISOString()) {
  const info = infoEtape(code);
  if (!info) return null;
  const f = await lireFiche(sql, dossierId, maintenant);
  if (!f) return null;
  const etape = f.parcours.find((e) => e.code === code) ?? null;
  const pieces = await lirePieces(sql, dossierId);
  const phase = pieces?.phases.find((p) => p.code === info.phaseRef) ?? null;
  const donnees = donneesEtape(f.dossier.payload, code);
  const paiement = f.paiements?.find((p) => p.phase === info.phaseRef) ?? null;
  const manquantesClient = (phase?.pieces ?? []).filter((x) => x.producteur === "MAITRE_OUVRAGE" && !x.backOffice && x.applicabilite === "EXIGE" && (x.statut === "MANQUANT" || x.statut === "REFUSE")).map((x) => x.libelleFr);
  return {
    info,
    dossier: { id: dossierId, titre: s(f.dossier.title), phase: s(f.dossier.phase), commune: s(f.dossier.commune), clientNom: s(f.dossier.clientNom) },
    etape,
    planning: {
      datePrevueDebut: donnees.datePrevueDebut ?? null, datePrevueFin: donnees.datePrevueFin ?? null, responsable: donnees.responsable ?? null,
      dateReelle: etape?.date ?? null, dateDemarragePhase: paiement?.dateDemarrage ?? null,
    },
    paiement,
    majDexe: code === "40_DOSSIER_EXECUTION" || code === "GP_MAJ_DEXE" ? f.majDexe : null,
    phase,
    fichiersPieces: pieces?.fichiers ?? {},
    sqlACollerGestion: pieces?.sqlACollerGestion ?? true,
    videos: info.phaseGraphique ? (f.videos ?? []).filter((v) => v.phase === info.phaseGraphique) : [],
    profil: f.profil,
    intervenants: donnees.intervenants ?? [],
    projets: f.projets,
    relance: messageRelance({ titreEtape: etape?.titre ?? info.titre, titreDossier: s(f.dossier.title) ?? "Votre dossier", manquantes: manquantesClient }),
    manquantesClient,
    journal: f.journal.filter((j) => evenementDeLEtape(j.details, code, info.phaseRef)),
    statutsEtape: f.statutsEtape,
  };
}

/** Vue client d'une étape : statut, phase, paiement de ses factures, pièces (hors back-office), relance inversée. */
export async function lireEtapeClient(sql: Sql, dossierId: string, code: string, aujourdhui = new Date().toISOString().slice(0, 10)) {
  const info = infoEtape(code);
  if (!info) return null;
  const v = await lireVueDossierClient(sql, dossierId, aujourdhui);
  if (!v) return null;
  const pieces = await lirePieces(sql, dossierId, { client: true });
  const phase = pieces?.phases.find((p) => p.code === info.phaseRef) ?? null;
  const d = (await sql`SELECT "payload" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  const donnees = donneesEtape(d?.payload, code);
  const frise = v.frise?.find((p) => p.code === info.phaseRef) ?? null;
  return {
    info: { ...info, acteurs: [], validateurs: [] },
    dossier: { id: dossierId, titre: v.titre, commune: v.commune },
    phaseFrise: frise,
    planning: { datePrevueDebut: donnees.datePrevueDebut ?? null, datePrevueFin: donnees.datePrevueFin ?? null },
    phase,
    fichiersPieces: pieces?.fichiers ?? {},
    videos: info.phaseGraphique ? (v.videos ?? []).filter((x) => x.phase === info.phaseGraphique) : [],
    // Intervenants : nom de l'entreprise et rôle seulement (aucune coordonnée).
    intervenants: (donnees.intervenants ?? []).map((i) => ({ id: i.id, genre: i.genre, nom: i.nom, role: i.role })),
  };
}

// ── Actions admin de l'étape ────────────────────────────────────────────

export type ActionEtape =
  | { action: "planning"; datePrevueDebut: string | null; datePrevueFin: string | null; responsable: string | null }
  | { action: "intervenant_ajouter"; proId: string; projetId: string | null }
  | { action: "intervenant_retirer"; id: string };

export function lireActionEtape(b: unknown): ActionEtape | { erreur: string } {
  const o = (b && typeof b === "object" && !Array.isArray(b) ? b : {}) as Record<string, unknown>;
  switch (o.action) {
    case "planning": {
      const p = validerPlanning(o);
      if ("erreur" in p) return p;
      return { action: "planning", ...p, responsable: p.responsable ? masquerCoordonnees(p.responsable) : null };
    }
    case "intervenant_ajouter": {
      // Pro Cercles validé, choisi par son identifiant : nom, métier et rôle sont relus en base (jamais pris du navigateur).
      const proId = typeof o.proId === "string" && /^frn_[A-Za-z0-9]{6,60}$/.test(o.proId) ? o.proId : null;
      const projetId = typeof o.projetId === "string" && /^prj_[a-z0-9]{8,40}$/.test(o.projetId) ? o.projetId : null;
      return proId ? { action: "intervenant_ajouter", proId, projetId } : { erreur: "intervenant_invalide" };
    }
    case "intervenant_retirer":
      return typeof o.id === "string" && /^int_[a-z0-9]{6,40}$/.test(o.id) ? { action: "intervenant_retirer", id: o.id } : { erreur: "intervenant_invalide" };
    default:
      return { erreur: "action_inconnue" };
  }
}

export async function appliquerActionEtape(sql: Sql, dossierId: string, code: string, a: ActionEtape, admin: string, maintenant = new Date().toISOString()): Promise<{ status: number; json: Record<string, unknown> }> {
  if (!infoEtape(code)) return { status: 404, json: { ok: false, error: "etape_inconnue" } };
  const d = (await sql`SELECT "payload" FROM "Dossier" WHERE "id" = ${dossierId} LIMIT 1`)[0];
  if (!d) return { status: 404, json: { ok: false, error: "not_found" } };
  const avant = donneesEtape(d.payload, code);
  let apres = avant, evenement: string, details: Record<string, unknown>;
  if (a.action === "planning") {
    apres = { ...avant, datePrevueDebut: a.datePrevueDebut, datePrevueFin: a.datePrevueFin, responsable: a.responsable };
    evenement = "ETAPE_PLANNING"; details = { code, datePrevueDebut: a.datePrevueDebut, datePrevueFin: a.datePrevueFin, responsable: a.responsable };
  } else if (a.action === "intervenant_ajouter") {
    const pro = (await sql`SELECT "id", "raisonSociale", "metier", "telephone", "email" FROM "Fournisseur" WHERE "id" = ${a.proId} AND "statut" = 'APPROVED' LIMIT 1`.catch(() => []))[0];
    if (!pro) return { status: 404, json: { ok: false, error: "pro_inconnu" } };
    const liste = avant.intervenants ?? [];
    if (liste.some((i) => i.proId === a.proId)) return { status: 409, json: { ok: false, error: "deja_intervenant" } };
    const roleProjet = roleProjetDuMetier(s(pro.metier));
    const genre = roleProjet ? "prestataire" : "fournisseur";
    let projetMembreId: string | null = null, lien: string | null = null;
    // Un prestataire rejoint l'espace projet du dossier avec son rôle ; ses coordonnées restent au back-office (notifications).
    if (roleProjet && a.projetId) {
      const p = (await sql`SELECT 1 FROM "Projet" WHERE "id" = ${a.projetId} AND "dossierId" = ${dossierId} LIMIT 1`.catch(() => []))[0];
      if (!p) return { status: 404, json: { ok: false, error: "projet_inconnu" } };
      const jeton = nouveauJeton();
      projetMembreId = nouvelId("pm_");
      const depot = depotNeon(sql);
      await depot.creerMembre({ id: projetMembreId, projetId: a.projetId, role: roleProjet as never, nom: String(pro.raisonSociale), telephone: s(pro.telephone), email: s(pro.email),
        entreprise: String(pro.raisonSociale), jetonHash: await hacherJeton(jeton), actif: true, invitePar: admin, createdAt: maintenant, dernierAcces: null });
      await depot.journaliser({ id: nouvelId("pev_"), projetId: a.projetId, auteur: admin, action: "membre_invite_depuis_etape", cible: projetMembreId, details: { etape: code, proId: a.proId, role: roleProjet }, createdAt: maintenant });
      lien = `/projet/${jeton}`;
    }
    const i: Intervenant = { id: `int_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, genre, proId: a.proId, nom: String(pro.raisonSociale), role: roleProjet ?? "FOURNISSEUR", ajouteLe: maintenant, ajoutePar: admin, projetMembreId };
    apres = { ...avant, intervenants: [...liste, i].slice(-50) };
    evenement = "ETAPE_INTERVENANT_AJOUTE"; details = { code, genre, proId: a.proId, role: i.role, projetMembreId };
    await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify(avecDonneesEtape(d.payload, code, apres))}::jsonb, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
    if ((await schemaPret(sql)).devisFacturation) await journaliser(sql, dossierId, admin, evenement, details, maintenant);
    // Le lien d'accès est rendu à l'administration seulement (à transmettre par CITURBAREA).
    return { status: 200, json: { ok: true, donnees: apres, intervenant: i, ...(lien ? { lienProjet: lien } : {}) } };
  } else {
    apres = { ...avant, intervenants: (avant.intervenants ?? []).filter((i) => i.id !== a.id) };
    evenement = "ETAPE_INTERVENANT_RETIRE"; details = { code, id: a.id };
  }
  await sql`UPDATE "Dossier" SET "payload" = ${JSON.stringify(avecDonneesEtape(d.payload, code, apres))}::jsonb, "updatedAt" = ${maintenant}::timestamp(3) WHERE "id" = ${dossierId}`;
  if ((await schemaPret(sql)).devisFacturation) await journaliser(sql, dossierId, admin, evenement, details, maintenant);
  return { status: 200, json: { ok: true, donnees: apres } };
}
