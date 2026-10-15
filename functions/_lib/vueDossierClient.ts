/**
 * Ce que le CLIENT voit de son dossier — une seule source pour :
 *   - GET /api/mon-dossier/<jeton>     (lien d'invitation signé)
 *   - GET /api/client/dossiers/<id>    (espace client, cookie cli_session)
 *   - GET /api/cc/dossiers/<id>/vue-client (vue « shadow » du back-office)
 *
 * Aucune coordonnée (ni du client, ni du cabinet, ni d'un tiers) n'est renvoyée :
 * le contact passe par la messagerie et les appels vidéo de CITURBAREA.
 * Schéma « devis-facturation » absent (Cabinet, DossierEtape, colonnes projet) :
 * vue réduite (titre, commune, phase) plutôt qu'une erreur.
 */
import { PHASES, joursAvant, niveauAlerte, schemaPret, type Sql } from "./dossierAdmin";
import { frise, type PhaseFrise } from "../../packages/contracts/src/gestion/frise";
import { phaseDuCatalogue, typeProjetDepuis } from "../../packages/contracts/src/gestion/referentiel";
import { profilDuDossier } from "../../packages/contracts/src/gestion/profil";
import { documentsParPhase, type EtatPiece } from "../../packages/contracts/src/gestion/pieces";
import { videosDe, type VideoLien } from "../../packages/contracts/src/gestion/plans";
import { dexeEnParallele, lireMajDexe } from "../../packages/contracts/src/gestion/majDexe";
import { dateDemarrage, paiementsDossier, type PhasePaiement } from "./gestionPhases";

/** Frise (GP5) : phase du référentiel suivie par l'espace projet, sinon déduite de la phase du dossier. */
function friseDuDossier(r: Record<string, unknown>, etats: Map<string, EtatPiece> = new Map(), etapes: Map<string, string> = new Map(), paiements: PhasePaiement[] | null = null) {
  const payload = (r.payload && typeof r.payload === "object" ? r.payload : {}) as Record<string, unknown>;
  const gestion = (payload.gestion && typeof payload.gestion === "object" ? payload.gestion : {}) as Record<string, unknown>;
  const phaseRef = typeof gestion.phaseRef === "string" ? gestion.phaseRef : phaseDuCatalogue(r.phase == null ? null : String(r.phase));
  const profil = profilDuDossier(r, typeProjetDepuis(r.typologie == null ? null : String(r.typologie)));
  const paralleles = dexeEnParallele(r.phase == null ? null : String(r.phase), etapes) ? ["P05_ETUDES_EXECUTION"] : [];
  const f = frise(phaseRef, profil, paralleles);
  const maj = lireMajDexe(payload);
  // Paiements : le client voit ses propres factures (montants compris), phase par phase.
  const parPhase = new Map((paiements ?? []).map((p) => [p.phase, p]));
  const phases = f.phases.map((p) => {
    const x = parPhase.get(p.code);
    const paiement = x && !x.aucuneEcheance ? {
      statut: x.statut, enAttente: x.bloquante, restant: x.restant, dateDemarrage: dateDemarrage(x),
      factures: x.factures.map((fa) => ({ numero: fa.numero, statut: fa.statut, du: fa.du, paye: fa.paye, restant: fa.restant, dateEcheance: fa.dateEcheance })),
    } : null;
    return { ...p, ...(paiement ? { paiement } : {}), ...(p.code === "P05_ETUDES_EXECUTION" && maj?.ouverte ? { miseAJourPermis: true } : {}) };
  });
  const prochaine = (paiements ?? []).flatMap((p) => p.factures.filter((fa) => Number(fa.restant) > 0).map((fa) => ({ phase: p.phase, numero: fa.numero, restant: fa.restant, dateEcheance: fa.dateEcheance })))
    .sort((a, b) => a.dateEcheance.localeCompare(b.dateEcheance))[0] ?? null;
  // Ce qui est attendu du client maintenant : ses pièces manquantes jusqu'à la phase en cours.
  const enCours = f.phases.find((p) => p.statut === "EN_COURS")?.ordre ?? 0;
  const aFournir = documentsParPhase(profil, etats, { client: true })
    .filter((p) => p.ordre <= enCours)
    .flatMap((p) => p.pieces.filter((x) => x.producteur === "MAITRE_OUVRAGE" && x.applicabilite === "EXIGE" && (x.statut === "MANQUANT" || x.statut === "REFUSE")).map((x) => ({ phase: p.code, libelleFr: x.libelleFr, libelleAr: x.libelleAr })));
  // Vidéos publiées seulement (liens YouTube / Vimeo, hébergées hors CITURBAREA), sans l'auteur.
  const videos = videosDe(payload).filter((v) => v.publie).map(({ auteur: _a, ...v }) => v);
  return { frise: phases, dureeTotaleMois: f.dureeTotaleMois, libelleDuree: f.libelleDuree, piecesClient: aFournir, videos, prochaineEcheance: prochaine };
}

const s = (v: unknown) => (v == null ? null : String(v));

