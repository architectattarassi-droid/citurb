/**
 * Espace projet — routes (membres : /api/projets/* ; back-office : /api/cc/projets/*).
 *
 * Un seul routeur, deux portes d'entrée :
 *   - membre : cookie de session signé (obtenu en échangeant le jeton du lien) ;
 *     il ne voit QUE son projet (un autre identifiant → 404) ;
 *   - administration : back-office (garde functions/api/cc/_middleware.ts), tous les projets.
 * Les données passent par un `Depot` (Neon en production, mémoire dans les tests).
 * Chaque action modifiante écrit une ligne au journal du projet (ProjetEvenement).
 */
import type { ModeleDocument } from "../../apps/web/src/domain/referentiel/types";
import {
  cookieDe, cookieSession, creerSession, DUREE_SESSION_S, enLigne, filtrerValeurs, ID_DOCUMENT_RE, ID_FICHIER_RE, ID_MEMBRE_RE, ID_MESSAGE_RE,
  ID_PROJET_RE, CODE_JALON_RE, libelleAuteur, limites, lireSession, nettoyer, nomDe, nomFichier, nouvelId, participe, peutChangerStatut, peutCocher,
  peutContribuer, peutRediger, peutSigner, roleDe, ROLES, secretSession, signer, STATUTS_JALON, superviseur, validerCaracteristiques, validerCoche,
  validerFichier, validerInstantane, validerMessage, verifierTransition,
  type Acteur, type Caracteristiques, type DefJalon, type Dictionnaire, type EnvFichiers, type EnvSession, type EtatJalon, type EtatPoint, type Nature,
  type Role, type Signature, type StatutJalon,
} from "./projets";
import { accepter, envoyerMail, hacherJeton, JETON_RE, nouveauJeton, telephoneRdv, type EnvMail } from "./rdv";
import { visioConfiguree, type VisioEnv } from "./visio";
import { detecterCoordonnees, masquerCoordonnees } from "./coordonnees";
import { checklistsBloquantes, checklistsDuJalon, estChecklist, etatPV, modeleChecklist } from "../../packages/contracts/src/gestion/checklists";

// ── Stockage R2 (types minimaux, sans dépendance à @cloudflare/workers-types) ──

export interface ObjetR2 { body: ReadableStream | null; size: number; range?: { offset?: number; length?: number } }
export interface BucketR2 {
  put(cle: string, corps: ReadableStream | ArrayBuffer | Uint8Array | string | null, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(cle: string, options?: { range?: Headers }): Promise<ObjetR2 | null>;
  delete(cle: string): Promise<void>;
}

export interface EnvProjets extends EnvSession, EnvFichiers, VisioEnv, EnvMail {
  DATABASE_URL?: string;
  PUBLIC_WEB_URL?: string;
  FICHIERS?: BucketR2;
}

// ── Lignes ──────────────────────────────────────────────────────────────

export type ProjetLigne = {
  id: string; dossierId: string | null; titre: string; caracteristiques: Caracteristiques; referentielVersion: string;
  referentiel: Dictionnaire; creePar: string | null; createdAt: string; updatedAt: string;
};
export type MembreLigne = {
  id: string; projetId: string; role: Role; nom: string; telephone: string | null; email: string | null; entreprise: string | null;
  jetonHash: string; actif: boolean; invitePar: string | null; createdAt: string; dernierAcces: string | null;
};
export type Deblocage = { par: string; le: string; motif: string; pvManquants: string[] };
export type JalonLigne = {
  projetId: string; code: string; phase: string; rang: number; definition: DefJalon; statut: StatutJalon;
  checklist: Record<string, EtatPoint>; validePar: string | null; valideLe: string | null; salle: string | null; updatedAt: string;
  /** Point d'arrêt débloqué par l'administrateur (motif écrit) — colonne GP3, absente avant le SQL. */
  deblocage?: Deblocage | null;
};
export type MessageLigne = {
  id: string; projetId: string; jalonCode: string; auteurMembreId: string | null; auteurNom: string; auteurRole: string;
  texte: string; pieceIds: string[]; masque: boolean; createdAt: string;
};
export type FichierLigne = {
  id: string; projetId: string; jalonCode: string | null; pointId: string | null; auteurMembreId: string | null; auteurNom: string;
  nom: string; type: string; taille: number; cleR2: string; nature: Nature; createdAt: string;
};
export type DocumentLigne = {
  id: string; projetId: string; jalonCode: string; modeleId: string; valeurs: Record<string, unknown>; statut: "BROUILLON" | "SIGNE";
  signatures: Signature[]; auteurNom: string | null; createdAt: string; updatedAt: string;
};
export type EvenementLigne = { id: string; projetId: string; auteur: string; action: string; cible: string | null; details: Record<string, unknown> | null; createdAt: string };
export type ResumeProjet = { id: string; titre: string; dossierId: string | null; createdAt: string; nbJalons: number; nbValides: number; nbMembres: number };

/** Accès aux données : implémenté pour Neon (projetsNeon.ts) et en mémoire (tests). */
export interface Depot {
  tablesPresentes(): Promise<boolean>;
  dossierExiste(id: string): Promise<boolean>;
  creerProjet(p: Omit<ProjetLigne, "createdAt" | "updatedAt">, jalons: DefJalon[], le: string): Promise<void>;
  listerProjets(): Promise<ResumeProjet[]>;
  projet(id: string): Promise<ProjetLigne | null>;

  membres(projetId: string): Promise<MembreLigne[]>;
  membre(id: string): Promise<MembreLigne | null>;
  membreParJeton(jetonHash: string): Promise<MembreLigne | null>;
  creerMembre(m: MembreLigne): Promise<void>;
  majMembre(projetId: string, id: string, m: { actif?: boolean; jetonHash?: string }): Promise<boolean>;
  toucherMembre(id: string, le: string): Promise<void>;

