import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../tomes/tome-at/kernel/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { dossierToShape, validateDossierShape, DossierShape } from './dossier-shape';
import { toV7, phaseVariants } from './phase-mapping';

export const PHASE_BRIEF = 'PHASE_00_BRIEF' as const;

/**
 * BRIEF est la phase d'amorce :
 *   - Créée automatiquement à l'intake (collecte des données client)
 *   - Le pack n'est pas encore activé (ou paiement en attente)
 *   - Le dossier reste en BRIEF tant que l'admin n'a pas validé le pack
 * Dès que `PackValidation` passe à ACTIVATED, l'engine avance vers ESQUISSE.
 */

export const PHASES_ETUDES = [
  PHASE_BRIEF,
  'PHASE_01_ESQUISSE',
  'PHASE_02_APS',
  'PHASE_03_APD',
  'PHASE_04_MANDAT_BET',
  'PHASE_05_AUTORISATION',
  'PHASE_06_DOSSIER_EXECUTION',
  'PHASE_07_DCE',
  'PHASE_08_MANDATS',
  'PHASE_09_OUVERTURE_CHANTIER',
] as const;

export const PHASES_ABOUTISSEMENT = [
  'PHASE_RECEPTION_PROVISOIRE',
  'PHASE_RECEPTION_DEFINITIVE',
  'PHASE_PERMIS_HABITER',
] as const;

const ALL_PHASES_ORDERED = [...PHASES_ETUDES, ...PHASES_ABOUTISSEMENT];

// ─────────────────────────────────────────────────────────────────────────────
// Vague 1 migration : PhaseEngineService devient ADAPTATEUR derrière un flag.
// ─────────────────────────────────────────────────────────────────────────────
// Signatures publiques INCHANGÉES. Les 8 sites consommateurs ne touchent rien.
//
// USE_V7_PHASES=false (défaut prod vague 1) → comportement legacy strict.
// USE_V7_PHASES=true (dev) → tente v7, fallback legacy si catalogue absent
//                            ou si buildPhaseIndex throw.
//
// Le catalogue v7 (packages/contracts/src/phases.catalog.ts) sera importé
// dynamiquement quand il sera déposé. Tant qu'il est absent, v7CatalogAvailable
// renvoie false et toutes les méthodes retombent sur le chemin legacy.
// ─────────────────────────────────────────────────────────────────────────────

// Forme retournée par buildPhaseIndex du catalogue v7 (packages/contracts).
// Garde un type structural local : import nominal du contracts non requis ici.
export type V7PhaseNode = {
  code: string;
  slug: string;
  title: string;
  famille: string;
  order: number;
  objectif: string;
  acteurs: string[];
  validateurs: string[];
  prerequis: string[];
  documentsAttendus: Array<{ nature: string; formats: string[]; obligatoire?: boolean }>;
  pv: string[];
  marketplace: unknown;
  paiementMilestone: boolean;
};

export type V7Index = {
  ordered: V7PhaseNode[];
  bySlug: Record<string, V7PhaseNode>;
  byCode: Record<string, V7PhaseNode>;
};

type V7Catalog = {
  buildPhaseIndex: (shape: DossierShape) => V7Index;
  validateDossier?: (shape: DossierShape) => { ok: boolean; errors: string[] };
};

@Injectable()
export class PhaseEngineService {
  private readonly logger = new Logger(PhaseEngineService.name);

  // Cache mémoire de l'index v7 par dossierId pour la durée de vie du process.
  // (Cache durée-de-requête idéal en Nest = request-scoped provider ; vague 1
  // on simplifie en cache process — invalidé manuellement à advancePhase.)
  private readonly v7IndexCache = new Map<string, V7Index>();

  // Catalogue chargé paresseusement (TODO v7-catalog : import dynamique).
  private cachedCatalog: V7Catalog | null = null;
  private catalogLookupDone = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ─── Flag + dispo catalogue ────────────────────────────────────────────────

  private get useV7(): boolean {
    if (process.env.USE_V7_PHASES !== 'true') return false;
    return this.tryLoadCatalog() !== null;
  }

