import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../tomes/tome-at/kernel/prisma/prisma.service";

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
  // ── ARCHITECTURE / URBANISME (organisations professionnelles, sans CNOA national)
  { slug: "snasp-architectes-prive",
    name: "SNASP — Syndicat National des Architectes du Secteur Privé",
    description: "Syndicat des architectes en exercice libéral. Défense de la profession, négociations honoraires, conditions d'exercice.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Syndicat", "Architectes libéraux", "Honoraires", "Profession"] },

  { slug: "anjaum-jeunes-architectes",
    name: "ANJAUM — Association Nationale des Jeunes Architectes et Urbanistes du Maroc",
    description: "Réseau des jeunes architectes et urbanistes du Maroc — entraide, formation continue, événements, opportunités.",
    visibility: "PUBLIC" as const,
    themes: ["Jeunes architectes", "Urbanistes", "Formation", "Réseau"] },

  { slug: "amup-urbanistes",
    name: "AMUP — Association Marocaine des Urbanistes Professionnels",
    description: "Association marocaine des urbanistes, planificateurs et aménageurs.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Urbanisme", "Aménagement", "Planification"] },

  { slug: "aaena-anciens-ena",
    name: "AAENA — Association des Anciens de l'École Nationale d'Architecture",
    description: "Réseau alumni ENA Rabat. Partage de pratique, mentorat, événements.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Alumni", "ENA Rabat", "Mentorat"] },

  // ── TOPOGRAPHIE / GÉOMÈTRES
  { slug: "onigt-geometres",
    name: "ONIGT — Ordre National des Ingénieurs Géomètres-Topographes",
    description: "Ordre professionnel des ingénieurs géomètres-topographes du Maroc.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Topographie", "Géomètre", "Cadastre", "Bornage"] },

  { slug: "fnigt-federation-topographes",
    name: "FNIGT — Fédération Nationale des Ingénieurs Géomètres-Topographes",
    description: "Fédération des cabinets et bureaux d'études topographie au Maroc.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Topographie", "Cabinets", "Levés", "GNSS"] },

  // ── INGÉNIEURS / GÉNIE CIVIL / BET
  { slug: "oni-ordre-ingenieurs",
    name: "ONI — Ordre National des Ingénieurs",
    description: "Ordre national des ingénieurs civils, BET, contrôle technique, génie civil.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Ingénierie", "Génie civil", "BET", "Contrôle technique"] },

  { slug: "aiehtp-ingenieurs-ehtp",
    name: "AIEHTP — Association des Ingénieurs de l'EHTP",
    description: "Réseau des ingénieurs diplômés de l'École Hassania des Travaux Publics.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["EHTP", "Travaux publics", "Alumni"] },

  { slug: "fmci-conseil-ingenierie",
    name: "FMCI — Fédération Marocaine de Conseil et d'Ingénierie",
    description: "Fédération des bureaux d'études et sociétés d'ingénierie marocaines.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["BET", "Conseil", "Ingénierie", "Maîtrise d'œuvre"] },

  // ── BTP / ENTREPRISES / PROMOTEURS
  { slug: "fnbtp-batiment-tp",
    name: "FNBTP — Fédération Nationale du Bâtiment et des Travaux Publics",
    description: "Fédération des entreprises de bâtiment et travaux publics au Maroc.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["BTP", "Entrepreneurs", "Marchés publics"] },

  { slug: "cmb-confederation-batiment",
    name: "CMB — Confédération Marocaine du Bâtiment",
    description: "Confédération patronale des métiers du bâtiment.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Confédération", "Patronat", "Bâtiment"] },

  { slug: "fnpi-promoteurs-immobiliers",
    name: "FNPI — Fédération Nationale des Promoteurs Immobiliers",
    description: "Fédération des promoteurs immobiliers du Maroc.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Promotion immobilière", "Logement", "Foncier"] },

  // ── MATÉRIAUX
  { slug: "fnimc-materiaux-construction",
    name: "FNIMC — Fédération Nationale des Industries des Matériaux de Construction",
    description: "Industriels marocains du ciment, granulats, acier, briques, carrelage.",
    visibility: "MEMBERS_ONLY" as const,
    themes: ["Matériaux", "Industrie", "Ciment", "Acier"] },
];

// ── 12 CROA — Conseils Régionaux de l'Ordre des Architectes
// (et non le Conseil National — focus sur l'échelle régionale)
const SEED_CROA = [
  { region: "tanger-tetouan-al-hoceima", label: "Tanger-Tétouan-Al Hoceïma" },
  { region: "oriental",                   label: "Oriental" },
  { region: "fes-meknes",                 label: "Fès-Meknès" },
  { region: "rabat-sale-kenitra",         label: "Rabat-Salé-Kénitra" },
  { region: "beni-mellal-khenifra",       label: "Béni Mellal-Khénifra" },
  { region: "casablanca-settat",          label: "Casablanca-Settat" },
  { region: "marrakech-safi",             label: "Marrakech-Safi" },
  { region: "draa-tafilalet",             label: "Drâa-Tafilalet" },
  { region: "souss-massa",                label: "Souss-Massa" },
  { region: "guelmim-oued-noun",          label: "Guelmim-Oued Noun" },
  { region: "laayoune-sakia-el-hamra",    label: "Laâyoune-Sakia El Hamra" },
  { region: "dakhla-oued-ed-dahab",       label: "Dakhla-Oued Ed-Dahab" },
];