  jalons(projetId: string): Promise<JalonLigne[]>;
  jalon(projetId: string, code: string): Promise<JalonLigne | null>;
  etats(projetId: string, codes: string[]): Promise<EtatJalon[]>;
  /** UPDATE conditionnel (statut courant = de) ; faux si le statut a changé entre-temps. */
  majStatut(projetId: string, code: string, de: StatutJalon, vers: StatutJalon, validePar: string | null, le: string): Promise<boolean>;
  /** Enregistre le déblocage d'un point d'arrêt (faux si la colonne n'existe pas encore : le journal garde le motif). */
  debloquer?(projetId: string, code: string, d: Deblocage): Promise<boolean>;
  majPoint(projetId: string, code: string, pointId: string, etat: EtatPoint, le: string): Promise<void>;
  /** Salle visio du jalon (créée avec `nouvelle` si absente). */
  salle(projetId: string, code: string, nouvelle: string): Promise<string>;

  messages(projetId: string, code: string, o: { avant?: string; apres?: string; limite: number }): Promise<MessageLigne[]>;
  derniersMessages(projetId: string, limite: number): Promise<MessageLigne[]>;
  insererMessage(m: MessageLigne): Promise<void>;
  masquerMessage(projetId: string, id: string, masque: boolean): Promise<boolean>;

  insererFichier(f: FichierLigne): Promise<void>;
  fichier(projetId: string, id: string): Promise<FichierLigne | null>;
  fichiers(projetId: string, o: { jalonCode?: string | null; ids?: string[]; limite: number; images?: boolean }): Promise<FichierLigne[]>;

  documents(projetId: string, code: string): Promise<DocumentLigne[]>;
  document(projetId: string, id: string): Promise<DocumentLigne | null>;
  insererDocument(d: DocumentLigne): Promise<void>;
  /** UPDATE conditionnel (updatedAt courant = attendu) ; faux en cas de modification concurrente. */
  majDocument(projetId: string, id: string, attendu: string, d: { valeurs?: Record<string, unknown>; signatures?: Signature[]; statut?: string }, le: string): Promise<boolean>;