export type EtapeClient = { code: string; titre: string; statut: string; date: string | null };
export type VueDossierClient = {
  id: string;
  titre: string | null; commune: string | null; prefecture: string | null; lot: string | null; lotissement: string | null;
  titreFoncier: string | null; gabarit: string | null; typologie: string | null;
  autorisation: { numero: string | null; date: string | null; expiration: string | null; niveauAlerte: "EXPIREE" | "J90" | null; joursRestants: number | null } | null;
  etatChantier: string | null;
  client: { nom: string | null };
  cabinet: { nom: string | null; architecte: string | null } | null;
  phaseActuelle: { code: string; titre: string } | null;
  etapes: EtapeClient[];
  missionsReglees: Array<{ libelle: string; date: string | null }>;
  /** Frise des 15 phases (GP5), durées types selon le type de projet. */
  frise?: PhaseFrise[];
  dureeTotaleMois?: [number, number] | null;
  libelleDuree?: string | null;
  /** Pièces que le client doit fournir jusqu'à la phase en cours (l'état exact est dans l'onglet Documents). */
  piecesClient?: Array<{ phase: string; libelleFr: string; libelleAr: string }>;
  /** Première facture restant à payer (le client voit ses propres factures). */
  prochaineEcheance?: { phase: string; numero: string; restant: string; dateEcheance: string } | null;
  /** Liens vidéo publiés (pièces graphiques, en attendant R2). */
  videos?: Array<Omit<VideoLien, "auteur">>;
};

/** Statuts d'étape comptés comme réalisés (création admin + fiche dossier du lot 3c). */
export const STATUTS_FAITS = new Set(["FAITE_HORS_PLATEFORME", "FAITE"]);

/** Vue client d'un dossier (null : introuvable ou archivé). */
export async function lireVueDossierClient(sql: Sql, dossierId: string, aujourdhui = new Date().toISOString().slice(0, 10)): Promise<VueDossierClient | null> {
  const schema = await schemaPret(sql);
  if (!schema.dossier) return null;
  if (!schema.devisFacturation) {
    const r = (await sql`SELECT "id", "title", "commune", "phase", "clientNom", "raisonSociale", "payload" FROM "Dossier" WHERE "id" = ${dossierId}`)[0];
    if (!r) return null;
    const actuelle = PHASES.find((p) => p.code === r.phase);
    return {
      id: dossierId, titre: s(r.title), commune: s(r.commune), prefecture: null, lot: null, lotissement: null, titreFoncier: null, gabarit: null, typologie: null,
      autorisation: null, etatChantier: null, client: { nom: s(r.clientNom) }, cabinet: null,
      phaseActuelle: actuelle ? { code: actuelle.code, titre: actuelle.titre } : null,
      etapes: actuelle ? PHASES.filter((p) => !p.conditionnelle && p.ordre >= actuelle.ordre).slice(0, 6)
        .map((p) => ({ code: p.code, titre: p.titre, statut: p.code === actuelle.code ? "EN_COURS" : "A_VENIR", date: null })) : [],
      missionsReglees: [],
      ...friseDuDossier(r),
    };
  }
  const r = (await sql`SELECT d."title", d."commune", d."prefecture", d."lot", d."lotissement", d."titreFoncier", d."gabarit", d."typologie",
      d."autorisationNum", to_char(d."autorisationDate", 'YYYY-MM-DD') AS "autDate", to_char(d."autorisationExpiration", 'YYYY-MM-DD') AS "autExp",
      d."etatChantier", d."phase", d."clientNom", d."raisonSociale", d."payload", d."archivedAt",
      d."budgetEstime", d."nbEtagesHorsSol", d."nbSousSols", d."surfacePlancher",
      c."nom" AS "cabNom", c."architecte" AS "cabArchitecte"
    FROM "Dossier" d LEFT JOIN "Cabinet" c ON c."id" = d."cabinetId" WHERE d."id" = ${dossierId}`)[0];
  if (!r || r.archivedAt) return null;
  // Pièces déjà déposées (GP2) : la liste « ce que nous attendons de vous » ne garde que les manquantes.
  const etatsPieces = new Map<string, EtatPiece>();
  if ((await sql`SELECT to_regclass(${"public.\"DossierPiece\""}) IS NOT NULL AS ok`)[0]?.ok) {
    for (const x of await sql`SELECT "cle", "statut" FROM "DossierPiece" WHERE "dossierId" = ${dossierId}`) etatsPieces.set(String(x.cle), { statut: String(x.statut) as EtatPiece["statut"], motif: null, documentIds: [], deposePar: null, deposeLe: null, validePar: null, valideLe: null });
  }
  const paiements = await paiementsDossier(sql, dossierId, aujourdhui);
  const etapes = await sql`SELECT "phaseCode", "statut", to_char("dateRealisation", 'YYYY-MM-DD') AS "date" FROM "DossierEtape" WHERE "dossierId" = ${dossierId}`;
  const parCode = new Map(etapes.map((e) => [String(e.phaseCode), e]));
  const actuelle = PHASES.find((p) => p.code === r.phase);
  const payload = (r.payload && typeof r.payload === "object" ? r.payload : {}) as { missionsReglees?: Array<{ libelle: string; date: string | null }>; client?: { type?: string } };
  const exp = s(r.autExp);
  return {
    id: dossierId,
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
    ...friseDuDossier(r, etatsPieces, new Map(etapes.map((e) => [String(e.phaseCode), String(e.statut)])), paiements),
  };
}