const SEED_THEMATIC = [
  { slug: "bim-maroc",               name: "BIM Maroc",
    description: "Modélisation des données du bâtiment, IFC, Revit, ArchiCAD, OpenBIM.",
    themes: ["BIM", "Numérique", "ArchiCAD", "Revit", "IFC"] },
  { slug: "structure-beton",          name: "Structure béton & béton précontraint",
    description: "Calcul béton armé, précontraint, parasismique RPS 2011.",
    themes: ["Structure", "Béton", "RPS 2011", "Eurocode"] },
  { slug: "vrd-lotissements",         name: "VRD & Lotissements",
    description: "Voirie, Réseaux Divers, lotissements (loi 25-90), Hors-Site.",
    themes: ["VRD", "Lotissement", "Loi 25-90"] },
  { slug: "fluides-cvc",              name: "Fluides & CVC",
    description: "Plomberie sanitaire, CVC, électricité, courants faibles, photovoltaïque.",
    themes: ["Plomberie", "CVC", "Électricité", "Photovoltaïque"] },
  { slug: "controle-technique",       name: "Contrôle technique & laboratoires",
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

const REGION_LABELS: Record<string, string> = {
  "tanger-tetouan-al-hoceima":  "Tanger-Tétouan-Al Hoceïma",
  "oriental":                    "Oriental",
  "fes-meknes":                  "Fès-Meknès",
  "rabat-sale-kenitra":           "Rabat-Salé-Kénitra",
  "beni-mellal-khenifra":         "Béni Mellal-Khénifra",
  "casablanca-settat":            "Casablanca-Settat",
  "marrakech-safi":               "Marrakech-Safi",
  "draa-tafilalet":               "Drâa-Tafilalet",
  "souss-massa":                  "Souss-Massa",
  "guelmim-oued-noun":            "Guelmim-Oued Noun",
  "laayoune-sakia-el-hamra":      "Laâyoune-Sakia El Hamra",
  "dakhla-oued-ed-dahab":         "Dakhla-Oued Ed-Dahab",
};

@Injectable()
export class SeedCerclesService implements OnModuleInit {
  private readonly logger = new Logger(SeedCerclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Délai pour ne pas bloquer le boot — seed asynchrone
    setTimeout(() => this.runSeed().catch(err => this.logger.error("Seed cercles failed:", err?.message)), 5000);
  }

  /**
   * Slugs d'anciennes itérations à supprimer (soft-delete) si encore présents.
   * Ex: "cnoa-conseil-national" remplacé par les CROA régionaux + SNASP.
   */
  private async purgeDeprecated() {
    const deprecated = ["cnoa-conseil-national", "ordre-ingenieurs", "fnbtp-maroc"];
    const found = await this.prisma.cercle.findMany({
      where: { slug: { in: deprecated }, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (found.length > 0) {
      await this.prisma.cercle.updateMany({
        where: { slug: { in: deprecated }, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      this.logger.log(`[SeedCercles] purge déprécié : ${found.map(f => f.slug).join(", ")}`);
    }
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

    // 1. Purge des slugs dépréciés (CNOA national notamment)
    await this.purgeDeprecated();

    let created = 0;
    let skipped = 0;

    const all = [
      ...SEED_INSTITUTIONS.map(c => ({ ...c, kind: "INSTITUTION" as const })),
      // CROA — 1 cercle MEMBERS_ONLY par région
      ...SEED_CROA.map(c => ({
        slug: `croa-${c.region}`,
        name: `CROA ${c.label} — Conseil Régional de l'Ordre des Architectes`,
        description: `Cercle officiel du Conseil Régional de l'Ordre des Architectes de ${c.label}.`,
        visibility: "MEMBERS_ONLY" as const,
        region: c.label,
        themes: ["CROA", "Architectes", c.label, "Régional"],
        kind: "CROA" as const,
      })),
      ...SEED_THEMATIC.map(c => ({ ...c, kind: "THEMATIC" as const, visibility: "PUBLIC" as const })),
      ...SEED_REGIONS.map(slug => ({
        slug: `region-${slug}`,
        name: `Pros BTP — ${REGION_LABELS[slug] || slug}`,
        description: `Cercle régional des pros BTP toutes spécialités confondues — région ${REGION_LABELS[slug] || slug}.`,
        visibility: "PUBLIC" as const,
        themes: ["Région", REGION_LABELS[slug] || slug],
        kind: "REGION" as const,
        region: REGION_LABELS[slug] || slug,
      })),
    ];

    for (const c of all) {
      const existing = await this.prisma.cercle.findUnique({ where: { slug: c.slug } });
      if (existing) {
        // Soft revive si on a un cercle deletedAt mais qu'on veut le ressusciter
        if (existing.deletedAt) {
          await this.prisma.cercle.update({
            where: { slug: c.slug },
            data: { deletedAt: null, name: c.name, description: c.description, themes: c.themes },
          });
          created++;
        } else {
          skipped++;
        }
        continue;
      }
      await this.prisma.cercle.create({
        data: {
          slug: c.slug,
          name: c.name,
          description: c.description,
          visibility: (c as any).visibility ?? "MEMBERS_ONLY",
          region: (c as any).region ?? null,
          themes: c.themes,
          ownerId: owner.id,
          members: { create: { userId: owner.id, role: "OWNER", status: "ACTIVE" } },
          moderators: { create: { userId: owner.id } },
        },
      });
      created++;
    }
    this.logger.log(`[SeedCercles] créé/ravivé=${created}, déjà présent=${skipped}, owner=${owner.email}`);
  }
}