  journaliser(e: EvenementLigne): Promise<void>;
  journal(projetId: string, limite: number): Promise<EvenementLigne[]>;
}

// ── Réponses ────────────────────────────────────────────────────────────

const ENTETES = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" };
export const reponse = (status: number, corps: Record<string, unknown>, entetes: Record<string, string> = {}) =>
  new Response(JSON.stringify(corps), { status, headers: { ...ENTETES, ...entetes } });
const ko = (status: number, error: string, extra: Record<string, unknown> = {}) => reponse(status, { ok: false, error, ...extra });
const ok = (corps: Record<string, unknown> = {}, entetes: Record<string, string> = {}) => reponse(200, { ok: true, ...corps }, entetes);
export const indisponible = () => ko(503, "espace_projet_indisponible");

async function lireJson(req: Request, max = 128 * 1024): Promise<Record<string, unknown> | null> {
  const n = Number(req.headers.get("content-length") || 0);
  if (n > max) return null;
  try {
    const t = await req.text();
    if (t.length > max) return null;
    const v = JSON.parse(t || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

const origineOk = (req: Request) => req.headers.get("origin") === new URL(req.url).origin;
const LECTURE = new Set(["GET", "HEAD"]);

/**
 * Gestion de projet (lots GP2-GP3, functions/_lib/projetsGestion.ts) : pièces du dossier
 * rattaché et PV de chantier. Absent (tests, base sans dossier) : routes 404.
 */
export interface GestionProjet {
  pieces(c: Contexte, a: Acteur, p: ProjetLigne, reste: string[]): Promise<Response>;
  /** Journal du dossier rattaché ("DossierEvenement", via journaliser()). */
  journalDossier?(dossierId: string, auteur: string, action: string, details: Record<string, unknown>, le: string): Promise<void>;
  /** Phase P.. du jalon en attente de paiement (point d'arrêt), sinon null. */
  phaseBloquee?(p: ProjetLigne, phase: string): Promise<string | null>;
  /** Après la validation d'un jalon : phase du dossier recalculée (GP5). */
  synchroDossier?(c: Contexte, p: ProjetLigne, auteur: string): Promise<void>;
  /** Après la création d'un projet depuis un dossier : étapes faites hors plateforme reportées sur les jalons (GP5). */
  apresCreation?(c: Contexte, projetId: string, dossierId: string, auteur: string): Promise<void>;
}

/** Modèle d'un document : référentiel figé du projet, sinon PV de chantier du référentiel de gestion (GP3). */
const modeleDe = (p: ProjetLigne, id: string): ModeleDocument | null => p.referentiel.modeles?.[id] ?? (estChecklist(id) ? modeleChecklist(id) : null);
const caracPV = (p: ProjetLigne) => ({ piscine: p.caracteristiques.piscine, sousSols: p.caracteristiques.sousSols });
const modelesDuJalon = (p: ProjetLigne, d: DefJalon) => [...d.documents, ...checklistsDuJalon(d, caracPV(p)).filter((x) => !d.documents.includes(x))];
export type Contexte = { req: Request; env: EnvProjets; depot: Depot; maintenant: () => string; gestion?: GestionProjet };

async function journaliser(c: Contexte, projetId: string, a: Acteur, action: string, cible: string | null, details: Record<string, unknown> | null = null) {
  await c.depot.journaliser({ id: nouvelId("pev_"), projetId, auteur: libelleAuteur(a), action, cible, details, createdAt: c.maintenant() });
}

// ── Vues ────────────────────────────────────────────────────────────────

const vueMembre = (m: MembreLigne, complet: boolean) => ({
  id: m.id, role: m.role, nom: m.nom, entreprise: m.entreprise, actif: m.actif,
  ...(complet ? { telephone: m.telephone, email: m.email, invitePar: m.invitePar, createdAt: m.createdAt, dernierAcces: m.dernierAcces } : {}),
});

const vueMessage = (m: MessageLigne, admin: boolean) => ({
  id: m.id, jalonCode: m.jalonCode, auteurNom: m.auteurNom, auteurRole: m.auteurRole, createdAt: m.createdAt, masque: m.masque,
  texte: m.masque && !admin ? "" : m.texte, pieceIds: m.masque && !admin ? [] : m.pieceIds,
});

const vueFichier = (f: FichierLigne) => ({ id: f.id, jalonCode: f.jalonCode, pointId: f.pointId, auteurNom: f.auteurNom, nom: f.nom, type: f.type, taille: f.taille, nature: f.nature, createdAt: f.createdAt });

function resumeJalon(j: JalonLigne, a: Acteur) {
  const d = j.definition;
  const faits = d.checklist.filter((p) => j.checklist[p.id]?.fait).length;
  return {
    code: j.code, phase: d.phase, phaseGabarit: d.phaseGabarit ?? null, niveau: d.niveau ?? null, titre: d.titre, ordre: d.ordre, lot: d.lot ?? null,
    pointArret: d.pointArret, acteurs: d.acteurs, validateurs: d.validateurs, prerequis: d.prerequis,
    statut: j.statut, nbPoints: d.checklist.length, nbFaits: faits, nbDocuments: d.documents.length, valideLe: j.valideLe, debloque: !!j.deblocage,
    maPart: !superviseur(a) && participe(a, d),
    aValider: j.statut === "EN_ATTENTE_VALIDATION" && peutChangerStatut(a, d, j.statut, "VALIDE"),
  };
}

// ── Routeur commun (acteur déjà authentifié, projet déjà autorisé) ──────

async function routeProjet(c: Contexte, a: Acteur, projetId: string, reste: string[]): Promise<Response> {
  const { req, depot } = c;
  const m = req.method;
  const admin = a.kind === "admin";
  const projet = await depot.projet(projetId);
  if (!projet) return ko(404, "not_found");

  // GET /:id — tableau de bord
  if (!reste.length && m === "GET") {
    const [jalons, membres, messages, photos] = await Promise.all([
      depot.jalons(projetId), depot.membres(projetId), depot.derniersMessages(projetId, 6), depot.fichiers(projetId, { limite: 8, images: true }),
    ]);
    const titres = new Map(jalons.map((j) => [j.code, j.definition.titre]));
    return ok({
      projet: { id: projet.id, titre: projet.titre, dossierId: admin ? projet.dossierId : null, caracteristiques: projet.caracteristiques, referentielVersion: projet.referentielVersion, phases: projet.referentiel.phases ?? {}, createdAt: projet.createdAt },
      moi: { kind: a.kind, role: roleDe(a), nom: nomDe(a), superviseur: superviseur(a), membreId: a.kind === "membre" ? a.id : null },
      jalons: jalons.map((j) => resumeJalon(j, a)),
      membres: membres.filter((x) => admin || superviseur(a) || x.actif).map((x) => vueMembre(x, admin || superviseur(a))),
      derniersMessages: messages.map((x) => ({ ...vueMessage(x, admin), jalonTitre: titres.get(x.jalonCode) ?? x.jalonCode })),
      dernieresPhotos: photos.map(vueFichier),
      stockage: !!c.env.FICHIERS,
      visio: visioConfiguree(c.env),
    });
  }

  // Membres (architecte du projet ou administration)
  if (reste[0] === "membres") return routeMembres(c, a, projet, reste.slice(1));

  // Documents attendus du dossier rattaché, phase par phase (GP2).
  if (reste[0] === "pieces") return c.gestion ? c.gestion.pieces(c, a, projet, reste.slice(1)) : ko(404, "not_found");

  if (reste[0] === "journal" && reste.length === 1 && m === "GET") {
    if (!superviseur(a)) return ko(403, "interdit");
    return ok({ evenements: await depot.journal(projetId, 300) });
  }

  if (reste[0] === "messages" && reste.length === 2 && m === "PATCH") {
    // Masquage d'un message : administration seulement (append-only).
    if (!admin) return ko(403, "interdit");
    if (!ID_MESSAGE_RE.test(reste[1])) return ko(400, "id_invalid");
    const b = await lireJson(req);
    if (!b || typeof b.masque !== "boolean") return ko(400, "payload_invalid");
    if (!(await depot.masquerMessage(projetId, reste[1], b.masque))) return ko(404, "not_found");
    await journaliser(c, projetId, a, b.masque ? "message_masque" : "message_demasque", reste[1]);
    return ok();
  }

  if (reste[0] === "fichiers") return routeFichiers(c, a, projet, reste.slice(1));
  if (reste[0] === "documents" && reste.length === 2 && m === "PATCH") return modifierDocument(c, a, projet, reste[1]);

  if (reste[0] === "jalons" && reste.length >= 2) {
    const code = reste[1];
    if (!CODE_JALON_RE.test(code)) return ko(400, "code_invalide");
    const j = await depot.jalon(projetId, code);
    if (!j) return ko(404, "jalon_inconnu");
    const sous = reste.slice(2);
    if (!sous.length && m === "GET") return lireJalon(c, a, projet, j);
    if (!sous.length && m === "PATCH") return modifierJalon(c, a, projet, j);
    if (sous[0] === "messages" && sous.length === 1) return m === "GET" ? lireMessages(c, a, j) : m === "POST" ? posterMessage(c, a, j) : ko(405, "methode");
    if (sous[0] === "documents" && sous.length === 1) {
      if (m === "GET") return ok({ documents: await depot.documents(projetId, code) });
      if (m === "POST") return creerDocument(c, a, projet, j);
    }
    if (sous[0] === "visio" && sous.length === 1 && m === "POST") return visioJalon();
  }
  return ko(404, "route_inconnue");
}

// ── Jalon ───────────────────────────────────────────────────────────────

async function lireJalon(c: Contexte, a: Acteur, p: ProjetLigne, j: JalonLigne): Promise<Response> {
  const d = j.definition;
  const dico = p.referentiel;
  const [documents, fichiers, etats] = await Promise.all([
    c.depot.documents(p.id, j.code), c.depot.fichiers(p.id, { jalonCode: j.code, limite: 200 }), c.depot.etats(p.id, d.prerequis),
  ]);
  const exigences = d.exigences.map((id) => dico.exigences?.[id]).filter(Boolean);
  const normes = [...new Set(exigences.flatMap((e) => e!.normes ?? []))].map((id) => dico.normes?.[id]).filter(Boolean);
  const modeles = modelesDuJalon(p, d).map((id) => modeleDe(p, id)).filter(Boolean) as ModeleDocument[];
  const etatsMap = new Map(etats.map((e) => [e.code, e]));
  const pvRequis = checklistsBloquantes(d, caracPV(p)).map((code) => ({ code, titre: modeleChecklist(code)?.titre ?? code, etat: etatPV(documents, code) }));
  return ok({
    jalon: { ...d, statut: j.statut, checklistEtat: j.checklist, validePar: j.validePar, valideLe: j.valideLe, updatedAt: j.updatedAt, phaseTitre: dico.phases?.[d.phaseGabarit ?? d.phase] ?? null },
    prerequisEtat: d.prerequis.map((code) => ({ code, statut: etatsMap.get(code)?.statut ?? null, pointArret: !!etatsMap.get(code)?.definition.pointArret })),
    exigences, normes, modeles, documents, fichiers: fichiers.map(vueFichier),
    pvRequis, deblocage: j.deblocage ?? null, peutDebloquer: a.kind === "admin" && j.statut !== "VALIDE" && (d.pointArret || pvRequis.length > 0),
    droits: {
      contribuer: peutContribuer(a, d),
      rediger: peutRediger(a, d),
      signerModeles: modeles.filter((x) => peutSigner(a, x)).map((x) => x.id),
      cocher: d.checklist.filter((x) => peutCocher(a, d, x) && (j.statut !== "VALIDE" || superviseur(a))).map((x) => x.id),
      statuts: STATUTS_JALON.filter((s) => s !== j.statut && peutChangerStatut(a, d, j.statut, s)),
      moderateur: superviseur(a),
    },
    stockage: !!c.env.FICHIERS,
    visio: visioConfiguree(c.env),
  });
}

async function modifierJalon(c: Contexte, a: Acteur, p: ProjetLigne, j: JalonLigne): Promise<Response> {
  const b = await lireJson(c.req);
  if (!b) return ko(400, "payload_invalid");
  const d = j.definition;
  const le = c.maintenant();

  // Déblocage d'un point d'arrêt par l'administrateur, motif écrit obligatoire (GP3).
  if (b.debloquer !== undefined) {
    if (a.kind !== "admin") return ko(403, "interdit");
    const motif = masquerCoordonnees(nettoyer((b.debloquer as Record<string, unknown> | null)?.motif, 500));
    if (!motif) return ko(400, "motif_obligatoire");
    if (j.statut === "VALIDE") return ko(409, "deja_valide");
    const docs = await c.depot.documents(p.id, j.code);
    const pvManquants = checklistsBloquantes(d, caracPV(p)).filter((code) => etatPV(docs, code) !== "LEVE");
    const deb: Deblocage = { par: libelleAuteur(a), le, motif, pvManquants };
    if (!(await c.depot.majStatut(p.id, j.code, j.statut, "VALIDE", `Déblocage administrateur — ${motif}`.slice(0, 300), le))) return ko(409, "conflit");
    const enregistre = c.depot.debloquer ? await c.depot.debloquer(p.id, j.code, deb).catch(() => false) : false;
    await journaliser(c, p.id, a, "point_arret_debloque", j.code, { motif, pvManquants, de: j.statut, colonne: enregistre });
    if (p.dossierId && c.gestion?.journalDossier) {
      await c.gestion.journalDossier(p.dossierId, libelleAuteur(a), "POINT_ARRET_DEBLOQUE", { projetId: p.id, jalon: j.code, titre: d.titre, motif, pvManquants }, le).catch(() => undefined);
    }
    await c.gestion?.synchroDossier?.(c, p, libelleAuteur(a)).catch(() => undefined);
    return ok({ statut: "VALIDE", deblocage: deb });
  }

  if (b.statut !== undefined) {
    const vers = String(b.statut) as StatutJalon;
    if (vers === j.statut) return ok({ statut: vers });
    const etats = new Map((await c.depot.etats(p.id, d.prerequis)).map((e) => [e.code, e]));
    const v = verifierTransition(a, d, j.statut, vers, etats);
    if (!v.ok) return ko(v.status, v.erreur, v.bloquants ? { bloquants: v.bloquants } : {});
    // Phase non payée : « En attente de paiement » (décision du 15/10/2026) ; déblocage motivé côté facturation.
    if ((vers === "EN_COURS" || vers === "EN_ATTENTE_VALIDATION" || vers === "VALIDE") && c.gestion?.phaseBloquee) {
      const ref = await c.gestion.phaseBloquee(p, d.phaseGabarit ?? d.phase).catch(() => null);
      if (ref) return ko(409, "phase_en_attente_paiement", { phase: ref });
    }
    // Point d'arrêt de chantier : le PV de contrôle doit être signé et non refusé (sinon : déblocage admin motivé).
    if (vers === "VALIDE") {
      const exiges = checklistsBloquantes(d, caracPV(p));
      if (exiges.length) {
        const docs = await c.depot.documents(p.id, j.code);
        const manquants = exiges.filter((code) => etatPV(docs, code) !== "LEVE");
        if (manquants.length) return ko(409, "pv_point_arret_manquant", { pv: manquants });
      }
    }
    if (!(await c.depot.majStatut(p.id, j.code, j.statut, vers, vers === "VALIDE" ? `${nomDe(a)} (${roleDe(a)})` : null, le))) return ko(409, "conflit");
    await journaliser(c, p.id, a, "statut", j.code, { de: j.statut, vers });
    if (vers === "VALIDE" || vers === "SANS_OBJET") await c.gestion?.synchroDossier?.(c, p, libelleAuteur(a)).catch(() => undefined);
    return ok({ statut: vers });
  }

  if (b.point !== undefined) {
    const x = validerCoche(b.point);
    if (!x) return ko(400, "payload_invalid");
    const point = d.checklist.find((q) => q.id === x.pointId);
    if (!point) return ko(404, "point_inconnu");
    if (!peutCocher(a, d, point)) return ko(403, "interdit");
    if (j.statut === "VALIDE" && !superviseur(a)) return ko(409, "jalon_valide");
    if (x.preuveIds.length) {
      const f = await c.depot.fichiers(p.id, { ids: x.preuveIds, limite: x.preuveIds.length });
      if (f.length !== x.preuveIds.length) return ko(400, "preuve_inconnue");
    }
    const etat: EtatPoint = { fait: x.fait, par: nomDe(a), role: roleDe(a), le, preuveIds: x.preuveIds, commentaire: x.commentaire };
    await c.depot.majPoint(p.id, j.code, x.pointId, etat, le);
    if (x.fait && j.statut === "A_FAIRE") await c.depot.majStatut(p.id, j.code, "A_FAIRE", "EN_COURS", null, le);
    await journaliser(c, p.id, a, x.fait ? "point_coche" : "point_decoche", `${j.code}#${x.pointId}`, { preuves: x.preuveIds.length });
    return ok({ point: etat });
  }
  return ko(400, "payload_invalid");
}

// ── Discussion ──────────────────────────────────────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

async function lireMessages(c: Contexte, a: Acteur, j: JalonLigne): Promise<Response> {
  const q = new URL(c.req.url).searchParams;
  const avant = q.get("avant") || undefined, apres = q.get("apres") || undefined;
  if ((avant && !ISO_RE.test(avant)) || (apres && !ISO_RE.test(apres))) return ko(400, "date_invalide");
  const l = await c.depot.messages(j.projetId, j.code, { avant, apres, limite: 50 });
  const ids = [...new Set(l.flatMap((x) => (x.masque && a.kind !== "admin" ? [] : x.pieceIds)))];
  const pieces = ids.length ? await c.depot.fichiers(j.projetId, { ids, limite: ids.length }) : [];
  return ok({ messages: l.map((x) => vueMessage(x, a.kind === "admin")), pieces: pieces.map(vueFichier), peutEcrire: peutContribuer(a, j.definition) });
}

async function posterMessage(c: Contexte, a: Acteur, j: JalonLigne): Promise<Response> {
  if (!peutContribuer(a, j.definition)) return ko(403, "interdit");
  const b = await lireJson(c.req, 32 * 1024);
  const x = b && validerMessage(b);
  if (!x) return ko(400, "message_invalide");
  if (x.pieceIds.length && (await c.depot.fichiers(j.projetId, { ids: x.pieceIds, limite: x.pieceIds.length })).length !== x.pieceIds.length) return ko(400, "piece_inconnue");
  if (a.kind === "membre" && !accepter(`msg:${a.id}`, 30, 60_000)) return ko(429, "trop_de_messages");
  // « Tout passe par CITURBAREA » : les coordonnées écrites par un membre sont masquées et la tentative est journalisée.
  const coordonnees = a.kind === "membre" ? detecterCoordonnees(x.texte) : [];
  if (coordonnees.length) x.texte = masquerCoordonnees(x.texte);
  const msg: MessageLigne = {
    id: nouvelId("pmsg_"), projetId: j.projetId, jalonCode: j.code, auteurMembreId: a.kind === "membre" ? a.id : null,
    auteurNom: nomDe(a), auteurRole: roleDe(a), texte: x.texte, pieceIds: x.pieceIds, masque: false, createdAt: c.maintenant(),
  };
  await c.depot.insererMessage(msg);
  await journaliser(c, j.projetId, a, "message", j.code, { id: msg.id });
  if (coordonnees.length) await journaliser(c, j.projetId, a, "coordonnees_masquees", j.code, { id: msg.id, types: coordonnees });
  return ok({ message: vueMessage(msg, a.kind === "admin"), coordonneesMasquees: coordonnees.length > 0 });
}

// ── Fichiers (R2) ───────────────────────────────────────────────────────

async function routeFichiers(c: Contexte, a: Acteur, p: ProjetLigne, reste: string[]): Promise<Response> {
  const m = c.req.method;
  if (!reste.length && m === "PUT") return deposerFichier(c, a, p);
  if (!reste.length && m === "GET") {
    const jalon = new URL(c.req.url).searchParams.get("jalon");
    if (jalon && !CODE_JALON_RE.test(jalon)) return ko(400, "code_invalide");
    return ok({ fichiers: (await c.depot.fichiers(p.id, { jalonCode: jalon, limite: 300 })).map(vueFichier) });
  }
  if (reste.length === 1 && (m === "GET" || m === "HEAD")) return servirFichier(c, p, reste[0]);
  return ko(404, "route_inconnue");
}

async function deposerFichier(c: Contexte, a: Acteur, p: ProjetLigne): Promise<Response> {
  const { req, env } = c;
  if (!env.FICHIERS) return ko(503, "stockage_non_active");
  const h = req.headers;
  const code = h.get("x-jalon") || null;
  const pointId = h.get("x-point") || null;
  let j: JalonLigne | null = null;
  if (code) {
    if (!CODE_JALON_RE.test(code)) return ko(400, "code_invalide");
    j = await c.depot.jalon(p.id, code);
    if (!j) return ko(404, "jalon_inconnu");
    if (pointId && !j.definition.checklist.some((x) => x.id === pointId)) return ko(404, "point_inconnu");
  } else if (pointId) return ko(400, "point_sans_jalon");
  if (!peutContribuer(a, j?.definition ?? null)) return ko(403, "interdit");

  const longueur = h.get("content-length");
  const v = validerFichier({ type: h.get("content-type") || "", taille: longueur && /^\d+$/.test(longueur) ? Number(longueur) : NaN, nature: h.get("x-nature") }, limites(env));
  if (!v.ok) return ko(v.status, v.erreur);
  if (!req.body) return ko(400, "corps_vide");
  let nom = "fichier";
  try { nom = nomFichier(decodeURIComponent(h.get("x-nom") || "")); } catch { nom = "fichier"; }

  const id = nouvelId("pf_");
  const cle = `projets/${p.id}/${id}`;
  await env.FICHIERS.put(cle, req.body, { httpMetadata: { contentType: v.type } });
  const f: FichierLigne = {
    id, projetId: p.id, jalonCode: code, pointId, auteurMembreId: a.kind === "membre" ? a.id : null, auteurNom: nomDe(a),
    nom, type: v.type, taille: Number(longueur), cleR2: cle, nature: v.nature, createdAt: c.maintenant(),
  };
  try { await c.depot.insererFichier(f); } catch (e) { await env.FICHIERS.delete(cle).catch(() => undefined); throw e; }
  await journaliser(c, p.id, a, "fichier", code, { id, nature: v.nature, taille: f.taille });
  return ok({ fichier: vueFichier(f) });
}

async function servirFichier(c: Contexte, p: ProjetLigne, fid: string): Promise<Response> {
  if (!ID_FICHIER_RE.test(fid)) return ko(400, "id_invalid");
  if (!c.env.FICHIERS) return ko(503, "stockage_non_active");
  const f = await c.depot.fichier(p.id, fid);
  if (!f) return ko(404, "not_found");
  const plage = c.req.headers.get("range");
  const o = await c.env.FICHIERS.get(f.cleR2, plage ? { range: c.req.headers } : undefined);
  if (!o) return ko(404, "not_found");
  const entetes: Record<string, string> = {
    "content-type": f.type,
    "content-disposition": `${enLigne(f.type) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
    "x-content-type-options": "nosniff",
    "cache-control": "private, max-age=86400",
    "accept-ranges": "bytes",
    "x-robots-tag": "noindex",
    "referrer-policy": "no-referrer",
  };
  if (f.type !== "application/pdf") entetes["content-security-policy"] = "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox";
  const r = o.range;
  if (plage && r && typeof r.offset === "number") {
    const longueur = typeof r.length === "number" ? r.length : o.size - r.offset;
    entetes["content-range"] = `bytes ${r.offset}-${r.offset + longueur - 1}/${o.size}`;
    entetes["content-length"] = String(longueur);
    return new Response(c.req.method === "HEAD" ? null : o.body, { status: 206, headers: entetes });
  }
  entetes["content-length"] = String(o.size);
  return new Response(c.req.method === "HEAD" ? null : o.body, { status: 200, headers: entetes });
}

// ── Documents types (PV) ────────────────────────────────────────────────

async function creerDocument(c: Contexte, a: Acteur, p: ProjetLigne, j: JalonLigne): Promise<Response> {
  if (!peutRediger(a, j.definition)) return ko(403, "interdit");
  const b = await lireJson(c.req);
  if (!b || typeof b.modeleId !== "string" || !modelesDuJalon(p, j.definition).includes(b.modeleId)) return ko(400, "modele_invalide");
  const modele = modeleDe(p, b.modeleId);
  if (!modele) return ko(400, "modele_invalide");
  const valeurs = filtrerValeurs(modele, b.valeurs ?? {});
  if (!valeurs) return ko(400, "valeurs_invalides");
  const le = c.maintenant();
  const d: DocumentLigne = { id: nouvelId("pd_"), projetId: p.id, jalonCode: j.code, modeleId: modele.id, valeurs, statut: "BROUILLON", signatures: [], auteurNom: nomDe(a), createdAt: le, updatedAt: le };
  await c.depot.insererDocument(d);
  await journaliser(c, p.id, a, "document_cree", j.code, { id: d.id, modele: modele.id });
  return ok({ document: d });
}

async function modifierDocument(c: Contexte, a: Acteur, p: ProjetLigne, did: string): Promise<Response> {
  if (!ID_DOCUMENT_RE.test(did)) return ko(400, "id_invalid");
  const d = await c.depot.document(p.id, did);
  if (!d) return ko(404, "not_found");
  const modele = modeleDe(p, d.modeleId);
  const j = await c.depot.jalon(p.id, d.jalonCode);
  if (!modele || !j) return ko(409, "modele_absent");
  const b = await lireJson(c.req);
  if (!b) return ko(400, "payload_invalid");
  const le = c.maintenant();

  if (b.signer === true) {
    const s = signer(modele, d.signatures, a, le);
    if (!s.ok) return ko(s.status, s.erreur);
    if (!(await c.depot.majDocument(p.id, d.id, d.updatedAt, { signatures: s.signatures, statut: s.statut }, le))) return ko(409, "conflit");
    await journaliser(c, p.id, a, "document_signe", d.jalonCode, { id: d.id, statut: s.statut });
    return ok({ document: { ...d, signatures: s.signatures, statut: s.statut, updatedAt: le } });
  }
  if (b.valeurs !== undefined) {
    if (!peutRediger(a, j.definition)) return ko(403, "interdit");
    if (d.signatures.length) return ko(409, "document_signe");
    const valeurs = filtrerValeurs(modele, b.valeurs);
    if (!valeurs) return ko(400, "valeurs_invalides");
    if (!(await c.depot.majDocument(p.id, d.id, d.updatedAt, { valeurs }, le))) return ko(409, "conflit");
    await journaliser(c, p.id, a, "document_modifie", d.jalonCode, { id: d.id });
    return ok({ document: { ...d, valeurs, updatedAt: le } });
  }
  return ko(400, "payload_invalid");
}

// ── Visio ───────────────────────────────────────────────────────────────

/**
 * Ancienne salle permanente du jalon : fermée. Une visio de chantier passe
 * désormais par une DEMANDE d'appel acceptée par toutes les personnes invitées
 * (functions/_lib/appels.ts, /api/projets/appels) — aucune salle sans accord.
 */
async function visioJalon(): Promise<Response> {
  return ko(410, "appel_sur_demande");
}

// ── Membres ─────────────────────────────────────────────────────────────

const origine = (env: EnvProjets) => (env.PUBLIC_WEB_URL || "https://citurbarea.com").replace(/\/+$/, "");
export const lienAcces = (env: EnvProjets, jeton: string) => `${origine(env)}/projet/${jeton}`;

async function envoyerLien(env: EnvProjets, m: { nom: string; email: string | null }, titre: string, lien: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !m.email) return false;
  await envoyerMail(env, {
    to: [m.email],
    subject: `Votre accès à l'espace projet — ${titre}`,
    text: `Bonjour ${m.nom},\n\nVous êtes invité(e) dans l'espace du projet « ${titre} » sur CITURBAREA.\n\nVotre lien d'accès personnel (ne le transmettez pas) :\n${lien}\n\nCITURBAREA — architecte inscrit à l'Ordre`,
  });
  return true;
}

async function routeMembres(c: Contexte, a: Acteur, p: ProjetLigne, reste: string[]): Promise<Response> {
  const m = c.req.method;
  if (!reste.length && m === "GET") {
    const l = await c.depot.membres(p.id);
    return ok({ membres: l.filter((x) => superviseur(a) || x.actif).map((x) => vueMembre(x, superviseur(a))) });
  }
  if (!superviseur(a)) return ko(403, "interdit");

  if (!reste.length && m === "POST") {
    const b = await lireJson(c.req);
    if (!b) return ko(400, "payload_invalid");
    const role = String(b.role) as Role;
    if (!ROLES.includes(role)) return ko(400, "role_invalide");
    if (role === "ADMIN_CITURBAREA" && a.kind !== "admin") return ko(403, "interdit");
    const nom = nettoyer(b.nom, 120);
    if (nom.length < 2) return ko(400, "nom_invalide");
    const brutTel = nettoyer(b.telephone, 30);
    const telephone = brutTel ? telephoneRdv(brutTel) : null;
    if (brutTel && !telephone) return ko(400, "telephone_invalide");
    const email = nettoyer(b.email, 200).toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return ko(400, "email_invalide");
    const jeton = nouveauJeton();
    const membre: MembreLigne = {
      id: nouvelId("pm_"), projetId: p.id, role, nom, telephone, email, entreprise: nettoyer(b.entreprise, 160) || null,
      jetonHash: await hacherJeton(jeton), actif: true, invitePar: libelleAuteur(a), createdAt: c.maintenant(), dernierAcces: null,
    };
    await c.depot.creerMembre(membre);
    await journaliser(c, p.id, a, "membre_invite", membre.id, { role });
    const lien = lienAcces(c.env, jeton);
    const emailEnvoye = b.envoyerEmail === true ? await envoyerLien(c.env, membre, p.titre, lien) : false;
    return ok({ membre: vueMembre(membre, true), lien, emailEnvoye });
  }

  const mid = reste[0];
  if (!ID_MEMBRE_RE.test(mid)) return ko(400, "id_invalid");
  const cible = await c.depot.membre(mid);
  if (!cible || cible.projetId !== p.id) return ko(404, "not_found");

  if (reste.length === 1 && m === "PATCH") {
    const b = await lireJson(c.req);
    if (!b || typeof b.actif !== "boolean") return ko(400, "payload_invalid");
    if (a.kind === "membre" && a.id === mid) return ko(409, "soi_meme");
    await c.depot.majMembre(p.id, mid, { actif: b.actif });
    await journaliser(c, p.id, a, b.actif ? "membre_reactive" : "membre_revoque", mid);
    return ok({ membre: vueMembre({ ...cible, actif: b.actif }, true) });
  }
  if (reste.length === 2 && reste[1] === "lien" && m === "POST") {
    const b = (await lireJson(c.req)) ?? {};
    const jeton = nouveauJeton();
    await c.depot.majMembre(p.id, mid, { jetonHash: await hacherJeton(jeton), actif: true });
    await journaliser(c, p.id, a, "lien_regenere", mid);
    const lien = lienAcces(c.env, jeton);
    const emailEnvoye = b.envoyerEmail === true ? await envoyerLien(c.env, cible, p.titre, lien) : false;
    return ok({ lien, emailEnvoye });
  }
  return ko(404, "route_inconnue");
}

// ── Création (back-office) ──────────────────────────────────────────────

async function creerProjet(c: Contexte, a: Acteur): Promise<Response> {
  const b = await lireJson(c.req, 9 * 1024 * 1024);
  if (!b) return ko(400, "payload_invalid");
  const titre = nettoyer(b.titre, 200);
  if (titre.length < 2) return ko(400, "titre_invalide");
  const caracteristiques = validerCaracteristiques(b.caracteristiques);
  if (!caracteristiques) return ko(400, "caracteristiques_invalides");
  const version = nettoyer(b.referentielVersion, 500);
  if (!version) return ko(400, "version_invalide");
  let dossierId: string | null = null;
  if (b.dossierId !== undefined && b.dossierId !== null && b.dossierId !== "") {
    if (typeof b.dossierId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(b.dossierId)) return ko(400, "dossier_invalide");
    if (!(await c.depot.dossierExiste(b.dossierId))) return ko(404, "dossier_inconnu");
    dossierId = b.dossierId;
  }
  const inst = validerInstantane(b.jalons, b.dictionnaire);
  if (!inst.ok) return ko(400, inst.erreur);
  const id = nouvelId("prj_");
  await c.depot.creerProjet({ id, dossierId, titre, caracteristiques, referentielVersion: version, referentiel: inst.dictionnaire, creePar: libelleAuteur(a) }, inst.jalons, c.maintenant());
  await journaliser(c, id, a, "projet_cree", dossierId, { jalons: inst.jalons.length, version });
  if (dossierId) await c.gestion?.apresCreation?.(c, id, dossierId, libelleAuteur(a)).catch(() => undefined);
  return ok({ id, jalons: inst.jalons.length });
}

// ── Portes d'entrée ─────────────────────────────────────────────────────

/** /api/cc/projets/* — la garde du back-office a déjà authentifié l'administrateur. */
export async function routeurAdmin(c: Contexte, chemin: string[], email: string): Promise<Response> {
  if (!(await c.depot.tablesPresentes())) return indisponible();
  const a: Acteur = { kind: "admin", email };
  if (!chemin.length) {
    if (c.req.method === "GET") return ok({ projets: await c.depot.listerProjets(), stockage: !!c.env.FICHIERS });
    if (c.req.method === "POST") return creerProjet(c, a);
    return ko(405, "methode");
  }
  if (!ID_PROJET_RE.test(chemin[0])) return ko(400, "id_invalid");
  return routeProjet(c, a, chemin[0], chemin.slice(1));
}

/** Membre connecté (cookie valide, membre actif, lien non régénéré) ou null. */
export async function membreConnecte(c: Contexte): Promise<MembreLigne | null> {
  const secret = secretSession(c.env);
  const brut = cookieDe(c.req);
  if (!secret || !brut) return null;
  const s = await lireSession(brut, secret, Date.parse(c.maintenant()));
  if (!s) return null;
  const m = await c.depot.membre(s.membreId);
  return m && m.actif && m.jetonHash.startsWith(s.empreinte) ? m : null;
}

/** /api/projets/* — membres invités. */
export async function routeurMembre(c: Contexte, chemin: string[]): Promise<Response> {
  const { req, env, depot } = c;
  if (!LECTURE.has(req.method) && !origineOk(req)) return ko(403, "forbidden_origin");
  const secret = secretSession(env);
  if (!secret) return ko(503, "session_non_configuree");
  if (!(await depot.tablesPresentes())) return indisponible();

  if (chemin.length === 1 && chemin[0] === "acces" && req.method === "POST") {
    const ip = req.headers.get("cf-connecting-ip") || "local";
    if (!accepter(`acces:${ip}`, 20, 10 * 60_000)) return ko(429, "trop_de_tentatives");
    const b = await lireJson(req, 1024);
    const jeton = typeof b?.jeton === "string" ? b.jeton : "";
    if (!JETON_RE.test(jeton)) return ko(404, "lien_invalide");
    const h = await hacherJeton(jeton);
    const m = await depot.membreParJeton(h);
    if (!m || !m.actif) return ko(404, "lien_invalide");
    const le = c.maintenant();
    await depot.toucherMembre(m.id, le);
    await journaliser(c, m.projetId, { kind: "membre", id: m.id, projetId: m.projetId, role: m.role, nom: m.nom }, "acces", m.id);
    return ok({ projetId: m.projetId }, { "set-cookie": cookieSession(await creerSession(m.id, h, secret, Date.parse(le)), DUREE_SESSION_S) });
  }
  if (chemin.length === 1 && chemin[0] === "sortie" && req.method === "POST") return ok({}, { "set-cookie": cookieSession("", 0) });

  const m = await membreConnecte(c);
  if (!m) return ko(401, "non_connecte");
  const a: Acteur = { kind: "membre", id: m.id, projetId: m.projetId, role: m.role, nom: m.nom };

  if (chemin.length === 1 && chemin[0] === "moi" && req.method === "GET") {
    const p = await depot.projet(m.projetId);
    if (!p) return ko(404, "not_found");
    return ok({ membre: vueMembre(m, false), projet: { id: p.id, titre: p.titre } });
  }
  // Un membre n'accède qu'à SON projet ; tout autre identifiant est « introuvable ».
  if (!chemin.length || chemin[0] !== m.projetId) return ko(404, "not_found");
  return routeProjet(c, a, m.projetId, chemin.slice(1));
}

/** Segments après le préfixe (params.chemin de [[chemin]].ts). */
export const segments = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((s) => { try { return decodeURIComponent(s); } catch { return "%invalide%"; } }).filter(Boolean);
