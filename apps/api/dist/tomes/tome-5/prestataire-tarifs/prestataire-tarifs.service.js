"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrestataireTarifsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrestataireTarifsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * TOME 5 — Service Prestataire Tarifs (MVP)
 *
 * Stockage : JSON file (apps/api/storage/prestataire-tarifs.json) + cache mémoire.
 * Pas de Prisma model au MVP (cf. INTEGRATION.md pour migration future).
 *
 * Workflow :
 *   BROUILLON → VALIDE_CITURBAREA (submit) → PUBLIE (contract) → SUSPENDU
 */
let PrestataireTarifsService = PrestataireTarifsService_1 = class PrestataireTarifsService {
    logger = new common_1.Logger(PrestataireTarifsService_1.name);
    /** Cache mémoire indexé par tarif id. */
    tarifs = new Map();
    /** Corpus de prestations standardisées (chargé au boot). */
    corpus = [];
    storageDir = (0, path_1.resolve)(process.cwd(), "apps/api/storage");
    storageFile = (0, path_1.join)(this.storageDir, "prestataire-tarifs.json");
    corpusFile = (0, path_1.resolve)(process.cwd(), "apps/api/data/prestataire-tarifs/tarifs-types-corpus.json");
    constructor() {
        this.loadCorpus();
        this.loadStorage();
    }
    // ─── Corpus ────────────────────────────────────────────────────────────────
    /** Retourne le corpus complet (40+ prestations standardisées). */
    getCorpus() {
        return this.corpus;
    }
    /** Lookup par code de prestation. */
    findPrestationByCode(code) {
        return this.corpus.find((p) => p.code === code);
    }
    // ─── CRUD tarifs ───────────────────────────────────────────────────────────
    /** Liste tous les tarifs PUBLIE d'un prestataire. */
    listByPrestataire(prestataireId, includeAllStatuses = false) {
        const all = Array.from(this.tarifs.values()).filter((t) => t.prestataireId === prestataireId);
        return includeAllStatuses ? all : all.filter((t) => t.status === "PUBLIE");
    }
    /** Recherche client par prestation/zone/maxPrice (status=PUBLIE uniquement). */
    search(filters) {
        const { prestation, zone, maxPrice } = filters;
        return Array.from(this.tarifs.values()).filter((t) => {
            if (t.status !== "PUBLIE")
                return false;
            if (prestation && t.prestation !== prestation)
                return false;
            if (zone && !t.zoneIntervention.includes(zone))
                return false;
            if (typeof maxPrice === "number" && t.prixUnitaireMAD > maxPrice)
                return false;
            return true;
        });
    }
    /** Récupère un tarif par id (404 si absent). */
    getById(id) {
        const t = this.tarifs.get(id);
        if (!t)
            throw new common_1.NotFoundException(`Tarif introuvable: ${id}`);
        return t;
    }
    /** Crée un nouveau tarif au status BROUILLON. */
    create(input) {
        this.validateCreateInput(input);
        const now = new Date().toISOString();
        const tarif = {
            id: (0, crypto_1.randomUUID)(),
            prestataireId: input.prestataireId,
            corpsMetier: input.corpsMetier,
            prestation: input.prestation,
            unite: input.unite,
            prixUnitaireMAD: input.prixUnitaireMAD,
            conditions: input.conditions,
            zoneIntervention: input.zoneIntervention,
            garanties: input.garanties,
            validUntil: input.validUntil,
            commissionCiturbareaPct: input.commissionCiturbareaPct ?? 5,
            status: "BROUILLON",
            hashContrat: "",
            createdAt: now,
            updatedAt: now,
        };
        this.tarifs.set(tarif.id, tarif);
        this.persist();
        this.logger.log(`Tarif créé: ${tarif.id} (${tarif.prestation})`);
        return tarif;
    }
    /** Met à jour un tarif (BROUILLON ou PUBLIE uniquement). */
    update(id, patch) {
        const tarif = this.getById(id);
        if (tarif.status === "VALIDE_CITURBAREA") {
            throw new common_1.BadRequestException("Tarif en cours de validation CITURBAREA, édition bloquée jusqu'à signature contrat.");
        }
        if (tarif.status === "SUSPENDU") {
            throw new common_1.BadRequestException("Tarif suspendu, édition désactivée.");
        }
        const updated = {
            ...tarif,
            ...patch,
            // garde-fou: status non patchable depuis update()
            status: tarif.status,
            // garde-fou: id, prestataireId non patchables
            id: tarif.id,
            prestataireId: tarif.prestataireId,
            updatedAt: new Date().toISOString(),
        };
        this.tarifs.set(id, updated);
        this.persist();
        return updated;
    }
    /** Soumet un brouillon à la validation CITURBAREA. */
    submit(id) {
        const tarif = this.getById(id);
        if (tarif.status !== "BROUILLON") {
            throw new common_1.BadRequestException(`Soumission impossible: status actuel ${tarif.status} (attendu BROUILLON).`);
        }
        this.assertPriceInRange(tarif);
        const updated = this.transition(tarif, "VALIDE_CITURBAREA");
        this.logger.log(`Tarif soumis à validation: ${id}`);
        return updated;
    }
    /**
     * Signe le contrat : passe à PUBLIE et scelle le hash SHA-256.
     * Le hash couvre les champs immuables du tarif au moment de la signature.
     */
    signContract(id) {
        const tarif = this.getById(id);
        if (tarif.status !== "VALIDE_CITURBAREA") {
            throw new common_1.BadRequestException(`Signature impossible: status actuel ${tarif.status} (attendu VALIDE_CITURBAREA).`);
        }
        const now = new Date().toISOString();
        const sealable = {
            id: tarif.id,
            prestataireId: tarif.prestataireId,
            prestation: tarif.prestation,
            unite: tarif.unite,
            prixUnitaireMAD: tarif.prixUnitaireMAD,
            conditions: tarif.conditions,
            zoneIntervention: tarif.zoneIntervention,
            garanties: tarif.garanties,
            validUntil: tarif.validUntil,
            commissionCiturbareaPct: tarif.commissionCiturbareaPct,
            contratSignedAt: now,
        };
        const hashContrat = (0, crypto_1.createHash)("sha256")
            .update(JSON.stringify(sealable))
            .digest("hex");
        const updated = {
            ...tarif,
            status: "PUBLIE",
            contratSignedAt: now,
            hashContrat,
            updatedAt: now,
        };
        this.tarifs.set(id, updated);
        this.persist();
        this.logger.log(`Contrat signé: ${id} hash=${hashContrat.slice(0, 12)}…`);
        return updated;
    }
    /** Suspend un tarif PUBLIE (retrait commercial). */
    suspend(id) {
        const tarif = this.getById(id);
        if (tarif.status !== "PUBLIE") {
            throw new common_1.BadRequestException(`Suspension impossible: status actuel ${tarif.status} (attendu PUBLIE).`);
        }
        return this.transition(tarif, "SUSPENDU");
    }
    // ─── Comparateur ───────────────────────────────────────────────────────────
    /**
     * Compare un prix client à la grille des tarifs publiés pour une même prestation.
     * Retourne un verdict + badge UX.
     */
    comparePrice(tarifId, clientPrice) {
        const ref = this.getById(tarifId);
        const peers = Array.from(this.tarifs.values()).filter((t) => t.status === "PUBLIE" && t.prestation === ref.prestation && t.unite === ref.unite);
        // S'il n'y a pas d'autres tarifs publiés, on compare au tarif lui-même.
        const samples = peers.length > 0 ? peers : [ref];
        const prices = samples.map((p) => p.prixUnitaireMAD).sort((a, b) => a - b);
        const min = prices[0];
        const max = prices[prices.length - 1];
        const median = prices[Math.floor(prices.length / 2)];
        const positionPct = median > 0 ? Math.round(((clientPrice - median) / median) * 100) : 0;
        let verdict;
        let badge;
        if (positionPct <= -25) {
            verdict = "TRES_BAS";
            badge = `${Math.abs(positionPct)}% moins cher que la médiane CITURBAREA`;
        }
        else if (positionPct <= -10) {
            verdict = "BAS";
            badge = `${Math.abs(positionPct)}% sous la médiane`;
        }
        else if (positionPct < 10) {
            verdict = "MARCHE";
            badge = "Aligné sur la médiane CITURBAREA";
        }
        else if (positionPct < 25) {
            verdict = "ELEVE";
            badge = `+${positionPct}% au-dessus de la médiane`;
        }
        else {
            verdict = "TRES_ELEVE";
            badge = `+${positionPct}% — prix anormalement élevé`;
        }
        return {
            prestation: ref.prestation,
            unite: ref.unite,
            clientPrice,
            marketStats: { min, max, median, count: samples.length },
            positionPct,
            verdict,
            badge,
        };
    }
    // ─── Helpers internes ──────────────────────────────────────────────────────
    transition(tarif, status) {
        const updated = {
            ...tarif,
            status,
            updatedAt: new Date().toISOString(),
        };
        this.tarifs.set(tarif.id, updated);
        this.persist();
        return updated;
    }
    validateCreateInput(input) {
        if (!input.prestataireId)
            throw new common_1.BadRequestException("prestataireId requis.");
        if (!input.prestation)
            throw new common_1.BadRequestException("prestation (code corpus) requis.");
        if (!this.findPrestationByCode(input.prestation)) {
            throw new common_1.BadRequestException(`Prestation inconnue dans le corpus: ${input.prestation}`);
        }
        if (input.prixUnitaireMAD <= 0) {
            throw new common_1.BadRequestException("prixUnitaireMAD doit être > 0.");
        }
        if (!input.zoneIntervention?.length) {
            throw new common_1.BadRequestException("Au moins une zone d'intervention requise.");
        }
        if (!input.validUntil)
            throw new common_1.BadRequestException("validUntil requis (ISO 8601).");
        if (typeof input.commissionCiturbareaPct === "number" &&
            (input.commissionCiturbareaPct < 0 || input.commissionCiturbareaPct > 30)) {
            throw new common_1.BadRequestException("commissionCiturbareaPct doit être dans [0, 30].");
        }
    }
    assertPriceInRange(tarif) {
        const corpus = this.findPrestationByCode(tarif.prestation);
        if (!corpus)
            return;
        // Tolérance: ±50% des bornes indicatives (warn-only via log, mais on bloque hors plage extrême).
        const lowerBound = corpus.prixIndicatifMinMAD * 0.5;
        const upperBound = corpus.prixIndicatifMaxMAD * 2;
        if (tarif.prixUnitaireMAD < lowerBound || tarif.prixUnitaireMAD > upperBound) {
            throw new common_1.BadRequestException(`Prix hors plage acceptable: ${tarif.prixUnitaireMAD} MAD (attendu entre ${lowerBound} et ${upperBound}).`);
        }
    }
    loadCorpus() {
        try {
            if (!(0, fs_1.existsSync)(this.corpusFile)) {
                this.logger.warn(`Corpus introuvable: ${this.corpusFile}`);
                this.corpus = [];
                return;
            }
            const raw = (0, fs_1.readFileSync)(this.corpusFile, "utf8");
            const parsed = JSON.parse(raw);
            this.corpus = parsed.prestations ?? [];
            this.logger.log(`Corpus chargé: ${this.corpus.length} prestations standardisées.`);
        }
        catch (err) {
            this.logger.error(`Erreur chargement corpus: ${err.message}`);
            this.corpus = [];
        }
    }
    loadStorage() {
        try {
            if (!(0, fs_1.existsSync)(this.storageFile))
                return;
            const raw = (0, fs_1.readFileSync)(this.storageFile, "utf8");
            const parsed = JSON.parse(raw);
            for (const t of parsed)
                this.tarifs.set(t.id, t);
            this.logger.log(`Storage chargé: ${this.tarifs.size} tarifs.`);
        }
        catch (err) {
            this.logger.error(`Erreur chargement storage: ${err.message}`);
        }
    }
    persist() {
        try {
            if (!(0, fs_1.existsSync)(this.storageDir)) {
                (0, fs_1.mkdirSync)(this.storageDir, { recursive: true });
            }
            const data = Array.from(this.tarifs.values());
            (0, fs_1.writeFileSync)(this.storageFile, JSON.stringify(data, null, 2), "utf8");
        }
        catch (err) {
            this.logger.error(`Erreur persistance tarifs: ${err.message}`);
        }
    }
};
exports.PrestataireTarifsService = PrestataireTarifsService;
exports.PrestataireTarifsService = PrestataireTarifsService = PrestataireTarifsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrestataireTarifsService);
