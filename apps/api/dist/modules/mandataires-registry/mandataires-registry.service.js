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
var MandatairesRegistryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandatairesRegistryService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../kernel/prisma/prisma.service");
const probative_log_service_1 = require("../kernel/services/probative-log.service");
/**
 * MandatairesRegistryService — annuaire d'avocats/adouls/notaires agréés CITURBAREA.
 * Indispensable au parcours MRE (exécution physique des démarches au Maroc).
 * Seed 50 mandataires pilotes ; missions stockées dans Dossier.payload.mandataireMissions.
 */
let MandatairesRegistryService = MandatairesRegistryService_1 = class MandatairesRegistryService {
    prisma;
    probative;
    logger = new common_1.Logger(MandatairesRegistryService_1.name);
    registry = [];
    constructor(prisma, probative) {
        this.prisma = prisma;
        this.probative = probative;
        this.registry = this.seed();
    }
    search(filters) {
        return this.registry.filter((m) => {
            if (m.status !== "AGREE_CITURBAREA")
                return false;
            if (filters.ville && m.ville.toLowerCase() !== filters.ville.toLowerCase())
                return false;
            if (filters.profession && m.profession !== filters.profession)
                return false;
            if (filters.specialite && !m.specialites.some((s) => s.toLowerCase().includes(filters.specialite.toLowerCase())))
                return false;
            if (filters.minNote && m.note < filters.minNote)
                return false;
            if (filters.maxTarif && m.tarifHoraireMad > filters.maxTarif)
                return false;
            return true;
        }).sort((a, b) => b.note - a.note);
    }
    getBySlug(slug) {
        return this.registry.find((m) => m.slug === slug) || null;
    }
    /** Demande de mission à un mandataire (stockée sur le dossier). */
    async requestMission(input) {
        const d = await this.prisma.dossier.findUnique({ where: { id: input.dossierId } });
        if (!d)
            throw new Error(`Dossier introuvable: ${input.dossierId}`);
        const m = this.registry.find((x) => x.id === input.mandataireId);
        if (!m)
            throw new Error(`Mandataire introuvable`);
        const payload = d.payload || {};
        const missions = payload.mandataireMissions || [];
        const mission = {
            id: (0, crypto_1.randomUUID)(),
            mandataireId: input.mandataireId,
            mandataireNom: m.nomComplet,
            clientUserId: input.clientUserId,
            missionType: input.missionType,
            description: input.description,
            honorairesProposeMad: input.honorairesProposeMad,
            deadline: input.deadline,
            status: "PENDING",
            createdAt: new Date().toISOString(),
        };
        missions.push(mission);
        payload.mandataireMissions = missions;
        await this.prisma.dossier.update({ where: { id: input.dossierId }, data: { payload } });
        return mission;
    }
    async transitionMission(dossierId, missionId, status, extra) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
        if (!d)
            throw new Error(`Dossier introuvable`);
        const payload = d.payload || {};
        const missions = payload.mandataireMissions || [];
        const mission = missions.find((x) => x.id === missionId);
        if (!mission)
            throw new Error(`Mission introuvable`);
        mission.status = status;
        mission[`${status.toLowerCase()}At`] = new Date().toISOString();
        if (extra)
            Object.assign(mission, extra);
        payload.mandataireMissions = missions;
        await this.prisma.dossier.update({ where: { id: dossierId }, data: { payload } });
        if (status === "VALIDATED") {
            await this.probative.append({
                kind: "MANDATAIRE_MISSION_VALIDATED", rule_id: "T2-R-MANDAT-001",
                projectId: dossierId, actorId: mission.clientUserId,
                metadata: { missionId, mandataireId: mission.mandataireId },
            }).catch(() => { });
        }
        return mission;
    }
    async listMissions(dossierId) {
        const d = await this.prisma.dossier.findUnique({ where: { id: dossierId } });
        return (d?.payload || {}).mandataireMissions || [];
    }
    /** Seed déterministe de 50 mandataires pilotes. */
    seed() {
        const villes = [
            ["Casablanca", 12], ["Rabat", 8], ["Marrakech", 6], ["Tanger", 5],
            ["Fès", 4], ["Agadir", 3], ["Salé", 3], ["Meknès", 3],
            ["Kénitra", 2], ["Oujda", 2], ["Tétouan", 1], ["Errachidia", 1],
        ];
        const specs = ["succession", "achat immobilier", "vente immobilier", "contentieux foncier",
            "copropriété", "urbanisme", "fiscal", "sociétés commerciales", "recouvrement", "baux",
            "construction", "MRE-Diaspora", "expertise judiciaire", "actes adoulaires", "donation"];
        const professions = ["AVOCAT", "NOTAIRE", "ADOUL", "EXPERT_JUDICIAIRE", "HUISSIER"];
        const prenoms = ["Yassine", "Fatima", "Mohamed", "Khadija", "Driss", "Salma", "Hamid", "Nadia", "Karim", "Leila", "Omar", "Houda"];
        const noms = ["Alaoui", "Benani", "Tazi", "Fassi", "Idrissi", "Bennani", "Cherkaoui", "Berrada", "Lahlou", "Sqalli"];
        const out = [];
        let seed = 42;
        const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
        let idx = 0;
        for (const [ville, count] of villes) {
            for (let i = 0; i < count; i++) {
                const prof = professions[Math.floor(rng() * professions.length)];
                const nom = `${prenoms[Math.floor(rng() * prenoms.length)]} ${noms[Math.floor(rng() * noms.length)]}`;
                const nSpecs = 2 + Math.floor(rng() * 3);
                const mySpecs = Array.from(new Set(Array.from({ length: nSpecs }, () => specs[Math.floor(rng() * specs.length)])));
                out.push({
                    id: `mand-${++idx}`,
                    slug: `${nom.toLowerCase().replace(/\s+/g, "-")}-${ville.toLowerCase()}-${idx}`,
                    nomComplet: nom,
                    profession: prof,
                    ordreNumero: `${prof.slice(0, 3)}-${1000 + idx}`,
                    ville,
                    specialites: mySpecs,
                    tarifHoraireMad: 800 + Math.floor(rng() * 28) * 100, // 800-3500
                    note: Math.round((3.5 + rng() * 1.5) * 10) / 10, // 3.5-5.0
                    missionsCompletees: Math.floor(rng() * 150),
                    bio: `${prof === "AVOCAT" ? "Avocat" : prof === "NOTAIRE" ? "Notaire" : prof === "ADOUL" ? "Adoul" : "Expert"} à ${ville}, spécialisé(e) en ${mySpecs[0]}. Agréé(e) CITURBAREA pour l'accompagnement des MRE.`,
                    status: "AGREE_CITURBAREA",
                    rayonKm: 30 + Math.floor(rng() * 70),
                });
            }
        }
        return out;
    }
};
exports.MandatairesRegistryService = MandatairesRegistryService;
exports.MandatairesRegistryService = MandatairesRegistryService = MandatairesRegistryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        probative_log_service_1.ProbativeLogService])
], MandatairesRegistryService);
