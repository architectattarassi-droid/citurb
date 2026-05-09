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
var SeedCerclesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedCerclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../tomes/tome-at/kernel/prisma/prisma.service");
/**
 * SeedCerclesService — Sprint D3
 *
 * Au boot de l'API, garantit la présence des cercles institutionnels et
 * régionaux/thématiques. Idempotent : skip si déjà présents par slug.
 *
 * Utilise un user système (ou le premier ADMIN/OWNER trouvé) comme owner
 * des cercles seedés. Si aucun utilisateur n'existe, le seed est différé.
 */
const SEED_INSTITUTIONS = [
    { slug: "cnoa-conseil-national", name: "CNOA — Conseil national",
        description: "Cercle officiel du Conseil National de l'Ordre des Architectes du Maroc.",
        visibility: "MEMBERS_ONLY", themes: ["Ordre", "Déontologie", "Réglementation"] },
    { slug: "fnbtp-maroc", name: "FNBTP Maroc",
        description: "Fédération Nationale du Bâtiment et des Travaux Publics — entreprises BTP.",
        visibility: "MEMBERS_ONLY", themes: ["BTP", "Entrepreneurs", "Marchés"] },
    { slug: "ordre-ingenieurs", name: "ONI — Ordre National des Ingénieurs",
        description: "Cercle des ingénieurs civils, BET, contrôle technique.",
        visibility: "MEMBERS_ONLY", themes: ["Ingénierie", "BET"] },
    { slug: "amup-urbanistes", name: "AMUP — Urbanistes du Maroc",
        description: "Association marocaine des urbanistes, planificateurs et aménageurs.",
        visibility: "MEMBERS_ONLY", themes: ["Urbanisme", "Aménagement"] },
];
const SEED_THEMATIC = [
    { slug: "bim-maroc", name: "BIM Maroc",
        description: "Modélisation des données du bâtiment, IFC, Revit, ArchiCAD, OpenBIM.",
        themes: ["BIM", "Numérique", "ArchiCAD", "Revit", "IFC"] },
    { slug: "structure-beton", name: "Structure béton & béton précontraint",
        description: "Calcul béton armé, précontraint, parasismique RPS 2011.",
        themes: ["Structure", "Béton", "RPS 2011", "Eurocode"] },
    { slug: "vrd-lotissements", name: "VRD & Lotissements",
        description: "Voirie, Réseaux Divers, lotissements (loi 25-90), Hors-Site.",
        themes: ["VRD", "Lotissement", "Loi 25-90"] },
    { slug: "fluides-cvc", name: "Fluides & CVC",
        description: "Plomberie sanitaire, CVC, électricité, courants faibles, photovoltaïque.",
        themes: ["Plomberie", "CVC", "Électricité", "Photovoltaïque"] },
    { slug: "controle-technique", name: "Contrôle technique & laboratoires",
        description: "Bureaux de contrôle, laboratoires de sol, géotechnique, essais matériaux.",
        themes: ["Contrôle", "Géotechnique", "Essais"] },
    { slug: "terre-crue-bioclimatique", name: "Terre crue & bioclimatique",
        description: "Architecture vernaculaire, terre crue, paille, low-tech, RT élémentaire.",
        themes: ["Terre crue", "Bioclimatique", "Low-tech"] },
];
const SEED_REGIONS = [
    // 12 régions du Maroc (découpage 2015)
    "tanger-tetouan-al-hoceima",
    "oriental",
    "fes-meknes",
    "rabat-sale-kenitra",
    "beni-mellal-khenifra",
    "casablanca-settat",
    "marrakech-safi",
    "draa-tafilalet",
    "souss-massa",
    "guelmim-oued-noun",
    "laayoune-sakia-el-hamra",
    "dakhla-oued-ed-dahab",
];
const REGION_LABELS = {
    "tanger-tetouan-al-hoceima": "Tanger-Tétouan-Al Hoceïma",
    "oriental": "Oriental",
    "fes-meknes": "Fès-Meknès",
    "rabat-sale-kenitra": "Rabat-Salé-Kénitra",
    "beni-mellal-khenifra": "Béni Mellal-Khénifra",
    "casablanca-settat": "Casablanca-Settat",
    "marrakech-safi": "Marrakech-Safi",
    "draa-tafilalet": "Drâa-Tafilalet",
    "souss-massa": "Souss-Massa",
    "guelmim-oued-noun": "Guelmim-Oued Noun",
    "laayoune-sakia-el-hamra": "Laâyoune-Sakia El Hamra",
    "dakhla-oued-ed-dahab": "Dakhla-Oued Ed-Dahab",
};
let SeedCerclesService = SeedCerclesService_1 = class SeedCerclesService {
    prisma;
    logger = new common_1.Logger(SeedCerclesService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        // Délai pour ne pas bloquer le boot — seed asynchrone
        setTimeout(() => this.runSeed().catch(err => this.logger.error("Seed cercles failed:", err?.message)), 5000);
    }
    async runSeed() {
        // Ne pas seeder si pas d'admin
        const owner = await this.prisma.user.findFirst({
            where: { role: { in: ["OWNER", "ADMIN"] } },
            select: { id: true, email: true },
            orderBy: { createdAt: "asc" },
        });
        if (!owner) {
            this.logger.warn("Seed cercles différé : aucun OWNER/ADMIN trouvé");
            return;
        }
        let created = 0;
        let skipped = 0;
        const all = [
            ...SEED_INSTITUTIONS.map(c => ({ ...c, kind: "INSTITUTION" })),
            ...SEED_THEMATIC.map(c => ({ ...c, kind: "THEMATIC", visibility: "PUBLIC" })),
            ...SEED_REGIONS.map(slug => ({
                slug: `region-${slug}`,
                name: REGION_LABELS[slug] || slug,
                description: `Cercle régional des pros BTP de la région ${REGION_LABELS[slug] || slug}.`,
                visibility: "PUBLIC",
                themes: ["Région", REGION_LABELS[slug] || slug],
                kind: "REGION",
                region: REGION_LABELS[slug] || slug,
            })),
        ];
        for (const c of all) {
            const existing = await this.prisma.cercle.findUnique({ where: { slug: c.slug } });
            if (existing) {
                skipped++;
                continue;
            }
            await this.prisma.cercle.create({
                data: {
                    slug: c.slug,
                    name: c.name,
                    description: c.description,
                    visibility: c.visibility ?? "MEMBERS_ONLY",
                    region: c.region ?? null,
                    themes: c.themes,
                    ownerId: owner.id,
                    members: { create: { userId: owner.id, role: "OWNER", status: "ACTIVE" } },
                    moderators: { create: { userId: owner.id } },
                },
            });
            created++;
        }
        this.logger.log(`[SeedCercles] créé=${created}, déjà présent=${skipped}, owner=${owner.email}`);
    }
};
exports.SeedCerclesService = SeedCerclesService;
exports.SeedCerclesService = SeedCerclesService = SeedCerclesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SeedCerclesService);