  /**
   * Tente de charger le catalogue v7 depuis @citurbarea/contracts. Si l'export
   * `buildPhaseIndex` n'existe pas (catalogue pas encore déposé), retourne null
   * sans crasher. Idempotent.
   */
  private tryLoadCatalog(): V7Catalog | null {
    if (this.catalogLookupDone) return this.cachedCatalog;
    this.catalogLookupDone = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const contracts = require('@citurbarea/contracts');
      if (typeof contracts?.buildPhaseIndex === 'function') {
        this.cachedCatalog = {
          buildPhaseIndex: contracts.buildPhaseIndex,
          validateDossier: contracts.validateDossier,
        };
        this.logger.log('[v7-catalog] chargé depuis @citurbarea/contracts');
      } else {
        this.cachedCatalog = null;
        if (process.env.USE_V7_PHASES === 'true') {
          this.logger.warn('[v7-catalog] USE_V7_PHASES=true mais buildPhaseIndex absent → fallback legacy');
        }
      }
    } catch (e: any) {
      this.cachedCatalog = null;
      if (process.env.USE_V7_PHASES === 'true') {
        this.logger.warn(`[v7-catalog] introuvable (${e?.message}) → fallback legacy`);
      }
    }
    return this.cachedCatalog;
  }

  private async getV7Index(dossierId: string) {
    const cached = this.v7IndexCache.get(dossierId);
    if (cached) return cached;
    const catalog = this.tryLoadCatalog();
    if (!catalog) throw new Error('v7 catalog not available');
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        porteType: true,
        nbEtagesHorsSol: true,
        nbSousSols: true,
        nbNiveaux: true,
        typeOperationFoncier: true,
        payload: true,
      },
    });
    if (!dossier) throw new Error(`dossier ${dossierId} introuvable`);
    const shape = dossierToShape(dossier);
    const localValid = validateDossierShape(shape);
    if (!localValid.ok) {
      this.logger.warn(
        `[v7] dossier ${dossierId} shape invalide (vague 1, non bloquant) : ${localValid.errors.join(', ')}`,
      );
    }
    const index = catalog.buildPhaseIndex(shape);
    this.v7IndexCache.set(dossierId, index);
    return index;
  }

  private invalidateV7Cache(dossierId: string) {
    this.v7IndexCache.delete(dossierId);
  }

  // ─── API publique — signatures inchangées ──────────────────────────────────

  canAdvance(fromPhase: string, toPhase: string): boolean {
    // En vague 1 canAdvance n'est pas async, on ne peut donc pas charger l'index
    // par dossier ici (le caller — phase-engine.service.ts:68 — passe juste les
    // phases sans dossierId). On reste sur la vérif legacy, qui est sûre.
    // Étape 6 changera cette signature pour accepter dossierId.
    return this.legacyCanAdvance(fromPhase, toPhase);
  }

  getNextPhase(phase: string): string | null {
    // Idem : pas de dossierId disponible, on reste legacy. La logique v7
    // (successeurs dans le DAG) sera branchée à l'étape 6 avec signature mise
    // à jour.
    return this.legacyGetNextPhase(phase);
  }

  async getPhaseRecord(dossierId: string, phase: string) {
    return this.prisma.dossierPhaseRecord.findFirst({
      where: { dossierId, phase },
    });
  }

  /**
   * Vague B.3 — Avance vers une phase cible EXPLICITE (toPhase fourni par
   * le caller, contrairement à `validatePhase` qui calcule le successeur).
   *
   *   USE_V7_PHASES=false → comportement legacy strict (legacyCanAdvance
   *     consécutif dans ALL_PHASES_ORDERED, throw BadRequest si invalide).
   *
   *   USE_V7_PHASES=true → branche v7 dédiée :
   *     - normalise fromPhase et toPhase via toV7() (tolère les 2 formats),
   *     - vérifie dans le DAG du dossier que toPhase est un successeur direct
   *       de fromPhase (prerequis.includes),
   *     - si transition illégale → BadRequestException 400 PROPRE, **NON
   *       absorbée** par le fallback (refus métier doit rester visible).
   *     - sinon → v7WritePhaseTransition (écriture v7 centralisée).
   *
   * Distinction de gestion d'erreur (critique) :
   *   - BadRequestException levée par notre code v7 (transition illégale) →
   *     re-throw inchangée. Pas de fallback. Le client reçoit un 400 clair.
   *   - Toute autre erreur (build DAG, dossier corrompu, etc.) → fallback
   *     legacy + log.error. Règle d'or préservée.
   */
  async advancePhase(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
    acteurId: string,
    note?: string,
  ) {
    if (this.useV7) {
      try {
        return await this.v7AdvancePhase(dossierId, fromPhase, toPhase, note);
      } catch (e: any) {
        // Refus métier (transition illégale) → re-throw, PAS de fallback.
        if (e instanceof BadRequestException) throw e;
        // Erreur inattendue (technique, dossier corrompu, build DAG) → fallback legacy.
        this.logger.error(
          `[v7] advancePhase ${dossierId} ${fromPhase}→${toPhase} erreur inattendue (${e?.message}) — fallback legacy`,
        );
      }
    }
    return this.legacyAdvancePhase(dossierId, fromPhase, toPhase, acteurId, note);
  }

  /**
   * Chemin v7 dédié de `advancePhase`. Throw BadRequestException si la
   * transition n'est pas autorisée par le DAG. Throw une erreur générique
   * si build DAG échoue → caller utilise pour basculer en legacy.
   */
  private async v7AdvancePhase(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
    note?: string,
  ) {
    const fromV7 = toV7(fromPhase);
    const toV7Code = toV7(toPhase);
    const index = await this.getV7Index(dossierId); // peut throw → catch → fallback legacy

    const targetNode = index.byCode[toV7Code];
    if (!targetNode) {
      // Cible inconnue dans le DAG du dossier → refus métier (pas un bug technique).
      throw new BadRequestException(
        `Phase cible "${toV7Code}" introuvable dans le DAG v7 du dossier ${dossierId}`,
      );
    }
    if (!targetNode.prerequis.includes(fromV7)) {
      throw new BadRequestException(
        `Transition invalide ${fromV7} → ${toV7Code} dans le DAG v7 du dossier (prerequis de la cible : ${targetNode.prerequis.join(', ') || 'aucun'})`,
      );
    }

    const record = await this.v7WritePhaseTransition(dossierId, fromPhase, toV7Code, note);
    this.logger.log(`[v7] ${dossierId} avancé : ${fromV7} → ${toV7Code}`);
    return record;
  }

  /**
   * Crée la phase BRIEF à l'intake d'un nouveau dossier.
   * Idempotent (skip si déjà initialisé).
   *
   * Cleanup pré-bascule : écrit toujours le code v7 '00_BRIEF'. La recherche
   * d'existence utilise phaseVariants() pour matcher un éventuel record legacy
   * ('PHASE_00_BRIEF') hérité d'un ancien intake — préserve l'idempotence
   * cross-formats sans dupliquer le record.
   */
  async initBrief(dossierId: string) {
    const existing = await this.prisma.dossierPhaseRecord.findFirst({
      where: { dossierId, phase: { in: phaseVariants('00_BRIEF') } },
    });
    if (existing) return existing;
    return this.prisma.dossierPhaseRecord.create({
      data: {
        dossierId,
        phase: '00_BRIEF',
        statut: 'EN_COURS',
        dateDebut: new Date(),
      },
    });
  }

  /**
   * Avance automatique BRIEF → phase suivante (après validation admin du pack).
   * Déclenchée par PackValidationService.adminValidate (fire-and-forget — un
   * échec ici ne doit JAMAIS bloquer l'activation du pack côté caller).
   *
   * Vague B.1 :
   *   - USE_V7_PHASES=false → comportement legacy strict (BRIEF → ESQUISSE
   *     hardcodé, écrit le code legacy 'PHASE_01_ESQUISSE').
   *   - USE_V7_PHASES=true → la phase cible est déterminée depuis le DAG v7
   *     (successeur de '00_BRIEF' dans buildPhaseIndex(shape)). Écrit le code
   *     v7. Tout throw dans le chemin v7 → fallback legacy + log.error.
   *
   * Idempotent : la comparaison de la phase courante passe par toV7() pour
   * tolérer les bases mixtes legacy/v7 (records 'PHASE_00_BRIEF' ou '00_BRIEF'
   * traités identiquement comme "encore en brief"). Fix incident vague C :
   * sans toV7(), un dossier @default("00_BRIEF") restait bloqué car la
   * comparaison stricte avec 'PHASE_00_BRIEF' échouait.
   */
  async advanceBriefToEsquisse(dossierId: string, author: string) {
    if (this.useV7) {
      try {
        const result = await this.v7AdvanceFromBrief(dossierId, author);
        if (result !== undefined) return result; // null si déjà avancé / dossier inconnu
      } catch (e: any) {
        this.logger.error(
          `[v7] advanceBriefToEsquisse failed for ${dossierId} (${e?.message}) — fallback legacy`,
        );
        // tomber sur le chemin legacy ci-dessous
      }
    }
    return this.legacyAdvanceBriefToEsquisse(dossierId, author);
  }

  private async legacyAdvanceBriefToEsquisse(dossierId: string, author: string) {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { phase: true },
    });
    if (!dossier) return null;
    // Robustification toV7() : tolère @default("00_BRIEF") (vague C) et l'ancien default "PHASE_00_BRIEF".
    const currentV7 = toV7(dossier.phase ?? PHASE_BRIEF);
    if (currentV7 !== '00_BRIEF') return null; // déjà avancé manuellement
    return this.advancePhase(dossierId, PHASE_BRIEF, 'PHASE_01_ESQUISSE', author, 'Pack validé — début études');
  }

  /**
   * Vague B.2 — VALIDER une phase courante : passe-la à COMPLETE et avance
   * vers la phase suivante. Appelée par `DossierService.handlePhaseAction`
   * action `VALIDER`. Logique exposée publiquement pour encapsuler la branche
   * `useV7` (le caller n'a pas accès à l'état du flag).
   *
   *   USE_V7_PHASES=false → comportement legacy strict :
   *     `getNextPhase(fromPhase)` (succession linéaire `ALL_PHASES_ORDERED`) +
   *     `advancePhase(...)`. Throw `BadRequestException('Aucune phase suivante')`
   *     si terminal — comportement existant conservé.
   *
   *   USE_V7_PHASES=true → comportement v7 :
   *     - normalise `fromPhase` via `toV7()`,
   *     - charge le DAG du dossier,
   *     - trouve les successeurs (nodes dont `prerequis` inclut la phase courante),
   *     - 0 successeur (phase terminale 97_RECEPTION_DEFINITIVE) → marque
   *       fromPhase COMPLETE, retourne `{ terminal: true }` (no throw),
   *     - 1 successeur → avance vers lui,
   *     - >1 successeurs → log.warn la liste, avance vers le premier en
   *       topo-order (choix déterministe ; UX de choix explicite = vague future),
   *     - écrit en codes v7.
   *
   * Try/catch global : tout throw dans le chemin v7 → fallback legacy +
   * log.error. Règle d'or : une action UI ne plante pas pour une ambiguïté
   * de graphe.
   */
  async validatePhase(
    dossierId: string,
    fromPhase: string,
    acteurId: string,
    note?: string,
  ) {
    if (this.useV7) {
      try {
        const result = await this.v7ValidatePhase(dossierId, fromPhase, note);
        if (result !== undefined) return result;
      } catch (e: any) {
        this.logger.error(
          `[v7] validatePhase failed for ${dossierId} ${fromPhase} (${e?.message}) — fallback legacy`,
        );
      }
    }
    // Legacy strict : comportement existant inchangé.
    const next = this.legacyGetNextPhase(fromPhase);
    if (!next) throw new BadRequestException('Aucune phase suivante');
    return this.legacyAdvancePhase(dossierId, fromPhase, next, acteurId, note);
  }

  /**
   * Chemin v7 de `validatePhase`. Retourne :
   *   - le record cible créé/mis à jour si avancement,
   *   - `{ terminal: true, code }` si la phase est terminale (97_RECEPTION_DEFINITIVE),
   *   - `undefined` jamais (le throw remonte au catch du caller pour le fallback).
   */
  private async v7ValidatePhase(
    dossierId: string,
    fromPhase: string,
    note?: string,
  ): Promise<any> {
    const fromV7 = toV7(fromPhase);
    const index = await this.getV7Index(dossierId);

    // Vérifier que la phase courante existe dans le DAG du dossier.
    if (!index.byCode[fromV7]) {
      throw new Error(`Phase courante "${fromV7}" introuvable dans le DAG du dossier ${dossierId}`);
    }

    const successors = index.ordered.filter(n => n.prerequis.includes(fromV7));
    const now = new Date();

    // Cas 1 — phase terminale (0 successeur). Marquer COMPLETE et stop.
    if (successors.length === 0) {
      await this.prisma.dossierPhaseRecord.updateMany({
        where: { dossierId, phase: { in: phaseVariants(fromPhase) } },
        data: { statut: 'COMPLETE', dateFin: now },
      });
      this.invalidateV7Cache(dossierId);
      this.logger.log(`[v7] ${dossierId} : phase terminale ${fromV7} → COMPLETE (pas d'avance)`);
      return { terminal: true, code: fromV7 };
    }

    // Cas 2-3 — un ou plusieurs successeurs. Choix déterministe = premier en topo-order.
    if (successors.length > 1) {
      this.logger.warn(
        `[v7] ${dossierId} : ${successors.length} successeurs de ${fromV7} (${successors.map(s => s.code).join(', ')}) — choix déterministe du premier en topo-order (UX explicite = vague future)`,
      );
    }
    const toPhase = successors[0].code;
    // Vague B.3 : écriture centralisée via v7WritePhaseTransition.
    const record = await this.v7WritePhaseTransition(dossierId, fromPhase, toPhase, note);
    this.logger.log(`[v7] ${dossierId} validé : ${fromV7} → ${toPhase}`);
    return record;
  }

  /**
   * Chemin v7 dédié : détermine la phase suivante via le DAG du dossier et
   * écrit la transition en codes v7. Retourne undefined si non applicable
   * (caller utilise undefined comme signal pour basculer en legacy).
   */
  private async v7AdvanceFromBrief(dossierId: string, author: string): Promise<any | undefined | null> {
    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: { phase: true },
    });
    if (!dossier) return null; // dossier inexistant → no-op (pas de fallback à tenter)

    const currentV7 = toV7(dossier.phase ?? PHASE_BRIEF);
    if (currentV7 !== '00_BRIEF') return null; // déjà avancé

    // Charge l'index v7 du dossier — peut throw si dossier invalide / catalogue indisponible.
    const index = await this.getV7Index(dossierId);

    // Successeurs directs de 00_BRIEF dans le DAG. Catalogue actuel : un seul.
    const successors = index.ordered.filter(n => n.prerequis.includes('00_BRIEF'));
    if (successors.length === 0) {
      throw new Error(`Aucun successeur de 00_BRIEF dans le DAG du dossier ${dossierId}`);
    }
    if (successors.length > 1) {
      // RÈGLE D'OR : on ne plante pas un paiement validé pour une ambiguïté de
      // graphe. On loggue + prend le premier en topo-order (ordered[] est déjà
      // trié topologiquement par buildPhaseIndex).
      this.logger.error(
        `[v7] dossier ${dossierId} : ${successors.length} successeurs de 00_BRIEF (${successors.map(s => s.code).join(', ')}) — choix déterministe du premier en topo-order`,
      );
    }
    const toPhase = successors[0].code;
    // Vague B.3 : écriture centralisée via v7WritePhaseTransition.
    const record = await this.v7WritePhaseTransition(dossierId, '00_BRIEF', toPhase, 'Pack validé — début études');
    this.logger.log(`[v7] ${dossierId} avancé : 00_BRIEF → ${toPhase} (auteur=${author})`);
    return record;
  }

  async getPhaseStatus(dossierId: string) {
    if (this.useV7) {
      try {
        return await this.v7GetPhaseStatus(dossierId);
      } catch (e: any) {
        this.logger.error(
          `[v7] getPhaseStatus ${dossierId} a échoué (${e?.message}) — fallback legacy`,
        );
      }
    }
    return this.legacyGetPhaseStatus(dossierId);
  }

  // STUB Sprint 3 — ne pas implémenter maintenant
  async generateChantierPhases(nbNiveaux: number, nbSousSols: number): Promise<string[]> {
    // Sprint 3 : génère phases GO dynamiques
    // PHASE_10_FONDATIONS + SS phases + RDC + R+n + FIN_GO
    return ['PHASE_GO_FONDATIONS', 'PHASE_GO_PLANCHER', 'PHASE_GO_FIN'];
  }

  // ─── Implémentation LEGACY (inchangée, factorisée) ─────────────────────────

  private legacyCanAdvance(fromPhase: string, toPhase: string): boolean {
    const fi = ALL_PHASES_ORDERED.indexOf(fromPhase as any);
    const ti = ALL_PHASES_ORDERED.indexOf(toPhase as any);
    return fi !== -1 && ti !== -1 && ti === fi + 1;
  }

  private legacyGetNextPhase(phase: string): string | null {
    const idx = ALL_PHASES_ORDERED.indexOf(phase as any);
    if (idx === -1 || idx === ALL_PHASES_ORDERED.length - 1) return null;
    return ALL_PHASES_ORDERED[idx + 1];
  }

  private async legacyAdvancePhase(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
    _acteurId: string,
    note?: string,
  ) {
    if (!this.legacyCanAdvance(fromPhase, toPhase)) {
      throw new BadRequestException(`Transition invalide : ${fromPhase} → ${toPhase}`);
    }

    const now = new Date();

    // Vague B.2 — robustification (bug latent B.1 résolu) : matcher les
    // records dans tous les formats possibles (legacy + v7). Sans ça, un
    // record en base au format v7 alors que `fromPhase` est passé en legacy
    // ne passe jamais à COMPLETE → record bloqué EN_COURS.
    await this.prisma.dossierPhaseRecord.updateMany({
      where: { dossierId, phase: { in: phaseVariants(fromPhase) } },
      data: { statut: 'COMPLETE', dateFin: now },
    });

    const record = await this.prisma.dossierPhaseRecord.upsert({
      where: { dossierId_phase: { dossierId, phase: toPhase } },
      update: { statut: 'EN_COURS', dateDebut: now, note: note ?? null },
      create: { dossierId, phase: toPhase, statut: 'EN_COURS', dateDebut: now, note: note ?? null },
    });

    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { phase: toPhase },
    });

    return record;
  }

  private async legacyGetPhaseStatus(dossierId: string) {
    const records = await this.prisma.dossierPhaseRecord.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' },
    });

    const completed = records.filter(r => r.statut === 'COMPLETE').map(r => r.phase);
    const current = records.find(r => r.statut === 'EN_COURS')?.phase ?? null;
    const pending = ALL_PHASES_ORDERED.filter(p => !completed.includes(p) && p !== current);

    return { current, completed, pending, records };
  }

  // ─── Implémentation V7 (vague 1 : observation only) ────────────────────────

  /**
   * Vague 1 : vérifie en arrière-plan que le couple (from→to) est autorisé
   * par le DAG v7 (i.e. `from` ∈ prerequis(`to`)). N'agit PAS, juste log.warn
   * si v7 dit non alors que legacy dit oui (signal de désalignement à corriger
   * dans le catalogue avant étape 6).
   */
  private async v7AssertAdvanceLegit(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
  ): Promise<void> {
    const index = await this.getV7Index(dossierId);
    const target = index.byCode[toPhase];
    if (!target) {
      this.logger.warn(`[v7] phase cible "${toPhase}" introuvable dans le DAG du dossier ${dossierId}`);
      return;
    }
    if (!target.prerequis.includes(fromPhase)) {
      this.logger.warn(
        `[v7] désalignement legacy/v7 : ${fromPhase} → ${toPhase} accepté par legacy mais "${fromPhase}" n'est pas dans prerequis de "${toPhase}" (${target.prerequis.join(', ')})`,
      );
    }
  }

  /**
   * Vague 1 : récupère le statut via le DAG v7. `current` = node EN_COURS
   * le plus avancé en topo-order ; `pending` = nodes non DONE atteignables.
   *
   * En cas de plusieurs `current` parallèles (lots GO simultanés), log.warn
   * la liste complète et retourne le premier en topo-order (compat signature
   * legacy {current: string|null}).
   */
  private async v7GetPhaseStatus(dossierId: string) {
    const index = await this.getV7Index(dossierId);
    const records = await this.prisma.dossierPhaseRecord.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' },
    });

    const status = this.computeV7Status(index, records);
    if (status.currentsAll.length > 1) {
      this.logger.warn(
        `[v7] dossier ${dossierId} a ${status.currentsAll.length} phases EN_COURS en parallèle : ${status.currentsAll.join(', ')} (signature legacy retourne le 1er)`,
      );
    }

    return {
      current: status.currentsAll[0] ?? null,
      completed: status.completedIds,
      pending: status.pendingIds,
      records,
    };
  }

  // ─── Helper d'écriture v7 (factorisé B.3 — réutilisé par B.1, B.2, B.3) ──

  /**
   * Écrit une transition de phase au format v7 :
   *   1. Marque COMPLETE tous les records de la phase source (tous formats
   *      possibles via phaseVariants — tolère bases mixtes legacy/v7).
   *   2. Upsert le record cible en code v7, statut EN_COURS, dateDebut=now.
   *   3. Met à jour Dossier.phase au code v7.
   *   4. Invalide le cache d'index v7 du dossier.
   *
   * Centralisé pour éviter le drift entre les 3 chemins d'écriture v7
   * (advanceBriefToEsquisse / validatePhase / advancePhase). Toute modif
   * du schéma d'écriture se fait ICI.
   *
   * @param fromPhase format quelconque (legacy ou v7) — sera normalisé via phaseVariants pour le match.
   * @param toPhase   doit être un code v7 (le caller a déjà passé par toV7).
   */
  private async v7WritePhaseTransition(
    dossierId: string,
    fromPhase: string,
    toPhase: string,
    note?: string,
  ) {
    const now = new Date();
    await this.prisma.dossierPhaseRecord.updateMany({
      where: { dossierId, phase: { in: phaseVariants(fromPhase) } },
      data: { statut: 'COMPLETE', dateFin: now },
    });
    const record = await this.prisma.dossierPhaseRecord.upsert({
      where: { dossierId_phase: { dossierId, phase: toPhase } },
      update: { statut: 'EN_COURS', dateDebut: now, note: note ?? null },
      create: { dossierId, phase: toPhase, statut: 'EN_COURS', dateDebut: now, note: note ?? null },
    });
    await this.prisma.dossier.update({
      where: { id: dossierId },
      data: { phase: toPhase },
    });
    this.invalidateV7Cache(dossierId);
    return record;
  }

  // ─── Helper factorisé (réutilisé par v7GetPhaseStatus + snapshot) ──────────

  /**
   * Calcule statut v7 à partir de l'index DAG + records DB. PUR (pas d'I/O).
   *   - matched : codes de records qui matchent un node de l'index v7
   *   - completedIds : nodes dont le record DB est 'COMPLETE'
   *   - currentsAll : nodes 'EN_COURS' triés par topo-order (l'ordre du DAG)
   *   - pendingIds : nodes non-DONE et non-EN_COURS, triés par topo-order
   *   - nbRecordsMatched / nbRecordsTotal : compteurs (mesure mismatch legacy↔v7)
   */
  computeV7Status(
    index: V7Index,
    records: Array<{ phase: string; statut: string }>,
  ): {
    completedIds: string[];
    currentsAll: string[];
    pendingIds: string[];
    nbRecordsMatched: number;
    nbRecordsTotal: number;
    statusByCode: Map<string, { statut: string }>;
  } {
    const nodeCodes = index.ordered.map(n => n.code);
    const nodeCodeSet = new Set(nodeCodes);

    // Records → map par code (uniquement ceux qui matchent un node v7).
    // Vague C : défense en profondeur — chaque record.phase passe par toV7()
    // avant le match. Un record legacy résiduel (PHASE_00_BRIEF…) matchera
    // ainsi le bon node v7 (00_BRIEF…) même si la migration data n'a pas
    // encore été appliquée. Idempotent : un code déjà v7 est inchangé.
    const statusByCode = new Map<string, { statut: string }>();
    let matched = 0;
    for (const r of records) {
      const v7Code = toV7(r.phase);
      if (nodeCodeSet.has(v7Code)) {
        statusByCode.set(v7Code, { statut: r.statut });
        matched++;
      }
    }

    const completedIds: string[] = [];
    const currentsAll: string[] = [];
    const pendingIds: string[] = [];
    for (const code of nodeCodes) {
      const rec = statusByCode.get(code);
      if (rec?.statut === 'COMPLETE') completedIds.push(code);
      else if (rec?.statut === 'EN_COURS') currentsAll.push(code);
      else pendingIds.push(code);
    }

    return {
      completedIds,
      currentsAll,
      pendingIds,
      nbRecordsMatched: matched,
      nbRecordsTotal: records.length,
      statusByCode,
    };
  }

  // ─── Snapshot lecture seule — vague 2 étape 3 ──────────────────────────────

  /**
   * GET snapshot complet d'un dossier : nodes v7 enrichis avec leur statut DB.
   * LECTURE SEULE. Aucune mutation.
   *
   * Renvoie 422 si le dossier ne valide pas le catalogue v7 (errors typées) ;
   * 404 si le dossier n'existe pas. L'autorisation est faite par l'appelant
   * (controller) via JwtAuthGuard + owner/admin check.
   *
   * Le JOIN catalogue↔records se fait par code de phase. Sur un dossier
   * legacy (records avec codes 'PHASE_NN_xxx'), aucun match — tous les nodes
   * sortent en 'NOT_STARTED' et meta.anyLegacyMismatch=true.
   */
  async getDossierPhasesSnapshot(dossierId: string): Promise<{
    dossierId: string;
    porte: string;
    typeOperationFoncier: string;
    nodes: Array<{
      code: string;
      slug: string;
      title: string;
      famille: string;
      order: number;
      objectif: string;
      acteurs: string[];
      validateurs: string[];
      prerequis: string[];
      marketplace: unknown;
      paiementMilestone: boolean;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
      startDate?: string | null;
      dueDate?: string | null;
      completedAt?: string | null;
    }>;
    currentIds: string[];
    completedIds: string[];
    pendingIds: string[];
    meta: { nbRecordsMatched: number; nbRecordsTotal: number; anyLegacyMismatch: boolean };
  }> {
    const catalog = this.tryLoadCatalog();
    if (!catalog) {
      throw new BadRequestException(
        '[snapshot] catalogue v7 indisponible — vérifier le build de @citurbarea/contracts',
      );
    }

    const dossier = await this.prisma.dossier.findUnique({
      where: { id: dossierId },
      select: {
        id: true,
        porteType: true,
        nbEtagesHorsSol: true,
        nbSousSols: true,
        nbNiveaux: true,
        typeOperationFoncier: true,
        payload: true,
      },
    });
    if (!dossier) {
      // NotFound traduit par GlobalExceptionFilter en 404.
      const err: any = new Error(`dossier ${dossierId} introuvable`);
      err.status = 404;
      throw err;
    }

    const shape = dossierToShape(dossier);
    // Validation v7 (catalogue) : si invalide → 422 typée plutôt que throw 500.
    if (catalog.validateDossier) {
      const v7 = catalog.validateDossier({ ...shape, id: dossier.id } as any);
      if (!v7.ok) {
        this.logger.warn(
          `[snapshot] dossier ${dossierId} non conforme v7 : ${v7.errors.join(' | ')}`,
        );
        const err: any = new Error(`Dossier ${dossierId} non conforme au catalogue v7`);
        err.status = 422;
        err.details = { errors: v7.errors };
        throw err;
      }
    }

    const index = catalog.buildPhaseIndex({ ...shape, id: dossier.id } as any);

    const records = await this.prisma.dossierPhaseRecord.findMany({
      where: { dossierId },
      orderBy: { createdAt: 'asc' },
      select: { phase: true, statut: true, dateDebut: true, dateFin: true },
    });

    const status = this.computeV7Status(index, records);
    const datesByCode = new Map<string, { dateDebut: Date | null; dateFin: Date | null }>();
    for (const r of records) {
      // Vague C : appliquer toV7() pour aligner les dates sur le code v7
      // si le record est encore au format legacy en base.
      datesByCode.set(toV7(r.phase), { dateDebut: r.dateDebut ?? null, dateFin: r.dateFin ?? null });
    }

    const nodes = index.ordered.map((n) => {
      const rec = status.statusByCode.get(n.code);
      const dates = datesByCode.get(n.code);
      const nodeStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' =
        rec?.statut === 'COMPLETE' ? 'DONE' : rec?.statut === 'EN_COURS' ? 'IN_PROGRESS' : 'NOT_STARTED';
      return {
        code: n.code,
        slug: n.slug,
        title: n.title,
        famille: n.famille,
        order: n.order,
        objectif: n.objectif,
        acteurs: n.acteurs,
        validateurs: n.validateurs,
        prerequis: n.prerequis,
        marketplace: n.marketplace,
        paiementMilestone: n.paiementMilestone,
        status: nodeStatus,
        startDate: dates?.dateDebut ? dates.dateDebut.toISOString() : null,
        completedAt: dates?.dateFin ? dates.dateFin.toISOString() : null,
        dueDate: null, // pas de champ dueDate sur DossierPhaseRecord aujourd'hui
      };
    });

    return {
      dossierId,
      porte: shape.porte,
      typeOperationFoncier: shape.typeOperationFoncier,
      nodes,
      currentIds: status.currentsAll,
      completedIds: status.completedIds,
      pendingIds: status.pendingIds,
      meta: {
        nbRecordsMatched: status.nbRecordsMatched,
        nbRecordsTotal: status.nbRecordsTotal,
        anyLegacyMismatch: status.nbRecordsTotal > 0 && status.nbRecordsMatched < status.nbRecordsTotal,
      },
    };
  }
}
